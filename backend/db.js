const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./prd_analyzer.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    created_at TEXT,
    country TEXT,
    erp TEXT,
    rows_parsed INTEGER,
    raw_data TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    upload_id TEXT,
    created_at TEXT,
    report_json TEXT
  )`);
});

module.exports = db;
