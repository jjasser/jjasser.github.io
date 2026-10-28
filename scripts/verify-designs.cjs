// Run with Playwright available on NODE_PATH, or JASSER_NODE_MODULES pointing to its package directory.
const { chromium } = require(process.env.JASSER_NODE_MODULES ? require('node:path').join(process.env.JASSER_NODE_MODULES, 'playwright') : 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.JASSER_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const output = path.resolve('design-previews');
  await fs.mkdir(output, { recursive: true });
  const results = [];
  try {
    for (const [index, design] of ['atlas', 'cipher', 'folio', 'fieldnotes', 'signal'].entries()) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(`http://localhost:1313/?design=${design}`, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      assert.equal(await page.locator('html').getAttribute('data-design'), design);
      assert.equal(await page.locator('.hero:visible').count(), 1);
      assert.equal(await page.locator('.post-card').count(), 3);
      assert.equal(await page.locator('.design-dock [aria-current]').count(), 1);
      const images = await page.locator('img:visible').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0));
      assert(images, `${design}: profile photos should load`);
      await page.screenshot({ path: path.join(output, `${index + 1}-${design}-desktop.png`), fullPage: true, style: '.design-dock { visibility: hidden !important; }' });
      await page.setViewportSize({ width: 390, height: 844 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${design}: mobile homepage overflow`);
      await page.screenshot({ path: path.join(output, `${index + 1}-${design}-mobile.png`), fullPage: true, style: '.design-dock { visibility: hidden !important; }' });
      await page.locator('.post-card h3 a').first().click();
      await page.waitForLoadState('networkidle');
      assert.equal(await page.locator('html').getAttribute('data-design'), design);
      assert.equal(await page.locator('.reader h1').count(), 1);
      assert(await page.locator('.prose').innerText(), `${design}: article body renders`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${design}: mobile article overflow`);
      // The original content links Part 1 using a slug different from its filename.
      // Test only navigation owned by this theme; content remains unmodified.
      await page.locator('.site-header nav a').filter({ hasText: 'About' }).click();
      await page.waitForLoadState('networkidle');
      assert.equal(await page.locator('html').getAttribute('data-design'), design);
      assert((await page.locator('.prose').innerText()).includes('holistic approach'));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${design}: mobile About overflow`);
      await page.locator('.design-dock a').filter({ hasText: 'Cipher' }).click();
      await page.waitForLoadState('networkidle');
      assert.equal(await page.locator('html').getAttribute('data-design'), 'cipher');
      assert(page.url().includes('/about/'), 'Design switching should preserve the current page');
      assert.deepEqual(errors, [], `${design}: browser errors`);
      results.push({ design, desktop: '1440px', mobile: '390px', home: 'pass', article: 'pass', about: 'pass', switcher: 'pass', errors });
      await page.close();
    }
    const comparison = await browser.newPage({ viewport: { width: 1680, height: 1320 }, deviceScaleFactor: 1 });
    const comparisonResponse = await comparison.goto('http://localhost:1313/compare/', { waitUntil: 'networkidle' });
    assert.equal(comparisonResponse.status(), 200);
    assert.equal(await comparison.locator('.option').count(), 5);
    await comparison.screenshot({ path: path.join(output, 'five-designs.png'), fullPage: true });
    await comparison.close();
    await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify(results, null, 2) + '\n');
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
