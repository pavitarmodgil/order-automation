// Run this script manually: node run-excel.js
// Make sure to install xlsx first: npm install xlsx

const XLSX = require('xlsx');
const fs = require('fs');

console.log('📊 Processing hnm.xlsx file...\n');

try {
    // Read the Excel file
    const workbook = XLSX.readFile('backend/data/hnm.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    console.log(`📋 Reading sheet: ${sheetName}`);

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`✅ Found ${data.length} rows of data`);

    // Show the structure
    if (data.length > 0) {
        console.log('\n📋 Column names:');
        console.log(Object.keys(data[0]));

        console.log('\n📋 First 3 rows:');
        data.slice(0, 3).forEach((row, index) => {
            console.log(`Row ${index + 1}:`, row);
        });
    }

    // Extract stock items
    const stockItems = [];

    data.forEach((row, index) => {
        // Try different possible column names
        const name = row['Name'] || row['NAME'] || row['Item Name'] || row['Stock Item'] ||
            row['Product'] || row['Description'] || row['Item'] || row['Stock'] ||
            Object.values(row)[0]; // First column if no match

        const rate = row['Rate'] || row['RATE'] || row['Price'] || row['Cost'] ||
            row['Amount'] || row['Value'] || row['Rate/Price'] ||
            Object.values(row)[1]; // Second column if no match

        const unit = row['Unit'] || row['UNIT'] || row['UOM'] || row['Unit of Measure'] ||
            row['Units'] || row['Unit/Measure'] || 'pcs';

        if (name && name.toString().trim() && name.toString().trim() !== 'undefined') {
            stockItems.push({
                NAME: name.toString().trim(),
                RATE: parseFloat(rate) || 0,
                UNIT: unit ? unit.toString().trim() : 'pcs',
                GST: 0
            });
        }
    });

    console.log(`\n✅ Extracted ${stockItems.length} stock items`);

    if (stockItems.length > 0) {
        console.log('\n📋 Sample items:');
        stockItems.slice(0, 10).forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.NAME} - ₹${item.RATE} per ${item.UNIT}`);
        });

        if (stockItems.length > 10) {
            console.log(`   ... and ${stockItems.length - 10} more items`);
        }

        // Save to items.json
        fs.writeFileSync('backend/data/items.json', JSON.stringify(stockItems, null, 2));
        console.log(`\n💾 Saved ${stockItems.length} items to: backend/data/items.json`);

        console.log('\n🎉 Success! Your stock items are now ready.');
    } else {
        console.log('\n❌ No stock items found. Please check your Excel file structure.');
    }

} catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. xlsx package is installed: npm install xlsx');
    console.log('   2. hnm.xlsx file exists in backend/data/');
    console.log('   3. Excel file has proper column headers');
} 