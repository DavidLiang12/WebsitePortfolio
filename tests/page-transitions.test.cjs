const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(`${__dirname}/../js/page-transitions.js`, 'utf8');

function setup(path = 'index.html', { reduced = false, blocked = false, stored = {} } = {}) {
  const root = 'https://example.com/portfolio/';
  const events = {}, windowEvents = {}, storage = new Map(Object.entries(stored));
  const overlays = [], destinations = [], animations = [], signals = [];
  const makeElement = () => ({
    classList: { values: new Set(), add(value) { this.values.add(value); }, remove(value) { this.values.delete(value); } },
    children: [], attributes: {}, style: { transformOrigin: '', setProperty() {} }, setAttribute(key, value) { this.attributes[key] = value; },
    getBoundingClientRect() { return { top: -400 }; },
    append(child) { this.children.push(child); },
    remove() { this.removed = true; },
    getAnimations() { return []; },
    animate(frames,options) { animations.push({element:this,frames,options,signals:[...signals]}); return { finished: Promise.resolve(), cancel() {} }; }
  });
  const document = {
    currentScript: { src: `${root}js/page-transitions.js` },
    body: makeElement(),
    documentElement: { append(element) { overlays.push(element); } },
    createElement: makeElement,
    addEventListener(name, handler) { events[name] = handler; }
  };
  const location = { href: root + path, assign(url) { destinations.push(url); } };
  const window = { innerHeight: 800, addEventListener(name, handler) { windowEvents[name] = handler; },
    dispatchEvent(event) { signals.push(event.type); windowEvents[event.type]?.(event); } };
  const context = {
    URL, Event, document, location, window, Element: { prototype: { animate() {} } },
    matchMedia: () => ({ matches: reduced, addEventListener() {} }),
    sessionStorage: {
      getItem(key) { if (blocked) throw Error('blocked'); return storage.get(key) || null; },
      setItem(key, value) { if (blocked) throw Error('blocked'); storage.set(key, value); },
      removeItem(key) { storage.delete(key); }
    },
    setTimeout() { return 1; }, clearTimeout() {}
  };
  vm.runInNewContext(source, context);
  return {
    events, windowEvents, overlays, destinations, storage, document, animations, signals,
    async click(href, options = {}) {
      const link = { href: new URL(href, location.href).href, target: options.target || '', hasAttribute: () => !!options.download };
      const event = { button: 0, ...options, target: { closest: () => link }, preventDefault() { this.defaultPrevented = true; } };
      await events.click(event);
      return event;
    }
  };
}

test('selected page exits transition across a subdirectory deployment', async () => {
  const pages = ['index.html', 'games.html', 'projects.html', 'art-2d.html', 'art-3d.html', 'about.html', 'achievements.html'];
  const effects = ['tape', 'iris', 'iris', 'crt', 'film', 'cd', 'crt'];
  for (const from of pages) for (const to of pages) {
    const app = setup(from);
    const event = await app.click(to);
    const transitions = from !== to;
    assert.equal(!!event.defaultPrevented, transitions, `${from} -> ${to}`);
    assert.equal(app.destinations.length, transitions ? 1 : 0);
    if (from === 'art-3d.html' && transitions) assert.equal(app.overlays[0].children[0].textContent, 'NEXT SCENE');
    if (transitions) assert.equal(app.overlays[0].className, `page-transition pt-${effects[pages.indexOf(from)]} pt-from-${from.replace('.html', '')}`);
  }
});

test('navigation keeps the outgoing cover until a cached page is restored', async () => {
  for (const from of ['index.html', 'games.html', 'projects.html', 'art-2d.html', 'art-3d.html', 'about.html', 'achievements.html']) {
    for (const persisted of [false, true]) {
      const app = setup(from);
      await app.click(from === 'index.html' ? 'games.html' : 'index.html');
      const cover = app.overlays[0];
      app.windowEvents.pagehide({ persisted });
      assert.notEqual(cover.removed, true, `${from}: old page must remain covered at pagehide`);
      if (from === 'art-2d.html') assert.equal(app.document.body.classList.values.has('crt-screen-shutdown'), true);
      if (from === 'achievements.html') assert.equal(app.document.body.classList.values.has('crt-screen-shutdown'), false);
      app.windowEvents.pageshow({ persisted: true });
      assert.equal(cover.removed, true, `${from}: Back/Forward must clear the cover`);
      assert.equal(app.document.body.classList.values.has('crt-screen-shutdown'), false);
      assert.equal(app.storage.has('portfolio-transition-pending'), false);
      await app.click(from === 'index.html' ? 'games.html' : 'index.html');
      assert.equal(app.destinations.length, 2, `${from}: restored page must allow navigation again`);
    }
  }
});

