const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

async function updateGSTFromTally() {
  const xmlPath = path.join(__dirname, '..', 'data', 'stockitems.xml');
  const jsonPath = path.join(__dirname, '..', 'data', 'items.json');

  // Read and parse XML
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  const parsed = await xml2js.parseStringPromise(xmlContent, { explicitArray: false });

  const messages = parsed?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE;
  const tallyMessages = Array.isArray(messages) ? messages : [messages];

  // Build GST map: { itemName: gstRate }
  const gstMap = {};
  for (const msg of tallyMessages) {
    const stockItem = msg?.STOCKITEM;
    if (!stockItem || !stockItem.$?.NAME) continue;

    const itemName = stockItem.$.NAME.trim();
    let gstRate = 0;

    try {
      const gstDetails = stockItem['GSTDETAILS.LIST'];
      const stateWise = Array.isArray(gstDetails?.['STATEWISEDETAILS.LIST'])
        ? gstDetails['STATEWISEDETAILS.LIST']
        : [gstDetails?.['STATEWISEDETAILS.LIST']];

      for (const stateEntry of stateWise) {
        const rateList = Array.isArray(stateEntry?.['RATEDETAILS.LIST'])
          ? stateEntry['RATEDETAILS.LIST']
          : [stateEntry?.['RATEDETAILS.LIST']];

        for (const rate of rateList) {
          const parsedRate = parseFloat(rate?.GSTRATE || 0);
          if (!isNaN(parsedRate) && parsedRate > 0) {
            gstRate = parsedRate;
            break;
          }
        }
        if (gstRate > 0) break;
      }
    } catch (e) {
      console.warn(`⚠️ Could not extract GST for: ${itemName}`);
    }

    gstMap[itemName] = gstRate;
  }

  // Load and update items.json
  const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const updated = items.map(item => {
    const gst = gstMap[item.NAME] ?? item.GST ?? 0;
    return { ...item, GST: gst };
  });

  fs.writeFileSync(jsonPath, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`✅ GST updated in ${updated.length} items.`);
}

updateGSTFromTally();
