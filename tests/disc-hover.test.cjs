const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(reduced=false) {
 let now=0,id=0;const frames=new Map(),events={},disc={style:{}};
 const link={querySelector:()=>disc,addEventListener:(name,fn)=>events[name]=fn};
 vm.runInNewContext(fs.readFileSync(`${__dirname}/../js/disc-hover.js`,'utf8'),{
  document:{querySelectorAll:()=>[link],addEventListener(){}},window:{addEventListener(){}},
  matchMedia:q=>({matches:q.includes('reduced')?reduced:true,addEventListener(){}}),performance:{now:()=>now},
  requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)
 });
 return {events,disc,tick(t){now=t;const work=[...frames.values()];frames.clear();work.forEach(fn=>fn(now));}};
}
test('hover rotates clockwise; leaving rewinds counterclockwise to exactly zero in 300ms',()=>{
 const a=setup();a.events.pointerenter({pointerType:'mouse'});a.tick(1000);assert.equal(parseFloat(a.disc.style.rotate),15);
 a.events.pointerleave();a.tick(1100);const mid=parseFloat(a.disc.style.rotate);assert.ok(mid>0&&mid<15);
 a.tick(1300);assert.equal(a.disc.style.rotate,'0deg');
});
test('re-entering during rewind resumes smoothly and touch/reduced motion stay still',()=>{
 const a=setup();a.events.pointerenter({pointerType:'mouse'});a.tick(1000);a.events.pointerleave();a.tick(1100);
 const mid=parseFloat(a.disc.style.rotate);a.events.pointerenter({pointerType:'mouse'});a.tick(1200);assert.ok(Math.abs(parseFloat(a.disc.style.rotate)-mid-1.5)<.001);
 for(const [reduced,pointerType] of [[true,'mouse'],[false,'touch']]){const a=setup(reduced);a.events.pointerenter({pointerType});a.tick(1000);assert.equal(a.disc.style.rotate,undefined);}
});