test('detail pages, external links, anchors, and same-page aliases stay native', async () => {
  for (const href of ['games/game1.html', 'art/pixar-studio.html', '#main-content', './', 'index.html?x=1', 'https://elsewhere.com/games.html', 'mailto:test@example.com']) {
    assert.equal((await setup().click(href)).defaultPrevented, undefined, href);
  }
  assert.equal((await setup('games/game1.html').click('../games.html')).defaultPrevented, undefined);
});

test('modifier clicks, downloads, named targets, and prevented events stay native', async () => {
  for (const options of [{ctrlKey:true}, {metaKey:true}, {altKey:true}, {shiftKey:true}, {button:1}, {target:'_blank'}, {target:'another-frame'}, {download:true}, {defaultPrevented:true}]) {
    const app = setup();
    await app.click('games.html', options);
    assert.equal(app.destinations.length, 0);
  }
});

test('reduced motion and unavailable storage never delay navigation', async () => {
  for (const options of [{reduced:true}, {blocked:true}]) {
    const app = setup('index.html', options);
    assert.equal((await app.click('about.html')).defaultPrevented, undefined);
    assert.equal(app.overlays.length, 0);
  }
});

test('departure effect and palette survive arrival regardless of old preferences or query overrides', async () => {
  for (const [from, type] of Object.entries({'index.html':'tape', 'about.html':'cd', 'games.html':'iris', 'projects.html':'iris', 'art-3d.html':'film', 'art-2d.html':'crt', 'achievements.html':'crt'})) {
    const app = setup(`${from}?transition=circles`, {stored:{'portfolio-transition':'circles'}});
    const destination = from === 'games.html' ? 'index.html' : 'games.html';
    await app.click(destination);
    const expectedClass = `page-transition pt-${type} pt-from-${from.replace('.html', '')}`;
    assert.equal(app.overlays[0].className, expectedClass);
    const stored = Object.fromEntries(app.storage);
    const incoming = setup(destination, {stored});
    assert.equal(incoming.overlays[0].className, expectedClass);
    await incoming.events.DOMContentLoaded();
    assert.equal(incoming.overlays[0].removed, true);
    assert.equal(incoming.storage.has('portfolio-transition-pending'), false);
    assert.equal(setup('about.html', {stored}).overlays.length, 0);
    app.windowEvents.pageshow({persisted:true});
    assert.equal(app.overlays[0].removed, true);
  }
});

test('stale arrivals and invalid preferences do not trigger entrance animations', () => {
  const app = setup('games.html?transition=invalid', {stored: {
    'portfolio-transition': 'invalid',
    'portfolio-transition-pending': JSON.stringify({type:'cd', from:'about.html', href:'https://example.com/portfolio/games.html?transition=invalid', time:0})
  }});
  assert.equal(app.overlays.length, 0);
});

test('achievement power-off animates only three fixed cover layers, never the filtered document', async () => {
  const app = setup('achievements.html');
  await app.click('index.html');
  assert.equal(app.document.body.style.transformOrigin, '');
  assert.equal(app.overlays[0].attributes['data-crt-curtain'], '');
  assert.equal(app.overlays[0].children.length, 3);
  assert.equal(app.animations.length, 3);
  for (const animation of app.animations) {
    assert.notEqual(animation.element, app.document.body);
    assert.ok(app.overlays[0].children.includes(animation.element));
    assert.ok(animation.options.duration <= 480);
    assert.deepEqual(animation.signals, ['portfolio:transitionstart']);
    assert.ok(animation.frames.every(frame => Object.keys(frame).every(key => ['transform','opacity','offset'].includes(key))));
  }
  app.windowEvents.pageshow({ persisted: true });
  assert.deepEqual(app.signals, ['portfolio:transitionstart', 'portfolio:transitionend']);
  assert.equal(app.document.body.style.transformOrigin, '');
  assert.equal(app.document.body.classList.values.has('crt-screen-shutdown'), false);
});

test('power-off line stays hidden until the covers nearly meet, then quickly shrinks', async () => {
  const app = setup('achievements.html');
  await app.click('index.html');
  const [top, bottom, line] = app.animations;
  assert.equal(top.options.duration, 360);
  assert.equal(bottom.options.duration, 360);
  assert.equal(line.options.duration, 480);
  assert.equal(line.options.easing, 'linear', 'line offsets must correspond to actual elapsed time');
  const hold = line.frames[1], flash = line.frames[2], short = line.frames[3];
  assert.equal(hold.opacity, 0);
  assert.ok(hold.offset * line.options.duration >= 350);
  assert.ok(flash.offset * line.options.duration >= top.options.duration);
  assert.equal(flash.transform, 'scaleX(.6)');
  assert.equal(short.transform, 'scaleX(.035)');
  assert.ok((1 - hold.offset) * line.options.duration < 130);
  assert.equal(line.frames.at(-1).opacity, 0);
});
