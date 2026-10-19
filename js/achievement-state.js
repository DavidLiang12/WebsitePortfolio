(() => {
  'use strict';
  // Inline artwork renders in local previews as well as hosted pages.
  const icons = {
    star: `<path d="M24 5l5 13 14 1-11 9 4 14-12-8-12 8 4-14L5 19l14-1z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="24" r="5" fill="currentColor"/>`,
    record: `<circle cx="24" cy="24" r="18" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="24" cy="24" r="11" stroke="currentColor" fill="none"/><circle cx="24" cy="24" r="4" fill="currentColor"/><path d="M24 2v8m0 28v8M2 24h8m28 0h8" stroke="currentColor" stroke-width="2"/>`,
    stack: `<g fill="none" stroke="currentColor" stroke-width="2"><path d="M8 12h27v27H8zM14 6h27v27"/><circle cx="21.5" cy="25.5" r="9"/><circle cx="21.5" cy="25.5" r="2"/></g>`,
    controller: `<g fill="none" stroke="currentColor" stroke-width="2"><path d="M14 14h20c6 0 9 19 7 23-2 4-8-3-11-6H18c-3 3-9 10-11 6-2-4 1-23 7-23Z"/><path d="M15 19v10m-5-5h10M22 14V8h9"/><circle cx="31" cy="21" r="1.5"/><circle cx="36" cy="26" r="1.5"/></g>`,
    tools: `<g fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="10" width="36" height="29" rx="2"/><path d="M6 18h36M11 14h2m3 0h2m3 0h2M19 24l-5 5 5 5m10-10 5 5-5 5m-3-12-4 14"/></g>`,
    cube: `<g fill="none" stroke="currentColor" stroke-width="2"><path d="m24 4 18 10v20L24 44 6 34V14Zm0 20v20M6 14l18 10 18-10M15 9l18 10v20"/></g>`,
    cat: `<g fill="none" stroke="currentColor" stroke-width="2"><path d="M8 23V7l12 8h8l12-8v16c0 12-7 19-16 19S8 35 8 23Z"/><path d="m20 29 4 3 4-3M5 27l11 2M4 34l12-1m16-4 11-2m-11 6 12 1"/><circle cx="17" cy="24" r="2"/><circle cx="31" cy="24" r="2"/></g>`,
    palette: `<g fill="none" stroke="currentColor" stroke-width="2"><path d="M25 5C12 5 5 14 5 25c0 10 8 18 18 18 5 0 8-3 6-7-2-4 1-7 6-7 6 0 9-3 8-8C41 11 34 5 25 5Z"/><circle cx="15" cy="17" r="2"/><circle cx="25" cy="13" r="2"/><circle cx="34" cy="19" r="2"/><circle cx="13" cy="29" r="2"/></g>`,
    terminal: `<g fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="8" width="38" height="30"/><path d="M5 15h38m-30 7 6 5-6 5m10 0h11M17 43h14"/></g>`,
    tabs: `<g fill="none" stroke="currentColor" stroke-width="2"><path d="M5 16h38v25H5Zm0 0V8h12v8m0-5h12v5m0-3h14v3M11 23h26m-26 7h17"/></g>`,
    scroll: `<g fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5h26v38H11Zm6 8h14m-14 6h14m-7 6v10m-5-5 5 5 5-5"/></g>`,
    compass: `<g fill="none" stroke="currentColor" stroke-width="2"><circle cx="24" cy="24" r="18"/><path d="m30 15-3 12-12 6 6-12Zm-6-13v7m0 30v7M2 24h7m30 0h7"/><circle cx="24" cy="24" r="2"/></g>`
  };
  const icon = name => `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${icons[name] || icons.star}</svg>`;
  const projects = {
    'games/pending-departures.html': 'games',
    'games/the-perfect-loop.html': 'games',
    'games/handspell.html': 'games',
    'games/the-curse-of-brookings-hall.html': 'games',
    'games/flying-home.html': 'games',
    'games/the-flying-machine.html': 'games',
    'projects/meteocraft.html': 'projects',
    'projects/river-raid-star-wars.html': 'projects',
    'projects/consume.html': 'projects',
    'art/pixar-studio.html': 'art3d',
    'art/cyberpunk-character.html': 'art3d',
    'art-2d.html#quick-sketches': 'art2d',
    'art-2d.html#pixel-art': 'art2d',
    'art-2d.html#rat-character': 'art2d',
    'art-2d.html#magic-redesign': 'art2d',
    'art-2d.html#endless-spring': 'art2d'
  };
  const tabs = ['games.html', 'projects.html', 'art-3d.html', 'art-2d.html', 'about.html'];
  const pages = ['index.html', ...tabs, 'achievements.html'];
  const completionTargets = [...pages, ...Object.keys(projects)];
  const actions = ['cat', 'paint-saved'];
  const categoryCount = (state, category) => state.visited.filter(path => projects[path] === category).length;
  const categoryTotal = category => Object.values(projects).filter(value => value === category).length;
  const achievements = [
    { id: 'first', illustrativePercent: 92.4, icon: 'record', title: 'First spin', description: 'Open your first project. Every collection starts somewhere.', goal: 1, progress: s => s.visited.length },
    { id: 'projects', illustrativePercent: 22.7, icon: 'tools', title: 'Side B', description: 'Discover all three Other Projects.', goal: categoryTotal('projects'), progress: s => categoryCount(s, 'projects') },
    { id: 'explorer', illustrativePercent: 28.6, icon: 'compass', title: 'A bit of everything', description: 'Open a game, an Other Project, a 3D art project, and a 2D art project.', goal: 4, progress: s => new Set(s.visited.map(path => projects[path])).size },
    { id: 'games', illustrativePercent: 12.8, icon: 'controller', title: 'Full clear', description: 'Look through every project in Games.', goal: categoryTotal('games'), progress: s => categoryCount(s, 'games') },
    { id: 'art2d', illustrativePercent: 14.6, icon: 'stack', title: 'Every pixel', description: 'Open all five 2D art projects.', goal: categoryTotal('art2d'), progress: s => categoryCount(s, 'art2d') },
    { id: 'all', illustrativePercent: 3.8, icon: 'star', title: 'The whole collection', description: 'Explore every project in Games, Other Projects, 3D Art, and 2D Art.', goal: Object.keys(projects).length, progress: s => s.visited.length },
    { id: 'tabs', illustrativePercent: 35.1, icon: 'tabs', title: 'Channel surfer', description: 'Visit Games, Other Projects, 3D Art, 2D Art, and About Me.', goal: tabs.length, progress: s => tabs.filter(path => s.pages.includes(path)).length },
    { id: 'cat', illustrativePercent: 47.3, icon: 'cat', title: 'Ollie!', description: 'Meet Ollie in the My_Cat folder on the 2D art desktop.', goal: 1, progress: s => Number(s.actions.includes('cat')) },
    { id: 'paint', illustrativePercent: 8.6, icon: 'palette', title: 'Vincent van Gogh', description: 'Create something in Paint on the 2D art desktop and save your drawing.', goal: 1, progress: s => Number(s.actions.includes('paint-saved')) },
    { id: 'exe', illustrativePercent: 96.2, icon: 'terminal', title: '.EXE', description: 'Open the 2D art desktop.', goal: 1, progress: s => Number(s.pages.includes('art-2d.html')) },
    { id: 'bottoms', illustrativePercent: 0.9, icon: 'scroll', title: 'End of the line', description: 'Reach the bottom of every portfolio page and project, including the 2D project windows.', goal: completionTargets.length, progress: s => s.completed.length }
  ];
  const unique = (value, valid) => [...new Set(Array.isArray(value) ? value.filter(item => typeof item === 'string' && valid(item)) : [])];
  function normalize(value) {
    const visited = unique(value?.visited, path => Object.hasOwn(projects, path));
    const seenPages = unique(value?.pages, path => pages.includes(path));
    return {
      visited, pages: seenPages,
      completed: unique(value?.completed, path => completionTargets.includes(path) && (visited.includes(path) || seenPages.includes(path))),
      actions: unique(value?.actions, action => actions.includes(action))
    };
  }
  achievements.forEach(item => { item.earned = state => item.progress(normalize(state)) >= item.goal; });
  function visit(value, path) {
    const state = normalize(value);
    if (typeof path === 'string' && Object.hasOwn(projects, path) && !state.visited.includes(path)) state.visited.push(path);
    return state;
  }
  function enter(value, path) {
    const state = visit(value, path);
    if (pages.includes(path) && !state.pages.includes(path)) state.pages.push(path);
    return state;
  }
  function complete(value, path) {
    const state = normalize(value);
    if (completionTargets.includes(path) && (state.visited.includes(path) || state.pages.includes(path)) && !state.completed.includes(path)) state.completed.push(path);
    return state;
  }
  function act(value, action) {
    const state = normalize(value);
    if (actions.includes(action) && !state.actions.includes(action)) state.actions.push(action);
    return state;
  }
  function newlyEarned(previous, next) {
    const before = normalize(previous), after = normalize(next);
    return achievements.filter(item => !item.earned(before) && item.earned(after)).map(item => item.id);
  }
  // Keep the existing storage key: legacy project visits survive the new rules.
  const api = { projects, pages, tabs, completionTargets, achievements, normalize, visit, enter, complete, act, newlyEarned, icon, storageKey: 'portfolio-exploration-achievements-v1' };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.AchievementState = api;
})();
