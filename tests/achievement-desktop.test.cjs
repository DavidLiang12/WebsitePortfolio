const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../js/achievement-desktop.js`, 'utf8');

function setup({ mobile = false, reduced = false, session = new Map(), blocked = false, fonts, poster = null } = {}) {
  const timers = new Map(), events = {}, documentEvents = {}, bootEvents = {}, skipEvents = {};
  const enabled = { matches: !mobile, addEventListener: (_, fn) => { enabled.change = fn; } };
  const motion = { matches: reduced, addEventListener: (_, fn) => { motion.change = fn; } };
  const signals = [];
  const bootAudio = [];
  const body = { classList: { values: new Set(), add(value) { this.values.add(value); }, remove(value) { this.values.delete(value); } } };
  const filterAll = { focus() { this.focused = true; } }, screen = { inert: false, style: {}, focus() { this.focused = true; } }, status = {};
  const header = { inert: false, getBoundingClientRect: () => ({ height: 98 }) }, skipLink = { inert: false };
  const bootLines = Array.from({ length: 6 }, () => ({ hidden: false }));
  const boot = { hidden: true, style: {}, querySelectorAll: () => bootLines, focus() { document.activeElement = boot; }, contains: el => el === boot || el === skip, addEventListener: (name, fn) => { bootEvents[name] = fn; } };
  const skip = { addEventListener: (name, fn) => { skipEvents[name] = fn; } };
  const slot = { append(sound) { this.child = sound; } };
  let timer = 0, sound = null;
  const document = {
    body, activeElement: body, fonts,
    getElementById: id => ({ 'achievement-boot':boot, 'achievement-boot-status':status, 'achievement-filter-all':filterAll, 'achievement-skip-boot':skip, 'achievement-sound-slot':slot })[id],
    querySelector: selector => selector === '.achievement-screen' ? screen : selector === '.portfolio-header' ? header : selector === '.achievement-poster' ? poster : sound,
    querySelectorAll: () => [skipLink],
    addEventListener: (name, fn) => { documentEvents[name] = fn; }
  };
  vm.runInNewContext(source, {
    document, Event,
    sessionStorage: { getItem(key) { if (blocked) throw Error('blocked'); return session.get(key) ?? null; }, setItem(key, value) { if (blocked) throw Error('blocked'); session.set(key, value); } },
    matchMedia: query => query.includes('641px') ? enabled : motion,
    setTimeout: (fn, delay) => { timers.set(++timer, { fn, delay }); return timer; },
    clearTimeout: id => timers.delete(id),
    window: { addEventListener: (name, fn) => { events[name] = fn; }, dispatchEvent: event => signals.push(event.type), portfolioSound: { startAchievementBoot: () => bootAudio.push('start'), finishAchievementBoot: skipped => bootAudio.push(skipped ? 'skip' : 'finish') } }
  });
  return { boot, bootLines, screen, header, skipLink, status, filterAll, skip, enabled, motion, events, timers, skipEvents, bootEvents, slot, document, signals, body, session, bootAudio,
    attachSound() { sound = {}; documentEvents.DOMContentLoaded(); return sound; } };
}

test('achievement startup auto-finishes and skip/Escape release keyboard controls', () => {
  for (const complete of [
    app => [...app.timers.values()].sort((a,b) => a.delay - b.delay).forEach(timer => timer.fn()),
    app => { app.document.activeElement = app.skip; app.skipEvents.click(); assert.equal(app.screen.focused, true); },
    app => app.bootEvents.keydown({ key:'Escape' })
  ]) {
    const app = setup();
    assert.equal(app.boot.hidden, false);
    assert.equal(app.document.activeElement, app.boot, 'keyboard input reaches the startup dialog immediately');
    assert.equal(app.screen.inert, true);
    assert.equal(app.body.classList.values.has('achievement-starting'), true);
    assert.equal(app.header.inert, false, 'the navbar remains usable during startup');
    assert.equal(app.boot.style.top, '98px', 'the boot scene begins below the navbar');
    assert.equal(app.screen.style.paddingTop, '98px', 'the fixed navbar reserves its height during startup');
    assert.equal(app.skipLink.inert, true);
    assert.equal(Math.max(...[...app.timers.values()].map(t => t.delay)), 2400);
    complete(app);
    assert.equal(app.boot.hidden, true);
    assert.equal(app.screen.inert, false);
    assert.equal(app.body.classList.values.has('achievement-starting'), false);
    assert.equal(app.screen.style.paddingTop, '');
    assert.deepEqual(app.signals, ['portfolio:achievementboot', 'portfolio:achievementboot']);
    assert.equal(app.header.inert, false);
    assert.equal(app.skipLink.inert, false);
    assert.equal(app.filterAll.focused, undefined, 'finishing cannot create a focus ring on All');
    assert.equal(app.timers.size, 0);
  }
});

test('BIOS diagnostics appear in order and cached returns skip the completed sequence', () => {
  const app = setup();
  assert.equal(app.status.textContent, 'Checking memory…');
  assert.deepEqual(app.bootLines.map(line => line.hidden), [false, true, true, true, true, true]);
  const steps = [...app.timers.values()].sort((a, b) => a.delay - b.delay);
  for (let index = 0; index < 5; index++) {
    steps[index].fn();
    assert.deepEqual(app.bootLines.map(line => line.hidden), app.bootLines.map((_, row) => row > index + 1));
  }
  assert.equal(app.status.textContent, 'Starting ACHIEVEMENTS.EXE…');
  app.skipEvents.click();
  assert.equal(app.timers.size, 0, 'skip cancels every scheduled diagnostic');
  app.events.pageshow({ persisted: true });
  assert.equal(app.boot.hidden, true);
  assert.equal(app.timers.size, 0, 'cached returns do not schedule another startup');
});

test('mobile does not consume the startup and resizing only starts it once', () => {
  const app = setup({ mobile: true });
  assert.equal(app.boot.hidden, true);
  assert.equal(app.timers.size, 0);
  assert.equal(app.session.size, 0);
  app.enabled.matches = true; app.enabled.change();
  assert.equal(app.screen.inert, true);
  app.events.pagehide();
  assert.equal(app.screen.inert, false);
  app.events.pageshow({ persisted: true });
  assert.equal(app.boot.hidden, true);
  app.enabled.matches = false; app.enabled.change();
  assert.equal(app.boot.hidden, true);
  assert.equal(app.screen.inert, false);
});

test('navigation and reloads share the tab session; a fresh tab plays startup again', () => {
  const first = setup();
  const reload = setup({ session: first.session });
  assert.equal(reload.boot.hidden, true);
  assert.equal(reload.timers.size, 0);
  assert.equal(reload.screen.inert, false);
  const freshTab = setup();
  assert.equal(freshTab.boot.hidden, false);
  const blocked = setup({ blocked: true });
  blocked.events.pagehide();
  blocked.events.pageshow({ persisted: true });
  assert.equal(blocked.boot.hidden, true, 'memory fallback prevents replays on cached returns');
});

test('reduced motion uses a short static startup and a preference change releases it', () => {
  const app = setup({ reduced: true });
  assert.deepEqual([...app.timers.values()].map(t => t.delay), [350]);
  app.motion.change({ matches: true });
  assert.equal(app.screen.inert, false);
  assert.equal(app.boot.hidden, true);
});

test('sound docks after DOMContentLoaded without the removed CRT controls', () => {
  const app = setup();
  const sound = app.attachSound();
  assert.equal(app.slot.child, sound);
});

test('startup sound follows the one-per-session boot and skip cancels it', () => {
  const first = setup();
  assert.deepEqual(first.bootAudio, ['start']);
  first.skipEvents.click();
  assert.deepEqual(first.bootAudio, ['start', 'skip']);
  first.events.pageshow({ persisted: true });
  assert.deepEqual(first.bootAudio, ['start', 'skip']);
  assert.deepEqual(setup({ session: first.session }).bootAudio, []);
  const automatic = setup();
  [...automatic.timers.values()].sort((a,b) => a.delay - b.delay).at(-1).fn();
  assert.deepEqual(automatic.bootAudio, ['start', 'finish']);
});

test('poster preparation waits for both fonts, including when one font fails to load', async () => {
  let resolveTitle, rejectDate;
  const title = new Promise(resolve => { resolveTitle = resolve; });
  const date = new Promise((_, reject) => { rejectDate = reject; });
  const classes = new Set(['is-preparing']);
  const app = setup({
    session: new Map([['portfolio-achievement-startup-v1', '1']]),
    poster: { classList: { add: value => classes.add(value) } },
    fonts: { load: font => font.includes('Barlow') ? title : date }
  });
  assert.equal(classes.has('is-poster-fitted'), false, 'a repeat visit cannot expose a fallback-font fit');
  rejectDate(new Error('font unavailable'));
  await new Promise(setImmediate);
  assert.equal(classes.has('is-poster-fitted'), false, 'one failed font cannot reveal another while it is still loading');
  resolveTitle([]);
  await new Promise(setImmediate);
  assert.equal(classes.has('is-poster-fitted'), true);
  assert.equal(classes.has('is-preparing'), true, 'only the final pixel renderer can reveal the poster');
  assert.deepEqual(app.signals, ['portfolio:achievementposterready']);
});
