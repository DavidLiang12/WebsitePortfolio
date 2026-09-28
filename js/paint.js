(() => {
  'use strict';
  const canvas = document.getElementById('paint-canvas');
  if (!canvas) return;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const panel = document.getElementById('paint');
  const status = document.getElementById('paint-status');
  const undoButton = document.getElementById('paint-undo');
  const redoButton = document.getElementById('paint-redo');
  const colorInput = document.getElementById('paint-color');
  const sizeInput = document.getElementById('paint-size');
  const undo = [], redo = [];
  let tool = 'brush', color = colorInput.value, stroke;
  const sound = () => window.portfolioSound?.play('click');
  const snapshot = () => context.getImageData(0, 0, canvas.width, canvas.height);
  const update = () => { undoButton.disabled = !undo.length; redoButton.disabled = !redo.length; };
  const remember = image => { undo.push(image); if (undo.length > 20) undo.shift(); redo.length = 0; update(); };
  function blank() { context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); }
  blank();

  function point(event) {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * canvas.width / bounds.width,
      y: (event.clientY - bounds.top) * canvas.height / bounds.height };
  }
  function finish() {
    if (!stroke) return;
    const current = stroke;
    stroke = null;
    remember(current.before);
    if (canvas.hasPointerCapture(current.id)) canvas.releasePointerCapture(current.id);
    status.textContent = 'Drawing updated. Save a PNG whenever you like.';
  }
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || stroke) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    const position = point(event);
    stroke = { id: event.pointerId, before: snapshot(), last: position,
      width: Number(sizeInput.value), color: tool === 'eraser' ? '#ffffff' : color };
    canvas.setPointerCapture(event.pointerId);
    context.fillStyle = stroke.color;
    context.beginPath();
    context.arc(position.x, position.y, stroke.width / 2, 0, Math.PI * 2);
    context.fill();
  });
  canvas.addEventListener('pointermove', event => {
    if (!stroke || stroke.id !== event.pointerId) return;
    const samples = event.getCoalescedEvents?.() || [];
    for (const sample of samples.length ? samples : [event]) {
      const position = point(sample);
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.width;
      context.lineCap = 'round'; context.lineJoin = 'round';
      context.beginPath(); context.moveTo(stroke.last.x, stroke.last.y);
      context.lineTo(position.x, position.y); context.stroke();
      stroke.last = position;
    }
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => canvas.addEventListener(type, event => {
    if (stroke?.id === event.pointerId) finish();
  }));
  window.addEventListener('blur', finish);

  function restore(from, to, message) {
    finish();
    if (!from.length) return;
    to.push(snapshot()); context.putImageData(from.pop(), 0, 0);
    update(); status.textContent = message; sound();
  }
  undoButton.addEventListener('click', () => restore(undo, redo, 'Undone.'));
  redoButton.addEventListener('click', () => restore(redo, undo, 'Redone.'));
  document.getElementById('paint-clear').addEventListener('click', () => {
    finish(); remember(snapshot()); blank(); sound();
    status.textContent = 'Canvas cleared. Undo brings your drawing back.';
  });
  function setTool(next) {
    tool = next;
    panel.querySelectorAll('[data-paint-tool]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.paintTool === tool)));
    status.textContent = `${tool === 'eraser' ? 'Eraser' : 'Brush'} selected.`;
  }
  panel.querySelectorAll('[data-paint-tool]').forEach(button => button.addEventListener('click', () => { setTool(button.dataset.paintTool); sound(); }));
  function setColor(next) {
    color = next; colorInput.value = color; setTool('brush');
    panel.querySelectorAll('[data-paint-color]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.paintColor === color)));
  }
  panel.querySelectorAll('[data-paint-color]').forEach(button => button.addEventListener('click', () => { setColor(button.dataset.paintColor); sound(); }));
  colorInput.addEventListener('input', () => setColor(colorInput.value));
  panel.addEventListener('keydown', event => {
    if (event.target.matches('input, select') || !(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (!['z', 'y', 's'].includes(key)) return;
    event.preventDefault();
    if (key === 's') save();
    else if (key === 'y' || event.shiftKey) restore(redo, undo, 'Redone.');
    else restore(undo, redo, 'Undone.');
  });
  function save() {
    finish(); sound();
    canvas.toBlob(blob => {
      if (!blob) { status.textContent = 'Could not create the PNG. Please try again.'; return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'art-desk-drawing.png';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = 'Your PNG is ready to download.';
    }, 'image/png');
  }
  document.getElementById('paint-save').addEventListener('click', save);
})();
