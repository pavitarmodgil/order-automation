const express = require('express');
const db = require('../utils/db');
const builder = require('xmlbuilder');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const itemService = require('../services/itemService');
const customerService = require('../services/customerService');
const twilioService = require('../services/twilioService');

const router = express.Router();

// POST /api/orders
router.post('/', (req, res) => {
  const { phone, customerName, items, notes = '' } = req.body;
  if (!phone || !customerName || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'phone, customerName and items are required' });
  }

  // Calculate order total using service
  const orderCalculation = itemService.calculateOrderTotal(items);

  // Create or get customer
  db.get(`SELECT id FROM Customers WHERE phone = ?`, [phone], (err, customer) => {
    if (err) return res.status(500).json({ error: err.message });

    if (customer) {
      // Update existing customer name
      db.run(`UPDATE Customers SET name = ? WHERE phone = ?`, [customerName, phone]);
      createOrder(customer.id, orderCalculation.total, orderCalculation.orderItems, notes, res);
    } else {
      // Create new customer
      db.run(`INSERT INTO Customers (name, phone) VALUES (?, ?)`, [customerName, phone], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        createOrder(this.lastID, orderCalculation.total, orderCalculation.orderItems, notes, res);
      });
    }
  });
});

function createOrder(customerId, total, orderItems, notes, res) {
  db.run(
    `INSERT INTO Orders (customer_id, notes, total) VALUES (?, ?, ?)`,
    [customerId, notes, total],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const orderId = this.lastID;

      // Store order items in database
      const stmt = db.prepare(
        `INSERT INTO OrderItems (order_id, item_id, quantity, rate) VALUES (?, ?, ?, ?)`
      );
      orderItems.forEach(({ id, quantity, rate }) => {
        stmt.run(orderId, id, quantity, rate);
      });
      stmt.finalize(err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, orderId, total });
      });
    }
  );
}

// GET /api/orders
router.get('/', (req, res) => {
  const sql = `
    SELECT o.id, o.timestamp, o.notes, o.total,
           c.name AS customerName, c.phone
    FROM Orders o
    JOIN Customers c ON o.customer_id = c.id
    ORDER BY o.timestamp DESC
  `;
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const orderId = req.params.id;

  db.get(
    `SELECT o.id, o.timestamp, o.notes,
            c.name AS customerName, c.phone
     FROM Orders o
     JOIN Customers c ON o.customer_id = c.id
     WHERE o.id = ?`,
    [orderId],
    (err, order) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!order) return res.status(404).json({ error: 'Order not found' });

      db.all(
        `SELECT oi.id, i.name, i.rate, i.unit, oi.quantity
         FROM OrderItems oi
         JOIN Items i ON oi.item_id = i.id
         WHERE oi.order_id = ?`,
        [orderId],
        (err, items) => {
          if (err) return res.status(500).json({ error: err.message });
          order.items = items;
          res.json(order);
        }
      );
    }
  );
});

// PUT /api/orders/:id
router.put('/:id', (req, res) => {
  const orderId = req.params.id;
  const { notes, items } = req.body;

  if (notes !== undefined) {
    db.run(`UPDATE Orders SET notes = ? WHERE id = ?`, [notes, orderId]);
  }

  if (Array.isArray(items)) {
    const stmt = db.prepare(
      `UPDATE OrderItems SET quantity = ? WHERE id = ?`
    );
    items.forEach(({ id, quantity }) => {
      stmt.run(quantity, id);
    });
    stmt.finalize();
  }

  res.json({ success: true });
});

