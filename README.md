# 🛒 Krrish Enterprises Order Management System

A WhatsApp-based order management system integrated with Tally ERP, built with Node.js, Express, and SQLite.

## 🚀 Features

- **WhatsApp Integration**: Customers can place orders via WhatsApp
- **Multiple Items**: Add multiple items per order with real-time pricing
- **Customer Management**: Automatic customer detection and management
- **Tally Export**: Generate XML files for Tally ERP import
- **Admin Panel**: Complete order management interface
- **Real-time Calculations**: Automatic GST and total calculations

## 📁 Project Structure

```
order/
├── backend/
│   ├── config.js              # Application configuration
│   ├── index.js               # Main server file
│   ├── routes/                # API routes
│   │   ├── items.js
│   │   ├── customers.js
│   │   └── orders.js
│   ├── services/              # Business logic services
│   │   ├── customerService.js
│   │   ├── itemService.js
│   │   └── twilioService.js
│   ├── utils/                 # Utilities
│   │   ├── db.js
│   │   ├── initDb.js
│   │   └── run-excel.js
│   └── data/                  # Data files
│       ├── items.json
│       ├── customers.json
│       └── Master.xlsx
├── frontend/
│   └── public/
│       ├── order.html         # Order placement page
│       └── admin.html         # Admin panel
└── package.json
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd order
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize database**
   ```bash
   npm run init-db
   ```

4. **Process Excel data**
   ```bash
   node backend/utils/run-excel.js
   ```

5. **Start the server**
   ```bash
   npm start
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_WEBHOOK_URL=your_webhook_url

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Twilio Setup

1. **Create a Twilio account** at [twilio.com](https://twilio.com)
2. **Get your credentials** from the Twilio Console
3. **Set up WhatsApp Sandbox** or get a WhatsApp Business number
4. **Configure webhook URL** to point to your server's `/whatsapp` endpoint

## 📱 Usage

### For Customers

1. **Send "Place Order"** to your WhatsApp number
2. **Click the link** that comes back
3. **Select items** and quantities
4. **Submit order** - you'll get a confirmation

### For Admins

1. **Access admin panel** at `http://localhost:3000/admin.html`
2. **View all orders** in the dashboard
3. **Export to Tally** using the export buttons
4. **Manage customers** and orders

## 🔧 API Endpoints

### Items
- `GET /api/items` - Get all items
- `GET /api/items/search?q=query` - Search items
- `GET /api/items/:id` - Get item by ID

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/phone/:phone` - Get customer by phone
- `POST /api/customers` - Add new customer
- `PUT /api/customers/:phone` - Update customer

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order by ID
- `GET /api/orders/:id/export` - Export single order to Tally
- `POST /api/orders/export` - Export recent orders to Tally
- `POST /api/orders/export-all` - Export all orders to Tally

## 📊 Data Management

### Adding Items

1. **Update Excel file** (`backend/data/Master.xlsx`)
2. **Run the processor**:
   ```bash
   node backend/utils/run-excel.js
   ```

### Adding Customers

1. **Update customers.json** or use the API
2. **Format**:
   ```json
   {
     "customers": [
       {
         "id": 1,
         "name": "Customer Name",
         "phone": "1234567890",
         "email": "email@example.com",
         "address": "Customer Address"
       }
     ]
   }
   ```

## 🔒 Security

- **Input validation** on all API endpoints
- **SQL injection protection** using parameterized queries
- **Environment variables** for sensitive data
- **Error handling** throughout the application

## 🚀 Deployment

### Local Development
```bash
npm start
```

### Production
1. **Set environment variables**
2. **Use a process manager** like PM2
3. **Set up reverse proxy** (nginx)
4. **Configure SSL** for HTTPS

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support, contact the development team or create an issue in the repository. 