const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../js/achievement-pixels.js`, 'utf8');

function setup(label = '14%', { deferredFonts = false } = {}) {
  const frames = new Map(), events = {}, draws = [];
  const classes = new Set();
  const style = {
    // Browsers leave this shorthand empty when font-variant-numeric is set.
    font: '', fontStyle: 'normal', fontWeight: '500', fontSize: '11px',
    fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '.495px',
    color: 'rgb(239, 75, 63)', textTransform: 'uppercase',
    textShadow: 'rgb(101, 239, 173) -1.6px 0.35px 0.4px, rgba(236, 201, 76, 0.2) 0px 0px 30px'
  };
  const context = {
    set font(value) { assert.ok(value, 'Canvas must receive a valid font'); this.currentFont = value; },
    measureText(text) { return { width: text.length * 7, actualBoundingBoxLeft: 2, actualBoundingBoxRight: text.length * 7 + 3, actualBoundingBoxAscent: 11, actualBoundingBoxDescent: 3, fontBoundingBoxAscent: 11, fontBoundingBoxDescent: 3 }; },
    setTransform(...matrix) { this.matrix = matrix; }, save() {}, restore() {},
    fillText(text, x, y) { draws.push({ text, x, y, font: this.currentFont, matrix: this.matrix }); }
  };
  const output = { style: {}, isConnected: true, setAttribute() {}, getContext: () => context };
  const textNode = { textContent: label, length: label.length };
  const element = {
    textContent: label, isConnected: true,
    classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: label.length * 7, height: 16.5 }),
    append() {}, closest: () => null
  };
  textNode.parentElement = element;
  let frame = 0, rangeStart = 0, rangeEnd = label.length, measurements = 0, sleeping = false;
  element.closest = selector => sleeping && selector === '.achievement-crt-sleeping' ? element : null;
  let fontsLoaded;
  const document = {
    body: { classList: { toggle() {} } },
    querySelector: selector => selector === '.achievement-pc-page' ? {} : null,
    querySelectorAll: selector => selector.includes('.achievement-copy h2') ? [element] : [],
    getElementById: id => id === 'achievement-boot' ? { hidden: true } : null,
    createElement: () => output,
    createTreeWalker: () => ({ currentNode: textNode, nextNode() { if (this.visited) return false; this.visited = true; return true; } }),
    createRange: () => ({
      selectNodeContents() { rangeStart = 0; rangeEnd = label.length; },
      setStart(_, index) { rangeStart = index; }, setEnd(_, index) { rangeEnd = index; },
      getClientRects() { measurements++; return [{ left: rangeStart * 7, top: 1, width: (rangeEnd - rangeStart) * 7, height: 14 }]; }, detach() {}
    }),
    addEventListener() {}, fonts: { ready: { then(fn) { if (deferredFonts) fontsLoaded = fn; else fn(); } } }
  };
  vm.runInNewContext(source, {
    document, NodeFilter: { SHOW_TEXT: 4 }, getComputedStyle: () => style,
    matchMedia: query => ({ matches: query.includes('641px'), addEventListener() {} }),
    window: { addEventListener: (name, fn) => { events[name] = fn; } },
    requestAnimationFrame: fn => { frames.set(++frame, fn); return frame; },
    cancelAnimationFrame: id => frames.delete(id)
  });
  return { output, draws, frames, events, classes, measurements: () => measurements,
    resolveFonts() { fontsLoaded(); },
    setSleeping(value) { sleeping = value; },
    tick() { const [id, fn] = frames.entries().next().value; frames.delete(id); fn(); } };
}

test('pixel percentages retain their inherited font and leave room for ink and RGB glow', () => {
  for (const label of ['0%', '14%', '43%', '100%']) {
    const app = setup(label);
    app.tick();
    const draw = app.draws[0];
    assert.equal(draw.font, 'normal 500 11px "IBM Plex Mono", monospace');
    assert.equal(draw.text, label);
    assert.equal(app.measurements(), 1, 'single-line text needs only one layout range measurement');
    assert.ok(app.output.width < parseFloat(app.output.style.width), 'text uses a truly smaller backing store');
    assert.ok(app.output.width / parseFloat(app.output.style.width) > .8, 'small type is only mildly reduced');
    const [sx, , , sy, tx, ty] = draw.matrix;
    assert.ok((draw.x - 2 - 34) * sx + tx >= 0, 'left glyph and glow fit');
    assert.ok((draw.x + label.length * 7 + 3 + 34) * sx + tx <= app.output.width, 'right glyph and glow fit');
    assert.ok((draw.y - 11 - 34) * sy + ty >= 0, 'top glyph and glow fit');
    assert.ok((draw.y + 3 + 34) * sy + ty <= app.output.height, 'bottom glyph and glow fit');
    assert.equal(app.classes.has('is-pixel-ready'), true);
  }
});

test('offscreen text defers its low-resolution drawing until it enters the prewarmed viewport', () => {
  const app = setup();
  app.setSleeping(true); app.tick();
  assert.equal(app.draws.length, 0);
  app.setSleeping(false); app.events['portfolio:achievementvisibility'](); app.tick();
  assert.ok(app.draws.length > 0);
  assert.ok(app.output.width < parseFloat(app.output.style.width));
});

test('static text is cached and schedules no redraws while leaving the page', () => {
  const app = setup();
  app.tick();
  const count = app.draws.length;
  app.events.resize(); app.tick();
  assert.equal(app.draws.length, count);
  app.events['portfolio:transitionstart']();
  app.events.resize();
  assert.equal(app.frames.size, 0);
});

test('refresh and visibility events cannot rasterize fallback text while web fonts load', () => {
  const app = setup('43%', { deferredFonts: true });
  for (const event of ['pageshow', 'resize', 'portfolio:achievementvisibility']) {
    app.events[event](); app.tick();
    assert.equal(app.draws.length, 0);
    assert.equal(app.measurements(), 0, 'font readiness precedes layout measurement');
    assert.equal(app.classes.has('is-pixel-ready'), false);
  }
  app.resolveFonts(); app.tick();
  assert.ok(app.draws.length > 0, 'the settled font is painted on its first ready frame');
  assert.equal(app.classes.has('is-pixel-ready'), true);
});

function setupPoster({ contrast = false, canvasUnavailable = false } = {}) {
  const frames = new Map(), events = {}, draws = [], outputs = [];
  const classes = values => ({
    values: new Set(values),
    add(value) { this.values.add(value); },
    remove(value) { this.values.delete(value); },
    contains(value) { return this.values.has(value); }
  });
  const host = {
    classList: classes(['is-preparing']),
    append(node) { outputs.push(node); },
    querySelector: () => outputs.find(node => node.className === 'achievement-poster-pixels')
  };
  const box = { left: 20, top: 100, width: 700, height: 413 };
  const identity = { a: 1, b: 0, c: 0, d: 1, e: 20, f: 100 };
  const type = label => ({
    textContent: label,
    getScreenCTM: () => identity,
    getAttribute: () => '0'
  });
  const elements = {
    'achievement-poster-number': { getAttribute: () => 'translate(760 130)' },
    'achievement-poster-title-type': type('ACHIEVEMENTS'),
    'achievement-poster-number-type': type('01'),
    'achievement-poster-date-art': type('2026年10月18日')
  };
  const clearance = type('01');
  const svg = {
    parentElement: host, getBoundingClientRect: () => box, closest: () => null,
    querySelectorAll: () => [], querySelector: () => clearance
  };
  let fontsLoaded, frame = 0;
  const makeOutput = () => {
    const context = {
      setTransform() {}, save() {}, restore() {}, drawImage() {}, strokeText() {},
      fillText(label) { draws.push(label); }
    };
    return { style: {}, classList: classes([]), setAttribute() {}, getContext: () => canvasUnavailable ? null : context };
  };
  const document = {
    body: { classList: { toggle() {} } }, fonts: { ready: { then(fn) { fontsLoaded = fn; } } },
    querySelector: selector => ({ '.achievement-pc-page': {}, '.achievement-poster-art': svg, '.achievement-poster': host })[selector] || null,
    querySelectorAll: () => [],
    getElementById: id => id === 'achievement-boot' ? { hidden: true } : elements[id],
    createElement: () => makeOutput(), addEventListener() {}
  };
  vm.runInNewContext(source, {
    document, Event,
    getComputedStyle: () => ({ font: 'italic 800 190px "Barlow Condensed"', letterSpacing: '-6px', fill: '#ef4b3f', textShadow: 'none', strokeWidth: '12px' }),
    matchMedia: query => ({ matches: query.includes('641px') || contrast, addEventListener() {} }),
    window: {
      addEventListener: (name, fn) => { events[name] = fn; },
      dispatchEvent(event) {
        if (event.type === 'portfolio:achievementpixels') {
          // The real CRT listener marks each new filter surface sleeping until
          // its IntersectionObserver supplies the initial visibility result.
          host.querySelector().classList.add('achievement-crt-sleeping');
        }
      }
    },
    requestAnimationFrame: fn => { frames.set(++frame, fn); return frame; },
    cancelAnimationFrame: id => frames.delete(id)
  });
  return {
    host, svg, draws, outputs, events,
    resolveFonts() { fontsLoaded(); },
    fit() { host.classList.add('is-poster-fitted'); events['portfolio:achievementposterready'](); },
    wake() { host.querySelector().classList.remove('achievement-crt-sleeping'); events['portfolio:achievementvisibility'](); },
    tick() { const [id, fn] = frames.entries().next().value; frames.delete(id); fn(); }
  };
}

test('banner reveals one settled pixel frame only after font fitting and CRT readiness', () => {
  const app = setupPoster();
  app.events.pageshow(); app.tick();
  assert.equal(app.outputs.length, 0, 'no canvas can capture a temporary fallback layout');
  assert.equal(app.host.classList.contains('is-preparing'), true);
  app.resolveFonts(); app.tick();
  assert.equal(app.outputs.length, 0, 'fonts alone do not replace the unfitted artwork');
  assert.equal(app.host.classList.contains('is-preparing'), true);
  app.fit(); app.tick();
  assert.equal(app.outputs.length, 1);
  assert.deepEqual(app.draws, ['01', 'ACHIEVEMENTS', '01', '2026年10月18日']);
  assert.equal(app.host.classList.contains('is-preparing'), true, 'unfiltered pixels remain hidden');
  const drawn = app.draws.length;
  app.wake(); app.tick();
  assert.equal(app.host.classList.contains('is-preparing'), false);
  assert.equal(app.draws.length, drawn, 'CRT readiness reveals the existing frame without refitting or redrawing');
});

test('native banner fallbacks reveal only after the fonts and number fitting are settled', () => {
  for (const options of [{ contrast: true }, { canvasUnavailable: true }]) {
    const app = setupPoster(options);
    app.events.pageshow(); app.tick();
    assert.equal(app.host.classList.contains('is-preparing'), true);
    app.resolveFonts(); app.tick();
    assert.equal(app.host.classList.contains('is-preparing'), true);
    app.fit(); app.tick();
    assert.equal(app.host.classList.contains('is-preparing'), false, 'unsupported pixel effects must not leave a blank poster');
    assert.equal(app.draws.length, 0);
    assert.equal(app.host.classList.contains('is-pixel-poster'), false, 'the fitted native SVG remains the visible fallback');
  }
});
