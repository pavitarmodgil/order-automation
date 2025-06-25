// backend/utils/syncItemsFromTally.js
const fs    = require('fs');
const path  = require('path');
const xml2js = require('xml2js');

async function syncItems() {
  const dataDir  = path.join(__dirname, '..', 'data');
  const stockXml = fs.readFileSync(path.join(dataDir, 'stockitems.xml'), 'utf8');
  const priceXml = fs.readFileSync(path.join(dataDir, 'pricelist.xml'),  'utf8');

  // 1) Parse stockitems.xml for NAME & UNIT
  const stockDoc = await xml2js.parseStringPromise(stockXml, { explicitArray: false });
  const rawStock = stockDoc.ENVELOPE.BODY.IMPORTDATA.REQUESTDATA.TALLYMESSAGE;
  const stockMsgs = [].concat(rawStock).filter(m => m.STOCKITEM);
  const unitMap = {};
  stockMsgs.forEach(m => {
    const item = m.STOCKITEM;
    const name = item.$.NAME.trim();
    unitMap[name] = item.BASEUNITS || item.BASEUNITS?._ || '';
  });

  // 2) Parse pricelist.xml for NAME & RATE
  const priceDoc = await xml2js.parseStringPromise(priceXml, { explicitArray: false });
  const names = [].concat(priceDoc.ENVELOPE.DSPACCNAME).map(n => n.DSPDISPNAME);
  const infos = [].concat(priceDoc.ENVELOPE.DSPSTKINFO).map(i => parseFloat(i.DSPSTKCL?.DSPCLRATE) || 0);

  // 3) Merge into array
  const items = names.map((name, i) => ({
    NAME:  name.trim(),
    RATE:  infos[i] || 0,
    UNIT:  unitMap[name.trim()] || '',
    GST:   0    // placeholder; will fill next
  }));

  // 4) Write items.json
  const outPath = path.join(dataDir, 'items.json');
  fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
  console.log(`✅ Generated ${items.length} items in items.json`);
}

syncItems().catch(err => {
  console.error('❌ syncItems error:', err);
  process.exit(1);
});
