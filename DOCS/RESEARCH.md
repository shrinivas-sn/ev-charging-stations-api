# Candidate: India EV Charging Station Directory API

Date: 2026-09-25
Researched by: api-idea-scout (discovery mode, deep research via subagent)

## Idea

A free, keyless REST API serving India's electric vehicle public charging station directory:
locations, connector types (CCS-2, Type-2 AC, Bharat DC-001, GB/T, CHAdeMO), power ratings,
operator details, and state/district/city classification. Static directory data — not
real-time connector availability, which requires live OCPI connections to individual Charge
Point Operators.

With India's EV push (FAME-II, PM E-DRIVE, state policies), 27,000+ public charging stations
exist. Developers building EV route planners, range anxiety calculators, travel apps, and
fleet management tools need structured station data.

## Data source

Primary source:
- **data.gov.in** — Official dataset: "State, District, City and Location wise Electric
  Vehicle (EV) Charging Stations in India" (last updated May 2026). Available in CSV, XLSX,
  and Parquet formats. Contains latitude/longitude, state/district/city, station name,
  charger type, connector rating (kW), total connector count, operator type.

Secondary sources:
- NITI Aayog e-AMRIT portal (`e-amrit.niti.gov.in/getChargingStation`): Keyless JSON
  endpoint, but only 160 legacy stations from 2020-2021.
- BEE EV Yatra portal (`evyatra.beeindia.gov.in`): Consumer app, no developer API.
- OpenStreetMap Overpass: Only 485 stations tagged across all India (very incomplete).
- Open Charge Map: Requires API key, only 299 stations across 6 major metros (<2% coverage).

## License findings

**data.gov.in Government Open Data License (GODL-India):**
> "All users are provided a worldwide, royalty-free, non-exclusive license to use, adapt,
> publish, translate, display, add value, and create derivative works for all lawful
> commercial and non-commercial purposes."

The official dataset on data.gov.in is explicitly GODL-licensed.

Criterion 1 is a clean **pass**.

## Duplication check

**public-apis.io & public-apis GitHub:** Zero results for Indian EV charging.

**Open Charge Map:** Requires API key (403 without it), only ~299 stations in India vs
27,000+ actual. Drastically incomplete for India.

**Google Places API:** Supports `electric_vehicle_charging_station` type but requires billing
account, API key, and pay-per-call pricing. No charging rates or Indian-specific metadata.

**Commercial CPO APIs (Pulse Energy, Ionage, Bolt.Earth, Tata Power EZ Charge):** All require
enterprise B2B partnerships and authenticated APIs.

**PlugShare:** Strictly enterprise licensing. Explicitly rejects non-commercial API access.

**Government endpoints:**
- e-AMRIT: Only 160 stations (legacy pilot data).
- BEE EV Yatra: Consumer app only, no API.

No free, keyless, developer-facing REST API exists for Indian EV charging stations.

Criterion 2 is a clean **pass**.

## Update cadence

The data.gov.in dataset was last updated May 2026. New charging stations are commissioned
continuously as FAME-II/PM E-DRIVE incentives are disbursed. BEE publishes updated station
counts periodically.

No fixed published schedule for dataset updates on data.gov.in. The underlying rate of change
is continuous (new stations weekly), but the open data publication cadence is irregular.

Criterion 3 is **unconfirmed** — active data growth but irregular publication schedule on
data.gov.in.

## Scope sketch

A clean, 5-endpoint v1:
- `GET /v1/stations` — List stations with pagination, filterable by state, city, connector
  type, operator
- `GET /v1/stations/near?lat=28.6&lng=77.2&radius=10` — Geo-radius search
- `GET /v1/stations/{id}` — Station details: connectors, power rating, operator, address
- `GET /v1/states` — State-wise station counts and summary
- `GET /v1/connectors` — Enum of connector types with descriptions

Data volume: ~27,000 stations with ~15 fields each, ~5-10 MB JSON. Comparable to mandi-api
in size. Supabase + periodic ingestion pattern fits.

Criterion 4 is a clean **pass**.

## Scorecard

| # | Criterion | Result |
|---|---|---|
| 1 | Data source exists & is legally redistributable | **pass** — Official data.gov.in dataset under GODL-India explicitly permits redistribution and derivative works |
| 2 | Not already well-served | **pass** — Open Charge Map has <2% India coverage and requires API key; Google Places requires paid key; no free keyless alternative exists |
| 3 | Sane update cadence | **unconfirmed** — Continuous station growth but irregular data.gov.in publication schedule |
| 4 | Buildable v1 scope | **pass** — ~27,000 records, 5 endpoints, geo-search, comparable to mandi-api |
| 5 | Awesome-list submission fit | **pass** — Keyless, CORS-enabled, HTTPS, zero auth |

## Verdict: go

Criteria 1, 2, 5 pass cleanly. Timely idea riding India's EV adoption wave. The data source
is officially GODL-licensed. Main caveat is the unconfirmed update cadence (criterion 3),
which doesn't block the verdict per scoring rules.
