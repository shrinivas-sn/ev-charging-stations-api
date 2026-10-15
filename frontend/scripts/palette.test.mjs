import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapColors, palette } from '../src/lib/palette.js';

function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// The OpenFreeMap positron basemap: background and water (from its style JSON, 15/10/2026).
const MAP_BACKGROUND = '#f2f3f0';
const MAP_WATER = '#c2c8ca';

test('every text pair the UI uses meets WCAG AA (4.5:1)', () => {
  const pairs = [
    ['ink on canvas', palette.ink, palette.canvas],
    ['muted on canvas', palette.muted, palette.canvas],
    ['muted on subtle', palette.muted, palette.subtle],
    ['ink on primary button (amber)', palette.ink, palette.accent],
    ['ink on primary button hover', palette.ink, palette.accentHover],
    ['accent ink on accent soft (chips)', palette.accentInk, palette.accentSoft],
    ['muted on accent soft (selected row)', palette.muted, palette.accentSoft],
    ['danger on white', palette.danger, palette.surface],
    ['danger on danger soft', palette.danger, palette.dangerSoft],
    ['ink on warn soft', palette.ink, palette.warnSoft],
    ['ink on ok soft', palette.ink, palette.okSoft],
    ['code text on code background', palette.subtle, palette.ink],
  ];
  for (const [name, fg, bg] of pairs) assert.ok(contrast(fg, bg) >= 4.5, `${name}: ${contrast(fg, bg).toFixed(2)}`);
});

test('control borders and map markers meet the 3:1 non-text minimum', () => {
  assert.ok(contrast(palette.control, palette.surface) >= 3, 'input border on white');
  for (const bg of [MAP_BACKGROUND, MAP_WATER]) {
    assert.ok(contrast(mapColors.fastStroke, bg) >= 3, `fast marker outline on ${bg}`);
    assert.ok(contrast(mapColors.otherFill, bg) >= 3, `other marker on ${bg}`);
  }
  assert.ok(contrast(mapColors.otherStroke, mapColors.otherFill) >= 3, 'other marker outline');
});

test('amber is never used as a text colour', () => {
  const src = fileURLToPath(new URL('../src/', import.meta.url));
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(jsx?|css)$/.test(name) && /\btext-accent(?![-\w])/.test(readFileSync(full, 'utf8'))) offenders.push(full);
    }
  };
  walk(src);
  assert.deepEqual(offenders, []);
});

test('no colour is defined outside src/lib/palette.js', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const files = ['tailwind.config.js', 'index.html'];
  const walk = (dir) => {
    for (const name of readdirSync(path.join(root, dir))) {
      const rel = path.join(dir, name);
      if (statSync(path.join(root, rel)).isDirectory()) walk(rel);
      else if (/\.(jsx?|css)$/.test(name) && !rel.endsWith(path.join('lib', 'palette.js'))) files.push(rel);
    }
  };
  walk('src');
  const hex = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![\w-])/;
  // index.html's theme-color must equal the canvas colour, the one allowed literal.
  const offenders = files.filter((rel) => {
    const text = readFileSync(path.join(root, rel), 'utf8').replace(`content="${palette.canvas}"`, '');
    return hex.test(text) || /rgba?\(\s*\d/.test(text);
  });
  assert.deepEqual(offenders, []);
});
