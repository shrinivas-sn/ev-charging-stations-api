# PLAN — Rebuild on real BEE data

**Written 15/10/2026.** Temporary file — deleted when this closes.

**Goal:** Replace the generated (Math.random) dataset with the real Bureau of Energy Efficiency (BEE) public-charging-station list. Clean up the previous agents' broken changes. Fix every API and frontend defect from the 15/10 review. Prove each feature with tests, then ship through the api-projects pipeline.
**Why:** The owner asked for a real, production-grade API with "actual problem solving for developers and users", built properly after earlier agents faked the data. Owner decisions on 15/10/2026: proceed with BEE attribution (BEE publishes no licence); no production deploy until the real-data version passes every check.
**What this changes:** this repo (`backend/`, `frontend/`, `api/`, a new `ingest/`, `.github/workflows/`, `vercel.json`, `api.json`, `README.md`, `STATUS.md`, `DOCS/`). In the OSC hub (`E:\OSC`, a separate git repo): `api-projects/IDEA-LOG.md`, `api-projects/research/ev-charging-stations.md`, `api-projects/checklists/ev-charging-stations/`, `DOCS/`.
**Done means:** `https://ev-charging-stations-api.vercel.app` serves the BEE-derived dataset from a Mumbai (`bom1`) function, and four gates pass on it: `npm run verify`, the live smoke script, `run-checks.js --stage production` with no FAIL, and `pipeline/builder.js`.
**Out of scope:** public-apis submission (owner-gated, separate step); route/corridor search; bulk GeoJSON/CSV download; full-text search; real-time availability, pricing and booking; a visual redesign (keep the current light design, fix defects only); changes to the shared pipeline, skills or `E:\adapter-ingestion`.

---

## Read this first

1. `cd E:/OSC/api-projects/projects/ev-charging-stations-api && git fetch && git status -sb`. Work only on branch `rebuild/bee-real-data`, never on `main`. **Every push to `main` deploys to production** (see Facts).
2. Read only: `STATUS.md`, this file's **Rules**, your current task and the last **Progress Log** entry. Do not read whole: `backend/data/stations.json` (≈15–20 MB), `DOCS/WORK/2026-10-15/*` (archived history) or the BEE PDF.
3. Detect the environment:

| Check | Command | Pass looks like |
|---|---|---|
| Node | `node -v` | `v20` or later |
| Python | `python --version` | `Python 3.10` or later |
| Branch | `git branch --show-current` | `rebuild/bee-real-data` |
| GitHub CLI | `gh auth status` | `Logged in to github.com` |
| BEE PDF reachable | `curl -s -o /dev/null -w "%{http_code}" -A "Mozilla/5.0" http://beeindia.gov.in/WriteReadData/RTF1984/EV_PCS_Data_29277.pdf` | `200` |
| Tests | `npm test` | `# fail 0` |

4. A task's **Where:** uses search text, not line numbers. If the text is missing, the code moved. Find the equivalent, apply the same intent and log it under **Plan issues**.

## Facts verified while planning

| Fact | Source | Checked on |
|---|---|---|
| The shipped `backend/data/stations.json` is synthetic (28,698 stations from a seeded generator) | `backend/data/meta.json` → `"dataset_status": "generated-sample"`; `backend/scripts/generate-data.js` | 15/10/2026 |
| data.gov.in has **no** station-level EV dataset. All 39 "Charging Stations" catalog entries are state/city aggregates from Rajya Sabha answers | `GET https://api.data.gov.in/lists?filters[title]=Charging` with `DATA_GOV_API_KEY` from `E:\mandi-api\.env` → `total 39`, every `org` = `Rajya Sabha` | 15/10/2026 |
| The real station list is BEE's PDF "EV Public Charging Stations Data till 26th October 2025" | Linked from `http://beeindia.gov.in/show_content.php?lang=1&level=2&ls_id=345&lid=67` (anchor text "EV Public Charging Stations Data till 26th October 2025") → `/WriteReadData/RTF1984/EV_PCS_Data_29277.pdf` | 15/10/2026 |
| PDF facts: 7,942,286 bytes, 1,159 pages, Creator "Microsoft Excel", CreationDate 17 Feb 2026, not encrypted | `pdfinfo` on the downloaded file | 15/10/2026 |
| BEE site: HTTPS connections fail and HTTP works. A browser `User-Agent` is used. `robots.txt` returns an "Access Denied" HTML page | `curl -v https://beeindia.gov.in/` (no TLS handshake); `curl -A "Mozilla/5.0" http://…` → 200 | 15/10/2026 |
| No licence or copyright page could be found on beeindia.gov.in (every common policy path redirects). Owner chose to proceed with attribution | probes of `/en/copyright-policy`, `/copyright-policy`, … → 302; owner answer 15/10/2026 | 15/10/2026 |
| BEE EV Yatra (`evyatra.beeindia.gov.in`) does not answer from here (connect timeout ~21 s, DNS resolves to 180.149.246.11) | `curl -m 45` twice | 15/10/2026 |
| `pdfplumber==0.11.4` `extract_tables()` returns one table per page with 12 columns: CPO Name, Govt/Private, State, District, City/Village, Location, Latitude, Longitude, Types of Chargers Installed/Connector, Charger Rating, Connector Rating, No. of Connector | probe script on pages 1, 2, 581, 1159 | 15/10/2026 |
| Full extraction: 39,641 data rows, all 12 cells wide, ≈13.5 min on this machine | `extract_all.py` run, `rows 39641`, `real 13m35s` | 15/10/2026 |
| The last row on every page has `No. of Connector = None` (1,159 rows). The bottom border of that cell is not drawn, but the digit is in the page text (page 1: word `1` at x≈722, y≈538) | `lastrow.py` probe; `find_tables()[0].rows[-1].cells[-1] is None` | 15/10/2026 |
| 117 rows have longitude == latitude (IOCL 103, HPCL 1, others); no lat/lng swaps; no latitude outside 6–37.5 | `analyse_rows.js` | 15/10/2026 |
| 19 raw charger-type spellings (list in Task 2.2); 70 raw CPO names, some broken by line wraps (`CORPORAT ION OF CHENNAI`); 46 raw state spellings for 36 states/UTs | `analyse_rows.js` | 15/10/2026 |
| Identical rows are real multi-charger sites, not junk (e.g. 192 identical Reliance BP LEV AC rows at one Gurugram address) | `analyse_rows.js` top duplicates | 15/10/2026 |
| 51% of rows (19,622) are 3.3 kW chargers; `LEV AC Charge point` alone is 16,351 rows (two/three-wheeler) | `analyse_rows.js` | 15/10/2026 |
| (operator, lat, lng) gives ≈29.1k–29.4k distinct sites, consistent with the PDF filename "29277" | `analyse_rows.js` distinct counts | 15/10/2026 |
| Installed: express 5.3.0, cors 2.8.6, express-rate-limit 7.5.1, react 18.3.1, vite 5.4.21, maplibre-gl 4.7.1, react-router-dom 6.30.6, tailwindcss 3.4.19 | `node_modules/*/package.json` | 15/10/2026 |
| `maplibre-gl/dist/maplibre-gl.css` exists but is imported nowhere, and the built CSS has 0 `maplibregl-popup-anchor` rules | `grep -rn maplibre-gl.css frontend/src` → none; grep of `frontend/dist/assets/*.css` | 15/10/2026 |
| Production deploys come from Vercel's GitHub integration: a push to `main` creates a Production deployment | `gh api repos/shrinivas-sn/ev-charging-stations-api/deployments` → creator `vercel[bot]`, environment `Production` | 15/10/2026 |
| The live function runs in `iad1`; uncached requests from India take 470–515 ms | `x-vercel-id: bom1::iad1::…`; `curl -w %{time_total}` | 15/10/2026 |
| Vercel: Hobby may pin **one** function region via top-level `"regions"`; `X-Forwarded-For` is overwritten by Vercel (spoof-safe); CDN caches only 200/404/410/30x with `s-maxage`; function response body max 4.5 MB | brief `E:\dev-recipes\_knowledge\cache\vercel-express-function-region-cache.md` | 15/10/2026 |
| The uncommitted working-tree changes are junk from the last agent. `vercel.json` has all rewrites, functions and headers removed; `package.json` has an unused `"frontend"` key; `frontend/package.json` has unused `vercel:*` scripts; `.env.production` sits at the root, where Vite never reads it (Vite `loadEnv` uses `frontend/`) | `git diff`; `frontend/vite.config.js` (search `loadEnv(mode, process.cwd()`) | 15/10/2026 |
| `frontend/package.json` depends on the whole repo (`"ev-charging-stations-api": "file:.."`). Nothing imports it | `grep -rn "ev-charging-stations-api" frontend/src frontend/scripts` → none | 15/10/2026 |
| Shared conventions: `/v1` prefix; envelopes `{success,data,meta}` / `{success:false,error:{code,message}}`; rate limit default 100 per 15 min per IP; unknown enum-like values → **404** with valid values | `E:\OSC\api-projects\CONVENTIONS.md` | 15/10/2026 |
| Checks runner: `node api-projects/pipeline/checks/run-checks.js --stage production --project <dir>` reads URLs from `api.json` `deploy` (no URL override flag) | `pipeline/checks/run-checks.js` (search `Usage: node run-checks.js`) | 15/10/2026 |
| Weekly upstream-drift workflow pattern to copy: `projects/gst-hsn-sac-api/.github/workflows/upstream-check.yml` (exit 0 = in sync, 2 = drift → one labelled issue) | file read | 15/10/2026 |
| Earlier review findings A1–A10 (API) and the map/playground defects were reproduced on a local server | conversation of 15/10/2026, summarised in `DOCS/WORK/2026-10-15/REVIEW.md` (Task 1.2) | 15/10/2026 |

