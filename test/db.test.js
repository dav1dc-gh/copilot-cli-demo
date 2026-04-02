const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.join(__dirname, 'test-db.db');

// We test the database logic directly using the same SQL patterns as db.js,
// but with a temporary database file to avoid polluting the real one.

describe('Database module', () => {
  let db;

  before(() => {
    // Clean up any leftover test database
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

    db = new DatabaseSync(TEST_DB_PATH);
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
  });

  after(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it('creates the feedback table', () => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='feedback'"
    ).all();
    assert.equal(tables.length, 1);
    assert.equal(tables[0].name, 'feedback');
  });

  it('inserts and retrieves feedback', () => {
    const stmt = db.prepare(
      'INSERT INTO feedback (name, email, rating, hear_about_us, comments) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run('Alice', 'alice@example.com', 5, 'social_media', 'Great app!');
    assert.ok(result.lastInsertRowid > 0);

    const row = db.prepare('SELECT * FROM feedback WHERE id = ?').get(result.lastInsertRowid);
    assert.equal(row.name, 'Alice');
    assert.equal(row.email, 'alice@example.com');
    assert.equal(row.rating, 5);
    assert.equal(row.hear_about_us, 'social_media');
    assert.equal(row.comments, 'Great app!');
    assert.ok(row.created_at);
  });

  it('retrieves all feedback ordered by id descending', () => {
    // Insert a second record
    db.prepare(
      'INSERT INTO feedback (name, email, rating, hear_about_us, comments) VALUES (?, ?, ?, ?, ?)'
    ).run('Bob', 'bob@example.com', 3, 'search_engine', 'Could be better');

    const rows = db.prepare('SELECT * FROM feedback ORDER BY id DESC').all();
    assert.ok(rows.length >= 2);
    // Most recent first
    assert.equal(rows[0].name, 'Bob');
    assert.equal(rows[1].name, 'Alice');
  });

  it('safely stores SQL injection attempts as plain text', () => {
    const malicious = "Robert'; DROP TABLE feedback;--";
    const stmt = db.prepare(
      'INSERT INTO feedback (name, email, rating, hear_about_us, comments) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(malicious, 'evil@example.com', 1, 'other', 'test');

    // Table still exists and the malicious string is stored as-is
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='feedback'"
    ).all();
    assert.equal(tables.length, 1);

    const row = db.prepare('SELECT * FROM feedback WHERE email = ?').get('evil@example.com');
    assert.equal(row.name, malicious);
  });
});