// GET /api/orders/:id/export
// GET /api/orders/:id/export
router.get('/:id/export', (req, res) => {
  const orderId = req.params.id;

  db.get(
    `SELECT o.id, o.timestamp,
            c.name AS customerName
     FROM Orders o
     JOIN Customers c ON o.customer_id = c.id
     WHERE o.id = ?`,
    [orderId],
    (err, order) => {
      if (err || !order) return res.status(500).json({ error: err?.message || 'Order not found' });

      db.all(
        `SELECT i.name, i.rate, i.unit, i.gst AS GST, oi.quantity
         FROM OrderItems oi
         JOIN Items i ON oi.item_id = i.id
         WHERE oi.order_id = ?`,
        [orderId],
        (err, items) => {
          if (err) return res.status(500).json({ error: err.message });

          // Convert date to DD-MM-YYYY format for Tally
          const orderDate = new Date(order.timestamp);
          const day = orderDate.getDate().toString().padStart(2, '0');
          const month = (orderDate.getMonth() + 1).toString().padStart(2, '0');
          const year = orderDate.getFullYear();
          const date = `${day}-${month}-${year}`;
          const total = items
            .reduce((sum, it) => sum + it.rate * it.quantity, 0)
            .toFixed(2);

          // Build envelope
          const xmlObj = builder.create('ENVELOPE');
          xmlObj.ele('HEADER')
            .ele('TALLYREQUEST', 'Import Data').up().up();
          const body = xmlObj.ele('BODY')
            .ele('IMPORTDATA')
            .ele('REQUESTDESC')
            .ele('REPORTNAME', 'Vouchers').up()
            .ele('STATICVARIABLES')
            .ele('SVCURRENTCOMPANY', config.tally.companyName).up()
            .up()
            .up()
            .ele('REQUESTDATA')
            .ele('TALLYMESSAGE', { 'xmlns:UDF': 'TallyUDF' });

          // Voucher
          const voucher = body.ele('VOUCHER', {
            REMOTEID: orderId,
            VCHKEY: orderId,
            VCHTYPE: config.tally.defaultVoucherType,
            ACTION: 'Create',
            OBJVIEW: 'Invoice Voucher View',
            ISINVOICE: 'Yes'
          });
          voucher.ele('DATE', date).up();
          voucher.ele('VOUCHERNUMBER', String(orderId)).up();
          voucher.ele('VOUCHERTYPENAME', config.tally.defaultVoucherType).up();
          voucher.ele('PARTYLEDGERNAME', order.customerName).up();

          // 1) Top‑level Party debit
          voucher.ele('LEDGERENTRIES.LIST')
            .ele('LEDGERNAME', order.customerName).up()
            .ele('ISDEEMEDPOSITIVE', 'Yes').up()
            .ele('AMOUNT', `-${total}`).up()
            .up();

          // 2) GST credits (sum across items)
          //    We calculate total GST by summing each item’s GST% * (rate*qty)/100
          const gstTotals = items.reduce(
            (acc, it) => {
              const amt = it.rate * it.quantity;
              acc.CGST += (amt * (it.GST / 2) / 100);
              acc.SGST += (amt * (it.GST / 2) / 100);
              return acc;
            },
            { CGST: 0, SGST: 0 }
          );

          ['CGST', 'SGST'].forEach(gstHead => {
            const gstAmount = gstTotals[gstHead].toFixed(2);
            voucher.ele('LEDGERENTRIES.LIST')
              .ele('LEDGERNAME', gstHead).up()
              .ele('ISDEEMEDPOSITIVE', 'No').up()
              .ele('AMOUNT', gstAmount).up()
              .up();
          });

          // 3) Detailed inventory entries, each with its own Sale allocation
          items.forEach(item => {
            const qty = item.quantity;
            const rate = item.rate.toFixed(2);
            const amount = (item.rate * qty).toFixed(2);
            const unit = item.unit || '';

            const inv = voucher.ele('ALLINVENTORYENTRIES.LIST');
            inv.ele('STOCKITEMNAME', item.name).up();
            inv.ele('ISDEEMEDPOSITIVE', 'No').up();
            inv.ele('RATE', `${rate}/${unit}`).up();
            inv.ele('AMOUNT', amount).up();
            inv.ele('ACTUALQTY', `${qty} ${unit}`).up();
            inv.ele('BILLEDQTY', `${qty} ${unit}`).up();

            // Sale ledger allocation per item
            inv.ele('ACCOUNTINGALLOCATIONS.LIST')
              .ele('LEDGERNAME', salesLedgerName).up()
              .ele('ISDEEMEDPOSITIVE', 'No').up()
              .ele('AMOUNT', amount).up()
              .up();

            inv.up();
          });

          // Write & download
          const exportDir = path.join(__dirname, '..', 'exports');
          if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);
          const filename = `${order.customerName}_${orderId}.xml`;
          const filepath = path.join(exportDir, filename);
          fs.writeFileSync(filepath, xmlObj.end({ pretty: true }));

          res.download(filepath);
        }
      );
    }
  );
});


