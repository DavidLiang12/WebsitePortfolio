const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(`${__dirname}/../js/page-transitions.js`, 'utf8');

function setup(path = 'index.html', { reduced = false, blocked = false, stored = {} } = {}) {
  const root = 'https://example.com/portfolio/';
  const events = {}, windowEvents = {}, storage = new Map(Object.entries(stored));
  const overlays = [], destinations = [];
  const makeElement = () => ({
    children: [], style: { setProperty() {} }, setAttribute() {},
    append(child) { this.children.push(child); },
    remove() { this.removed = true; },
    getAnimations() { return []; },
    animate() { return { finished: Promise.resolve() }; }
  });
  const document = {
    currentScript: { src: `${root}js/page-transitions.js` },
    documentElement: { append(element) { overlays.push(element); } },
    createElement: makeElement,
    addEventListener(name, handler) { events[name] = handler; }
  };
  const location = { href: root + path, assign(url) { destinations.push(url); } };
  const window = { addEventListener(name, handler) { windowEvents[name] = handler; } };
  const context = {
    URL, document, location, window, Element: { prototype: { animate() {} } },
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
    events, windowEvents, overlays, destinations, storage,
    async click(href, options = {}) {
      const link = { href: new URL(href, location.href).href, target: options.target || '', hasAttribute: () => !!options.download };
      const event = { button: 0, ...options, target: { closest: () => link }, preventDefault() { this.defaultPrevented = true; } };
      await events.click(event);
      return event;
    }
  };
}

test('every distinct pair of main pages transitions, including a subdirectory deployment', async () => {
  const pages = ['index.html', 'games.html', 'projects.html', 'art-2d.html', 'art-3d.html', 'about.html'];
  const effects = ['tape', 'shutter', 'shutter', 'equalizer', 'equalizer', 'cd'];
  for (const from of pages) for (const to of pages) {
    const app = setup(from);
    const event = await app.click(to);
    assert.equal(!!event.defaultPrevented, from !== to, `${from} -> ${to}`);
    assert.equal(app.destinations.length, from !== to ? 1 : 0);
    if (from !== to) assert.equal(app.overlays[0].className, `page-transition pt-${effects[pages.indexOf(from)]} pt-from-${from.replace('.html', '')}`);
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
  for (const [from, type] of Object.entries({'index.html':'tape', 'about.html':'cd', 'games.html':'shutter', 'projects.html':'shutter', 'art-2d.html':'equalizer', 'art-3d.html':'equalizer'})) {
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
