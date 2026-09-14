(function () {
  try {
    const savedTheme = localStorage.getItem('renounce_theme');
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = savedTheme || preferredTheme;
  } catch (_) {
    // Keep the stylesheet's default theme if storage is unavailable.
  }
})();