## Rules for every task

- Work on `rebuild/bee-real-data`. Never commit or push to `main` before Task 6.3. Pushing the branch makes a Vercel **preview**, which is allowed.
- Test first (`superpowers:test-driven-development`): write the failing test, run it, see it fail for the right reason, then implement.
- Never invent data. Every station field comes from the BEE PDF or from a cited reference table. If a value can't be derived, it is `null` and the reason goes in `DOCS/DATA-NOTES.md`.
- Never weaken an existing assertion to make it pass. The may-change list per task is in **Don't touch**.
- Stack is pinned: Express backend, React + Vite frontend. Python is allowed only inside `ingest/`, for the one PDF extraction step.
- No secrets in git. `DATA_GOV_API_KEY` is not needed by this project and must not be added.
- Attribution text (exact, used in API `meta.attribution`, footer, docs, README): `Data: Bureau of Energy Efficiency (BEE), Ministry of Power, Government of India — "EV Public Charging Stations Data till 26th October 2025". Republished with attribution; not an official BEE service.`
- One task, one commit. Message format: `<type>(<scope>): <summary>`. End every commit message with the attribution lines the session system reminder specifies.
- Library or platform behaviour you haven't verified goes through `/context-brief` first, not memory.

## Failure handling

| Situation | Do this |
|---|---|
| BEE PDF download fails (timeout, 403, HTML instead of PDF) | Retry 3× with `-A "Mozilla/5.0"` over `http://`. If it still fails, use the cached copy at `ingest/cache/EV_PCS_Data_29277.pdf` if present and check its sha256 against `backend/data/source.json`. Otherwise stop Phase 2 and log it. |
| `pip install` fails | Create a fresh venv `ingest/.venv`, run `python -m pip install -r ingest/requirements.txt`, retry once, then log the real output. |
| The normaliser meets a charger-type, state or CPO spelling missing from the reference tables | Build must fail with the unknown value listed (by design). Add the mapping in the reference table with a one-line reason, then rebuild. Never add a catch-all. |
| A station-id collision during build | Build must fail. Extend the hash input with `location` (normalised), log under Plan issues, rebuild. |
| The Vercel function exceeds the size or memory limit, or a cold start exceeds 3 s | Measure first (`/health` timing on the preview). Then strip unused fields from `stations.json` and gzip-free compact keys. Log it, and do not change the API shape. |
| A preview deploy 404s on `/v1/*` | `vercel.json` rewrites are wrong. Compare with Task 5.1 exactly. Never add a page wildcard rewrite. |
| Production check FAILs after the merge to `main` | Fix forward on a new branch and merge again. If the site is broken for users, revert the merge commit on `main` (`git revert -m 1 <merge>`) and push, which redeploys the previous version. |
| Anything else fails | Fix and retry at most three times. Then set the work aside, record the real output in the Progress Log, and continue with the next independent task. |
| The plan itself looks wrong | Follow **Plan issues** below. Decide by impact, never freeze the whole plan. |
| Owner-only actions | Public-apis submission, a BEE permission email, any paid Vercel feature. Ask once and continue other tasks. |

---

## Phase 1 — Clean slate and test matrix

**Purpose:** Remove the last agent's half-finished changes, archive the stale plans, and get an agreed test matrix before any code changes.
**Starts when:** now.
**Re-check first:** `git status --short` still shows only ` M .gitignore`, ` M frontend/package.json`, ` M package.json`, ` M vercel.json`, `?? .env.production`. If it shows more, list it under Plan issues and keep any file you can't attribute to the 15/10 agent.

### Task 1.1 — Branch and discard junk changes

**Goal:** A clean working tree on a new branch, with only the useful `.gitignore` line kept.
**Why:** The uncommitted `vercel.json` would break every `/v1` route if deployed. The other edits do nothing.
**Where:** repo root (search text in `vercel.json`: `"outputDirectory": "frontend/dist"`)
**Do:**
- [ ] `git switch -c rebuild/bee-real-data`
- [ ] `git restore vercel.json package.json frontend/package.json`
- [ ] Keep the `.gitignore` change (`.vercel`). Delete `.env.production`.
- [ ] `git status --short` → only ` M .gitignore`.
**Test first:** n/a — this restores committed files; `npm test` must still be green.
**Verify:** `git diff --stat` → `.gitignore | 2 ++` only; `npm test` → `# fail 0`.
**Don't touch:** any other file.
**If it fails:** if `git restore` reports conflicts, `git stash` the working tree, log the stash ref and continue from a clean tree.
**Commit:** `chore: ignore .vercel and discard broken deploy-config edits`

### Task 1.2 — Archive stale plans and the review

**Goal:** Stale plans and audit docs are moved under `DOCS/WORK/2026-10-15/`, and this rebuild's review is recorded there.
**Why:** One live plan per folder (guide §2). The old plans claim data.gov.in ingestion that never happened.
**Where:** `DOCS/plans/2026-10-15-ev-charging-stations-plan.md`, `DOCS/PLAN-MAP-INTEGRATION.md`, `DOCS/AUDIT-2026-10-15.md`
**Do:**
- [ ] `git mv` the three files into `DOCS/WORK/2026-10-15/`. Contents stay unchanged.
- [ ] Create `DOCS/WORK/2026-10-15/REVIEW.md` with three sections:
  - **What was wrong:** the dataset was generated and labelled official; the scout confused data.gov.in with the BEE PDF; the map CSS was missing; A1–A10 from the Facts table, each with its reproduction URL and observed result.
  - **Superseded plans:** one line each, "superseded by PLAN.md (rebuild on BEE data), owner instruction 15/10/2026".
  - **Open items carried:** Map integration, carried into Task 4.3; data ingestion, carried into Phase 2; everything else either done or dropped, with the reason.
- [ ] Remove the now-empty `DOCS/plans/` folder.
**Test first:** n/a — documentation move.
**Verify:** `ls DOCS/WORK/2026-10-15` → 4 files; `git status` shows renames (`R`), not delete+add.
**Don't touch:** `DOCS/DECISIONS.md`, `DOCS/RESEARCH.md`, `DOCS/specs/`.
**If it fails:** n/a.
**Commit:** `docs: archive superseded plans and record the 15/10 review`

### Task 1.3 — Test matrix with the test-plan skill

**Goal:** `DOCS/TEST-MATRIX.md` lists every surface in this plan with `must_prove` and `forbidden_evidence`, every row `unproven`.
**Why:** The owner asked for tests for every feature and edge case. The matrix makes "every" checkable.
**Where:** new file `DOCS/TEST-MATRIX.md`
**Do:**
- [ ] Run the `test-plan` skill on this repo, with this plan as the intended contract.
- [ ] Surfaces to map:
  - S1 PDF extraction
  - S2 normalisation and build
  - S3 each `/v1` endpoint
  - S4 HTTP layer (validation, 404/405, CORS, caching, rate limit)
  - S5 playground
  - S6 map
  - S7 prerender/SEO
  - S8 upstream-drift workflow
  - S9 deployment config
- [ ] Answer the 8 failure questions per surface.
- [ ] Rows must include at least:
  - every charger-type mapping
  - the last-row recovery
  - lat==lng rows
  - a state alias
  - a CPO alias
  - multi-charger grouping
  - deterministic ids
  - unknown parameter
  - unknown enum (404 + valid values)
  - hex/`Infinity`/empty numerics
  - `/near` paging
  - vehicle filter
  - per-charger power filter
  - city alias and duplicate city names across states
  - 405 on POST
  - 429 with `Retry-After`
  - no `RateLimit-*` headers on cacheable 200s
  - cache headers
  - attribution in `meta`
  - MapLibre CSS present in build
  - map popup link
  - bundle under limits
  - preview and production smoke
- [ ] Each row names the task that will prove it.
**Test first:** n/a — the matrix is the test specification.
**Verify:** `grep -c "| unproven |" DOCS/TEST-MATRIX.md` → ≥ 40.
**Don't touch:** source files.
**If it fails:** if the skill is unavailable, write the matrix by hand using `E:\dev-recipes\_knowledge\testing-method.md` §1–4 and log that.
**Commit:** `docs(test): add test matrix for the BEE data rebuild`

### Checkpoint — Phase 1

- [ ] Full verification: `npm test` → `# fail 0`; `git log --oneline main..` → 3 commits.
- [ ] Commit made for every task in this phase.
- [ ] Status file updated: `STATUS.md` → "Phase: rebuilding on real BEE data (PLAN.md), Phase 1 done; live site still serves the old generated sample until Phase 6."
- [ ] Progress Log entry added.

A new session may start here.

---

## Phase 2 — Ingest the BEE PDF

**Purpose:** A repeatable pipeline: PDF → raw rows (Python) → normalised stations (Node), with rejects reported and every mapping tested.
**Starts when:** Phase 1 checkpoint done.
**Re-check first:** The BEE PDF URL still returns 200 with `Content-Type: application/pdf`, and `pdfinfo` reports 1,159 pages. If the file changed (different size or page count), BEE has published a newer list. Use it, update the Facts rows in Plan issues, and keep the same code.

