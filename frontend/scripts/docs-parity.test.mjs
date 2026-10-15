import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { PARAMS, ERROR_CODES, ENDPOINTS } from '../src/content/apiReference.js';
import { buildDocExamples } from './dataset-summary.mjs';

const require = createRequire(import.meta.url);
const { SPECS } = require('../../backend/src/lib/params.js');
const meta = require('../../backend/data/meta.json');

test('documented parameters are exactly the parameters each route accepts', () => {
  assert.deepEqual(PARAMS.near.map((p) => p.name).sort(), Object.keys(SPECS.near).sort());
  assert.deepEqual(PARAMS.stations.map((p) => p.name).sort(), Object.keys(SPECS.stations).sort());
  assert.deepEqual(PARAMS.cities.map((p) => p.name).sort(), Object.keys(SPECS.cities).sort());
});

test('every documented endpoint is one the API serves', async () => {
  const served = ['/v1/stations', '/v1/stations/near', '/v1/stations/{id}', '/v1/states', '/v1/cities', '/v1/operators', '/v1/connectors', '/v1/meta', '/v1', '/health'];
  for (const endpoint of ENDPOINTS) assert.ok(served.includes(endpoint.path), endpoint.path);
  assert.equal(new Set(ENDPOINTS.map((e) => e.path)).size, served.length);
});

test('every error code the backend can raise is documented', () => {
  const documented = new Set(ERROR_CODES.map((e) => e.code));
  const sources = ['../../backend/src/lib/params.js', '../../backend/src/lib/errors.js', '../../backend/src/app.js', '../../backend/src/routes/stations.js', '../../backend/src/services/stations-service.js']
    .map((p) => readFileSync(new URL(p, import.meta.url), 'utf8'))
    .join('\n');
  const literal = [...sources.matchAll(/"([A-Z][A-Z_]{5,})"/g)].map((m) => m[1]).filter((c) => !['GET', 'HEAD', 'OPTIONS'].includes(c));
  for (const code of new Set(literal)) assert.ok(documented.has(code), `undocumented error code ${code}`);
  for (const param of ['state', 'district', 'city', 'operator', 'ownership', 'connector', 'vehicle', 'current', 'location_quality']) {
    assert.ok(documented.has(`UNKNOWN_${param.toUpperCase()}`), `UNKNOWN_${param.toUpperCase()}`);
  }
});

test('doc examples are real API responses built from the dataset', () => {
  const examples = buildDocExamples();
  assert.equal(examples.near.request, '/v1/stations/near?lat=12.9716&lng=77.5946&vehicle=car&current=dc&min_power_kw=50&limit=1');
  assert.equal(examples.near.response.success, true);
  assert.equal(examples.near.response.meta.attribution, meta.attribution);
  assert.ok(examples.near.response.meta.total_found > 0);
  assert.match(examples.station.response.data.id, /^evs_[0-9a-f]{10}$/);
  assert.equal(examples.error.status, 400);
  assert.equal(examples.error.response.error.code, 'UNKNOWN_PARAMETER');
  assert.equal(examples.stations.response.data.length, 1);
});

test('no page or guide repeats retired fields or sample-data claims', () => {
  const dirs = ['../src/pages/', '../src/components/', '../src/content/'];
  const banned = [/total_capacity_kw/, /took_ms/, /generated sample/i, /not official Government/i, /data\.gov\.in/, /stations_with_this_connector/, /\bstation\.name\b/, /RateLimit-Remaining/];
  for (const dir of dirs) {
    for (const file of readdirSync(new URL(dir, import.meta.url))) {
      const text = readFileSync(new URL(dir + file, import.meta.url), 'utf8');
      for (const pattern of banned) assert.ok(!pattern.test(text), `${dir}${file} matches ${pattern}`);
    }
  }
  const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const pattern of banned) assert.ok(!pattern.test(template), `index.html matches ${pattern}`);
});
