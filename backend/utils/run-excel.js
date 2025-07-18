const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

console.log('Starting Excel processing...');

try {
    // Read the Excel file
    const excelPath = path.join(__dirname, '..', 'data', 'Master.xlsx');
    console.log('Reading Excel file from:', excelPath);

    if (!fs.existsSync(excelPath)) {
        console.error('Excel file not found at:', excelPath);
        process.exit(1);
    }

    const workbook = XLSX.readFile(excelPath);
    console.log('Excel file read successfully');
    console.log('Available sheets:', workbook.SheetNames);

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    console.log('Processing sheet:', sheetName);

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log('Total rows in sheet:', jsonData.length);

    // Headers are in row 4 (index 3), data starts from row 5 (index 4)
    const headers = jsonData[3] || [];
    console.log('Headers found:', headers);

    const items = [];

    // Start from row 5 (index 4)
    for (let i = 4; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.length > 0) {
            // Based on the headers: ['Sl. No.', 'Name of Item', 'Under', 'Units', 'Opening Qty', 'Rate', 'per', 'Opening Balance']
            const itemName = row[1]; // 'Name of Item' column
            const rate = row[5];     // 'Rate' column
            const unit = row[3];     // 'Units' column

            // Only add items with names
            if (itemName && typeof itemName === 'string' && itemName.trim().length > 0) {
                const rateValue = parseFloat(rate) || 0;
                const unitValue = (unit && typeof unit === 'string') ? unit.trim() : 'pcs';

                items.push({
                    name: itemName.trim(),
                    rate: rateValue,
                    unit: unitValue,
                    gst: 18 // Default GST rate
                });
            }
        }
    }

    console.log('Extracted items:', items.length);

    // Save to items.json
    const outputPath = path.join(__dirname, '..', 'data', 'items.json');
    const outputData = {
        items: items,
        total: items.length,
        lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log('Items saved to:', outputPath);
    console.log('Processing completed successfully!');

    // Show first few items as sample
    console.log('\nSample items:');
    items.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ₹${item.rate} per ${item.unit}`);
    });

    if (items.length > 10) {
        console.log(`... and ${items.length - 10} more items`);
    }

} catch (error) {
    console.error('Error processing Excel file:', error);
    process.exit(1);
} 