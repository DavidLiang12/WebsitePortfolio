const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const model = require('../js/achievement-state.js');
const source = fs.readFileSync(`${__dirname}/../js/achievement-notifications.js`, 'utf8');
function setup(pending = ['first', 'projects'], desktop = true) {
  const queueKey = 'portfolio-exploration-toast-queue-v1';
  const session = new Map([[queueKey, JSON.stringify(pending)]]);
  const timers = new Map(), appended = [], played = [], events = {}, media = { matches: desktop, addEventListener(name, fn) { this.change = fn; } };
  let nextTimer = 0;
  const window = { AchievementState: model, portfolioSound: { play: name => played.push(name) }, addEventListener(name, handler) { (events[name] ??= []).push(handler); } };
  const document = { currentScript: { src: 'https://example.com/portfolio/js/achievement-notifications.js' }, hidden: false,
    addEventListener() {}, body: { append: node => appended.push(node) }, createElement() { return { handlers: {}, setAttribute() {}, addEventListener(name, fn) { this.handlers[name] = fn; }, contains() { return false; }, querySelector() { return { addEventListener() {} }; }, remove() { this.removed = true; } }; } };
  vm.runInNewContext(source, { window, document, URL, matchMedia: () => media,
    sessionStorage: { getItem: k => session.get(k), setItem: (k, v) => session.set(k, v) },
    setTimeout(fn) { timers.set(++nextTimer, fn); return nextTimer; }, clearTimeout: id => timers.delete(id) });
  window.portfolioAchievementNotifications.initialize({ visited: Object.keys(model.projects) });
  return { window, appended, played, events, timers, media, pending: () => JSON.parse(session.get(queueKey)), tick() { const [id, fn] = timers.entries().next().value || []; if (fn) { timers.delete(id); fn(); } } };
}
test('earned notifications show a collection link and play sound once per badge', () => {
  const app = setup(); app.tick();
  assert.match(app.appended[0].innerHTML, /First spin/);
  assert.match(app.appended[0].innerHTML, /https:\/\/example.com\/portfolio\/achievements.html/);
  assert.deepEqual(app.pending(), ['projects']);
  assert.deepEqual(app.played, ['achievement']);
  app.tick(); app.tick();
  assert.match(app.appended[1].innerHTML, /Side B/);
  assert.deepEqual(app.pending(), []);
  assert.equal(app.played.length, 2);
});
test('navigation preserves pending notifications for the destination', () => {
  const app = setup(['projects']);
  app.events.pagehide.forEach(fn => fn());
  assert.equal(app.timers.size, 0);
  assert.deepEqual(app.pending(), ['projects']);
});
test('mobile cannot display or enqueue achievement notifications', () => {
  const app = setup([], false);
  app.window.portfolioAchievementNotifications.enqueue(['first']);
  assert.equal(app.timers.size, 0);
  assert.equal(app.appended.length, 0);
  assert.equal(app.played.length, 0);
});
test('keyboard focus pauses notification dismissal', () => {
  const app = setup(['first']); app.tick();
  app.appended[0].handlers.focusin();
  assert.equal(app.timers.size, 0);
  app.appended[0].handlers.focusout({ relatedTarget: null });
  app.tick();
  assert.equal(app.appended[0].removed, true);
});
