const http = require('http');
const path = require('path');
const fs = require('fs');

// Ensure process.env.PORT is 3999 for testing
process.env.PORT = '3999';
process.env.NODE_ENV = 'development';
process.env.TEST_MODE = 'true';

const app = require('./src/server');
const { loadStorage, saveStorage } = require('./src/lib/storage');

const BASE = 'http://127.0.0.1:3999';
let server;
let testUserEmail = `testbot_${Date.now()}@renounce.local`;
let sessionCookie = '';

async function request(urlPath, options = {}) {
  const url = `${BASE}${urlPath}`;
  const headers = { ...(options.headers || {}) };
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }
  const res = await fetch(url, { ...options, headers });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    sessionCookie = setCookie.split(';')[0];
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {}
  return { status: res.status, headers: res.headers, text, json };
}

async function runTests() {
  console.log('\n--- 🌿 RUNNING RENOUNCE INTEGRATION TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('/api/health');
    assert(health.status === 200 && health.json?.ok === true, 'GET /api/health returns 200 OK');

    // 2. Static HTML & UI Deliveries
    const indexRes = await request('/index.html');
    assert(indexRes.status === 200 && indexRes.text.includes('rhythm-matrix') && indexRes.text.includes('rhythm-legend'), 'Dashboard serves 28-day rhythm heatmap matrix');

    const timerRes = await request('/timer.html');
    assert(timerRes.status === 200 && timerRes.text.includes('pledge-card') && timerRes.text.includes('ambient-dock') && timerRes.text.includes('parking-lot-backdrop') && timerRes.text.includes('desk-clock-overlay') && timerRes.text.includes('desk-clock-scene-btn') && timerRes.text.includes('desk-clock-scene-backdrop'), 'Focus Timer serves The Pledge, Ambient Dock, Parking Lot modal, Desk Clock overlay, and Cozy Scene backdrop');

    const journalRes = await request('/journal.html');
    assert(journalRes.status === 200 && journalRes.text.includes('journal-parking-list') && journalRes.text.includes('Impulses Resisted'), 'Daily Journal serves Parked Thoughts / Impulses Resisted card');

    const cssRes = await request('/css/shared.css');
    assert(cssRes.status === 200 && cssRes.text.includes('.pledge-pill') && cssRes.text.includes('.ambient-dock') && cssRes.text.includes('.desk-clock-overlay') && cssRes.text.includes('.dim-mode-candle') && cssRes.text.includes('.desk-clock-scene-backdrop') && cssRes.text.includes('desk-clock-scene-active'), 'shared.css includes all Phase 3 & Cozy Desk Scene styles (Pledge, Ambient, Desk Clock, Candle glow, Scene backdrop)');

    const jsTimerRes = await request('/js/timer.js');
    assert(jsTimerRes.status === 200 && jsTimerRes.text.includes('ProceduralAmbientSound') && jsTimerRes.text.includes('startBrownNoise') && jsTimerRes.text.includes('startRain') && jsTimerRes.text.includes('startForest') && jsTimerRes.text.includes('startCandle') && jsTimerRes.text.includes('updateDeskSceneUI') && jsTimerRes.text.includes('openParkingLot'), 'timer.js contains procedural sound generators (including candle ember), parking lot, and desk clock cozy scene logic');

    const jsDashRes = await request('/js/dashboard.js');
    assert(jsDashRes.status === 200 && jsDashRes.text.includes('renderRhythmMatrix') && jsDashRes.text.includes('fetchSessions'), 'dashboard.js delivers modular dashboard & rhythm matrix logic');

    const jsJournalRes = await request('/js/journal.js');
    assert(jsJournalRes.status === 200 && jsJournalRes.text.includes('applyReflection') && jsJournalRes.text.includes('journalParkingList'), 'journal.js delivers modular reflection & journal history logic');

    const jsAccountRes = await request('/js/account.js');
    assert(jsAccountRes.status === 200 && jsAccountRes.text.includes('populateUserData') && jsAccountRes.text.includes('profileForm'), 'account.js delivers modular account & preference sync logic');

    const imageRes = await request('/images/desk_clock_cozy.jpg');
    assert(imageRes.status === 200, 'Static image /images/desk_clock_cozy.jpg serves successfully');

    // Redirect checks
    const workzoneRes = await request('/workzone.html');
    assert(workzoneRes.status === 200 && workzoneRes.text.includes('timer.html'), 'workzone.html redirects to timer.html');

    const resumeRes = await request('/resume.html');
    assert(resumeRes.status === 200 && resumeRes.text.includes('journal.html'), 'resume.html redirects to journal.html');

    // 3. User Authentication & Profile
    const signupRes = await request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        password: 'TestPassword123!',
        name: 'Mindful Scholar'
      })
    });
    assert(signupRes.status === 200 && signupRes.json?.name === 'Mindful Scholar', 'User signup successful and authenticated');

    const meRes = await request('/api/auth/me');
    assert(meRes.status === 200 && meRes.json?.email === testUserEmail, 'GET /api/auth/me returns authenticated user');

    // 4. Session with The Pledge
    const sessionPost = await request('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'Quantum Physics Review',
        minutes: 25,
        completed: true,
        pledge: 'Phone'
      })
    });
    assert(sessionPost.status === 201 && sessionPost.json?.pledge === 'Phone', 'POST /api/sessions successfully records "The Pledge" (Phone)');

    const sessionsGet = await request('/api/sessions');
    const recordedSession = sessionsGet.json?.find((s) => s.task === 'Quantum Physics Review');
    assert(recordedSession && recordedSession.pledge === 'Phone', 'GET /api/sessions returns session with pledged distraction');

    // 5. Distraction Parking Lot APIs
    const parkPost = await request('/api/parking-lot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thought: 'Look up flight tickets to Kyoto',
        task: 'Quantum Physics Review'
      })
    });
    assert(parkPost.status === 201 && parkPost.json?.thought === 'Look up flight tickets to Kyoto', 'POST /api/parking-lot stores brain dump thought');
    const thoughtId = parkPost.json?.id;

    const parkGet = await request('/api/parking-lot');
    assert(Array.isArray(parkGet.json) && parkGet.json.length === 1 && parkGet.json[0].id === thoughtId, 'GET /api/parking-lot returns parked thoughts list');

    const parkDelete = await request(`/api/parking-lot/${thoughtId}`, { method: 'DELETE' });
    assert(parkDelete.status === 200 && parkDelete.json?.ok === true, 'DELETE /api/parking-lot/:id deletes specific thought');

    const parkGetAfterDelete = await request('/api/parking-lot');
    assert(parkGetAfterDelete.json?.length === 0, 'Parking lot list is empty after deletion');

    // 6. Goals API
    const goalPost = await request('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daily: 'Complete 3 quiet Pomodoro blocks',
        weekly: 'Read 150 pages without social media',
        longTerm: 'Cultivate deep attention span'
      })
    });
    assert(goalPost.status === 200 && goalPost.json?.daily === 'Complete 3 quiet Pomodoro blocks', 'POST /api/goals correctly syncs focus directions');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    // Clean up test user from data.json
    try {
      const data = loadStorage();
      data.users = data.users.filter((u) => u.email !== testUserEmail);
      saveStorage(data);
      console.log('  ✓ Cleaned up test user data.');
    } catch (_) {}

    console.log(`\n--- RESULTS: ${passed} PASSED, ${failed} FAILED ---\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Start HTTP server on 3999 and run test
const srv = http.createServer(app);
srv.listen(3999, '127.0.0.1', () => {
  runTests();
});
