/**
 * Shoot preview/light.jpg + preview/dark.jpg through the official market facade.
 *
 * 1440x900, deviceScaleFactor 1, JPEG q85 — byte-for-byte the format the
 * dsh-web scripts/capture-previews writes. Uses the installed Chrome so no
 * Chromium download is needed.
 */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const PLAYWRIGHT = 'E:/dev-state/npm-global/node_modules/playwright';
const { chromium } = require(PLAYWRIGHT);

const FACADE = process.argv[2];
const OUT = process.argv[3];
const SKIN = process.argv[4] || 'lucy-nightsignal';

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json',
};

function serve(root) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      const file = path.normalize(path.join(root, url === '/' ? 'preview.html' : url));
      if (!file.startsWith(path.normalize(root))) {
        res.writeHead(403);
        return res.end('forbidden');
      }
      fs.readFile(file, (err, buf) => {
        if (err) {
          res.writeHead(404);
          return res.end('not found');
        }
        res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
        res.end(buf);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { server, base } = await serve(FACADE);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', (err) => console.log('[pageerror]', String(err).slice(0, 200)));

  for (const theme of ['light', 'dark']) {
    const url = `${base}/preview.html?skin=${SKIN}&theme=${theme}&chrome=0`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForFunction(() => {
      const err = document.getElementById('skinErr');
      if (err && err.style.display === 'block') return true;
      return document.documentElement.dataset.dshSkin !== undefined;
    }, undefined, { timeout: 20000 });
    const errText = await page.evaluate(() => {
      const el = document.getElementById('skinErr');
      return el && el.style.display === 'block' ? el.textContent : null;
    });
    if (errText) throw new Error(`${theme}: ${errText}`);
    await page.waitForFunction(() => {
      const layer = document.getElementById('skin-backdrop');
      const img = layer && layer.querySelector('img');
      return !img || (img.complete && img.naturalWidth > 0);
    }, undefined, { timeout: 20000 });
    await page.waitForTimeout(500);
    const probe = await page.evaluate(() => {
      const layer = document.getElementById('skin-backdrop');
      const img = layer && layer.querySelector('img');
      const root = document.getElementById('root');
      return {
        skin: document.documentElement.dataset.dshSkin,
        dark: document.body.hasAttribute('data-ds-dark-theme'),
        backdrop: img ? { src: img.getAttribute('src'), w: img.naturalWidth, h: img.naturalHeight } : null,
        rootBackground: root ? getComputedStyle(root).backgroundColor : 'no-root',
        leftLayer: getComputedStyle(document.body, '::before').backgroundImage.slice(0, 90),
      };
    });
    console.log(theme, JSON.stringify(probe));
    await page.screenshot({ path: path.join(OUT, `${theme}.jpg`), type: 'jpeg', quality: 85 });
    console.log('wrote', path.join(OUT, `${theme}.jpg`));
  }

  await browser.close();
  server.close();
})().catch((err) => {
  console.error('FACADE CAPTURE FAILED:', err);
  process.exit(1);
});
