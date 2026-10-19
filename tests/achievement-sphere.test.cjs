const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../js/achievement-sphere.js`, 'utf8');

function setup({ reduced = false, mobile = false, booting = false, pixels = false } = {}) {
  const frames = new Map(), events = {}, documentEvents = {};
  const strokes = [], transforms = [];
  const pixelContext = { setTransform(...args) { transforms.push(args); }, clearRect() {},
    beginPath() { this.path = []; }, moveTo(...args) { this.path.push(...args); }, lineTo(...args) { this.path.push(...args); }, arc(...args) { this.path.push(...args); },
    stroke(path) { strokes.push({ points: path?.points || this.path, width: this.lineWidth }); } };
  const canvas = { getContext: () => pixelContext, setAttribute() {} };
  class PixelPath { constructor() { this.points = []; } moveTo(...args) { this.points.push(...args); } lineTo(...args) { this.points.push(...args); } }
  let nextFrame = 0;
  const fallback = { remove() { this.removed = true; } };
  const svg = { children: [], style: {}, parentElement: { append(node) { this.canvas = node; } }, getBoundingClientRect: () => ({ width: 900 }), append(...nodes) { this.children.push(...nodes); }, querySelector: () => fallback };
  const motion = { matches: reduced, addEventListener(_, fn) { this.change = fn; } };
  const enabled = { matches: !mobile, addEventListener(_, fn) { this.change = fn; } };
  const boot = { hidden: !booting };
  const document = {
    hidden: false,
    getElementById: id => id === 'achievement-sphere' ? svg : id === 'achievement-boot' ? boot : null,
    createElementNS: (_, name) => ({ name, setAttribute(key, value) { this[key] = value; } }),
    createElement: () => pixels ? canvas : null,
    addEventListener: (name, fn) => { documentEvents[name] = fn; }
  };
  vm.runInNewContext(source, { document, Path2D: PixelPath, window: { addEventListener: (name, fn) => { events[name] = fn; } },
    matchMedia: query => query.includes('641px') ? enabled : motion,
    requestAnimationFrame: fn => { frames.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id)
  });
  return { svg, fallback, motion, enabled, document, frames, events, documentEvents, boot, canvas, strokes, transforms,
    tick(time) { const [id, fn] = frames.entries().next().value; frames.delete(id); fn(time); } };
}

test('wireframe draws finite paths and rotates without the removed pause control', () => {
  const app = setup();
  assert.equal(app.fallback.removed, true);
  assert.ok(app.svg.children.filter(node => node.name === 'path').every(path => typeof path.d === 'string' && !path.d.includes('NaN')));
  const drawing = () => app.svg.children.map(path => path.d || '').join('');
  const original = drawing();
  app.tick(40); app.tick(80);
  assert.notEqual(drawing(), original);
  assert.equal(app.frames.size, 1);
});

test('sphere stays static for reduced motion/mobile and stops while hidden or navigating', () => {
  assert.equal(setup({ reduced: true }).frames.size, 0);
  assert.equal(setup({ mobile: true }).frames.size, 0);
  const app = setup();
  app.document.hidden = true; app.documentEvents.visibilitychange();
  assert.equal(app.frames.size, 0);
  app.document.hidden = false; app.documentEvents.visibilitychange();
  assert.equal(app.frames.size, 1);
  app.events.pagehide();
  assert.equal(app.frames.size, 0);
  app.events.pageshow();
  assert.equal(app.frames.size, 1);
  app.motion.matches = true; app.motion.change();
  assert.equal(app.frames.size, 0);
});

test('shutdown stops sphere redraws immediately and resumes after cancellation or Back', () => {
  const app = setup();
  const drawing = () => app.svg.children.map(path => path.d || '').join('');
  const original = drawing();
  app.events['portfolio:transitionstart']();
  assert.equal(app.frames.size, 0);
  app.documentEvents.visibilitychange();
  assert.equal(app.frames.size, 0, 'other visibility events must not restart a departing sphere');
  assert.equal(drawing(), original);
  app.events['portfolio:transitionend']();
  app.tick(40); app.tick(80);
  assert.notEqual(drawing(), original);
  app.events['portfolio:transitionstart']();
  app.events.pagehide();
  app.events.pageshow();
  assert.equal(app.frames.size, 1);
});

test('the loading screen suspends the sphere until startup finishes, including cached returns', () => {
  const app = setup({ booting: true });
  assert.equal(app.frames.size, 0);
  app.events.pageshow();
  assert.equal(app.frames.size, 0);
  app.boot.hidden = true;
  app.events['portfolio:achievementboot']();
  assert.equal(app.frames.size, 1);
  app.boot.hidden = false;
  app.events['portfolio:achievementboot']();
  assert.equal(app.frames.size, 0);
});

test('the pixel sphere uses a smaller real buffer, finite thicker strokes, and a native fallback', () => {
  const app = setup({ pixels: true });
  assert.equal(app.canvas.width, 600);
  assert.equal(app.canvas.height, 600);
  assert.equal(app.svg.style.visibility, 'hidden');
  assert.equal(app.svg.parentElement.canvas, app.canvas);
  assert.ok(app.strokes.every(stroke => stroke.points.every(Number.isFinite)));
  assert.ok(app.strokes.some(stroke => stroke.width === 1.1));
  const fallbackPaths = app.svg.children.filter(node => node.name === 'path');
  assert.ok(fallbackPaths.every(path => typeof path.d === 'string' && !path.d.includes('NaN')));
  assert.ok(fallbackPaths.some(path => path.d.length > 100));
  const count = app.strokes.length;
  app.tick(40); app.tick(80);
  assert.ok(app.strokes.length > count);
  app.events['portfolio:transitionstart']();
  assert.equal(app.frames.size, 0);
});
