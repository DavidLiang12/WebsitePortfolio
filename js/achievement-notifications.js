(() => {
  'use strict';
  const root = new URL('../', document.currentScript.src);
  const model = window.AchievementState;
  const key = 'portfolio-secret-mission-v1';
  const desktop = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
  let state;
  try { state = model.normalize(JSON.parse(localStorage.getItem(key))); } catch (_) { state = model.normalize(null); }
  const artURL = new URL('images/achievement-badges.svg', root).href;
  const toastKey = 'portfolio-mission-pending-achievements';
  let pending = [];
  try { const stored = JSON.parse(sessionStorage.getItem(toastKey)); if (Array.isArray(stored)) pending = [...new Set(stored)].filter(id => model.achievements.some(item => item.id === id && item.earned(state))); } catch (_) {}
  let toastTimer, toast;
  function persistToasts() { try { sessionStorage.setItem(toastKey, JSON.stringify(pending)); } catch (_) {} }
  function scheduleToast() {
    if (toastTimer || toast || !pending.length || !desktop.matches || document.hidden) return;
    toastTimer = setTimeout(showToast, 350);
  }
  function dismissToast() {
    clearTimeout(toastTimer);
    toastTimer = null;
    toast?.remove();
    toast = null;
    scheduleToast();
  }
  function showToast() {
    toastTimer = null;
    if (!desktop.matches || document.hidden) return;
    const id = pending.shift();
    const achievement = model.achievements.find(item => item.id === id);
    persistToasts();
    if (!achievement) { scheduleToast(); return; }
    toast = document.createElement('section');
    toast.className = 'achievement-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `<span class="achievement-badge earned"><svg aria-hidden="true"><use href="${artURL}#${achievement.icon}"/></svg></span><div><small>Achievement unlocked</small><strong>${achievement.title}</strong><p>${achievement.description}</p></div><button type="button" aria-label="Dismiss achievement notification">×</button>`;
    toast.querySelector('button').addEventListener('click', dismissToast);
    document.body.append(toast);
    window.portfolioSound?.play('achievement');
    toastTimer = setTimeout(dismissToast, 4600);
  }
  function enqueue(ids) {
    pending.push(...ids.filter(id => !pending.includes(id)));
    persistToasts();
    scheduleToast();
  }
  // Dormant: no site page loads this module. Stored progress is left intact.
  window.portfolioAchievements = { enqueue };
  desktop.addEventListener('change', () => { if (desktop.matches) scheduleToast(); else dismissToast(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleToast(); });
  window.addEventListener('pagehide', () => { clearTimeout(toastTimer); toastTimer = null; toast?.remove(); toast = null; });
  window.addEventListener('pageshow', scheduleToast);
  scheduleToast();
})();
