// Application Configuration
module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },

  // Database Configuration
  database: {
    path: './backend/utils/db.sqlite'
  },

  // Tally ERP Configuration
  tally: {
    companyName: 'Krrish Enterprises',
    defaultVoucherType: 'Sales',
    salesLedgerName: 'Sales',
    gstRate: 18
  },

  // Twilio Configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    webhookUrl: process.env.TWILIO_WEBHOOK_URL || ''
  },

  // File Paths
  paths: {
    items: './backend/data/items.json',
    customers: './backend/data/customers.json',
    exports: './backend/exports'
  },

  // Application Settings
  app: {
    name: 'Krrish Enterprises Order Management',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  }
};
