const express = require('express');
const db      = require('../utils/db');   // <<-- require our shared connection
const router  = express.Router();

// e.g. GET /api/items
router.get('/', (req, res) => {
  db.all('SELECT * FROM Items', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
