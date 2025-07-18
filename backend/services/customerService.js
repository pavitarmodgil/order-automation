const fs = require('fs');
const path = require('path');
const config = require('../config');

class CustomerService {
    constructor() {
        this.customersPath = path.resolve(config.paths.customers);
    }

    // Load customers from JSON file
    loadCustomers() {
        try {
            if (!fs.existsSync(this.customersPath)) {
                return { customers: [], total: 0, lastUpdated: new Date().toISOString() };
            }
            const data = fs.readFileSync(this.customersPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading customers:', error);
            return { customers: [], total: 0, lastUpdated: new Date().toISOString() };
        }
    }

    // Save customers to JSON file
    saveCustomers(customersData) {
        try {
            fs.writeFileSync(this.customersPath, JSON.stringify(customersData, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving customers:', error);
            return false;
        }
    }

    // Get customer by phone number
    getCustomerByPhone(phone) {
        const customersData = this.loadCustomers();
        return customersData.customers.find(customer => customer.phone === phone);
    }

    // Get customer by ID
    getCustomerById(id) {
        const customersData = this.loadCustomers();
        return customersData.customers.find(customer => customer.id === id);
    }

    // Add new customer
    addCustomer(customerData) {
        const customersData = this.loadCustomers();
        const newCustomer = {
            id: customersData.customers.length + 1,
            name: customerData.name,
            phone: customerData.phone,
            email: customerData.email || '',
            address: customerData.address || '',
            createdAt: new Date().toISOString()
        };

        customersData.customers.push(newCustomer);
        customersData.total = customersData.customers.length;
        customersData.lastUpdated = new Date().toISOString();

        if (this.saveCustomers(customersData)) {
            return newCustomer;
        }
        return null;
    }

    // Update customer
    updateCustomer(phone, updates) {
        const customersData = this.loadCustomers();
        const customerIndex = customersData.customers.findIndex(c => c.phone === phone);

        if (customerIndex === -1) {
            return null;
        }

        customersData.customers[customerIndex] = {
            ...customersData.customers[customerIndex],
            ...updates
        };

        customersData.lastUpdated = new Date().toISOString();

        if (this.saveCustomers(customersData)) {
            return customersData.customers[customerIndex];
        }
        return null;
    }

    // Get all customers
    getAllCustomers() {
        return this.loadCustomers();
    }
}

module.exports = new CustomerService(); 