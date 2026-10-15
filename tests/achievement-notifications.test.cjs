const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const model = require('../js/achievement-state.js');
const source = fs.readFileSync(`${__dirname}/../js/achievement-notifications.js`,'utf8');
function setup(pending=['light','four']) {
  const state={accepted:true,lit:true,collected:[0,1,2,3]};
  const queueKey='portfolio-mission-pending-achievements';
  const session=new Map([[queueKey,JSON.stringify(pending)]]);
  const timers=new Map(), appended=[], played=[], events={}; let nextTimer=0;
  const window={AchievementState:model,portfolioSound:{play:name=>played.push(name)},dispatchEvent(){},addEventListener(name,handler){(events[name]??=[]).push(handler);}};
  const document={currentScript:{src:'https://example.com/js/achievement-notifications.js'},hidden:false,querySelector(){return null;},addEventListener(){},body:{append:node=>appended.push(node)},createElement(){return {setAttribute(){},querySelector(){return {addEventListener(){}};},remove(){this.removed=true;}};}};
  vm.runInNewContext(source,{window,document,URL,location:{pathname:'/index.html'},innerWidth:1280,innerHeight:800,CustomEvent:function(){},matchMedia:()=>({matches:true,addEventListener(){}}),localStorage:{getItem:()=>JSON.stringify(state),setItem(){}},sessionStorage:{getItem:k=>session.get(k),setItem:(k,v)=>session.set(k,v)},setTimeout(fn){timers.set(++nextTimer,fn);return nextTimer;},clearTimeout:id=>timers.delete(id)});
  return {window,appended,played,events,pending:()=>JSON.parse(session.get(queueKey)),tick(){const [id,fn]=timers.entries().next().value || [];if(fn){timers.delete(id);fn();}},timers};
}
test('notifications use the earned title and play one sound per queued achievement',()=>{
  const app=setup(); app.tick();
  assert.match(app.appended[0].innerHTML,/Lights on/);
  assert.deepEqual(app.pending(),['four']);
  assert.deepEqual(app.played,['achievement']);
  app.tick(); assert.equal(app.appended[0].removed,true);
  app.tick(); assert.match(app.appended[1].innerHTML,/A growing collection/);
  assert.deepEqual(app.pending(),[]);
  assert.equal(app.played.length,2);
  app.tick(); app.window.portfolioAchievements.enqueue([]);
  assert.equal(app.timers.size,0);
});
test('navigation preserves queued notifications for the destination page',()=>{
  const app=setup(['four']);
  app.events.pagehide.forEach(fn=>fn());
  assert.equal(app.timers.size,0);
  assert.deepEqual(app.pending(),['four']);
  assert.equal(app.played.length,0);
});
