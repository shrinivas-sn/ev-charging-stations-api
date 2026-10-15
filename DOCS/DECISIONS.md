# Architecture & Design Decisions — ev-charging-stations-api

Log of decisions made for this project, recorded before implementation.

## 2026-10-15: Initial Architecture & Scaffolding
- **Domain:** Indian Electric Vehicle (EV) Public Charging Station Directory & Connector Lookup.
- **Data Source:** Official public data from `data.gov.in` under Government Open Data License - India (GODL-India).
- **Core Product Boundary:** Static/periodic directory and connector specs (locations, power kW, plug types, operator). Does NOT promise real-time plug occupancy telemetry or booking.
- **Storage Decision:** In-memory structured JSON dataset in `backend/data/stations.json` with spatial pre-indexing (same proven pattern as `gst-hsn-sac-api` 5.2MB and `lgd-admin-hierarchy-api`). Eliminates native C++ compilation issues on Vercel Serverless (Linux Lambda) while executing sub-4ms in-memory Haversine distance calculations on ~27,000 records.
- **Framework & Conventions:** Node.js + Express with standard response envelopes (`/v1`), CORS enabled, open keyless access, 100 req/15min default rate limit.
- **Spec Finalized:** Complete design spec committed at `DOCS/specs/2026-10-15-ev-charging-stations-design.md`.
- **Implementation Plan Finalized:** Plan committed at `DOCS/plans/2026-10-15-ev-charging-stations-plan.md`.
- **Build Skill Selected:** `subagent-driven-development` with TDD governing backend route implementation.
- **Backend & Tests Complete:** 14/14 automated integration tests passing (`node --test`). Sub-4ms geo-proximity queries verified.
- **Frontend & SSG Complete:** Vite + React + Tailwind portal built with 8 prerendered static pages, standalone `404.html`, `sitemap.xml`, and `robots.txt`. Zero SEO errors (`npm run verify:seo`).
- **Production Audit Passed:** Manifest validated (`manifest.js validate`), Vercel deployment plan written to `api-projects/checklists/ev-charging-stations/deploy.md`. Status advanced to `prod-audit-passed`. Ready for owner deployment.
