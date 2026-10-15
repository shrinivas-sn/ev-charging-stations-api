import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDatasetSummary, resolveSiteUrl } from './dataset-summary.mjs';

const meta = JSON.parse(readFileSync(new URL('../../backend/data/meta.json', import.meta.url), 'utf8'));
const stations = JSON.parse(readFileSync(new URL('../../backend/data/stations.json', import.meta.url), 'utf8'));

function undefinedPaths(value, prefix = '') {
  if (value === undefined) return [prefix];
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, v]) => undefinedPaths(v, prefix ? `${prefix}.${key}` : key));
}

test('every number on the site comes from backend/data', () => {
  const summary = buildDatasetSummary({ apiBaseUrl: 'https://example.com' });
  assert.equal(summary.totalStations, meta.counts.stations);
  assert.equal(summary.totalChargers, meta.counts.chargers);
  assert.equal(summary.totalStates, meta.counts.states);
  assert.equal(summary.totalOperators, meta.counts.operators);
  assert.equal(summary.suspectLocations, meta.counts.suspect_locations);
  assert.equal(
    summary.twoThreeWheelerOnlyStations,
    stations.filter((s) => s.vehicle_classes.length === 1 && s.vehicle_classes[0] === 'two_three_wheeler').length
  );
  assert.equal(summary.attribution, meta.attribution);
  assert.equal(summary.snapshotLabel, meta.source.snapshot_label);
  assert.equal(summary.topStates.reduce((n, s) => n + s.stations, 0) <= meta.counts.stations, true);
  assert.equal(summary.connectors.length, 7);
});

test('the summary has no undefined fields', () => {
  const summary = buildDatasetSummary({ apiBaseUrl: null });
  assert.deepEqual(undefinedPaths(summary), []);
});

test('the example station is a real car fast-charging station with a good location', () => {
  const { exampleStation } = buildDatasetSummary();
  assert.match(exampleStation.id, /^evs_[0-9a-f]{10}$/);
  assert.equal(exampleStation.location_quality, 'ok');
  assert.ok((exampleStation.max_kw_by_standard.CCS2 || 0) >= 50);
});

test('SITE_URL resolves to an origin, and an invalid one is an error', () => {
  assert.equal(resolveSiteUrl({ SITE_URL: 'https://ev.example.com/path' }), 'https://ev.example.com');
  assert.equal(resolveSiteUrl({}, {}), null);
  assert.throws(() => resolveSiteUrl({ SITE_URL: 'not a url' }));
});
