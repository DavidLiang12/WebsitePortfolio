(() => {
  const transitions = window.portfolioTransitions;
  document.querySelectorAll('.study').forEach(study => {
    const type = study.dataset.variant;
    const button = study.querySelector('[data-preview]');
    button.addEventListener('click', async () => {
      button.disabled = true;
      const screen = study.querySelector('.study-screen');
      try {
        await transitions.preview(type, study.querySelector('.study-stage'), () => {
          const sideB = screen.classList.toggle('is-side-b');
          screen.querySelector('strong').textContent = sideB ? 'GAMES' : 'HOME';
          screen.lastElementChild.textContent = sideB ? 'SIDE B — INTERACTIVE EXPERIENCES' : 'SIDE A — SELECTED WORK';
        });
      } finally { button.disabled = false; }
    });
  });
})();
