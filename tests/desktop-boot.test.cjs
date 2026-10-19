const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../js/desktop-boot.js`, 'utf8');

function setup({ reduced = false, session = new Map(), blocked = false } = {}) {
  const timers = new Map(), events = {}, motionEvents = {}, bootEvents = {};
  const content = { inert: false }, skip = { addEventListener: (name, fn) => { events[name] = fn; } };
  const status = {}, body = {}, entry = { focus() {} }, boot = { hidden: true, focus() { document.activeElement = boot; }, contains: node => node === boot,
    addEventListener: (name, fn) => { bootEvents[name] = fn; } };
  boot.parentElement = { children: [boot, content] };
  let timer = 0;
  const document = { body, activeElement: body, querySelector: () => entry, getElementById: id => ({ 'desktop-boot': boot, 'skip-boot': skip, 'boot-status': status })[id] };
  vm.runInNewContext(source, {
    document,
    matchMedia: () => ({ matches: reduced, addEventListener: (name, fn) => { motionEvents[name] = fn; } }),
    sessionStorage: { getItem(key) { if (blocked) throw Error(); return session.get(key) ?? null; }, setItem(key, value) { if (blocked) throw Error(); session.set(key, value); } },
    setTimeout: (fn, delay) => { timers.set(++timer, { fn, delay }); return timer; },
    clearTimeout: id => timers.delete(id),
    window: { addEventListener: (name, fn) => { events[name] = fn; } }
  });
  return { boot, content, events, bootEvents, motionEvents, timers, session };
}

test('startup releases the desktop automatically within 2.1 seconds', () => {
  const app = setup();
  assert.equal(app.content.inert, true);
  [...app.timers.values()].sort((a, b) => a.delay - b.delay).forEach(t => t.fn());
  assert.equal(app.boot.hidden, true);
  assert.equal(app.content.inert, false);
  assert.equal(app.session.get('portfolio-art-startup-v1'), '1');
  assert.equal(app.timers.size, 0);
});
test('startup runs once per tab, survives navigation and reloads, and resets in a new tab', () => {
  const app = setup();
  assert.equal(app.boot.hidden, false);
  app.events.pagehide();
  assert.equal(app.boot.hidden, true);
  app.events.pageshow({ persisted: true });
  assert.equal(app.boot.hidden, true);
  assert.equal(app.content.inert, false);
  assert.equal(app.timers.size, 0);
  const reload = setup({ session: app.session });
  assert.equal(reload.boot.hidden, true);
  assert.equal(reload.timers.size, 0);
  assert.equal(setup().boot.hidden, false, 'a fresh tab gets a fresh startup');
});
test('each desktop has its own startup and reduced motion stays brief', () => {
  const session = new Map([['portfolio-achievement-startup-v1', '1']]);
  assert.equal(setup({ session }).boot.hidden, false, 'viewing achievements cannot skip the art desktop startup');
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
    app.events.pageshow({ persisted: true });
    assert.equal(app.boot.hidden, true);
  }
});
