const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { loadStorage, saveStorage } = require('../lib/storage');

const router = express.Router();
const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const frontendUrl = process.env.FRONTEND_URL || 'https://renouncework.vercel.app';

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

if (googleEnabled) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value?.toLowerCase() || '';
      const data = loadStorage();
      let user = data.users.find((entry) => entry.googleId === profile.id || entry.email === email);
      if (!user) {
        user = createUserRecord({ email, googleId: profile.id, name: profile.displayName || 'Google User' });
        data.users.push(user);
      } else {
        user.googleId = profile.id;
        user.name = profile.displayName || user.name;
        user.email = email || user.email;
      }
      saveStorage(data);
      return done(null, normalizeUser(user));
    } catch (error) {
      return done(error);
    }
  }));
}

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

router.get('/google', (req, res, next) => {
  if (!googleEnabled) return res.status(503).json({ error: 'Google auth not configured' });
  return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!googleEnabled) return res.status(503).json({ error: 'Google auth not configured' });
  return passport.authenticate('google', { failureRedirect: `${frontendUrl}/login.html?error=google` })(req, res, next);
}, (req, res) => {
  res.redirect(`${frontendUrl}/`);
});

module.exports = router;
