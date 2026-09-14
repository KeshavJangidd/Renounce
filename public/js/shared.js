(function () {
  const themeStorageKey = 'renounce_theme';
  const savedTheme = localStorage.getItem(themeStorageKey);
  const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const activeTheme = savedTheme || preferredTheme;
  document.documentElement.dataset.theme = activeTheme;
  const isPort3000 = window.location.port === '3000';
  const isFileProto = window.location.protocol === 'file:';
  const apiBaseUrl = window.RENOUNCE_API_URL || (
    isPort3000 || isFileProto ? 'http://localhost:3001' : ''
  );

  window.apiUrl = (endpoint) => `${apiBaseUrl}${endpoint}`;
  window.apiFetch = (endpoint, options = {}) => fetch(window.apiUrl(endpoint), {
    ...options,
    credentials: 'include'
  });

  const headerMarkup = `
    <header class="site-header">
      <a class="brand" href="/home">
        <img class="brand-mascot" src="images/renounce-avatar.png" alt="Renounce mascot" />
        <span>Renounce</span>
      </a>
      <div class="header-actions">
        <nav class="nav-links" aria-label="Primary navigation">
          <a href="/home">Home</a>
          <a href="/timer">Focus Timer</a>
          <a href="/deadlines">Deadlines</a>
          <a href="/journal">Daily Journal</a>
          <a href="/achievements">Achievements</a>
        </nav>
        <div class="auth-actions">
          <a class="nav-auth-btn" id="nav-auth-btn" href="/login">Log in / Sign up</a>
          <a class="account-pill" id="account-pill" href="/account" style="display:none;" aria-label="Open account details"></a>
        </div>
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

  const currentPath = window.location.pathname.split('/').pop() || 'home';
  const publicPages = ['login.html'];

  if (!publicPages.includes(currentPath)) {
    const root = document.body;
    root.insertAdjacentHTML('afterbegin', headerMarkup);
    root.insertAdjacentHTML('beforeend', footerMarkup);

    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href === window.location.pathname || (currentPath === 'index.html' && href === '/home')) {
        link.classList.add('active');
      }
    });

    // Warm the browser cache for the other pages so navigation does not wait
    // for the HTML request after the user clicks a tab.
    const prefetchPage = (href) => {
      if (href === window.location.pathname || document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;
      const hint = document.createElement('link');
      hint.rel = 'prefetch';
      hint.href = href;
      hint.as = 'document';
      document.head.appendChild(hint);
    };
    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      link.addEventListener('pointerenter', () => prefetchPage(href), { once: true });
      link.addEventListener('focus', () => prefetchPage(href), { once: true });
    });
    const schedulePrefetch = window.requestIdleCallback || ((callback) => setTimeout(callback, 250));
    schedulePrefetch(() => navLinks.forEach((link) => prefetchPage(link.getAttribute('href'))));

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

    const authBtn = document.getElementById('nav-auth-btn');
    const pill = document.getElementById('account-pill');

    function setLoggedInUI(nameOrEmail) {
      if (pill) {
        pill.textContent = nameOrEmail || 'Account';
        pill.style.display = 'inline-flex';
        if (currentPath === 'account.html') {
          pill.classList.add('active');
          pill.setAttribute('aria-current', 'page');
        }
      }
      if (authBtn) authBtn.style.display = 'none';
    }

    function setLoggedOutUI() {
      if (pill) pill.style.display = 'none';
      if (authBtn) authBtn.style.display = 'inline-flex';
      localStorage.removeItem('renounce_profile');
    }

    // Instant local cache population for account pill if previously logged in
    try {
      const cached = JSON.parse(localStorage.getItem('renounce_profile') || '{}');
      if (cached.name || cached.email) {
        setLoggedInUI(cached.name || cached.email);
      }
    } catch (_) {}

    // Check server auth state without forced redirects on Home page or refresh
    window.apiFetch('/api/auth/me').then((res) => {
      if (res.ok) {
        return res.json();
      }
      return null;
    }).then((user) => {
      if (user) {
        setLoggedInUI(user.name || user.email);
        try {
          const existing = JSON.parse(localStorage.getItem('renounce_profile') || '{}');
          localStorage.setItem('renounce_profile', JSON.stringify({
            ...existing,
            name: user.name,
            email: user.email,
            age: user.age,
            purpose: user.purpose,
            phone: user.phone
          }));
        } catch (_) {}
      } else {
        // Not logged in: show slightly visible Log in / Sign up button
        setLoggedOutUI();
      }
    }).catch(() => {
      // Offline / server waking up: keep existing cached state, do not redirect
    });
  }
})();
