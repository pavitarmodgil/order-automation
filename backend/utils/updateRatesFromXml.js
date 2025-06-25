// backend/utils/updateRatesFromXml.js
const fs    = require('fs');
const path  = require('path');
const xml2js = require('xml2js');

// 1) Paths
const xmlPath  = path.join(__dirname, '..', 'data', 'pricelist.xml');
const jsonPath = path.join(__dirname, '..', 'data', 'items.json');

// 2) Helper to normalize names for matching
function normalize(str) {
  return str
    ?.toString()
    .replace(/\u00A0/g, ' ')     // non‑breaking → regular space
    .replace(/\s+/g, ' ')        // collapse multi‑spaces
    .trim()
    .toLowerCase();
}

// 3) Load current items.json
let items;
try {
  items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
} catch (e) {
  console.error('❌ Could not read items.json:', e.message);
  process.exit(1);
}

// 4) Parse your pricelist.xml
const xml = fs.readFileSync(xmlPath, 'utf8');
xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
  if (err) {
    console.error('❌ Could not parse pricelist.xml:', err.message);
    process.exit(1);
  }

  // The XML is a flat list of alternating DSPACCNAME and STKANALINFO
  const namesRaw  = [].concat(result.ENVELOPE.DSPACCNAME || []);
  const infosRaw  = [].concat(result.ENVELOPE.STKANALINFO || []);
  let updated = 0;

  namesRaw.forEach((entry, idx) => {
    const nameRaw  = entry.DSPDISPNAME;
    const priceRaw = infosRaw[idx]?.STKMOUT?.STKOUTPRICE;

    // Normalize + parse
    const nameNorm  = normalize(nameRaw);
    const newPrice  = parseFloat(priceRaw) || 0;
    if (!nameNorm || !newPrice) return;

    // Find the matching item in items.json
    const item = items.find(i => normalize(i.NAME) === nameNorm);
    if (item) {
      item.RATE = newPrice;
      updated++;
    } else {
      console.warn(`⚠️ No match for "${nameRaw}"`);
    }
  });

  // 5) Write back
  fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2), 'utf8');
  console.log(`✅ Updated ${updated} item rate(s) in items.json.`);
});
