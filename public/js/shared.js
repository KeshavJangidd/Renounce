(function () {
  const themeStorageKey = 'renounce_theme';
  const savedTheme = localStorage.getItem(themeStorageKey);
  const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const activeTheme = savedTheme || preferredTheme;
  document.documentElement.dataset.theme = activeTheme;
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const apiBaseUrl = window.RENOUNCE_API_URL || (isLocalhost
    ? (window.location.port === '3001' ? '' : 'http://localhost:3001')
    : 'https://renounce.onrender.com');

  window.apiUrl = (endpoint) => `${apiBaseUrl}${endpoint}`;
  window.apiFetch = (endpoint, options = {}) => fetch(window.apiUrl(endpoint), {
    ...options,
    credentials: 'include'
  });

  const headerMarkup = `
    <header class="site-header">
      <a class="brand" href="index.html">
        <img class="brand-mascot" src="images/renounce-avatar.png" alt="Renounce mascot" />
        <span>Renounce</span>
      </a>
      <div class="header-actions">
        <nav class="nav-links" aria-label="Primary navigation">
          <a href="index.html">Dashboard</a>
          <a href="timer.html">Timer</a>
          <a href="deadlines.html">Deadlines</a>
          <a href="achievements.html">Achievements</a>
          <a href="resume.html">Resume</a>
          <a href="workzone.html">Work Zone</a>
          <a href="talk.html">Talk to Kavir</a>
          <a href="account.html">Account</a>
        </nav>
        <span class="account-pill" id="account-pill" style="display:none;"></span>
        <button class="theme-toggle" type="button" aria-label="Switch to dark mode" aria-pressed="false">
          <span class="theme-toggle-icon" aria-hidden="true">☾</span>
        </button>
      </div>
    </header>
  `;

  const footerMarkup = `
    <footer class="site-footer">
      <p>
        Need help now?
        <a href="https://www.crisistextline.org/" target="_blank" rel="noreferrer">Crisis resources</a>
      </p>
    </footer>
  `;

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const publicPages = ['login.html'];

  if (!publicPages.includes(currentPath)) {
    const root = document.body;
    root.insertAdjacentHTML('afterbegin', headerMarkup);
    root.insertAdjacentHTML('beforeend', footerMarkup);

    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href === currentPath) {
        link.classList.add('active');
      }
    });

    const themeToggle = document.querySelector('.theme-toggle');

    function updateThemeToggle(theme) {
      const darkMode = theme === 'dark';
      themeToggle.setAttribute('aria-label', `Switch to ${darkMode ? 'light' : 'dark'} mode`);
      themeToggle.setAttribute('aria-pressed', String(darkMode));
      themeToggle.querySelector('.theme-toggle-icon').textContent = darkMode ? '☀' : '☾';
    }

    updateThemeToggle(activeTheme);
    themeToggle.addEventListener('click', () => {
      const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = nextTheme;
      localStorage.setItem(themeStorageKey, nextTheme);
      updateThemeToggle(nextTheme);
    });

    // Auth check: redirect to login if not signed in (skip on the login page itself),
    // and show the logged-in user's name in the nav pill
    window.apiFetch('/api/auth/me').then((res) => {
      if (!res.ok) {
        window.location.href = 'login.html';
        return null;
      }
      return res.json();
    }).then((user) => {
      if (!user) return;
      const pill = document.getElementById('account-pill');
      pill.textContent = user.name || user.email;
      pill.style.display = 'inline-flex';
    }).catch(() => {
      window.location.href = 'login.html';
    });
  }
})();