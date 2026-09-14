
(() => {
  'use strict';

  // Native links still work without JavaScript, with modifier keys, or if audio fails.
  const projectLinks = document.querySelectorAll('[data-cd-link]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let navigationTimer;
  let navigating = false;
  let projectSound;

  const resetNavigation = () => {
    window.clearTimeout(navigationTimer);
    navigating = false;
    projectLinks.forEach(link => link.classList.remove('is-spinning'));
  };

  projectLinks.forEach(link => {
    link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank' || reducedMotion.matches) return;
      event.preventDefault();
      if (navigating) return;
      navigating = true;
      link.classList.add('is-spinning');

      // Navigation is independent of playback so muted or failed audio cannot trap visitors.
      navigationTimer = window.setTimeout(() => window.location.assign(link.href), 850);
      try {
        projectSound ||= new Audio('Sound/CD.MP3');
        projectSound.currentTime = 0;
        const playing = projectSound.play();
        if (playing && typeof playing.catch === 'function') playing.catch(() => {});
      } catch (_) {
        // The original CD sound is optional; the project link is not.
      }
    });
  });
  window.addEventListener('pagehide', resetNavigation);
  window.addEventListener('pageshow', resetNavigation);

  const copyButton = document.querySelector('.copy-email');
  const copyStatus = document.getElementById('copy-status');
  let copyTimer;
  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      const email = copyButton.dataset.email;
      let copied = false;
      try {
        await navigator.clipboard.writeText(email);
        copied = true;
      } catch (_) {
        const input = document.createElement('textarea');
        input.value = email;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
        input.remove();
        copyButton.focus();
      }
      window.clearTimeout(copyTimer);
      copyButton.textContent = copied ? 'Email copied!' : 'Copy email';
      if (copyStatus) copyStatus.textContent = copied ? 'Email address copied to your clipboard.' : 'Could not copy the address. Use the Email link to get in touch.';
      copyTimer = window.setTimeout(() => { copyButton.textContent = 'Copy email'; }, 2200);
    });
  }
})();

  