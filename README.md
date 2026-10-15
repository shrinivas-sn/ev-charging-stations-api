# India EV Charging Station Directory API

A keyless REST API over the Bureau of Energy Efficiency's list of public EV charging stations in
India: radius search around a coordinate, per-gun power, connector, vehicle, city and state filters.
The dataset holds 29,184 stations and 39,640 chargers from BEE's list published till 26 October 2025.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./package.json)
[![Auth: none](https://img.shields.io/badge/auth-none-success)]()
[![CORS: open](https://img.shields.io/badge/cors-open-brightgreen)]()
[![Data: BEE, till 26 Oct 2025](https://img.shields.io/badge/data-BEE%20till%2026%20Oct%202025-blue)](DOCS/DATA-NOTES.md)

## Attribution

> Data: Bureau of Energy Efficiency (BEE), Ministry of Power, Government of India — "EV Public Charging Stations Data till 26th October 2025". Republished with attribution; not an official BEE service.

Every response carries this string in `meta.attribution`. BEE publishes no licence for this file; it is
republished with attribution.

## Quick start

Base URL `https://ev-charging-stations-api.vercel.app`. No key, no sign-up, CORS open.

```bash
# Nearest station where a car can draw at least 50 kW DC, from central Bengaluru
curl -s "https://ev-charging-stations-api.vercel.app/v1/stations/near?lat=12.9716&lng=77.5946&vehicle=car&current=dc&min_power_kw=50"

# Two- and three-wheeler charging points in Pune
curl -s "https://ev-charging-stations-api.vercel.app/v1/stations?city=Pune&vehicle=two_three_wheeler"

# CCS2 stations in Kerala
curl -s "https://ev-charging-stations-api.vercel.app/v1/stations?state=KL&connector=CCS2"
```

## Endpoints

Every route is a `GET` returning JSON.

| Endpoint | Query parameters | Returns |
|---|---|---|
| `GET /v1/stations/near` | `lat`, `lng`, `radius`, filters, `page`, `limit` | Stations within a radius of a point, nearest first. Never returns stations with suspect coordinates. |
| `GET /v1/stations` | filters, `location_quality`, `page`, `limit` | The full directory with filters and paging. |
| `GET /v1/stations/{id}` | — | One station, including the PDF pages it came from. |
| `GET /v1/states` | — | Stations, chargers, DC stations and car fast-DC stations per state and union territory. |
| `GET /v1/cities` | `state` | Cities and localities with stations, with their district and station count. |
| `GET /v1/operators` | — | Charge point operators with ownership and station counts. |
| `GET /v1/connectors` | — | Charging standards: AC or DC, vehicles served, source, and station counts. |
| `GET /v1/meta` | — | Source, attribution, snapshot and dataset counts. |
| `GET /v1` | — | Endpoint index and the active rate limit. |
| `GET /health` | — | Liveness check. |

## Filters

`state`, `city`, `operator`, `connector`, `vehicle`, `current` and `min_power_kw` apply to
`/v1/stations` and `/v1/stations/near`.

- `vehicle`: `car` or `two_three_wheeler`.
- `current`: `ac` or `dc`.
- `connector`: `CCS2`, `CHADEMO`, `TYPE2_AC`, `BHARAT_AC001`, `BHARAT_DC001`, `LEV_AC`, `LEV_DC`;
  common spellings such as `CCS-2` also match.
- `min_power_kw`: 0 to 1000 kW, measured on one gun. A vehicle draws the gun rating, not the charger
  total, so a station whose only fast gun is 30 kW does not match a 50 kW search.
- `state`: name, 2-letter code (`KA`) or ISO code (`IN-KA`).
- `city`: city or locality; former names such as Bangalore or Gurgaon also match.
- `operator`: charge point operator name, case-insensitive.
- `location_quality`: `ok`, `suspect` or `any` (default `any`); `/v1/stations` only.
- `page`: 1-based page number, default 1.
- `limit`: results per page, 1 to 100, default 25.

`connector`, `current`, `vehicle` and `min_power_kw` are checked against one gun at a time: a station
matches only if a single gun satisfies all of them.

## Errors and limits

A failure returns `success: false` with a stable code:

```json
{
  "success": false,
  "error": {
    "code": "UNKNOWN_STATE",
    "message": "No state matches 'NOPE'.",
    "details": { "parameter": "state", "received": "NOPE", "valid_values": [ ... ] }
  }
}
```

| Code | Status | Meaning |
|---|---|---|
| `UNKNOWN_PARAMETER` | 400 | A query parameter this endpoint does not accept. `details.allowed` lists the accepted ones. |
| `INVALID_PARAMETER` | 400 | A value is malformed (hex, exponent, Infinity, a suffix), out of range, or given twice. |
| `MISSING_COORDINATES` | 400 | `lat` or `lng` is missing or empty on `/v1/stations/near`. |
| `INVALID_LATITUDE` | 400 | `lat` is not a plain decimal between -90 and 90. |
| `INVALID_LONGITUDE` | 400 | `lng` is not a plain decimal between -180 and 180. |
| `INVALID_STATION_ID` | 400 | The id is not `evs_` followed by 10 lowercase hex digits. |
| `UNKNOWN_STATE` | 404 | No state or union territory matches. `details.valid_values` lists all 36. |
| `UNKNOWN_DISTRICT` | 404 | No district matches (within the state, if given). `details.hint` points at `/v1/cities`. |
| `UNKNOWN_CITY` | 404 | No city matches (within the state, if given). `details.hint` points at `/v1/cities`. |
| `UNKNOWN_OPERATOR` | 404 | No operator has this name. `details.valid_values` lists them. |
| `UNKNOWN_OWNERSHIP` | 404 | `ownership` is not `govt` or `private`. |
| `UNKNOWN_CONNECTOR` | 404 | Not a charging standard in the dataset. `details.valid_values` lists them. |
| `UNKNOWN_VEHICLE` | 404 | `vehicle` is not `car` or `two_three_wheeler`. |
| `UNKNOWN_CURRENT` | 404 | `current` is not `ac` or `dc`. |
| `UNKNOWN_LOCATION_QUALITY` | 404 | `location_quality` is not `ok`, `suspect` or `any`. |
| `STATION_NOT_FOUND` | 404 | The id is well formed but no station has it. |
| `ROUTE_NOT_FOUND` | 404 | The path is not an endpoint. See `/v1`. |
| `METHOD_NOT_ALLOWED` | 405 | The API is read-only; only `GET`, `HEAD` and `OPTIONS` are accepted. |
| `RATE_LIMIT_EXCEEDED` | 429 | Per-client budget used up. `Retry-After` gives the wait in seconds. |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected failure. The response never includes internal details. |

The budget is 100 requests per 15 minutes per client address, and rate-limit headers stay off cached
responses. Successful responses and 404s are CDN-cacheable for an hour (`s-maxage=3600`,
`stale-while-revalidate=86400`); every other error is `no-store`.

## Data

`backend/data/` holds the dataset built from BEE's PDF (1,159 pages, 39,641 rows):

- 29,184 stations, 39,640 chargers and 44,065 connectors, across 36 states and union territories and
  70 charge point operators.
- 115 stations have impossible coordinates in the source: 104 where BEE copied the longitude into the
  latitude, and 11 outside India's bounds. They are kept and flagged `location_quality: "suspect"`,
  and `/v1/stations/near` never returns them.
- One row was rejected: on page 1082 the longitude cell holds Excel's `###########` overflow marker, so
  the row has no usable coordinate (`backend/data/rejects.json`).

Every known problem in the source, and how it is handled, is in
[DOCS/DATA-NOTES.md](DOCS/DATA-NOTES.md).

## Refreshing the data

1. `bash ingest/fetch_bee_pdf.sh` downloads BEE's PDF into `ingest/cache/`.
2. `python -I ingest/extract_bee_pdf.py ingest/cache/EV_PCS_Data_29277.pdf ingest/out/raw-rows.json`
   reads it and takes about 8 to 14 minutes.
3. `npm run build-data` rewrites `backend/data/`.
4. `npm test` checks the counts, the ids and the attribution.

If BEE's file name changes, pass the new URL as `BEE_PDF_URL=<url> bash ingest/fetch_bee_pdf.sh` and
use the new cached file name in step 2. The weekly `upstream-check` workflow downloads BEE's current
file, compares its sha256 with `backend/data/source.json`, and opens one `upstream-drift` issue when
they differ. It never rewrites data.

## Local development

```bash
npm install
npm --prefix frontend install

npm start                  # API on the port in PORT (default 3000)
npm run dev                # portal, from frontend/, proxying /v1 to the API
```

## Limitations

- No real-time charger availability or occupancy.
- No charging prices, payment or booking.
- No opening hours: the BEE source does not publish them.
- The data is a snapshot of BEE's list till 26 October 2025, not a live feed.

## License

Code: MIT (see `package.json`). The data is republished under the terms in
[Attribution](#attribution).
