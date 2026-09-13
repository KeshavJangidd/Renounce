(function () {
  // Elements
  const form = document.getElementById('timer-form');
  const taskInput = document.getElementById('task-input');
  const durationHours = document.getElementById('duration-hours');
  const durationMinutes = document.getElementById('duration-minutes');
  const breakEvery = document.getElementById('break-every');
  const breakLength = document.getElementById('break-length');
  const timeDisplay = document.getElementById('time-display');
  const ringProgress = document.getElementById('ring-progress');
  const statusText = document.getElementById('status-text');
  const sessionCount = document.getElementById('session-count');
  const pauseButton = document.getElementById('pause-btn');
  const breakButton = document.getElementById('break-btn');
  const abandonButton = document.getElementById('abandon-btn');
  const tree = document.getElementById('tree');

  // Goals Elements
  const goalDaily = document.getElementById('goal-daily');
  const goalWeekly = document.getElementById('goal-weekly');
  const goalLongTerm = document.getElementById('goal-long-term');
  const toggleGoalsBtn = document.getElementById('toggle-goals-btn');
  const toggleGoalsText = document.getElementById('toggle-goals-text');
  const expandedGoals = document.getElementById('expanded-goals');
  const goalsSaveStatus = document.getElementById('goals-save-status');
  const useTodayGoalBtn = document.getElementById('use-today-goal-btn');

  // Zen & Chime Elements
  const enterZenBtn = document.getElementById('enter-zen-btn');
  const exitZenBtn = document.getElementById('exit-zen-btn');
  const zenPauseBtn = document.getElementById('zen-pause-btn');
  const zenTaskLabel = document.getElementById('zen-task-label');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const soundToggleIcon = document.getElementById('sound-toggle-icon');
  const soundToggleLabel = document.getElementById('sound-toggle-label');

  // The Pledge Elements
  const pledgePillRow = document.getElementById('pledge-pill-row');
  const customPledgeInput = document.getElementById('custom-pledge-input');
  const pledgeAnchor = document.getElementById('pledge-anchor');
  const pledgeAnchorText = document.getElementById('pledge-anchor-text');
  const deskClockPledgeText = document.getElementById('desk-clock-pledge-text');

  // Ambient Sound Elements
  const ambientSoundGroup = document.getElementById('ambient-sound-group');
  const ambientVolumeSlider = document.getElementById('ambient-volume');
  const ambientVolIcon = document.getElementById('ambient-vol-icon');

  // Distraction Parking Lot Elements
  const parkingBackdrop = document.getElementById('parking-lot-backdrop');
  const openParkingBtn = document.getElementById('open-parking-btn');
  const closeParkingBtn = document.getElementById('close-parking-btn');
  const returnFocusBtn = document.getElementById('return-focus-btn');
  const parkingForm = document.getElementById('parking-form');
  const parkingInput = document.getElementById('parking-input');
  const parkingFeedback = document.getElementById('parking-feedback');
  const parkingList = document.getElementById('parking-list');
  const clearParkingBtn = document.getElementById('clear-parking-btn');
  const parkingBadge = document.getElementById('parking-badge');
  const zenParkBtn = document.getElementById('zen-park-btn');
  const deskClockParkBtn = document.getElementById('desk-clock-park-btn');

  // Desk Clock Elements
  const enterDeskClockBtn = document.getElementById('enter-desk-clock-btn');
  const exitDeskClockBtn = document.getElementById('exit-desk-clock-btn');
  const deskClockPauseBtn = document.getElementById('desk-clock-pause-btn');
  const deskClockDimBtn = document.getElementById('desk-clock-dim-btn');
  const deskClockDimLabel = document.getElementById('desk-clock-dim-label');
  const deskClockSceneBtn = document.getElementById('desk-clock-scene-btn');
  const deskClockSceneLabel = document.getElementById('desk-clock-scene-label');
  const deskClockTimeToggleBtn = document.getElementById('desk-clock-time-toggle-btn');
  const deskClockTime = document.getElementById('desk-clock-time');
  const deskClockRealtime = document.getElementById('desk-clock-realtime');
  const deskClockTask = document.getElementById('desk-clock-task');
  const deskClockTree = document.getElementById('desk-clock-tree');

  const circleLength = 2 * Math.PI * 52;
  ringProgress.style.strokeDasharray = circleLength;

  let timerId = null, remainingSeconds = 0, focusRemaining = 0, totalFocusSeconds = 0;
  let breakSeconds = 0, breakIntervalSeconds = 0, nextBreakAt = 0, isRunning = false;
  let phase = 'focus', currentTask = '';
  let isZenMode = false;
  let isDeskClockMode = false;
  let deskClockShowTimer = true;
  let currentDimmerIdx = 0;
  const dimmerModes = ['normal', 'night', 'candle'];
  let isDeskSceneActive = localStorage.getItem('renounce_desk_scene_active') === 'true';
  const originalTitle = document.title || 'Renounce — Focus Timer';

  // Helper
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ==========================================================================
  // DYNAMIC FAVICON & TAB TITLE
  // ==========================================================================
  const faviconCanvas = document.createElement('canvas');
  faviconCanvas.width = 32;
  faviconCanvas.height = 32;
  const favCtx = faviconCanvas.getContext('2d');
  let faviconLink = document.querySelector("link[rel*='icon']");
  if (!faviconLink) {
    faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    document.head.appendChild(faviconLink);
  }
  const originalFaviconHref = faviconLink.href;

  function updateDynamicFavicon(progress) {
    if (!favCtx) return;
    favCtx.clearRect(0, 0, 32, 32);

    // Outer ring track
    favCtx.beginPath();
    favCtx.arc(16, 16, 12, 0, Math.PI * 2);
    favCtx.fillStyle = '#f5f2eb';
    favCtx.fill();
    favCtx.lineWidth = 3;
    favCtx.strokeStyle = '#d8d3c5';
    favCtx.stroke();

    // Progress arc
    if (progress > 0) {
      favCtx.beginPath();
      favCtx.arc(16, 16, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress));
      favCtx.strokeStyle = phase === 'focus' ? '#335340' : '#87b593';
      favCtx.lineWidth = 3.8;
      favCtx.lineCap = 'round';
      favCtx.stroke();
    }

    // Center seedling dot
    favCtx.beginPath();
    favCtx.arc(16, 16, 3.5, 0, Math.PI * 2);
    favCtx.fillStyle = '#335340';
    favCtx.fill();

    faviconLink.href = faviconCanvas.toDataURL('image/png');
  }

  function restoreOriginalFavicon() {
    if (originalFaviconHref) {
      faviconLink.href = originalFaviconHref;
    }
  }

  // ==========================================================================
  // CHIME (Tibetan Singing Bowl Synthesis)
  // ==========================================================================
  let chimeEnabled = localStorage.getItem('renounce_chime_enabled') !== 'false';
  function updateChimeUI() {
    if (soundToggleIcon && soundToggleLabel) {
      soundToggleIcon.textContent = chimeEnabled ? '🔔' : '🔕';
      soundToggleLabel.textContent = chimeEnabled ? 'Chime On' : 'Chime Off';
    }
  }
  updateChimeUI();

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      chimeEnabled = !chimeEnabled;
      localStorage.setItem('renounce_chime_enabled', String(chimeEnabled));
      updateChimeUI();
      if (chimeEnabled) {
        playCalmBell();
      }
    });
  }

  function playCalmBell() {
    if (!chimeEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const frequencies = [432, 864, 1296];
      const gains = [0.28, 0.12, 0.05];

      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.993, ctx.currentTime + 3.2);

        gain.gain.setValueAtTime(gains[idx], ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 3.5);
      });
    } catch (_) {}
  }

  // ==========================================================================
  // PROCEDURAL AMBIENT SOUND ENGINE (Web Audio API - Zero-Lag, 100% Offline)
  // ==========================================================================
  class ProceduralAmbientSound {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.currentSound = localStorage.getItem('renounce_ambient_sound') || 'off';
      this.volume = parseFloat(localStorage.getItem('renounce_ambient_volume') || '0.5');
      this.sourceNodes = [];
      this.rainInterval = null;
      this.isPlaying = false;
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    }

    setVolume(vol) {
      this.volume = Math.max(0, Math.min(1, vol));
      localStorage.setItem('renounce_ambient_volume', String(this.volume));
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.05);
      }
      if (ambientVolIcon) {
        ambientVolIcon.textContent = this.volume === 0 ? '🔇' : this.volume < 0.5 ? '🔉' : '🔊';
      }
    }

    stopCurrent() {
      if (this.rainInterval) {
        clearInterval(this.rainInterval);
        this.rainInterval = null;
      }
      this.sourceNodes.forEach((n) => {
        try {
          if (n.stop) n.stop();
          if (n.disconnect) n.disconnect();
        } catch (_) {}
      });
      this.sourceNodes = [];
      this.isPlaying = false;
    }

    // 1. Soft Brown Noise (ADHD & Deep Reading)
    startBrownNoise() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      this.stopCurrent();

      const bufferSize = ctx.sampleRate * 6;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          lastOut = (lastOut + 0.025 * white) / 1.025;
          data[i] = lastOut * 3.5;
        }
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;

      // 2-pole lowpass filter for velvety deep warmth (360Hz)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(360, ctx.currentTime);
      filter.Q.setValueAtTime(0.7, ctx.currentTime);

      src.connect(filter);
      filter.connect(this.masterGain);
      src.start();

      this.sourceNodes.push(src, filter);
      this.isPlaying = true;
    }

    // 2. Gentle Rain on Canvas Tent
    startRain() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      this.stopCurrent();

      // Steady rain rush
      const bufferSize = ctx.sampleRate * 5;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.12;
        }
      }

      const rainSrc = ctx.createBufferSource();
      rainSrc.buffer = buffer;
      rainSrc.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.setValueAtTime(1350, ctx.currentTime);
      rainFilter.Q.setValueAtTime(0.65, ctx.currentTime);

      // Gentle swell LFO
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.12, ctx.currentTime);
      lfoGain.gain.setValueAtTime(220, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(rainFilter.frequency);
      lfo.start();

      rainSrc.connect(rainFilter);
      rainFilter.connect(this.masterGain);
      rainSrc.start();

      this.sourceNodes.push(rainSrc, rainFilter, lfo, lfoGain);

      // Micro-droplet impulses
      this.rainInterval = setInterval(() => {
        if (!this.isPlaying || ctx.state !== 'running') return;
        try {
          const dropOsc = ctx.createOscillator();
          const dropGain = ctx.createGain();
          const dropFilter = ctx.createBiquadFilter();

          const dropFreq = 2200 + Math.random() * 1600;
          dropOsc.type = 'triangle';
          dropOsc.frequency.setValueAtTime(dropFreq, ctx.currentTime);

          dropFilter.type = 'bandpass';
          dropFilter.frequency.setValueAtTime(dropFreq, ctx.currentTime);
          dropFilter.Q.setValueAtTime(5, ctx.currentTime);

          const dropVol = 0.02 + Math.random() * 0.035;
          dropGain.gain.setValueAtTime(dropVol, ctx.currentTime);
          dropGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

          dropOsc.connect(dropFilter);
          dropFilter.connect(dropGain);
          dropGain.connect(this.masterGain);

          dropOsc.start();
          dropOsc.stop(ctx.currentTime + 0.05);
        } catch (_) {}
      }, 95);

      this.isPlaying = true;
    }

    // 3. Forest Wind & Babbling Stream
    startForest() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      this.stopCurrent();

      // Forest wind
      const bufferSize = ctx.sampleRate * 6;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.22;
        }
      }

      const windSrc = ctx.createBufferSource();
      windSrc.buffer = buffer;
      windSrc.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(320, ctx.currentTime);
      windFilter.Q.setValueAtTime(1.8, ctx.currentTime);

      const windLfo = ctx.createOscillator();
      const windLfoGain = ctx.createGain();
      windLfo.frequency.setValueAtTime(0.07, ctx.currentTime);
      windLfoGain.gain.setValueAtTime(180, ctx.currentTime);
      windLfo.connect(windLfoGain);
      windLfoGain.connect(windFilter.frequency);
      windLfo.start();

      windSrc.connect(windFilter);
      windFilter.connect(this.masterGain);
      windSrc.start();

      // Stream ripple
      const streamFilter = ctx.createBiquadFilter();
      streamFilter.type = 'bandpass';
      streamFilter.frequency.setValueAtTime(1150, ctx.currentTime);
      streamFilter.Q.setValueAtTime(3.2, ctx.currentTime);

      const streamLfo = ctx.createOscillator();
      const streamLfoGain = ctx.createGain();
      streamLfo.frequency.setValueAtTime(0.35, ctx.currentTime);
      streamLfoGain.gain.setValueAtTime(140, ctx.currentTime);
      streamLfo.connect(streamLfoGain);
      streamLfoGain.connect(streamFilter.frequency);
      streamLfo.start();

      windSrc.connect(streamFilter);
      streamFilter.connect(this.masterGain);

      this.sourceNodes.push(windSrc, windFilter, windLfo, windLfoGain, streamFilter, streamLfo, streamLfoGain);
      this.isPlaying = true;
    }

    // 4. Cozy Candle Ember & Soft Fireplace Crackle
    startCandle() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      this.stopCurrent();

      // Deep warm low air hum
      const bufferSize = ctx.sampleRate * 5;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < bufferSize; i++) {
          const w = Math.random() * 2 - 1;
          last = (last + 0.015 * w) / 1.015;
          data[i] = last * 2.2;
        }
      }

      const warmSrc = ctx.createBufferSource();
      warmSrc.buffer = buffer;
      warmSrc.loop = true;

      const warmFilter = ctx.createBiquadFilter();
      warmFilter.type = 'lowpass';
      warmFilter.frequency.setValueAtTime(240, ctx.currentTime);

      warmSrc.connect(warmFilter);
      warmFilter.connect(this.masterGain);
      warmSrc.start();
      this.sourceNodes.push(warmSrc, warmFilter);

      // Micro candle crackles (gentle irregular pops)
      this.rainInterval = setInterval(() => {
        if (!this.isPlaying || ctx.state !== 'running') return;
        if (Math.random() > 0.4) return;
        try {
          const crackleOsc = ctx.createOscillator();
          const crackleGain = ctx.createGain();
          const crackleFilter = ctx.createBiquadFilter();

          const freq = 900 + Math.random() * 1900;
          crackleOsc.type = 'sawtooth';
          crackleOsc.frequency.setValueAtTime(freq, ctx.currentTime);

          crackleFilter.type = 'bandpass';
          crackleFilter.frequency.setValueAtTime(freq, ctx.currentTime);
          crackleFilter.Q.setValueAtTime(8, ctx.currentTime);

          const vol = 0.015 + Math.random() * 0.025;
          crackleGain.gain.setValueAtTime(vol, ctx.currentTime);
          crackleGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);

          crackleOsc.connect(crackleFilter);
          crackleFilter.connect(crackleGain);
          crackleGain.connect(this.masterGain);

          crackleOsc.start();
          crackleOsc.stop(ctx.currentTime + 0.03);
        } catch (_) {}
      }, 110);

      this.isPlaying = true;
    }

    playTrack(soundName) {
      this.currentSound = soundName;
      localStorage.setItem('renounce_ambient_sound', soundName);
      if (soundName === 'brown') {
        this.startBrownNoise();
      } else if (soundName === 'rain') {
        this.startRain();
      } else if (soundName === 'forest') {
        this.startForest();
      } else if (soundName === 'candle') {
        this.startCandle();
      } else {
        this.stopCurrent();
      }
    }

    pause() {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4);
      }
    }

    resume() {
      if (this.currentSound !== 'off' && !this.isPlaying) {
        this.playTrack(this.currentSound);
      } else if (this.masterGain && this.ctx) {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.4);
      }
    }
  }

  const ambientAudio = new ProceduralAmbientSound();

  function updateAmbientUI() {
    if (ambientSoundGroup) {
      document.querySelectorAll('.ambient-pill').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-sound') === ambientAudio.currentSound);
      });
    }
    if (ambientVolumeSlider) {
      ambientVolumeSlider.value = ambientAudio.volume;
    }
    if (ambientVolIcon) {
      ambientVolIcon.textContent = ambientAudio.volume === 0 ? '🔇' : ambientAudio.volume < 0.5 ? '🔉' : '🔊';
    }
  }
  updateAmbientUI();

  if (ambientSoundGroup) {
    ambientSoundGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.ambient-pill');
      if (!btn) return;
      const sound = btn.getAttribute('data-sound');
      ambientAudio.playTrack(sound);
      updateAmbientUI();
    });
  }

  if (ambientVolumeSlider) {
    ambientVolumeSlider.addEventListener('input', (e) => {
      ambientAudio.setVolume(parseFloat(e.target.value));
    });
  }

  // ==========================================================================
  // THE PLEDGE (Consciously Renouncing Distractions)
  // ==========================================================================
  let currentPledge = localStorage.getItem('renounce_current_pledge') || 'Phone';

  function updatePledgeUI() {
    if (pledgeAnchorText) pledgeAnchorText.textContent = currentPledge;
    if (deskClockPledgeText) deskClockPledgeText.textContent = currentPledge;
    if (pledgeAnchor) pledgeAnchor.style.display = currentPledge ? 'inline-flex' : 'none';
    if (pledgePillRow) {
      const standardPledges = ['Phone', 'Social Media', 'Tab Switching', 'Multitasking'];
      document.querySelectorAll('.pledge-pill').forEach((btn) => {
        const p = btn.getAttribute('data-pledge');
        if (p === 'custom') {
          btn.classList.toggle('active', !standardPledges.includes(currentPledge));
        } else {
          btn.classList.toggle('active', p === currentPledge);
        }
      });
    }
  }
  updatePledgeUI();

  if (pledgePillRow) {
    pledgePillRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.pledge-pill');
      if (!btn) return;
      const p = btn.getAttribute('data-pledge');
      if (p === 'custom') {
        if (customPledgeInput) {
          customPledgeInput.style.display = 'block';
          customPledgeInput.focus();
          if (customPledgeInput.value.trim()) {
            currentPledge = customPledgeInput.value.trim();
          }
        }
      } else {
        if (customPledgeInput) customPledgeInput.style.display = 'none';
        currentPledge = p;
      }
      localStorage.setItem('renounce_current_pledge', currentPledge);
      updatePledgeUI();
    });
  }

  if (customPledgeInput) {
    customPledgeInput.addEventListener('input', () => {
      const val = customPledgeInput.value.trim();
      if (val) {
        currentPledge = val;
        localStorage.setItem('renounce_current_pledge', currentPledge);
        updatePledgeUI();
      }
    });
  }

  // ==========================================================================
  // DISTRACTION PARKING LOT (Brain Dump / Park for Later)
  // ==========================================================================
  let parkedThoughts = [];
  let sessionParkedCount = 0;

  function loadParkedThoughts() {
    try {
      parkedThoughts = JSON.parse(localStorage.getItem('renounce_parking_lot') || '[]');
    } catch (_) {
      parkedThoughts = [];
    }
    renderParkingList();
  }

  function saveParkedThoughts() {
    localStorage.setItem('renounce_parking_lot', JSON.stringify(parkedThoughts));
    renderParkingList();
  }

  function renderParkingList() {
    if (parkingBadge) {
      parkingBadge.textContent = String(parkedThoughts.length);
      parkingBadge.style.display = parkedThoughts.length > 0 ? 'inline-flex' : 'none';
    }
    if (!parkingList) return;
    if (!parkedThoughts.length) {
      parkingList.innerHTML = `
        <div style="padding: 1.25rem; text-align: center; color: var(--ink-faint); font-size: 0.82rem;">
          🌿 No thoughts parked right now. Your mind is calm and clear.
        </div>
      `;
      return;
    }

    parkingList.innerHTML = parkedThoughts.map((item, idx) => `
      <div class="parking-item" data-id="${item.id || idx}">
        <div class="parking-item-text">
          <div>${escapeHtml(item.thought)}</div>
          <div class="parking-item-meta">${item.time || 'Today'} · Task: ${escapeHtml(item.task || 'Focus block')}</div>
        </div>
        <button type="button" class="btn btn-ghost" data-action="remove" data-idx="${idx}" title="Remove thought" style="font-size: 0.8rem; padding: 0.2rem 0.45rem;">✕</button>
      </div>
    `).join('');
  }

  function openParkingLot() {
    if (parkingBackdrop) {
      parkingBackdrop.classList.add('open');
      if (parkingInput) {
        setTimeout(() => parkingInput.focus(), 80);
      }
    }
  }

  function closeParkingLot() {
    if (parkingBackdrop) {
      parkingBackdrop.classList.remove('open');
      if (parkingFeedback) parkingFeedback.textContent = '';
    }
  }

  if (openParkingBtn) openParkingBtn.addEventListener('click', openParkingLot);
  if (zenParkBtn) zenParkBtn.addEventListener('click', openParkingLot);
  if (deskClockParkBtn) deskClockParkBtn.addEventListener('click', openParkingLot);
  if (closeParkingBtn) closeParkingBtn.addEventListener('click', closeParkingLot);
  if (returnFocusBtn) returnFocusBtn.addEventListener('click', closeParkingLot);

  if (parkingBackdrop) {
    parkingBackdrop.addEventListener('click', (e) => {
      if (e.target === parkingBackdrop) closeParkingLot();
    });
  }

  if (parkingForm) {
    parkingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const thoughtText = parkingInput.value.trim();
      if (!thoughtText) return;
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newItem = {
        id: `thought-${Date.now()}`,
        thought: thoughtText,
        task: currentTask || 'Focus block',
        time: timeStr,
        date: now.toISOString()
      };
      parkedThoughts.unshift(newItem);
      sessionParkedCount += 1;
      saveParkedThoughts();
      parkingInput.value = '';

      try {
        apiFetch('/api/parking-lot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thought: newItem.thought, task: newItem.task })
        }).catch(() => {});
      } catch (_) {}

      if (parkingFeedback) {
        parkingFeedback.textContent = '✓ Parked safely. Back to your calm focus.';
        setTimeout(() => {
          if (parkingFeedback.textContent.includes('Parked safely')) parkingFeedback.textContent = '';
        }, 2200);
      }
    });
  }

  if (clearParkingBtn) {
    clearParkingBtn.addEventListener('click', () => {
      parkedThoughts = [];
      saveParkedThoughts();
      try {
        apiFetch('/api/parking-lot', { method: 'DELETE' }).catch(() => {});
      } catch (_) {}
    });
  }

  if (parkingList) {
    parkingList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="remove"]');
      if (!btn) return;
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      if (!isNaN(idx) && parkedThoughts[idx]) {
        const removedId = parkedThoughts[idx].id;
        parkedThoughts.splice(idx, 1);
        saveParkedThoughts();
        if (removedId) {
          try {
            apiFetch(`/api/parking-lot/${removedId}`, { method: 'DELETE' }).catch(() => {});
          } catch (_) {}
        }
      }
    });
  }

  // ==========================================================================
  // DESK CLOCK / AMBIENT IDLE SCREEN MODE
  // ==========================================================================
  function updateDeskClockDisplay() {
    if (!isDeskClockMode) return;
    const now = new Date();
    const realTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const timerStr = formatTime(remainingSeconds);

    if (deskClockRealtime) deskClockRealtime.textContent = realTimeStr;

    if (deskClockTime) {
      deskClockTime.textContent = deskClockShowTimer ? timerStr : realTimeStr.replace(/:[0-9]{2}\s/, ' ');
    }
    if (deskClockTask) {
      deskClockTask.textContent = currentTask || 'A calm study block';
    }
    if (deskClockPledgeText) {
      deskClockPledgeText.textContent = currentPledge;
    }
    if (deskClockTree && tree) {
      deskClockTree.style.transform = tree.style.transform;
    }
    if (deskClockPauseBtn) {
      deskClockPauseBtn.textContent = isRunning ? 'Pause' : 'Resume';
    }
  }

  function updateDeskSceneUI() {
    document.body.classList.toggle('desk-clock-scene-active', isDeskSceneActive);
    if (deskClockSceneLabel) {
      deskClockSceneLabel.textContent = isDeskSceneActive ? '✨ Pure Slate' : '🖼️ Cozy Scene';
    }
  }

  function setDeskClockMode(active) {
    isDeskClockMode = active;
    document.body.classList.toggle('desk-clock-active', active);
    if (active) {
      updateDeskSceneUI();
      updateDeskClockDisplay();
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (_) {}
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (_) {}
    }
  }

  if (enterDeskClockBtn) enterDeskClockBtn.addEventListener('click', () => setDeskClockMode(true));
  if (exitDeskClockBtn) exitDeskClockBtn.addEventListener('click', () => setDeskClockMode(false));

  if (deskClockPauseBtn) {
    deskClockPauseBtn.addEventListener('click', () => {
      pauseButton.click();
      updateDeskClockDisplay();
    });
  }

  if (deskClockSceneBtn) {
    deskClockSceneBtn.addEventListener('click', () => {
      isDeskSceneActive = !isDeskSceneActive;
      localStorage.setItem('renounce_desk_scene_active', String(isDeskSceneActive));
      updateDeskSceneUI();
    });
  }

  if (deskClockTimeToggleBtn) {
    deskClockTimeToggleBtn.addEventListener('click', () => {
      deskClockShowTimer = !deskClockShowTimer;
      updateDeskClockDisplay();
    });
  }

  if (deskClockDimBtn) {
    deskClockDimBtn.addEventListener('click', () => {
      currentDimmerIdx = (currentDimmerIdx + 1) % dimmerModes.length;
      const mode = dimmerModes[currentDimmerIdx];
      document.body.classList.remove('dim-mode-night', 'dim-mode-candle');
      if (mode === 'night') {
        document.body.classList.add('dim-mode-night');
        if (deskClockDimLabel) deskClockDimLabel.textContent = '🕯️ Candle Glow';
      } else if (mode === 'candle') {
        document.body.classList.add('dim-mode-candle');
        if (deskClockDimLabel) deskClockDimLabel.textContent = '☀️ Normal Theme';
      } else {
        if (deskClockDimLabel) deskClockDimLabel.textContent = '🌙 Night Dim';
      }
    });
  }

  // Initialize desk scene state UI label
  updateDeskSceneUI();

  // ==========================================================================
  // CORE POMODORO / TIMER LOGIC
  // ==========================================================================
  const numberValue = (input) => Math.max(0, Number(input.value) || 0);
  const focusDuration = () => (numberValue(durationHours) * 60 + numberValue(durationMinutes)) * 60;

  async function fetchSessions() {
    try {
      const res = await apiFetch('/api/sessions');
      return res.ok ? await res.json() : [];
    } catch (_) {
      return [];
    }
  }

  async function saveSession(type) {
    try {
      await apiFetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: currentTask,
          minutes: totalFocusSeconds / 60,
          completed: type === 'completed',
          pledge: currentPledge,
          parkedThoughts: parkedThoughts.slice(0, sessionParkedCount)
        })
      });
      const sessions = await fetchSessions();
      sessionCount.textContent = `Sessions logged: ${sessions.length}`;
    } catch (_) {}
  }

  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours
      ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function updateDisplay() {
    const formatted = formatTime(remainingSeconds);
    timeDisplay.textContent = formatted;

    const progress = totalFocusSeconds ? 1 - focusRemaining / totalFocusSeconds : 0;
    ringProgress.style.strokeDashoffset = circleLength * (1 - progress);
    tree.style.transform = `scale(${0.8 + Math.min(0.8, progress * 1.1)})`;

    // Tab Title & Favicon Countdown
    if (isRunning) {
      document.title = `(${formatted}) ${phase === 'focus' ? '🌱 Focus' : '☕ Break'} — Renounce`;
      updateDynamicFavicon(progress);
      if (zenPauseBtn) zenPauseBtn.textContent = 'Pause';
      pauseButton.textContent = 'Pause';
    } else if (remainingSeconds > 0 && remainingSeconds < totalFocusSeconds) {
      document.title = `[Paused ${formatted}] Renounce`;
      if (zenPauseBtn) zenPauseBtn.textContent = 'Resume';
      pauseButton.textContent = 'Resume';
    } else {
      document.title = originalTitle;
      restoreOriginalFavicon();
      if (zenPauseBtn) zenPauseBtn.textContent = 'Pause';
      pauseButton.textContent = 'Pause';
    }

    if (isDeskClockMode) {
      updateDeskClockDisplay();
    }
  }

  function stopTimer() {
    clearInterval(timerId);
    timerId = null;
    isRunning = false;
    ambientAudio.pause();
  }

  function beginBreak(manual = false) {
    if (!breakSeconds) {
      statusText.textContent = 'Set a break length before taking a break.';
      return;
    }
    playCalmBell();
    phase = 'break';
    remainingSeconds = breakSeconds;
    statusText.textContent = manual ? 'Break started. Your focus time is paused.' : 'Time for a scheduled gentle break.';
    updateDisplay();
  }

  function finishSession() {
    stopTimer();
    playCalmBell();
    remainingSeconds = 0;
    focusRemaining = 0;
    updateDisplay();
    saveSession('completed');

    let finishMsg = `Completed: ${currentTask || 'your study block'} 🌱. Wonderful work.`;
    if (sessionParkedCount > 0) {
      finishMsg += ` You parked ${sessionParkedCount} thought${sessionParkedCount > 1 ? 's' : ''} during this block. Review in Parking Lot (P).`;
    }
    statusText.textContent = finishMsg;
    sessionParkedCount = 0;
  }

  function tick() {
    remainingSeconds -= 1;
    if (phase === 'focus') {
      focusRemaining = remainingSeconds;
      if (focusRemaining <= 0) return finishSession();
      const elapsed = totalFocusSeconds - focusRemaining;
      if (breakIntervalSeconds && elapsed >= nextBreakAt) {
        nextBreakAt += breakIntervalSeconds;
        beginBreak();
      }
    } else if (remainingSeconds <= 0) {
      playCalmBell();
      phase = 'focus';
      remainingSeconds = focusRemaining;
      statusText.textContent = 'Break complete. Ready to resume your focus.';
    }
    updateDisplay();
  }

  function startInterval() {
    isRunning = true;
    timerId = setInterval(tick, 1000);
    ambientAudio.resume();
  }

  function startNewSession() {
    totalFocusSeconds = focusDuration();
    if (!totalFocusSeconds) {
      statusText.textContent = 'Choose a duration greater than zero.';
      return;
    }
    currentTask = taskInput.value.trim() || (goalDaily ? goalDaily.value.trim() : '') || 'A calm study block';
    focusRemaining = totalFocusSeconds;
    remainingSeconds = totalFocusSeconds;
    breakSeconds = numberValue(breakLength) * 60;
    breakIntervalSeconds = numberValue(breakEvery) * 60;
    nextBreakAt = breakIntervalSeconds;
    phase = 'focus';
    sessionParkedCount = 0;
    statusText.textContent = `Protecting: ${currentTask} · Renouncing: ${currentPledge}`;
    if (zenTaskLabel) zenTaskLabel.textContent = currentTask;
    updateDisplay();
    startInterval();
  }

  // Timer Form Listeners
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (isRunning) return;
    if (currentTask && remainingSeconds > 0) {
      statusText.textContent = phase === 'break' ? 'Continuing your break.' : `Continuing: ${currentTask}`;
      startInterval();
    } else {
      startNewSession();
    }
  });

  pauseButton.addEventListener('click', () => {
    if (isRunning) {
      stopTimer();
      statusText.textContent = phase === 'break' ? 'Break paused.' : `Paused: ${currentTask}`;
      updateDisplay();
    } else if (currentTask && remainingSeconds > 0) {
      startInterval();
      statusText.textContent = phase === 'break' ? 'Continuing your break.' : `Continuing: ${currentTask}`;
      updateDisplay();
    }
  });

  breakButton.addEventListener('click', () => {
    if (currentTask && phase === 'focus') {
      beginBreak(true);
    }
  });

  abandonButton.addEventListener('click', () => {
    if (!currentTask || !remainingSeconds) return;
    stopTimer();
    saveSession('abandoned');
    remainingSeconds = 0;
    focusRemaining = 0;
    sessionParkedCount = 0;
    updateDisplay();
    statusText.textContent = `Abandoned: ${currentTask}.`;
  });

  // Zen Mode Logic
  function setZenMode(active) {
    isZenMode = active;
    document.body.classList.toggle('zen-active', active);
    if (active) {
      const activeName = currentTask || taskInput.value.trim() || (goalDaily ? goalDaily.value.trim() : '') || 'A calm study block';
      if (zenTaskLabel) zenTaskLabel.textContent = activeName;
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (_) {}
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (_) {}
    }
    updateDisplay();
  }

  if (enterZenBtn) enterZenBtn.addEventListener('click', () => setZenMode(true));
  if (exitZenBtn) exitZenBtn.addEventListener('click', () => setZenMode(false));

  if (zenPauseBtn) {
    zenPauseBtn.addEventListener('click', () => {
      pauseButton.click();
    });
  }

  // ==========================================================================
  // KEYBOARD SHORTCUTS
  // 'F' -> Zen Mode | 'D' -> Desk Clock | 'C' -> Cozy Scene (in Clock) | 'P' -> Parking Lot | 'Esc' -> Exit modal/zen/clock
  // ==========================================================================
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      openParkingLot();
    } else if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      setDeskClockMode(!isDeskClockMode);
    } else if ((e.key === 'c' || e.key === 'C') && isDeskClockMode) {
      e.preventDefault();
      if (deskClockSceneBtn) deskClockSceneBtn.click();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      setZenMode(!isZenMode);
    } else if (e.key === 'Escape') {
      if (parkingBackdrop && parkingBackdrop.classList.contains('open')) {
        closeParkingLot();
      } else if (isDeskClockMode) {
        setDeskClockMode(false);
      } else if (isZenMode) {
        setZenMode(false);
      }
    }
  });

  // Goals Synchronization
  async function loadGoals() {
    try {
      const res = await apiFetch('/api/goals');
      if (res.ok) {
        const goals = await res.json();
        if (goalDaily && goals.daily) goalDaily.value = goals.daily;
        if (goalWeekly && goals.weekly) goalWeekly.value = goals.weekly;
        if (goalLongTerm && goals.longTerm) goalLongTerm.value = goals.longTerm;
      }
    } catch (_) {}
  }

  let saveGoalsTimer = null;
  function scheduleSaveGoals() {
    clearTimeout(saveGoalsTimer);
    if (goalsSaveStatus) goalsSaveStatus.textContent = 'Saving goal...';
    saveGoalsTimer = setTimeout(async () => {
      try {
        await apiFetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            daily: goalDaily ? goalDaily.value.trim() : '',
            weekly: goalWeekly ? goalWeekly.value.trim() : '',
            longTerm: goalLongTerm ? goalLongTerm.value.trim() : ''
          })
        });
        if (goalsSaveStatus) {
          goalsSaveStatus.textContent = 'Saved.';
          setTimeout(() => { if (goalsSaveStatus.textContent === 'Saved.') goalsSaveStatus.textContent = ''; }, 2500);
        }
      } catch (_) {
        if (goalsSaveStatus) goalsSaveStatus.textContent = 'Saved locally.';
      }
    }, 600);
  }

  if (goalDaily) goalDaily.addEventListener('input', scheduleSaveGoals);
  if (goalWeekly) goalWeekly.addEventListener('input', scheduleSaveGoals);
  if (goalLongTerm) goalLongTerm.addEventListener('input', scheduleSaveGoals);

  if (useTodayGoalBtn) {
    useTodayGoalBtn.addEventListener('click', () => {
      const val = goalDaily ? goalDaily.value.trim() : '';
      if (val) {
        taskInput.value = val;
        taskInput.focus();
        statusText.textContent = `Target set: "${val}". Press Start whenever you are ready.`;
        if (zenTaskLabel) zenTaskLabel.textContent = val;
      }
    });
  }

  if (toggleGoalsBtn && expandedGoals) {
    toggleGoalsBtn.addEventListener('click', () => {
      const isHidden = expandedGoals.style.display === 'none';
      expandedGoals.style.display = isHidden ? 'grid' : 'none';
      toggleGoalsText.textContent = isHidden
        ? 'Hide weekly & long-term goals ▴'
        : 'Show weekly & long-term goals ▾';
    });
  }

  // Initialization
  document.addEventListener('DOMContentLoaded', async () => {
    loadGoals();
    loadParkedThoughts();
    const sessions = await fetchSessions();
    sessionCount.textContent = `Sessions logged: ${sessions.length}`;

    try {
      const response = await apiFetch('/api/auth/me');
      const user = response.ok && (await response.json());
      const defaults = Number(user?.preferences?.defaultDuration);
      if (defaults) {
        durationHours.value = Math.floor(defaults / 60);
        durationMinutes.value = defaults % 60;
      }
    } catch (_) {
      /* default 25m */
    }

    remainingSeconds = focusDuration();
    focusRemaining = remainingSeconds;
    totalFocusSeconds = remainingSeconds;
    updateDisplay();
  });
})();
