/**
 * The API contract as documented on the site. scripts/docs-parity.test.mjs checks it
 * against backend/src/lib/params.js, so a parameter cannot be documented that the API
 * rejects, or accepted without being documented.
 */

const FILTER_PARAMS = [
  { name: 'state', type: 'string', notes: 'State or union territory: name, 2-letter code (KA) or ISO code (IN-KA).' },
  { name: 'district', type: 'string', notes: 'District name as published, case- and punctuation-insensitive.' },
  { name: 'city', type: 'string', notes: 'City or locality. Former names such as Bangalore or Gurgaon also match. A name shared by several states returns all of them; add state to narrow.' },
  { name: 'operator', type: 'string', notes: 'Charge point operator, exact name (case-insensitive). See /v1/operators.' },
  { name: 'ownership', type: 'govt | private', notes: 'Government or private operator.' },
  { name: 'connector', type: 'string', notes: 'Charging standard: CCS2, CHADEMO, TYPE2_AC, BHARAT_AC001, BHARAT_DC001, LEV_AC or LEV_DC. Common spellings such as CCS-2 or Type 2 also match.' },
  { name: 'vehicle', type: 'car | two_three_wheeler', notes: 'Stations with a gun this vehicle class can use, per the Ministry of Power charger table.' },
  { name: 'current', type: 'ac | dc', notes: 'AC or DC charging.' },
  { name: 'min_power_kw', type: 'number', notes: 'Minimum power of one gun, in kW (0 to 1000). This is what one vehicle receives, not the charger total.' },
];

const PAGING_PARAMS = [
  { name: 'page', type: 'integer', default: '1', notes: '1-based page number.' },
  { name: 'limit', type: 'integer', default: '25', notes: 'Results per page, 1 to 100.' },
];

export const PARAMS = {
  near: [
    { name: 'lat', type: 'number', required: true, notes: 'Latitude, -90 to 90. Plain decimal only.' },
    { name: 'lng', type: 'number', required: true, notes: 'Longitude, -180 to 180. Plain decimal only.' },
    { name: 'radius', type: 'number', default: '10', notes: 'Kilometres, 0.1 to 100.' },
    ...FILTER_PARAMS,
    ...PAGING_PARAMS,
  ],
  stations: [
    ...FILTER_PARAMS,
    { name: 'location_quality', type: 'ok | suspect | any', default: 'any', notes: 'Filter on the coordinate check. suspect marks stations whose published coordinates are impossible (for example latitude equal to longitude).' },
    ...PAGING_PARAMS,
  ],
  cities: [{ name: 'state', type: 'string', notes: 'Limit the list to one state or union territory.' }],
};

/**
 * One gun condition set: connector, current, vehicle and min_power_kw must all hold
 * for the same gun. This line is quoted on the docs page.
 */
export const GUN_RULE =
  'connector, current, vehicle and min_power_kw are checked against one gun at a time: a station matches only if a single gun meets all of them.';

export const ENDPOINTS = [
  { path: '/v1/stations/near', params: 'lat, lng, radius, filters, page, limit', description: 'Stations within a radius of a point, nearest first. Never returns stations with suspect coordinates.' },
  { path: '/v1/stations', params: 'filters, location_quality, page, limit', description: 'The full directory with filters and paging.' },
  { path: '/v1/stations/{id}', params: '—', description: 'One station, including the PDF pages it came from.' },
  { path: '/v1/states', params: '—', description: 'Stations, chargers, DC stations and car fast-DC stations per state and union territory.' },
  { path: '/v1/cities', params: 'state', description: 'Cities and localities with stations, with their district and station count.' },
  { path: '/v1/operators', params: '—', description: 'Charge point operators with ownership and station counts.' },
  { path: '/v1/connectors', params: '—', description: 'Charging standards: AC or DC, vehicles served, source, and station counts.' },
  { path: '/v1/meta', params: '—', description: 'Source, attribution, snapshot and dataset counts.' },
  { path: '/v1', params: '—', description: 'Endpoint index and the active rate limit.' },
  { path: '/health', params: '—', description: 'Liveness check.' },
];

export const ERROR_CODES = [
  { code: 'UNKNOWN_PARAMETER', status: 400, meaning: 'A query parameter this endpoint does not accept. details.allowed lists the accepted ones.' },
  { code: 'INVALID_PARAMETER', status: 400, meaning: 'A value is malformed (hex, exponent, Infinity, a suffix), out of range, or given twice.' },
  { code: 'MISSING_COORDINATES', status: 400, meaning: 'lat or lng is missing or empty on /v1/stations/near.' },
  { code: 'INVALID_LATITUDE', status: 400, meaning: 'lat is not a plain decimal between -90 and 90.' },
  { code: 'INVALID_LONGITUDE', status: 400, meaning: 'lng is not a plain decimal between -180 and 180.' },
  { code: 'INVALID_STATION_ID', status: 400, meaning: 'The id is not evs_ followed by 10 lowercase hex digits.' },
  { code: 'UNKNOWN_STATE', status: 404, meaning: 'No state or union territory matches. details.valid_values lists all 36.' },
  { code: 'UNKNOWN_DISTRICT', status: 404, meaning: 'No district matches (within the state, if given). details.hint points at /v1/cities.' },
  { code: 'UNKNOWN_CITY', status: 404, meaning: 'No city matches (within the state, if given). details.hint points at /v1/cities.' },
  { code: 'UNKNOWN_OPERATOR', status: 404, meaning: 'No operator has this name. details.valid_values lists them.' },
  { code: 'UNKNOWN_OWNERSHIP', status: 404, meaning: 'ownership is not govt or private.' },
  { code: 'UNKNOWN_CONNECTOR', status: 404, meaning: 'Not a charging standard in the dataset. details.valid_values lists them.' },
  { code: 'UNKNOWN_VEHICLE', status: 404, meaning: 'vehicle is not car or two_three_wheeler.' },
  { code: 'UNKNOWN_CURRENT', status: 404, meaning: 'current is not ac or dc.' },
  { code: 'UNKNOWN_LOCATION_QUALITY', status: 404, meaning: 'location_quality is not ok, suspect or any.' },
  { code: 'STATION_NOT_FOUND', status: 404, meaning: 'The id is well formed but no station has it.' },
  { code: 'ROUTE_NOT_FOUND', status: 404, meaning: 'The path is not an endpoint. See /v1.' },
  { code: 'METHOD_NOT_ALLOWED', status: 405, meaning: 'The API is read-only; only GET, HEAD and OPTIONS are accepted.' },
  { code: 'RATE_LIMIT_EXCEEDED', status: 429, meaning: 'Per-client budget used up. Retry-After gives the wait in seconds.' },
  { code: 'INTERNAL_SERVER_ERROR', status: 500, meaning: 'Unexpected failure. The response never includes internal details.' },
];
