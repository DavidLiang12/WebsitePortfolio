const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../js/doom-player.js`, 'utf8');

async function setup() {
  const windowEvents = {}, documentEvents = {}, keys = [], mouse = [], buttons = [], captures = [], pauses = [];
  const container = { dataset: {}, replaceChildren() {} }, launcher = { hidden: false }, status = {}, play = { addEventListener() {} };
  const parent = {}, location = { href: 'https://example.com/desktop/doom.html', origin: 'https://example.com', protocol: 'https:' };
  const ciEvents = {};
  const ci = {
    sendKeyEvent: (key, pressed) => keys.push([key, pressed]),
    sendMouseButton: (button, pressed) => buttons.push([button, pressed]),
    sendMouseRelativeMotion: (x, y) => mouse.push([x, y]),
    events: () => ({ onMessage(fn) { ciEvents.message = fn; }, onExit(fn) { ciEvents.exit = fn; }, onFrame(fn) { ciEvents.frame = fn; } })
  };
  const player = { setNoCloud() {}, setMouseCapture: value => captures.push(value), setPaused: value => pauses.push(value), stop() { return Promise.resolve(); } };
  let options, timer = 0, exits = 0;
  const timers = new Map();
  const document = {
    hidden: false, pointerLockElement: null,
    getElementById: id => ({player:container,launcher,status,play})[id],
    addEventListener: (name, handler) => { documentEvents[name] = handler; },
    exitPointerLock() { exits++; this.pointerLockElement = null; }
  };
  const Dos = (_, input) => { options = input; return player; };
  const window = { Dos, addEventListener: (name, handler, opts) => { windowEvents[name] = handler; if (name === 'keydown' || name === 'keyup') assert.equal(opts.capture, true); } };
  class LocalURL extends URL {}
  LocalURL.createObjectURL = () => 'blob:local-game';
  LocalURL.revokeObjectURL = () => {};
  vm.runInNewContext(source, {
    window, document, parent, location, Dos, URL:LocalURL, Blob, AbortController,
    fetch: async () => ({ok:true,arrayBuffer:async()=>new Uint8Array([0x50,0x4b,0x03,0x04]).buffer}),
    setTimeout: (fn, delay) => { timers.set(++timer,{fn,delay}); return timer; }, clearTimeout: id => timers.delete(id), console
  });
  await new Promise(setImmediate);
  options.onEvent('ci-ready', ci);
  ciEvents.frame();
  function key(code, pressed = true, extra = {}) {
    const event = { code, target: { closest: () => null }, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...extra };
    windowEvents[pressed ? 'keydown' : 'keyup'](event);
    return event;
  }
  return {key,keys,mouse,buttons,captures,pauses,container,launcher,document,windowEvents,documentEvents,ci,player,exits:()=>exits,
    pause(value, overrides = {}) { windowEvents.message({origin:location.origin,source:parent,data:{type:'desktop-game-state',paused:value},...overrides}); }};
}

test('WASD and arrows send forward/back or strafe without duplicate native input', async () => {
  const app = await setup();
  assert.equal(app.container.dataset.state,'ready');
  assert.deepEqual(app.captures,[true]);
  for (const [code, expected] of [['KeyW',265],['ArrowUp',265],['KeyS',264],['ArrowDown',264],['KeyA',65],['ArrowLeft',65],['KeyD',68],['ArrowRight',68]]) {
    const event = app.key(code);
    assert.equal(event.prevented,true); assert.equal(event.stopped,true);
    app.key(code,true); // Keyboard repeat cannot create a second pressed event.
    app.key(code,false);
    assert.deepEqual(app.keys.splice(0),[[expected,true],[expected,false]]);
  }
  app.key('KeyW'); app.key('ArrowUp'); app.key('KeyW',false);
  assert.deepEqual(app.keys,[[265,true]],'releasing W cannot release a simultaneously held Up arrow');
  app.key('ArrowUp',false);
  assert.deepEqual(app.keys,[[265,true],[265,false]]);
});

test('mouse turns horizontally without walking on vertical movement', async () => {
  const app = await setup();
  app.ci.sendMouseRelativeMotion(12,40); app.ci.sendMouseRelativeMotion(-7,-90);
  assert.deepEqual(app.mouse,[[12,0],[-7,0]]);
});

test('pause, focus loss, pointer unlock and hidden tabs release held movement', async () => {
  for (const stop of [app=>app.pause(true),app=>app.windowEvents.blur(),app=>app.documentEvents.pointerlockchange(),app=>{app.document.hidden=true;app.documentEvents.visibilitychange();}]) {
    const app = await setup();
    app.key('KeyW'); app.key('ArrowRight');
    stop(app);
    assert.deepEqual(app.keys,[[265,true],[68,true],[265,false],[68,false]]);
    assert.deepEqual(app.buttons,[[0,false],[1,false],[2,false]]);
  }
  const app = await setup();
  app.document.pointerLockElement = {};
  app.pause(true);
  assert.equal(app.exits(),1);
  assert.equal(app.key('KeyW').prevented,undefined);
  assert.deepEqual(app.keys,[],'paused input cannot reach the game');
  app.pause(false); app.key('KeyW');
  assert.deepEqual(app.keys,[[265,true]]);
});

test('text controls, browser shortcuts and untrusted pause messages stay outside game movement', async () => {
  const app = await setup();
  for (const extra of [{ctrlKey:true},{metaKey:true},{altKey:true},{target:{closest:()=>({})}}]) assert.equal(app.key('KeyW',true,extra).prevented,undefined);
  assert.deepEqual(app.keys,[]);
  assert.equal(app.key('Escape').prevented,undefined,'the emulator retains Escape for its menu');
  app.pause(true,{origin:'https://elsewhere.example'});
  app.pause(true,{source:{}});
  app.key('KeyW');
  assert.deepEqual(app.keys,[[265,true]],'only the same-origin parent can pause the app');
  app.windowEvents.pagehide();
  assert.deepEqual(app.keys,[[265,true],[265,false]]);
});
