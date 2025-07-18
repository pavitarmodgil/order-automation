// backend/index.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { MessagingResponse } = require('twilio').twiml;

// Import services
const twilioService = require('./services/twilioService');
const customerService = require('./services/customerService');

// Import routes
const itemsRouter = require('./routes/items');
const customersRouter = require('./routes/customers');
const ordersRouter = require('./routes/orders');

// Import config
const config = require('./config');

const app = express();

// Middleware
app.use((req, res, next) => {
  console.log('⮕', req.method, req.url);
  next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(bodyParser.json());

// WhatsApp webhook endpoint
app.post('/whatsapp', async (req, res) => {
  console.log('📲 Incoming WhatsApp:', req.body);

  const twiml = new MessagingResponse();
  const fullFrom = req.body.From || '';
  const messageBody = req.body.Body || '';
  const host = req.get('host');
  const baseUrl = `https://${host}`;

  try {
    const result = await twilioService.handleIncomingMessage(fullFrom, messageBody, baseUrl);

    if (result.success) {
      // If customer exists, send order link
      if (result.customer) {
        const orderLink = twilioService.generateOrderLink(twilioService.extractPhoneNumber(fullFrom), baseUrl);
        twiml.message(`🛒 Hi ${result.customer.name}! Click here to place your order:\n${orderLink}`);
      } else {
        twiml.message(`🛒 Hi! Welcome to Krrish Enterprises!\n\nTo place an order, please contact us to register your number first.\n\nOr visit: ${baseUrl}/order.html?phone=${twilioService.extractPhoneNumber(fullFrom)}`);
      }
    } else {
      twiml.message('Hi! To place an order, reply with "Place Order".');
    }
  } catch (error) {
    console.error('Error handling WhatsApp message:', error);
    twiml.message('Hi! To place an order, reply with "Place Order".');
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
  res.json({
    status: 'OK',
    app: config.app.name,
    version: config.app.version,
    environment: config.app.environment,
    twilio: twilioService.isConfigured ? 'Configured' : 'Not Configured'
  });
});

// Start server
app.listen(config.server.port, config.server.host, () => {
  console.log(`🚀 Server listening at http://${config.server.host}:${config.server.port}`);
  console.log(`📱 WhatsApp webhook: http://${config.server.host}:${config.server.port}/whatsapp`);
  console.log(`🛒 Order page: http://${config.server.host}:${config.server.port}/order.html`);
  console.log(`👨‍💼 Admin panel: http://${config.server.host}:${config.server.port}/admin.html`);
  console.log(`✅ Connected to ${path.resolve('./backend/utils/db.sqlite')}`);
});
