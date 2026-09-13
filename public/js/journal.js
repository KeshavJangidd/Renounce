(async function () {
  const todayMinutesEl = document.getElementById('journal-today-minutes');
  const todaySessionsEl = document.getElementById('journal-today-sessions');
  const totalHoursEl = document.getElementById('journal-total-hours');
  const timelineCountEl = document.getElementById('timeline-count');
  const sessionTimelineEl = document.getElementById('session-timeline');
  const dateBadge = document.getElementById('journal-date-badge');

  const winsInput = document.getElementById('reflection-wins');
  const challengesInput = document.getElementById('reflection-challenges');
  const tomorrowInput = document.getElementById('reflection-tomorrow');
  const journalForm = document.getElementById('journal-form');
  const journalSaveStatus = document.getElementById('journal-save-status');

  const now = new Date();
  const todayKey = `renounce_journal_${now.toISOString().slice(0, 10)}`;
  if (dateBadge) {
    dateBadge.textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function applyReflection(reflection) {
    if (!reflection) return;
    if (winsInput) winsInput.value = reflection.wins || '';
    if (challengesInput) challengesInput.value = reflection.challenges || '';
    if (tomorrowInput) tomorrowInput.value = reflection.tomorrow || '';
  }

  try {
    const cached = JSON.parse(localStorage.getItem(todayKey) || '{}');
    applyReflection(cached);
  } catch (_) {}

  try {
    const response = await apiFetch(`/api/journal/${todayKey.replace('renounce_journal_', '')}`);
    if (response.ok) applyReflection(await response.json());
  } catch (_) {}

  if (journalForm) {
    journalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const reflection = {
        date: todayKey.replace('renounce_journal_', ''),
        wins: winsInput ? winsInput.value.trim() : '',
        challenges: challengesInput ? challengesInput.value.trim() : '',
        tomorrow: tomorrowInput ? tomorrowInput.value.trim() : ''
      };
      localStorage.setItem(todayKey, JSON.stringify(reflection));
      try {
        const response = await apiFetch(`/api/journal/${reflection.date}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reflection)
        });
        if (journalSaveStatus) {
          journalSaveStatus.textContent = response.ok ? 'Reflection saved.' : 'Saved on this device; server sync failed.';
        }
      } catch (_) {
        if (journalSaveStatus) {
          journalSaveStatus.textContent = 'Saved on this device; server sync failed.';
        }
      }
      setTimeout(() => {
        if (journalSaveStatus && journalSaveStatus.textContent) {
          journalSaveStatus.textContent = '';
        }
      }, 3000);
    });
  }

  // Fetch Sessions
  try {
    const res = await apiFetch('/api/sessions');
    if (!res.ok) {
      if (sessionTimelineEl) {
        sessionTimelineEl.innerHTML = '<p class="muted" style="padding: 1rem;">Sign in to view session history.</p>';
      }
      return;
    }
    const sessions = await res.json();
    if (timelineCountEl) {
      timelineCountEl.textContent = `${sessions.length} total`;
    }

    const todayStr = now.toISOString().slice(0, 10);
    let todayMins = 0;
    let todayCount = 0;
    let totalMins = 0;

    sessions.forEach((s) => {
      const mins = Number(s.minutes) || 0;
      totalMins += mins;
      const sDate = (s.date || '').slice(0, 10);
      if (sDate === todayStr && s.completed) {
        todayMins += mins;
        todayCount += 1;
      }
    });

    if (todayMinutesEl) todayMinutesEl.textContent = `${todayMins}m`;
    if (todaySessionsEl) todaySessionsEl.textContent = todayCount;
    if (totalHoursEl) totalHoursEl.textContent = `${(totalMins / 60).toFixed(1)}h`;

    if (sessionTimelineEl) {
      if (!sessions.length) {
        sessionTimelineEl.innerHTML = `
          <div class="inner-card" style="padding: 2rem; text-align: center;">
            <p style="margin: 0 0 0.5rem; font-size: 1rem; color: var(--ink);">No sessions logged yet.</p>
            <p class="muted" style="margin: 0 0 1rem; font-size: 0.85rem;">Start your first deep work block to watch your tree grow and log your progress.</p>
            <a href="timer.html" class="btn btn-secondary">Open Focus Timer →</a>
          </div>
        `;
        return;
      }

      // Sort descending (most recent first)
      const sorted = [...sessions].reverse();
      sessionTimelineEl.innerHTML = sorted.map((s) => {
        const mins = Number(s.minutes) || 0;
        const dateObj = new Date(s.date || Date.now());
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateFmt = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const isCompleted = s.completed !== false;

        return `
          <div class="deadline-item" style="border-radius: var(--radius-sm);">
            <div>
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <span style="font-size: 1rem;">${isCompleted ? '🌱' : '⏸'}</span>
                <strong style="font-size: 0.92rem; color: var(--ink);">${escapeHtml(s.task || 'Focus block')}</strong>
              </div>
              <p class="muted" style="margin: 0.25rem 0 0 1.5rem; font-size: 0.78rem;">
                ${dateFmt} at ${timeStr} · ${mins} minutes
                ${s.pledge ? ` · <span style="color: var(--accent); font-weight: 500;">🛡️ Renounced: ${escapeHtml(s.pledge)}</span>` : ''}
              </p>
            </div>
            <span class="badge-subtle" style="${isCompleted ? 'color: var(--accent);' : ''}">
              ${isCompleted ? 'Completed' : 'Interrupted'}
            </span>
          </div>
        `;
      }).join('');
    }

  } catch (err) {
    if (sessionTimelineEl) {
      sessionTimelineEl.innerHTML = '<p class="muted" style="padding: 1rem;">Could not load sessions.</p>';
    }
  }

  // Render Today's Parked Thoughts
  const journalParkingList = document.getElementById('journal-parking-list');
  const parkedBadge = document.getElementById('parked-journal-badge');
  let parkedThoughts = [];
  try {
    parkedThoughts = JSON.parse(localStorage.getItem('renounce_parking_lot') || '[]');
  } catch (_) {
    parkedThoughts = [];
  }

  try {
    const response = await apiFetch('/api/parking-lot');
    if (response.ok) parkedThoughts = await response.json();
  } catch (_) {}

  if (parkedBadge) {
    parkedBadge.textContent = `${parkedThoughts.length} parked`;
  }

  if (journalParkingList) {
    if (!parkedThoughts.length) {
      journalParkingList.innerHTML = `
        <div class="inner-card" style="padding: 1.1rem; text-align: center;">
          <p class="muted" style="margin: 0; font-size: 0.82rem;">No impulses parked today. Full mental presence maintained.</p>
        </div>
      `;
    } else {
      journalParkingList.innerHTML = parkedThoughts.map((item) => `
        <div class="deadline-item" style="padding: 0.55rem 0.75rem; border-radius: var(--radius-sm);">
          <div>
            <div style="font-size: 0.88rem; color: var(--ink);">${escapeHtml(item.thought)}</div>
            <p class="muted" style="margin: 0.15rem 0 0; font-size: 0.74rem;">
              ${item.time || 'Today'} · During: ${escapeHtml(item.task || 'Focus block')}
            </p>
          </div>
          <span class="badge-subtle" style="font-size: 0.7rem; color: var(--ink-faint);">Resisted ✓</span>
        </div>
      `).join('');
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();

