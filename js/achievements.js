(() => {
  'use strict';
  const host = document.querySelector('[data-achievements-page]');
  if (!host) return;
  const model = window.AchievementState;
  const runtime = window.portfolioAchievements;
  const list = host.querySelector('#achievement-list');
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
    filters.forEach(button => {
      const value = button.dataset.achievementFilter;
      button.setAttribute('aria-pressed', String(value === filter));
      button.querySelector('span').textContent = value === 'all' ? total : value === 'earned' ? earned : total - earned;
    });
    const visible = model.achievements.filter(item => {
      const unlocked = item.earned(state);
      return filter === 'all' || (filter === 'earned' ? unlocked : !unlocked);
    }).sort((a, b) => Number(b.earned(state)) - Number(a.earned(state)));
    list.innerHTML = visible.map(item => {
      const unlocked = item.earned(state);
      const title = !unlocked && item.id === 'bottoms' ? '???' : item.title;
      const details = unlocked ? `<p>${item.description}</p><p class="achievement-rarity">${item.illustrativePercent}% of visitors have this achievement</p>` : '';
      const status = unlocked ? '<span class="achievement-earned-label"><span aria-hidden="true">✓</span> Unlocked</span>' : '<span class="achievement-locked-label">Locked</span>';
      return `<li class="achievement-row${unlocked ? ' is-earned' : ''}"><span class="achievement-badge${unlocked ? ' earned' : ''}">${model.icon(item.icon)}</span><div class="achievement-copy"><h2>${title}</h2>${details}</div><div class="achievement-status">${status}</div></li>`;
    }).join('');
    host.querySelector('#achievement-empty').hidden = visible.length > 0;
  }
  filters.forEach(button => button.addEventListener('click', () => { filter = button.dataset.achievementFilter; render(); }));
  window.addEventListener('portfolio:achievements', render);
  render();
})();
