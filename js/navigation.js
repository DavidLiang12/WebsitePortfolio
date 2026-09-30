(() => {
  const groups = [...document.querySelectorAll('.portfolio-nav .nav-group')];
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const closeOthers = current => groups.forEach(group => {
    if (group !== current) group.open = false;
  });
  groups.forEach(group => {
    let openedByHover = false;
    group.querySelector('summary').addEventListener('click', event => {
      if (hover.matches && openedByHover && group.open) event.preventDefault();
      openedByHover = false;
    });
    group.addEventListener('pointerenter', () => {
      if (!hover.matches) return;
      closeOthers(group);
      openedByHover = !group.open;
      group.open = true;
    });
    group.addEventListener('pointerleave', () => {
      if (hover.matches && !group.contains(document.activeElement)) group.open = false;
    });
    group.addEventListener('toggle', () => {
      if (group.open) closeOthers(group);
    });
    group.addEventListener('focusout', event => {
      if (!group.contains(event.relatedTarget)) group.open = false;
    });
    group.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      group.open = false;
      group.querySelector('summary').focus();
      event.stopPropagation();
    });
  });
  document.addEventListener('click', event => {
    groups.forEach(group => { if (!group.contains(event.target)) group.open = false; });
  });
})();
