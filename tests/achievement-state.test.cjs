const { test } = require('node:test');
const assert = require('node:assert/strict');
const model = require('../js/achievement-state.js');
const paths = Object.keys(model.projects);
const earned = (state, id) => model.achievements.find(item => item.id === id).earned(state);
const visitAll = (category, state) => paths.filter(path => !category || model.projects[path] === category).reduce(model.visit, state);

test('legacy visits survive; malformed, duplicate and unknown progress is rejected', () => {
  const state = model.normalize({ visited: [paths[0], paths[0], [paths[1]], 'games.html', '../games/handspell.html', null, '__proto__'], pages: ['games.html','games.html','bad'], actions: ['cat','cat','bad'], completed: ['games.html', paths[1], 'bad'] });
  assert.deepEqual(state, { visited: [paths[0]], pages: ['games.html'], completed: ['games.html'], actions: ['cat'] });
  assert.deepEqual(model.normalize(null), { visited: [], pages: [], completed: [], actions: [] });
  assert.equal(earned({visited:[paths[0]]}, 'first'), true);
});
test('first project, category exploration and repeated visits use distinct projects', () => {
  const first = model.visit(null, paths[0]);
  assert.deepEqual(model.newlyEarned(null, first), ['first']);
  assert.deepEqual(model.newlyEarned(first, model.visit(first, paths[0])), []);
  let state = ['games/handspell.html','projects/consume.html','art/pixar-studio.html'].reduce(model.visit, null);
  assert.equal(earned(state, 'explorer'), false, 'a 2D art project is also required');
  state = model.visit(state, 'art-2d.html#pixel-art');
  assert.equal(earned(state, 'explorer'), true);
  assert.equal(earned(state, 'art2d'), false);
});
test('all Games, Side B, all 2D projects and the full collection have independent goals', () => {
  assert.equal(model.achievements.length, 11);
  assert.equal(paths.length, 16);
  assert.equal(earned(visitAll('games'), 'games'), true);
  assert.equal(earned(visitAll('projects'), 'projects'), true);
  assert.equal(earned(visitAll('art2d'), 'art2d'), true);
  const onlyDetails = paths.filter(path => !path.includes('#')).reduce(model.visit, null);
  assert.equal(earned(onlyDetails, 'all'), false);
  assert.equal(earned(visitAll(), 'all'), true);
});
test('tab visits, opening 2D art, Ollie and saving Paint are separate actions', () => {
  let state = model.enter(null, 'art-2d.html');
  assert.deepEqual(model.newlyEarned(null, state), ['exe']);
  assert.equal(earned(state, 'first'), false);
  assert.equal(earned(state, 'tabs'), false);
  state = model.tabs.reduce(model.enter, state);
  assert.equal(earned(state, 'tabs'), true);
  state = model.act(state, 'cat');
  assert.equal(earned(state, 'cat'), true);
  assert.equal(earned(state, 'paint'), false);
  state = model.act(state, 'paint-saved');
  assert.equal(earned(state, 'paint'), true);
  assert.deepEqual(model.newlyEarned(state, model.act(state, 'paint-saved')), []);
});
test('End of the line requires every page and project bottom, not just opening them', () => {
  let state = model.pages.reduce(model.enter, visitAll());
  assert.equal(model.completionTargets.length, 23);
  assert.equal(earned(state, 'bottoms'), false);
  const last = model.completionTargets.at(-1);
  state = model.completionTargets.slice(0,-1).reduce(model.complete, state);
  assert.equal(earned(state, 'bottoms'), false);
  state = model.complete(state, last);
  assert.equal(earned(state, 'bottoms'), true);
  assert.deepEqual(model.complete(null, last).completed, []);
  assert.deepEqual(model.complete(state, last), state);
});
test('all badge icons embed visible SVG shapes without external references', () => {
  for (const achievement of model.achievements) {
    const svg = model.icon(achievement.icon);
    assert.match(svg, /viewBox="0 0 48 48"/);
    assert.match(svg, /<(path|circle|rect|g)\b/);
    assert.doesNotMatch(svg, /<use|<image|href=/);
  }
});
