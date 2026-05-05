const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('https://wordhtml.vercel.app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click editor and type lots of content to make it grow
  const editor = await page.locator('[role="textbox"]').first();
  await editor.click();
  
  // Type many paragraphs
  for (let i = 0; i < 30; i++) {
    await editor.press('Enter');
    await editor.type('บรรทัดที่ ' + (i + 1) + ' ทดสอบเนื้อหายาวๆ เพื่อให้เอกสารยาวเกิน 1 หน้าและดูว่า ruler แนวตั้งขยายตามหรือไม่');
  }
  
  await page.waitForTimeout(1000);
  
  // Screenshot after adding content (full page)
  await page.screenshot({ path: 'ruler-long.png', fullPage: true });
  console.log('Long content screenshot saved');
  
  // Scroll container to middle and screenshot
  const container = await page.locator('.overflow-auto').first();
  await container.evaluate(el => el.scrollTop = 500);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'ruler-scrolled.png', fullPage: false });
  console.log('Scrolled screenshot saved');
  
  await browser.close();
})();
