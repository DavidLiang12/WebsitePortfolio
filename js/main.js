document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinksMobile = document.querySelector('.nav-links-mobile');

  if (hamburger && navLinksMobile) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinksMobile.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!navLinksMobile.contains(e.target) && e.target !== hamburger) {
        navLinksMobile.classList.remove('open');
      }
    });
  }

  // Click sound for nav buttons
  const clickSound = new Audio('../Sound/Click.MP3');
  document.querySelectorAll('.nav-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      clickSound.play();
      btn.querySelector('img').classList.add('clicked');
      setTimeout(() => {
        window.location.href = btn.href;
      }, 300);
    });
  });

  // Click sound for project links
  const projectSound = new Audio('../Sound/CD.MP3');
  document.querySelectorAll('a[href*="games/"], a[href*="art/"]').forEach(link => {
    if (link.href.includes('cyberpunk-character.html')) return;
    if (link.href.includes('pixar-studio.html')) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      projectSound.play();
      projectSound.addEventListener('ended', () => {
        window.location.href = link.href;
      }, { once: true });
    });
  });

  // Pixar cover click animation
  const pixarLink = document.querySelector('a[href="art/pixar-studio.html"]');
  if (pixarLink) {
    pixarLink.addEventListener('click', (e) => {
      e.preventDefault();
      projectSound.play();
      const img = pixarLink.querySelector('.cyber-cover');
      img.classList.add('spin');
      setTimeout(() => {
        window.location.href = pixarLink.href;
      }, 1000);
    });
  }

  // Cyberpunk cover click animation
  const cyberLink = document.querySelector('a[href="art/cyberpunk-character.html"]');
  if (cyberLink) {
    cyberLink.addEventListener('click', (e) => {
      e.preventDefault();
      projectSound.play();
      const img = cyberLink.querySelector('.cyber-cover');
      img.classList.add('spin');
      setTimeout(() => {
        window.location.href = cyberLink.href;
      }, 1000);
    });
  }
});

function toggleMenu() {
  const navLinksMobile = document.querySelector('.nav-links-mobile');
  navLinksMobile.classList.toggle('open');
}

function copyEmail() {
  const email = '200446junqi@gmail.com';
  const emailLink = document.querySelector('.email-link');
  const originalText = emailLink.textContent;

  navigator.clipboard.writeText(email).then(() => {
    emailLink.textContent = '✓ Copied!';
    emailLink.style.color = '#4CAF50';
    
    setTimeout(() => {
      emailLink.textContent = originalText;
      emailLink.style.color = '';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy: ', err);
    const textArea = document.createElement('textarea');
    textArea.value = email;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    emailLink.textContent = '✓ Copied!';
    emailLink.style.color = '#4CAF50';
    
    setTimeout(() => {
      emailLink.textContent = originalText;
      emailLink.style.color = '';
    }, 2000);
  });
}
