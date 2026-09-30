const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/../js/navigation.js`, 'utf8');

function setup(hover = false) {
  function element() {
    return { handlers: {}, addEventListener(name, fn) { this.handlers[name] = fn; },
      emit(name, event = {}) { this.handlers[name]?.(event); } };
  }
  const document = element();
  const groups = [0, 1].map(() => {
    const group = element(), summary = element(), link = element();
    group.open = false;
    group.summary = summary; group.link = link;
    group.contains = target => [group, summary, link].includes(target);
    group.querySelector = () => summary;
    summary.focus = () => { document.activeElement = summary; };
    return group;
  });
  document.querySelectorAll = () => groups;
  vm.runInNewContext(source, { document, window: { matchMedia: () => ({ matches: hover }) } });
  return { document, groups };
}

test('Safari blur without a focus target keeps the tapped link available', () => {
  const { groups: [group], document } = setup();
  group.open = true;
  group.emit('focusout', { relatedTarget: null });
  assert.equal(group.open, true);
  document.emit('click', { target: group.link });
  assert.equal(group.open, true);
});

test('touch on a hover-capable iPad does not trigger mouse open/close behavior', () => {
  const { groups: [group] } = setup(true);
  group.emit('pointerenter', { pointerType: 'touch' });
  assert.equal(group.open, false);
  group.open = true;
  group.emit('pointerleave', { pointerType: 'touch' });
  assert.equal(group.open, true);
});

test('mouse hover, keyboard focus, Escape and outside dismissal still work', () => {
  const { groups: [group, other], document } = setup(true);
  other.open = true;
  group.emit('pointerenter', { pointerType: 'mouse' });
  assert.equal(group.open, true);
  assert.equal(other.open, false);
  let prevented = false;
  group.summary.emit('click', { preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  group.emit('focusout', { relatedTarget: group.link });
  assert.equal(group.open, true);
  group.emit('focusout', { relatedTarget: other.summary });
  assert.equal(group.open, false);
  group.open = true;
  group.emit('keydown', { key: 'Escape', stopPropagation() {} });
  assert.equal(group.open, false);
  assert.equal(document.activeElement, group.summary);
  group.open = true;
  document.emit('click', { target: {} });
  assert.equal(group.open, false);
});

test('switching from mouse hover to touch allows native summary activation', () => {
  const { groups: [group] } = setup(true);
  group.emit('pointerenter', { pointerType: 'mouse' });
  group.emit('pointerdown', { pointerType: 'touch' });
  let prevented = false;
  group.summary.emit('click', { preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
});
