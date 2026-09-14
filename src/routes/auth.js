const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { loadStorage, saveStorage } = require('../lib/storage');

const router = express.Router();
const frontendUrl = process.env.FRONTEND_URL || '';

function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function normalizeUser(rawUser) {
  if (!rawUser) return null;
  const rawPreferences = rawUser.preferences || {};
  const userAge = rawUser.age !== undefined && rawUser.age !== null
    ? Number(rawUser.age)
    : (rawPreferences.age !== undefined && rawPreferences.age !== null ? Number(rawPreferences.age) : null);
  const userPurpose = rawUser.purpose || rawPreferences.purpose || '';
  const userPhone = rawUser.phone || rawPreferences.phone || '';
  const userName = rawUser.name || rawPreferences.name || 'Renounce User';

  return {
    id: rawUser.id,
    email: rawUser.email?.toLowerCase() || '',
    passwordHash: rawUser.passwordHash || null,
    googleId: rawUser.googleId || null,
    name: userName,
    age: userAge,
    purpose: userPurpose,
    phone: userPhone,
    deadlines: Array.isArray(rawUser.deadlines) ? rawUser.deadlines : [],
    sessions: Array.isArray(rawUser.sessions) ? rawUser.sessions : [],
    parkingLot: Array.isArray(rawUser.parkingLot) ? rawUser.parkingLot : [],
    journal: rawUser.journal && typeof rawUser.journal === 'object' ? rawUser.journal : {},
    mood: rawUser.mood || null,
    goals: rawUser.goals || { longTerm: '', weekly: '', daily: '' },
    preferences: {
      ...rawPreferences,
      name: userName,
      age: userAge,
      purpose: userPurpose,
      phone: userPhone
    }
  };
}

function createUserRecord({ email, passwordHash = null, googleId = null, name }) {
  return normalizeUser({
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email,
    passwordHash,
    googleId,
    name: name || 'Renounce User',
    age: null,
    purpose: '',
    phone: '',
    deadlines: [],
    sessions: [],
    parkingLot: [],
    journal: {},
    mood: null,
    goals: { longTerm: '', weekly: '', daily: '' },
    preferences: {}
  });
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

function findUserByEmail(email) {
  const data = loadStorage();
  const raw = data.users.find((user) => user.email === email.toLowerCase());
  return raw ? normalizeUser(raw) : null;
}

function findUserById(id) {
  const data = loadStorage();
  const raw = data.users.find((user) => user.id === id);
  return raw ? normalizeUser(raw) : null;
}

function findUserByGoogleId(googleId) {
  const data = loadStorage();
  const raw = data.users.find((user) => user.googleId === googleId);
  return raw ? normalizeUser(raw) : null;
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = findUserById(id);
  return done(null, user || false);
});

passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const user = findUserByEmail(email);
    if (!user) return done(null, false, { message: 'Account not found.' });
    if (!user.passwordHash) return done(null, false, { message: 'Use Google sign-in for this account.' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return done(null, false, { message: 'Incorrect credentials.' });
    return done(null, normalizeUser(user));
  } catch (error) {
    return done(error);
  }
}));

let googleStrategyRegistered = false;

function ensureGoogleStrategy() {
  if (!googleStrategyRegistered && isGoogleConfigured()) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      proxy: true
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase() || '';
        const data = loadStorage();
        let user = data.users.find((entry) => entry.googleId === profile.id || (email && entry.email === email));
        if (!user) {
          user = createUserRecord({ email, googleId: profile.id, name: profile.displayName || 'Google User' });
          data.users.push(user);
        } else {
          user.googleId = profile.id;
          if (profile.displayName && (!user.name || user.name === 'Renounce User')) {
            user.name = profile.displayName;
          }
          if (email && !user.email) {
            user.email = email;
          }
        }
        saveStorage(data);
        return done(null, normalizeUser(user));
      } catch (error) {
        return done(error);
      }
    }));
    googleStrategyRegistered = true;
  }
  return googleStrategyRegistered;
}

ensureGoogleStrategy();

router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  const data = loadStorage();
  const user = data.users.find((entry) => entry.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(sanitizeUser(normalizeUser(user)));
});

