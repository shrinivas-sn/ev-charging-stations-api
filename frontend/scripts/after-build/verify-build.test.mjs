// Runs after `npm run build`: checks what the browser will actually receive.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const assets = new URL('../../dist/assets/', import.meta.url);

test('the build exists', () => {
  assert.ok(existsSync(assets), 'run npm run build first');
});

test('MapLibre styles are in the built CSS (popups and controls need them)', () => {
  const css = readdirSync(assets)
    .filter((name) => name.endsWith('.css'))
    .map((name) => readFileSync(new URL(name, assets), 'utf8'))
    .join('\n');
  assert.ok(css.includes('maplibregl-popup-anchor'), 'maplibre-gl.css is not bundled');
  assert.ok(css.includes('maplibregl-ctrl-group'), 'MapLibre control styles are missing');
});
