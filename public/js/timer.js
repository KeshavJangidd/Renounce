(function () {
  const form = document.getElementById('timer-form');
  const taskInput = document.getElementById('task-input');
  const durationSelect = document.getElementById('duration-select');
  const timeDisplay = document.getElementById('time-display');
  const ringProgress = document.getElementById('ring-progress');
  const statusText = document.getElementById('status-text');
  const sessionCount = document.getElementById('session-count');
  const pauseButton = document.getElementById('pause-btn');
  const abandonButton = document.getElementById('abandon-btn');
  const tree = document.getElementById('tree');

  const circleLength = 2 * Math.PI * 52;
  ringProgress.style.strokeDasharray = circleLength;
  ringProgress.style.strokeDashoffset = circleLength;

  let timerId = null;
  let remainingSeconds = 0;
  let totalSeconds = 0;
  let isRunning = false;
  let currentTask = '';

  async function fetchSessions() {
    const res = await apiFetch('/api/sessions');
    return res.json();
  }

  async function saveSession(type) {
    const payload = {
      task: currentTask,
      minutes: totalSeconds / 60,
      completed: type === 'completed'
    };
    await apiFetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const sessions = await fetchSessions();
    sessionCount.textContent = `Sessions logged: ${sessions.length}`;
  }

  function formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function updateDisplay() {
    timeDisplay.textContent = formatTime(remainingSeconds);
    const progressRatio = 1 - remainingSeconds / totalSeconds;
    const offset = circleLength * (1 - progressRatio);
    ringProgress.style.strokeDashoffset = offset;
    const growth = 0.8 + Math.min(0.8, progressRatio * 1.1);
    tree.style.transform = `scale(${growth})`;
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
      isRunning = false;
    }
  }

  function finishSession() {
    stopTimer();
    saveSession('completed');
    statusText.textContent = `Completed ${currentTask || 'your session'}.`;
    remainingSeconds = 0;
    updateDisplay();
  }

  function abandonSession() {
    stopTimer();
    saveSession('abandoned');
    statusText.textContent = `Abandoned ${currentTask || 'your session'}.`;
    remainingSeconds = 0;
    updateDisplay();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    stopTimer();
    currentTask = taskInput.value.trim() || 'A calm study block';
    totalSeconds = Number(durationSelect.value) * 60;
    remainingSeconds = totalSeconds;
    updateDisplay();
    isRunning = true;
    statusText.textContent = `Starting: ${currentTask}`;

    timerId = setInterval(() => {
      remainingSeconds -= 1;
      updateDisplay();
      if (remainingSeconds <= 0) {
        finishSession();
      }
    }, 1000);
  });

  pauseButton.addEventListener('click', () => {
    if (!isRunning) return;
    stopTimer();
    statusText.textContent = `Paused ${currentTask}`;
  });

  abandonButton.addEventListener('click', () => {
    if (!currentTask && !remainingSeconds) return;
    abandonSession();
  });

  document.addEventListener('DOMContentLoaded', async () => {
    const sessions = await fetchSessions();
    sessionCount.textContent = `Sessions logged: ${sessions.length}`;
    updateDisplay();
  });
})();
