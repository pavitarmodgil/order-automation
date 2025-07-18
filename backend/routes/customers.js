const express = require('express');
const customerService = require('../services/customerService');
const router = express.Router();

// GET /api/customers - Get all customers
router.get('/', (req, res) => {
  try {
    const customers = customerService.getAllCustomers();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/customers/phone/:phone - Get customer by phone
router.get('/phone/:phone', (req, res) => {
  try {
    const customer = customerService.getCustomerByPhone(req.params.phone);
    if (customer) {
      res.json(customer);
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/customers/:id - Get customer by ID
router.get('/:id', (req, res) => {
  try {
    const customer = customerService.getCustomerById(parseInt(req.params.id));
    if (customer) {
      res.json(customer);
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/customers - Add new customer
router.post('/', (req, res) => {
  try {
    const { name, phone, email, address } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const customer = customerService.addCustomer({ name, phone, email, address });
    if (customer) {
      res.status(201).json(customer);
    } else {
      res.status(500).json({ error: 'Failed to add customer' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/customers/:phone - Update customer
router.put('/:phone', (req, res) => {
  try {
    const updates = req.body;
    const customer = customerService.updateCustomer(req.params.phone, updates);

    if (customer) {
      res.json(customer);
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
