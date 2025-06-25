// backend/utils/initDb.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(__dirname + '/db.sqlite');

db.serialize(() => {
  // Items table
  db.run(`
    CREATE TABLE IF NOT EXISTS Items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      rate REAL,
      unit TEXT
    )
  `);

  // Customers table
  db.run(`
    CREATE TABLE IF NOT EXISTS Customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT UNIQUE
    )
  `);

  // Orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS Orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY(customer_id) REFERENCES Customers(id)
    )
  `);

  // OrderItems table
  db.run(`
    CREATE TABLE IF NOT EXISTS OrderItems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      item_id INTEGER,
      quantity INTEGER,
      FOREIGN KEY(order_id) REFERENCES Orders(id),
      FOREIGN KEY(item_id) REFERENCES Items(id)
    )
  `);
});

db.close();
