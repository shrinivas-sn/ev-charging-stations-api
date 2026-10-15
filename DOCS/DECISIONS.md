# Architecture & Design Decisions — ev-charging-stations-api

Log of decisions made for this project, recorded before implementation.

## 2026-10-15: Initial Architecture & Scaffolding
- **Domain:** Indian Electric Vehicle (EV) Public Charging Station Directory & Connector Lookup.
- **Data Source:** Official public data from `data.gov.in` under Government Open Data License - India (GODL-India).
- **Core Product Boundary:** Static/periodic directory and connector specs (locations, power kW, plug types, operator). Does NOT promise real-time plug occupancy telemetry or booking.
- **Storage Decision:** Embedded SQLite with spatial indexing on `(lat, lng)`. Zero external DB dependencies, instant geo-distance queries, bundled as zero-maintenance read-only database.
- **Framework & Conventions:** Node.js + Express with standard response envelopes (`/v1`), CORS enabled, open keyless access, 100 req/15min default rate limit.
- **Spec Finalized:** Complete design spec committed at `DOCS/specs/2026-10-15-ev-charging-stations-design.md`.
- **Implementation Plan Finalized:** Plan committed at `DOCS/plans/2026-10-15-ev-charging-stations-plan.md`.
- **Build Skill Selected:** `subagent-driven-development` with TDD governing backend route implementation. Ready to proceed to Phase 1 (in-development).
