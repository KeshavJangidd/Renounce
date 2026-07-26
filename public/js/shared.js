(function () {
  const headerMarkup = `
    <header class="site-header">
      <a class="brand" href="index.html">Renounce</a>
      <nav class="nav-links" aria-label="Primary navigation">
        <a href="index.html">Dashboard</a>
        <a href="timer.html">Timer</a>
        <a href="deadlines.html">Deadlines</a>
        <a href="achievements.html">Achievements</a>
        <a href="resume.html">Resume</a>
        <a href="workzone.html">Work Zone</a>
        <a href="talk.html">Talk to Kavir</a>
      </nav>
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

  const root = document.body;
  root.insertAdjacentHTML('afterbegin', headerMarkup);
  root.insertAdjacentHTML('beforeend', footerMarkup);

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPath) {
      link.classList.add('active');
    }
  });
})();