router.patch('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });

  const data = loadStorage();
  const user = data.users.find((entry) => entry.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });

  if (!user.preferences) {
    user.preferences = {};
  }

  // Name
  if (req.body.name !== undefined) {
    const trimmed = String(req.body.name).trim();
    if (trimmed) {
      user.name = trimmed;
      user.preferences.name = trimmed;
    }
  }

  // Age
  if (req.body.age !== undefined) {
    const parsedAge = parseInt(req.body.age, 10);
    user.age = isNaN(parsedAge) ? null : parsedAge;
    user.preferences.age = user.age;
  }

  // Purpose
  if (req.body.purpose !== undefined) {
    user.purpose = String(req.body.purpose).trim();
    user.preferences.purpose = user.purpose;
  }

  // Phone
  if (req.body.phone !== undefined) {
    user.phone = String(req.body.phone).trim();
    user.preferences.phone = user.phone;
  }

  // Nested preferences
  if (req.body.preferences && typeof req.body.preferences === 'object') {
    user.preferences = { ...user.preferences, ...req.body.preferences };
    if (user.preferences.name && !req.body.name) {
      user.name = String(user.preferences.name).trim() || user.name;
    }
    if (user.preferences.age !== undefined && req.body.age === undefined) {
      const pAge = parseInt(user.preferences.age, 10);
      user.age = isNaN(pAge) ? null : pAge;
    }
    if (user.preferences.purpose !== undefined && req.body.purpose === undefined) {
      user.purpose = String(user.preferences.purpose).trim();
    }
    if (user.preferences.phone !== undefined && req.body.phone === undefined) {
      user.phone = String(user.preferences.phone).trim();
    }
  }

  saveStorage(data);
  const normalized = normalizeUser(user);
  if (req.user) {
    Object.assign(req.user, normalized);
  }
  return res.json(sanitizeUser(normalized));
});

