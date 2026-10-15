# Mobile check — 2026-10-15

## Run profile
- Stack: React 18 + Vite 5 + Tailwind 3.4 (default screens: sm 640, md 768, lg 1024, xl 1280).
- URL: `vite preview` on http://localhost:4180, API proxied to `PORT=3920 npm start`.
- Routes: `/`, `/docs`, `/playground`, `/status`. Viewports: xs 320, sm 360/390, md, land.
- Browser: puppeteer-core with installed Chrome, **one viewport per browser launch** (see Notes).

## Score (final full run, 16 route × viewport runs)
| Family | Result |
|---|---|
| overflow-x | pass 16 |
| viewport-meta | pass 4, n/a 12 (runs at one viewport) |
| text-legibility | warn 8 (0 nodes < 14px; body text is 14px, 16px preferred) |
| form-input-zoom | pass 2, n/a 14 |
| layout-collision | pass 16 |
| fixed-bar-budget | pass 16 |
| dvh-safe-area | pass 8, n/a 8 |
| tap-targets | warn 12 (0 below the 24px floor; below the 44px target) |
| media-cls | n/a 16 (no `<img>`/`<video>`) |
| touch-affordance | **fail 4 — vendor rule, accepted** (below) |
| nav-drawer | pass 8 (6/6 steps) |
| reduced-motion | pass 3, unstable 1 (probe harness, below) |

## Fix ledger
| Family | Offender | Before | After |
|---|---|---|---|
| text-legibility | MapLibre attribution `.maplibregl-ctrl-attrib` (`index.css` set 11px) | playground xs/sm: 1 failing node (11px) | 0 failing; 14px under 640px |
| nav-drawer | `Navbar.jsx` drawer | focus in panel ✗, scroll lock ✗, Tab cycles ✗, Escape ✗ | all 6 steps pass on 8/8 runs |

Earlier fixes (overflow, map focus jump, form zoom, dvh, hover): commit 83011a9.

## Open / accepted
- **touch-affordance:** the only offender is `.maplibregl-map:hover .maplibregl-popup-track-pointer` in `maplibre-gl.css`. It applies only to popups made with `trackPointer()`, which this site does not use. Not suppressed; left as an accepted vendor rule.
- **text-legibility / tap-targets warns:** 14px body text and sub-44px targets. Raising them is a design change, not a responsive fix. Owner's call.
- **reduced-motion unstable (status-sm):** this family re-navigates in the same browser. The API's `stale-while-revalidate` lets Chrome serve a cached `/v1/meta` and revalidate in the background, and DevTools never marks that request finished, so `networkidle0` times out. Reproduced: a second page load in one browser hangs on `/v1/meta`; with the cache disabled all loads go idle in < 1 s. The other 3 reduced-motion runs pass.

## Notes
- Harness: run `probe.js` once per viewport (fresh browser = empty cache) for the reason above. In Git Bash set `MSYS_NO_PATHCONV=1` and use `E:/...` paths.
