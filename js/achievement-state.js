(() => {
  'use strict';
  const pages = ['index.html', 'games.html', 'projects.html', 'art-2d.html', 'art-3d.html', 'about.html'];
  // Legacy page mapping is retained only to interpret earned achievements.
  const artifacts = Array.from({ length: 12 }, (_, id) => ({ page: pages[Math.floor(id / 2)] }));
  const achievements = [
    {id:'accepted', icon:'star', title:'Mission accepted', description:'Accept the invitation.', earned:s=>s.accepted},
    {id:'light', icon:'spark', title:'Lights on', description:'Use a flashlight.', earned:s=>s.lit},
    {id:'first', icon:'record', title:'First find', description:'Collect your first object.', earned:s=>s.collected.length>0},
    {id:'four', icon:'star', title:'A growing collection', description:'Collect four objects.', earned:s=>s.collected.length>=4},
    {id:'half', icon:'record', title:'Halfway there', description:'Collect six objects.', earned:s=>s.collected.length>=6},
    {id:'pages', icon:'spark', title:'Page explorer', description:'Find an object on every main page.', earned:s=>new Set(s.collected.map(id=>artifacts[id].page)).size===pages.length},
    {id:'all', icon:'record', title:'The whole collection', description:'Collect all twelve objects.', earned:s=>s.collected.length===artifacts.length},
    {id:'solved', icon:'star', title:'Mystery solved', description:'Decode the collected clues.', earned:s=>s.solved},
    {id:'secret', icon:'spark', title:'In one sweep', description:'Find both objects on a page without switching off the light.', secret:true, earned:s=>s.secret}
  ];
  function normalize(value) {
    const collected = [...new Set(Array.isArray(value?.collected) ? value.collected.filter(id => Number.isInteger(id) && id >= 0 && id < artifacts.length) : [])];
    const accepted = value?.accepted === true;
    return { accepted, collected: accepted ? collected : [], lit: accepted && value?.lit === true, secret: accepted && value?.secret === true, solved: accepted && value?.solved === true && collected.length === artifacts.length };
  }
  function newlyEarned(previous, next) {
    const before = normalize(previous), after = normalize(next);
    return achievements.filter(item => !item.earned(before) && item.earned(after)).map(item => item.id);
  }
  const api = { achievements, normalize, newlyEarned };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.AchievementState = api;
})();