### Task 2.1 — Python extractor with last-row recovery

**Goal:** `ingest/extract_bee_pdf.py` writes `ingest/out/raw-rows.json` (array of `{page, row, cells[12]}`) with no `None` connector counts.
**Why:** The PDF is the only primary source. Extraction must be deterministic (no OCR, no LLM).
**Where:** new `ingest/` folder
**Do:**
- [ ] `ingest/requirements.txt` with exactly `pdfplumber==0.11.4`.
- [ ] `ingest/fetch_bee_pdf.sh`: downloads the URL from the Facts table with `curl -fsSL -A "Mozilla/5.0" --retry 3` to `ingest/cache/EV_PCS_Data_29277.pdf`, then prints `sha256sum`.
- [ ] `extract_bee_pdf.py <pdf> <out.json> [--pages a-b]`. For each page, `find_tables()[0]`; skip the header row whose first cell is `CPO Name`.
  - When a cell is `None`, crop the page to `(header_cell.x0, row.top, header_cell.x1, row.bottom)` for that column and use `extract_text()`, stripped.
  - If still empty, keep `null` and count it in `missing_cells`.
- [ ] Output object `{source_file, sha256, pages, rows_total, missing_cells, rows:[…]}`. Cell text keeps its internal newlines (the Node step collapses them).
- [ ] `.gitignore`: add `ingest/cache/`, `ingest/out/`, `ingest/.venv/`.
- [ ] `ingest/test_extract.py` (`unittest`), skipped with a message when the cached PDF is absent:
  - `--pages 1-1` → 29 data rows
  - row 29 cell 11 == `"1"`
  - row 1 cell 6 == `"12.034186"`
  - `--pages 1159-1159` → 36 data rows
  - 0 missing cells
**Test first:** `test_extract.py` as above. Run it before implementing; it fails with "No module named extract_bee_pdf" or missing output.
**Verify:** `python -I -m unittest ingest/test_extract.py -v` → `OK`. A full run prints `rows_total 39641 missing_cells 0`.
**Don't touch:** `backend/`.
**If it fails:** if the crop fallback returns empty for any row, widen the crop by ±2 pt vertically and log the page numbers. Never infer a count.
**Commit:** `feat(ingest): deterministic BEE PDF table extractor`

### Task 2.2 — Reference tables (states, charger standards, operators)

**Goal:** Three committed JSON tables that map every raw spelling to a canonical value, with sources.
**Why:** The raw data has 46 state spellings, 19 charger spellings and wrap-broken CPO names. Mapping them in data, not code, keeps it reviewable.
**Where:** new `backend/data/reference/states.json`, `connector-standards.json`, `operators.json`
**Do:**
- [ ] `states.json`: 36 entries `{name, code, type: "state"|"ut", aliases:[raw spellings]}`.
  - Names and ISO 3166-2:IN codes come from a cited source; put the URL in the file's `source` field and verify it live.
  - Must include: `KERALA`, `Tamil nadu`, `Uttrakhand` → Uttarakhand, `UT OF D&NH AND D&D`/`UT of D&NH and D&D` → Dadra and Nagar Haveli and Daman and Diu, `Andaman & Nicobar` → Andaman and Nicobar Islands, `Jammu & Kashmir` → Jammu and Kashmir, plus every case variant seen.
- [ ] `connector-standards.json`: entries `{id, name, current: "AC"|"DC", vehicle_classes: [...], description, source_url}`.
  - ids: `LEV_AC`, `LEV_DC`, `BHARAT_AC001`, `BHARAT_DC001`, `TYPE2_AC`, `CCS2`, `CHADEMO`.
  - `vehicle_classes` values are `"two_three_wheeler"` and `"car"`.
  - Classes and descriptions are taken from the MoP "Charging Infrastructure for EVs — revised consolidated Guidelines & Standards" (14 Jan 2022, linked on the BEE page above) and the BIS IS 17017 part titles, with a `source_url` per entry.
  - Where no source states a class, use `[]` and note it in `DOCS/DATA-NOTES.md`.
- [ ] `raw_types` map in the same file. Exact keys are the 19 observed spellings → array of standard ids:
  - `"LEV AC Charge point"` and `"LEV AC Charge Point"` → `["LEV_AC"]`
  - `"LEV DC Charge Point (IS-17017-2-7)"`, `"LEV DC Charge Point (IS-17017-2-6)"` and `"LEV DC"` → `["LEV_DC"]`, plus `"variant"` = `"IS-17017-2-7"` / `"IS-17017-2-6"` / `null`
  - `"Bharat AC-001"` and `"Bharat AC"` → `["BHARAT_AC001"]`
  - `"Bharat DC-001"` → `["BHARAT_DC001"]`
  - `"CCS"` and `"CCS-II"` → `["CCS2"]`
  - `"Type-II AC"` and `"Type II"` → `["TYPE2_AC"]`
  - `"CHAdeMO"`, `"CHAdeMo"` and `"CHADEMO"` → `["CHADEMO"]`
  - `"Combo (CCS-II+CHAdeMO)"` → `["CCS2","CHADEMO"]`
  - `"Combo (CCS-II + CHAdeMo + Type II)"` → `["CCS2","CHADEMO","TYPE2_AC"]`
  - `"Combo(CCS-II+Type-II)"` → `["CCS2","TYPE2_AC"]`
  - `"Combo ( Bharat AC-001 + Type-II AC)"` → `["BHARAT_AC001","TYPE2_AC"]`
  - Keys are matched after collapsing whitespace.
- [ ] `operators.json`: `{canonical, ownership: "govt"|"private", aliases:[raw]}`, covering all 70 raw CPO names. List them with `node -e` over `ingest/out/raw-rows.json`.
  - Canonical = the name rejoined where a line wrap split a word (`CORPORAT ION OF CHENNAI` → `Greater Chennai Corporation` only if a source confirms; otherwise `Corporation of Chennai`).
  - Ownership comes from the PDF's Govt/Private column (must agree across rows; disagreement → note in DATA-NOTES).
**Test first:** `backend/test/reference.test.js`:
- every raw spelling in a fixture list (the 46 states, 19 types, 70 CPOs, copied from the extraction) resolves
- no two canonical ids collide
- every standard has a `source_url`
- every state has a 2-letter code
**Verify:** `npm test` → reference tests pass.
**Don't touch:** `backend/src/`.
**If it fails:** a missing alias → add it. A standard with no citable class → `vehicle_classes: []` plus a DATA-NOTES line; never guess.
**Commit:** `feat(data): reference tables for states, charger standards and operators`

### Task 2.3 — Node normaliser `build-dataset.js`

**Goal:** `node backend/scripts/build-dataset.js ingest/out/raw-rows.json` deterministically writes `backend/data/stations.json`, `meta.json`, `rejects.json`, `source.json`, and fails on unknown spellings.
**Why:** All business rules live in one tested place. The output must be byte-identical across runs.
**Where:** new `backend/scripts/build-dataset.js`, `backend/src/lib/normalise.js` (pure functions, unit-tested)
**Do:**
- [ ] Per row:
  - collapse whitespace in every cell
  - resolve state, CPO and charger type through the reference tables (unknown → collect and exit 1 listing them)
  - parse lat/lng with `^-?\d+(\.\d+)?$` (else reject `BAD_COORDINATE`)
  - parse charger kW, connector kW and connector count with the same rule (else reject `BAD_NUMBER`)
- [ ] Location quality: `"suspect"` when lat == lng or outside India bounds lat 6–37.6 / lng 68–97.5; otherwise `"ok"`. Suspect rows are kept, not rejected.
- [ ] Group rows into stations by key `operator_canonical|lat(6dp)|lng(6dp)`.
  - id = `"evs_" + sha1(key).slice(0, 10)`; a collision fails the build.
  - `address` = the first row's Location text.
  - `state`, `district`, `city` = values from the first row; differing values in the group → note `mixed_admin: true`.
- [ ] Station shape (exact field names):
  - `id`, `operator`, `ownership`, `state`, `state_code`, `district`, `city`, `address`, `latitude`, `longitude`, `location_quality`
  - `chargers`: array of `{type_raw, standards:[...], lev_variant, charger_kw, connector_kw, connectors_per_charger, count}`, where identical rows are merged and counted in `count`
  - `total_chargers`, `total_connectors`, `max_charger_kw`
  - `currents`: sorted unique `"AC"|"DC"`
  - `vehicle_classes`: union
  - `source`: `{page_first, page_last, row_count}`
  - Sort stations by `state_code`, `city`, `id`.
- [ ] `meta.json`:
  - dataset name, the attribution string (Rules), `source_url`, `snapshot_label "till 26th October 2025"`, `pdf_created "2026-02-17"`, `sha256`
  - `built_at` = the PDF's creation date, not wall-clock, so output is deterministic
  - counts: rows, stations, suspect, rejects, states, operators, chargers
