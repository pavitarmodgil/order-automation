const express = require('express');
const itemService = require('../services/itemService');
const router = express.Router();

// GET /api/items - Get all items
router.get('/', (req, res) => {
  try {
    const items = itemService.getAllItems();
    res.json(items.items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/items/search?q=query - Search items
router.get('/search', (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const items = itemService.searchItems(query);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/items/:id - Get item by ID
router.get('/:id', (req, res) => {
  try {
    const item = itemService.getItemById(parseInt(req.params.id));
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
