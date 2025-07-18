const fs = require('fs');
const path = require('path');
const config = require('../config');

class ItemService {
  constructor() {
    this.itemsPath = path.resolve(config.paths.items);
  }

  // Load items from JSON file
  loadItems() {
    try {
      if (!fs.existsSync(this.itemsPath)) {
        return { items: [], total: 0, lastUpdated: new Date().toISOString() };
      }
      const data = fs.readFileSync(this.itemsPath, 'utf8');
      const itemsData = JSON.parse(data);
      
      // Add IDs to items for compatibility
      const itemsWithIds = itemsData.items.map((item, index) => ({
        id: index + 1,
        name: item.name,
        rate: item.rate,
        unit: item.unit,
        gst: item.gst || config.tally.gstRate
      }));

      return {
        items: itemsWithIds,
        total: itemsWithIds.length,
        lastUpdated: itemsData.lastUpdated || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error loading items:', error);
      return { items: [], total: 0, lastUpdated: new Date().toISOString() };
    }
  }

  // Get item by ID
  getItemById(id) {
    const itemsData = this.loadItems();
    return itemsData.items.find(item => item.id === id);
  }

  // Get item by name
  getItemByName(name) {
    const itemsData = this.loadItems();
    return itemsData.items.find(item => 
      item.name.toLowerCase() === name.toLowerCase()
    );
  }

  // Get all items
  getAllItems() {
    return this.loadItems();
  }

  // Search items by name
  searchItems(query) {
    const itemsData = this.loadItems();
    const searchTerm = query.toLowerCase();
    
    return itemsData.items.filter(item => 
      item.name.toLowerCase().includes(searchTerm)
    );
  }

  // Calculate order total
  calculateOrderTotal(items) {
    let subtotal = 0;
    const orderItems = [];

    items.forEach(({ itemId, quantity }) => {
      const item = this.getItemById(itemId);
      if (item) {
        const itemTotal = item.rate * quantity;
        subtotal += itemTotal;
        orderItems.push({
          ...item,
          quantity,
          total: itemTotal
        });
      }
    });

    const gst = subtotal * (config.tally.gstRate / 100);
    const total = subtotal + gst;

    return {
      subtotal,
      gst,
      total,
      orderItems
    };
  }
}

module.exports = new ItemService(); 