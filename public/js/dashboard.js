(function () {
  async function fetchSessions() {
    try {
      const res = await apiFetch('/api/sessions');
      return res.ok ? await res.json() : [];
    } catch (_) {
      return [];
    }
  }

  async function fetchDeadlines() {
    try {
      const res = await apiFetch('/api/deadlines');
      return res.ok ? await res.json() : [];
    } catch (_) {
      return [];
    }
  }

  async function fetchMood() {
    try {
      const res = await apiFetch('/api/mood');
      return res.ok ? await res.json() : null;
    } catch (_) {
      return null;
    }
  }

  async function saveMood(mood) {
    try {
      await apiFetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood })
      });
    } catch (_) {}
  }

  function getStreak(sessions) {
    const completedDates = new Set(
      sessions
        .filter((session) => session.completed)
        .map((session) => session.date?.slice(0, 10))
        .filter(Boolean)
    );

    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 30; i += 1) {
      const candidate = new Date(cursor);
      candidate.setDate(cursor.getDate() - i);
      const key = candidate.toISOString().slice(0, 10);
      if (completedDates.has(key)) {
        streak += 1;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  }

  function renderSuggestedTask(deadlines) {
    const taskEl = document.getElementById('suggested-task');
    const metaEl = document.getElementById('suggested-task-meta');
    if (!taskEl || !metaEl) return;

    const nextDeadline = deadlines
      .filter((deadline) => !deadline.isCompleted)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

    if (nextDeadline) {
      taskEl.textContent = `Prepare ${nextDeadline.title}`;
      metaEl.textContent = `Due ${new Date(nextDeadline.dueDate).toLocaleDateString()} · ${nextDeadline.category}`;
    } else {
      taskEl.textContent = 'Finish a 25-minute deep work block';
      metaEl.textContent = 'Use the timer to protect your next study window.';
    }
  }

  function renderDeadlines(deadlines) {
    const list = document.getElementById('upcoming-deadlines');
    if (!list) return;

    const upcoming = deadlines
      .filter((deadline) => !deadline.isCompleted)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 3);

    if (!upcoming.length) {
      list.innerHTML = '<li>No upcoming deadlines yet.</li>';
      return;
    }

    list.innerHTML = upcoming
      .map((deadline) => `<li><strong>${escapeHtml(deadline.title)}</strong><br />${new Date(deadline.dueDate).toLocaleDateString()} · ${escapeHtml(deadline.category)}</li>`)
      .join('');
  }

  function renderMood(mood) {
    const status = document.getElementById('mood-status');
    if (mood && mood.value) {
      if (status) {
        status.textContent = `Saved mood: ${mood.value.charAt(0).toUpperCase() + mood.value.slice(1)}.`;
      }
      document.querySelectorAll('.mood-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-mood') === mood.value);
      });
    }
  }

  function renderRhythmMatrix(sessions) {
    const matrixEl = document.getElementById('rhythm-matrix');
    const summaryEl = document.getElementById('rhythm-summary');
    if (!matrixEl) return;

    const dateMinutes = {};
    sessions.forEach((s) => {
      if (s.date) {
        const d = s.date.slice(0, 10);
        dateMinutes[d] = (dateMinutes[d] || 0) + (Number(s.minutes) || 0);
      }
    });

    const now = new Date();
    const days = [];
    let activeDaysCount = 0;

    // Generate last 28 days (4 weeks)
    for (let i = 27; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const mins = dateMinutes[dateKey] || 0;
      if (mins > 0) activeDaysCount += 1;

      let level = 0;
      if (mins >= 60) level = 3;
      else if (mins >= 25) level = 2;
      else if (mins > 0) level = 1;

      const dateLabel = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      days.push({ mins, level, dateLabel });
    }

    if (summaryEl) {
      summaryEl.textContent = activeDaysCount > 0
        ? `${activeDaysCount} of the last 28 days had focused study blocks.`
        : 'Showing up for one intentional session builds lasting rhythm.';
    }

    matrixEl.innerHTML = days.map((day) => `
      <div class="rhythm-cell" data-level="${day.level}" title="${day.dateLabel}: ${day.mins ? day.mins + ' min focused' : 'No sessions'}"></div>
    `).join('');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function init() {
    const [sessions, deadlines, mood] = await Promise.all([
      fetchSessions(),
      fetchDeadlines(),
      fetchMood()
    ]);

    const streakEl = document.getElementById('streak-count');
    const statSessionsEl = document.getElementById('stat-sessions');
    const statStreakEl = document.getElementById('stat-streak');
    const statDeadlinesEl = document.getElementById('stat-deadlines');

    if (streakEl) streakEl.textContent = `${getStreak(sessions)} days streak`;
    if (statSessionsEl) statSessionsEl.textContent = sessions.length;
    if (statStreakEl) statStreakEl.textContent = getStreak(sessions);
    if (statDeadlinesEl) statDeadlinesEl.textContent = deadlines.length;

    renderSuggestedTask(deadlines);
    renderDeadlines(deadlines);
    renderMood(mood);
    renderRhythmMatrix(sessions);

    document.querySelectorAll('.mood-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const moodVal = button.getAttribute('data-mood');
        await saveMood(moodVal);
        document.querySelectorAll('.mood-btn').forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
        const status = document.getElementById('mood-status');
        if (status) {
          status.textContent = `Saved mood: ${moodVal.charAt(0).toUpperCase() + moodVal.slice(1)}.`;
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

