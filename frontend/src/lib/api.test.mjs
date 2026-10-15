import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNearQuery, buildNearPinsQuery } from './api.js';

test('buildNearQuery emits the documented parameters in a fixed order', () => {
  assert.equal(
    buildNearQuery({ lat: 1, lng: 2, radiusKm: 5, vehicle: 'car', page: 2 }),
    '/v1/stations/near?lat=1&lng=2&radius=5&limit=25&vehicle=car&page=2'
  );
  assert.equal(
    buildNearQuery({ lat: 12.97, lng: 77.59, radiusKm: 10, limit: 50, connector: 'CCS2', current: 'dc', vehicle: 'car', minPowerKw: '50' }),
    '/v1/stations/near?lat=12.97&lng=77.59&radius=10&limit=50&connector=CCS2&current=dc&vehicle=car&min_power_kw=50'
  );
});

test('buildNearQuery omits empty filters and page 1', () => {
  assert.equal(
    buildNearQuery({ lat: 1, lng: 2, radiusKm: 5, connector: '', current: '', vehicle: '', minPowerKw: '', page: 1 }),
    '/v1/stations/near?lat=1&lng=2&radius=5&limit=25'
  );
});

test('buildNearPinsQuery formats query for pins endpoint', () => {
  assert.equal(
    buildNearPinsQuery({ lat: 12.97, lng: 77.59, radiusKm: 15, vehicle: 'car', current: 'dc', connector: '', minPowerKw: '' }),
    '/v1/stations/near/pins?lat=12.97&lng=77.59&radius=15&current=dc&vehicle=car'
  );
});