- [ ] `rejects.json`: `[{page, row, reason, cells}]`.
- [ ] Delete `backend/scripts/generate-data.js` and the `generate-data` npm script.
**Test first:** `backend/test/normalise.test.js` with fixture `backend/test/fixtures/bee-rows-sample.json`. The fixture is the raw rows of PDF pages 1, 28, 581 and 1159, plus 4 hand-made rows: an unknown type, a bad number, `12.5abc`, and a duplicate pair. Cases:
- type mapping incl. each combo
- state alias
- CPO alias
- lat==lng → suspect
- identical rows → one charger entry with `count` 2
- different charger types at the same site → one station, two charger entries
- id stable across two runs
- unknown type → throws listing it
- output byte-identical on two runs
**Verify:** `npm test` → pass; `node backend/scripts/build-dataset.js backend/test/fixtures/bee-rows-sample.json --out /tmp-dir` twice → identical sha256.
**Don't touch:** API code (Phase 3).
**If it fails:** see Failure handling (unknown spellings, collisions).
**Commit:** `feat(data): normalise BEE rows into stations with deterministic ids`

### Task 2.4 — Build the real dataset and record data notes

**Goal:** The committed `backend/data/*.json` come from the real PDF, and `DOCS/DATA-NOTES.md` explains every known source defect.
**Why:** This replaces the fake data. Data notes keep it honest for developers.
**Where:** `backend/data/`, new `DOCS/DATA-NOTES.md`
**Do:**
- [ ] Fetch → extract (full) → build.
- [ ] Remove the generated `states.json` and `connectors.json` (superseded by reference tables plus derived counts).
- [ ] `DOCS/DATA-NOTES.md`, with real numbers from `meta.json`:
  - source and attribution
  - one row per charger, grouped into stations
  - suspect coordinates (count, why)
  - mixed admin values (count)
  - district errors seen in source (e.g. Manesar listed under Faridabad), kept as published
  - big multi-charger hubs
  - 51% two/three-wheeler chargers
  - no availability, pricing or opening hours in the source
  - update cadence unknown (BEE posts irregularly)
**Test first:** `backend/test/dataset.test.js` against the committed data:
- stations ≥ 25,000
- every station `id` matches `^evs_[0-9a-f]{10}$` and is unique
- every `state_code` is in `states.json`
- every charger standard is a known id
- no `"generated-sample"` string anywhere in `backend/data`
- the `meta.attribution` string equals the Rules text
- suspect count equals the count of stations whose lat == lng or are out of bounds
**Verify:** `npm test` → pass; `node -p "require('./backend/data/meta.json').counts"` shows real numbers.
**Don't touch:** frontend.
**If it fails:** if stations < 25,000, stop and compare the grouping key with the Facts row on distinct counts. Log it. Do not loosen the test.
**Commit:** `feat(data): replace generated sample with BEE station list (till 26 Oct 2025)`

### Checkpoint — Phase 2

- [ ] Full verification: `python -I -m unittest ingest/test_extract.py` → OK; `npm test` → the backend API suite may fail now (old shape) — record which; reference, normalise and dataset suites pass.
- [ ] Commit made for every task in this phase.
- [ ] Status file updated: "Real BEE dataset built (<n> stations, <s> suspect, <r> rejects); API being moved to the new shape."
- [ ] Progress Log entry added.

A new session may start here.

---

## Phase 3 — API on the new data

**Purpose:** Every endpoint serves the real shape, validation is strict and consistent, and the developer and user problems from the review are fixed.
**Starts when:** Phase 2 checkpoint done.
**Re-check first:** The field names in `backend/data/stations.json` match Task 2.3. If any differ, the data is right and this phase follows the data. Log it.

**API contract (exact; the tasks below implement it):**

| Route | Params | Notes |
|---|---|---|
| `GET /v1/stations` | `state, district, city, operator, ownership(govt\|private), connector(standard id or alias), vehicle(car\|two_three_wheeler), current(ac\|dc), min_power_kw, location_quality(ok\|suspect\|any; default any), page, limit` | `meta: {total, page, limit, count, total_pages, filters_applied, source, attribution}` |
| `GET /v1/stations/near` | `lat, lng, radius(0.1–100, default 10), page, limit` + the same filters except location_quality | Excludes suspect locations always; `meta: {center, radius_km, total_found, page, limit, count, total_pages, filters_applied, attribution}` |
| `GET /v1/stations/:id` | — | `id` must match `^evs_[0-9a-f]{10}$` (else 400 `INVALID_STATION_ID`); unknown → 404 `STATION_NOT_FOUND` |
| `GET /v1/states` | — | per state: `name, code, type, stations, chargers, dc_stations` |
| `GET /v1/cities` | `state` (optional) | `[{city, district, state, state_code, stations}]` sorted; unknown state → 404 |
| `GET /v1/operators` | — | `[{operator, ownership, stations, chargers}]` |
| `GET /v1/connectors` | — | the standards table with `stations` and `chargers` counts |
| `GET /v1/meta` | — | provenance, counts, attribution, data-notes URL |
| `GET /health`, `GET /`, `GET /v1` | — | as today, counts from the new data |

Errors (all with the standard envelope):
- 400 `UNKNOWN_PARAMETER` (details.allowed)
- 400 `INVALID_PARAMETER`
- 400 `INVALID_LATITUDE` / `INVALID_LONGITUDE` / `MISSING_COORDINATES`
- 404 `UNKNOWN_STATE` / `UNKNOWN_OPERATOR` / `UNKNOWN_CONNECTOR` / `UNKNOWN_VEHICLE` / `UNKNOWN_OWNERSHIP` / `UNKNOWN_CURRENT`, each with `details.valid_values`
- 404 `UNKNOWN_CITY` (details.hint `"/v1/cities?state=<state>"`)
- 404 `ROUTE_NOT_FOUND`
- 405 `METHOD_NOT_ALLOWED` (header `Allow: GET, HEAD, OPTIONS`)
- 429 `RATE_LIMIT_EXCEEDED`
- 500 `INTERNAL_SERVER_ERROR`

Numbers accept only `^-?\d+(\.\d+)?$` after trimming: hex, exponent, `Infinity` and empty are rejected. A repeated parameter (array) → 400 `INVALID_PARAMETER`.

### Task 3.1 — Service layer on the new shape

**Goal:** `stations-service.js` loads the new files and exposes list, near, byId, states, cities, operators, connectors and meta, with in-memory indexes built once.
**Why:** The current service reads the old shape and the generated `states.json`/`connectors.json`.
**Where:** `backend/src/services/stations-service.js` (search text: `function loadData()`)
**Do:**
- [ ] Rewrite loading: `stations.json`, `meta.json`, `reference/*.json`. Build Maps: id → station, state code → stations, compact city key → [stations], operator → stations.
- [ ] Derive state, city, operator and connector counts at load time.
- [ ] `projectStation` returns the Task 2.3 shape minus `source` page fields (keep `source` only in `/v1/stations/:id`).
- [ ] City aliases: keep the existing `CITY_ALIASES` table. Fix `prayagraj` (Allahabad and Prayagraj both map to whichever spelling the data uses) and remove `delhi → newdelhi`. Only add an alias when the target spelling exists in the data.
**Test first:** rewrite `backend/test/api.test.js` in place for the new contract (it is the may-change file for Phase 3), with one `describe` per route. Start with:
- `/v1/stations` default page (25 items, `total` = meta stations)
- `/v1/stations/:id` round trip for an id taken from the list
- `/v1/states` sums equal total
**Verify:** `npm test` → pass.
**Don't touch:** `normalise.test.js`, `dataset.test.js`, `reference.test.js` (read-only from here on).
**If it fails:** if cold load > 1.5 s locally, log the timing. Optimisation belongs in Task 5.1's measurement, not here.
**Commit:** `feat(api): serve the BEE dataset shape`

### Task 3.2 — Strict validation and errors

**Goal:** The error table above, fully implemented.
**Why:** Fixes A1 (unknown params silently ignored), A5 (inconsistent unknown handling), A7 (hex accepted), A8 (POST → 404). It also aligns with CONVENTIONS (unknown enum → 404 with valid values).
**Where:** `backend/src/lib/errors.js` (search text: `function withValidation`), new `backend/src/lib/params.js`, `backend/src/app.js` (search text: `app.use((req, res) => {`)
**Do:**
- [ ] `params.js`: `parseQuery(query, spec)`. `spec` lists the allowed names, each with a type (`enum`, `number`, `int`, `string`) and bounds. It rejects unknown names and arrays, parses numbers with the regex, and returns normalised values or throws `ValidationError(code, message, details, status)`.
- [ ] `ValidationError` gains `status` (400 or 404).
- [ ] 405 handler: for any non-GET/HEAD/OPTIONS method on a known path → 405 with `Allow` header; unknown path → 404 as today.
**Test first:** in `api.test.js`, cases:
- `?min_power=50` → 400 UNKNOWN_PARAMETER listing `min_power_kw`
- `?offset=5` → 400
- `?state=Atlantis` → 404 UNKNOWN_STATE with 36 valid values
- `?state=MH&state=KA` → 400
- `lat=0x10` → 400
- `lat=1e1` → 400
- `radius=Infinity` → 400
- `limit=` (empty) → default
- `POST /v1/stations` → 405 with `Allow`
- `/v1/stations/123` → 400 INVALID_STATION_ID
- `/v1/stations/evs_0000000000` → 404
**Verify:** `npm test` → pass.
**Don't touch:** route business logic (Task 3.3).
**If it fails:** n/a beyond the general table.
**Commit:** `fix(api): reject unknown and malformed parameters consistently`

### Task 3.3 — Filters that solve the real questions

