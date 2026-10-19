// Isolated design samples: no achievement progress is saved or changed.
(() => {
  const enabled = matchMedia('(min-width: 641px)');
  window.portfolioAchievements = {
    get available() { return enabled.matches; },
    storageAvailable: true,
    getState: () => ({ visited: ['games/pending-departures.html', 'projects/meteocraft.html', 'art/pixar-studio.html'] })
  };
  enabled.addEventListener('change', () => window.dispatchEvent(new CustomEvent('portfolio:achievements')));
})();
(() => {
  'use strict';
  const host = document.querySelector('[data-achievements-page]');
  if (!host) return;
  const model = window.AchievementState;
  const runtime = window.portfolioAchievements;
  const list = host.querySelector('#achievement-list');
  const search = host.querySelector('#achievement-search');
  const filters = [...host.querySelectorAll('[data-achievement-filter]')];
  let filter = 'all';
  function render() {
    if (!runtime.available) { list.replaceChildren(); return; }
    const state = runtime.getState();
    const earned = model.achievements.filter(item => item.earned(state)).length;
    const total = model.achievements.length;
    const percent = Math.round(earned / total * 100);
    host.querySelector('#achievement-count').textContent = `${earned} of ${total} achievements earned`;
    host.querySelector('#achievement-percent').textContent = `${percent}%`;
    const progress = host.querySelector('[role="progressbar"]');
    progress.setAttribute('aria-valuenow', earned);
    progress.setAttribute('aria-valuemax', total);
    progress.setAttribute('aria-valuetext', `${earned} of ${total} achievements earned`);
    progress.querySelector('span').style.width = `${percent}%`;
    host.querySelector('#achievement-storage-note').textContent = 'Design preview · sample progress only.';
    filters.forEach(button => {
      const value = button.dataset.achievementFilter;
      button.setAttribute('aria-pressed', String(value === filter));
      button.querySelector('span').textContent = value === 'all' ? total : value === 'earned' ? earned : total - earned;
    });
    const query = search.value.trim().toLowerCase();
    const visible = model.achievements.filter(item => {
      const unlocked = item.earned(state);
      return (filter === 'all' || (filter === 'earned' ? unlocked : !unlocked)) && `${item.title} ${item.description}`.toLowerCase().includes(query);
    });
    list.innerHTML = visible.map(item => {
      const unlocked = item.earned(state), count = Math.min(item.progress(state), item.goal);
      return `<li class="achievement-row${unlocked ? ' is-earned' : ''}"><span class="achievement-badge${unlocked ? ' earned' : ''}">${model.icon(item.icon)}</span><div class="achievement-copy"><h2>${item.title}</h2><p>${item.description}</p><p class="achievement-rarity">${item.illustrativePercent}% of visitors have this achievement</p></div><div class="achievement-status">${unlocked ? '<span class="achievement-earned-label"><span aria-hidden="true">✓</span> Unlocked</span>' : `<span>${count} / ${item.goal}</span><meter min="0" max="${item.goal}" value="${count}" aria-label="${item.title} progress">${count} of ${item.goal}</meter>`}</div></li>`;
    }).join('');
    host.querySelector('#achievement-empty').hidden = visible.length > 0;
    host.querySelector('#achievement-results').textContent = `${visible.length} achievement${visible.length === 1 ? '' : 's'} shown`;
  }
  filters.forEach(button => button.addEventListener('click', () => { filter = button.dataset.achievementFilter; render(); }));
  search.addEventListener('input', render);
  window.addEventListener('portfolio:achievements', render);
  render();
})();
