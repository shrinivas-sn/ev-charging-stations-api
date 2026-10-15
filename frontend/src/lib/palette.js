/**
 * The only place colours are defined. Tailwind (tailwind.config.js), the global CSS
 * (src/index.css via theme()) and the MapLibre layers (StationMap.jsx) all read from here.
 *
 * Values are copied from @radix-ui/colors@3.0.0 (MIT): slate for graphite neutrals,
 * amber as the single accent — the signal colour of charging hardware — plus green,
 * orange and red for status. Contrast was measured on 15/10/2026 (see PICKS.md):
 * amber is never used as text, only as a fill under graphite text (10.4:1).
 */

const slate = {
  1: '#fcfcfd',
  2: '#f9f9fb',
  3: '#f0f0f3',
  4: '#e8e8ec',
  6: '#d9d9e0',
  9: '#8b8d98',
  11: '#60646c',
  12: '#1c2024',
};

const amber = {
  3: '#fff7c2',
  7: '#e9c162',
  9: '#ffc53d',
  10: '#ffba18',
  12: '#4f3422',
};

export const palette = {
  canvas: slate[2],
  surface: '#ffffff',
  subtle: slate[3],
  hover: slate[4],
  line: slate[6], // decorative separators and card edges
  control: slate[9], // borders of inputs and other controls: 3.30:1 on white
  ink: slate[12], // 15.6:1 on canvas
  muted: slate[11], // 5.65:1 on canvas; the only secondary text colour
  accent: amber[9], // fills only: primary buttons, chips, fast-charger markers
  accentHover: amber[10],
  accentSoft: amber[3], // selected rows, info notes
  accentLine: amber[7],
  accentInk: amber[12], // text on accentSoft: 10.5:1
  ok: '#218358', // green 11
  okSoft: '#e6f6eb', // green 3
  warn: '#cc4e00', // orange 11 — icons and borders; text on its soft background stays ink
  warnSoft: '#ffefd6', // orange 3
  danger: '#ce2c31', // red 11: 4.54:1 on its soft background
  dangerSoft: '#feebec', // red 3
};

/** Map layers: the basemap is OpenFreeMap positron (background rgb(242,243,240)). */
export const mapColors = {
  fastFill: palette.accent, // car DC fast (CCS2/CHAdeMO >= 50 kW)
  fastStroke: palette.ink, // 14.7:1 on the basemap, 9.7:1 on water
  otherFill: palette.muted, // 5.3:1 on the basemap
  otherStroke: '#ffffff',
  selected: palette.ink,
  radiusFill: palette.ink,
  radiusLine: palette.muted,
};
