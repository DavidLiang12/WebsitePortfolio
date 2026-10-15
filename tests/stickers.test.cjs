const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(reduced = false, desktop = true) {
  let now = 0, next = 0;
  const frames = new Map();
  function node() {
    return { style: {}, dataset: {}, attrs: {}, handlers: {}, hidden: true,
      classList: { add() {}, remove() {}, toggle() {} },
      setAttribute(k,v) { this.attrs[k]=v; }, focus() { this.focused=true; },
      setPointerCapture() {}, addEventListener(k,fn) { this.handlers[k]=fn; },
      emit(k,e={}) { this.handlers[k]?.(e); } };
  }
  const nodes = Object.fromEntries(['.peel-front','.peel-mission','.peel-reset','.peel-accept','[data-face-clip]','[data-lift-clip]','[data-paper-back]','.peel-corner'].map(s=>[s,node()]));
  const destinations = []; let accepted = false;
  const host = node(); host.dataset.sticker='2'; host.clientWidth=280;
  host.querySelector=s=>nodes[s];
  vm.runInNewContext(fs.readFileSync(`${__dirname}/../js/stickers.js`,'utf8'), {
    document: { querySelectorAll:()=>[host], querySelector:()=>null },
    window: {portfolioMission:{accept(){accepted=true;return true;},url:'secret-mission.html'}}, location:{search:'',assign:href=>destinations.push(href)}, URLSearchParams,
    matchMedia:query=>({matches:query.includes('prefers-reduced-motion') ? reduced : desktop}), performance:{now:()=>now},
    requestAnimationFrame:fn=>{frames.set(++next,fn);return next;}, cancelAnimationFrame:id=>frames.delete(id)
  });
  return { front:nodes['.peel-front'], mission:nodes['.peel-mission'], reset:nodes['.peel-reset'], accept:nodes['.peel-accept'], back:nodes['[data-paper-back]'], destinations, get accepted(){return accepted;},
    tick(time) { now=time; const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now)); } };
}
test('click visibly peels before enabling the mission; keyboard focus is restored',()=>{
  const a=setup(); a.front.emit('click',{detail:0});
  assert.notEqual(a.front.attrs['aria-expanded'],'true');
  a.tick(575);
  assert.equal(a.mission.hidden,false); assert.equal(a.mission.inert,true);
  assert.equal(a.front.style.opacity,'1');
  assert.match(a.back.attrs.transform,/matrix\(0 -1 -1 0 /);
  a.tick(1200);
  assert.equal(a.front.attrs['aria-expanded'],'true'); assert.equal(a.mission.inert,false);
  assert.equal(a.accept.focused,true);
  a.reset.emit('click');
  assert.equal(a.mission.hidden,true); assert.equal(a.front.disabled,false);
  assert.equal(a.accepted,false); assert.deepEqual(a.destinations,[]);
});

test('Yes only accepts and navigates after the sticker has been revealed',()=>{
  const a=setup();
  a.accept.emit('click'); assert.equal(a.accepted,false);
  a.front.emit('click',{detail:0}); a.tick(1200); a.accept.emit('click');
  assert.equal(a.accepted,true); assert.deepEqual(a.destinations,['secret-mission.html']);
});
test('normal pointer release does not swallow the subsequent click',()=>{
  const a=setup(); a.front.emit('pointerdown',{button:0,clientX:100,clientY:100,pointerId:1});
  a.front.emit('pointerup'); a.front.emit('lostpointercapture'); a.front.emit('click',{detail:1}); a.tick(1200);
  assert.equal(a.front.attrs['aria-expanded'],'true');
});
test('a cancelled drag returns the sticker and leaves the mission inaccessible',()=>{
  const a=setup(); a.front.emit('pointerdown',{button:0,clientX:100,clientY:100,pointerId:1});
  a.front.emit('pointermove',{clientX:70,clientY:70,pointerId:1});
  assert.equal(a.mission.inert,true);
  a.front.emit('pointercancel'); a.tick(1200);
  assert.equal(a.mission.hidden,true); assert.equal(a.front.disabled,false);
});
test('reduced motion reveals without the folding animation',()=>{
  const a=setup(true); a.front.emit('click',{detail:0}); a.tick(0);
  assert.equal(a.front.attrs['aria-expanded'],'true'); assert.equal(a.mission.inert,false);
});

test('mobile and touch layouts never mount or activate the sticker',()=>{
  const a=setup(false,false);
  assert.equal(a.front.handlers.click,undefined);
  assert.equal(a.front.handlers.pointerdown,undefined);
});
