const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const { chromium } = require(process.env.JASSER_NODE_MODULES ? path.join(process.env.JASSER_NODE_MODULES, 'playwright') : 'playwright');
const root = path.resolve(__dirname, '..');
const origin = process.env.JASSER_PREVIEW_URL || 'http://localhost:1316';
const output = path.join(root, 'validation', 'typography');
const routes = ['/', '/about/', '/post/ai-security-series-part2/', '/post/ai-security-series-part3/'];
const presets = { subtle: [17, 12, 17, 14], balanced: [18, 13, 18, 15], generous: [20, 14, 19, 16] };
const tones = { slate: '#43524c', charcoal: '#36443d', ink: '#29382f' };
const blocks = text => [...text.replace(/\r\n/g, '\n').matchAll(/^(\x60{3}|~{3})[^\n]*\n([\s\S]*?)^\1[ \t]*$/gm)].map(m => m[2]);
function contrast(a, b) {
  const light = h => {
    const rgb = h.match(/[a-f0-9]{2}/gi).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  const [hi, lo] = [light(a), light(b)].sort((a, b) => b - a);
  return (hi + .05) / (lo + .05);
}
(async () => {
  await fs.mkdir(output, { recursive: true });
  const report = { cases: [], interactions: [], source: [], contrast: {}, errors: [] };
  for (const [name, hex] of Object.entries(tones)) {
    const ratio = contrast(hex, '#f7f7f0');
    assert(ratio >= 7);
    report.contrast[name] = +ratio.toFixed(2);
  }
  for (const file of ['ai-security-series-part2.md', 'ai-security-series-part3.md']) {
    const location = 'content/post/' + file;
    const previous = cp.execFileSync('git', ['show', 'HEAD:' + location], { cwd: root, encoding: 'utf8', windowsHide: true });
    const current = await fs.readFile(path.join(root, location), 'utf8');
    const normalized = text => blocks(text).join('\n').split('\n').map(x => x.trimEnd()).filter(x => x.trim() && !x.startsWith('- '));
    assert.deepEqual(normalized(current), normalized(previous), file + ': command or payload changed');
    for (const block of blocks(current)) {
      assert(!block.trimEnd().endsWith('\\'), file + ': incomplete continued command');
      for (const heredoc of block.matchAll(/<<\s*'([^']+)'/g)) assert(block.split('\n').includes(heredoc[1]), 'Missing heredoc terminator');
    }
    report.source.push({ file, previousBlocks: blocks(previous).length, currentBlocks: blocks(current).length, codePreserved: true });
  }
  const browser = await chromium.launch({ headless: true, ...(process.env.JASSER_CHROME ? { executablePath: process.env.JASSER_CHROME } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
    page.on('requestfailed', r => report.errors.push(r.url() + ': ' + r.failure()?.errorText));
    for (const route of routes) {
      assert.equal((await page.goto(origin + route, { waitUntil: 'networkidle' })).status(), 200);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const [size, expected] of Object.entries(presets)) {
          await page.locator('[data-size="' + size + '"]').click();
          for (const [tone, hex] of Object.entries(tones)) {
            await page.locator('[data-tone="' + tone + '"]').click();
            const measurements = await page.evaluate(() => {
              const font = selector => { const el = document.querySelector(selector); return el ? parseFloat(getComputedStyle(el).fontSize) : null; };
              const rectangles = [...document.querySelectorAll('.focus-topics li')].map(el => { const r = el.getBoundingClientRect(); return { top: r.top, overflowing: el.scrollWidth > el.clientWidth }; });
              const header = document.querySelector('.site-header');
              const a = header.querySelector('.identity').getBoundingClientRect(), b = header.querySelector('nav').getBoundingClientRect();
              return {
                overflowing: document.documentElement.scrollWidth > innerWidth,
                overlap: a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top,
                name: font('.identity-name'), caption: font('.portrait-caption'),
                body: font('.prose') || font('.hero-description'), code: font('.prose pre code'),
                muted: getComputedStyle(document.documentElement).getPropertyValue('--muted').trim(),
                rectangles, images: [...document.images].every(i => i.complete && i.naturalWidth > 0)
              };
            });
            const context = route + ' ' + width + ' ' + size + '/' + tone;
            assert(!measurements.overflowing, context + ': page overflow');
            assert(!measurements.overlap, context + ': header overlap');
            assert.equal(measurements.name, expected[0], context + ': name');
            if (measurements.caption) assert.equal(measurements.caption, expected[1], context + ': caption');
            assert.equal(measurements.body, expected[2], context + ': body');
            if (measurements.code) assert.equal(measurements.code, expected[3], context + ': code');
            assert.equal(measurements.muted, hex);
            assert(measurements.images, context + ': image');
            if (measurements.rectangles.length) {
              assert.equal(measurements.rectangles.length, 3);
              assert(measurements.rectangles.every(r => Math.abs(r.top - measurements.rectangles[0].top) < 1 && !r.overflowing), context + ': focus label layout');
            }
            report.cases.push({ route, width, size, tone, result: 'passed' });
          }
        }
      }
      console.log('Checked 36 typography combinations: ' + route);
    }
    await page.goto(origin + '/?typeSize=generous&typeTone=ink');
    await page.locator('.site-header nav a').filter({ hasText: 'About' }).click();
    assert.equal(new URL(page.url()).pathname, '/about/');
    assert.equal(await page.locator('html').getAttribute('data-type-size'), 'generous');
    assert.equal(await page.locator('html').getAttribute('data-type-tone'), 'ink');
    assert(!(await page.locator('main').innerText()).includes('Security Automation'));
    assert((await page.locator('main').innerText()).includes('systems, including architecture'));
    await page.reload();
    assert.equal(await page.locator('[data-size="generous"]').getAttribute('aria-pressed'), 'true');
    await page.locator('.type-preview-reset').click();
    assert.equal(await page.locator('html').getAttribute('data-type-size'), 'balanced');
    assert.equal(await page.locator('html').getAttribute('data-type-tone'), 'ink');
    await page.locator('.type-preview summary').click();
    assert.equal(await page.locator('.type-preview details').getAttribute('open'), null);
    await page.locator('.type-preview summary').focus();
    await page.keyboard.press('Enter');
    assert.notEqual(await page.locator('.type-preview details').getAttribute('open'), null);
    await page.locator('[data-size="subtle"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('html').getAttribute('data-type-size'), 'subtle');
    report.interactions.push('native navigation and reload preserve selection', 'recommended reset', 'keyboard-operated buttons and collapsible panel', 'About wording');
    const fresh = await browser.newContext();
    const shared = await fresh.newPage();
    await shared.goto(origin + '/post/ai-security-series-part3/?typeSize=subtle&typeTone=slate');
    assert.equal(await shared.locator('[data-tone="slate"]').getAttribute('aria-pressed'), 'true');
    await shared.goto(origin + '/?typeSize=invalid&typeTone=invalid');
    assert.equal(await shared.locator('html').getAttribute('data-type-size'), 'balanced');
    await fresh.close();
    const blocked = await browser.newContext();
    await blocked.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } }); });
    const fallback = await blocked.newPage();
    await fallback.goto(origin + '/?typeSize=generous&typeTone=ink');
    await fallback.locator('.site-header nav a').filter({ hasText: 'About' }).click();
    assert.equal(await fallback.locator('html').getAttribute('data-type-size'), 'generous');
    await blocked.close();
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const staticPage = await noJs.newPage();
    await staticPage.goto(origin);
    assert(await staticPage.locator('.type-preview-fallback').isVisible());
    await staticPage.locator('.site-header nav a').filter({ hasText: 'Writing' }).click();
    assert.equal(await staticPage.locator('.post-card').count(), 4);
    await noJs.close();
    report.interactions.push('shareable preset links', 'invalid preset defaults', 'navigation without localStorage', 'no-JavaScript fallback');
    await page.setViewportSize({ width: 1440, height: 1100 });
    for (const size of Object.keys(presets)) {
      await page.goto(origin + '/?typeSize=' + size + '&typeTone=charcoal', { waitUntil: 'networkidle' });
      await page.screenshot({ path: path.join(output, size + '-desktop.png'), fullPage: true });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + '/?typeSize=balanced&typeTone=charcoal', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(output, 'balanced-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(origin + '/about/?typeSize=balanced&typeTone=charcoal', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(output, 'about-desktop.png'), fullPage: true });
    await page.goto(origin + '/post/ai-security-series-part3/?typeSize=balanced&typeTone=charcoal', { waitUntil: 'networkidle' });
    await page.locator('#recon-and-normal-behavior').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'code-desktop.png') });
    assert.deepEqual(report.errors, []);
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log('PASS: ' + report.cases.length + ' typography/layout checks; ' + report.interactions.length + ' interaction checks.');
    console.log(JSON.stringify({ source: report.source, contrast: report.contrast }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

