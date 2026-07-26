const express = require('express');
const { loadStorage, saveStorage } = require('../lib/storage');

const router = express.Router();
const EMPTY_GOALS = { longTerm: '', weekly: '', daily: '' };

function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });
  return next();
}

function getUser(data, userId) {
  return data.users.find((user) => user.id === userId) || null;
}

router.get('/health', (req, res) => {
  res.json({ ok: true });
});

router.get('/deadlines', requireAuth, (req, res) => {
  const data = loadStorage();
  const user = getUser(data, req.user.id);
  return res.json(user.deadlines);
});

router.post('/deadlines', requireAuth, (req, res) => {
  const data = loadStorage();
  const user = getUser(data, req.user.id);
  const { title, dueDate, category } = req.body;
  if (!title || !dueDate) return res.status(400).json({ error: 'Title and due date are required.' });
  const newDeadline = {
    id: `deadline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: title.trim(),
    dueDate: dueDate.trim(),
    category: category ? category.trim() : 'general',
    isCompleted: false
  };
  user.deadlines.push(newDeadline);
  saveStorage(data);
  return res.status(201).json(newDeadline);
});

router.delete('/deadlines/:id', requireAuth, (req, res) => {
  const data = loadStorage();
  const user = getUser(data, req.user.id);
  user.deadlines = user.deadlines.filter((deadline) => deadline.id !== req.params.id);
  saveStorage(data);
  return res.json({ ok: true });
});

router.patch('/deadlines/:id', requireAuth, (req, res) => {
  const data = loadStorage();
  const user = getUser(data, req.user.id);
  const deadline = user.deadlines.find((entry) => entry.id === req.params.id);
  if (!deadline) return res.status(404).json({ error: 'Deadline not found' });
  const { title, dueDate, category, isCompleted } = req.body;
  if (title !== undefined) deadline.title = title.trim();
  if (dueDate !== undefined) deadline.dueDate = dueDate.trim();
  if (category !== undefined) deadline.category = category.trim();
  if (isCompleted !== undefined) deadline.isCompleted = Boolean(isCompleted);
  saveStorage(data);
  return res.json(deadline);
});

router.get('/sessions', requireAuth, (req, res) => {
  const data = loadStorage();
  const user = getUser(data, req.user.id);
  return res.json(user.sessions);
});

router.post('/sessions', requireAuth, (req, res) => {
  const data = loadStorage();
  const user = getUser(data, req.user.id);
  const { task, minutes, completed } = req.body;
  if (!task || !minutes) return res.status(400).json({ error: 'Task and minutes are required.' });
  const session = {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    task: task.trim(),
    minutes: Number(minutes),
    completed: Boolean(completed),
    date: new Date().toISOString()
  };
  user.sessions.push(session);
  saveStorage(data);
  return res.status(201).json(session);
});

router.get('/mood', requireAuth, (req, res) => {
  const data = loadStorage();
  const user = getUser(data, req.user.id);
  return res.json(user.mood || null);
});

router.post('/mood', requireAuth, (req, res) => {
  const data = loadStorage();
  const user = getUser(data, req.user.id);
  const { mood } = req.body;
  if (!mood) return res.status(400).json({ error: 'Mood value is required.' });
  user.mood = { value: mood.trim(), date: new Date().toISOString() };
  saveStorage(data);
  return res.json(user.mood);
});

router.get('/goals', requireAuth, (req, res) => {
  const data = loadStorage();
  const user = getUser(data, req.user.id);
  return res.json(user.goals);
});

router.post('/goals', requireAuth, (req, res) => {
  const data = loadStorage();
  const user = getUser(data, req.user.id);
  const { longTerm, weekly, daily } = req.body;
  user.goals = {
    longTerm: longTerm !== undefined ? String(longTerm).trim() : user.goals.longTerm,
    weekly: weekly !== undefined ? String(weekly).trim() : user.goals.weekly,
    daily: daily !== undefined ? String(daily).trim() : user.goals.daily
  };
  saveStorage(data);
  return res.json(user.goals);
});

module.exports = router;
