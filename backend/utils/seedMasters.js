// backend/utils/seedMasters.js
const sqlite3 = require('sqlite3').verbose();
const items = require('../data/items.json');
const customers = require('../data/customers.json');

const db = new sqlite3.Database(__dirname + '/db.sqlite');

db.serialize(() => {
  const itemStmt = db.prepare(`INSERT OR IGNORE INTO Items (name, rate, unit) VALUES (?, ?, ?)`);
  items.forEach(i => itemStmt.run(i.NAME, i.RATE, i.UNIT));
  itemStmt.finalize();

  const custStmt = db.prepare(`INSERT OR IGNORE INTO Customers (name, phone) VALUES (?, ?)`);
  customers.forEach(c => custStmt.run(c.ledgerName, c.phone));
  custStmt.finalize();
});

db.close();
