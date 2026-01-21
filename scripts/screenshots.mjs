import { chromium, devices } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';

const root = path.resolve(process.cwd());
const outDir = path.join(root, '.playwright-screenshots');

const pages = [
  { name: 'home', file: 'index.html' },
  { name: 'about', file: 'about/index.html' },
  { name: 'services', file: 'services/index.html' },
  { name: 'industries', file: 'industries/index.html' },
  { name: 'healthcare', file: 'industries/healthcare/index.html' },
  { name: 'public-sector', file: 'industries/public-sector/index.html' },
  { name: 'products', file: 'products/index.html' },
  { name: 'referral', file: 'products/referral-management/index.html' },
  { name: 'appeals', file: 'products/appeals-grievances/index.html' },
  { name: 'partners', file: 'partners/index.html' },
  { name: 'news', file: 'news/index.html' },
  { name: 'careers', file: 'careers/index.html' },
  { name: 'contact', file: 'contact/index.html' },
  { name: '404', file: '404.html' }
];

const viewports = [
  { name: 'mobile', ...devices['iPhone 13'] },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }
];

function fileUrl(rel) {
  const abs = path.join(root, rel);
  // Ensure correct file:// URL on Windows/WSL paths
  const urlPath = abs.split(path.sep).join('/');
  return 'file://' + urlPath;
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function warmLazyLoad(page) {
  // Many pages use loading="lazy". Full-page screenshots can capture before
  // those images ever intersect. Scroll through once to trigger loading.
  await page.evaluate(() => {
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
      try {
        img.setAttribute('loading', 'eager');
      } catch (e) {
        // ignore
      }
    });
  });

  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const step = Math.max(400, Math.floor(window.innerHeight * 0.85));
    const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    for (let y = 0; y <= max; y += step) {
      window.scrollTo(0, y);
      await sleep(60);
    }
    window.scrollTo(0, 0);
  });

  // Wait for images to finish loading (best-effort).
  await page.waitForFunction(() => {
    const imgs = Array.from(document.images || []);
    return imgs.every((img) => img.complete && img.naturalWidth > 0);
  }, { timeout: 15_000 }).catch(() => {});

  await page.waitForTimeout(200);
}

async function main() {
  await ensureDir(outDir);

  const browser = await chromium.launch();
  try {
    for (const vp of viewports) {
      const context = await browser.newContext(vp);
      const page = await context.newPage();

      // Reduce flakiness
      page.setDefaultTimeout(30_000);

      for (const p of pages) {
        const url = fileUrl(p.file);
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForTimeout(150); // allow fonts/layout settle
        await warmLazyLoad(page);

        // Full page screenshot
        const fullPath = path.join(outDir, `${p.name}-${vp.name}-full.png`);
        await page.screenshot({ path: fullPath, fullPage: true });

        // Above-the-fold
        const foldPath = path.join(outDir, `${p.name}-${vp.name}.png`);
        await page.screenshot({ path: foldPath, fullPage: false });

        // Mobile menu open state (catch nav regressions)
        if (vp.name === 'mobile') {
          const toggle = await page.$('[data-nav-toggle]');
          if (toggle) {
            await toggle.click();
            await page.waitForTimeout(200);
            const menuPath = path.join(outDir, `${p.name}-${vp.name}-menu.png`);
            await page.screenshot({ path: menuPath, fullPage: false });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(100);
          }
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`Saved screenshots to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

