const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../js/sound.js`, 'utf8');

function setup(storage = new Map(), blocked = false) {
  const events = {}, windowEvents = {}, audio = [];
  const label = {};
  const button = {
    dataset: {}, attributes: {},
    setAttribute(key, value) { this.attributes[key] = value; },
    querySelector() { return label; },
    addEventListener(name, handler) { this[name] = handler; }
  };
  const window = { addEventListener(name, handler) { windowEvents[name] = handler; } };
  vm.runInNewContext(source, {
    URL, window,
    document: {
      currentScript: { src: 'https://example.com/portfolio/js/sound.js' },
      createElement(tag) { return tag === 'button' ? button : { append() {} }; },
      body: { append() {}, querySelector() { return null; } },
      querySelector() { return null; },
      addEventListener(name, handler) { events[name] = handler; }
    },
    sessionStorage: {
      getItem(key) { if (blocked) throw Error('blocked'); return storage.get(key); },
      setItem(key, value) { if (blocked) throw Error('blocked'); storage.set(key, value); }
    },
    Audio: function(url) {
      this.url = url; this.plays = 0; this.pauses = 0;
      this.play = () => { this.plays++; return Promise.resolve(); };
      this.pause = () => { this.pauses++; };
      audio.push(this);
    }
  });
  events.DOMContentLoaded();
  return { sound: window.portfolioSound, button, label, audio, windowEvents };
}

test('new visits start muted without loading or playing any sound', () => {
  const app = setup();
  app.sound.play('cd'); app.sound.play('click');
  assert.equal(app.sound.muted, true);
  assert.equal(app.audio.length, 0);
  assert.equal(app.button.attributes['aria-label'], 'Unmute sound effects');
});

test('unmute enables effects, mute stops them immediately and blocks new playback', () => {
  const app = setup();
  app.button.click();
  app.sound.play('cd'); app.sound.play('click');
  assert.equal(app.audio.length, 2);
  assert.equal(app.audio[0].url, 'https://example.com/portfolio/Sound/CD.MP3');
  assert.equal(app.audio[0].plays, 1);
  assert.equal(app.label.textContent, 'Mute sound effects');
  app.button.click();
  app.sound.play('cd');
  assert.equal(app.audio[0].plays, 1);
  assert.equal(app.audio[0].pauses, 1);
  assert.equal(app.audio[1].pauses, 1);
  assert.equal(app.label.textContent, 'Unmute sound effects');
});

test('choice survives page changes and cached pages resync on Back', () => {
  const storage = new Map();
  const first = setup(storage);
  first.button.click();
  const next = setup(storage);
  assert.equal(next.sound.muted, false);
  next.button.click();
  first.windowEvents.pageshow({ persisted: true });
  assert.equal(first.sound.muted, true);
  assert.equal(first.label.textContent, 'Unmute sound effects');
});

test('blocked storage remains muted by default but the control still works', () => {
  const app = setup(new Map(), true);
  assert.equal(app.sound.muted, true);
  app.button.click(); app.sound.play('cd');
  assert.equal(app.audio[0].plays, 1);
});
