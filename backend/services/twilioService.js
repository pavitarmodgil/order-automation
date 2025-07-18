const twilio = require('twilio');
const config = require('../config');
const customerService = require('./customerService');

class TwilioService {
    constructor() {
        this.client = null;
        this.isConfigured = false;
        this.initialize();
    }

    // Initialize Twilio client
    initialize() {
        if (config.twilio.accountSid && config.twilio.authToken) {
            this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
            this.isConfigured = true;
            console.log('✅ Twilio client initialized');
        } else {
            console.log('⚠️ Twilio not configured - set environment variables');
        }
    }

    // Extract phone number from WhatsApp format
    extractPhoneNumber(whatsappNumber) {
        // Remove 'whatsapp:' prefix and country code
        const phone = whatsappNumber.replace('whatsapp:', '').replace('+91', '');
        return phone;
    }

    // Get customer info by phone number
    getCustomerInfo(phone) {
        const customer = customerService.getCustomerByPhone(phone);
        return customer;
    }

    // Generate order link
    generateOrderLink(phone, baseUrl) {
        const customer = this.getCustomerInfo(phone);
        if (customer) {
            return `${baseUrl}/order.html?phone=${phone}&customer=${encodeURIComponent(customer.name)}`;
        }
        return `${baseUrl}/order.html?phone=${phone}`;
    }

    // Send WhatsApp message
    async sendWhatsAppMessage(to, message) {
        if (!this.isConfigured) {
            console.error('Twilio not configured');
            return false;
        }

        try {
            const result = await this.client.messages.create({
                body: message,
                from: `whatsapp:${config.twilio.phoneNumber}`,
                to: `whatsapp:${to}`
            });

            console.log(`✅ WhatsApp message sent to ${to}: ${result.sid}`);
            return true;
        } catch (error) {
            console.error('❌ Error sending WhatsApp message:', error);
            return false;
        }
    }

    // Handle incoming WhatsApp message
    async handleIncomingMessage(from, body, baseUrl) {
        const phone = this.extractPhoneNumber(from);
        const message = body.toLowerCase().trim();

        console.log(`📱 Incoming WhatsApp from ${phone}: ${message}`);

        if (message === 'place order' || message === 'order') {
            const customer = this.getCustomerInfo(phone);

            if (customer) {
                const orderLink = this.generateOrderLink(phone, baseUrl);
                const response = `🛒 Hi ${customer.name}! 

Click here to place your order:
${orderLink}

Or reply with "menu" to see our products.`;

                await this.sendWhatsAppMessage(from, response);
                return { success: true, customer };
            } else {
                const response = `🛒 Hi! Welcome to Krrish Enterprises!

To place an order, please contact us to register your number first.

Or visit: ${baseUrl}/order.html?phone=${phone}`;

                await this.sendWhatsAppMessage(from, response);
                return { success: true, customer: null };
            }
        } else if (message === 'menu' || message === 'products') {
            const response = `📋 Our Products:

🍦 Ice Cream Products:
• Brick Series (750mL, 1.25L, 2L)
• Cup Series (100mL, 125mL)
• JumboCup Series (125mL)
• Gold Series (Premium)
• Chocobar & Frostik
• And many more!

🍕 Food Items:
• 4 Cheese Pizza
• French Fries
• Diced Cheese Blend

Reply "place order" to start ordering!`;

            await this.sendWhatsAppMessage(from, response);
            return { success: true };
        } else {
            const response = `Hi! 👋

To place an order, reply with "Place Order"
To see our products, reply with "Menu"

Need help? Contact us!`;

            await this.sendWhatsAppMessage(from, response);
            return { success: true };
        }
    }

    // Send order confirmation
    async sendOrderConfirmation(phone, orderDetails) {
        const customer = this.getCustomerInfo(phone);
        const name = customer ? customer.name : 'Customer';

        const message = `✅ Order Confirmed!

Hi ${name}, your order has been placed successfully!

Order ID: #${orderDetails.id}
Total: ₹${orderDetails.total.toFixed(2)}
Items: ${orderDetails.items.length}

We'll process your order soon. Thank you! 🎉`;

        return await this.sendWhatsAppMessage(`+91${phone}`, message);
    }
}

module.exports = new TwilioService(); 