const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const model = require('../js/achievement-state.js');
const source = fs.readFileSync(`${__dirname}/../js/site-achievements.js`, 'utf8');
function setup({ desktop = true, path = 'games/handspell.html', saved, blocked = false, bottom = false, booting = false } = {}) {
  let writes = 0, reads = 0, stored = saved ? JSON.stringify(saved) : null, next = 0;
  const queued = [], events = {}, frames = new Map(), boot = {hidden:!booting};
  const media = { matches: desktop, addEventListener(name, handler) { this.change = handler; } };
  const window = { AchievementState: model, innerHeight: 800, scrollY: bottom ? 1200 : 0, portfolioAchievementNotifications: { initialize() {}, enqueue: ids => queued.push(...ids) }, dispatchEvent() {}, addEventListener(name, handler) { events[name] = handler; } };
  const document = { currentScript: { src: 'https://example.com/portfolio/js/site-achievements.js' }, readyState:'complete', hidden:false, documentElement:{scrollHeight:2000}, querySelector() { return null; }, getElementById:id=>id==='desktop-boot'?boot:null, addEventListener() {} };
  vm.runInNewContext(source, { window, document, requestAnimationFrame: fn=>{frames.set(++next,fn);return next;}, cancelAnimationFrame:id=>frames.delete(id),
    URL, location: { href: `https://example.com/portfolio/${path}?source=test` }, matchMedia: () => media, CustomEvent: function () {},
    localStorage: { getItem() { reads++; if (blocked) throw Error('blocked'); return stored; }, setItem(k, v) { if (blocked) throw Error('blocked'); writes++; stored = v; } } });
  return { window, document, boot, queued, events, media, frames, reads: () => reads, writes: () => writes, state: () => JSON.parse(JSON.stringify(window.portfolioAchievements.getState())), tick() { const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn()); } };
}
test('desktop records real details beneath a subdirectory and deduplicates pageshow', () => {
  const app = setup();
  assert.deepEqual(app.queued, ['first']);
  assert.deepEqual(app.state().visited, ['games/handspell.html']);
  app.events.pageshow();
  assert.equal(app.writes(), 1);
  assert.deepEqual(app.queued, ['first']);
});
test('mobile does not read or write any page, art, drawing or scroll progress', () => {
  const app = setup({ desktop:false, path:'art-2d.html', bottom:true });
  app.window.portfolioAchievements.open2D('pixel-art');
  app.window.portfolioAchievements.open2D('my-cat');
  app.window.portfolioAchievements.savePainting(); app.events.scroll(); app.tick();
  assert.equal(app.reads(), 0); assert.equal(app.writes(), 0);
  app.media.matches=true; app.media.change();
  assert.deepEqual(app.queued, ['exe']);
});
test('section pages record tab visits without unlocking First spin', () => {
  const app = setup({ path:'games.html' });
  assert.deepEqual(app.state().pages, ['games.html']);
  assert.deepEqual(app.state().visited, []);
  assert.deepEqual(app.queued, []);
});
test('2D projects, cat and Paint save events unlock once; unknown apps are not projects', () => {
  const app = setup({path:'art-2d.html'}), api=app.window.portfolioAchievements;
  api.open2D('paint'); api.open2D('doom');
  assert.deepEqual(app.state().visited, []);
  api.open2D('my-cat'); api.open2D('my-cat');
  api.open2D('pixel-art'); api.complete2D('pixel-art');
  api.savePainting(); api.savePainting();
  assert.deepEqual(app.queued, ['exe','cat','first','paint']);
  assert.deepEqual(app.state().completed, ['art-2d.html#pixel-art']);
  assert.deepEqual(app.state().visited, ['art-2d.html#pixel-art']);
});
test('scroll bottoms require visible loaded content and are frozen during exits', () => {
  const app=setup({path:'art-2d.html',bottom:true,booting:true});
  app.tick(); assert.deepEqual(app.state().completed, []);
  app.boot.hidden=true; app.events['portfolio:desktopboot'](); app.tick();
  assert.deepEqual(app.state().completed, ['art-2d.html']);
  const other=setup({bottom:true});
  other.events['portfolio:transitionstart'](); other.events.scroll(); other.tick();
  assert.deepEqual(other.state().completed, []);
  other.events['portfolio:transitionend'](); other.tick();
  assert.deepEqual(other.state().completed, ['games/handspell.html']);
});
test('blocked storage preserves this visit without duplicate unlocks', () => {
  const app=setup({blocked:true});
  assert.equal(app.window.portfolioAchievements.storageAvailable,false);
  app.events.pageshow();
  assert.deepEqual(app.queued,['first']);
});
test('an explicit bottom scroll can finish while an external embed is still loading', () => {
  const app=setup({bottom:true});
  app.document.readyState='interactive'; app.tick();
  assert.deepEqual(app.state().completed, []);
  app.events.scroll(); app.tick();
  assert.deepEqual(app.state().completed, ['games/handspell.html']);
});
