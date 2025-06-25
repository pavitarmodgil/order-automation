// backend/index.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { MessagingResponse } = require('twilio').twiml;

const itemsRouter = require('./routes/items');
const customersRouter = require('./routes/customers');
const ordersRouter = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  console.log('⮕', req.method, req.url);
  next();
});


// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use(bodyParser.json());

// WhatsApp webhook endpoint (must be before /api routes)
app.post('/whatsapp', (req, res) => {
  console.log('📲 Incoming WhatsApp:', req.body);
  const twiml = new MessagingResponse();

  const fullFrom = req.body.From || '';                  // e.g. "whatsapp:+917876308716"
  const phone = fullFrom.replace('whatsapp:+91', '');    // Extract phone
  const msg = (req.body.Body || '').trim().toLowerCase();

  if (msg === 'place order') {
    const host = req.get('host');  // e.g. "abcd1234.ngrok.io"
    const link = `https://${host}/order.html?phone=${phone}`;
    twiml.message(`🛒 Hi! Click here to place your order:\n${link}`);
  } else {
    twiml.message(`Hi! To place an order, reply with "Place Order".`);
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

// Mount API routers
app.use('/api/items', itemsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);

// Health check route
app.get('/health', (req, res) => {
  res.send('✅ API is running.');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
});
