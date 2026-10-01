(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  const resets = [];
  document.querySelectorAll('.portfolio-logo, .cd-project-link').forEach(link => {
    const disc = link.querySelector('.portfolio-logo-disc, .cd-disc');
    if (!disc) return;
    let angle = 0, frame = 0, previous = 0, returning = false, start = 0, from = 0;
    const draw = () => { disc.style.rotate = `${angle}deg`; };
    const tick = now => {
      if (returning) {
        const t = Math.min(1, (now - start) / 300);
        angle = from * Math.pow(1 - t, 3);
        if (t === 1) { angle = 0; draw(); frame = 0; return; }
      } else {
        angle = (angle + Math.max(0, now - previous) * .015) % 360;
      }
      previous = now; draw(); frame = requestAnimationFrame(tick);
    };
    const reset = () => { cancelAnimationFrame(frame); frame = 0; angle = 0; returning = false; draw(); };
    link.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch' || reduced.matches || !hover.matches) return;
      cancelAnimationFrame(frame); returning = false; previous = performance.now(); frame = requestAnimationFrame(tick);
    });
    const rewind = () => {
      if (!frame && !angle) return;
      cancelAnimationFrame(frame); returning = true; from = angle; start = performance.now(); frame = requestAnimationFrame(tick);
    };
    link.addEventListener('pointerleave', rewind);
    link.addEventListener('pointercancel', rewind);
    resets.push(reset);
  });
  const reset = () => resets.forEach(fn => fn());
  reduced.addEventListener('change', reset); hover.addEventListener('change', reset);
  window.addEventListener('pagehide', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
})();
