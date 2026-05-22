const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'feedback.db');
const db = new Database(dbPath);

// Restrict DB file permissions to owner only (read/write)
fs.chmodSync(dbPath, 0o600);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Auto-create feedback table on startup
db.exec(`
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comments TEXT NOT NULL,
    recommend TEXT NOT NULL,
    timestamp TEXT NOT NULL
  )
`);

function insertFeedback({ name, email, rating, comments, recommend, timestamp }) {
  const stmt = db.prepare(`
    INSERT INTO feedback (name, email, rating, comments, recommend, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, email, rating, comments, recommend, timestamp);
  return { id: result.lastInsertRowid, name, email, rating, comments, recommend, timestamp };
}

function getAllFeedback({ limit = 100, offset = 0 } = {}) {
  return db.prepare('SELECT * FROM feedback ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset);
}

function getFeedbackCount() {
  return db.prepare('SELECT COUNT(*) as count FROM feedback').get().count;
}

function close() {
  db.close();
}

module.exports = { insertFeedback, getAllFeedback, getFeedbackCount, close };
