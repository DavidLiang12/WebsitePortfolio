(() => {
  'use strict';
  const workspace = document.getElementById('desktop-workspace');
  const windows = [...workspace.querySelectorAll('.os-window')];
  const tasks = document.getElementById('desktop-tasks');
  const announcement = document.getElementById('desktop-announcement');
  const mobile = matchMedia('(max-width: 760px)');
  const openWindows = new Set(['readme']);
  const launchers = new Map();
  let order = 2;
  let active = 'readme';
  let drag;
  const nameOf = panel => panel.querySelector('.os-window-title').textContent;

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
          else open(panel.id, task);
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
    panel.hidden = true; focusNext(panel);
    announcement.textContent = `${nameOf(panel)} minimized. Restore it from the taskbar.`;
  }

  document.querySelectorAll('[data-open]').forEach(button => {
    button.addEventListener('click', () => { open(button.dataset.open, button); window.portfolioSound?.play('click'); });
  });

  windows.forEach(panel => {
    panel.addEventListener('pointerdown', () => focus(panel));
    panel.addEventListener('focusin', () => { if (active !== panel.id) focus(panel); });
    const close = () => {
      panel.hidden = true; openWindows.delete(panel.id); focusNext(panel);
      announcement.textContent = `${nameOf(panel)} closed.`;
    };
    panel.querySelector('[data-close]').addEventListener('click', close);
    panel.querySelector('[data-minimize]').addEventListener('click', () => minimize(panel));
    panel.querySelector('[data-maximize]').addEventListener('click', event => {
      const maximized = panel.classList.toggle('is-maximized');
      event.currentTarget.setAttribute('aria-pressed', String(maximized));
      event.currentTarget.setAttribute('aria-label', `${maximized ? 'Restore' : 'Maximize'} ${nameOf(panel)}`);
    });
    panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } });
    const bar = panel.querySelector('[data-drag]');
    bar.addEventListener('pointerdown', event => {
      if (event.button !== 0 || mobile.matches || panel.classList.contains('is-maximized') || event.target.closest('button')) return;
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
  document.getElementById('reset-desktop').addEventListener('click', () => { arrange(); announcement.textContent = 'Windows arranged.'; });
  window.addEventListener('resize', arrange);
  focus(windows[0]);

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
