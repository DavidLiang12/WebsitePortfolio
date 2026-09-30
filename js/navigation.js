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
    group.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse') openedByHover = false;
    });
    group.addEventListener('pointerenter', event => {
      if (!hover.matches || event.pointerType !== 'mouse') return;
      closeOthers(group);
      openedByHover = !group.open;
      group.open = true;
    });
    group.addEventListener('pointerleave', event => {
      if (hover.matches && event.pointerType === 'mouse' && !group.contains(document.activeElement)) group.open = false;
    });
    group.addEventListener('toggle', () => {
      if (group.open) closeOthers(group);
    });
    group.addEventListener('focusout', event => {
      // Safari can blur the summary with no new focus target during a link tap.
      // Keep the link visible until its native click; outside clicks dismiss below.
      if (event.relatedTarget && !group.contains(event.relatedTarget)) group.open = false;
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
