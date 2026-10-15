const { test } = require('node:test');
const assert = require('node:assert/strict');
const { artifacts, pages, achievements, normalize, collect, solve, newlyEarned } = require('../js/mission-state.js');

test('acceptance is required to collect and invalid saved progress is discarded', () => {
  assert.deepEqual(collect(null, 0).collected, []);
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
  const first = collect(lit,0);
  assert.deepEqual(newlyEarned(lit,first),['first']);
  assert.deepEqual(newlyEarned(first,collect(first,0)),[]);
  const swept = {...collect(first,1),secret:true};
  assert.deepEqual(newlyEarned(first,swept),['secret']);
  const restored = normalize(JSON.parse(JSON.stringify(swept)));
  assert.deepEqual(newlyEarned(swept,restored),[]);
  assert.equal(achievements.filter(a=>a.secret).length,1);
  assert.equal(achievements.find(a=>a.secret).earned(restored),true);
});

test('each main page has two unique artifacts and collecting twice is idempotent', () => {
  for (const page of pages) assert.equal(artifacts.filter(item => item.page === page).length, 2);
  let state = normalize({accepted:true});
  for (const { id } of artifacts) { state = collect(state,id); state = collect(state,id); }
  assert.equal(state.collected.length, 12);
  assert.deepEqual(collect(state,99),state);
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(state))),state);
});

test('the mystery requires all artifacts and the ordered clue answer', () => {
  const answer = artifacts.map(item => item.clue).join('');
  assert.equal(answer,'KEEPCREATING');
  assert.equal(solve({accepted:true,collected:[0]},answer).solved,false);
  const state = {accepted:true,collected:artifacts.map(item=>item.id)};
  assert.equal(solve(state,'wrong').solved,false);
  assert.equal(solve(state,'Keep Creating').solved,true);
  assert.equal(solve({...state,collected:Array(12).fill(0)},answer).solved,false);
});
