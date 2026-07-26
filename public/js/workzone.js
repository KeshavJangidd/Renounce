(function () {
  const goals = {
    longTerm: document.getElementById('goal-long-term'),
    weekly: document.getElementById('goal-weekly'),
    daily: document.getElementById('goal-daily')
  };

  const timerCountdown = document.getElementById('timer-countdown');
  const timerStatus = document.getElementById('timer-status');
  const phaseLabel = document.getElementById('phase-label');
  const ring = document.getElementById('pomodoro-ring');
  const startButton = document.getElementById('start-btn');
  const pauseButton = document.getElementById('pause-btn');
  const skipButton = document.getElementById('skip-btn');

  const circleLength = 2 * Math.PI * 52;
  ring.style.strokeDasharray = circleLength;
  ring.style.strokeDashoffset = circleLength;

  const durations = {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60
  };

  let currentPhase = 'work';
  let remainingSeconds = durations.work;
  let totalSeconds = durations.work;
  let timerId = null;
  let isRunning = false;
  let workSessionsCompleted = 0;

  function formatTime(seconds) {
    const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${minutes}:${secs}`;
  }

  function updateRing() {
    const ratio = remainingSeconds / totalSeconds;
    const offset = circleLength * (1 - ratio);
    ring.style.strokeDashoffset = offset;
  }

  function updateDisplay() {
    timerCountdown.textContent = formatTime(remainingSeconds);
    phaseLabel.textContent = currentPhase === 'work' ? 'Work' : 'Break';
    timerStatus.textContent = currentPhase === 'work'
      ? 'Deep work mode'
      : 'Recovery mode';
    updateRing();
  }

  function playAlert() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = currentPhase === 'work' ? 880 : 660;
    oscillator.connect(gain);
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.15, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
    context.close();
  }

  async function saveGoal(key) {
    const payload = {};
    payload[key] = goals[key].value.trim();
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error('Failed to save goals');
      }
    } catch (error) {
      console.warn('Could not save goal', error);
      // TODO: Replace this localStorage-style save with a backend persistence hook when available.
    }
  }

  function attachGoalListeners() {
    Object.entries(goals).forEach(([key, input]) => {
      input.addEventListener('change', () => saveGoal(key));
      input.addEventListener('blur', () => saveGoal(key));
    });
  }

  async function loadGoals() {
    try {
      const response = await fetch('/api/goals');
      if (!response.ok) {
        throw new Error('Failed to load goals');
      }
      const loadedGoals = await response.json();
      Object.entries(goals).forEach(([key, input]) => {
        input.value = loadedGoals[key] || '';
      });
    } catch (error) {
      console.warn('Could not load goals', error);
    }
  }

  async function postSession() {
    const taskValue = goals.daily.value.trim() || 'Pomodoro session';
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: taskValue,
          minutes: 25,
          completed: true
        })
      });
      if (!response.ok) {
        throw new Error('Failed to save session');
      }
    } catch (error) {
      console.warn('Could not save session log', error);
      // TODO: Replace this local persistence with the existing session log integration once the backend is ready.
    }
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    isRunning = false;
  }

  function advancePhase() {
    if (currentPhase === 'work') {
      workSessionsCompleted += 1;
      postSession();
      if (workSessionsCompleted % 4 === 0) {
        currentPhase = 'longBreak';
        remainingSeconds = durations.longBreak;
        totalSeconds = durations.longBreak;
      } else {
        currentPhase = 'shortBreak';
        remainingSeconds = durations.shortBreak;
        totalSeconds = durations.shortBreak;
      }
    } else {
      currentPhase = 'work';
      remainingSeconds = durations.work;
      totalSeconds = durations.work;
    }

    updateDisplay();
    playAlert();
  }

  function startTimer() {
    if (isRunning) {
      return;
    }
    isRunning = true;
    timerStatus.textContent = currentPhase === 'work' ? 'Working steadily' : 'Taking a breather';
    timerId = setInterval(() => {
      remainingSeconds -= 1;
      updateDisplay();
      if (remainingSeconds <= 0) {
        stopTimer();
        advancePhase();
      }
    }, 1000);
  }

  function pauseTimer() {
    stopTimer();
    timerStatus.textContent = 'Paused';
  }

  function skipTimer() {
    stopTimer();
    advancePhase();
  }

  startButton.addEventListener('click', startTimer);
  pauseButton.addEventListener('click', pauseTimer);
  skipButton.addEventListener('click', skipTimer);

  document.addEventListener('DOMContentLoaded', async () => {
    attachGoalListeners();
    await loadGoals();
    updateDisplay();
  });
})();
