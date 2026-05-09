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
});

function copyEmail() {
  const email = '200446junqi@gmail.com';
  const emailLink = document.querySelector('.email-link');
  const originalText = emailLink.textContent;

  navigator.clipboard.writeText(email).then(() => {
    emailLink.textContent = '✓ Copied!';
    emailLink.style.color = '#4CAF50'; // Green color for success
    
    setTimeout(() => {
      emailLink.textContent = originalText;
      emailLink.style.color = ''; // Reset to original color
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy: ', err);
    // Fallback for older browsers
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

function toggleMenu() {
  const navLinksMobile = document.querySelector('.nav-links-mobile');
  if (navLinksMobile) {
    navLinksMobile.classList.toggle('open');
  }
}

function toggleTheme() {
  const body = document.body;
  const themeToggle = document.querySelector('.theme-toggle');
  
  body.classList.toggle('light-mode');
  
  if (body.classList.contains('light-mode')) {
    themeToggle.textContent = '🌙'; // Crescent moon for light mode
    localStorage.setItem('theme', 'light');
  } else {
    themeToggle.textContent = '☀️'; // Simple sun for dark mode
    localStorage.setItem('theme', 'dark');
  }
}

// Load saved theme on page load
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  const themeToggle = document.querySelector('.theme-toggle');
  
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    themeToggle.textContent = '🌙';
  } else {
    themeToggle.textContent = '☀️';
  }

  // Existing hamburger menu code
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
});
