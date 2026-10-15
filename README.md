# India EV Charging Station Directory API

> Free, keyless, open REST API providing developer access to India's public electric vehicle (EV) charging stations, connectors, and power ratings.

[![Status](https://img.shields.io/badge/status-active-emerald.svg)](https://ev-charging-stations-api.vercel.app/status)
[![License: GODL-India](https://img.shields.io/badge/license-GODL--India-blue.svg)](https://data.gov.in/godl)
[![Auth: None](https://img.shields.io/badge/auth-none-success.svg)](#)
[![CORS: Enabled](https://img.shields.io/badge/cors-enabled-brightgreen.svg)](#)

## Overview

India has over 27,000 public electric vehicle charging stations across states and national highways. However, developers building EV route planners, range anxiety calculators, navigation tools, and fleet software have had no free, keyless, open REST API to query this data.

This project packages official data from the **Ministry of Power / Bureau of Energy Efficiency (BEE)** published on [data.gov.in](https://data.gov.in) into a production-grade, zero-authentication REST API with great-circle proximity search, state breakdowns, and connector standard dictionaries.

- **Base URL:** `https://ev-charging-stations-api.vercel.app`
- **Interactive Documentation:** [https://ev-charging-stations-api.vercel.app/docs](https://ev-charging-stations-api.vercel.app/docs)
- **Station Playground:** [https://ev-charging-stations-api.vercel.app/playground](https://ev-charging-stations-api.vercel.app/playground)

---

## Core Endpoints

All responses follow the canonical envelope structure:
```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "count": 25, "total": 27248, "page": 1, "limit": 25 }
}
```

### 1. Spatial Proximity Search
Find chargers within a kilometer radius around any coordinate in India.

```bash
curl -s "https://ev-charging-stations-api.vercel.app/v1/stations/near?lat=12.9716&lng=77.5946&radius=10&limit=5"
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lat` | float | **Yes** | Latitude (-90 to 90) |
| `lng` | float | **Yes** | Longitude (-180 to 180) |
| `radius` | float | No | Radius in kilometers (default: 10, max: 100) |
| `limit` | integer | No | Maximum results (default: 25, max: 100) |

### 2. Station Directory & Filtering
Paginated list of all 27,000+ public charging stations.

```bash
curl -s "https://ev-charging-stations-api.vercel.app/v1/stations?state=Karnataka&city=Bengaluru&min_power_kw=60&limit=10"
```

| Parameter | Type | Description |
|---|---|---|
| `state` | string | Full state name (`Karnataka`) or state code (`KA`) |
| `city` | string | City name (`Bengaluru`, `Mumbai`, `Delhi`) |
| `operator` | string | CPO name (`Tata Power`, `Jio-bp`, `Statiq`, `Ather`) |
| `connector` | string | Connector standard (`CCS-2`, `Type-2 AC`, `Bharat DC-001`) |
| `min_power_kw` | number | Minimum power capacity in kW |
| `page` / `limit` | integer | Pagination controls |

### 3. Station Detail Lookup
Detailed record with connector counts, address, and coordinates.

```bash
curl -s "https://ev-charging-stations-api.vercel.app/v1/stations/1"
```

### 4. State Aggregates
Summary statistics across all 36 Indian States and Union Territories.

```bash
curl -s "https://ev-charging-stations-api.vercel.app/v1/states"
```

### 5. Connector Dictionary
Reference catalog of Indian charging standards (IS 17017, AIS 138), voltage limits, and compatible vehicles.

```bash
curl -s "https://ev-charging-stations-api.vercel.app/v1/connectors"
```

### 6. Health Check
```bash
curl -s "https://ev-charging-stations-api.vercel.app/health"
```

---

## Connector Standards in India

| Standard | Current | Typical Power | Compatible Vehicles |
|---|---|---|---|
| **CCS Type 2** | DC | 30 kW – 240 kW | Electric 4-wheelers (Tata, Mahindra, MG, Hyundai, BYD) |
| **Type 2 AC** | AC | 7.4 kW – 22 kW | Destination charging for 4W and select 2W |
| **Bharat DC-001** | DC (Low Volt) | 15 kW (72V) | Commercial 2-wheelers, 3-wheelers, entry fleet sedans |
| **Bharat AC-001** | AC | 10 kW (3x3.3kW) | Municipal public parking sockets for 2W/3W |
| **GB/T** | DC | 60 kW – 150 kW | Electric state transport buses and commercial trucks |

---

## Local Development

```bash
# Clone the repository
git clone https://github.com/shrinivas-sn/ev-charging-stations-api.git
cd ev-charging-stations-api

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Run automated backend test suite
npm test

# Build frontend and SSG prerender
npm run build

# Start local server
npm start
# Server listens on http://localhost:3000
```

---

## License & Attribution

- **Data Source:** [Open Government Data (data.gov.in)](https://data.gov.in) — Ministry of Power / Bureau of Energy Efficiency.
- **Data License:** [Government Open Data License - India (GODL-India)](https://data.gov.in/godl).
- **Code License:** MIT License.
