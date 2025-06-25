// backend/utils/db.js
const sqlite3 = require('sqlite3').verbose();
const path    = require('path');

// Adjust the path if you want db.sqlite elsewhere
const dbFile = path.join(__dirname, 'db.sqlite');

const db = new sqlite3.Database(dbFile, err => {
  if (err) console.error('❌ SQLite connect error:', err);
  else     console.log('✅ Connected to', dbFile);
});

module.exports = db;
