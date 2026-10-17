export const EV_GUIDES = [
  {
    id: 'building-an-ev-route-planner-in-india',
    title: 'Building an EV route planner: charging stops a car can actually use',
    // Kept short on purpose: search results truncate titles near 60 characters.
    seoTitle: 'Building an EV route planner in India',
    summary:
      'Sample waypoints along a route, query each with a radius search, and keep only stations where a car gets a fast DC gun — the filters run on the server.',
    readTime: '6 min read',
    category: 'Architecture',
    content: `
## Overview
A route planner needs the few stations near the road the driver will take, and only those the car can use. Half of the stations on BEE's list serve only two- and three-wheelers, so filtering by vehicle is not optional.

This guide uses \`/v1/stations/near\`. Every filter below runs on the server, so \`total_found\` and paging reflect exactly what the car can use.

## 1. One radius query per waypoint
Step along the route's polyline every 40–60 km and run one query per point. \`vehicle=car\`, \`current=dc\` and \`min_power_kw=50\` are checked against a single gun, so a station with a slow AC point and a 30 kW DC gun does not slip through a 50 kW search.

\`\`\`javascript
const BASE_URL = 'https://ev-charging-stations-api.vercel.app';

async function fastStopsNear(point, radiusKm = 25) {
  const url = new URL(BASE_URL + '/v1/stations/near');
  url.searchParams.set('lat', point.lat);
  url.searchParams.set('lng', point.lng);
  url.searchParams.set('radius', radiusKm);
  url.searchParams.set('vehicle', 'car');
  url.searchParams.set('current', 'dc');
  url.searchParams.set('min_power_kw', 50);
  url.searchParams.set('limit', 5);

  const response = await fetch(url);
  const body = await response.json();
  if (!body.success) throw new Error(body.error.code + ': ' + body.error.message);
  return body.data;
}

// Bengaluru to Mysuru, roughly every 45 km
const waypoints = [
  { lat: 12.9716, lng: 77.5946 },
  { lat: 12.7209, lng: 77.2799 },
  { lat: 12.5223, lng: 76.8970 },
  { lat: 12.2958, lng: 76.6394 },
];

for (const point of waypoints) {
  const stops = await fastStopsNear(point);
  const best = stops[0];
  console.log(point, best ? best.operator + ', ' + best.distance_km + ' km, CCS2 ' + best.max_kw_by_standard.CCS2 + ' kW' : 'no fast DC stop in range');
}
\`\`\`

## 2. Read the power per gun, per standard
\`max_kw_by_standard\` gives the strongest gun for each standard at the station, which is what a car receives. Each charger in \`chargers\` lists its \`guns\` with the standard and power of each one.

## 3. Never route to a suspect location
Radius search never returns stations whose published coordinates are impossible (for example latitude equal to longitude). If you build from \`/v1/stations\` instead, pass \`location_quality=ok\`.

## 4. Gaps are real
If a waypoint returns nothing, widen the radius up to 100 km or relax \`min_power_kw\`. The data has no live availability, so treat a listed station as a candidate, not a guarantee.
`,
  },
  {
    id: 'understanding-indian-ev-connector-standards',
    title: 'Indian EV charging standards: CCS2, Type 2, Bharat AC-001, Bharat DC-001 and LEV',
    seoTitle: 'Indian EV charging standards explained',
    summary:
      'Which charging standards appear on BEE’s station list, whether each is AC or DC, and which vehicles the Ministry of Power lists them for.',
    readTime: '5 min read',
    category: 'Specifications',
    content: `
## Overview
The API reports seven standards. \`/v1/connectors\` returns each one with whether it is AC or DC, the vehicles it serves, its source and how many stations have it.

## Which vehicles each standard serves
From the Ministry of Power charger table (Annexure II and III of the 2022 charging-infrastructure guidelines):

- **CCS2** and **CHAdeMO** — DC fast charging for cars.
- **Type 2 AC** — AC charging for cars, three-wheelers and two-wheelers.
- **Bharat AC-001** — three 3.3 kW AC guns on one 10 kW charger, for cars, three-wheelers and two-wheelers.
- **Bharat DC-001** — low-voltage DC (15 kW); the 48 V version serves all three classes, the 72 V-or-higher version serves cars. BEE does not say which version a station has, so both classes are listed.
- **LEV AC** and **LEV DC** — light-EV charge points for two- and three-wheelers.

## Power belongs to the gun
A charger's total rating is not what a vehicle receives. A Bharat AC-001 charger is 10 kW, but each of its three guns delivers 3.3 kW. Combo chargers list one rating per gun, such as 60 + 60 + 22 kW for CCS2, CHAdeMO and Type 2. The API keeps these per gun, and \`min_power_kw\` filters on them.

\`\`\`bash
curl -s "https://ev-charging-stations-api.vercel.app/v1/connectors"
\`\`\`

## Spellings
\`connector=CCS2\`, \`CCS-2\`, \`ccs 2\` and \`ccs\` all mean the same standard. An unknown value returns \`404 UNKNOWN_CONNECTOR\` with the valid values in \`error.details.valid_values\`.
`,
  },
  {
    id: 'integrating-ev-charging-api-in-python-and-nodejs',
    title: 'Integrating the India EV Charging Station API in Python and Node.js',
    seoTitle: 'Integrating the API in Python and Node.js',
    summary:
      'Paging through results, reading the error envelope, honouring Retry-After on 429, and keeping the BEE attribution — with runnable Node.js and Python.',
    readTime: '5 min read',
    category: 'Integration',
    content: `
## Overview
The API is keyless and read-only. Every response is either \`{ success: true, data, meta }\` or \`{ success: false, error: { code, message, details } }\`, and every success carries \`meta.attribution\`, which you should keep wherever you show the data.

## Node.js: page through a city
\`\`\`javascript
const BASE_URL = 'https://ev-charging-stations-api.vercel.app';

async function getJson(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url);
    if (response.status === 429) {
      const wait = Number(response.headers.get('retry-after') || 60);
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
      continue;
    }
    const body = await response.json();
    if (!body.success) throw new Error(body.error.code + ': ' + body.error.message);
    return body;
  }
  throw new Error('rate limited three times');
}

async function allStations(query) {
  const out = [];
  for (let page = 1; ; page += 1) {
    const body = await getJson(BASE_URL + '/v1/stations?' + query + '&limit=100&page=' + page);
    out.push(...body.data);
    if (page >= body.meta.total_pages) return { stations: out, attribution: body.meta.attribution };
  }
}

const { stations, attribution } = await allStations('city=Kochi&vehicle=car');
console.log(stations.length + ' stations in Kochi with a gun a car can use');
console.log(attribution);
\`\`\`

## Python: fast DC chargers for cars near a point
\`\`\`python
import json
import urllib.error
import urllib.parse
import urllib.request

BASE_URL = "https://ev-charging-stations-api.vercel.app"

params = urllib.parse.urlencode({
    "lat": 28.6139, "lng": 77.2090, "radius": 10,
    "vehicle": "car", "current": "dc", "min_power_kw": 50, "limit": 5,
})
try:
    with urllib.request.urlopen(f"{BASE_URL}/v1/stations/near?{params}") as response:
        body = json.load(response)
except urllib.error.HTTPError as error:
    body = json.load(error)
    raise SystemExit(f"{error.code} {body['error']['code']}: {body['error']['message']}")

for station in body["data"]:
    print(f"{station['distance_km']} km  {station['operator']}  {station['max_power_kw']} kW  {station['address']}")
print(body["meta"]["attribution"])
\`\`\`

## Errors are specific
A misspelled parameter is \`400 UNKNOWN_PARAMETER\` with the accepted names in \`error.details.allowed\`; an unknown value such as \`vehicle=truck\` is \`404 UNKNOWN_VEHICLE\` with \`error.details.valid_values\`. Nothing is silently ignored, so an empty \`data\` array really means no match.
`,
  },
  {
    id: 'bee-ev-charging-station-dataset-access',
    title: 'Accessing Bureau of Energy Efficiency (BEE) EV Charging Data via REST API',
    seoTitle: 'BEE EV charging station dataset via API',
    summary:
      'How India’s central nodal agency (BEE) tracks 29,000+ public EV chargers, how coordinate sanitization works, and how to query the official dataset without scraping PDFs.',
    readTime: '6 min read',
    category: 'Open Data',
    content: `
## Overview
The Bureau of Energy Efficiency (BEE), operating under the Ministry of Power, serves as the central nodal agency for rollout of Public Charging Stations (PCS) across India. BEE periodically releases national master registries detailing operational stations, charger models, and charge point operators (CPOs).

Historically, this data is distributed across unwieldy government PDF tables ("EV Public Charging Stations Data till 26th October 2025") with unformatted addresses and inconsistent coordinate pairs. This keyless REST API ingests, sanitizes, and indexes the entire 29,184-station dataset for direct developer querying.

## 1. What BEE data contains (and what it omits)
BEE's operational station registry provides critical structural parameters:
- **Station Location**: State, district, city, raw address string, and geographic coordinates.
- **Operator Identity**: CPO names including Tata Power, Jio-bp, Ather, Statiq, ChargeZone, and state DISCOMs.
- **Installed Hardware**: Total number of chargers and individual connector guns (CCS2, Type 2, Bharat DC-001, LEV).
- **Power Capacity**: Total rated capacity per station in kilowatts (kW).

However, BEE publishes a static infrastructure census. It does **not** provide live socket occupancy (available vs busy) or dynamic tariff billing. Applications should use this API as an authoritative geospatial directory, not a real-time booking ledger.

## 2. Location sanitization & the location_quality filter
Raw government registries contain human entry errors: typos, swapped latitude/longitude pairs, or coordinate zeros (0.0, 0.0) where GPS reception failed.

The directory API runs continuous spatial geometry validation:
- All stations returned by default or by radius search have passed boundary clipping within the sovereign borders of India.
- When querying the full directory via \`/v1/stations\`, pass \`location_quality=ok\` to automatically exclude stations with unverified or suspect coordinates.

\`\`\`bash
# Query verified stations in Pune with fast DC chargers
curl -s "https://ev-charging-stations-api.vercel.app/v1/stations?city=Pune&current=dc&location_quality=ok&limit=10"
\`\`\`

## 3. Querying by State and District
BEE organizes public charging infrastructure along state-level nodal agencies. You can aggregate and slice infrastructure data programmatically by administrative geography:

\`\`\`javascript
const BASE_URL = 'https://ev-charging-stations-api.vercel.app';

// Fetch summary counts for Karnataka
const response = await fetch(\`\${BASE_URL}/v1/stations?state=Karnataka&limit=1\`);
const { meta } = await response.json();

console.log(\`Total verified charging stations in Karnataka: \${meta.total_found}\`);
console.log(\`Data attribution: \${meta.attribution}\`);
\`\`\`

## 4. Government Attribution Guidelines
Every success response returns an immutable \`meta.attribution\` string citing BEE and the dataset release date. Applications displaying this data must present this attribution note to comply with open government data usage guidelines.
`,
  },
  {
    id: 'building-keyless-ev-charging-map-maplibre',
    title: 'Building a Keyless EV Charging Map with MapLibre GL and OpenFreeMap',
    seoTitle: 'Building a keyless EV charging map',
    summary:
      'Render thousands of Indian EV chargers on a responsive map using open-source MapLibre GL JS and OpenFreeMap vector tiles with zero proprietary API keys.',
    readTime: '7 min read',
    category: 'Architecture',
    content: `
## Overview
Building a nationwide EV charging station locator using proprietary mapping APIs like Google Maps Platform or Mapbox can quickly run up thousands of dollars in tile requests and geocoding bills.

By pairing **MapLibre GL JS** (an open-source WebGL vector map library) with **OpenFreeMap** (free vector map tile hosting) and this keyless EV Charging Station API, you can deploy a zero-cost, high-performance charging map.

## 1. MapLibre GL + OpenFreeMap setup
OpenFreeMap provides production-grade vector tiles hosted on Cloudflare with zero rate limits or registration keys.

\`\`\`html
<!-- Include MapLibre GL CSS & JS -->
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
\`\`\`

Initialize the map container with the OpenFreeMap vector style:

\`\`\`javascript
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const map = new maplibregl.Map({
  container: 'map-container',
  style: 'https://tiles.openfreemap.org/styles/liberty',
  center: [77.5946, 12.9716], // Bengaluru center [lng, lat]
  zoom: 11,
});
\`\`\`

## 2. Converting API radius responses to GeoJSON
When the user pans or searches a location, query \`/v1/stations/near\` and convert the \`data\` array into a standard GeoJSON FeatureCollection:

\`\`\`javascript
async function loadStations(lat, lng, radiusKm = 15) {
  const url = new URL('https://ev-charging-stations-api.vercel.app/v1/stations/near');
  url.searchParams.set('lat', lat);
  url.searchParams.set('lng', lng);
  url.searchParams.set('radius', radiusKm);
  url.searchParams.set('limit', 100);

  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) return null;

  return {
    type: 'FeatureCollection',
    features: json.data.map((station) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [station.coordinates.lng, station.coordinates.lat],
      },
      properties: {
        id: station.id,
        operator: station.operator,
        powerKw: station.max_power_kw,
        hasDc: station.chargers.some((c) => c.current === 'dc'),
        address: station.address,
      },
    })),
  };
}
\`\`\`

## 3. Clustered circle rendering
When displaying hundreds of chargers in dense urban centers like Delhi NCR or Mumbai, render points using MapLibre's native clustering engine so the browser maintains 60 FPS:

\`\`\`javascript
map.on('load', async () => {
  const geojson = await loadStations(12.9716, 77.5946, 25);

  map.addSource('stations', {
    type: 'geojson',
    data: geojson,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  });

  // Cluster circles
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'stations',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': 'teal',
      'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32],
    },
  });

  // Cluster numbers
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'stations',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-size': 12,
    },
    paint: { 'text-color': 'white' },
  });

  // Individual unclustered station points
  map.addLayer({
    id: 'unclustered-point',
    type: 'circle',
    source: 'stations',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['case', ['get', 'hasDc'], 'teal', 'blue'],
      'circle-radius': 7,
      'circle-stroke-width': 2,
      'circle-stroke-color': 'white',
    },
  });
});
\`\`\`

## 4. Mobile responsiveness & touch UX
On mobile devices, ensure gesture interactions (pinch-to-zoom and two-finger drag) do not hijack page scrolling. Add navigation controls with large touch targets (\`min-width: 44px\`) and bind station click popups with full operator and power ratings.
`,
  },
];
