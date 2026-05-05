const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Cache-Control': 'no-cache' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

(async () => {
  // Check HTML for export/import buttons
  const r1 = await fetch('https://wordhtml.vercel.app');
  const hasExportBtn = r1.body.includes('title="ส่งออกทั้งหมดเป็นไฟล์ JSON"') || 
                       r1.body.includes('ส่งออก') ||
                       r1.body.includes('exportAllTemplates');
  const hasImportBtn = r1.body.includes('title="นำเข้าจากไฟล์ JSON"') ||
                       r1.body.includes('นำเข้า');
  
  console.log('HTML checks:');
  console.log('  Has export button:', hasExportBtn);
  console.log('  Has import button:', hasImportBtn);
  
  // Search all JS chunks for template export patterns
  const chunks = r1.body.match(/_next\/static\/chunks\/[^\s"]+\.js/g) || [];
  let foundExportCode = false;
  let foundImportCode = false;
  
  for (const chunk of chunks) {
    const path = chunk.startsWith('/') ? chunk : '/' + chunk;
    const url = 'https://wordhtml.vercel.app' + path;
    const r = await fetch(url);
    // Look for minified patterns of export/import code
    if (r.body.includes('wordhtml-templates-') && r.body.includes('exportedAt')) foundExportCode = true;
    if (r.body.includes('templates') && r.body.includes('Array.isArray') && r.body.includes('pageSetup')) foundImportCode = true;
    if (r.body.includes('marginLeftMm')) foundImportCode = true; // reuse flag
  }
  
  console.log('\nJS checks:');
  console.log('  Found export code pattern:', foundExportCode);
  console.log('  Found import code pattern:', foundImportCode);
})();
