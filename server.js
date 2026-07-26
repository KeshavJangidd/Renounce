require('./src/server');
const PORT = Number(process.env.PORT) || 3001;
const projectRoot = process.cwd();
const DB_FILE = path.join(projectRoot, 'data.json');
const isProduction = process.env.NODE_ENV === 'production';
const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const frontendUrl = process.env.FRONTEND_URL || 'https://renouncework.vercel.app';
const allowedOrigins = new Set([
  frontendUrl,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
]);

if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});
app.use(session({
  secret: process.env.SESSION_SECRET || 'renounce-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));
app.use(passport.initialize());
app.use(passport.session());

const EMPTY_GOALS = { longTerm: '', weekly: '', daily: '' };

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
    goals: {
      longTerm: rawUser.goals?.longTerm ?? '',
      weekly: rawUser.goals?.weekly ?? '',
      daily: rawUser.goals?.daily ?? ''
    }
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
    goals: { ...EMPTY_GOALS }
  });
}

function readData() {
  const fallbackData = { users: [] };

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(fallbackData, null, 2));
    return fallbackData;
  }

  const rawData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  if (Array.isArray(rawData.users)) {
    return { users: rawData.users.map(normalizeUser) };
  }

  const migratedUser = createUserRecord({
    email: 'legacy@renounce.local',
    name: 'Legacy User'
  });
  migratedUser.deadlines = Array.isArray(rawData.deadlines) ? rawData.deadlines : [];
  migratedUser.sessions = Array.isArray(rawData.sessions) ? rawData.sessions : [];
  migratedUser.mood = rawData.mood || null;
  migratedUser.goals = {
    longTerm: rawData.goals?.longTerm ?? '',
    weekly: rawData.goals?.weekly ?? '',
    daily: rawData.goals?.daily ?? ''
  };

  return { users: [migratedUser] };
}

function writeData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

function getUserRecord(req) {
  if (!req.user) return null;
  const data = readData();
  return data.users.find((user) => user.id === req.user.id) || null;
}

function ensureAuthenticated(req, res, next) {
  if (req.path === '/' || req.path.startsWith('/api/')) {
    return next();
  }

  if (req.isAuthenticated()) {
    return next();
  }

  return res.status(404).json({ error: 'Not found' });
}

app.use(ensureAuthenticated);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const data = readData();
  const user = data.users.find((entry) => entry.id === id);
  done(null, user || false);
});

passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const data = readData();
    const user = data.users.find((entry) => entry.email === email.toLowerCase());
    if (!user) {
      return done(null, false, { message: 'No account found for that email.' });
    }
    if (!user.passwordHash) {
      return done(null, false, { message: 'That account uses Google sign-in only.' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return done(null, false, { message: 'Incorrect password.' });
    }
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
      const data = readData();
      const email = profile.emails?.[0]?.value?.toLowerCase() || '';
      let user = data.users.find((entry) => entry.googleId === profile.id || entry.email === email);

      if (!user) {
        user = createUserRecord({
          email,
          googleId: profile.id,
          name: profile.displayName || 'Google User'
        });
        data.users.push(user);
        writeData(data);
      } else {
        user.googleId = profile.id;
        user.name = profile.displayName || user.name;
        user.email = email || user.email;
        writeData(data);
      }

      done(null, normalizeUser(user));
    } catch (error) {
      done(error);
    }
  }));
} else {
  console.warn('Google OAuth credentials not configured. Google auth route will be disabled until env vars are provided.');
}

app.get('/', (req, res) => {
  res.json({ name: 'Renounce API', status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.json(sanitizeUser(req.user));
});

app.post('/api/auth/signup', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();
    const name = (req.body.name || 'Renounce User').trim();
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const data = readData();
    if (data.users.some((user) => user.email === email)) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = createUserRecord({ email, passwordHash, name });
    data.users.push(user);
    writeData(data);

    req.login(user, (loginError) => {
      if (loginError) return next(loginError);
      return res.json(sanitizeUser(user));
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Authentication failed' });
    req.login(user, (loginError) => {
      if (loginError) return next(loginError);
      return res.json(sanitizeUser(user));
    });
  })(req, res, next);
});

app.post('/api/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    return res.json({ ok: true });
  });
});

app.get('/api/auth/google', (req, res, next) => {
  if (!googleEnabled) {
    return res.status(503).json({ error: 'Google auth is not configured.' });
  }
  return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/api/auth/google/callback', (req, res, next) => {
  if (!googleEnabled) {
    return res.status(503).json({ error: 'Google auth is not configured.' });
  }
  return passport.authenticate('google', { failureRedirect: `${frontendUrl}/auth.html?error=google` })(req, res, next);
}, (req, res) => {
  res.redirect(frontendUrl);
});

app.get('/api/deadlines', (req, res) => {
  const user = getUserRecord(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  return res.json(user.deadlines);
});

app.post('/api/deadlines', (req, res) => {
  const data = readData();
  const user = data.users.find((entry) => entry.id === req.user.id);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const newDeadline = {
    id: Date.now().toString(),
    title: req.body.title,
    dueDate: req.body.dueDate,
    category: req.body.category,
    isCompleted: false
  };
  user.deadlines.push(newDeadline);
  writeData(data);
  return res.json(newDeadline);
});

app.delete('/api/deadlines/:id', (req, res) => {
  const data = readData();
  const user = data.users.find((entry) => entry.id === req.user.id);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  user.deadlines = user.deadlines.filter((deadline) => deadline.id !== req.params.id);
  writeData(data);
  return res.json({ success: true });
});

app.patch('/api/deadlines/:id', (req, res) => {
  const data = readData();
  const user = data.users.find((entry) => entry.id === req.user.id);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const deadline = user.deadlines.find((entry) => entry.id === req.params.id);
  if (!deadline) return res.status(404).json({ error: 'Not found' });
  Object.assign(deadline, req.body);
  writeData(data);
  return res.json(deadline);
});

app.get('/api/sessions', (req, res) => {
  const user = getUserRecord(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  return res.json(user.sessions);
});

app.post('/api/sessions', (req, res) => {
  const data = readData();
  const user = data.users.find((entry) => entry.id === req.user.id);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const session = {
    id: Date.now().toString(),
    task: req.body.task,
    minutes: req.body.minutes,
    completed: req.body.completed,
    date: new Date().toISOString()
  };
  user.sessions.push(session);
  writeData(data);
  return res.json(session);
});

app.get('/api/mood', (req, res) => {
  const user = getUserRecord(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  return res.json(user.mood);
});

app.post('/api/mood', (req, res) => {
  const data = readData();
  const user = data.users.find((entry) => entry.id === req.user.id);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  user.mood = { value: req.body.mood, date: new Date().toISOString() };
  writeData(data);
  return res.json(user.mood);
});

app.get('/api/goals', (req, res) => {
  const user = getUserRecord(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  return res.json(user.goals);
});

app.post('/api/goals', (req, res) => {
  const data = readData();
  const user = data.users.find((entry) => entry.id === req.user.id);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const nextGoals = {
    ...user.goals,
    ...Object.entries(req.body || {}).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {})
  };

  user.goals = nextGoals;
  writeData(data);
  return res.json(nextGoals);
});

app.listen(PORT, () => {
  console.log(`Renounce server running at http://localhost:${PORT}`);
});
