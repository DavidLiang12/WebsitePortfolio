(() => {
  'use strict';
  const workspace = document.getElementById('desktop-workspace');
  const windows = [...workspace.querySelectorAll('.os-window')];
  const tasks = document.getElementById('desktop-tasks');
  const announcement = document.getElementById('desktop-announcement');
  const mobile = matchMedia('(max-width: 760px)');
  const openWindows = new Set();
  const launchers = new Map();
  let order = 2;
  let active = null;
  const clickSound = () => window.portfolioSound?.play('click');
  let drag;
  const nameOf = panel => panel.querySelector('.os-window-title').textContent;

  // Only the local game frame receives these messages; other embeds stay independent.
  const gameFrames = [...workspace.querySelectorAll('iframe[data-desktop-game]')];
  function syncGame(panel) {
    panel.querySelectorAll('iframe[data-desktop-game]').forEach(frame => {
      frame.contentWindow?.postMessage({ type: 'desktop-game-state', paused: panel.hidden || document.hidden }, location.origin);
    });
  }
  gameFrames.forEach(frame => frame.addEventListener('load', () => syncGame(frame.closest('.os-window'))));
  document.addEventListener('visibilitychange', () => windows.forEach(syncGame));
  window.addEventListener('pagehide', () => gameFrames.forEach(frame => {
    frame.contentWindow?.postMessage({ type: 'desktop-game-state', paused: true }, location.origin);
  }));
  window.addEventListener('pageshow', () => windows.forEach(syncGame));

  function renderTasks() {
    // Keep buttons stable so keyboard focus survives window state changes.
    windows.forEach(panel => {
      let task = tasks.querySelector(`[data-task="${panel.id}"]`);
      if (!openWindows.has(panel.id)) { task?.remove(); return; }
      if (!task) {
        task = document.createElement('button');
        task.type = 'button'; task.className = 'desktop-task'; task.dataset.task = panel.id;
        task.textContent = nameOf(panel);
        task.addEventListener('click', () => {
          if (active === panel.id && !panel.hidden) minimize(panel);
          else { open(panel.id, task); clickSound(); }
        });
        tasks.append(task);
      }
      task.setAttribute('aria-pressed', String(active === panel.id && !panel.hidden));
      task.setAttribute('aria-label', `${panel.hidden ? 'Restore' : 'Show'} ${nameOf(panel)}`);
    });
  }

  function focus(panel) {
    windows.forEach(item => item.classList.toggle('is-active', item === panel));
    panel.style.zIndex = ++order;
    active = panel.id;
    renderTasks();
  }

  function open(id, launcher) {
    const panel = windows.find(item => item.id === id);
    if (!panel) return;
    if (launcher && !launcher.closest('.os-window') && !launcher.dataset.task) launchers.set(id, launcher);
    openWindows.add(id); panel.hidden = false;
    panel.querySelectorAll('iframe[data-src]').forEach(frame => {
      if (!frame.hasAttribute('src')) frame.src = frame.dataset.src;
    });
    syncGame(panel);
    focus(panel); panel.focus({ preventScroll: true });
    announcement.textContent = `${nameOf(panel)} opened.`;
  }

  function focusNext(panel) {
    const next = windows.filter(item => !item.hidden && item !== panel)
      .sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0];
    active = null;
    if (next) { focus(next); next.focus({ preventScroll: true }); }
    else {
      windows.forEach(item => item.classList.remove('is-active'));
      (launchers.get(panel.id) || document.querySelector(`[data-open="${panel.id}"]`))?.focus({ preventScroll: true });
    }
    renderTasks();
  }

  function minimize(panel) {
    clickSound();
    panel.hidden = true; syncGame(panel); focusNext(panel);
    announcement.textContent = `${nameOf(panel)} minimized. Restore it from the taskbar.`;
  }

  document.querySelectorAll('[data-open]').forEach(button => {
    button.addEventListener('click', () => { open(button.dataset.open, button); window.portfolioSound?.play('click'); });
  });

  windows.forEach(panel => {
    panel.addEventListener('pointerdown', () => focus(panel));
    panel.addEventListener('focusin', () => { if (active !== panel.id) focus(panel); });
    const close = () => {
      clickSound();
      panel.querySelectorAll('iframe[data-src]').forEach(frame => frame.removeAttribute('src'));
      panel.hidden = true; openWindows.delete(panel.id); focusNext(panel);
      announcement.textContent = `${nameOf(panel)} closed.`;
    };
    panel.querySelector('[data-close]').addEventListener('click', close);
    panel.querySelector('[data-minimize]').addEventListener('click', () => minimize(panel));
    panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } });
    const bar = panel.querySelector('[data-drag]');
    bar.addEventListener('pointerdown', event => {
      if (event.button !== 0 || mobile.matches || event.target.closest('button')) return;
      drag = { panel, x: event.clientX, y: event.clientY, left: panel.offsetLeft, top: panel.offsetTop };
      bar.setPointerCapture(event.pointerId); panel.classList.add('is-dragging'); event.preventDefault();
    });
    bar.addEventListener('pointermove', event => {
      if (!drag || drag.panel !== panel) return;
      panel.style.left = `${Math.max(0, Math.min(workspace.clientWidth - panel.offsetWidth, drag.left + event.clientX - drag.x))}px`;
      panel.style.top = `${Math.max(0, Math.min(workspace.clientHeight - panel.offsetHeight, drag.top + event.clientY - drag.y))}px`;
    });
    const endDrag = () => { panel.classList.remove('is-dragging'); drag = null; };
    bar.addEventListener('pointerup', endDrag);
    bar.addEventListener('pointercancel', endDrag);
    bar.addEventListener('lostpointercapture', endDrag);
  });

  function arrange() {
    windows.forEach(panel => { panel.style.removeProperty('left'); panel.style.removeProperty('top'); });
  }
  window.addEventListener('resize', arrange);

  document.querySelectorAll('[data-gallery]').forEach(gallery => {
    const thumbnails = [...gallery.querySelectorAll('[data-gallery-index]')];
    const image = gallery.querySelector('[data-gallery-image]');
    let index = 0;
    function show(next) {
      index = (next + thumbnails.length) % thumbnails.length;
      const item = thumbnails[index];
      image.src = item.dataset.src;
      image.alt = item.dataset.name;
      gallery.querySelector('[data-gallery-name]').textContent = item.dataset.name;
      gallery.querySelector('[data-gallery-count]').textContent = `${index + 1} / ${thumbnails.length}`;
      thumbnails.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
      item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      clickSound();
    }
    thumbnails.forEach((button, i) => button.addEventListener('click', () => show(i)));
    gallery.querySelector('[data-previous]')?.addEventListener('click', () => show(index - 1));
    gallery.querySelector('[data-next]')?.addEventListener('click', () => show(index + 1));
    gallery.closest('.os-window').addEventListener('keydown', event => {
      if (thumbnails.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1));
    });
  });

  function setupTray() {
    const sound = document.querySelector('.art-desktop > .sound-controls');
    if (sound) document.getElementById('desktop-sound-slot').append(sound);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupTray, { once: true });
  else setupTray();
  const clock = document.getElementById('desktop-clock');
  const tick = () => {
    const now = new Date(); clock.dateTime = now.toISOString();
    clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  tick(); setInterval(tick, 30000);
})();
