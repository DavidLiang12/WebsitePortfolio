const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../js/desktop-boot.js`, 'utf8');

function setup({ reduced = false, visited = false, blocked = false } = {}) {
  const timers = new Map(), events = {}, motionEvents = {}, bootEvents = {};
  const content = { inert: false }, skip = { addEventListener: (name, fn) => { events[name] = fn; } };
  const status = {}, body = {}, boot = { hidden: true, contains: () => false,
    addEventListener: (name, fn) => { bootEvents[name] = fn; } };
  boot.parentElement = { children: [boot, content] };
  let saved = false, timer = 0;
  vm.runInNewContext(source, {
    document: { body, activeElement: body, getElementById: id => ({ 'desktop-boot': boot, 'skip-boot': skip, 'boot-status': status })[id] },
    matchMedia: () => ({ matches: reduced, addEventListener: (name, fn) => { motionEvents[name] = fn; } }),
    sessionStorage: { getItem() { if (blocked) throw Error(); return visited ? 'true' : null; }, setItem() { if (blocked) throw Error(); saved = true; } },
    setTimeout: (fn, delay) => { timers.set(++timer, { fn, delay }); return timer; },
    clearTimeout: id => timers.delete(id),
    window: { addEventListener: (name, fn) => { events[name] = fn; } }
  });
  return { boot, content, events, bootEvents, motionEvents, timers, saved: () => saved };
}

test('startup releases the desktop automatically within 2.1 seconds', () => {
  const app = setup();
  assert.equal(app.content.inert, true);
  [...app.timers.values()].sort((a, b) => a.delay - b.delay).forEach(t => t.fn());
  assert.equal(app.boot.hidden, true);
  assert.equal(app.content.inert, false);
  assert.equal(app.saved(), false);
  assert.equal(app.timers.size, 0);
});
test('every visit starts loading, including cached returns, and reduced motion stays brief', () => {
  const app = setup({ visited: true });
  assert.equal(app.boot.hidden, false);
  app.events.pagehide();
  assert.equal(app.boot.hidden, true);
  app.events.pageshow({ persisted: true });
  assert.equal(app.boot.hidden, false);
  assert.equal(app.content.inert, true);
  const reduced = setup({ reduced: true });
  assert.equal(reduced.boot.hidden, false);
  const timer = [...reduced.timers.values()][0];
  assert.equal(timer.delay, 450);
  timer.fn();
  assert.equal(reduced.content.inert, false);
});
test('skip, Escape, navigation and motion changes release all controls even without storage', () => {
  for (const finish of [app => app.events.click(), app => app.bootEvents.keydown({ key: 'Escape' }), app => app.events.pagehide(), app => app.motionEvents.change({ matches: true })]) {
    const app = setup({ blocked: true });
    finish(app);
    assert.equal(app.boot.hidden, true);
    assert.equal(app.content.inert, false);
    assert.equal(app.timers.size, 0);
  }
});
