const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
test('the custom door effect fits within the closing animation without clipping', () => {
  const wav = fs.readFileSync(`${__dirname}/../Sound/mission-doors.wav`);
  assert.equal(wav.toString('ascii',0,4),'RIFF');
  assert.equal(wav.readUInt16LE(22),2);
  const rate=wav.readUInt32LE(24), bytes=wav.readUInt32LE(40);
  assert.ok(bytes / (rate * 4) <= .62);
  let peak=0; for(let i=44;i<wav.length;i+=2) peak=Math.max(peak,Math.abs(wav.readInt16LE(i)));
  assert.ok(peak>1000 && peak<32767);
  assert.ok(fs.statSync(`${__dirname}/../Sound/achievement.mp3`).size>0);
});
