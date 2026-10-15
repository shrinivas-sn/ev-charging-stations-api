/** Small, pure helpers for rendering station data from the API. */

const FAST_DC_STANDARDS = ['CCS2', 'CHADEMO'];
export const FAST_DC_KW = 50;

const STANDARD_LABELS = {
  CCS2: 'CCS2',
  CHADEMO: 'CHAdeMO',
  TYPE2_AC: 'Type 2 AC',
  BHARAT_AC001: 'Bharat AC-001',
  BHARAT_DC001: 'Bharat DC-001',
  LEV_AC: 'LEV AC',
  LEV_DC: 'LEV DC',
};

/** A car can fast-charge here: a CCS2 or CHAdeMO gun of at least 50 kW. */
export function isFastDc(station) {
  const byStandard = station.max_kw_by_standard || {};
  return FAST_DC_STANDARDS.some((id) => (byStandard[id] || 0) >= FAST_DC_KW);
}

/** Only stations with numeric, finite coordinates can be drawn on a map. */
export function mappableStations(stations) {
  return stations.filter(
    (s) => typeof s.latitude === 'number' && typeof s.longitude === 'number' && Number.isFinite(s.latitude) && Number.isFinite(s.longitude)
  );
}

export function standardLabel(id) {
  return STANDARD_LABELS[id] || id;
}

export function vehicleLabel(classes = []) {
  const car = classes.includes('car');
  const small = classes.includes('two_three_wheeler');
  if (car && small) return 'Cars and 2W/3W';
  if (car) return 'Cars';
  if (small) return '2W/3W only';
  return 'Vehicle type not stated';
}
