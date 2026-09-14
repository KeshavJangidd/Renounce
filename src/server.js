try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch (_) {}

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const helmet = require('helmet');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const { ensureStorage, loadStorage, saveStorage } = require('./lib/storage');

class FileStore extends session.Store {
  constructor(options = {}) {
    super(options);
  }

  get(sid, cb) {
    try {
      const data = loadStorage();
      const sessions = data.sessions || {};
      const sess = sessions[sid];
      if (!sess) return cb(null, null);
      if (sess.cookie && sess.cookie.expires) {
        if (new Date(sess.cookie.expires) < new Date()) {
          delete sessions[sid];
          saveStorage(data);
          return cb(null, null);
        }
      }
      return cb(null, sess);
    } catch (err) {
      return cb(err);
    }
  }

  set(sid, sess, cb) {
    try {
      const data = loadStorage();
      if (!data.sessions) data.sessions = {};
      data.sessions[sid] = sess;
      saveStorage(data);
      if (cb) cb(null);
    } catch (err) {
      if (cb) cb(err);
    }
  }

  destroy(sid, cb) {
    try {
      const data = loadStorage();
      if (data.sessions && data.sessions[sid]) {
        delete data.sessions[sid];
        saveStorage(data);
      }
      if (cb) cb(null);
    } catch (err) {
      if (cb) cb(err);
    }
  }

  touch(sid, sess, cb) {
    try {
      const data = loadStorage();
      if (data.sessions && data.sessions[sid]) {
        data.sessions[sid].cookie = sess.cookie;
        saveStorage(data);
      }
      if (cb) cb(null);
    } catch (err) {
      if (cb) cb(err);
    }
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_URL || '';
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
]);
if (frontendUrl) {
  allowedOrigins.add(frontendUrl);
}

ensureStorage();

if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
      fontSrc: ["'self'", "https:", "http:", "data:"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*", "https:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: null
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const origin = req.get('origin');
  const isAllowedDevOrigin = !isProduction && (
    !origin ||
    origin === 'null' ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  );
  if (origin && (allowedOrigins.has(origin) || isAllowedDevOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

app.use(session({
  store: new FileStore(),
  secret: process.env.SESSION_SECRET || 'renounce-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days persistent session
    httpOnly: true
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Clean page routes, with redirects for existing .html bookmarks.
const cleanPages = {
  '/home': 'index.html',
  '/timer': 'timer.html',
  '/deadlines': 'deadlines.html',
  '/journal': 'journal.html',
  '/achievements': 'achievements.html',
  '/login': 'login.html',
  '/account': 'account.html'
};
const legacyPageRoutes = Object.fromEntries(
  Object.entries(cleanPages).map(([route, file]) => [`/${file}`, route])
);

app.get(['/', '/index.html'], (req, res) => res.redirect(302, '/home'));
Object.entries(legacyPageRoutes).forEach(([legacyRoute, cleanRoute]) => {
  if (legacyRoute !== '/index.html') app.get(legacyRoute, (req, res) => res.redirect(302, cleanRoute));
});
Object.entries(cleanPages).forEach(([route, file]) => {
  app.get(route, (req, res) => res.sendFile(path.join(process.cwd(), 'public', file)));
});

app.use(express.static(path.join(process.cwd(), 'public')));

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  return res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api')) {
    return res.status(500).json({ error: 'Internal server error' });
  }
  return res.status(500).send('Internal server error');
});

let serverInstance = null;
if (!process.env.TEST_MODE) {
  serverInstance = app.listen(PORT, () => {
    console.log(`Renounce backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
module.exports.server = serverInstance;