router.post('/signup', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();
    const name = (req.body.name || 'Renounce User').trim();
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (findUserByEmail(email)) return res.status(409).json({ error: 'Email already in use.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = createUserRecord({ email, passwordHash, name });
    const data = loadStorage();
    data.users.push(user);
    saveStorage(data);
    req.login(user, (loginError) => {
      if (loginError) return next(loginError);
      return res.json(sanitizeUser(user));
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Authentication failed' });
    req.login(user, (loginError) => {
      if (loginError) return next(loginError);
      return res.json(sanitizeUser(user));
    });
  })(req, res, next);
});

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    return res.json({ ok: true });
  });
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function handleGoogleLogin(req, res, email, explicitName) {
  const cleanEmail = String(email).trim().toLowerCase();
  const data = loadStorage();
  let user = data.users.find((entry) => entry.email === cleanEmail);

  if (!user) {
    const derivedName = explicitName || cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    user = createUserRecord({
      email: cleanEmail,
      googleId: `google-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: derivedName
    });
    data.users.push(user);
  } else {
    if (!user.googleId) {
      user.googleId = `google-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }
    if (explicitName && (!user.name || user.name === 'Renounce User')) {
      user.name = explicitName;
    }
  }

  saveStorage(data);
  const normalized = normalizeUser(user);

  req.login(normalized, (err) => {
    if (err) {
      console.error('Google login error:', err);
      return res.redirect('/login?error=google');
    }
    return res.redirect('/home');
  });
}

function renderGoogleAccountChooser(req, res) {
  const data = loadStorage();
  const seen = new Set();
  const knownUsers = (data.users || []).filter((u) => {
    if (!u.email || seen.has(u.email.toLowerCase())) return false;
    seen.add(u.email.toLowerCase());
    return true;
  });

  const accountsHtml = knownUsers.map((user) => {
    const initial = (user.name || user.email || 'G')[0].toUpperCase();
    const displayName = escapeHtml(user.name || user.email.split('@')[0]);
    const displayEmail = escapeHtml(user.email);
    const loginUrl = `/api/auth/google?email=${encodeURIComponent(user.email)}`;
    return `
      <a href="${loginUrl}" class="account-item">
        <div class="avatar">${initial}</div>
        <div class="account-info">
          <div class="account-name">${displayName}</div>
          <div class="account-email">${displayEmail}</div>
        </div>
        <div class="arrow">›</div>
      </a>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in with Google — Renounce</title>
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=3">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8f9fa;
      color: #202124;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #18191c; color: #e8eaed; }
      .chooser-card { background: #242528 !important; border-color: #383a3f !important; }
      .account-item { border-color: #383a3f !important; }
      .account-item:hover { background: #2f3136 !important; }
      .account-name { color: #e8eaed !important; }
      .account-email { color: #9aa0a6 !important; }
      .custom-email-input { background: #1e1f22 !important; border-color: #4a4d52 !important; color: #e8eaed !important; }
      .cancel-link { color: #8ab4f8 !important; }
      .dev-badge { background: rgba(138, 180, 248, 0.08) !important; border-color: rgba(138, 180, 248, 0.25) !important; color: #8ab4f8 !important; }
    }
    .chooser-card {
      width: 100%;
      max-width: 440px;
      background: #ffffff;
      border: 1px solid #dadce0;
      border-radius: 16px;
      padding: 2.25rem 2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    }
    .google-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .google-logo {
      display: inline-block;
      margin-bottom: 0.75rem;
    }
    .title {
      font-size: 1.4rem;
      font-weight: 500;
      letter-spacing: -0.01em;
      margin-bottom: 0.4rem;
    }
    .subtitle {
      font-size: 0.9rem;
      color: #5f6368;
    }
    .accounts-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .account-item {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.75rem 0.9rem;
      border: 1px solid #e8eaed;
      border-radius: 10px;
      text-decoration: none;
      color: inherit;
      transition: all 0.15s ease;
      cursor: pointer;
    }
    .account-item:hover {
      background: #f1f3f4;
      border-color: #dadce0;
      transform: translateY(-1px);
    }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #1a73e8;
      color: #ffffff;
      font-weight: 600;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .account-info {
      flex: 1;
      overflow: hidden;
    }
    .account-name {
      font-size: 0.92rem;
      font-weight: 500;
      color: #202124;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .account-email {
      font-size: 0.8rem;
      color: #5f6368;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .arrow {
      font-size: 1.25rem;
      color: #9aa0a6;
      font-weight: 300;
    }
    .custom-section {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e8eaed;
    }
    .custom-form {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.6rem;
    }
    .custom-email-input {
      flex: 1;
      padding: 0.65rem 0.85rem;
      border: 1px solid #dadce0;
      border-radius: 8px;
      font-size: 0.88rem;
      outline: none;
      transition: border-color 0.15s;
    }
    .custom-email-input:focus {
      border-color: #1a73e8;
    }
    .submit-btn {
      padding: 0.65rem 1.1rem;
      background: #1a73e8;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }
    .submit-btn:hover {
      background: #1557b0;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1.5rem;
      font-size: 0.84rem;
    }
    .cancel-link {
      color: #1a73e8;
      text-decoration: none;
      font-weight: 500;
    }
    .cancel-link:hover {
      text-decoration: underline;
    }
    .dev-badge {
      margin-top: 1.25rem;
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      background: #e8f0fe;
      border: 1px solid #d2e3fc;
      color: #1967d2;
      font-size: 0.76rem;
      line-height: 1.45;
    }
  </style>
</head>
<body>
  <div class="chooser-card">
    <div class="google-header">
      <div class="google-logo">
        <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.28v3.15C3.33 21.46 7.37 24 12 24z"/>
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.28C.46 8.2.01 10.05.01 12s.45 3.8 1.27 5.42l4-3.15z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.33 2.54 1.28 6.58l4 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
        </svg>
      </div>
      <h1 class="title">Sign in with Google</h1>
      <p class="subtitle">Choose an account to continue to <strong>Renounce</strong></p>
    </div>

    ${knownUsers.length > 0 ? `<div class="accounts-list">${accountsHtml}</div>` : ''}

    <div class="custom-section">
      <p style="font-size: 0.82rem; font-weight: 500; color: #5f6368;">${knownUsers.length > 0 ? 'Or use another Google account:' : 'Sign in with your Google email:'}</p>
      <form class="custom-form" method="GET" action="/api/auth/google">
        <input type="email" name="email" class="custom-email-input" placeholder="you@gmail.com" required autofocus>
        <button type="submit" class="submit-btn">Continue</button>
      </form>
    </div>

    <div class="card-footer">
      <a href="/login" class="cancel-link">← Return to Renounce login</a>
    </div>

    <div class="dev-badge">
      <strong>💡 Google OAuth Mode:</strong> To connect directly to Google's live production OAuth servers, configure <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in your environment variables.
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
}

router.get('/google', (req, res, next) => {
  if (ensureGoogleStrategy()) {
    return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  }

  const emailParam = (req.query.email || '').trim().toLowerCase();
  if (emailParam && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailParam)) {
    return handleGoogleLogin(req, res, emailParam);
  }

  return renderGoogleAccountChooser(req, res);
});

router.post('/google', (req, res) => {
  const emailParam = (req.body.email || req.query.email || '').trim().toLowerCase();
  if (emailParam && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailParam)) {
    return handleGoogleLogin(req, res, emailParam, req.body.name);
  }
  return res.redirect('/api/auth/google');
});

router.get('/google/callback', (req, res, next) => {
  if (!ensureGoogleStrategy()) {
    return res.redirect('/login?error=google');
  }
  return passport.authenticate('google', { failureRedirect: '/login?error=google' })(req, res, (err) => {
    if (err) return res.redirect('/login?error=google');
    return res.redirect('/home');
  });
});

module.exports = router;
