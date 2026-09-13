(function () {
  const goals = { longTerm: document.getElementById('goal-long-term'), weekly: document.getElementById('goal-weekly'), daily: document.getElementById('goal-daily') };
  const countdown = document.getElementById('timer-countdown'), status = document.getElementById('timer-status'), label = document.getElementById('phase-label'), ring = document.getElementById('pomodoro-ring');
  const startButton = document.getElementById('start-btn'), pauseButton = document.getElementById('pause-btn'), breakButton = document.getElementById('break-btn'), skipButton = document.getElementById('skip-btn');
  const hours = document.getElementById('work-hours'), minutes = document.getElementById('work-minutes'), breakEvery = document.getElementById('work-break-every'), breakLength = document.getElementById('work-break-length');
  const circleLength = 2 * Math.PI * 52;
  ring.style.strokeDasharray = circleLength;
  let timerId = null, running = false, phase = 'focus', remaining = 25 * 60, focusRemaining = remaining, totalFocus = remaining, breakSeconds = 5 * 60, breakInterval = 0, nextBreak = 0;
  const value = (input) => Math.max(0, Number(input.value) || 0);
  const configuredFocus = () => (value(hours) * 60 + value(minutes)) * 60;
  function format(seconds) { const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60; return h ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }
  function display(message) {
    countdown.textContent = format(remaining); label.textContent = phase === 'focus' ? 'Focus' : 'Break';
    if (message) status.textContent = message;
    const progress = totalFocus ? 1 - focusRemaining / totalFocus : 0;
    ring.style.strokeDashoffset = circleLength * (1 - progress);
  }
  function stop() { clearInterval(timerId); timerId = null; running = false; }
  async function postSession() {
    try { await apiFetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: goals.daily.value.trim() || 'Focus session', minutes: totalFocus / 60, completed: true }) }); } catch (_) { /* session logging should not interrupt the timer */ }
  }
  function beginBreak(manual) {
    if (!breakSeconds) { display('Set a break length before taking a break.'); return; }
    phase = 'break'; remaining = breakSeconds; display(manual ? 'Break started. Your focus time is paused.' : 'Time for a scheduled break.');
  }
  function completeFocus() { stop(); focusRemaining = 0; remaining = 0; display('Focus session complete.'); postSession(); }
  function tick() {
    remaining -= 1;
    if (phase === 'focus') {
      focusRemaining = remaining;
      if (focusRemaining <= 0) return completeFocus();
      if (breakInterval && totalFocus - focusRemaining >= nextBreak) { nextBreak += breakInterval; beginBreak(false); return; }
    } else if (remaining <= 0) { phase = 'focus'; remaining = focusRemaining; display('Break complete. Back to focus.'); return; }
    display();
  }
  function start() {
    if (running) return;
    if (!remaining || focusRemaining <= 0) {
      totalFocus = configuredFocus();
      if (!totalFocus) return display('Choose a duration greater than zero.');
      focusRemaining = totalFocus; remaining = totalFocus; breakSeconds = value(breakLength) * 60; breakInterval = value(breakEvery) * 60; nextBreak = breakInterval; phase = 'focus';
    }
    running = true; display(phase === 'break' ? 'Taking a break.' : 'Working steadily.'); timerId = setInterval(tick, 1000);
  }
  function resetFromControls() { if (!running && phase === 'focus') { totalFocus = configuredFocus(); if (totalFocus) { remaining = totalFocus; focusRemaining = totalFocus; display('Ready to begin.'); } } }
  async function saveGoal(key) { try { await apiFetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: goals[key].value.trim() }) }); } catch (_) { /* keep editing available offline */ } }
  Object.entries(goals).forEach(([key, input]) => { input.addEventListener('change', () => saveGoal(key)); input.addEventListener('blur', () => saveGoal(key)); });
  [hours, minutes].forEach((input) => input.addEventListener('change', resetFromControls));
  startButton.addEventListener('click', start);
  pauseButton.addEventListener('click', () => { if (running) { stop(); display(phase === 'break' ? 'Break paused.' : 'Paused.'); } });
  breakButton.addEventListener('click', () => { if (phase === 'focus' && focusRemaining > 0) beginBreak(true); });
  skipButton.addEventListener('click', () => { if (phase === 'break') { phase = 'focus'; remaining = focusRemaining; display('Break skipped.'); } else completeFocus(); });
  document.addEventListener('DOMContentLoaded', async () => {
    try { const response = await apiFetch('/api/goals'); if (response.ok) { const loaded = await response.json(); Object.entries(goals).forEach(([key, input]) => { input.value = loaded[key] || ''; }); } } catch (_) { /* no saved goals */ }
    display('Ready to begin.');
  });
})();
