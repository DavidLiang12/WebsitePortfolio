(() => {
  'use strict';
  const root = new URL('../', document.currentScript.src);
  const model = window.AchievementState;
  const enabled = matchMedia('(min-width: 641px)');
  const queueKey = 'portfolio-exploration-toast-queue-v1';
  let initialized = false, pending = [], timer = null, toast = null;
  const persist = () => { try { sessionStorage.setItem(queueKey, JSON.stringify(pending)); } catch (_) {} };
  const booting = () => ['desktop-boot', 'achievement-boot'].some(id => document.getElementById?.(id)?.hidden === false);
  function schedule() {
    if (timer || toast || !pending.length || !enabled.matches || document.hidden || booting()) return;
    timer = setTimeout(show, 450);
  }
  function dismiss() {
    clearTimeout(timer);
    timer = null;
    toast?.remove();
    toast = null;
    schedule();
  }
  function show() {
    timer = null;
    if (!enabled.matches || document.hidden || booting()) return;
    const id = pending.shift();
    const achievement = model.achievements.find(item => item.id === id);
    persist();
    if (!achievement) { schedule(); return; }
    toast = document.createElement('section');
    toast.className = 'achievement-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `<span class="achievement-badge earned">${model.icon(achievement.icon)}</span><div><small>Achievement unlocked</small><strong>${achievement.title}</strong><a href="${new URL('achievements.html', root)}">View achievements <span aria-hidden="true">↗</span></a></div><button type="button" aria-label="Dismiss achievement notification">×</button>`;
    toast.querySelector('button').addEventListener('click', dismiss);
    // Give keyboard users time to follow the link or dismiss the notification.
    toast.addEventListener('focusin', () => { clearTimeout(timer); timer = null; });
    toast.addEventListener('focusout', event => {
      if (!toast?.contains(event.relatedTarget)) timer = setTimeout(dismiss, 5600);
    });
    document.body.append(toast);
    window.portfolioSound?.play('achievement');
    timer = setTimeout(dismiss, 5600);
  }
  function initialize(state) {
    if (initialized || !enabled.matches) return;
    initialized = true;
    try {
      const saved = JSON.parse(sessionStorage.getItem(queueKey));
      if (Array.isArray(saved)) pending = [...new Set(saved)].filter(id => model.achievements.some(item => item.id === id && item.earned(state)));
    } catch (_) {}
    schedule();
  }
  function enqueue(ids) {
    if (!enabled.matches) return;
    pending.push(...ids.filter(id => model.achievements.some(item => item.id === id) && !pending.includes(id)));
    persist();
    schedule();
  }
  window.portfolioAchievementNotifications = { initialize, enqueue };
  enabled.addEventListener('change', () => { if (enabled.matches) schedule(); else dismiss(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  window.addEventListener('pagehide', () => { clearTimeout(timer); timer = null; toast?.remove(); toast = null; });
  window.addEventListener('pageshow', schedule);
  window.addEventListener('portfolio:desktopboot', schedule);
  window.addEventListener('portfolio:achievementboot', schedule);
})();
