const fs = require('fs');
const path = require('path');

const DB_FILE = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.join(process.cwd(), 'data.json');

function ensureStorage() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));
  }
}

function loadStorage() {
  ensureStorage();
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(raw);
}

function saveStorage(data) {
  const temporaryFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2), 'utf-8');
  try {
    fs.renameSync(temporaryFile, DB_FILE);
  } catch (err) {
    if (err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'EACCES') {
      fs.copyFileSync(temporaryFile, DB_FILE);
      try {
        fs.unlinkSync(temporaryFile);
      } catch (_) {}
    } else {
      throw err;
    }
  }
}

module.exports = {
  ensureStorage,
  loadStorage,
  saveStorage
};
