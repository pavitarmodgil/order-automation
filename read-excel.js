const XLSX = require('xlsx');
const fs = require('fs');

console.log('📊 Reading Excel file to extract stock items...\n');

try {
    // Read the Excel file
    const workbook = XLSX.readFile('backend/data/Master.xlsx');

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    console.log(`📋 Reading sheet: ${sheetName}`);

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✅ Found ${data.length} rows of data`);

    // Show the structure of the data
    if (data.length > 0) {
        console.log('\n📋 Data structure:');
        console.log(Object.keys(data[0]));

        console.log('\n📋 First few rows:');
        data.slice(0, 5).forEach((row, index) => {
            console.log(`Row ${index + 1}:`, row);
        });
    }

    // Extract stock items
    const stockItems = [];

    data.forEach((row, index) => {
        // Look for common column names that might contain stock item data
        const name = row['Name'] || row['NAME'] || row['Item Name'] || row['Stock Item'] || row['Product'] || row['Description'];
        const rate = row['Rate'] || row['RATE'] || row['Price'] || row['Cost'] || row['Amount'];
        const unit = row['Unit'] || row['UNIT'] || row['UOM'] || row['Unit of Measure'];

        if (name && name.toString().trim()) {
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

        console.log('\n🎉 Excel data successfully converted to items.json!');
    } else {
        console.log('\n❌ No stock items found in the Excel file');
        console.log('\n💡 Please check the column names in your Excel file');
    }

} catch (error) {
    console.error('❌ Error reading Excel file:', error.message);
    console.log('\n💡 Please check:');
    console.log('   1. Excel file exists at: backend/data/Master.xlsx');
    console.log('   2. File is not corrupted');
    console.log('   3. Install xlsx package: npm install xlsx');
} 