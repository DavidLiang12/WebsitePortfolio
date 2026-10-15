(() => {
  'use strict';
  const mission = window.portfolioMission;
  const shelf = document.querySelector('#shelf');
  const names = { 'index.html':'Home', 'games.html':'Games', 'projects.html':'Other Projects', 'art-2d.html':'2D Art', 'art-3d.html':'3D Art', 'about.html':'About Me' };
  const icon = name => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
  const achievements = window.MissionState.achievements;
  function render() {
    const state = mission.state;
    const focusedId = shelf.contains(document.activeElement) ? document.activeElement.dataset.id : undefined;
    const scrollTop = document.querySelector('#achievement-list').scrollTop;
    shelf.innerHTML = Array.from({ length:3 }, (_, row) => `<div class="shelf-row">${mission.artifacts.slice(row * 4, row * 4 + 4).map(item => {
      const found = state.collected.includes(item.id);
      return `<button class="artifact${found ? '' : ' locked'}" type="button" data-id="${item.id}" ${found ? `aria-label="Inspect ${item.name}"` : 'disabled'}><span class="artifact-id">${String(item.id + 1).padStart(2,'0')}</span>${found ? icon(item.icon) : '<span class="unknown" aria-hidden="true">?</span>'}${found ? `<span class="artifact-clue">${item.clue}</span>` : ''}<span class="artifact-name">${found ? item.name : 'Not found'}</span></button>`;
    }).join('')}</div>`).join('');
    if (focusedId !== undefined) shelf.querySelector(`[data-id="${focusedId}"]`)?.focus({ preventScroll:true });
    document.querySelector('.collection-count').textContent = `${String(state.collected.length).padStart(2,'0')} / 12`;
    let unlocked = 0;
    document.querySelector('#achievement-list').innerHTML = achievements.map(achievement => {
      const earned = achievement.earned(state);
      const concealed = achievement.secret && !earned;
      const symbol = concealed ? 'lock' : achievement.icon;
      const title = concealed ? 'Secret achievement' : achievement.title;
      const description = concealed ? 'Keep exploring to discover it.' : achievement.description;
      if (earned) unlocked++;
      return `<div class="achievement${earned ? '' : ' locked'}"><span class="achievement-badge${earned ? ' earned' : ''}">${icon(symbol)}</span><div><h3>${title}<span class="sr-only"> — ${earned ? 'Unlocked' : 'Locked'}</span></h3><p>${description}</p></div></div>`;
    }).join('');
    document.querySelector('#achievement-list').scrollTop = scrollTop;
    document.querySelector('#achievement-count').textContent = `${String(unlocked).padStart(2,'0')} / ${String(achievements.length).padStart(2,'0')}`;
    document.querySelector('.progress').setAttribute('aria-valuenow', unlocked);
    document.querySelector('.progress > span').style.width = `${unlocked / achievements.length * 100}%`;
    document.querySelector('#mystery').hidden = state.collected.length !== 12;
    if (state.solved) {
      document.querySelector('#mystery-result').textContent = 'Mystery solved. Keep creating.';
      document.querySelector('#mystery button').disabled = true;
    }
  }
  shelf.addEventListener('click', event => {
    const button = event.target.closest('[data-id]');
    if (!button) return;
    const item = mission.artifacts[Number(button.dataset.id)];
    if (!mission.state.collected.includes(item.id)) return;
    document.querySelector('.artifact-note').hidden = false;
    document.querySelector('#artifact-title').textContent = item.name;
    document.querySelector('#artifact-description').textContent = `Found on ${names[item.page]}. Clue ${String(item.id + 1).padStart(2,'0')}: ${item.clue}`;
  });
  document.querySelector('#mystery').addEventListener('submit', event => {
    event.preventDefault();
    const solved = mission.solve(document.querySelector('#mystery-answer').value);
    document.querySelector('#mystery-result').textContent = solved ? 'Mystery solved. Keep creating.' : 'Not quite. Read the letters in shelf order.';
  });
  window.addEventListener('missionchange', render);
  render();
})();
