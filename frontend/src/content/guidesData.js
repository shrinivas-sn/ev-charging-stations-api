export const EV_GUIDES = [
  {
    id: "building-an-ev-route-planner-in-india",
    title: "Building an EV Route Planner in India: Distance, Connectors & Highway Stops",
    summary: "Architectural guide to querying charging hubs, calculating buffer ranges, and filtering by CCS-2 fast chargers along Indian national highway corridors.",
    readTime: "7 min read",
    category: "Architecture",
    content: `
## Overview
Building an Electric Vehicle (EV) route planner for Indian highways requires accounting for diverse connector protocols (CCS-2 for 4-wheelers vs. Bharat DC-001 for commercial fleets), variable power delivery (30kW vs 60kW vs 120kW DC fast chargers), and spatial waypoint filtering.

This guide walks through using the \`/v1/stations/near\` and \`/v1/stations\` endpoints to compute optimal charging waypoints along a corridor such as the Bengaluru–Chennai or Mumbai–Pune expressway.

## 1. Waypoint Radius Querying
Instead of querying all stations state-wide, a routing algorithm samples coordinates along an encoded polyline every 40–60 kilometers:

\`\`\`javascript
async function findHighwayChargingStops(waypoints, radiusKm = 10) {
  const stops = [];
  for (const point of waypoints) {
    const url = \`https://ev-charging-stations-api.vercel.app/v1/stations/near?lat=\${point.lat}&lng=\${point.lng}&radius=\${radiusKm}&limit=5\`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.success && json.data.length > 0) {
      // Prioritize high-capacity CCS-2 fast chargers
      const fastCharger = json.data.find(s => s.total_capacity_kw >= 60) || json.data[0];
      stops.push(fastCharger);
    }
  }
  return stops;
}
\`\`\`

## 2. Power and Connector Verification
Always verify connector compatibility before displaying a waypoint to drivers. In India:
- **Private Passenger EVs (Tata Nexon, MG ZS, Mahindra XUV400, BYD):** Require \`CCS-2\` for DC fast charging and \`Type-2 AC\` for destination charging.
- **Fleet 2W/3W:** Frequently rely on \`Bharat DC-001\` (15kW/72V) or standard 3-pin 15A / \`Bharat AC-001\`.

The API explicitly returns connector configurations per station so you can filter out incompatible plugs programmatically.
    `
  },
  {
    id: "understanding-indian-ev-connector-standards",
    title: "Understanding Indian EV Connector Standards: CCS-2, Type-2, Bharat DC-001 & GB/T",
    summary: "A technical comparison of charging protocols, voltage specifications, Bureau of Indian Standards (BIS) regulations, and vehicle compatibility in India.",
    readTime: "6 min read",
    category: "Specifications",
    content: `
## The Indian EV Connector Landscape
India's EV ecosystem features a dual-track charging infrastructure: global high-voltage DC standards adopted by passenger cars and indigenous low-voltage standards developed for light electric vehicles.

### 1. CCS Type 2 (Combo 2)
- **Standard:** IS 17017-1 / IEC 62196-3
- **Current:** DC Fast Charging
- **Typical Power:** 30 kW to 240 kW (200V - 1000V DC)
- **Deployment:** The undisputed national standard for passenger electric cars, commercial delivery vans, and high-speed highway corridors.

### 2. Type 2 (Mennekes) AC
- **Standard:** IS 17017-1 / IEC 62196-2
- **Current:** AC Single-phase (7.4 kW) & Three-phase (11 kW - 22 kW)
- **Deployment:** Standard destination chargers in residential apartments, shopping malls, and office complexes.

### 3. Bharat DC-001
- **Standard:** AIS 138-1 (Bureau of Indian Standards)
- **Current:** DC Low-Voltage (15 kW, 48V–72V)
- **Deployment:** Developed under FAME-I for affordable electric two-wheelers, three-wheelers, and entry fleet sedans (e.g. legacy Mahindra eVerito, Tata Tigor EV Xpres-T).

### 4. Bharat AC-001
- **Standard:** AIS 138-2
- **Current:** 3-output AC station (10 kW total, 3 x 3.3 kW sockets)
- **Deployment:** Municipal parking spaces, metro station park-and-ride lots.
    `
  },
  {
    id: "integrating-ev-charging-api-in-python-and-nodejs",
    title: "Integrating the India EV Charging Station API in Python and Node.js",
    summary: "Zero-dependency, production-ready code examples for consuming stations, geo-proximity queries, and state aggregates with retry logic and error envelopes.",
    readTime: "5 min read",
    category: "Integration",
    content: `
## Getting Started
The India EV Charging Station Directory API requires **zero registration, no API keys, and open CORS**. All responses follow the canonical envelope structure.

### Node.js Example (Proximity Search)

\`\`\`javascript
// Fetch nearest public EV chargers around Connaught Place, New Delhi
async function getNearestChargers(lat = 28.6315, lng = 77.2167) {
  const url = new URL('https://ev-charging-stations-api.vercel.app/v1/stations/near');
  url.searchParams.set('lat', lat);
  url.searchParams.set('lng', lng);
  url.searchParams.set('radius', '10');
  url.searchParams.set('limit', '5');

  const response = await fetch(url);
  const json = await response.json();

  if (!json.success) {
    throw new Error(\`API Error [\${json.error.code}]: \${json.error.message}\`);
  }

  console.log(\`Found \${json.meta.count} stations within \${json.meta.radius_km} km:\`);
  for (const station of json.data) {
    console.log(\`- \${station.name} (\${station.operator}) - \${station.distance_km} km away\`);
    console.log(\`  Connectors: \${station.connectors.map(c => \`\${c.type} (\${c.power_kw}kW)\`).join(', ')}\`);
  }
}

getNearestChargers();
\`\`\`

### Python Example (State Directory)

\`\`\`python
import requests

def get_karnataka_stations(city="Bengaluru", limit=10):
    url = "https://ev-charging-stations-api.vercel.app/v1/stations"
    params = {
        "state": "Karnataka",
        "city": city,
        "limit": limit
    }
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    payload = response.json()
    
    if payload.get("success"):
        stations = payload["data"]
        meta = payload["meta"]
        print(f"Total stations in {city}: {meta['total']}")
        for s in stations:
            print(f"[{s['id']}] {s['name']} - {s['operator']} ({s['total_capacity_kw']} kW)")

if __name__ == "__main__":
    get_karnataka_stations()
\`\`\`
    `
  }
];
