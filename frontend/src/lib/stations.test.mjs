import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFastDc, mappableStations, standardLabel, vehicleLabel } from './stations.js';

const station = (overrides) => ({
  id: 'evs_0000000001',
  latitude: 12.9,
  longitude: 77.5,
  max_kw_by_standard: { TYPE2_AC: 7.4 },
  vehicle_classes: ['car', 'two_three_wheeler'],
  ...overrides,
});

test('isFastDc needs a CCS2 or CHAdeMO gun of at least 50 kW', () => {
  assert.equal(isFastDc(station({ max_kw_by_standard: { CCS2: 60 } })), true);
  assert.equal(isFastDc(station({ max_kw_by_standard: { CHADEMO: 50 } })), true);
  assert.equal(isFastDc(station({ max_kw_by_standard: { CCS2: 30, TYPE2_AC: 22 } })), false);
  assert.equal(isFastDc(station({ max_kw_by_standard: { TYPE2_AC: 60 } })), false, 'AC is never fast DC');
});

test('mappableStations drops stations without finite coordinates', () => {
  const kept = mappableStations([
    station({ id: 'a' }),
    station({ id: 'b', latitude: null }),
    station({ id: 'c', longitude: Number.NaN }),
    station({ id: 'd', latitude: '12.9' }),
  ]);
  assert.deepEqual(kept.map((s) => s.id), ['a']);
});

test('labels for standards and vehicle classes', () => {
  assert.equal(standardLabel('CCS2'), 'CCS2');
  assert.equal(standardLabel('LEV_AC'), 'LEV AC');
  assert.equal(standardLabel('UNKNOWN_X'), 'UNKNOWN_X');
  assert.equal(vehicleLabel(['two_three_wheeler']), '2W/3W only');
  assert.equal(vehicleLabel(['car', 'two_three_wheeler']), 'Cars and 2W/3W');
  assert.equal(vehicleLabel(['car']), 'Cars');
});
