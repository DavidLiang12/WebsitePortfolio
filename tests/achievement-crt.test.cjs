const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../js/achievement-crt.js`, 'utf8');

function element() {
  const classes = new Set();
  return { classes, isConnected: true, classList: {
    add: value => classes.add(value),
    toggle(value, enabled) { if (enabled) classes.add(value); else classes.delete(value); }
  } };
}
function setup({ intersections = true } = {}) {
  const art = element(), type = element(), sphere = element(), body = element();
  const events = {}, documentEvents = {}, observed = [], released = [];
  let types = [type], listChanged, visibility, disconnections = 0;
  const document = {
    body, hidden: false,
    querySelector: () => body,
    querySelectorAll: selector => selector.startsWith('.achievement-poster-art') ? [art] : selector === '.achievement-globe' ? [sphere] : types,
    getElementById: () => ({}),
    addEventListener: (name, fn) => { documentEvents[name] = fn; }
  };
  class IntersectionObserver {
    constructor(fn, options) { visibility = fn; assert.equal(options.rootMargin, '160px'); }
    observe(node) { observed.push(node); }
    unobserve(node) { released.push(node); }
    disconnect() { disconnections++; }
  }
  const window = { addEventListener: (name, fn) => { events[name] = fn; }, dispatchEvent() {} };
  if (intersections) window.IntersectionObserver = IntersectionObserver;
  vm.runInNewContext(source, {
    document, window, IntersectionObserver, Event,
    MutationObserver: class { constructor(fn) { listChanged = fn; } observe() {} }
  });
  return { art, type, sphere, body, events, documentEvents, document, observed, released,
    disconnected: () => disconnections,
    visibility: entries => visibility(entries),
    replaceRow() { types.forEach(node => { node.isConnected = false; }); const next = element(); types = [next]; listChanged(); return next; } };
}

test('live CRT surfaces sleep offscreen and filtering new rows retains native elements', () => {
  const app = setup();
  assert.ok(app.art.classes.has('achievement-crt-art'));
  assert.ok(app.sphere.classes.has('achievement-crt-motion'));
  assert.ok(app.type.classes.has('achievement-crt-type'));
  assert.equal(app.observed.length, 3);
  app.events['portfolio:achievements']();
  assert.equal(app.observed.length, 3, 'existing nodes are not observed twice');
  app.visibility([{ target: app.type, isIntersecting: false }]);
  assert.ok(app.type.classes.has('achievement-crt-sleeping'));
  app.visibility([{ target: app.type, isIntersecting: true }]);
  assert.ok(!app.type.classes.has('achievement-crt-sleeping'));
  const replacement = app.replaceRow();
  assert.ok(replacement.classes.has('achievement-crt-type'));
  assert.ok(app.observed.includes(replacement));
  assert.ok(app.released.includes(app.type), 'removed rows release their observer reference');
});

test('departure freezes intersection updates and reconnects new rows on return', () => {
  const app = setup();
  app.visibility([{ target: app.type, isIntersecting: true }]);
  app.events['portfolio:transitionstart']();
  assert.equal(app.disconnected(), 1);
  app.visibility([{ target: app.type, isIntersecting: false }]);
  assert.ok(!app.type.classes.has('achievement-crt-sleeping'), 'queued intersections cannot invalidate the departing frame');
  const observed = app.observed.length;
  const replacement = app.replaceRow();
  assert.equal(app.observed.length, observed, 'DOM changes cannot restart observation during departure');
  app.events.pageshow();
  assert.ok(replacement.classes.has('achievement-crt-type'));
  assert.ok(app.observed.includes(replacement));
});

test('grain pauses when hidden or navigating, and resumes after Back without an observer', () => {
  const app = setup({ intersections: false });
  const paused = () => app.body.classes.has('achievement-crt-paused');
  assert.ok(app.type.classes.has('achievement-crt-type'));
  app.document.hidden = true; app.documentEvents.visibilitychange();
  assert.equal(paused(), true);
  app.document.hidden = false; app.documentEvents.visibilitychange();
  assert.equal(paused(), false);
  app.events['portfolio:transitionstart']();
  app.documentEvents.visibilitychange();
  assert.equal(paused(), true);
  app.events['portfolio:transitionend']();
  assert.equal(paused(), false);
  app.events.pagehide();
  assert.equal(paused(), true);
  app.events.pageshow();
  assert.equal(paused(), false);
});
