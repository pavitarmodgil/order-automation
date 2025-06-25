const fs = require('fs');
const path = require('path');
const http = require('http');

const TALLY_PORT = 9000;
const TALLY_HOST = '127.0.0.1';

// Input: XML request filenames (must be in backend/data/)
const requestFiles = [
  { file: 'get_stockitems.xml', out: 'stockitems.xml' },
  { file: 'get_pricelist.xml', out: 'pricelist.xml' }
];

// Helper to send XML to Tally
const postToTally = (xml, cb) => {
  const options = {
    hostname: TALLY_HOST,
    port: TALLY_PORT,
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      'Content-Length': Buffer.byteLength(xml)
    }
  };

  const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => (data += chunk));
    res.on('end', () => cb(null, data));
  });

  req.on('error', err => cb(err));
  req.write(xml);
  req.end();
};

// Run for each file
(async () => {
  for (const { file, out } of requestFiles) {
    const reqPath = path.join(__dirname, '..', 'data', file);
    const resPath = path.join(__dirname, '..', 'data', out);

    if (!fs.existsSync(reqPath)) {
      console.warn(`⚠️ Request file missing: ${file}`);
      continue;
    }

    const xml = fs.readFileSync(reqPath, 'utf8');

    console.log(`📤 Sending ${file} to Tally...`);
    postToTally(xml, (err, responseXml) => {
      if (err) {
        console.error(`❌ Failed to fetch ${file}:`, err.message);
        return;
      }

      fs.writeFileSync(resPath, responseXml);
      console.log(`✅ Saved response to ${out}`);
    });
  }
})();
