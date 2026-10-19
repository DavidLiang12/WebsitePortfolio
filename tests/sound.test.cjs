const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../js/sound.js`, 'utf8');

function setup(storage = new Map(), blocked = false, desktop = false) {
  const events = {}, windowEvents = {}, audio = [], notes = [], buffers = [], gains = [];
  const boot = { hidden: true };
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
    URL, window, cancelAnimationFrame() {}, requestAnimationFrame() { return 1; }, performance: { now: () => 0 },
    document: {
      currentScript: { src: 'https://example.com/portfolio/js/sound.js', dataset: desktop === 'achievement-pc-page' ? {achievementAudio:'true'} : {} },
      createElement(tag) { return tag === 'button' ? button : { append() {} }; },
      body: { classList: { contains: name => desktop && name === (desktop === true ? 'art-2d-page' : desktop) }, append() {}, querySelector() { return null; } },
      querySelector() { return null; },
      getElementById: id => id === 'achievement-boot' ? boot : null,
      addEventListener(name, handler) { events[name] = handler; }
    },
    sessionStorage: {
      getItem(key) { if (blocked) throw Error('blocked'); return storage.get(key); },
      setItem(key, value) { if (blocked) throw Error('blocked'); storage.set(key, value); }
    },
    Audio: function(url) {
      this.url = url; this.plays = 0; this.pauses = 0; this.readyState = 4;
      this.listeners = {};
      this.addEventListener = (name, handler) => { this.listeners[name] = handler; };
      this.load = () => { this.loads = (this.loads || 0) + 1; };
      this.play = () => { this.plays++; return this.playError ? Promise.reject(this.playError) : Promise.resolve(); };
      this.pause = () => { this.pauses++; };
      audio.push(this);
    }
  });
  events.DOMContentLoaded();
  return { sound: window.portfolioSound, button, label, audio, notes, buffers, gains, windowEvents, events, boot };
}

test('new visits preload effects while remaining silent', () => {
  const app = setup();
  app.sound.play('cd'); app.sound.play('click');
  assert.equal(app.sound.muted, true);
  assert.equal(app.audio.length, 6);
  assert.ok(app.audio.every(sound => sound.loads === 1 && sound.plays === 0));
  assert.equal(app.button.attributes['aria-label'], 'Unmute sound effects');
});

test('achievement PC uses the compact speaker and its shutdown sound respects mute', () => {
  const app = setup(new Map(), false, 'achievement-pc-page');
  assert.ok(app.button.innerHTML.includes('sound-off'));
  assert.equal(app.label.textContent, 'Unmute sound effects');
  const tv = app.audio.find(sound => sound.src.endsWith('TV-Shut.MP3'));
  app.sound.transition('crt');
  assert.equal(tv.plays, 0);
  app.button.click();
  app.sound.transition('crt');
  assert.equal(tv.plays, 1);
  app.button.click();
  app.sound.transition('crt');
  assert.equal(tv.plays, 1);
});

test('unmute enables effects, mute stops them immediately and blocks new playback', () => {
  const app = setup();
  app.button.click();
  app.sound.play('cd'); app.sound.play('click');
  assert.equal(app.audio.length, 6);
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
  assert.ok(app.audio.filter(sound => !sound.src.endsWith('/cassette-toggle.mp3')).every(sound => sound.plays === 0));
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

test('home arrow volume increases the soft note without changing its envelope', () => {
  const app = setup(); app.button.click();
  app.sound.softClick(); app.sound.softClick(1.8);
  const notes = app.gains.filter(gain => gain.peak !== undefined);
  assert.ok(Math.abs(notes[1].peak / notes[0].peak - 1.8) < 0.001);
});

test('cassette latch sounds on both toggle directions, with no sound on initial load', () => {
  const app = setup();
  const latch = app.audio.find(sound => sound.src.endsWith('/cassette-toggle.mp3'));
  assert.equal(latch.plays, 0);
  app.button.click();
  assert.equal(latch.plays, 1);
  app.button.click();
  assert.equal(app.sound.muted, true);
  assert.equal(latch.pauses, 1);
  assert.equal(latch.plays, 2);
  app.sound.softClick();
  assert.equal(app.notes.length, 0);
  assert.equal(latch.plays, 2);
  app.windowEvents.pagehide();
  assert.equal(latch.pauses, 2);
});

test('achievement audio respects the existing mute control', () => {
  const app = setup();
  const achievement = app.audio.find(a => a.src.endsWith('/achievement.mp3'));
  app.sound.play('achievement');
  assert.equal(achievement.plays,0);
  app.button.click();
  app.sound.play('achievement');
  assert.equal(achievement.plays,1); assert.equal(achievement.volume,.7);
  app.button.click();
  assert.equal(achievement.pauses,1);
});

test('provided retro clicks apply only to achievement controls and obey mute', () => {
  assert.ok(setup().audio.every(sound => !sound.src.includes('/achievement-click.mp3') && !sound.src.includes('/achievement-startup.mp3')));
  const app = setup(new Map(), false, 'achievement-pc-page');
  const click = app.audio.find(sound => sound.src.endsWith('/achievement-click.mp3'));
  const control = { closest: () => null, matches: () => false, getAttribute: () => null };
  const event = { target: { closest: () => control } };
  app.events.click(event);
  assert.equal(click.plays, 0);
  app.button.click();
  app.events.click(event);
  assert.equal(click.plays, 1);
  assert.equal(click.volume, .45);
  control.closest = selector => selector === '.portfolio-header' ? {} : null;
  app.events.click(event);
  assert.equal(click.plays, 1, 'navbar links, logo, and dropdown controls do not play the retro click');
  control.closest = () => null;
  control.disabled = true; app.events.click(event);
  assert.equal(click.plays, 1);
  control.disabled = false; control.matches = () => true; app.events.click(event);
  assert.equal(click.plays, 1, 'the sound toggle keeps its own feedback without a duplicate click');
  control.matches = () => false;
  app.button.click(); app.events.click(event);
  assert.equal(click.plays, 1);
  assert.equal(click.pauses, 1);
});

test('startup waits for its audio, then finishes naturally without delaying the page', async () => {
  const app = setup(new Map([['portfolio-sound-enabled', 'true']]), false, 'achievement-pc-page');
  const startup = app.audio.find(sound => sound.src.endsWith('/achievement-startup.mp3'));
  app.boot.hidden = false;
  startup.readyState = 0;
  app.sound.startAchievementBoot();
  assert.equal(startup.plays, 0);
  startup.readyState = 4; startup.listeners.canplay();
  await Promise.resolve();
  assert.equal(startup.plays, 1);
  assert.equal(startup.volume, .5);
  app.sound.finishAchievementBoot(); app.boot.hidden = true;
  assert.equal(startup.pauses, 0, 'normal startup completion lets the chime finish');
  app.events.pointerdown(); startup.listeners.canplay();
  assert.equal(startup.plays, 1);
  app.windowEvents.pagehide();
  assert.equal(startup.pauses, 1);
});

test('startup stays silent when muted and skip or a late load cannot replay it', async () => {
  const app = setup(new Map(), false, 'achievement-pc-page');
  const startup = app.audio.find(sound => sound.src.endsWith('/achievement-startup.mp3'));
  app.boot.hidden = false; app.sound.startAchievementBoot();
  assert.equal(startup.plays, 0);
  app.button.click();
  await Promise.resolve();
  assert.equal(startup.plays, 1, 'unmuting during the visible boot can start its sound');
  app.sound.finishAchievementBoot(true); app.boot.hidden = true;
  assert.equal(startup.pauses, 1);
  startup.listeners.canplay(); app.events.keydown();
  assert.equal(startup.plays, 1);

  const cold = setup(new Map([['portfolio-sound-enabled', 'true']]), false, 'achievement-pc-page');
  const delayed = cold.audio.find(sound => sound.src.endsWith('/achievement-startup.mp3'));
  delayed.readyState = 0;
  cold.boot.hidden = false; cold.sound.startAchievementBoot();
  cold.sound.finishAchievementBoot(); cold.boot.hidden = true;
  delayed.readyState = 4; delayed.listeners.canplay(); cold.events.pointerdown();
  assert.equal(delayed.plays, 0, 'a cold startup sound cannot arrive after the boot ends');
});

test('autoplay-blocked startup retries on a gesture only while the boot is visible', async () => {
  const app = setup(new Map([['portfolio-sound-enabled', 'true']]), false, 'achievement-pc-page');
  const startup = app.audio.find(sound => sound.src.endsWith('/achievement-startup.mp3'));
  startup.playError = new Error('NotAllowedError');
  app.boot.hidden = false; app.sound.startAchievementBoot();
  await new Promise(setImmediate);
  assert.equal(startup.plays, 1);
  delete startup.playError;
  app.events.pointerdown();
  await new Promise(setImmediate);
  assert.equal(startup.plays, 2);
  app.events.keydown();
  assert.equal(startup.plays, 2, 'a successful startup cannot repeat');
  app.button.click();
  assert.equal(startup.pauses, 1, 'muting stops the chime immediately');
});
