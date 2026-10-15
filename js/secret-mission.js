(() => {
  'use strict';
  const root = new URL('../', document.currentScript.src);
  const model = window.MissionState;
  const key = 'portfolio-secret-mission-v1';
  const desktop = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
  let state;
  try { state = model.normalize(JSON.parse(localStorage.getItem(key))); } catch (_) { state = model.normalize(null); }
  let lightOn = false, frame = 0, point = { x: innerWidth / 2, y: innerHeight / 2 };
  let control, shade, stopLight, objects = [];
  const missionURL = new URL('secret-mission.html', root).href;
  const artURL = new URL('images/mission-artifacts.svg', root).href;
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
    toast.className = 'mission-achievement-toast';
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
  function save(next) {
    const earned = model.newlyEarned(state, next);
    state = model.normalize(next);
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) { /* Current-page play still works if storage is blocked. */ }
    window.dispatchEvent(new CustomEvent('missionchange'));
    syncNavigation();
    enqueue(earned);
  }
  window.portfolioMission = {
    get state() { return model.normalize(state); },
    artifacts: model.artifacts,
    accept() { if (!desktop.matches) return false; save({ ...state, accepted: true }); return true; },
    solve(answer) { save(model.solve(state, answer)); return state.solved; },
    url: missionURL
  };
  function syncNavigation() {
    const header = document.querySelector('.portfolio-header-inner');
    if (!header) return;
    let group = header.querySelector('.mission-nav-group');
    if (state.accepted && desktop.matches && !group) {
      const logo = header.querySelector('.portfolio-logo');
      if (!logo) return;
      group = document.createElement('div');
      group.className = 'mission-nav-group';
      logo.before(group);
      group.append(logo);
      const link = document.createElement('a');
      link.className = 'mission-nav-link';
      link.href = missionURL;
      link.textContent = 'Secret Mission';
      if (location.pathname === new URL(missionURL).pathname) link.setAttribute('aria-current', 'page');
      group.append(link);
      header.classList.add('has-mission');
    }
    if (group && (!desktop.matches || !state.accepted)) {
      group.before(group.querySelector('.portfolio-logo'));
      group.remove();
      header.classList.remove('has-mission');
    }
    if (control) control.hidden = !state.accepted || !desktop.matches;
  }
  const currentPage = location.pathname === root.pathname ? 'index.html' : location.pathname.slice(root.pathname.length);
  const items = model.artifacts.filter(item => item.page === currentPage);
  const main = document.querySelector('main');
  if ((items.length || currentPage === 'secret-mission.html') && main) {
    let foundThisLight = new Set();
    const host = document.createElement('div');
    host.className = 'mission-hidden-objects';
    host.hidden = true;
    document.body.append(host);
    items.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mission-hidden-object';
      button.setAttribute('aria-label', `Collect ${item.name}`);
      button.innerHTML = `<svg aria-hidden="true"><use href="${artURL}#${item.icon}"/></svg><span>${item.name}</span>`;
      button.hidden = true;
      button.addEventListener('click', () => {
        if (!lightOn || !desktop.matches || !state.accepted) return;
        if (state.collected.includes(item.id)) return;
        foundThisLight.add(item.id);
        const next = model.collect(state, item.id);
        if (items.length === 2 && foundThisLight.size === 2) next.secret = true;
        save(next);
        button.hidden = true;
        status.textContent = `${item.name} collected. ${state.collected.length} of 12 artifacts.`;
      });
      // Keyboard users can reveal a focused object while the flashlight is on.
      button.addEventListener('focus', () => button.classList.add('is-lit'));
      button.addEventListener('blur', () => button.classList.remove('is-lit'));
      host.append(button);
      objects.push({ item, button, index });
    });
    const status = document.createElement('p');
    status.className = 'mission-live-status';
    status.setAttribute('role', 'status');
    document.body.append(status);
    shade = document.createElement('div');
    shade.className = 'mission-light-shade';
    shade.hidden = true;
    shade.setAttribute('aria-hidden', 'true');
    document.body.append(shade);
    control = document.createElement('button');
    control.type = 'button';
    control.className = 'mission-flashlight';
    control.hidden = true;
    control.setAttribute('aria-label', 'Turn on flashlight');
    control.setAttribute('aria-pressed', 'false');
    control.title = 'Flashlight';
    control.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13h24v11l-5 7v23a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4V31l-5-7z"/><path d="M20 20h24M25 31h14"/><path class="flashlight-switch" d="M32 38v7"/><path class="flashlight-rays" d="M32 3v4M19 5l3 4M45 5l-3 4"/></g></svg>';
    (document.querySelector('.portfolio-nav') || document.body).append(control);
    function renderLight() {
      frame = 0;
      if (!lightOn) return;
      shade.style.setProperty('--beam-x', `${point.x}px`);
      shade.style.setProperty('--beam-y', `${point.y}px`);
      const bounds = main.getBoundingClientRect();
      objects.forEach(({ item, button, index }) => {
        const x = bounds.left + bounds.width * (index === 0 ? .22 : .77);
        const y = bounds.top + Math.max(bounds.height, 450) * (index === 0 ? .32 : .73);
        button.style.left = `${x}px`;
        button.style.top = `${y}px`;
        button.hidden = state.collected.includes(item.id);
        button.classList.toggle('is-lit', Math.hypot(point.x - x, point.y - y) < 210 || document.activeElement === button);
      });
    }
    function setLight(on, playSound = false) {
      const wasOn = lightOn;
      lightOn = on && desktop.matches && state.accepted;
      if (playSound && lightOn !== wasOn) window.portfolioSound?.play(lightOn ? 'flashlightOn' : 'flashlightOff');
      foundThisLight = new Set();
      document.body.classList.toggle('mission-light-on', lightOn);
      control.setAttribute('aria-pressed', String(lightOn));
      control.setAttribute('aria-label', lightOn ? 'Turn off flashlight' : 'Turn on flashlight');
      shade.hidden = !lightOn;
      host.hidden = !lightOn;
      if (lightOn) {
        save({ ...state, lit: true });
        renderLight();
        status.textContent = 'Flashlight on. Move your mouse to search. Click an object to collect it. Press Escape to stop.';
      } else status.textContent = '';
    }
    stopLight = () => setLight(false);
    control.addEventListener('click', () => setLight(!lightOn, true));
    const schedule = () => { if (lightOn && !frame) frame = requestAnimationFrame(renderLight); };
    document.addEventListener('pointermove', event => { point = { x: event.clientX, y: event.clientY }; schedule(); });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('pageshow', () => { setLight(false); syncNavigation(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && lightOn) { setLight(false, true); control.focus(); } });
    desktop.addEventListener('change', () => { if (!desktop.matches) setLight(false); });
  }
  desktop.addEventListener('change', syncNavigation);
  desktop.addEventListener('change', () => { if (desktop.matches) scheduleToast(); else dismissToast(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleToast(); });
  window.addEventListener('pagehide', () => { clearTimeout(toastTimer); toastTimer = null; toast?.remove(); toast = null; });
  window.addEventListener('pageshow', scheduleToast);
  function refreshState() {
    try { state = model.normalize(JSON.parse(localStorage.getItem(key))); } catch (_) { state = model.normalize(null); }
    if (!state.accepted) stopLight?.();
    syncNavigation();
    window.dispatchEvent(new CustomEvent('missionchange'));
  }
  window.addEventListener('pageshow', refreshState);
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    refreshState();
  });
  syncNavigation();
  scheduleToast();
})();
