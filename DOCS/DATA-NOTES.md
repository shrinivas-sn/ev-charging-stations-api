# Data notes

What the dataset is, where it comes from, and every known problem in the source.
Numbers are from `backend/data/meta.json` as built on 15/10/2026.

## Source and attribution

- **Publisher:** Bureau of Energy Efficiency (BEE), Ministry of Power, Government of India.
- **File:** "EV Public Charging Stations Data till 26th October 2025" —
  `http://beeindia.gov.in/WriteReadData/RTF1984/EV_PCS_Data_29277.pdf`, linked from
  [BEE's EV page](http://beeindia.gov.in/show_content.php?lang=1&level=2&ls_id=345&lid=67).
  1,159 pages, created from Excel on 17 Feb 2026, sha256 `f519218f…b6882` (full value in `backend/data/source.json`).
- **Licence:** BEE publishes no licence for this file. This project republishes it with attribution on
  every API response and page:

  > Data: Bureau of Energy Efficiency (BEE), Ministry of Power, Government of India — "EV Public
  > Charging Stations Data till 26th October 2025". Republished with attribution; not an official BEE service.

- **Not data.gov.in.** data.gov.in only has state and city totals (Rajya Sabha answers). No
  station-level EV dataset exists there.

## How rows become stations

- The PDF has **one row per charger**: 39,641 rows.
- Rows with the same operator and the same coordinates form one **station**: 29,184 stations,
  39,640 chargers, 44,065 connectors (guns).
- Identical rows are real: one site can list many identical chargers. The largest is a Reliance BP site
  in Faridabad with 274 chargers. Identical rows become one charger entry with a `count`.
- Station ids are `evs_` + the first 10 hex digits of `sha1("<operator>|<lat 6dp>|<lng 6dp>")`, so a
  station keeps its id when BEE adds other stations.

## Power: what a vehicle actually gets

- "Charger Rating" is the charger's total. "Connector Rating" is per gun. A Bharat AC-001 charger is
  10 kW total but gives each vehicle 3.3 kW, so the API reports **gun power** (`guns[].kw`,
  `max_power_kw`, `max_kw_by_standard`), and `min_power_kw` filters on it.
- Combo chargers list one rating per gun, joined by `+` (e.g. `60+60+22` on a CCS2 + CHAdeMO + Type 2
  charger, 245 rows). These map to guns in the order the standards are named.
- `Combo(CCS-II+Type-II)` with `30+30+22` (7 rows) has three guns and two standards. The last gun is
  read as the Type 2 (22 kW AC) and the first two as CCS2 (30 kW DC). This is the only shape where
  this rule applies; any other mismatch is rejected (`RATING_MISMATCH`).

## Vehicle classes

From MoP's charging-infrastructure guidelines (Annexure II/III, linked in
`backend/data/reference/connector-standards.json`):

- CCS2 and CHAdeMO serve cars (4W).
- Type 2 AC, Bharat AC-001 and Bharat DC-001 serve 4W, 3W and 2W.
- Light-EV (LEV) AC and DC charge points serve two- and three-wheelers.
- **14,788 stations (51%) serve only two/three-wheelers.** 14,396 stations have at least one gun usable
  by a car; 4,455 give a car at least 50 kW DC.
- Bharat DC-001 has a 48 V variant (all vehicle classes) and a 72 V-or-higher variant (cars). The PDF
  does not say which, so both classes are listed.

## Known source problems (kept as published, flagged where possible)

| Problem | Count | How it is handled |
|---|---|---|
| Longitude equals latitude (copy error) | 104 stations (IOCL mostly) | `location_quality: "suspect"`; excluded from radius search and the map |
| Coordinates outside India's bounds | 11 stations | same as above (115 suspect in total) |
| Excel overflow `###########` instead of a longitude | 1 row | rejected (`backend/data/rejects.json`) |
| Same station listed with different district/city spellings | 65 stations | first row's values kept; `mixed_admin: true` |
| City column holds a locality or landmark (e.g. "OPP TO SIMLA DHABA,HARIHAR TALUK"), mostly BPCL | about 6,000 stations have BPCL-style `City=…, District=…` addresses | kept as published; use `state` + `district`, or radius search |
| Districts that do not match the address (e.g. Manesar under Faridabad) | not counted | kept as published |
| The same city name in several states (e.g. Kota in AP, RJ, UP) | 90 names | `city` filter returns all; add `state` to narrow |
| Operator names split by line wraps ("CORPORAT ION OF CHENNAI") | 6 names | rejoined in `backend/data/reference/operators.json`; "TN Golf Federatrio n" is published as "TN Golf Federation" (typo corrected) |
| State spelling variants ("KERALA", "Uttrakhand", "UT OF D&NH AND D&D") | 46 spellings for 36 states/UTs | mapped to ISO 3166-2:IN names and codes |
| Charger type spelling variants ("CCS", "CCS-II", "CHAdeMo", …) | 19 spellings for 7 standards | mapped in `connector-standards.json` |

## Not in the source

- Real-time availability or charger status.
- Prices, payment or booking.
- Opening hours.
- Update schedule: BEE publishes a new PDF irregularly. A weekly GitHub workflow checks BEE's page and
  opens an issue when the linked file changes.

## Rebuilding

```bash
bash ingest/fetch_bee_pdf.sh                          # download into ingest/cache/
python -m venv ingest/.venv && ingest/.venv/bin/pip install -r ingest/requirements.txt
ingest/.venv/bin/python -I ingest/extract_bee_pdf.py ingest/cache/EV_PCS_Data_29277.pdf ingest/out/raw-rows.json
npm run build-data                                    # writes backend/data/*.json
npm test
```

On Windows, use `ingest\.venv\Scripts\python` instead of `ingest/.venv/bin/python`.