**Goal:** The filters `vehicle`, `current`, `connector`, `min_power_kw` (per charger), `ownership`, `district`, `city`, `operator` and `location_quality` work on both list and near.
**Why:**
- A car driver must not be sent to a 3.3 kW scooter point (51% of chargers).
- "50 kW" must mean a real 50 kW charger, not the sum of slow ones (A2).
**Where:** `backend/src/services/stations-service.js` (search text: `function matchesFilters`)
**Do:**
- [ ] A station matches when **at least one gun** (amended, see issue 2) satisfies `connector` AND `current` AND `vehicle` AND `kw >= min_power_kw` together, not each on different guns.
- [ ] `operator`: exact canonical or alias match, case-insensitive; unknown → 404 with valid values. Remove partial substring matching.
- [ ] `city`: compact-key match plus alias. When the city name exists in several states and no `state` is given, return all, and `meta.filters_applied.city_ambiguous_states` lists the states.
**Test first:**
- a station with only LEV_AC never appears for `vehicle=car`
- `min_power_kw=50&current=dc` returns only stations with a DC charger ≥ 50
- the combined condition on the same charger: a station with AC 7.4 and DC 30 does **not** match `current=ac&min_power_kw=30`
- `connector=ccs-2`, `CCS 2` and `ccs2` give the same total
- `operator=iocl` and `operator=IOCL` match
- `operator=zzz` → 404
- `city=Bangalore` equals `city=Bengaluru`
- `city=Prayagraj` works if present in data, else 404 with hint
**Verify:** `npm test` → pass.
**Don't touch:** validation module (except adding enum values).
**If it fails:** n/a.
**Commit:** `feat(api): per-charger vehicle, current, connector and power filters`

### Task 3.4 — Radius search with paging