// POST /api/orders/export-all
router.post('/export-all', (req, res) => {
  db.all(
    `SELECT o.id, o.timestamp, o.total,
            c.name AS customerName
     FROM Orders o
     JOIN Customers c ON o.customer_id = c.id
     ORDER BY o.timestamp DESC`,
    (err, orders) => {
      if (err) return res.status(500).json({ error: err.message });

      const allItems = loadItems();
      const xmlObj = builder.create('ENVELOPE');
      xmlObj.ele('HEADER')
        .ele('TALLYREQUEST', 'Import Data').up().up();
      const body = xmlObj.ele('BODY')
        .ele('IMPORTDATA')
        .ele('REQUESTDESC')
        .ele('REPORTNAME', 'Vouchers').up()
        .ele('STATICVARIABLES')
        .ele('SVCURRENTCOMPANY', companyName).up()
        .up()
        .up()
        .ele('REQUESTDATA');

      orders.forEach(order => {
        db.all(
          `SELECT oi.item_id, oi.quantity, oi.rate
           FROM OrderItems oi
           WHERE oi.order_id = ?`,
          [order.id],
          (err, orderItems) => {
            if (err) return;

            const items = orderItems.map(oi => {
              const item = allItems.find(i => i.id === oi.item_id);
              return {
                name: item ? item.name : 'Unknown Item',
                rate: oi.rate,
                unit: item ? item.unit : 'pcs',
                gst: item ? item.gst : 18,
                quantity: oi.quantity
              };
            });

            const orderDate = new Date(order.timestamp);
            const day = orderDate.getDate().toString().padStart(2, '0');
            const month = (orderDate.getMonth() + 1).toString().padStart(2, '0');
            const year = orderDate.getFullYear();
            const date = `${day}-${month}-${year}`;

            const voucher = body.ele('TALLYMESSAGE', { 'xmlns:UDF': 'TallyUDF' })
              .ele('VOUCHER', {
                REMOTEID: order.id,
                VCHKEY: order.id,
                VCHTYPE: defaultVoucherType,
                ACTION: 'Create',
                OBJVIEW: 'Invoice Voucher View',
                ISINVOICE: 'Yes'
              });

            voucher.ele('DATE', date).up();
            voucher.ele('VOUCHERNUMBER', String(order.id)).up();
            voucher.ele('VOUCHERTYPENAME', defaultVoucherType).up();
            voucher.ele('PARTYLEDGERNAME', order.customerName).up();

            // Party debit
            voucher.ele('LEDGERENTRIES.LIST')
              .ele('LEDGERNAME', order.customerName).up()
              .ele('ISDEEMEDPOSITIVE', 'Yes').up()
              .ele('AMOUNT', `-${order.total.toFixed(2)}`).up()
              .up();

            // GST credits
            const gstTotals = items.reduce(
              (acc, it) => {
                const amt = it.rate * it.quantity;
                acc.CGST += (amt * (it.gst / 2) / 100);
                acc.SGST += (amt * (it.gst / 2) / 100);
                return acc;
              },
              { CGST: 0, SGST: 0 }
            );

            ['CGST', 'SGST'].forEach(gstHead => {
              const gstAmount = gstTotals[gstHead].toFixed(2);
              voucher.ele('LEDGERENTRIES.LIST')
                .ele('LEDGERNAME', gstHead).up()
                .ele('ISDEEMEDPOSITIVE', 'No').up()
                .ele('AMOUNT', gstAmount).up()
                .up();
            });

            // Inventory entries
            items.forEach(item => {
              const qty = item.quantity;
              const rate = item.rate.toFixed(2);
              const amount = (item.rate * qty).toFixed(2);
              const unit = item.unit || '';

              const inv = voucher.ele('ALLINVENTORYENTRIES.LIST');
              inv.ele('STOCKITEMNAME', item.name).up();
              inv.ele('ISDEEMEDPOSITIVE', 'No').up();
              inv.ele('RATE', `${rate}/${unit}`).up();
              inv.ele('AMOUNT', amount).up();
              inv.ele('ACTUALQTY', `${qty} ${unit}`).up();
              inv.ele('BILLEDQTY', `${qty} ${unit}`).up();

              inv.ele('ACCOUNTINGALLOCATIONS.LIST')
                .ele('LEDGERNAME', salesLedgerName).up()
                .ele('ISDEEMEDPOSITIVE', 'No').up()
                .ele('AMOUNT', amount).up()
                .up();

              inv.up();
            });

            voucher.up();
          }
        );
      });

      // Write & download
      const exportDir = path.join(__dirname, '..', 'exports');
      if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);
      const filename = `all-orders-${new Date().toISOString().split('T')[0]}.xml`;
      const filepath = path.join(exportDir, filename);
      fs.writeFileSync(filepath, xmlObj.end({ pretty: true }));

      res.download(filepath);
    }
  );
});

