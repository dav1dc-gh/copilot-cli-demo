const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'feedback.db');

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        rating INTEGER NOT NULL,
        hear_about_us TEXT NOT NULL,
        comments TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }
  return db;
}

function insertFeedback({ name, email, rating, hearAboutUs, comments }) {
  const database = getDb();
  const stmt = database.prepare(
    'INSERT INTO feedback (name, email, rating, hear_about_us, comments) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(name, email, rating, hearAboutUs, comments);
  const row = database.prepare('SELECT * FROM feedback WHERE id = ?').get(result.lastInsertRowid);
  return row;
}

function getAllFeedback() {
  const database = getDb();
  return database.prepare('SELECT * FROM feedback ORDER BY id DESC').all();
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, insertFeedback, getAllFeedback, closeDb };