**Goal:** `/v1/stations/near` supports `page`, always excludes suspect locations, and reports `total_pages`.
**Why:** A6 — results beyond 100 were unreachable. Suspect coordinates must never appear on a map.
**Where:** `stations-service.js` (search text: `function getNearbyStations`)
**Do:**
- [ ] Keep the bounding-box pre-filter plus haversine. Sort by distance, then `id` for ties.
- [ ] Page with `page`/`limit`. A page beyond the end → empty `data`, 200.
- [ ] Clamp the longitude delta near the poles as now.
**Test first:**
- Bengaluru centre, radius 5, `limit=10`: page 1 and page 2 don't overlap, and their union equals the first 20 of `limit=20`
- distances non-decreasing
- no suspect station ever returned (pick a known suspect station's coordinates as centre)
- `radius=0` → 400
- `radius=100.5` → 400
**Verify:** `npm test` → pass.
**Don't touch:** list endpoint.
**If it fails:** n/a.
**Commit:** `feat(api): paginate radius search and exclude suspect coordinates`

### Task 3.5 — Reference endpoints and attribution

**Goal:** `/v1/states`, `/v1/cities`, `/v1/operators`, `/v1/connectors` and `/v1/meta` per the contract. Every `/v1` success response carries `meta.attribution` and `meta.source`.
**Why:** Developers need discoverable valid values. The owner's licence decision requires attribution everywhere.
**Where:** `backend/src/routes/reference.js` (search text: `router.get("/states"`)
**Do:**
- [ ] Add a `/v1/cities` route.
- [ ] Add the shared `meta` fields: `attribution` (Rules text), `source: {name, url, snapshot_label}`.
- [ ] Update the endpoint index in `app.js` (search text: `function endpointIndex()`).
**Test first:**
- every route returns `meta.attribution` equal to the Rules text
- `/v1/cities?state=KA` → only Karnataka
- `/v1/cities?state=XX` → 404
- `/v1/connectors` station counts are > 0 for CCS2 and LEV_AC
- `/v1/operators` station counts sum to total
**Verify:** `npm test` → pass.
**Don't touch:** stations routes.
**If it fails:** n/a.
**Commit:** `feat(api): cities endpoint and attribution on every response`

### Task 3.6 — HTTP layer: caching and rate limiting

**Goal:**
- Successful GET `/v1/*` 200/404 responses send `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`; `/health` sends `no-store`.
- The rate limit is 100 per 15 min per IP (CONVENTIONS) and returns 429 with `Retry-After`.
- Cacheable responses carry no `RateLimit-*` headers.
**Why:** CDN-cached responses would otherwise show one caller's rate-limit counters to everyone (seen live 15/10).
**Where:** `backend/src/app.js` (search text: `const limiter = rateLimit(`)
**Do:**
- [ ] Rate limiter: `standardHeaders: false`, `legacyHeaders: false`, plus a custom `handler` that sets `Retry-After` (seconds until `req.rateLimit.resetTime`) and sends the 429 envelope.
- [ ] Keep `trust proxy` 1 (spoof-safe on Vercel per Facts).
- [ ] Cache middleware on the `/v1` router: set the header before routes. Error handlers override it with `no-store` for 400/405/429/500.
- [ ] Remove `RATE_LIMIT_*` defaults from `.env.example` except as documented overrides. Delete `DATASET_SEED` and `DATASET_SNAPSHOT_DATE`.
**Test first:**
- 200 has `s-maxage=3600` and no `ratelimit-remaining`
- 400 has `no-store`
- with `RATE_LIMIT_MAX=2` (env set before requiring `app` in a separate test file `ratelimit.test.js`), the 3rd request → 429 with a numeric `Retry-After` > 0 and `no-store`
- a different `X-Forwarded-For` gets its own budget
**Verify:** `npm test` → pass.
**Don't touch:** CORS config (already correct).
**If it fails:** if express-rate-limit 7.5.1's handler signature differs, retrieve its docs via `/context-brief`, don't guess.
**Commit:** `fix(api): CDN-safe caching headers and Retry-After on rate limits`

### Checkpoint — Phase 3

- [ ] Full verification: `npm test` → `# fail 0`; local `npm start`, then `curl -s localhost:3000/v1/stations/near?lat=12.97&lng=77.59&vehicle=car&min_power_kw=50` → 200 with only cars-capable ≥50 kW stations.
- [ ] Commit made for every task in this phase.
- [ ] Status file updated: "API on real data with new contract; frontend next."
- [ ] Progress Log entry added.

A new session may start here.

---

## Phase 4 — Frontend on the new contract

**Purpose:** The portal, playground and map use the real data and new filters, show attribution, and the known UI defects are fixed. No redesign.
**Starts when:** Phase 3 checkpoint done.
**Re-check first:** `npm run build` works before changes. `scripts/dataset-summary.mjs` reads `backend/data`. Confirm which fields it uses (search text `buildDatasetSummary`) and adapt them to the new `meta.json` counts.

### Task 4.1 — Build wiring and dataset summary

**Goal:** The frontend no longer depends on the whole repo, and every number on the site comes from `meta.json` at build time.
**Where:** `frontend/package.json` (search text: `"ev-charging-stations-api": "file:.."`), `frontend/scripts/dataset-summary.mjs`, `frontend/.env.production` (new)
**Why:** The `file:..` dependency is unused and makes installs recursive. The numbers must not drift from the data.
**Do:**
- [ ] Remove the `file:..` dependency and reinstall (`npm --prefix frontend install`), committing the lockfile change.
- [ ] Rewrite the summary to expose stations, chargers, states, operators, suspect count, two/three-wheeler share, snapshot label and attribution.
- [ ] Create `frontend/.env.production` with exactly `SITE_URL=https://ev-charging-stations-api.vercel.app` (public, not a secret) so production builds always emit canonical/sitemap/robots.
**Test first:** `frontend/scripts/dataset-summary.test.mjs` (node:test): the summary's station count equals `meta.json` counts.stations; no field is `undefined`.
**Verify:** `node --test frontend/scripts/dataset-summary.test.mjs` → pass; `npm run build` → `[prerender] Rendered 8 pages and 404.html.` and sitemap present.
**Don't touch:** page components (later tasks).
**If it fails:** n/a.
**Commit:** `build(frontend): derive site numbers from the BEE dataset; drop self-dependency`

### Task 4.2 — Playground filters and paging

**Goal:** The playground offers a vehicle type (Car / Two-three-wheeler / Any), current (AC/DC/Any), connector standard (from `/v1/connectors`), a minimum charger power (Any, 7, 22, 50, 100 kW) and "Load more" paging. String ids work.
**Why:** These are the user questions the data can answer. The old power options were derived from fake totals.
**Where:** `frontend/src/pages/PlaygroundPage.jsx` (search text: `const POWER_OPTIONS`), `frontend/src/lib/api.js` (search text: `export function buildNearQuery`)
**Do:**
- [ ] `buildNearQuery` accepts `vehicle`, `current`, `connector`, `minPowerKw` and `page`, and sets only non-empty values.
- [ ] Replace the `CONNECTORS` constant with values fetched once from `/v1/connectors` (fallback: disable the select with an inline message on error).
- [ ] Station list item shows: operator, address, distance, `max_charger_kw` kW, standards as chips, vehicle class label, charger count. A `location_quality` notice never appears here because near excludes suspect locations.
- [ ] "Load more" appends the next page until `page === total_pages`.
**Test first:** `frontend/src/lib/api.test.mjs`: `buildNearQuery({lat:1,lng:2,radiusKm:5,vehicle:'car',page:2})` → exact string `/v1/stations/near?lat=1&lng=2&radius=5&limit=25&vehicle=car&page=2`; empty filters omitted.
**Verify:**
- `node --test frontend/src/lib/*.test.mjs` → pass.
- Manual: `npm run dev` with the API running. In the browser, set Car + DC + 50 kW at the Bengaluru preset. The list shows only DC ≥ 50 kW stations, "Load more" adds new rows, and no console errors appear.
**Don't touch:** the visual design system (`index.css` tokens).
**If it fails:** n/a.
**Commit:** `feat(playground): vehicle, current, standard and charger-power filters with paging`

### Task 4.3 — Map fixes

**Goal:** MapLibre styles load. Fast-charger markers use real charger power. Popups show standards and link correctly.
**Why:** The MapLibre CSS is not imported (Facts), so popups and controls are unstyled. `is_fast_dc` used fake totals.
**Where:** `frontend/src/components/StationMap.jsx` (search text: `is_fast_dc:`), `frontend/src/main.jsx`
**Do:**
- [ ] `import 'maplibre-gl/dist/maplibre-gl.css';` in `StationMap.jsx`.
- [ ] `is_fast_dc` = station has a DC charger with `charger_kw >= 50`.
- [ ] The popup shows `max_charger_kw`, standards and the attribution-free station details. The OpenStreetMap link uses the station's latitude/longitude.
**Test first:** build assertion in `frontend/scripts/verify-build.test.mjs`: after `npm run build`, at least one `dist/assets/*.css` contains `maplibregl-popup-anchor`.
**Verify:** `node --test frontend/scripts/verify-build.test.mjs` → pass. Then:
- Manual: in the playground, the map's zoom control renders styled; clicking a marker opens a popup anchored to it; "Open in OpenStreetMap" opens the right spot.
**Don't touch:** basemap choice (OpenFreeMap stays).
**If it fails:** if the CSS breaks prerender (SSR import of CSS), move the import to `main.jsx` and log it.
**Commit:** `fix(map): load MapLibre styles and mark real DC fast chargers`

### Task 4.4 — Docs, home, status, footer and guides copy

**Goal:** All copy describes the real data, the new contract and attribution. Every example URL returns what the text says.
**Why:** The docs previously advertised parameters that didn't exist (B9). The licence decision requires attribution.
**Where:** `frontend/src/pages/DocsPage.jsx` (search text: `name: 'min_power_kw'`), `HomePage.jsx`, `StatusPage.jsx`, `components/Footer.jsx` (search text: `official Government of India data`), `content/guidesData.js`
**Do:**
- [ ] Docs: one section per contract route with the params table, the errors table, two curl examples each, and an attribution section.
- [ ] Remove every "generated sample" and "not official data" statement. Replace with source plus attribution plus a link to `DOCS/DATA-NOTES.md` on GitHub.
- [ ] Guides: update code to the new fields (`max_charger_kw`, `chargers`, string ids), or mark a guide for redrafting under the checks README "Blog drafting" process in Task 6.4.
**Test first:** `frontend/scripts/docs-parity.test.mjs`: every `/v1/...` path and query parameter mentioned in `DocsPage.jsx` exists in the backend contract (import the param spec from `backend/src/lib/params.js`).
**Verify:** test passes; `npm run build && npm run verify:seo` → `0 errors`.
**Don't touch:** SEO script logic.
**If it fails:** n/a.
**Commit:** `docs(portal): document the BEE-based contract with attribution`

### Task 4.5 — Mobile check

**Goal:** The portal passes the `mobile-check` skill at phone widths after the changes.
**Why:** The owner's setup uses `/mobile-check` as the ship gate for UI work.
**Where:** built portal (`npm run build && npm --prefix frontend run preview` with the API on :3000)
**Do:**
- [ ] Run the `mobile-check` skill against `http://localhost:4173` for `/`, `/docs`, `/playground`, `/status`.
- [ ] Fix failures in severity order within the touched pages only.
**Test first:** n/a — the skill measures before and after.
**Verify:** Manual: the mobile-check report file lists no FAIL rows for the four pages.
**Don't touch:** pages not listed.
**If it fails:** log remaining FAILs with measurements and continue. A mobile FAIL blocks Task 6.3 only if it breaks the playground's core flow.
**Commit:** `fix(ui): mobile-check fixes` (or `none — no failures`)

### Checkpoint — Phase 4

- [ ] Full verification: `npm run verify` → tests pass, build OK, SEO 0 errors.
- [ ] Commit made for every task in this phase.
- [ ] Status file updated: "Frontend on real data; automation and deploy next."
- [ ] Progress Log entry added.

A new session may start here.

---

## Phase 5 — Deployment config and automation

**Purpose:** The function runs in Mumbai with correct rewrites and headers. CI runs on every push, and a weekly job notices a new BEE file.
**Starts when:** Phase 4 checkpoint done.
**Re-check first:** Re-read `E:\dev-recipes\_knowledge\cache\vercel-express-function-region-cache.md`. If its `verified + ttl_days` has passed, refresh it through `/context-brief` before editing `vercel.json`.

### Task 5.1 — `vercel.json`

**Goal:** The committed rewrites stay, plus `"regions": ["bom1"]`, a `/v1/(.*)` function rewrite, `includeFiles` for the data, and security headers. No page wildcard.
**Why:** The function in iad1 adds ~250 ms for Indian users. The data files must ship with the function.
**Where:** `vercel.json` (search text: `"rewrites"`)
**Do:**
- [ ] Keep `"framework": "vite"`, `buildCommand`, `outputDirectory`, and the explicit page rewrites already committed.
- [ ] Add the top-level `"regions": ["bom1"]`.
- [ ] `functions["api/index.js"]`: `includeFiles: "backend/data/**"`, `maxDuration: 15`.
- [ ] Remove the `/v1/(.*)` `Cache-Control` header block; the function sets caching (Task 3.6).
- [ ] Keep `/health` `no-store`, the `/assets` immutable rule and the three security headers.
**Test first:** `backend/test/vercel-config.test.js`:
- `regions` equals `["bom1"]`
- every `rewrites[].source` is either an explicit page path, `/health`, `/v1` or `/v1/(.*)`
- no source contains `(.*)` except `/v1/(.*)`
- `framework` is `vite`
- `includeFiles` covers `backend/data/**`
**Verify:** test passes; `node E:/OSC/api-projects/pipeline/deploy/plan-deploy.js` prerequisites still list `portal-routing-config` as `[x]` (re-run the command recorded in `checklists/ev-charging-stations/deploy.md`).
**Don't touch:** `api/index.js` (it already exports the app).
**If it fails:** if Vercel rejects `regions` on deploy, log the exact error and fall back to setting the region in project settings (owner input), keeping all else.
**Commit:** `chore(deploy): run the function in bom1 and ship the dataset with it`

### Task 5.2 — CI and weekly upstream check

**Goal:**
- `.github/workflows/test.yml` runs `npm ci`/install, `npm run verify` and the Python extractor unit test (skips without PDF) on push and PR.
- `.github/workflows/upstream-check.yml` runs Mondays 04:00 UTC and opens one labelled issue when BEE's linked file changes.
**Why:** Without this, the dataset silently goes stale and regressions reach `main`.
**Where:** new workflow files; new `backend/scripts/check-upstream.js`
**Do:**
- [ ] `check-upstream.js`:
  - fetches the BEE page over `http://` with a browser UA
  - finds the anchor whose text contains `EV Public Charging Stations Data`
  - resolves its href, `HEAD`/`GET`s it, and computes sha256 when the URL differs or `Content-Length` differs from `backend/data/source.json`
  - prints JSON `{status, current:{url,sha256,size}, upstream:{url,sha256,size,anchor_text}}`
  - exit 0 = same, 2 = changed, 1 = fetch/parse error
- [ ] `upstream-check.yml`: copy the gst-hsn-sac pattern. Label `upstream-drift`; issue title `BEE published a new EV charging station list: <anchor_text>`; the body lists the refresh steps from `README.md`.
**Test first:** `backend/test/check-upstream.test.js` with an injected fetch:
- same file → exit-code value 0
- new href → 2
- page without the anchor → 1
- HTML returned instead of PDF → 1
**Verify:** tests pass; `node backend/scripts/check-upstream.js` against the live site → status `same`, exit 0 (or log the real output).
**Don't touch:** the gst-hsn-sac repo.
**If it fails:** if BEE blocks GitHub runner IPs (exit 1 in Actions), keep the workflow, log it, and make the issue body say "check failed to reach BEE".
**Commit:** `ci: test workflow and weekly BEE upstream check`

### Task 5.3 — Manifest, README, env example, decisions

**Goal:** `api.json`, `README.md`, `.env.example` and `DOCS/DECISIONS.md` describe the real system.
**Why:** The pipeline checks read `api.json`. The README is the developer's first contact.
**Where:** `api.json` (search text: `"source": {`), `README.md`, `.env.example`, `DOCS/DECISIONS.md`
**Do:**
- [ ] `api.json`:
  - `one_liner` without "generated sample"
  - `source` = BEE name, the PDF URL, licence `"No licence published by BEE; republished with attribution (owner decision 15/10/2026)"`
  - remove the `stack.dataset.generator`/`seed` keys; add `snapshot_label`, `stations`
  - `routes` add `/v1/cities` and replace `/v1/stations/1` with a real id from the data
  - `not_provided` = real-time availability; pricing/booking; opening hours (not in source)
- [ ] README:
  - what it is, quick start, endpoint table, filters with examples (car + DC 50 kW near me)
  - data and attribution, data notes link, refresh steps (fetch → extract → build → test)
  - limitations
- [ ] DECISIONS.md, appended (never edit old entries):
  - source switch and why
  - string ids
  - per-charger filters
  - 404 for unknown enums
  - bom1
  - rate limit 100/15 min
  - Python only in `ingest/`
**Test first:** `node E:/OSC/api-projects/pipeline/manifest/<validator>` — find it with `ls E:/OSC/api-projects/pipeline/manifest` and use the validator script there → exit 0.
**Verify:** validator exit 0; `grep -rniE "generated sample|not official government|data\.gov\.in" README.md api.json frontend/src` → no hits.
**Don't touch:** `DOCS/WORK/`.
**If it fails:** fix the manifest per the validator's message.
**Commit:** `docs: manifest, README and decisions for the BEE-based release`

### Checkpoint — Phase 5

- [ ] Full verification: `npm run verify` → pass; all workflow YAML parses (`node -e "require('js-yaml')"` is not installed — use `gh workflow view` after push, or `python -c "import yaml"` if available; otherwise review by eye and log as unverified).
- [ ] Commit made for every task in this phase.
- [ ] Status file updated: "Ready for preview deploy."
- [ ] Progress Log entry added.

A new session may start here.

---

## Phase 6 — Review, preview, ship

**Purpose:** Independent review, prove the preview, merge to `main` (production deploy), then run the pipeline gates on production.
**Starts when:** Phase 5 checkpoint done.
**Re-check first:** `git log main..rebuild/bee-real-data --oneline` lists every task commit. `npm run verify` is green on a clean clone (`git clone` to scratch, `npm install`, `npm run verify`).

### Task 6.1 — Review and ship-gate audit

**Goal:** Findings from `/myreview` and the `prod-bug-auditor` agent are fixed or recorded with a reason.
**Why:** The owner asked for production-grade review from frontend to backend.
**Where:** branch diff `main..rebuild/bee-real-data`
**Do:**
- [ ] Run `/myreview` on the branch diff.
- [ ] Run the `prod-bug-auditor` agent on `backend/`, `api/`, `vercel.json`, `ingest/`, `frontend/src/`.
- [ ] Fix each confirmed finding test-first, one commit each.
**Test first:** per finding, a failing test reproducing it.
**Verify:** `npm run verify` → pass; Manual: re-run `/myreview` and `prod-bug-auditor` — no open high or critical findings.
**Don't touch:** out-of-scope features listed at the top.
**If it fails:** a finding you disagree with → record it in Plan issues with evidence; the owner decides.
**Commit:** `fix(<scope>): <finding>` per finding

### Task 6.2 — Preview deploy and smoke test

**Goal:** The branch preview deployment passes `scripts/smoke.mjs`.
**Why:** It proves the Vercel config (region, rewrites, includeFiles) before production.
**Where:** new `scripts/smoke.mjs`
**Do:**
- [ ] `smoke.mjs --base <origin>` checks:
  - `/health` 200 JSON
  - `/v1/stations?limit=1` 200, `meta.attribution` present
  - `/v1/stations/near?lat=12.9716&lng=77.5946&vehicle=car&min_power_kw=50` 200, every result has a DC charger ≥ 50
  - `/v1/stations/<first id>` 200
  - `/v1/nope` 404 JSON
  - `POST /v1/stations` 405
  - `/docs` 200 HTML
  - `/nope` 404 HTML
  - response header `x-vercel-id` contains `::bom1::`
  - exit 0/1
- [ ] `git push -u origin rebuild/bee-real-data`. Get the preview URL with `gh api repos/shrinivas-sn/ev-charging-stations-api/deployments --jq '.[0]'` and its status `environment_url`.
- [ ] Run smoke against it.
**Test first:** `smoke.mjs` run against local `npm start` (base `http://localhost:3000`, skipping the region and page checks with `--local`) → exit 0.
**Verify:** `node scripts/smoke.mjs --base <preview>` → exit 0.
**Don't touch:** `main`.
**If it fails:** preview protection (401) → log it, and run smoke with `x-vercel-protection-bypass` only if the owner provides it (owner input). Otherwise rely on the production smoke in 6.3, with a rollback ready.
**Commit:** `test: live smoke script`

### Task 6.3 — Merge to `main` (production) and gates

**Goal:** Production serves the new version, and the smoke, production checklist and builder pipeline pass.
**Why:** Owner authorised deploy once everything passes (15/10/2026).
**Where:** GitHub `main`; `E:\OSC\api-projects`
**Do:**
- [ ] `gh pr create --base main --head rebuild/bee-real-data`. Title: `Rebuild on real BEE station data`. Body: summary, test evidence, data counts.
- [ ] `gh pr merge --merge` after CI is green.
- [ ] Wait for the Production deployment to reach `success` (`gh api .../deployments` + statuses).
- [ ] `node scripts/smoke.mjs --base https://ev-charging-stations-api.vercel.app` → exit 0.
- [ ] `node E:/OSC/api-projects/pipeline/deploy/record-live.js --project E:/OSC/api-projects/projects/ev-charging-stations-api --portal https://ev-charging-stations-api.vercel.app --api https://ev-charging-stations-api.vercel.app`
- [ ] `node E:/OSC/api-projects/pipeline/checks/run-checks.js --stage production --project E:/OSC/api-projects/projects/ev-charging-stations-api` → no FAIL.
- [ ] `node E:/OSC/api-projects/pipeline/builder.js --project E:/OSC/api-projects/projects/ev-charging-stations-api` → record the route.
**Test first:** n/a — the gates are the tests.
**Verify:** `node scripts/smoke.mjs --base https://ev-charging-stations-api.vercel.app` → exit 0, and the run-checks report shows no FAIL; paste real output in the Progress Log.
**Don't touch:** public-apis fork.
**If it fails:** see Failure handling (fix forward, or `git revert -m 1` the merge).
**Commit:** merge commit; then `chore: record live checks` in the OSC hub repo for the generated checklist files.

### Task 6.4 — Guides that pass the guide checks

**Goal:** `guides-present`, `guide-urls-live` and `guide-claims` PASS.
**Why:** Production checks require published, accurate guides.
**Where:** `frontend/src/content/guidesData.js`; process in `E:\OSC\api-projects\pipeline\checks\README.md` section "Blog drafting"
**Do:**
- [ ] Follow that process exactly (allowed sources only; every sample run live).
- [ ] Log rows in `api-projects/checklists/ev-charging-stations/blog-log.md`.
**Test first:** the production checklist rows themselves.
**Verify:** re-run `run-checks.js --stage production` → guide rows PASS.
**Don't touch:** guides already passing.
**If it fails:** a guide that can't be made accurate is not published; log it.
**Commit:** `docs(guides): add <id>` per guide

### Checkpoint — Phase 6

- [ ] Full verification: smoke exit 0 on production; production checklist has no FAIL; builder route recorded.
- [ ] Commit made for every task in this phase.
- [ ] Status file updated: "Live on BEE data (<n> stations, snapshot till 26 Oct 2025); production checks pass."
- [ ] Progress Log entry added.

A new session may start here.

---

## Phase 7 — Records and close

**Purpose:** Hub records tell the truth, and this plan closes.
**Starts when:** Phase 6 checkpoint done.
**Re-check first:** `git -C E:/OSC status --short` is clean apart from the checklist files from 6.3.

### Task 7.1 — Correct hub records

**Goal:** `IDEA-LOG.md`, the research note and OSC `DOCS` reflect the real source and state.
**Why:** The IDEA-LOG row claims "GODL dataset; 27,248 stations; Leaflet…; 14/14 tests", all false.
**Where:** `E:\OSC\api-projects\IDEA-LOG.md` (search text: `India EV Charging Station Directory API`), `E:\OSC\api-projects\research\ev-charging-stations.md` (search text: `## Data source`), `E:\OSC\DOCS\STATUS.md`, `E:\OSC\DOCS\README.md` (index row), new `E:\OSC\DOCS\WORK\2026-10-15\WORK.md` section
**Do:**
- [ ] IDEA-LOG row: status `live`, the real counts, source "BEE PDF (till 26 Oct 2025), attribution, no published licence", test counts from the final run.
- [ ] Research note: append a dated "Correction 15/10/2026" section. data.gov.in has only aggregates; the real source is the BEE PDF; criterion 1 is re-scored as "pass with attribution, no explicit licence (owner decision)". Do not delete the original text.
- [ ] OSC STATUS: add a dated section. Index row in DOCS/README per its table format.
**Test first:** n/a — documentation.
**Verify:** `grep -n "GODL dataset; 27,248" E:/OSC/api-projects/IDEA-LOG.md` → no hits.
**Don't touch:** other projects' rows.
**If it fails:** n/a.
**Commit:** in `E:\OSC`: `docs: correct EV charging API records after BEE rebuild`

### Task 7.2 — Close this plan

**Goal:** Durable content is moved to `DOCS/WORK/2026-10-15/` (or the execution date) and `PLAN.md` is deleted.
**Why:** Guide §12.
**Where:** `PLAN.md`
**Do:**
- [ ] Copy Plan issues, Decisions and the Progress Log verbatim into `DOCS/WORK/<date>/REBUILD.md`.
- [ ] Delete `PLAN.md`. Update `STATUS.md` "Next up".
**Test first:** n/a — documentation only.
**Verify:** `ls PLAN.md` → not found; `REBUILD.md` contains the Progress Log.
**Don't touch:** —
**If it fails:** n/a.
**Commit:** `docs: close the BEE rebuild plan`

### Checkpoint — Phase 7

- [ ] Full verification: both repos clean; `main` pushed in both (the OSC hub push only if the owner's usual flow pushes it; else leave committed and say so).
- [ ] Commit made for every task in this phase.
- [ ] Status file updated: final state plus next options (public-apis submission, corridor search, bulk download).
- [ ] Progress Log entry added (in REBUILD.md).

A new session may start here.

---

## Plan issues

*(Append only. The executor records every place where reality differs from this plan —
before starting, or during a task. Decide by impact: a local difference with the same
intent is fixed, logged, and work continues; a difference that touches design, other
tasks, data, security, or anything public pauses only that step and flags the owner with
what to re-verify, while independent work continues; a plan that is wrong at its core
stops the phase with a proposed correction. Never rewrite a planned step silently —
amend it here and mark the task text "amended, see issue N". Surface every entry in the
status file and in the session's final message.)*

| # | When | Task | Plan said | Reality (evidence) | Impact | Action taken | Owner decision |
|---|---|---|---|---|---|---|---|
| 1 | 15/10 | 2.1 | Verify with `python -I -m unittest ingest/test_extract.py`; page 1159 has 36 data rows | `-m unittest` with a file path fails (`No module named 'ingest'`); page 1159 has 37 data rows (only page 1 has a header; planning probe printed 37 table rows, first row data) | local, same intent | Run as `python -I ingest/test_extract.py`; test expects 37 | n/a |
| 3 | 15/10 | 4.1 | Verify `npm run build` passes after Task 4.1 | Pages (Home, Docs, Status, Footer, Playground) read old summary fields (`exampleStation.connectors`, `isOfficial`, `snapshotDate`), so the build can only pass once Task 4.4 updates them; the build was already broken at Phase 4 start because `dataset-summary.mjs` read the deleted `states.json`/`connectors.json` | local, same intent | Task 4.1 verified by `dataset-summary.test.mjs` (4 pass); the build check moves to Tasks 4.2–4.4 | n/a |
| 2 | 15/10 | 2.3, 2.4, 3.3 | Charger entry has `connector_kw`; station `max_charger_kw`; `min_power_kw` compares `charger_kw` | First real build rejected 263 valid combo fast chargers: Connector Rating is a per-gun list (`60+60+22`, 245 rows). A vehicle receives the gun rating, not the charger total (Bharat AC-001: 10 kW charger, 3.3 kW per gun) | touches the API contract (field names, filter meaning) — same intent as "50 kW means a real 50 kW charger", more accurate | Charger entries carry `guns: [{standard, kw}]`; stations carry `max_power_kw` and `max_kw_by_standard`; `min_power_kw` and connector/current/vehicle filters match on one gun. Rejects drop from 264 to 1. Phase 3 contract amended to match | not needed — owner asked for real-world correctness; flagged in STATUS |

---

## Owner inputs

- Already given 15/10/2026: proceed with BEE attribution.
- **Merge to `main` (Task 6.3) is NOT authorised.** Owner, 15/10/2026: "don't make any merge to main right now". Tasks up to 6.2 (branch + preview) proceed; 6.3, 6.4 and Phase 7's live-state rows wait for an explicit owner go-ahead.
- Only if needed: a Vercel preview-protection bypass token (Task 6.2); moving the function region in project settings if `regions` is rejected (Task 5.1).
- Not part of this plan: the public-apis submission and any permission email to BEE.

---

## Decisions

- Source = BEE PDF "till 26 Oct 2025", not data.gov.in (which has aggregates only). (Facts)
- Licence: no published licence; republish with the exact attribution string. Owner decision, 15/10/2026.
- No production deploy until every gate passes; live site keeps the old sample until Task 6.3. Owner decision, 15/10/2026.
- No merge to `main` without a new explicit owner go-ahead, even when all gates pass. Owner decision, 15/10/2026 (supersedes the line above for Task 6.3).
- Python (pdfplumber 0.11.4) only for PDF table extraction; all normalisation in Node with tests. Reason: proven extraction, pinned stack elsewhere. *(assumed)*
- The `E:\adapter-ingestion` framework is not used: it targets record APIs and must not get PDF support from this plan (its skill forbids `src/` changes). Access-ladder evidence: tier 0 data.gov.in aggregates only, tier 1 EV Yatra unreachable, tier 2/3 the page links only the PDF, the Dataful mirror has third-party terms. *(assumed)*
- Station = (operator, lat, lng). Id = `evs_` + 10 hex of sha1 — stable across refreshes; integer ids dropped (no real users of the fake API). *(assumed)*
- Suspect coordinates are kept and flagged, and excluded from radius search and the map. *(assumed)*
- Unknown enum values → 404 with valid values (CONVENTIONS); malformed or unknown parameters → 400. *(assumed)*
- Rate limit 100 / 15 min / IP per CONVENTIONS (the previous 300 had no recorded reason). *(assumed)*
- CDN cache `s-maxage=3600, stale-while-revalidate=86400` on 200/404 `/v1`; no rate-limit headers on cacheable responses. *(assumed)*
- Function region `bom1`. *(assumed)*
- Keep the current light design and OpenFreeMap basemap; fix defects only. *(assumed)*
- `/v1/cities` is added because city errors need a discoverable list. Corridor search and bulk download are left as later options. *(assumed)*

---

## Progress Log

*(Append only. Newest at the bottom. Never rewrite an entry — if it turned out wrong,
add a new one saying so. This log is what makes resuming cheap: a cold session reads
the last entry and knows exactly where to start.)*

### Phase 1 — 15/10/2026
Done:       Branch `rebuild/bee-real-data` created; junk `vercel.json`/`package.json`/`frontend/package.json` edits restored, root `.env.production` deleted, `.gitignore` keeps `.vercel`. Old plans and audit moved to `DOCS/WORK/2026-10-15/` with `REVIEW.md`. `DOCS/TEST-MATRIX.md` written via the test-plan skill.
Verified:   `npm test` → `# pass 36  # fail 0` (old suite, before any code change). `test-plan-check.js DOCS/TEST-MATRIX.md` → `Test plan valid: 95 rows`. `plan-check.js PLAN.md` → `Plan structure complete: 7 phase(s), 27 task(s)`.
Surprises:  Owner instructed mid-session "don't make any merge to main right now" — recorded in Owner inputs and Decisions; Task 6.3 now waits for an explicit go-ahead.
Next:       Task 2.1 — create `ingest/` (requirements, fetch script, extractor, unittest).
Commit:     e810ccd, 56fe4ab, 866b055, aa81875

### Phase 2 — 15/10/2026
Done:       ingest/ extractor (pdfplumber 0.11.4) with last-row recovery; reference tables (states per ISO 3166-2:IN, standards per MoP Annexure II/III, 70 operators); normaliser + build script; real dataset committed; DOCS/DATA-NOTES.md.
Verified:   `python -I ingest/test_extract.py` → OK (9 tests). Full extraction → `rows_total 39641 missing_cells 0 pages 1-1159 of 1159` (8m05s). `node backend/scripts/build-dataset.js ingest/out/raw-rows.json` → `rows 39641 stations 29184 chargers 39640 suspect 115 mixed_admin 65 rejects 1 states 36 operators 70`. reference + normalise + dataset tests → 43 pass, 0 fail. `npm test` → 61 pass, 18 fail (all 18 in the old api.test.js, expected until Phase 3).
Surprises:  263 rows first rejected were valid combo fast chargers with per-gun rating lists → gun model (Plan issue 2). PDF upstream unchanged (Content-Length 7942286, Last-Modified 22 Apr 2026, sha256 f519218f…). stations.json is 21.8 MB — watch function cold start in Task 5.1/6.2.
Next:       Task 3.1 — rewrite backend/test/api.test.js for the Phase 3 contract (gun-based filters per issue 2), then the service layer.
Commit:     7e21f47, fd39be6, 6398a35, 05cf474

### Phase 3 — 15/10/2026
Done:       Service, params, routes and app rewritten for the Phase 3 contract (gun-based filters per issue 2). Tests split per task: api, validation, filters, near, reference-endpoints, http, ratelimit (+ helpers.js). Also proved B-13 (missing/malformed reference table names the file).
Verified:   `npm test` → `# pass 119 # fail 0`. Local `npm start` (port 3918): cold `/v1/stations/near?lat=12.97&lng=77.59&vehicle=car&min_power_kw=50` 0.352 s, warm 0.013 s; car+DC+50 kW near central Bengaluru → total_found 10, nearest Reliance BP 0.5 km (CCS2 60 kW). `/v1/cities` (all India) 515 KB. test-plan-check → `Test plan valid: 95 rows`, 64 proven.
Surprises:  none beyond issue 2. Rate limit default lowered from 300 to 100 per CONVENTIONS (Decisions).
Next:       Task 4.1 — remove frontend `file:..` dependency, rewrite scripts/dataset-summary.mjs for the new meta.json, add frontend/.env.production.
Commit:     428342d, b468cb4, 0fd3b31, 5d5ec8c, 23ceb3c, 24819e4, plus reference-table fix

