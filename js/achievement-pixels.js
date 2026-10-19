(() => {
  'use strict';
  if (!document.querySelector('.achievement-pc-page')) return;
  // Actual backing stores below CSS resolution, including on Retina displays.
  // Large artwork uses 1 sample per 1.35px; small type stays a little finer.
  const pixelSize = 1.35;
  const enabled = matchMedia('(min-width: 641px)');
  const contrast = matchMedia('(prefers-contrast: more), (forced-colors: active)');
  const texts = new Map(), badges = new WeakMap();
  const selector = '.achievement-copy h2, .achievement-copy p, .achievement-status, .achievement-summary-copy, .achievement-filters button, .achievement-credit, .achievement-taskbar .sound-toggle-classic, .achievement-boot-type, #achievement-skip-boot';
  let frame = 0, posterKey = '', departing = false, fontsReady = false;

  function canvas(className) {
    const node = document.createElement('canvas');
    node.className = className;
    node.setAttribute('aria-hidden', 'true');
    return node;
  }
  function size(node, width, height, sampleSize = pixelSize) {
    node.width = Math.max(1, Math.ceil(width / sampleSize));
    node.height = Math.max(1, Math.ceil(height / sampleSize));
    node.style.width = `${width}px`;
    node.style.height = `${height}px`;
    return node.getContext('2d');
  }
  function font(context, style) {
    // Numeric variants can leave the computed font shorthand empty (e.g. 14%).
    context.font = style.font || `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    context.letterSpacing = style.letterSpacing;
    context.textBaseline = 'alphabetic';
  }
  function text(context, label, x, y, style, shadowScale = 1) {
    font(context, style);
    context.fillStyle = style.color;
    context.fillText(label, x, y);
    // Paint the existing phosphor shadows behind the low-resolution glyphs.
    context.save();
    context.globalCompositeOperation = 'destination-over';
    const pattern = /(rgba?\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/g;
    for (const match of style.textShadow.matchAll(pattern)) {
      context.shadowColor = match[1];
      context.shadowOffsetX = Number(match[2]) * shadowScale;
      context.shadowOffsetY = Number(match[3]) * shadowScale;
      context.shadowBlur = Number(match[4]) * shadowScale;
      context.fillText(label, x, y);
    }
    context.restore();
  }

  function paintText(element) {
    element.classList.remove('is-pixel-ready');
    const box = element.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const elementStyle = getComputedStyle(element);
    const key = [element.textContent, box.width, box.height, elementStyle.font, elementStyle.color, elementStyle.textShadow].join('|');
    const cached = texts.get(element);
    if (cached?.isConnected && cached.pixelKey === key) { element.classList.add('is-pixel-ready'); return; }
    element.classList.add('achievement-pixel-text');
    let output = texts.get(element);
    if (!output || !output.isConnected) {
      output = canvas('achievement-text-pixels');
      element.append(output);
      texts.set(element, output);
    }
    const context = output.getContext('2d');
    if (!context) return;
    const runs = [];
    let left = 0, top = 0, right = box.width, bottom = box.height;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim()) continue;
      const style = getComputedStyle(node.parentElement);
      font(context, style);
      const metrics = context.measureText('Mg');
      const ascent = metrics.fontBoundingBoxAscent || parseFloat(style.fontSize) * .8;
      const descent = metrics.fontBoundingBoxDescent || parseFloat(style.fontSize) * .2;
      range.selectNodeContents(node);
      const lines = [...range.getClientRects()].filter(rect => rect.width && rect.height).map(rect => ({ label: '', left: rect.left, top: rect.top, height: rect.height }));
      if (lines.length === 1) {
        // Most UI text is one line. Avoid measuring every individual character.
        lines[0].label = node.textContent;
      } else {
        for (let index = 0; index < node.length; index++) {
          range.setStart(node, index); range.setEnd(node, index + 1);
          const rect = range.getClientRects()[0];
          if (!rect || !rect.width || !rect.height) continue;
          const middle = rect.top + rect.height / 2;
          const line = lines.reduce((nearest, candidate) => !nearest || Math.abs(candidate.top + candidate.height / 2 - middle) < Math.abs(nearest.top + nearest.height / 2 - middle) ? candidate : nearest, null);
          if (!line) continue;
          line.label += node.textContent[index];
        }
      }
      for (const line of lines) {
        const label = style.textTransform === 'uppercase' ? line.label.toUpperCase() : line.label;
        const baseline = line.top - box.top + line.height * ascent / (ascent + descent);
        const x = line.left - box.left;
        const ink = context.measureText(label);
        // Size from real glyph ink and glow, not just the element's line box.
        let bleed = 4;
        const shadows = /(rgba?\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/g;
        for (const match of style.textShadow.matchAll(shadows)) {
          bleed = Math.max(bleed, Math.abs(Number(match[2])) + Number(match[4]) + 4, Math.abs(Number(match[3])) + Number(match[4]) + 4);
        }
        left = Math.min(left, x - (ink.actualBoundingBoxLeft || 0) - bleed);
        right = Math.max(right, x + Math.max(ink.width, ink.actualBoundingBoxRight || 0) + bleed);
        top = Math.min(top, baseline - (ink.actualBoundingBoxAscent || ascent) - bleed);
        bottom = Math.max(bottom, baseline + (ink.actualBoundingBoxDescent || descent) + bleed);
        runs.push({ label, x, baseline, style });
      }
    }
    range.detach();
    left = Math.floor(left); top = Math.floor(top);
    const width = Math.ceil(right) - left, height = Math.ceil(bottom) - top;
    // Fine UI type is only slightly below CSS resolution (well below Retina).
    size(output, width, height, parseFloat(elementStyle.fontSize) < 16 ? 1.05 : pixelSize);
    output.style.left = `${left - (parseFloat(elementStyle.borderLeftWidth) || 0)}px`;
    output.style.top = `${top - (parseFloat(elementStyle.borderTopWidth) || 0)}px`;
    const sx = output.width / width, sy = output.height / height;
    context.setTransform(sx, 0, 0, sy, -left * sx, -top * sy);
    for (const run of runs) text(context, run.label, run.x, run.baseline, run.style, sx);
    output.pixelKey = key;
    element.classList.add('is-pixel-ready');
  }

  function matrix(context, element, box, output) {
    const m = element.getScreenCTM();
    const sx = output.width / box.width, sy = output.height / box.height;
    context.setTransform(m.a * sx, m.b * sy, m.c * sx, m.d * sy, (m.e - box.left) * sx, (m.f - box.top) * sy);
    return Math.hypot(m.a, m.b) * sx;
  }
  function posterText(context, element, box, output, cutout = false) {
    const shadowScale = matrix(context, cutout ? document.getElementById('achievement-poster-number-type') : element, box, output);
    const style = getComputedStyle(element);
    const x = Number(element.getAttribute('x') || 0), y = Number(element.getAttribute('y') || 0);
    font(context, style);
    context.textAlign = style.textAnchor === 'end' ? 'right' : 'left';
    if (cutout) {
      context.fillStyle = '#000'; context.strokeStyle = '#000';
      context.lineWidth = parseFloat(style.strokeWidth) || 12;
      context.lineJoin = 'round';
      context.strokeText(element.textContent, x, y);
      context.fillText(element.textContent, x, y);
    } else {
      // SVG fill, rather than the inherited HTML text color, supplies the ink.
      text(context, element.textContent, x, y, { font: style.font, letterSpacing: style.letterSpacing, color: style.fill, textShadow: style.textShadow }, shadowScale);
    }
  }
  function paintPoster() {
    const svg = document.querySelector('.achievement-poster-art');
    if (!svg || !svg.parentElement.classList.contains('is-poster-fitted')) return;
    const box = svg.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const host = svg.parentElement;
    const key = [box.width, box.height, document.getElementById('achievement-poster-number').getAttribute('transform'), document.getElementById('achievement-poster-date-art').textContent].join('|');
    if (key === posterKey && host.classList.contains('is-pixel-poster')) {
      if (!host.querySelector('.achievement-poster-pixels').classList.contains('achievement-crt-sleeping')) host.classList.remove('is-preparing');
      return;
    }
    let output = host.querySelector('.achievement-poster-pixels');
    if (!output) { output = canvas('achievement-poster-pixels'); host.append(output); }
    const context = size(output, box.width, box.height);
    if (!context) { host.classList.remove('is-preparing'); return; }
    const bars = document.createElement('canvas');
    bars.width = output.width; bars.height = output.height;
    const barContext = bars.getContext('2d');
    for (const path of svg.querySelectorAll('#achievement-poster-stripes path')) {
      matrix(barContext, path, box, bars);
      barContext.fillStyle = path.getAttribute('fill');
      barContext.fill(new Path2D(path.getAttribute('d')));
    }
    barContext.globalCompositeOperation = 'destination-out';
    posterText(barContext, svg.querySelector('.achievement-poster-clearance'), box, bars, true);
    context.drawImage(bars, 0, 0);
    for (const id of ['achievement-poster-title-type', 'achievement-poster-number-type', 'achievement-poster-date-art']) {
      posterText(context, document.getElementById(id), box, output);
    }
    host.classList.add('is-pixel-poster');
    posterKey = key;
    window.dispatchEvent(new Event('portfolio:achievementpixels'));
    // The CRT observer wakes a new canvas before it is revealed, avoiding a
    // sharp frame followed by a second frame with the RGB/glow filter applied.
    if (!output.classList.contains('achievement-crt-sleeping')) host.classList.remove('is-preparing');
  }

  function paintBadge(svg) {
    const box = svg.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const color = getComputedStyle(svg).color;
    const key = `${box.width}:${box.height}:${color}`;
    if (badges.get(svg) === key) return;
    badges.set(svg, key);
    const copy = svg.cloneNode(true);
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copy.setAttribute('width', box.width); copy.setAttribute('height', box.height);
    copy.style.color = color;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' }));
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      if (!svg.isConnected || contrast.matches || !enabled.matches) return;
      if (departing) { badges.delete(svg); return; }
      const host = svg.parentElement;
      let output = host.querySelector('.achievement-badge-pixels');
      if (!output) { output = canvas('achievement-badge-pixels'); host.append(output); }
      const context = size(output, box.width, box.height);
      if (!context) return;
      context.drawImage(image, 0, 0, output.width, output.height);
      host.classList.add('is-pixel-badge');
      window.dispatchEvent(new Event('portfolio:achievementpixels'));
    };
    image.onerror = () => { URL.revokeObjectURL(url); badges.delete(svg); };
    image.src = url;
  }

  function refresh() {
    frame = 0;
    const active = enabled.matches && !contrast.matches;
    document.body.classList.toggle('achievement-pixels-on', active);
    if (!fontsReady) return;
    if (!active) {
      const poster = document.querySelector('.achievement-poster');
      if (poster?.classList.contains('is-poster-fitted')) poster.classList.remove('is-preparing');
      return;
    }
    for (const [element] of texts) if (!element.isConnected) texts.delete(element);
    const booting = !document.getElementById('achievement-boot').hidden;
    document.querySelectorAll(selector).forEach(element => {
      if (Boolean(element.closest('.achievement-boot')) === booting && !element.closest('.achievement-crt-sleeping')) paintText(element);
    });
    if (!booting) {
      if (!document.querySelector('.achievement-poster-art')?.closest('.achievement-crt-sleeping')) paintPoster();
      document.querySelectorAll('.achievement-row .achievement-badge > svg').forEach(svg => { if (!svg.closest('.achievement-crt-sleeping')) paintBadge(svg); });
    }
  }
  function request() { if (!departing && !frame) frame = requestAnimationFrame(refresh); }
  for (const event of ['portfolio:achievements', 'portfolio:achievementboot', 'portfolio:achievementposterready', 'portfolio:achievementvisibility', 'resize']) window.addEventListener(event, request);
  const suspend = () => { departing = true; cancelAnimationFrame(frame); frame = 0; };
  const resume = () => { departing = false; request(); };
  window.addEventListener('portfolio:transitionstart', suspend);
  window.addEventListener('portfolio:transitionend', resume);
  window.addEventListener('pageshow', resume);
  for (const event of ['click', 'focusin', 'focusout', 'pointerover', 'pointerout']) {
    document.addEventListener(event, event => { if (event.target.closest('.achievement-filters, .achievement-taskbar, .achievement-boot')) request(); });
  }
  document.addEventListener('DOMContentLoaded', request, { once: true });
  enabled.addEventListener('change', request);
  contrast.addEventListener('change', request);
  window.addEventListener('pagehide', suspend);
  const status = document.getElementById('achievement-boot-status');
  if (status) new MutationObserver(request).observe(status, { childList: true, characterData: true, subtree: true });
  const collection = document.querySelector('.achievement-collection');
  if (collection && 'ResizeObserver' in window) new ResizeObserver(request).observe(collection);
  (document.fonts?.ready || Promise.resolve()).then(() => {
    fontsReady = true;
    posterKey = '';
    texts.forEach(output => { output.pixelKey = ''; });
    request();
  });
})();
