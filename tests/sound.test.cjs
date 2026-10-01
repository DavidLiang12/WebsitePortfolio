const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../js/sound.js`, 'utf8');

function setup(storage = new Map(), blocked = false, desktop = false) {
  const events = {}, windowEvents = {}, audio = [], notes = [], buffers = [], gains = [];
  const label = {};
  const button = {
    dataset: {}, attributes: {}, classList: { add() {} },
    setAttribute(key, value) { this.attributes[key] = value; },
    querySelector() { return label; },
    addEventListener(name, handler) { this[name] = handler; }
  };
  const window = { addEventListener(name, handler) { windowEvents[name] = handler; } };
  window.AudioContext = function() {
    this.state = 'running'; this.currentTime = 0; this.destination = {}; this.sampleRate = 44100;
    this.createBuffer = (_, length) => ({ getChannelData: () => new Float32Array(length) });
    this.createBufferSource = () => {
      const source = { connect() {}, disconnect() {}, start() { this.started = true; }, stop(time) { if (time === undefined) this.muted = true; } };
      buffers.push(source); return source;
    };
    this.createBiquadFilter = () => ({ frequency: {}, Q: {}, connect() {}, disconnect() {} });
    this.createOscillator = () => {
      const note = { frequency: { setValueAtTime(value) { note.hz = value; } }, connect() {}, disconnect() {}, start() {}, stop(time) { if (time === undefined) note.muted = true; } };
      notes.push(note); return note;
    };
    this.createGain = () => {
      const gain = { gain: { setValueAtTime() {}, linearRampToValueAtTime(value) { gain.peak = value; }, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
      gains.push(gain); return gain;
    };
  };
  vm.runInNewContext(source, {
    URL, window,
    document: {
      currentScript: { src: 'https://example.com/portfolio/js/sound.js' },
      createElement(tag) { return tag === 'button' ? button : { append() {} }; },
      body: { classList: { contains: name => desktop && name === 'art-2d-page' }, append() {}, querySelector() { return null; } },
      querySelector() { return null; },
      addEventListener(name, handler) { events[name] = handler; }
    },
    sessionStorage: {
      getItem(key) { if (blocked) throw Error('blocked'); return storage.get(key); },
      setItem(key, value) { if (blocked) throw Error('blocked'); storage.set(key, value); }
    },
    Audio: function(url) {
      this.url = url; this.plays = 0; this.pauses = 0; this.readyState = 4;
      this.load = () => { this.loads = (this.loads || 0) + 1; };
      this.play = () => { this.plays++; return Promise.resolve(); };
      this.pause = () => { this.pauses++; };
      audio.push(this);
    }
  });
  events.DOMContentLoaded();
  return { sound: window.portfolioSound, button, label, audio, notes, buffers, gains, windowEvents };
}

test('new visits preload effects while remaining silent', () => {
  const app = setup();
  app.sound.play('cd'); app.sound.play('click');
  assert.equal(app.sound.muted, true);
  assert.equal(app.audio.length, 3);
  assert.ok(app.audio.every(sound => sound.loads === 1 && sound.plays === 0));
  assert.equal(app.button.attributes['aria-label'], 'Unmute sound effects');
});

test('unmute enables effects, mute stops them immediately and blocks new playback', () => {
  const app = setup();
  app.button.click();
  app.sound.play('cd'); app.sound.play('click');
  assert.equal(app.audio.length, 3);
  assert.equal(app.audio[0].src, 'https://example.com/portfolio/Sound/Click.MP3');
  assert.equal(app.audio[0].plays, 1);
  assert.equal(app.label.textContent, 'Unmuted');
  app.button.click();
  app.sound.play('cd');
  assert.equal(app.audio[0].plays, 1);
  assert.equal(app.audio[0].pauses, 1);
  assert.equal(app.audio[1].pauses, 1);
  assert.equal(app.label.textContent, 'Muted');
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
  assert.equal(first.label.textContent, 'Muted');
});

test('blocked storage remains muted by default but the control still works', () => {
  const app = setup(new Map(), true);
  assert.equal(app.sound.muted, true);
  app.button.click(); app.sound.play('cd');
  assert.equal(app.audio.find(sound => sound.src.endsWith('CD.MP3')).plays, 1);
});

test('soft notes have stable pitches and respect mute immediately', () => {
  const app = setup();
  app.sound.note(60);
  assert.equal(app.notes.length, 0);
  app.button.click();
  app.sound.note(60); app.sound.note(67); app.sound.note(60);
  assert.equal(app.notes[0].hz, app.notes[2].hz);
  assert.notEqual(app.notes[0].hz, app.notes[1].hz);
  app.button.click();
  assert.ok(app.notes.every(note => note.muted));
  app.sound.note(72);
  assert.equal(app.notes.length, 3);
});

test('rapid notes limit overlapping voices and page exit stops them', () => {
  const app = setup(); app.button.click();
  for (let i = 0; i < 30; i++) app.sound.note(60 + i % 8);
  assert.equal(app.notes.filter(note => !note.muted).length, 8);
  app.windowEvents.pagehide();
  assert.ok(app.notes.every(note => note.muted));
});

test('click notes vary, continue across pages, and stay silent when muted', () => {
  const storage = new Map();
  const first = setup(storage);
  first.sound.softClick();
  assert.equal(first.notes.length, 0);
  first.button.click();
  first.sound.softClick(); first.sound.softClick();
  assert.notEqual(first.notes[0].hz, first.notes[1].hz);
  assert.equal(first.notes[0].type, 'sine');
  const second = setup(storage);
  second.sound.softClick();
  assert.notEqual(second.notes[0].hz, first.notes[1].hz);
  second.button.click(); second.sound.softClick();
  assert.equal(second.notes.length, 1);
  assert.ok(second.notes[0].muted);
});

test('a cold effect uses an immediate note instead of queuing late playback', () => {
  const app = setup();
  app.button.click();
  app.audio.forEach(sound => { sound.readyState = 0; });
  app.sound.play('cd');
  assert.ok(app.audio.every(sound => sound.plays === 0));
  assert.equal(app.notes.length, 1);
  app.audio.forEach(sound => { sound.readyState = 4; });
  app.sound.play('cd');
  assert.equal(app.audio.find(sound => sound.src.endsWith('CD.MP3')).plays, 1);
});

test('2D desktop retains the compact speaker control and original labels', () => {
  const app = setup(new Map(), false, true);
  assert.ok(app.button.innerHTML.includes('sound-off'));
  assert.equal(app.label.textContent, 'Unmute sound effects');
  app.button.click();
  assert.equal(app.label.textContent, 'Mute sound effects');
});

test('paper peel is silent when muted and stops immediately on mute', () => {
  const app = setup();
  app.sound.peel();
  const peel = app.audio.find(sound => sound.src.endsWith('/Peel.MP3'));
  assert.equal(peel.plays, 0);
  app.button.click(); app.sound.peel();
  assert.equal(peel.plays, 1);
  assert.equal(peel.currentTime, 0);
  app.button.click();
  assert.equal(peel.pauses, 1);
  app.sound.peel();
  assert.equal(peel.plays, 1);
});

test('home arrow volume increases the soft note without changing its envelope', () => {
  const app = setup(); app.button.click();
  app.sound.softClick(); app.sound.softClick(1.8);
  const notes = app.gains.filter(gain => gain.peak !== undefined);
  assert.ok(Math.abs(notes[1].peak / notes[0].peak - 1.8) < 0.001);
});

test('cassette latch sounds on both toggle directions, with no sound on initial load', () => {
  const app = setup();
  assert.equal(app.buffers.length, 0);
  app.button.click();
  assert.equal(app.buffers.length, 1);
  assert.equal(app.buffers[0].started, true);
  app.button.click();
  assert.equal(app.sound.muted, true);
  assert.equal(app.buffers[0].muted, true);
  assert.equal(app.buffers[1].started, true);
  app.sound.peel(); app.sound.softClick();
  assert.equal(app.buffers.length, 2);
  app.windowEvents.pagehide();
  assert.equal(app.buffers[1].muted, true);
});
