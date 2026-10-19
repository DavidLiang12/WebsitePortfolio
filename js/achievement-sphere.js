(() => {
  'use strict';
  const svg = document.getElementById('achievement-sphere');
  if (!svg) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const enabled = matchMedia('(min-width: 641px)');
  const boot = document.getElementById('achievement-boot');
  const canvas = document.createElement?.('canvas');
  const context = canvas?.getContext?.('2d');
  if (context) {
    canvas.className = 'achievement-sphere-pixels';
    canvas.setAttribute('aria-hidden', 'true');
    svg.parentElement.append(canvas);
    svg.style.visibility = 'hidden';
  }
  const ns = 'http://www.w3.org/2000/svg';
  const curves = [];
  let frame = 0, lastTime = 0, angle = .25, visible = true, departing = false, svgDrawn = false;
  function curve(points) {
    const back = document.createElementNS(ns, 'path');
    const front = document.createElementNS(ns, 'path');
    back.setAttribute('stroke', '#ecc94c'); back.setAttribute('opacity', '.16');
    front.setAttribute('stroke', '#ef4b3f'); front.setAttribute('opacity', '.85');
    back.setAttribute('stroke-width', '.9'); front.setAttribute('stroke-width', '1.1');
    svg.append(back, front);
    curves.push({ points, back, front });
  }
  // Project a rotating 3D grid, so the lines travel around the sphere's surface.
  for (let meridian = 0; meridian < 12; meridian++) {
    const longitude = meridian * Math.PI / 6;
    curve(Array.from({ length: 49 }, (_, i) => {
      const latitude = i / 48 * Math.PI;
      return [Math.sin(latitude) * Math.cos(longitude), Math.cos(latitude), Math.sin(latitude) * Math.sin(longitude)];
    }));
  }
  for (let latitude = 1; latitude < 10; latitude++) {
    const y = Math.cos(latitude * Math.PI / 10), radius = Math.sin(latitude * Math.PI / 10);
    // Upright latitude rings look identical as the sphere rotates. Draw once.
    const line = document.createElementNS(ns, 'path');
    line.setAttribute('d', `M${160 - radius * 132},${160 + y * 132}H${160 + radius * 132}`);
    line.setAttribute('stroke', '#ef4b3f');
    line.setAttribute('stroke-width', '1.1');
    line.setAttribute('opacity', '.7');
    svg.append(line);
  }
  const rim = document.createElementNS(ns, 'circle');
  for (const [name, value] of Object.entries({ cx: 160, cy: 160, r: 132, stroke: '#ef4b3f', 'stroke-width': 1.2, opacity: .7 })) rim.setAttribute(name, value);
  svg.append(rim);
  svg.querySelector('[data-sphere-fallback]')?.remove();

  function draw() {
    if (context) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(canvas.width / 320, 0, 0, canvas.height / 320, 0, 0);
      context.lineJoin = 'round'; context.lineCap = 'round';
    }
    const c = Math.cos(angle), s = Math.sin(angle);
    curves.forEach(({ points, back, front }) => {
      const paths = ['', ''];
      const pixels = context ? [new Path2D(), new Path2D()] : null;
      let previousSide = -1;
      points.forEach(([x, y, z]) => {
        const rx = x * c + z * s, rz = z * c - x * s;
        const px = 160 + rx * 132, py = 160 + y * 132;
        const side = rz >= 0 ? 1 : 0;
        if (pixels) {
          if (side === previousSide) pixels[side].lineTo(px, py);
          else pixels[side].moveTo(px, py);
        }
        if (!context || !svgDrawn) paths[side] += `${side === previousSide ? 'L' : 'M'}${px.toFixed(2)},${py.toFixed(2)}`;
        previousSide = side;
      });
      if (context) {
        context.strokeStyle = '#ecc94c'; context.globalAlpha = .16; context.lineWidth = .9;
        context.stroke(pixels[0]);
        context.strokeStyle = '#ef4b3f'; context.globalAlpha = .85; context.lineWidth = 1.1;
        context.stroke(pixels[1]);
      }
      if (!context || !svgDrawn) { back.setAttribute('d', paths[0]); front.setAttribute('d', paths[1]); }
    });
    svgDrawn = true;
    if (context) {
      context.strokeStyle = '#ef4b3f'; context.globalAlpha = .7; context.lineWidth = 1.1;
      for (let latitude = 1; latitude < 10; latitude++) {
        const y = Math.cos(latitude * Math.PI / 10), radius = Math.sin(latitude * Math.PI / 10);
        context.beginPath(); context.moveTo(160 - radius * 132, 160 + y * 132); context.lineTo(160 + radius * 132, 160 + y * 132); context.stroke();
      }
      context.lineWidth = 1.2; context.beginPath(); context.arc(160, 160, 132, 0, Math.PI * 2); context.stroke();
      context.globalAlpha = 1;
    }
  }
  function resize() {
    if (!context) return;
    const size = svg.getBoundingClientRect().width;
    // The buffer stays deliberately below CSS resolution, including on Retina screens.
    canvas.width = canvas.height = Math.max(1, Math.round(size / 1.5));
    draw();
  }
  const canAnimate = () => !departing && (!boot || boot.hidden) && !motion.matches && enabled.matches && visible && !document.hidden;
  function tick(time) {
    frame = 0;
    if (!canAnimate()) return;
    if (time - lastTime >= 32) {
      angle += Math.min(time - (lastTime || time), 80) * .00016;
      lastTime = time;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    if (canAnimate()) frame = requestAnimationFrame(tick);
  }
  motion.addEventListener('change', sync);
  enabled.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('portfolio:achievementboot', sync);
  window.addEventListener('portfolio:transitionstart', () => { departing = true; sync(); });
  window.addEventListener('portfolio:transitionend', () => { departing = false; sync(); });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; });
  window.addEventListener('pageshow', () => { departing = false; sync(); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
    observer.observe(svg);
  }
  if (context && 'ResizeObserver' in window) new ResizeObserver(resize).observe(svg);
  resize();
  draw(); sync();
})();
