// Renders public/og-image.png (1200x630) from the real dataset counts and the palette.
// Run after the dataset changes:
//   npm install --no-save puppeteer-core && node scripts/og-image.mjs
// It drives an installed Chrome or Edge; set CHROME_PATH if neither default path exists.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { palette } from '../src/lib/palette.js';

const root = new URL('..', import.meta.url);
const meta = JSON.parse(readFileSync(new URL('../backend/data/meta.json', root), 'utf8'));
const stations = JSON.parse(readFileSync(new URL('../backend/data/stations.json', root), 'utf8'));
const carFastDc = stations.filter((s) =>
  Object.entries(s.max_kw_by_standard).some(([id, kw]) => (id === 'CCS2' || id === 'CHADEMO') && kw >= 50)
).length;
const fmt = (n) => n.toLocaleString('en-IN');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: ${palette.canvas}; color: ${palette.ink};
    font-family: "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif; padding: 72px 80px; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 16px; font-size: 26px; font-weight: 600; }
  .mark { width: 52px; height: 52px; border-radius: 12px; background: ${palette.ink}; display: grid; place-items: center; }
  h1 { margin-top: 56px; font-size: 64px; line-height: 1.08; letter-spacing: -0.02em; max-width: 980px; }
  p { margin-top: 22px; font-size: 28px; color: ${palette.muted}; max-width: 980px; line-height: 1.35; }
  .stats { margin-top: auto; display: flex; gap: 16px; }
  .stat { background: ${palette.surface}; border: 1px solid ${palette.line}; border-radius: 12px; padding: 16px 22px; }
  .stat b { display: block; font-size: 34px; }
  .stat span { font-size: 20px; color: ${palette.muted}; }
  .stat.fast { background: ${palette.accent}; border-color: ${palette.accent}; }
  .stat.fast span { color: ${palette.ink}; }
</style></head><body>
  <div class="brand"><div class="mark"><svg viewBox="0 0 100 100" width="34" height="34"><path d="M57 16 29 55h19l-5 29 28-39H52l5-29Z" fill="${palette.accent}"/></svg></div>India EV Charging Station Directory API</div>
  <h1>Which charging stations can your vehicle actually use?</h1>
  <p>Keyless REST API over the Bureau of Energy Efficiency's public charging station list, ${meta.source.snapshot_label}.</p>
  <div class="stats">
    <div class="stat"><b>${fmt(meta.counts.stations)}</b><span>stations</span></div>
    <div class="stat"><b>${fmt(meta.counts.chargers)}</b><span>chargers</span></div>
    <div class="stat fast"><b>${fmt(carFastDc)}</b><span>car fast-DC stations (≥ 50 kW)</span></div>
    <div class="stat"><b>${meta.counts.states}</b><span>states &amp; UTs</span></div>
  </div>
</body></html>`;

const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) throw new Error('No Chrome or Edge found; set CHROME_PATH.');

const { default: puppeteer } = await import('puppeteer-core');
const browser = await puppeteer.launch({ executablePath, headless: 'new' });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  const out = fileURLToPath(new URL('public/og-image.png', root));
  await page.screenshot({ path: out, type: 'png' });
  console.log(`wrote ${out}`);
} finally {
  await browser.close();
}
