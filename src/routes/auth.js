const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { loadStorage, saveStorage } = require('../lib/storage');

const router = express.Router();
const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

function normalizeUser(rawUser) {
  return {
    id: rawUser.id,
    email: rawUser.email?.toLowerCase() || '',
    passwordHash: rawUser.passwordHash || null,
    googleId: rawUser.googleId || null,
    name: rawUser.name || 'Renounce User',
    deadlines: Array.isArray(rawUser.deadlines) ? rawUser.deadlines : [],
    sessions: Array.isArray(rawUser.sessions) ? rawUser.sessions : [],
    mood: rawUser.mood || null,
    goals: rawUser.goals || { longTerm: '', weekly: '', daily: '' },
    preferences: rawUser.preferences || {}
  };
}

function createUserRecord({ email, passwordHash = null, googleId = null, name }) {
  return normalizeUser({
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email,
    passwordHash,
    googleId,
    name,
    deadlines: [],
    sessions: [],
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
  return data.users.find((user) => user.email === email.toLowerCase()) || null;
}

function findUserById(id) {
  const data = loadStorage();
  return data.users.find((user) => user.id === id) || null;
}

function findUserByGoogleId(googleId) {
  const data = loadStorage();
  return data.users.find((user) => user.googleId === googleId) || null;
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
  return res.json(sanitizeUser(req.user));
});

router.patch('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });

  const data = loadStorage();
  const user = data.users.find((entry) => entry.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });

  if (req.body.name !== undefined) {
    user.name = req.body.name.trim() || user.name;
  }
  if (req.body.preferences) {
    user.preferences = { ...user.preferences, ...req.body.preferences };
  }

  saveStorage(data);
  return res.json(sanitizeUser(user));
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
  return passport.authenticate('google', { failureRedirect: '/auth.html?error=google' })(req, res, next);
}, (req, res) => {
  res.redirect('/');
});

module.exports = router;
