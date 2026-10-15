# PLAN — Ship the BEE real-data rebuild (remaining work)

**Written 15/10/2026.** Temporary file — deleted when this closes.

**Goal:** Take branch `rebuild/bee-real-data`, which already passes all 4 build phases, through deploy config, CI, docs, review and a working preview. Then, **only after the owner says so**, merge it to production and correct the hub records.
**Why:** Owner request 15/10/2026: "make a fresh final plan for all this remaining work … that can be executed by AI agents without guessing … step by step so that we don't break anything". It continues the archived plan `DOCS/WORK/2026-10-15/PLAN-bee-rebuild-phases-1-4.md` (Phases 1–4 done; its Phases 5–7 are carried here, rewritten with verified facts).
**What this changes:** this repo (`vercel.json`, `backend/test/`, `backend/scripts/check-upstream.js`, `.github/workflows/`, `scripts/smoke.mjs`, `api.json`, `README.md`, `DOCS/DECISIONS.md`, `frontend/src/pages/DocsPage.jsx`, `STATUS.md`, `DOCS/`). After the owner's go-ahead only: GitHub `main`, and the OSC hub repo `E:\OSC` (`api-projects/IDEA-LOG.md`, `api-projects/research/ev-charging-stations.md`, `api-projects/checklists/ev-charging-stations/`, `DOCS/`).
**Done means:** Phase 6's checkpoint passes: the branch preview at Vercel passes `node scripts/smoke.mjs` with exit 0. Phase 7, if the owner authorises it, then ends with `https://ev-charging-stations-api.vercel.app` passing the smoke script and `run-checks.js --stage production` with no FAIL.
**Out of scope:** public-apis submission; emailing BEE; route/corridor search; bulk download; real-time availability, pricing or booking; any visual redesign; raising body text to 16px or tap targets to 44px (owner's call, see `MOBILE.md`); changes to the shared pipeline (`E:\OSC\api-projects\pipeline`), skills or `E:\adapter-ingestion`; stopping the servers on ports 3000 and 5173.

---

## Read this first

1. Bring the workspace up: `cd E:/OSC/api-projects/projects/ev-charging-stations-api && git fetch origin && git switch rebuild/bee-real-data && git status -sb`. Expect `## rebuild/bee-real-data` (with `...origin/rebuild/bee-real-data` once Task 6.3 has pushed it) and no modified files. If files are modified and you did not change them, stop and ask the owner — do not discard them.
2. Read only: `STATUS.md`, this file's **Rules for every task**, **Failure handling**, your current task, and the last **Progress Log** entry. Do **not** read whole: `backend/data/stations.json` (21.8 MB), anything under `DOCS/WORK/` (archived history), `ingest/cache/*.pdf`, `frontend/dist/`.
3. Detect the environment — run each command; never assume the value:

| Check | Command | Pass looks like |
|---|---|---|
| Node | `node -v` | `v20` or later |
| Python | `python --version` | `Python 3.10` or later |
| Branch | `git branch --show-current` | `rebuild/bee-real-data` |
| GitHub CLI | `gh auth status` | `Logged in to github.com account shrinivas-sn` |
| Backend tests | `npm test 2>&1 \| grep -E "^# (pass\|fail)"` | `# pass 119` (or more) and `# fail 0` |
| Frontend tests | `npm --prefix frontend test 2>&1 \| grep -E "^# (pass\|fail)"` | `# fail 0` |
| Old servers holding files | `netstat -ano \| grep -E ":(3000\|5173) " \| grep LISTEN` | Any output means the previous agent's servers still run. **Never stop them.** Use the split verify in Rules. |
| Free port for your API | `netstat -ano \| grep ":3920 " \| grep LISTEN` | No output. If busy, use 3921, 3922 … and write the port you used in the Progress Log. |
| BEE page reachable | `curl -s -o /dev/null -w "%{http_code}" -m 30 -A "Mozilla/5.0" "http://beeindia.gov.in/show_content.php?lang=1&level=2&ls_id=345&lid=67"` | `200` |

4. A task's **Where:** uses search text, not line numbers. If the text is missing, the code moved: find the equivalent, apply the same intent, and log it under **Plan issues**.
5. Shell: this is Windows with Git Bash. Before running any command that passes a path starting with `/` as an argument (routes such as `/docs`), run `export MSYS_NO_PATHCONV=1`, and write script paths as `E:/...`, not `/e/...`. Without it Git Bash rewrites `/docs` into `C:/Program Files/Git/docs`.

## Facts verified while planning

| Fact | Source | Checked on |
|---|---|---|
| Branch `rebuild/bee-real-data` is 29 commits ahead of `main` and has **never been pushed** (origin has only `main`) | `git log --oneline main..HEAD \| wc -l` → `29`; `git ls-remote --heads origin` → only `refs/heads/main` | 15/10/2026 |
| Every past Vercel deployment of this repo is `Production` from `main`; no preview deployment has ever been made | `gh api repos/shrinivas-sn/ev-charging-stations-api/deployments --jq '.[] \| .environment'` → three `Production` | 15/10/2026 |
| Production deploys come from Vercel's GitHub integration: **any push to `main` deploys to production** | archived plan Facts; deployment creator `vercel[bot]` | 15/10/2026 |
| The Vercel CLI is not installed; GitHub CLI is logged in as `shrinivas-sn` | `which vercel` → not found; `gh auth status` | 15/10/2026 |
| Current `vercel.json`: `framework: vite`, `buildCommand: npm run build`, `outputDirectory: frontend/dist`, `functions["api/index.js"] = { includeFiles: "backend/**", maxDuration: 15 }`, rewrites for `/health`, `/v1`, `/v1/(.*)`, `/docs`, `/playground`, `/status`, `/guides`, `/guides/:id`; headers for `/v1/(.*)` (Cache-Control), `/health` (no-store), `/assets/(.*)` (immutable), `/(.*)` (3 security headers); **no `regions` key** | `vercel.json` | 15/10/2026 |
| The function reads data at runtime by computed paths: `backend/data/stations.json`, `backend/data/meta.json`, `backend/data/reference/*.json` | `backend/src/services/stations-service.js` (search `const DATA_DIR`); `backend/src/lib/reference.js` (search `const REFERENCE_DIR`) | 15/10/2026 |
| `backend/data/stations.json` is 21,837,408 bytes; counts: stations 29184, chargers 39640, states 36, operators 70, suspect_locations 115 | `ls -la backend/data`; `backend/data/meta.json` `counts` | 15/10/2026 |
| The app already sets `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` on GET/HEAD and `no-store` on errors other than 404 and on `/health` | `backend/src/app.js` (search `const CACHEABLE`) | 15/10/2026 |
| The app answers unknown routes with 404 `ROUTE_NOT_FOUND` JSON and other methods on real routes with 405 `METHOD_NOT_ALLOWED` | `backend/src/app.js` (search `METHOD_NOT_ALLOWED`, `ROUTE_NOT_FOUND`) | 15/10/2026 |
| Vercel facts: one function region on Hobby via top-level `"regions"`; a function's own `Cache-Control` overrides a `vercel.json` header for the same route; CDN caches only 200/404/410/30x | `E:\dev-recipes\_knowledge\cache\vercel-express-function-region-cache.md` (verified 2026-10-15, ttl 30 days → valid until 14/11/2026) | 15/10/2026 |
| Backend tests run with `node --test` from `backend/`; files are `backend/test/*.test.js`; the backend has no own lockfile (deps come from the root `package-lock.json`) | `backend/package.json`; `ls backend/test`; `ls backend/package-lock.json` → missing | 15/10/2026 |
| Root scripts: `build` = `cd frontend && npm ci --no-audit --no-fund && npm run build`; `verify` = `npm run test && npm --prefix frontend test && npm run build && npm --prefix frontend run test:build && npm run verify:seo` | root `package.json` | 15/10/2026 |
| Locally, `npm ci` in `frontend/` fails with EPERM while the previous agent's :5173 server holds `frontend/node_modules`; `npm --prefix frontend run build` works | archived plan issue 4; this session | 15/10/2026 |
| No `.github/` folder exists in this repo | `ls .github` → not found | 15/10/2026 |
| CI pattern to copy: `projects/msp-benchmarks-api/.github/workflows/ci.yml` (Node 22, `actions/checkout@v4`, `actions/setup-node@v4`). Weekly-drift pattern: `projects/gst-hsn-sac-api/.github/workflows/upstream-check.yml` (cron `0 4 * * 1`, `permissions: contents: read, issues: write`, label `upstream-drift`, one open issue at a time) | the two files | 15/10/2026 |
| The extractor test skips its real-PDF tests when the PDF is not cached: `@unittest.skipUnless(HAVE_PDF, …)`; `ingest/requirements.txt` = `pdfplumber==0.11.4` | `ingest/test_extract.py` (search `skipUnless`) | 15/10/2026 |
| BEE page (http only) holds the anchor `<a href="/WriteReadData/RTF1984/EV_PCS_Data_29277.pdf" …>EV Public Charging Stations Data till 26th October 2025 (Click to view the detailed list)`; the PDF answers 200, `Content-Type: application/pdf`, `Content-Length: 7942286` | `curl -A "Mozilla/5.0"` of the page and `curl -I` of the PDF | 15/10/2026 |
| `backend/data/source.json` = url `http://beeindia.gov.in/WriteReadData/RTF1984/EV_PCS_Data_29277.pdf`, page_url `http://beeindia.gov.in/show_content.php?lang=1&level=2&ls_id=345&lid=67`, sha256 `f519218fa96a04f57b3c56e919a8045133e7df1307a77710cca0076ab25b6882`, size_bytes 7942286 | `backend/data/source.json` | 15/10/2026 |
| Manifest validator: `node E:/OSC/api-projects/pipeline/manifest/manifest.js validate <projectDir>`; exit 0 valid, 2 invalid, 1 error; current `api.json` → `valid: api.json` | run on 15/10/2026 | 15/10/2026 |
| Manifest schema: `source.url` must be an **https** URL or `null`; `stack` is an open object (any keys) | `pipeline/manifest/api-manifest.schema.json` (search `"source"`, `"stack"`) | 15/10/2026 |
| BEE's site does not answer over HTTPS (TLS fails); only `http://` works | archived plan Facts | 15/10/2026 |
| Current `api.json` still describes the old generated sample (one_liner "generated sample dataset", source data.gov.in/GODL, `stack.dataset.generator`, route `/v1/stations/1`, no `/v1/cities`) | `api.json` | 15/10/2026 |
| Production check `docs-route-parity` reads every `/v1/[A-Za-z0-9_/{}:.-]*` match on the live `/docs` page, strips only trailing `.` and `/`, and fails if a documented path is not a prefix of an `api.json` api route, or an api route is not documented. `{name}` segments match anything | `pipeline/checks/probes/docs-route-parity.js` | 15/10/2026 |
| The built docs page contains these `/v1/` paths: `/v1/stations/near`, `/v1/operators`, `/v1/stations`, `/v1/stations/{id}`, `/v1/stations/evs_ef45e67bd1`, `/v1/cities`, `/v1/states`, `/v1/connectors`, `/v1/meta`, **`/v1/stations/near:`** and `/v1/stations/{id}:`. `near:` would FAIL parity; it comes from `DocsPage.jsx` (search `Only on /v1/stations/near: great-circle`) | regex run over `frontend/dist/docs/index.html` | 15/10/2026 |
| Station `evs_ef45e67bd1` exists in the dataset | `grep -c '"evs_ef45e67bd1"' backend/data/stations.json` → 1 | 15/10/2026 |
| Production check `guide-urls-live` requests every `https://ev-charging-stations-api.vercel.app/v1…` URL written in `frontend/src/content/guidesData.js`; today there is one: `/v1/connectors`. `guides-present` needs ≥ 3 guides; there are 3. `gsc-file` needs `frontend/public/google*.html`; `google217f586494c0c937.html` exists | `pipeline/checks/production.json`; grep of guidesData.js; `ls frontend/public` | 15/10/2026 |
| Pipeline commands: `run-checks.js --stage <stage> --project <dir>`; `record-live.js --project <dir> --portal <https origin> [--api <https origin>]`; `builder.js --project <path> [--api-url <url>] [--dry-run]` | `Usage` lines in each file under `E:\OSC\api-projects\pipeline` | 15/10/2026 |
| The checks README "Blog drafting" step 6 says `git push origin main`. **That conflicts with the owner's rule** — this plan overrides it (see Rules) | `pipeline/checks/README.md` (search `## Blog drafting`) | 15/10/2026 |
| Hub IDEA-LOG row is false: `GODL dataset; 27,248 stations; Leaflet OSM …; 14/14 tests` | `E:\OSC\api-projects\IDEA-LOG.md` (search `India EV Charging Station Directory API`) | 15/10/2026 |
| Hub `DOCS/README.md` is docs-structure v1; index columns: `Date \| Summary \| Status \| Load-bearing \| Touches \| Continues` | `E:\OSC\DOCS\README.md` | 15/10/2026 |
| README still describes the generated sample and uses `http://localhost:3000` examples | `README.md` (search `Data status: generated sample`) | 15/10/2026 |

## Rules for every task

- **Never push to, merge into, or open a merged PR against `main` without the owner's explicit go-ahead in chat for that action.** Phase 7 starts only after that message. Pushing the branch `rebuild/bee-real-data` is allowed (Task 6.3) — it makes a Vercel *preview*, not production.
- **Never stop, kill or restart processes on ports 3000 or 5173.** They belong to another agent. Stop only the servers you started yourself.
- BEE data is republished **with attribution**. The exact attribution string is used wherever attribution appears: `Data: Bureau of Energy Efficiency (BEE), Ministry of Power, Government of India — "EV Public Charging Stations Data till 26th October 2025". Republished with attribution; not an official BEE service.`
- Never invent data. Never edit `backend/data/*.json` in this plan.
- Test first: write the failing test, run it, see it fail for the stated reason, then implement.
- Never weaken an existing test assertion. The only assertions a task may change are on its **Don't touch** may-change list.
- **Split verify** (use while the :5173 server runs; `npm run verify` itself fails locally on `npm ci` EPERM): run these five and require each to pass:
  1. `npm test` → `# fail 0`
  2. `npm --prefix frontend test` → `# fail 0`
  3. `npm --prefix frontend run build` → ends with `[prerender] Rendered 8 pages and 404.html.`
  4. `npm --prefix frontend run test:build` → `# fail 0`
  5. `npm run verify:seo` → `0 errors`
  When netstat shows nothing on :5173, run `npm run verify` instead and expect all of the above.
- One task, one commit, on `rebuild/bee-real-data`. Message exactly as the task's **Commit** line, then a blank line, then the attribution lines the session's system reminder specifies (if none is given, add none).
- **No AI slop.** Applies to every word and line this plan adds. The standard comes from the sources below, never from a word list written into this plan:
  - Prose (README, DECISIONS, guides, docs-page strings, workflow issue text, PR body, hub records): before committing, run the `no-ai-slop-writing` skill in **Detect** mode on the new or changed text. If the executor cannot invoke skills, read `~/.claude/skills/no-ai-slop-writing/SKILL.md` (check with `ls`) and apply its patterns by hand. Fix every named pattern, then run Detect again until none remain. Paste the final Detect result (or "no patterns found") into the Progress Log.
  - UI (only if a task touches `frontend/src` markup or styles): no pattern from `E:/dev-recipes/_knowledge/slop-signatures.md` or `~/.claude/skills/no-ai-slop/references/banned-patterns.md`. Read both before the edit.
  - Code: match the surrounding file's comment density, naming and idiom. No new helpers, options, flags, abstractions, emojis or log lines beyond what the task's **Do** list names.
  - Scope: add nothing the task does not ask for: no extra README sections, badges, features, endpoints or files. Anything worth adding goes into the Progress Log as a suggestion for the owner.
  - If a source file above is missing, log a Plan issue and keep to the Code and Scope bullets. Never invent a replacement list.
- Never commit secrets. A Vercel protection-bypass value (Task 6.3) is used only as an environment variable in the shell, never written to a file.
- Behaviour of a library or platform you have not verified goes through `/context-brief` first, not memory.
- Background servers you start: note their task/process ids in your session and stop them at the end of the task that needs them.

## Failure handling

| Situation | Do this |
|---|---|
| A search-text anchor is missing | Find the equivalent code, apply the same intent, log a Plan issue row (local, same intent), continue. |
| `npm ci` fails with EPERM locally | Expected while :5173 runs. Use the split verify. Do not delete `node_modules`. If `frontend/node_modules` ends up empty, run `cd frontend && npm install` (not `ci`), then confirm `git status --short` shows no change to `frontend/package.json` or `frontend/package-lock.json`; if it does, `git checkout -- frontend/package.json frontend/package-lock.json`. |
| A command passes `/something` and errors about `C:/Program Files/Git/...` | Run `export MSYS_NO_PATHCONV=1` and retry. |
| Headless-browser checks hang on the second page load in one browser | Known: the API's `stale-while-revalidate` makes Chrome revalidate in the background and DevTools never marks it finished. Launch a fresh browser per page/viewport (see `MOBILE.md` Notes). |
| BEE fetch fails (timeout, non-200, HTML instead of PDF) | Retry twice with `-A "Mozilla/5.0"` over `http://`. If it still fails, log the real output; this blocks only the live-run verify of Task 5.2, not the task's tests. |
| Preview deploy answers 401 / a Vercel login page | Preview protection is on. Ask the owner once for a "Protection Bypass for Automation" secret (Owner inputs). Continue Task 6.4 against the local server meanwhile. |
| Preview deploy 404s on `/v1/*` | `vercel.json` rewrites are wrong. Compare with Task 5.1 exactly. Never add a page wildcard rewrite. |
| Preview function errors (500) or cold start > 3 s on `/health` | Get the error: `gh api repos/shrinivas-sn/ev-charging-stations-api/deployments/<id>/statuses --jq '.[0].log_url'` and open it. If the log says a data file is missing, check `includeFiles` (Task 5.1). Fix on the branch, push the branch again. Never change the API shape. |
| Production check FAILs after the owner-approved merge | Fix forward on a new branch from `main`, PR, and **ask the owner** before merging. If the site is broken for users, tell the owner and propose `git revert -m 1 <merge sha>` on `main`; run it only on the owner's go-ahead. |
| Anything else fails | Fix and retry at most three times. Then set the work aside (`git stash push -m "<task> blocked"`), record the real output in the Progress Log, and continue with the next independent task. Retry once at phase end. |
| The plan itself looks wrong | Follow **Plan issues** below — decide by impact, never freeze the whole plan. |
| Owner-only actions | Merge/push to `main`, PR merge, a Vercel protection-bypass secret, Vercel dashboard settings, the public-apis submission, any email to BEE, any paid feature — ask once, continue other tasks. |

---

## Phase 5 — Deployment config, automation and docs

**Purpose:** `vercel.json` runs the function in Mumbai with only the data it needs; CI runs on every push; a weekly job notices a new BEE file; manifest, README and decisions describe the real system.
**Starts when:** now (Phase 4 checkpoint passed — see `DOCS/WORK/2026-10-15/PLAN-bee-rebuild-phases-1-4.md` Progress Log).
**Re-check first:**
- Today's date ≤ 14/11/2026, else refresh `E:\dev-recipes\_knowledge\cache\vercel-express-function-region-cache.md` through `/context-brief` before Task 5.1 and log any changed fact.
- `npm test` → `# fail 0`. If not, stop the phase and log it — something changed since planning.

### Task 5.1 — `vercel.json`: Mumbai region and data-only includeFiles

**Goal:** `vercel.json` pins the function to `bom1`, ships only `backend/data/**` as extra files, and drops the redundant `/v1` Cache-Control header; everything else stays.
**Why:** The function in `iad1` adds about 250 ms for Indian users. Data files are read by computed paths, so they must be listed in `includeFiles`; `backend/**` also ships tests and scripts for nothing. The function already sets its own caching.
**Where:** `vercel.json` (search text: `"includeFiles": "backend/**"`); new test `backend/test/vercel-config.test.js`
**Do:**
- [ ] Write the test first (below). Read the file with `JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "vercel.json"), "utf8"))`. Use `node:test` and `node:assert/strict`, CommonJS, like the other backend tests.
- [ ] Add a top-level key `"regions": ["bom1"]` directly after `"outputDirectory"`.
- [ ] Change `functions["api/index.js"].includeFiles` from `"backend/**"` to `"backend/data/**"`. Keep `"maxDuration": 15`.
- [ ] Delete the whole headers entry whose `"source"` is `"/v1/(.*)"` (the one setting `public, s-maxage=3600, stale-while-revalidate=86400`).
- [ ] Keep unchanged: `$schema`, `framework`, `buildCommand`, `outputDirectory`, all 8 rewrites in their order, the `/health` no-store header, the `/assets/(.*)` immutable header, the `/(.*)` security headers.
**Test first:** `backend/test/vercel-config.test.js`, one `test()` per line:
- `regions` deep-equals `["bom1"]` → fails now (missing).
- `functions["api/index.js"].includeFiles === "backend/data/**"` → fails now.
- no `headers[]` entry has `source === "/v1/(.*)"` → fails now.
- `framework === "vite"`, `outputDirectory === "frontend/dist"`, `buildCommand === "npm run build"` → passes now.
- every `rewrites[].source` is one of exactly `/health`, `/v1`, `/v1/(.*)`, `/docs`, `/playground`, `/status`, `/guides`, `/guides/:id` → passes now.
- no rewrite source other than `/v1/(.*)` contains `(.*)` → passes now.
- `/health` header has `Cache-Control: no-store`; `/(.*)` header has `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` → passes now.
Run `npm test` and confirm exactly the first three fail.
**Verify:** `npm test 2>&1 | grep -E "^# (pass|fail)"` → `# fail 0`. Then `OUT=$(mktemp -d) && node E:/OSC/api-projects/pipeline/deploy/plan-deploy.js --project E:/OSC/api-projects/projects/ev-charging-stations-api --out "$OUT" && grep -rn "portal-routing-config" "$OUT"` → a line containing `- [x] portal-routing-config` (writing to a temp `--out` keeps the hub checklist untouched).
**Don't touch:** `api/index.js`, `backend/src/**`, any other test file. May-change list: none.
**If it fails:** if `plan-deploy.js` rejects `--out`, run it without `--out`, check the line in `E:/OSC/api-projects/checklists/ev-charging-stations/deploy.md`, then `git -C E:/OSC checkout -- api-projects/checklists/ev-charging-stations/deploy.md` to undo the change in the hub. A Vercel rejection of `regions` can only show at Task 6.3 — handled there.
**Commit:** `chore(deploy): run the function in bom1 and ship only the dataset with it`

### Task 5.2 — `check-upstream.js`: detect a new BEE file

**Goal:** A script reports whether BEE's linked file still matches `backend/data/source.json`: exit 0 same, 2 changed, 1 error, with JSON on stdout.
**Why:** Without it the dataset silently goes stale. The workflow in Task 5.3 runs it weekly.
**Where:** new `backend/scripts/check-upstream.js`; new test `backend/test/check-upstream.test.js`
**Do:**
- [ ] Export `async function checkUpstream({ fetchImpl, source })` and run as CLI only when `require.main === module`. CommonJS, Node built-ins only (`node:crypto`, `node:fs`, `node:path`); global `fetch` is the default `fetchImpl`.
- [ ] Steps inside `checkUpstream`, in this order:
  1. GET `source.page_url` with header `User-Agent: Mozilla/5.0` and a 60 s timeout (`AbortSignal.timeout(60000)`). Non-200 → return `{ code: 1, status: "error", reason: "page HTTP <status>" }`.
  2. Find the first `<a … href="…">TEXT` where TEXT contains `EV Public Charging Stations Data`. Regex (case-insensitive): `/<a\b[^>]*href="([^"]+)"[^>]*>([^<]*EV Public Charging Stations Data[^<]*)</i`. None → `{ code: 1, status: "error", reason: "anchor not found" }`.
  3. Resolve the href against `source.page_url` with `new URL(href, page_url)`. Trim and collapse whitespace in TEXT → `anchor_text`.
  4. GET the resolved URL with the same header and a 120 s timeout. Non-200 → code 1, reason `pdf HTTP <status>`. Read the body as bytes. If the first 4 bytes are not `%PDF` → code 1, reason `not a PDF`.
  5. Compute sha256 (hex) and byte length.
  6. `changed = upstream.url !== source.url || upstream.sha256 !== source.sha256`. Return `{ code: changed ? 2 : 0, status: changed ? "changed" : "same", current: { url, sha256, size: size_bytes }, upstream: { url, sha256, size, anchor_text } }`.
  7. Any thrown error (network, timeout) → `{ code: 1, status: "error", reason: err.message }`.
- [ ] CLI: read `backend/data/source.json` (path from `__dirname`), call `checkUpstream`, print the result as JSON (2-space indent) on stdout, set `process.exitCode = result.code`. Never write any file.
**Test first:** `backend/test/check-upstream.test.js` with a fake `fetchImpl` returning `new Response(...)` objects keyed by URL; `source` = a small object with `page_url: "http://bee.test/page"`, `url: "http://bee.test/a.pdf"`, and `sha256` of the bytes `%PDF-1.4 test`:
- page links `/a.pdf`, PDF bytes `%PDF-1.4 test` → code 0, status `same`.
- page links `/b.pdf` (same bytes) → code 2, upstream.url `http://bee.test/b.pdf`.
- page links `/a.pdf`, bytes `%PDF-1.4 other` → code 2.
- page HTML has no matching anchor → code 1, reason `anchor not found`.
- PDF URL returns `<html>…` → code 1, reason `not a PDF`.
- page returns 503 → code 1.
- `fetchImpl` throws → code 1.
**Verify:** `npm test 2>&1 | grep -E "^# (pass|fail)"` → `# fail 0`. Live: `node backend/scripts/check-upstream.js; echo "exit $?"` → JSON with `"status": "same"` and `exit 0`. If BEE is unreachable, record the real output (see Failure handling) — the task is still done.
**Don't touch:** `backend/data/**`, `backend/scripts/build-dataset.js`, `ingest/**`. May-change list: none.
**If it fails:** if the live run returns `changed`, **do not** rebuild data. Record the JSON in the Progress Log and tell the owner — a data refresh is a separate decision.
**Commit:** `feat(data): check-upstream script that detects a new BEE station file`

### Task 5.3 — GitHub Actions: CI and weekly BEE check

**Goal:** `.github/workflows/ci.yml` runs every test and the build on push and PR; `.github/workflows/upstream-check.yml` runs Mondays 04:00 UTC and opens one labelled issue when BEE changes.
**Why:** Regressions must be caught before they reach `main`, and staleness must be noticed.
**Where:** new `.github/workflows/ci.yml`, new `.github/workflows/upstream-check.yml`
**Do:**
- [ ] `ci.yml`, exact structure:
  - `name: ci`; `on: { push: {}, pull_request: {} }`; `permissions: { contents: read }`.
  - job `node` (`runs-on: ubuntu-latest`): steps `actions/checkout@v4`; `actions/setup-node@v4` with `node-version: 22`, `cache: npm`, `cache-dependency-path: |` listing `package-lock.json` and `frontend/package-lock.json`; `run: npm ci`; `run: npm ci --prefix frontend`; `run: npm run verify`.
  - job `ingest` (`runs-on: ubuntu-latest`): steps `actions/checkout@v4`; `actions/setup-python@v5` with `python-version: "3.12"`; `run: python -m pip install -r ingest/requirements.txt`; `run: python -I ingest/test_extract.py` (the real-PDF tests skip without the cached PDF — expected).
- [ ] `upstream-check.yml`: copy `E:/OSC/api-projects/projects/gst-hsn-sac-api/.github/workflows/upstream-check.yml` structure exactly (name `upstream-check`, cron `'0 4 * * 1'`, `workflow_dispatch: {}`, permissions `contents: read` + `issues: write`, env `GITHUB_TOKEN`/`GH_REPO`, Node 22, the `set +e … PIPESTATUS … code=` step, the "already open" guard), with these differences:
  - first comment line: `# Weekly check that BEE's linked EV charging station file still matches backend/data/source.json.`
  - the check step runs `node backend/scripts/check-upstream.js | tee check.json`.
  - label: `gh label create upstream-drift --description "BEE published a different EV charging station file" --force`.
  - on code 2: issue title `BEE published a new EV charging station list: $(jq -r '.upstream.anchor_text' check.json)`; body: `Upstream $(jq -r '.upstream.url' check.json) (sha256 $(jq -r '.upstream.sha256' check.json | cut -c1-12)) differs from the pinned $(jq -r '.current.url' check.json) (sha256 $(jq -r '.current.sha256' check.json | cut -c1-12)). Refresh: bash ingest/fetch_bee_pdf.sh, python -I ingest/extract_bee_pdf.py ingest/cache/EV_PCS_Data_29277.pdf ingest/out/raw-rows.json, npm run build-data, npm test — see README "Refreshing the data".`
  - add a step `Report a failed check` with `if: steps.check.outputs.code == '1'` that opens (with the same "already open" guard, label `upstream-drift`) an issue titled `Weekly BEE check failed to reach BEE` whose body is `$(jq -r '.reason' check.json)`, then `exit 0` — BEE may block runner IPs and the job must not fail red every week.
  - therefore the check step's last line is `[ "$code" = "0" ] || [ "$code" = "1" ] || [ "$code" = "2" ]`.
- [ ] Confirm the refresh script names used in the issue body exist: `ls ingest/fetch_bee_pdf.sh ingest/extract_bee_pdf.py` and `grep -n '"build-data"' package.json`. If a name differs, use the real name and log a Plan issue.
**Test first:** n/a — workflow YAML has no local runner; the YAML is parsed below and the job proves itself on the first push (Task 6.3).
**Verify:** `python -c "import sys,yaml; [yaml.safe_load(open(f)) for f in sys.argv[1:]]; print('yaml ok')" .github/workflows/ci.yml .github/workflows/upstream-check.yml` → `yaml ok`. If `yaml` is not installed: `python -m pip install pyyaml` into the user site, then retry. Workflows actually running is verified in Task 6.3. No-AI-slop Detect (Rules) on the issue title/body strings and YAML comments you wrote → no patterns remain.
**Don't touch:** the gst-hsn-sac repo; any other file. May-change list: none.
**If it fails:** fix the YAML indentation; never add `continue-on-error` to the `ci.yml` steps.
**Commit:** `ci: test workflow and weekly BEE upstream check`

### Task 5.4 — Manifest, docs wording, README and decisions

**Goal:** `api.json`, `README.md` and `DOCS/DECISIONS.md` describe the real BEE-based system, and the docs page passes `docs-route-parity`.
**Why:** The pipeline checks read `api.json`; the README is a developer's first contact; the docs page currently has a `/v1/stations/near:` string that fails parity.
**Where:** `api.json` (search text: `"source": {`); `frontend/src/pages/DocsPage.jsx` (search text: `Only on /v1/stations/near: great-circle`); `README.md` (search text: `Data status: generated sample`); `DOCS/DECISIONS.md` (append at end)
**Do:**
- [ ] `DocsPage.jsx`: change `'Only on /v1/stations/near: great-circle distance from the search point, 2 decimals.'` to `'Only in /v1/stations/near results. Great-circle distance from the search point, 2 decimals.'` Change `'Only on /v1/stations/{id}: the PDF pages and row count this station came from.'` to `'Only in /v1/stations/{id} responses. The PDF pages and row count this station came from.'`
- [ ] `api.json` — set exactly:
  - `one_liner`: `Keyless REST API for India's public EV charging stations from the Bureau of Energy Efficiency list: radius search, per-gun power, connector and vehicle filters, with attribution.`
  - `source.name`: `Bureau of Energy Efficiency (BEE), Ministry of Power — EV Public Charging Stations Data till 26th October 2025 (PDF)`
  - `source.url`: `null` (the schema requires https; BEE serves only http — the http URL goes in `stack.dataset.source_pdf_url`).
  - `source.license`: `No licence published by BEE; republished with attribution (owner decision 15/10/2026).`
  - `not_provided`: exactly `["real-time charger availability or occupancy", "charging prices, payment or booking", "opening hours (not in the BEE source)"]`
  - `stack.map`: keep. `stack.dataset`: replace the whole object with `{ "status": "real", "source_pdf_url": "http://beeindia.gov.in/WriteReadData/RTF1984/EV_PCS_Data_29277.pdf", "snapshot_label": "till 26th October 2025", "stations": 29184, "chargers": 39640, "states_and_union_territories": 36, "charge_point_operators": 70 }` — take each number from `backend/data/meta.json` `counts` at execution time, not from this line, if they differ.
  - `routes`: replace `{ "path": "/v1/stations/1", … }` with `{ "path": "/v1/stations/evs_ef45e67bd1", "base": "api", "kind": "api" }`, and add `{ "path": "/v1/cities", "base": "api", "kind": "api" }` after `/v1/states`. Keep every other route.
- [ ] Rebuild (`npm --prefix frontend run build`), then run this parity check and require its output `parity ok`:
  `node -e 'const fs=require("fs");const t=fs.readFileSync("frontend/dist/docs/index.html","utf8");const seg=p=>p.split("/").filter(Boolean);const isP=s=>s.startsWith(":")||s.startsWith("{");const m=(d,r)=>d.every((s,i)=>i<r.length&&(isP(s)||s===r[i]));const docs=[...new Set((t.match(/\/v1\/[A-Za-z0-9_\/{}:.-]*/g)||[]).map(p=>p.replace(/[.\/]+$/,"")))].map(seg);const man=require("./api.json").routes.filter(r=>r.kind==="api"&&r.path.startsWith("/v1/")).map(r=>seg(r.path));const bad=[];for(const d of docs)if(!man.some(r=>m(d,r)))bad.push("doc not in manifest: /"+d.join("/"));for(const r of man)if(!docs.some(d=>d.length===r.length&&m(d,r)))bad.push("manifest not documented: /"+r.join("/"));console.log(bad.length?bad.join("\n"):"parity ok")'`
  If it lists `/v1/stations/evs_…` with a different id, the docs page derives its example id from the data: put **that** id in `api.json` instead and log it.
- [ ] `README.md` — rewrite fully with these sections in this order (headings exact): `# India EV Charging Station Directory API`, a 2-sentence intro (keyless REST API over BEE's public charging station list; 29,184 stations / 39,640 chargers, till 26 Oct 2025 — numbers from `meta.json`), `## Attribution` (the exact attribution string from Rules, plus "BEE publishes no licence for this file; it is republished with attribution."), `## Quick start` (base `https://ev-charging-stations-api.vercel.app`; three curl examples copied from the Home page questions: `/v1/stations/near?lat=12.9716&lng=77.5946&vehicle=car&current=dc&min_power_kw=50`, `/v1/stations?city=Pune&vehicle=two_three_wheeler`, `/v1/stations?state=KL&connector=CCS2`), `## Endpoints` (one table row per route in `frontend/src/content/apiReference.js` `path:` entries: path, params, description — copy the text), `## Filters` (vehicle, current, connector, min_power_kw, state, city, operator, location_quality, page, limit — one line each, taken from `backend/src/lib/params.js`), `## Errors and limits` (error envelope, codes from `apiReference.js`, rate limit 100 requests / 15 min per client, `Retry-After` on 429), `## Data` (link `DOCS/DATA-NOTES.md`; 115 suspect coordinates are flagged and excluded from radius search; one row rejected), `## Refreshing the data` (steps: `bash ingest/fetch_bee_pdf.sh` → `python -I ingest/extract_bee_pdf.py ingest/cache/EV_PCS_Data_29277.pdf ingest/out/raw-rows.json` (≈8–14 min) → `npm run build-data` → `npm test`; if BEE's file name changes, pass the new URL as `BEE_PDF_URL=<url> bash ingest/fetch_bee_pdf.sh` and use the new cached file name; the weekly `upstream-check` workflow opens an issue when BEE changes the file), `## Local development` (`npm install`, `npm --prefix frontend install`, `npm start` → API on the port in `PORT` (default 3000), `npm run dev` → portal), `## Limitations` (the three `not_provided` items; data is a snapshot, not live), `## License` (code MIT; data per Attribution). Badges: keep the MIT, auth and CORS badges; replace the dataset badge with `[![Data: BEE, till 26 Oct 2025](https://img.shields.io/badge/data-BEE%20till%2026%20Oct%202025-blue)](DOCS/DATA-NOTES.md)`.
- [ ] Check the refresh commands named in the README exist (`ls ingest/fetch_bee_pdf.sh ingest/extract_bee_pdf.py`); use the real names if they differ and log it.
- [ ] Run each of the 3 README curl paths against a local API (`PORT=3920 npm start` in the background; `curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3920<path>"`) → `200` each. Stop that server afterwards.
- [ ] `DOCS/DECISIONS.md` — append (never edit old entries) a section `## 2026-10-15: Rebuild on the BEE station list` with one bullet each: source switched from a generated sample to the BEE PDF (data.gov.in has only aggregates); attribution without a published licence (owner decision); station ids `evs_` + 10 hex from operator + coordinates; per-gun power, connector, current and vehicle filters (a vehicle receives the gun rating, not the charger total); unknown enum values → 404 with valid values, malformed → 400; suspect coordinates kept, flagged, excluded from radius search; rate limit 100 / 15 min per client; function region `bom1`; Python only in `ingest/` for PDF extraction; `api.json source.url` is null because BEE serves http only.
**Test first:** the parity one-liner above, run **before** the edits → it prints `doc not in manifest: /v1/stations/near:` (and `manifest not documented` lines) — that is the failing test.
**Verify:**
- `node E:/OSC/api-projects/pipeline/manifest/manifest.js validate .` → `valid: api.json`, exit 0.
- parity one-liner → `parity ok`.
- `grep -rniE "generated sample|not official government|data\.gov\.in|GODL" README.md api.json frontend/src` → only README lines that say data.gov.in has aggregates only (if you wrote that); no other hits.
- No-AI-slop Detect (Rules) on `README.md`, the new `DOCS/DECISIONS.md` section and the two changed `DocsPage.jsx` strings → no patterns remain.
- split verify (Rules) → all pass.
**Don't touch:** `DOCS/WORK/`, `.env.example` (already correct), other pages. May-change list: `frontend/scripts/docs-parity.test.mjs` only if it asserts the exact old `near:` sentence (check with `grep -n "near:" frontend/scripts/*.test.mjs`; if no hit, change nothing).
**If it fails:** the manifest validator message names the field — fix that field only.
**Commit:** `docs: manifest, README and decisions for the BEE-based release`

### Checkpoint — Phase 5

- [ ] Full verification: split verify (Rules) → all five pass; `node E:/OSC/api-projects/pipeline/manifest/manifest.js validate .` → exit 0; YAML check from Task 5.3 → `yaml ok`.
- [ ] Commit made for every task in this phase (`git log --oneline -5` shows the four commit messages).
- [ ] Status file updated: `STATUS.md` "Phase:" line → `Phase 5 done — ready for review and preview`; "Next up" item 1 → `Task 6.1 — review`.
- [ ] Progress Log entry added.

A new session may start here.

---

## Phase 6 — Review, smoke script, preview

**Purpose:** Independent review, a smoke script, and a working Vercel **preview** of the branch — everything short of production.
**Starts when:** Phase 5 checkpoint done.
**Re-check first:** `git log --oneline main..HEAD` lists the Phase 5 commits; `git status --short` is empty.

### Task 6.1 — Review the branch

**Goal:** Findings from `/myreview` and the `prod-bug-auditor` agent are fixed (test-first) or recorded with a reason.
**Why:** The owner asked for production-grade review from frontend to backend before shipping.
**Where:** diff `main...rebuild/bee-real-data`
**Do:**
- [ ] Run `/myreview` on the branch diff (`git diff main...HEAD`), skipping `backend/data/**` and `frontend/dist/**`.
- [ ] Run the `prod-bug-auditor` agent on: `backend/src/`, `backend/scripts/`, `api/`, `vercel.json`, `ingest/*.py`, `frontend/src/`, `.github/workflows/`.
- [ ] Put every finding in a table in the Progress Log: id, severity, file, verdict (fix / reject with reason).
- [ ] Fix each accepted finding test-first, one commit each.
- [ ] A finding that asks for a design change, data change, a new feature, or anything in **Out of scope** → do not fix; log it as a Plan issue for the owner.
- [ ] Slop pass on the whole branch diff (Rules → No AI slop): Detect on every prose file changed in `git diff --name-only main...HEAD` (skip `backend/data/**`, `DOCS/WORK/**`); for code, list added comments with `git diff main...HEAD -- '*.js' '*.jsx' '*.mjs' | grep -E '^\+\s*(//|/\*|\*)'` and remove any that only restate the next line or exceed the file's usual comment density. Each fix is its own commit `docs: remove AI-slop wording in <file>` or `refactor: trim comments in <file>`.
**Test first:** per accepted finding, a failing test that reproduces it.
**Verify:** split verify → all pass; re-run `/myreview` on the new commits → no open high or critical finding.
**Don't touch:** Out-of-scope items; `backend/data/**`. May-change list: an assertion that a finding proves wrong — log the old and new assertion in Plan issues.
**If it fails:** disagreeing with a finding → record it with evidence in Plan issues; the owner decides.
**Commit:** `fix(<scope>): <finding in a few words>` per finding, or `none — no accepted findings`

### Task 6.2 — Smoke script

**Goal:** `scripts/smoke.mjs` proves a deployed origin works end to end, and exits 0 or 1.
**Why:** It is the gate for both the preview (6.3) and production (7.2).
**Where:** new `scripts/smoke.mjs` (repo root `scripts/` folder; create it)
**Do:**
- [ ] ESM, Node built-ins only, `node:assert/strict`, global `fetch` with `AbortSignal.timeout(90000)`. Pattern: `E:/OSC/api-projects/projects/lgd-admin-hierarchy-api/scripts/smoke.mjs`.
- [ ] Arguments: `--base <origin>` (required; https, or http only for `localhost`; no path) and `--local` (skips the page checks and the region check).
- [ ] If the environment variable `VERCEL_PROTECTION_BYPASS` is set, send header `x-vercel-protection-bypass: <value>` on every request. Never print the value.
- [ ] Checks, in order, each printing `ok <name>` or failing with a clear message:
  1. `GET /health` → 200, JSON.
  2. `GET /v1/stations?limit=1` → 200, `body.meta.attribution` is a non-empty string containing `Bureau of Energy Efficiency`; take `body.data[0].id` as `firstId`.
  3. `GET /v1/stations/near?lat=12.9716&lng=77.5946&vehicle=car&current=dc&min_power_kw=50` → 200; `body.data.length >= 1`; every station has `max_power_kw >= 50`.
  4. `GET /v1/stations/<firstId>` → 200, `body.data.id === firstId`.
  5. `GET /v1/cities?state=KA` → 200, `body.data.length >= 1`.
  6. `GET /v1/nope` → 404, JSON, `body.success === false`.
  7. `POST /v1/stations` → 405.
  8. unless `--local`: `GET /docs` → 200, `content-type` includes `text/html`; `GET /this-page-does-not-exist` → 404.
  9. unless `--local`: `GET /health` response header `x-vercel-id` matches `/::bom1::/` (the function region; `/health` is never CDN-cached).
- [ ] Count one per numbered check above that ran (check 8 counts once): `--local` runs checks 1–7 → 7; full runs 1–9 → 9.
- [ ] On any failure: print the failing check and exit 1. All passed: print `smoke ok (<n> checks)` and exit 0.
- [ ] Before writing check 3, confirm the field name: `grep -n "max_power_kw" backend/src/lib/normalise.js backend/test/api.test.js` (verified 15/10/2026: station field `max_power_kw`, asserted in `api.test.js`). If it has another name, use it and log a Plan issue.
**Test first:** run the script against a local API before writing check 3's implementation to see it fail, then complete it. Local: `PORT=3920 npm start` in the background; `node scripts/smoke.mjs --base http://localhost:3920 --local` → exit 0 at the end.
**Verify:** `node scripts/smoke.mjs --base http://localhost:3920 --local; echo "exit $?"` → `smoke ok (7 checks)`, `exit 0`. Stop your local server.
**Don't touch:** backend and frontend code. May-change list: none.
**If it fails:** a check failing on correct API behaviour means the check is wrong — compare with the backend tests in `backend/test/` and fix the check, logging it.
**Commit:** `test: live smoke script`

### Task 6.3 — Push the branch and smoke-test the Vercel preview

**Goal:** Vercel builds a preview of `rebuild/bee-real-data`, CI is green, and the preview passes `smoke.mjs`.
**Why:** Proves `vercel.json` (region, rewrites, includeFiles) and the build on Vercel before production.
**Where:** GitHub branch `rebuild/bee-real-data`; Vercel preview
**Do:**
- [ ] `git branch --show-current` → must print `rebuild/bee-real-data`. If it prints `main`, stop.
- [ ] `git push -u origin rebuild/bee-real-data` (this is the only push in Phase 6; never `git push origin main`).
- [ ] Find the deployment for the pushed commit: `SHA=$(git rev-parse HEAD)`; `gh api "repos/shrinivas-sn/ev-charging-stations-api/deployments?sha=$SHA" --jq '.[0] | [.id, .environment] | @tsv'`. Repeat every 30 s for up to 10 min until one appears. Its environment must not be `Production`; if it is, stop and tell the owner immediately.
- [ ] Poll `gh api repos/shrinivas-sn/ev-charging-stations-api/deployments/<id>/statuses --jq '.[0] | [.state, .environment_url] | @tsv'` every 30 s for up to 15 min until `state` is `success` or `failure`/`error`. On failure, follow Failure handling (function errors).
- [ ] CI: `gh run list --branch rebuild/bee-real-data --limit 5` → `ci` run `completed success`. On failure: `gh run view <run-id> --log-failed`, fix test-first, commit, push the branch again.
- [ ] Smoke: `node scripts/smoke.mjs --base <environment_url>`. A 401 or a Vercel login page → ask the owner for the bypass secret (Owner inputs), then `VERCEL_PROTECTION_BYPASS=<secret> node scripts/smoke.mjs --base <environment_url>`.
- [ ] Measure cold start: `curl -s -o /dev/null -w "%{time_total}\n" <environment_url>/health` twice; record both.
**Test first:** n/a — the smoke script from 6.2 is the test.
**Verify:** `node scripts/smoke.mjs --base <environment_url>; echo "exit $?"` → `smoke ok (9 checks)`, `exit 0`. Paste the output into the Progress Log.
**Don't touch:** `main`; Vercel dashboard settings (owner only).
**If it fails:** Vercel rejects `regions` (build log says so) → log the exact error, remove `regions` on the branch, push again, and add an owner input "set the function region to Mumbai (bom1) in Project Settings → Functions"; the smoke region check then fails until the owner does it — record that and continue.
**Commit:** none — push only (fix commits use their own messages).

### Task 6.4 — Guides pass the guide checks before production

**Goal:** Every concrete API URL in the guides answers 200 JSON, and no guide claims a not-provided feature.
**Why:** The production checks `guide-urls-live` and `guide-claims` run on the guides; fixing them after the merge would need another push to `main`.
**Where:** `frontend/src/content/guidesData.js`; rules in `E:\OSC\api-projects\pipeline\checks\README.md` (search text: `## Blog drafting`), **except** its step 6 (`git push origin main`), which this plan forbids — commits stay on the branch.
**Do:**
- [ ] List the URLs: `grep -o "https://ev-charging-stations-api.vercel.app/v1[^ \"'\`<>)]*" frontend/src/content/guidesData.js | sort -u`.
- [ ] Request each against the preview (replace the origin with the preview `environment_url`, plus the bypass header if needed) or, if the preview is unavailable, against a local API on port 3920. Each must answer 200 with `content-type` JSON (a bare URL with no query may answer 400 JSON).
- [ ] Read every guide's text for each `not_provided` item (availability, prices/payment/booking, opening hours). A sentence that claims the API provides one is rewritten to say it does not.
- [ ] Every code sample in a guide that calls the API: run it against the preview or local API; a sample that does not return what the guide says is fixed or removed, following the Blog drafting allowed sources only.
- [ ] Build (`npm --prefix frontend run build`) and confirm the 3 guides are in `frontend/dist/sitemap.xml` (`grep -c "/guides/" frontend/dist/sitemap.xml` → 3 or more).
**Test first:** the URL check above run before changes is the test; a URL that fails is the failing case.
**Verify:** `curl -s -o /dev/null -w "%{http_code} %{content_type}
" "$URL"` run once per guide URL (with the origin swapped to the preview or `http://localhost:3920`) → `200 application/json…` for each (record them in the Progress Log); No-AI-slop Detect (Rules) on every guide section you changed → no patterns remain; split verify (Rules) → all pass.
**Don't touch:** guides that already pass both checks.
**If it fails:** a guide that cannot be made accurate is not published — remove it only if at least 3 guides remain; otherwise log it and ask the owner.
**Commit:** `docs(guides): <what changed>` per guide, or `none — guides already pass`

### Checkpoint — Phase 6

- [ ] Full verification: split verify → all pass; preview smoke → `exit 0`; CI on the branch → success; the Progress Log has a No-AI-slop Detect result for every prose file changed in Phases 5–6.
- [ ] Commit made for every task in this phase; the branch is pushed (`git status -sb` shows no `ahead`).
- [ ] Status file updated: "Phase:" → `Phase 6 done — preview passes; waiting for the owner's go-ahead to merge to main`; "Next up" item 1 → `Owner: say "merge to main" to start Phase 7`.
- [ ] Progress Log entry added.
- [ ] **STOP.** Tell the owner the preview URL, the smoke output, and that Phase 7 merges to production. Do not start Phase 7 without an explicit go-ahead message.

A new session may start here.

---

## Phase 7 — Production and records (owner-gated)

**Purpose:** Production serves the BEE data and passes the production checks; hub records tell the truth; this plan closes.
**Starts when:** Phase 6 checkpoint done **and** the owner has written an explicit go-ahead to merge to `main` in the current chat. Record the owner's exact words and date in **Owner inputs** before Task 7.1.
**Re-check first:** `git fetch origin && git log --oneline origin/main..origin/rebuild/bee-real-data` lists the branch commits and `git log --oneline origin/rebuild/bee-real-data..origin/main` is empty (main has not moved). If `main` moved, stop and ask the owner — a rebase or merge of new `main` commits is their call.

### Task 7.1 — Pull request and merge

**Goal:** `main` contains the branch via a merge commit, and Vercel's production deployment of it succeeds.
**Why:** Owner-authorised release.
**Where:** GitHub PR from `rebuild/bee-real-data` to `main`
**Do:**
- [ ] `gh pr create --base main --head rebuild/bee-real-data --title "Rebuild on real BEE station data" --body-file <file>`; the body file (in your scratch/temp folder, not the repo) contains: a 3-line summary; data counts from `meta.json`; the attribution string; test evidence (split-verify results, preview smoke output); the line "Every push to main deploys to production."; and ends with the PR attribution lines from the session's system reminder. Run No-AI-slop Detect (Rules) on the body file before creating the PR; fix until no patterns remain.
- [ ] Wait for the PR's checks: `gh pr checks <pr-number> --watch` → all pass.
- [ ] `gh pr merge <pr-number> --merge` (merge commit; do not squash; do not delete the branch).
- [ ] Find the production deployment: `MERGE=$(gh pr view <pr-number> --json mergeCommit --jq .mergeCommit.oid)`; poll `gh api "repos/shrinivas-sn/ev-charging-stations-api/deployments?sha=$MERGE" --jq '.[0].id'` then its statuses until `success` (up to 15 min).
**Test first:** n/a — the gates in 7.2 are the tests.
**Verify:** deployment status `success`; `curl -s -o /dev/null -w "%{http_code}\n" https://ev-charging-stations-api.vercel.app/health` → `200`.
**Don't touch:** the public-apis fork; branch protection settings.
**If it fails:** deployment `failure` → open its `log_url`, tell the owner, and propose a revert (Failure handling). Do not push fixes to `main` without the owner.
**Commit:** the merge commit created by `gh pr merge`.

### Task 7.2 — Production gates

**Goal:** Production passes the smoke script, the production checklist has no FAIL, and the builder route is recorded.
**Why:** The four gates in this plan's **Done means**.
**Where:** `E:\OSC\api-projects` (pipeline scripts write `api-projects/checklists/ev-charging-stations/`)
**Do:**
- [ ] `node scripts/smoke.mjs --base https://ev-charging-stations-api.vercel.app` → exit 0.
- [ ] `node E:/OSC/api-projects/pipeline/deploy/record-live.js --project E:/OSC/api-projects/projects/ev-charging-stations-api --portal https://ev-charging-stations-api.vercel.app --api https://ev-charging-stations-api.vercel.app`
- [ ] `node E:/OSC/api-projects/pipeline/checks/run-checks.js --stage production --project E:/OSC/api-projects/projects/ev-charging-stations-api; echo "exit $?"` → exit 0 (pass) or 5 (review only). Exit 3 = a FAIL: read `E:/OSC/api-projects/checklists/ev-charging-stations/production.md`, fix on a new branch from `main` test-first, open a PR, and **ask the owner** before merging; then re-run.
- [ ] `node E:/OSC/api-projects/pipeline/builder.js --project E:/OSC/api-projects/projects/ev-charging-stations-api --api-url https://ev-charging-stations-api.vercel.app` → record the route/verdict it prints in the Progress Log.
- [ ] In `E:\OSC`: `git -C E:/OSC status --short` → only files under `api-projects/checklists/ev-charging-stations/` (and decision/result files the builder writes); commit them in the hub repo.
**Test first:** n/a — the gates are the tests.
**Verify:** smoke `exit 0`; run-checks exit 0 or 5 with no FAIL row; outputs pasted in the Progress Log.
**Don't touch:** `E:\OSC\api-projects\pipeline\**` (shared pipeline).
**If it fails:** see Failure handling (production check FAIL).
**Commit:** in `E:\OSC`: `chore(api-projects): record EV charging production checks`

### Task 7.3 — Correct the hub records

**Goal:** `IDEA-LOG.md`, the research note and the OSC `DOCS` reflect the real source and state.
**Why:** The IDEA-LOG row claims "GODL dataset; 27,248 stations; Leaflet …; 14/14 tests" — all false.
**Where:** `E:\OSC\api-projects\IDEA-LOG.md` (search text: `India EV Charging Station Directory API`); `E:\OSC\api-projects\research\ev-charging-stations.md` (search text: `## Data source`); `E:\OSC\DOCS\STATUS.md`; `E:\OSC\DOCS\README.md` index table; `E:\OSC\DOCS\WORK\<today>\WORK.md`
**Do:**
- [ ] IDEA-LOG row: status `live`; replace the parenthesised notes with `BEE PDF till 26 Oct 2025, attribution, no published licence; <stations> stations / <chargers> chargers; MapLibre + OpenFreeMap map; <n> backend + <m> frontend tests pass` using real counts from the final runs. Keep the date, research link and project path columns.
- [ ] Research note: append a section `## Correction <DD/MM/YYYY>` saying data.gov.in has only aggregate tables, the real source is the BEE PDF, and criterion 1 is re-scored "pass with attribution, no explicit licence (owner decision 15/10/2026)". Do not delete the original text.
- [ ] `DOCS/WORK/<today>/WORK.md`: add (or create with a `# <DD/MM/YYYY>` heading) a section summarising the release with links to the PR and production report.
- [ ] `DOCS/README.md`: add one index row in the existing column format, `Touches` = `api-projects/`, `DOCS/`.
- [ ] `DOCS/STATUS.md`: add a dated line for the EV API going live on BEE data.
**Test first:** n/a — documentation.
**Verify:** `grep -n "GODL dataset; 27,248" E:/OSC/api-projects/IDEA-LOG.md` → no output; No-AI-slop Detect (Rules) on every line you added in the hub → no patterns remain.
**Don't touch:** other projects' rows and notes.
**If it fails:** n/a.
**Commit:** in `E:\OSC`: `docs: correct EV charging API records after the BEE release`. Do not push the hub repo unless the owner asks.

### Task 7.4 — Close this plan

**Goal:** Durable content is archived and `PLAN.md` is deleted.
**Why:** Guide §12 — a live plan is scaffolding, not history.
**Where:** `PLAN.md`; `DOCS/WORK/<today>/`
**Do:**
- [ ] Copy this file's **Facts**, **Plan issues**, **Decisions**, **Owner inputs** and **Progress Log** verbatim into `DOCS/WORK/<today>/RELEASE.md`.
- [ ] `git rm PLAN.md`.
- [ ] `STATUS.md`: "Phase:" → `Live on BEE data`; "Next up" → the options: public-apis submission (owner), corridor search, bulk download, 16px body text (owner's design call).
- [ ] This commit lands on `main` only through a PR the owner approves (same rule as 7.1). If the owner does not want another PR now, commit on a branch `docs/close-bee-plan`, push that branch, and tell the owner.
**Test first:** n/a — documentation only.
**Verify:** `ls PLAN.md` → not found; `grep -c "### " DOCS/WORK/<today>/RELEASE.md` → the Progress Log headings are present.
**Don't touch:** anything else.
**If it fails:** n/a.
**Commit:** `docs: close the BEE release plan`

### Checkpoint — Phase 7

- [ ] Full verification: production smoke `exit 0`; production checklist no FAIL; `git status --short` clean in both repos.
- [ ] Commit made for every task in this phase.
- [ ] Status file updated: `Live on BEE data (<stations> stations, till 26 Oct 2025); production checks pass.`
- [ ] Progress Log entry added (in `RELEASE.md`).

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
| 1 | 15/10 | carried | Archived plan issue 4: old servers on :3000 (PID 1316) and :5173 (PID 14540) hold `frontend/node_modules` | Still running at planning time (`netstat`) | local verify only | Split verify in Rules; never stop them | owner: stop them only if they are not yours |
| 2 | 15/10 | 5.4 | Nothing said about the old rate-limit figure in `DOCS/DECISIONS.md` | The audit entry there says limits were "raised to 300/15 min"; `backend/src/app.js` has used 100/15 min (line 16: `RATE_LIMIT_MAX \|\| 100`) | record only, no code change | Old entry left alone (DECISIONS is append-only); the new 15/10 section states 100/15 min | owner: none needed |
| 3 | 15/10 | 6.3 | Preview smoke runs against the deployment URL | Every path answers `302` with `Protected by Vercel Authentication` (curl on `/health`, `/v1/stations?limit=1`, `/docs`) | blocks one verification, not the build or CI | CI recorded green; preview smoke and the cold-start measurement left for the owner-supplied bypass secret (Failure handling) | owner: a "Protection Bypass for Automation" secret, or turn preview protection off for this project |
| 4 | 15/10 | 6.1 | Review would cover the branch's own code | The prerender step prints `useLayoutEffect does nothing on the server` per page; the only `useLayoutEffect` in the tree is inside `react-router` / `react-router-dom` (3 and 7 occurrences) | none on the shipped HTML (SEO gate and mobile-check pass) | Logged, not fixed: a fix means changing a dependency, which is outside this plan | owner: none needed |

---

## Owner inputs

- Given 15/10/2026: republish BEE data with attribution (no licence published).
- Given 15/10/2026: **no merge or push to `main` without an explicit go-ahead.** Phase 7 waits for it. Record the go-ahead here (words + date) when given.
- Given 15/10/2026: do not stop the servers on ports 3000/5173.
- Only if needed: a Vercel "Protection Bypass for Automation" secret for the preview (Task 6.3), given in chat and used only as an environment variable.
- Only if needed: setting the function region to Mumbai in Vercel Project Settings if `regions` is rejected (Task 6.3).
- Owner's call, not in this plan: body text 16px / 44px tap targets (`MOBILE.md`); public-apis submission; any email to BEE.

---

## Decisions

- This plan replaces `PLAN.md` written 15/10/2026 (archived verbatim as `DOCS/WORK/2026-10-15/PLAN-bee-rebuild-phases-1-4.md`). Its Phases 1–4 are done; its open items are carried: 5.1 → 5.1, 5.2 → split into 5.2 (script) and 5.3 (workflows), 5.3 → 5.4, 6.1 → 6.1, 6.2 → 6.2 + 6.3, 6.4 → 6.4 (moved before the merge), 6.3 → 7.1 + 7.2, 7.1 → 7.3, 7.2 → 7.4. Nothing dropped.
- Guides are checked before the merge (6.4), not after, because post-merge guide fixes would need another push to `main`. *(assumed)*
- `api.json source.url` is `null`; the http PDF URL lives in `stack.dataset.source_pdf_url` — the schema allows only https and BEE has no working https. *(assumed)*
- `includeFiles` narrowed to `backend/data/**` (from `backend/**`): only data is read by computed paths; code is traced by Vercel from `require`. *(assumed)*
- `check-upstream.js` always downloads the PDF (≈7.9 MB weekly) and compares sha256, instead of trusting `Content-Length` — simpler and exact. *(assumed)*
- A failed weekly BEE fetch opens an issue and exits green, because BEE may block runner IPs. *(assumed)*
- CI workflow file is named `ci.yml` (matching msp-benchmarks), not `test.yml`. *(assumed)*
- Smoke region check uses `/health` because it is `no-store`, so `x-vercel-id` always includes the function region. *(assumed)*
- Merge with a merge commit (not squash) so the per-task history stays readable and a single `git revert -m 1` undoes the release. *(assumed)*
- Slop control points to the `no-ai-slop-writing` skill, `slop-signatures.md` and `banned-patterns.md` instead of a list written into this plan, so the standard stays the owner's single source and updates without editing this plan (owner request 15/10/2026).
- Carried from the archived plan: station id `evs_` + 10 hex; per-gun filters; 404 for unknown enums; rate limit 100 / 15 min; Python only in `ingest/`; region `bom1`; keep the current design.

---

## Progress Log

*(Append only. Newest at the bottom. Never rewrite an entry — if it turned out wrong,
add a new one saying so. This log is what makes resuming cheap: a cold session reads
the last entry and knows exactly where to start.)*

### Planning — 15/10/2026
Done:       Archived the previous plan (Phases 1–4 done) and wrote this plan for Phases 5–7.
Verified:   `npm test` → `# pass 119 # fail 0`; frontend tests 18 + build tests 2 pass; `verify:seo` 0 errors; `manifest.js validate .` → `valid: api.json`; BEE page 200 with the anchor; PDF 200 `application/pdf` 7942286 bytes.
Surprises:  Docs page string `/v1/stations/near:` would fail `docs-route-parity` (fixed in Task 5.4). Manifest `source.url` must be https but BEE is http-only (Decision). The checks README's guide process pushes to `main` (overridden by Rules).
Next:       Task 5.1 — write `backend/test/vercel-config.test.js`, see 3 tests fail, then edit `vercel.json`.
Commit:     `docs: fresh plan for the remaining BEE release work`

### Phase 5 — 15/10/2026
Done:       Tasks 5.1–5.4. `vercel.json` runs the function in `bom1` and ships only `backend/data/**`; `backend/scripts/check-upstream.js` reports a new BEE file; `.github/workflows/ci.yml` and `upstream-check.yml`; `api.json`, `README.md`, `DOCS/DECISIONS.md` and the docs page describe the real system.
Verified:   `npm test` → `# pass 133 # fail 0` (exit 0); `npm --prefix frontend test` → 18 pass, 0 fail; `npm --prefix frontend run build` → `[prerender] Rendered 8 pages and 404.html.`; `npm --prefix frontend run test:build` → 2 pass, 0 fail; `npm run verify:seo` → 0 errors, 0 warnings; `manifest.js validate .` → `valid: api.json` (exit 0); parity one-liner → `parity ok` (before 5.4 it printed `doc not in manifest: /v1/stations/evs_ef45e67bd1`, `/v1/cities`, `/v1/stations/near:`); YAML parse → `yaml ok`; live `check-upstream.js` → `"status": "same"`, sha256 `f519218f…b6882`, exit 0; the three README curl paths on a local API → `200` each; `plan-deploy.js --out <temp>` → `- [x] portal-routing-config`.
Surprises:  Port 3920 was held by PID 18168 (not this session's), so the local API ran on 3921 per Rules. The docs page `near:` string failed parity exactly as planned and now passes. Plan issue 2: the old DECISIONS line for the rate limit is stale.
Slop:       No-AI-slop Detect by hand (the skill is not loadable in this session): `README.md`, the new DECISIONS section, the two `DocsPage.jsx` strings and both workflow files → no patterns found. Banned words and empty phrases: none. Em dashes: only the `—` table placeholders and the mandated attribution string.
Next:       Task 6.1 — review the branch, then 6.2–6.4. Phase 6 ends with a STOP for the owner.
Commit:     `docs: Phase 5 checkpoint`

### Phase 6 — 15/10/2026
Done:       Task 6.1 review (below), Task 6.2 `scripts/smoke.mjs`, Task 6.3 branch pushed and preview built, Task 6.4 guide checks. No Task 6.1 finding needed a fix; 6.4 changed nothing.
Reviews:    `/myreview` over `git diff main...HEAD` minus `backend/data/**` and `frontend/dist/**`, plus a read of the whole HTTP layer (`backend/src/app.js`, both routers, `backend/src/services/stations-service.js`), the build rules (`normalise.js`, `reference.js`), `api/index.js`, the frontend client (`lib/api.js`), both workflows and the ingest shell script.

| id | severity | file | finding | verdict |
|---|---|---|---|---|
| 1 | low | `frontend/src/lib/api.js` (`buildNearQuery`) | `minPowerKw` is dropped when it is 0, because 0 is falsy | reject: 0 kW is the same as no power filter, and the documented range starts at 0 |
| 2 | low | `backend/src/app.js` (`trust proxy`) | With `npm start` (no proxy), a caller can spoof `X-Forwarded-For` and get a fresh rate-limit bucket | reject: Vercel overwrites the header in production, and the comment plus README state the limitation |
| 3 | low | `backend/src/lib/normalise.js` (`toStation`) | Ownership comes from the curated operators table, not the row's Govt./Private cell | reject: one canonical ownership per operator is the documented design |
| 4 | low | `backend/src/lib/reference.js` (`stateByKey`) | Raw PDF state spellings resolve in the build but not as `state=` query values | reject: the API documents name, 2-letter code and ISO code |
| 5 | info | `ingest/fetch_bee_pdf.sh` | The refresh prints the new sha256 instead of comparing it with `backend/data/source.json` | reject: `check-upstream.js` does the comparison, and the build records the new sha |
| 6 | info | prerender step | `useLayoutEffect does nothing on the server`, once per page (Plan issue 4) | logged for the owner: the call is inside react-router, so a fix means changing a dependency |
| 7 | info | `vercel.json` | `regions` and `includeFiles` cannot be proven locally | planned: the deployment built and succeeded; the region check needs the preview bypass (Plan issue 3) |

No high or critical finding, so Task 6.1 commits nothing.
Verified:   `scripts/smoke.mjs --base http://localhost:3921 --local` → `smoke ok (7 checks)`, exit 0; the same script against a dead port → `FAIL /health answers 200 with JSON`, exit 1; split verify → 133 backend, 18 frontend, 2 build tests, `Rendered 8 pages`, SEO `0 errors, 0 warnings`; CI run `38763956143` on the pushed branch → `ci` `completed success` (job `node` 28 s: `# pass 133 # fail 0`, `# pass 18 # fail 0`, `Rendered 8 pages and 404.html.`, `# pass 2 # fail 0`, `0 errors, 0 warnings`; job `ingest` 8 s); preview deployment `7097443039` → `success`; branch pushed, `git status -sb` not ahead.
Guides:     The one concrete URL in `guidesData.js` is `/v1/connectors`; against the local API it answers `200 application/json` with the 7 standards the guide names. Guide 1's four Bengaluru–Mysuru waypoints each return car fast-DC stations (top result `max_kw_by_standard.CCS2` 60 in all four). Guide 3's `city=Kochi&vehicle=car` pages once (`total 13`, `attribution` a string). Guide 4's Delhi query answers 200. The only live-availability sentence says the data has no live availability. `frontend/dist/sitemap.xml` holds 3 `/guides/` entries. Nothing needed changing.
Surprises:  Preview deployments are behind Vercel Authentication, so Task 6.3's smoke and cold-start numbers cannot run yet (Plan issue 3). The region check (`::bom1::`) is therefore also unproven. CI was green on the first push.
Slop:       Script comments and check names read clean (no banned words, no empty phrases, no em dashes).
Next:       Owner: a Vercel protection-bypass secret (or protection off) so the preview smoke and the region check can run, then "merge to main" to start Phase 7.
Commit:     `test: live smoke script` (6.2); none for 6.1 and 6.4; push only for 6.3
