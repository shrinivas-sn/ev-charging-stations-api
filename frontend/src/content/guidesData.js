export const EV_GUIDES = [
  {
    id: 'building-an-ev-route-planner-in-india',
    title: 'Building an EV route planner: waypoints, connectors and highway stops',
    // Kept short on purpose: search results truncate titles near 60 characters.
    seoTitle: 'Building an EV route planner in India',
    summary:
      'How to sample coordinates along a corridor, query charging hubs with a radius search, and filter for the connector and capacity a vehicle actually needs.',
    readTime: '7 min read',
    category: 'Architecture',
    content: `
## Overview
A route planner does not need every station in a state. It needs the small set of stations near the corridor the driver will actually travel, filtered to the connectors the vehicle can accept.

This guide uses \`/v1/stations/near\` and \`/v1/stations\` to build that set. Start the API locally with \`npm start\`; it listens on port 3000.

## 1. Sampling waypoints along a corridor
Take the decoded polyline of the route, step along it every 40–60 km, and run one radius query per sample. The API sorts by distance, so the first result is the closest option to that waypoint.

\`\`\`javascript
const BASE_URL = 'http://localhost:3000'; // your deployment URL in production

async function findChargingStops(waypoints, radiusKm = 15) {
  const stops = [];

  for (const point of waypoints) {
    const url = new URL(BASE_URL + '/v1/stations/near');
    url.searchParams.set('lat', point.lat);
    url.searchParams.set('lng', point.lng);
    url.searchParams.set('radius', radiusKm);
    url.searchParams.set('limit', '10');

    const response = await fetch(url);
    const json = await response.json();

    if (!json.success) {
      // Validation failures return 400 with error.code and error.details.
      throw new Error(json.error.code + ': ' + json.error.message);
    }

    // Only stations that can actually charge the vehicle.
    const usable = json.data.filter((station) =>
      station.connectors.some((connector) => connector.type === 'CCS-2')
    );

    if (usable.length > 0) stops.push(usable[0]);
  }

  return stops;
}
\`\`\`

## 2. Filter on the server, not in the browser
Because the API returns only the nearest \`limit\` stations, filtering afterwards can hide valid matches further out. Pass the constraint to the API instead:

\`\`\`javascript
const url = new URL(BASE_URL + '/v1/stations/near');
url.searchParams.set('lat', '12.9716');
url.searchParams.set('lng', '77.5946');
url.searchParams.set('radius', '25');
url.searchParams.set('connector', 'CCS-2');   // CCS-2, CCS 2 and ccs2 all work
url.searchParams.set('min_power_kw', '100');   // total station capacity
\`\`\`

## 3. Which connector does the vehicle need?
- **Passenger EVs** (Tata, MG, Mahindra, Hyundai, BYD): \`CCS-2\` for DC fast charging, \`Type-2 AC\` for destination charging.
- **Fleet 2W / 3W**: usually \`Bharat DC-001\` (15 kW, low-voltage DC) or \`Bharat AC-001\` for slow public sockets.

Each station record lists its connector mix, so compatibility can be checked exactly rather than inferred from a category.
    `,
  },
  {
    id: 'understanding-indian-ev-connector-standards',
    title: 'Understanding Indian EV connector standards: CCS-2, Type-2, Bharat DC-001',
    seoTitle: 'Indian EV connector standards explained',
    summary:
      'A comparison of the charging protocols deployed in India, their ratings, the standards behind them and which vehicles use them.',
    readTime: '6 min read',
    category: 'Specifications',
    content: `
## Two tracks of charging
India runs a dual-track charging landscape: global high-voltage DC standards adopted by passenger cars, and indigenous low-voltage standards designed for light electric vehicles.

The machine-readable version of all of this is available from \`/v1/connectors\`, including how many stations in the current dataset expose each connector.

### 1. CCS Type 2 (Combo 2)
- **Standard:** IS 17017-1 / IEC 62196-3
- **Current:** DC
- **Power range:** roughly 30 kW to 350 kW
- **Vehicles:** electric cars and SUVs, commercial vans, heavy commercial vehicles

### 2. Type 2 (Mennekes) AC
- **Standard:** IS 17017-1 / IEC 62196-2
- **Current:** AC
- **Power range:** 7.4 kW to 22 kW
- **Vehicles:** destination charging for cars, and 2-wheelers with an adapter

### 3. Bharat DC-001
- **Standard:** AIS 138-1 (Bureau of Indian Standards)
- **Current:** low-voltage DC
- **Rating:** 15 kW at 48–72 V
- **Vehicles:** electric 2-wheelers, 3-wheelers and entry-level fleet cars

### 4. Bharat AC-001
- **Standard:** AIS 138-2
- **Current:** AC
- **Rating:** three sockets of 3.3 kW, 10 kW total
- **Vehicles:** public parking and metro park-and-ride charging for 2W and 3W

### Standards that are documented but not deployed here
GB/T (GB/T 20234.3) and CHAdeMO are listed in \`/v1/connectors\` for reference. No station in the bundled dataset exposes either connector, and the endpoint reports \`stations_with_this_connector: 0\` for them rather than implying coverage.
    `,
  },
  {
    id: 'integrating-ev-charging-api-in-python-and-nodejs',
    title: 'Integrating the API in Python and Node.js',
    seoTitle: 'Integrating the API in Python and Node.js',
    summary:
      'Dependency-light examples for radius search, filtered directory queries and state aggregates, including error envelopes and retry handling.',
    readTime: '5 min read',
    category: 'Integration',
    content: `
## Getting started
There is no registration, no API key and no CORS configuration to do. Every response uses the same envelope: \`success\`, \`data\` and \`meta\` on the way in, and \`success\` plus \`error { code, message, details }\` on the way out.

\`/v1\` lists every endpoint if you need to discover them at runtime.

## Node.js: radius search
\`\`\`javascript
const BASE_URL = 'http://localhost:3000'; // your deployment URL in production

async function getNearestChargers(lat = 28.6139, lng = 77.209) {
  const url = new URL(BASE_URL + '/v1/stations/near');
  url.searchParams.set('lat', lat);
  url.searchParams.set('lng', lng);
  url.searchParams.set('radius', '10');
  url.searchParams.set('limit', '5');

  const response = await fetch(url);
  const json = await response.json();

  if (!response.ok) {
    // 400 invalid parameter, 404 station not found, 429 rate limited.
    throw new Error(json.error.code + ': ' + json.error.message);
  }

  console.log(json.meta.count + ' stations within ' + json.meta.radius_km + ' km');
  for (const station of json.data) {
    console.log(station.name, station.operator, station.distance_km + ' km');
    console.log('  ' + station.connectors.map((c) => c.type + ' ' + c.power_kw + ' kW').join(', '));
  }
}

getNearestChargers();
\`\`\`

## Handling the rate limit
Requests are limited per client address and each response carries \`RateLimit-Remaining\` and \`RateLimit-Reset\`. A \`429\` also includes \`Retry-After\` in seconds — wait for it rather than retrying immediately.

\`\`\`javascript
async function getJson(url, attempt = 0) {
  const response = await fetch(url);
  if (response.status === 429 && attempt < 3) {
    const wait = Number(response.headers.get('retry-after') || 5);
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
    return getJson(url, attempt + 1);
  }
  return response.json();
}
\`\`\`

## Python: paginated directory
\`\`\`python
import requests

BASE_URL = "http://localhost:3000"  # your deployment URL in production

def get_state_stations(state="Karnataka", limit=10):
    response = requests.get(
        f"{BASE_URL}/v1/stations",
        params={"state": state, "limit": limit},
        timeout=10,
    )
    response.raise_for_status()
    payload = response.json()

    if not payload["success"]:
        raise RuntimeError(payload["error"]["code"])

    meta = payload["meta"]
    print(f"{meta['total']} stations in {state} ({meta['total_pages']} pages)")

    for station in payload["data"]:
        print(f"[{station['id']}] {station['name']} - {station['total_capacity_kw']} kW")

get_state_stations()
\`\`\`

## Type handlers
\`city\` and \`state\` accept padded and mixed-case input, and \`connector\` accepts common spellings such as \`CCS2\` or \`CCS 2\`. A value that matches nothing returns \`400\` with the accepted options in \`error.details.expected\` rather than an empty result set.
    `,
  },
];
