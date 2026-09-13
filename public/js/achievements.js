(function () {
  const container = document.getElementById('achievement-groups');

  function groupByMonth(items) {
    return items.reduce((accumulator, item) => {
      const date = new Date(item.completedAt || item.dueDate);
      const key = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push(item);
      return accumulator;
    }, {});
  }

  async function render() {
    let sessions = [];
    let deadlines = [];
    try {
      const [sessionsResponse, deadlinesResponse] = await Promise.all([
        apiFetch('/api/sessions'),
        apiFetch('/api/deadlines')
      ]);
      if (sessionsResponse.ok) sessions = await sessionsResponse.json();
      if (deadlinesResponse.ok) deadlines = (await deadlinesResponse.json()).filter((deadline) => deadline.isCompleted);
    } catch (error) {
      container.innerHTML = '<div class="deadline-item">Could not load achievements. Please try again.</div>';
      return;
    }

    const combined = [
      ...sessions.filter((session) => session.completed).map((session) => ({ ...session, kind: 'session', completedAt: session.date })),
      ...deadlines.map((deadline) => ({ ...deadline, kind: 'deadline' }))
    ].sort((a, b) => new Date(b.completedAt || b.dueDate) - new Date(a.completedAt || a.dueDate));

    const groups = groupByMonth(combined);
    const entries = Object.entries(groups);

    if (!entries.length) {
      container.innerHTML = '<div class="deadline-item">No achievements yet. Start a session or finish a deadline.</div>';
      return;
    }

    container.innerHTML = entries
      .map(([month, items]) => `
        <section class="achievement-group">
          <h3>${month}</h3>
          <div class="stack">
            ${items
              .map((item) => `
                <div class="session-item">
                  <strong>${item.task || item.title}</strong>
                  <div class="muted">${item.kind === 'session' ? 'Focus session completed' : 'Deadline finished'} · ${new Date(item.completedAt || item.dueDate).toLocaleDateString()}</div>
                </div>
              `)
              .join('')}
          </div>
        </section>
      `)
      .join('');
  }

  document.addEventListener('DOMContentLoaded', render);
})();
