(() => {
  'use strict';

  const root = new URL('../', document.currentScript.src);
  const pages = ['index.html', 'games.html', 'projects.html', 'art-2d.html', 'art-3d.html', 'about.html'];
  const variants = ['tape', 'cd', 'circles', 'equalizer', 'shutter'];
  const names = ['Tape stripes', 'CD spin', 'Concentric circles', 'Equalizer bars', 'Stereo shutter'];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pageEffects = {
    'index.html': 'tape', 'about.html': 'cd',
    'games.html': 'shutter', 'projects.html': 'shutter',
    'art-2d.html': 'equalizer', 'art-3d.html': 'equalizer'
  };
  const pendingKey = 'portfolio-transition-pending';
  const read = key => { try { return sessionStorage.getItem(key); } catch (_) { return null; } };
  const write = (key, value) => { try { sessionStorage.setItem(key, value); return true; } catch (_) { return false; } };
  const clear = key => { try { sessionStorage.removeItem(key); } catch (_) {} };
  const isMain = url => url.origin === root.origin &&
    (url.pathname === root.pathname || pages.some(page => url.pathname === new URL(page, root).pathname));
  const canonical = url => url.pathname === root.pathname ? new URL('index.html', root).pathname : url.pathname;
  let busy = false;
  let active;
  let watchdog;

  function create(type, host = document.documentElement, from) {
    const overlay = document.createElement('div');
    overlay.className = `page-transition pt-${type}`;
    if (pages.includes(from)) overlay.className += ` pt-from-${from.replace('.html', '')}`;
    overlay.setAttribute('aria-hidden', 'true');
    const count = { tape: 3, cd: 1, circles: 3, equalizer: 10, shutter: 2 }[type];
    for (let i = 0; i < count; i++) {
      const layer = document.createElement('span');
      layer.className = 'pt-layer';
      layer.style.setProperty('--i', i);
      overlay.append(layer);
    }
    host.append(overlay);
    return overlay;
  }

  function frames(type, i, entering) {
    const full = 'translate(0, 0) scale(1) rotate(0deg)';
    let hidden;
    if (type === 'tape') hidden = `translateX(${entering ? 101 : -101}%)`;
    if (type === 'cd') hidden = `translate(0, 0) scale(0) rotate(${entering ? 210 : -210}deg)`;
    if (type === 'circles') hidden = 'scale(0)';
    if (type === 'equalizer') hidden = `translateY(${entering ? -101 : 101}%)`;
    if (type === 'shutter') hidden = `translateY(${i === 0 ? -101 : 101}%)`;
    return entering ? [{ transform: full }, { transform: hidden }] : [{ transform: hidden }, { transform: full }];
  }

  async function animate(overlay, type, entering) {
    if (motion.matches || !Element.prototype.animate) return;
    const animations = [...overlay.children].map((layer, i) => {
      let delay = 0;
      if (type === 'tape') delay = i * 45;
      if (type === 'circles') delay = (entering ? 2 - i : i) * 55;
      if (type === 'equalizer') delay = [0, 45, 80, 30, 65, 100, 55, 15, 70, 40][i];
      return layer.animate(frames(type, i, entering), {
        duration: type === 'cd' ? 520 : 390,
        delay, easing: 'cubic-bezier(.65, 0, .25, 1)', fill: 'both'
      });
    });
    await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
  }

  function reset() {
    clearTimeout(watchdog);
    if (active) {
      active.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
      active.remove();
    }
    active = null;
    busy = false;
  }

  // Read once in the head, so the destination is covered before its first paint.
  let incoming;
  try { incoming = JSON.parse(read(pendingKey)); } catch (_) {}
  clear(pendingKey);
  if (incoming && pages.includes(incoming.from) && pageEffects[incoming.from] === incoming.type && incoming.href === location.href &&
      Date.now() - incoming.time < 15000 && isMain(new URL(location.href)) && !motion.matches) {
    active = create(incoming.type, document.documentElement, incoming.from);
    busy = true;
    watchdog = setTimeout(reset, 2500);
    document.addEventListener('DOMContentLoaded', async () => {
      if (!active) return;
      await animate(active, incoming.type, true);
      reset();
    }, { once: true });
  }

  document.addEventListener('click', async event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
        event.altKey || event.shiftKey || link.hasAttribute('download') ||
        (link.target && link.target !== '_self') || motion.matches || !Element.prototype.animate) return;
    const target = new URL(link.href);
    const current = new URL(location.href);
    // Both ends must be main pages. Detail pages, anchors and external links stay native.
    if (!isMain(current) || !isMain(target) || canonical(target) === canonical(current)) return;
    if (busy) { event.preventDefault(); return; }
    const from = canonical(current).split('/').pop();
    const type = pageEffects[from];
    // If storage is unavailable, use normal navigation instead of a half transition.
    if (!write(pendingKey, JSON.stringify({ type, from, href: target.href, time: Date.now() }))) return;
    event.preventDefault();
    busy = true;
    active = create(type, document.documentElement, from);
    const navigate = () => location.assign(target.href);
    watchdog = setTimeout(navigate, 1400);
    try { await animate(active, type, false); } finally {
      clearTimeout(watchdog);
      navigate();
    }
  });

  window.addEventListener('pageshow', event => { if (event.persisted) { clear(pendingKey); reset(); } });
  motion.addEventListener('change', () => { if (motion.matches && active) reset(); });

  // Shared by the comparison page; previews use the exact navigation animation.
  window.portfolioTransitions = {
    variants, names,
    async preview(type, host, atMidpoint) {
      const overlay = create(type, host);
      try {
        await animate(overlay, type, false);
        atMidpoint();
        await animate(overlay, type, true);
      } finally { overlay.remove(); }
    }
  };
})();
