const { test } = require('node:test');
const assert = require('node:assert/strict');
const { achievements, normalize, newlyEarned } = require('../js/achievement-state.js');

test('invalid saved achievement progress is discarded', () => {
  const state = normalize({accepted:true, collected:[0,0,3,-1,12,'4',null], solved:true});
  assert.deepEqual(state.collected, [0,3]);
  assert.equal(state.solved, false);
  assert.deepEqual(normalize({accepted:false,collected:[1],lit:true}).collected, []);
});

test('new achievements are emitted once and the single secret survives reload', () => {
  const accepted = normalize({accepted:true});
  assert.deepEqual(newlyEarned(null,accepted),['accepted']);
  const lit = {...accepted,lit:true};
  assert.deepEqual(newlyEarned(accepted,lit),['light']);
  const first = normalize({...lit,collected:[0]});
  assert.deepEqual(newlyEarned(lit,first),['first']);
  assert.deepEqual(newlyEarned(first,normalize(first)),[]);
  const swept = {...first,collected:[0,1],secret:true};
  assert.deepEqual(newlyEarned(first,swept),['secret']);
  const restored = normalize(JSON.parse(JSON.stringify(swept)));
  assert.deepEqual(newlyEarned(swept,restored),[]);
  assert.equal(achievements.filter(a=>a.secret).length,1);
  assert.equal(achievements.find(a=>a.secret).earned(restored),true);
});

