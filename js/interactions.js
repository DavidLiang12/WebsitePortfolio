(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionResets = [];

  document.querySelectorAll('.cassette-game-disc, .game-disc-art, .cd-artwork, .placeholder-disc-stage').forEach(stage => {
    stage.classList.add('disc-press-stage');
    let bounds, frame = 0, tiltX = 0, tiltY = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      bounds = null;
      stage.style.removeProperty('--press-x');
      stage.style.removeProperty('--press-y');
    };
    stage.addEventListener('pointerenter', () => { bounds = stage.getBoundingClientRect(); });
    stage.addEventListener('pointermove', event => {
      if (reducedMotion.matches || event.pointerType === 'touch') return;
      bounds ||= stage.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      tiltX = -y * 9;
      tiltY = x * 9;
      if (!frame) frame = requestAnimationFrame(() => {
        stage.style.setProperty('--press-x', `${tiltX}deg`);
        stage.style.setProperty('--press-y', `${tiltY}deg`);
        frame = 0;
      });
    });
    stage.addEventListener('pointerleave', reset);
    stage.addEventListener('pointercancel', reset);
    window.addEventListener('scroll', reset, { passive: true });
    window.addEventListener('resize', reset);
    motionResets.push(reset);
  });

  document.querySelectorAll('.cassette-game-cover-link, .game-disc-art, .cd-artwork').forEach(stage => {
    if (!stage.querySelector('img.cd-disc')) return;
    stage.classList.add('disc-reflection-stage');
    const sheen = document.createElement('span');
    sheen.className = 'disc-reflection';
    sheen.setAttribute('aria-hidden', 'true');
    stage.append(sheen);
    let frame = 0;
    let angle = 25;
    stage.addEventListener('pointermove', event => {
      if (reducedMotion.matches || event.pointerType === 'touch') return;
      const bounds = stage.getBoundingClientRect();
      angle = Math.atan2(event.clientY - bounds.top - bounds.height / 2,
        event.clientX - bounds.left - bounds.width / 2) * 180 / Math.PI + 90;
      if (!frame) frame = requestAnimationFrame(() => {
        stage.style.setProperty('--reflection-angle', `${angle}deg`);
        frame = 0;
      });
    });
    motionResets.push(() => {
      cancelAnimationFrame(frame);
      frame = 0;
      stage.style.removeProperty('--reflection-angle');
    });
  });

  const svgNS = 'http://www.w3.org/2000/svg';
  document.querySelectorAll('.cassette-tape, .games-tape, .stereo-stripes, .other-projects-tape').forEach(tape => {
    const gradient = getComputedStyle(tape).backgroundImage;
    // Browsers may expand a two-position color stop into duplicate stops.
    const colors = gradient.match(/rgba?\([^)]+\)|#[\da-f]{3,8}\b/gi)
      ?.filter((color, index, stops) => index === 0 || color !== stops[index - 1]);
    if (!colors?.length) return;
    const svg = document.createElementNS(svgNS, 'svg');
    svg.classList.add('tape-art');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const bands = colors.map(color => {
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('fill', color);
      svg.append(path);
      return path;
    });
    tape.append(svg);
    tape.classList.add('interactive-tape');
    let width = 0, height = 0, x = 0, offset = 0, target = 0, velocity = 0, frame = 0, releaseTimer;
    const draw = () => {
      if (!width || !height) return;
      const spread = Math.min(150, width / 4);
      const wave = point => offset * Math.exp(-Math.pow((point - x) / spread, 2)) * Math.sin(Math.PI * point / width);
      const steps = Math.max(24, Math.ceil(width / 14));
      bands.forEach((band, index) => {
        const top = height * index / bands.length;
        const bottom = height * (index + 1) / bands.length;
        let d = '';
        for (let i = 0; i <= steps; i++) {
          const point = width * i / steps;
          d += `${i ? 'L' : 'M'}${point.toFixed(2)},${(top + wave(point)).toFixed(2)}`;
        }
        for (let i = steps; i >= 0; i--) {
          const point = width * i / steps;
          d += `L${point.toFixed(2)},${(bottom + wave(point)).toFixed(2)}`;
        }
        band.setAttribute('d', `${d}Z`);
      });
    };
    const resize = () => {
      width = tape.clientWidth;
      height = tape.clientHeight;
      x = width / 2;
      svg.setAttribute('viewBox', `0 0 ${width || 1} ${height || 1}`);
      draw();
    };
    const tick = () => {
      velocity = (velocity + (target - offset) * .12) * .7;
      offset += velocity;
      // Keep the bottom of a footer from extending the document's scroll height.
      if (offset > 0) { offset = 0; velocity = 0; }
      draw();
      if (Math.abs(target - offset) > .05 || Math.abs(velocity) > .05) frame = requestAnimationFrame(tick);
      else { offset = target; draw(); frame = 0; }
    };
    const animate = () => { if (!frame) frame = requestAnimationFrame(tick); };
    const release = () => { clearTimeout(releaseTimer); target = 0; animate(); };
    const reset = () => {
      clearTimeout(releaseTimer);
      cancelAnimationFrame(frame);
      frame = 0; offset = 0; target = 0; velocity = 0;
      tape.classList.toggle('is-flexible', !reducedMotion.matches);
      draw();
    };
    tape.addEventListener('pointermove', event => {
      if (reducedMotion.matches || event.pointerType === 'touch') return;
      const bounds = tape.getBoundingClientRect();
      x = Math.max(0, Math.min(width, event.clientX - bounds.left));
      target = -Math.min(16, height * .55);
      animate();
    });
    tape.addEventListener('pointerdown', event => {
      if (reducedMotion.matches) return;
      x = Math.max(0, Math.min(width, event.clientX - tape.getBoundingClientRect().left));
      target = -Math.min(20, height * .7);
      animate();
      clearTimeout(releaseTimer);
      releaseTimer = setTimeout(release, 220);
    });
    tape.addEventListener('pointerleave', release);
    tape.addEventListener('pointercancel', release);
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(tape);
    else window.addEventListener('resize', resize);
    resize(); reset();
    motionResets.push(reset);
  });
  reducedMotion.addEventListener('change', () => motionResets.forEach(reset => reset()));
  window.addEventListener('pagehide', () => motionResets.forEach(reset => reset()));
})();
