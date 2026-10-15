(() => {
  'use strict';
  const icons = new URL('../images/achievement-badges.svg', document.currentScript.src).href;
  const icon = name => `<svg aria-hidden="true"><use href="${icons}#${name}"/></svg>`;
  // Explicit render only; loading this file never mounts a panel.
  window.renderAchievements = (host, value) => {
    const { achievements, normalize } = window.AchievementState;
    const state = normalize(value);
    const scrollTop = host.querySelector('#achievement-list').scrollTop;
    let unlocked = 0;
    host.querySelector('#achievement-list').innerHTML = achievements.map(achievement => {
      const earned = achievement.earned(state);
      const concealed = achievement.secret && !earned;
      const symbol = concealed ? 'lock' : achievement.icon;
      const title = concealed ? 'Secret achievement' : achievement.title;
      const description = concealed ? 'Keep exploring to discover it.' : achievement.description;
      if (earned) unlocked++;
      return `<div class="achievement${earned ? '' : ' locked'}"><span class="achievement-badge${earned ? ' earned' : ''}">${icon(symbol)}</span><div><h3>${title}<span class="sr-only"> — ${earned ? 'Unlocked' : 'Locked'}</span></h3><p>${description}</p></div></div>`;
    }).join('');
    host.querySelector('#achievement-list').scrollTop = scrollTop;
    host.querySelector('#achievement-count').textContent = `${String(unlocked).padStart(2,'0')} / ${String(achievements.length).padStart(2,'0')}`;
    host.querySelector('.progress').setAttribute('aria-valuenow', unlocked);
    host.querySelector('.progress > span').style.width = `${unlocked / achievements.length * 100}%`;
  };
})();
