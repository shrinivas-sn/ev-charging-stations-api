# Plan: Interactive OpenStreetMap / Leaflet Workbench Integration

## Goal
Integrate a 100% free, keyless, open-source Leaflet map (CartoDB Dark Matter) into the EV Charging Station Workbench (`/playground`), enabling interactive radius visualization, station pins, popup details, and two-way synchronization between map and station list without breaking SSR/SSG prerendering or introducing AI slop.

## Verified Facts & Constraints
1. **Prerender / SSR Guard:** `frontend/scripts/prerender.mjs` executes in Node.js where `window` is undefined. Leaflet must only load on the client side (`useEffect` + dynamic import).
2. **Zero API Keys:** Map tiles use CartoDB Dark Matter on OpenStreetMap data (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`).
3. **Data Parity:** Stations list from `/v1/stations/near` provides `latitude`, `longitude`, `name`, `operator`, `connectors`, `total_capacity_kw`, and `distance_km`.
4. **Style Consistency:** Strict dark technical telemetry palette (`#080c14`, `#0e1526`, `#1b263b`, `#2563eb`). No pastel glows, no generic card gradients, no bloated spacing.

## Phases
1. **Phase 1: Map Component Architecture (`frontend/src/components/StationMap.jsx`)**
   - Create SSR-safe Leaflet component with dynamic import.
   - Setup CartoDB Dark Matter tile layer.
   - Render center coordinate marker + search radius boundary circle.
   - Render station markers with capacity/type indicators.
   - Bind click popups with station telemetry and external Google Maps navigation link.
2. **Phase 2: Workbench UI Enhancement (`frontend/src/pages/PlaygroundPage.jsx`)**
   - Split Workbench into responsive two-column layout:
     - Left: Parameter controls + synchronized station cards list.
     - Right: Sticky interactive Leaflet map canvas.
   - Add Connector filter toggles (`All`, `CCS-2 DC Fast`, `Type-2 AC`, `Bharat DC`).
   - Add two-way synchronization: clicking a station card pans/centers the map marker and opens its popup; clicking a map marker highlights the card.
3. **Phase 3: Verification & Quality Gates**
   - Run `npm run build` (ensures Vite build and `prerender.mjs` complete with 0 errors).
   - Run `npm run verify:seo` (confirms 8 static pages pass with 0 errors).
   - Run `npm test` (confirms all 14 backend API integration tests pass).
4. **Phase 4: Commit, Remote Push & Save-Check**
   - Atomic Git commit to project repo.
   - Push to `origin main` on GitHub.
   - Update `STATUS.md` in project directory (under 40 lines).
   - Update `E:\OSC\api-projects\IDEA-LOG.md` and commit/push tracking in OSC repo.
