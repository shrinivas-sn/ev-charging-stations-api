# Project Status: India EV Charging Station Directory API

Last Updated: 2026-10-15
Phase: Hardened, not deployed

## Current State

- **Dataset:** Generated sample data, 28,698 stations across all 36 states and UTs, 104 cities,
  9 operators. Deterministic generator (`backend/scripts/generate-data.js`, seed 20261015).
  **Not official data** — labelled as such in the API, the UI and the README.
- **Backend:** Express. Strict parameter validation (400 with codes, never silent), input
  normalisation (connector spellings, city aliases, trimming), server-side filters on both list and
  radius endpoints, and per-client rate limiting via `trust proxy`.
- **Tests:** 36/36 passing (`npm test`), including provenance disclosure and per-client rate-limit
  keying.
- **Frontend:** React 18 + Vite, light minimalist design system, statically prerendered (8 pages,
  `404.html`, sitemap + robots when `SITE_URL` is set).
- **Playground:** debounced input, abortable requests, server-side connector and capacity filters,
  inline errors with a rate-limit countdown, geolocation errors shown inline (no `alert()`).
- **Map:** MapLibre GL + OpenFreeMap vector tiles — keyless, no request limits. Replaces the previous
  CARTO URL (now key-gated) and the CSS tile-inversion hack.
- **Quality gates:** SEO gate reports 0 errors / 0 warnings; `api.json` passes the pipeline manifest
  validator.
- **Measured latency:** ~6–7 ms warm for a full 25-result radius query and ~4 ms for a filtered
  directory page. The first request after a cold start pays 330–410 ms to load and index the 19.7 MB
  `stations.json`; every request after that is warm. Measured on a local Node 22 process, not against
  a deployed instance — serverless cold start will differ.

## Next up (start here)

1. **Ingest the official dataset.** Everything else is polish by comparison; the API currently
   serves invented stations. See "Replacing the dataset" in `README.md`.
2. **Deploy.** `SITE_URL=https://your-origin npm run build && npx vercel --prod`, then
   `curl -s https://your-origin/health`. Confirm `/v1` answers and that CORS works from a browser.
3. Submit to `public-apis/public-apis` in Transportation — only once the dataset is real.

## Known limitations

- Generated sample data only; no official provenance yet.
- Dataset fields `access_type` and `status` are constant in the sample, so the UI does not present
  them as meaningful variation.
- `npm audit` reports advisories in the toolchain (esbuild/vite dev dependencies), not in shipped code.