// POST /api/orders/export (legacy)
router.post('/export', (req, res) => {
  db.all(
    `SELECT o.id, o.timestamp, o.total,
            c.name AS customerName
     FROM Orders o
     JOIN Customers c ON o.customer_id = c.id
     WHERE o.timestamp >= date('now', '-7 days')
     ORDER BY o.timestamp DESC`,
    (err, orders) => {
      if (err) return res.status(500).json({ error: err.message });

      const allItems = loadItems();
      const xmlObj = builder.create('ENVELOPE');
      xmlObj.ele('HEADER')
        .ele('TALLYREQUEST', 'Import Data').up().up();
      const body = xmlObj.ele('BODY')
        .ele('IMPORTDATA')
        .ele('REQUESTDESC')
        .ele('REPORTNAME', 'Vouchers').up()
        .ele('STATICVARIABLES')
        .ele('SVCURRENTCOMPANY', companyName).up()
        .up()
        .up()
        .ele('REQUESTDATA');

      orders.forEach(order => {
        db.all(
          `SELECT oi.item_id, oi.quantity, oi.rate
           FROM OrderItems oi
           WHERE oi.order_id = ?`,
          [order.id],
          (err, orderItems) => {
            if (err) return;

            const items = orderItems.map(oi => {
              const item = allItems.find(i => i.id === oi.item_id);
              return {
                name: item ? item.name : 'Unknown Item',
                rate: oi.rate,
                unit: item ? item.unit : 'pcs',
                gst: item ? item.gst : 18,
                quantity: oi.quantity
              };
            });

            const orderDate = new Date(order.timestamp);
            const day = orderDate.getDate().toString().padStart(2, '0');
            const month = (orderDate.getMonth() + 1).toString().padStart(2, '0');
            const year = orderDate.getFullYear();
            const date = `${day}-${month}-${year}`;

            const voucher = body.ele('TALLYMESSAGE', { 'xmlns:UDF': 'TallyUDF' })
              .ele('VOUCHER', {
                REMOTEID: order.id,
                VCHKEY: order.id,
                VCHTYPE: defaultVoucherType,
                ACTION: 'Create',
                OBJVIEW: 'Invoice Voucher View',
                ISINVOICE: 'Yes'
              });

            voucher.ele('DATE', date).up();
            voucher.ele('VOUCHERNUMBER', String(order.id)).up();
            voucher.ele('VOUCHERTYPENAME', defaultVoucherType).up();
            voucher.ele('PARTYLEDGERNAME', order.customerName).up();

            // Party debit
            voucher.ele('LEDGERENTRIES.LIST')
              .ele('LEDGERNAME', order.customerName).up()
              .ele('ISDEEMEDPOSITIVE', 'Yes').up()
              .ele('AMOUNT', `-${order.total.toFixed(2)}`).up()
              .up();

            // GST credits
            const gstTotals = items.reduce(
              (acc, it) => {
                const amt = it.rate * it.quantity;
                acc.CGST += (amt * (it.gst / 2) / 100);
                acc.SGST += (amt * (it.gst / 2) / 100);
                return acc;
              },
              { CGST: 0, SGST: 0 }
            );

            ['CGST', 'SGST'].forEach(gstHead => {
              const gstAmount = gstTotals[gstHead].toFixed(2);
              voucher.ele('LEDGERENTRIES.LIST')
                .ele('LEDGERNAME', gstHead).up()
                .ele('ISDEEMEDPOSITIVE', 'No').up()
                .ele('AMOUNT', gstAmount).up()
                .up();
            });

            // Inventory entries
            items.forEach(item => {
              const qty = item.quantity;
              const rate = item.rate.toFixed(2);
              const amount = (item.rate * qty).toFixed(2);
              const unit = item.unit || '';

              const inv = voucher.ele('ALLINVENTORYENTRIES.LIST');
              inv.ele('STOCKITEMNAME', item.name).up();
              inv.ele('ISDEEMEDPOSITIVE', 'No').up();
              inv.ele('RATE', `${rate}/${unit}`).up();
              inv.ele('AMOUNT', amount).up();
              inv.ele('ACTUALQTY', `${qty} ${unit}`).up();
              inv.ele('BILLEDQTY', `${qty} ${unit}`).up();

              inv.ele('ACCOUNTINGALLOCATIONS.LIST')
                .ele('LEDGERNAME', salesLedgerName).up()
                .ele('ISDEEMEDPOSITIVE', 'No').up()
                .ele('AMOUNT', amount).up()
                .up();

              inv.up();
            });

            voucher.up();
          }
        );
      });

      // Write & download
      const exportDir = path.join(__dirname, '..', 'exports');
      if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);
      const filename = `orders-${new Date().toISOString().split('T')[0]}.xml`;
      const filepath = path.join(exportDir, filename);
      fs.writeFileSync(filepath, xmlObj.end({ pretty: true }));

      res.download(filepath);
    }
  );
});

// DELETE /api/orders/clear
router.delete('/clear', (req, res) => {
  db.run('DELETE FROM OrderItems', (err) => {
    if (err) return res.status(500).json({ error: err.message });

    db.run('DELETE FROM Orders', (err) => {
      if (err) return res.status(500).json({ error: err.message });

      db.run('DELETE FROM Customers', (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
    });
  });
});

module.exports = router;
