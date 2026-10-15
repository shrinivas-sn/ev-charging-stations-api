import { palette } from "./src/lib/palette.js";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  // hover: utilities only apply on devices that can hover, so touch screens never get stuck hover states.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      // Every colour comes from src/lib/palette.js (Radix slate + amber); no raw hex here.
      colors: {
        canvas: palette.canvas,
        surface: palette.surface,
        subtle: palette.subtle,
        hover: palette.hover,
        line: {
          DEFAULT: palette.line,
          strong: palette.control,
        },
        ink: {
          DEFAULT: palette.ink,
          muted: palette.muted,
          dim: palette.muted,
        },
        accent: {
          DEFAULT: palette.accent,
          hover: palette.accentHover,
          soft: palette.accentSoft,
          border: palette.accentLine,
          ink: palette.accentInk,
        },
        ok: { DEFAULT: palette.ok, soft: palette.okSoft },
        warn: { DEFAULT: palette.warn, soft: palette.warnSoft },
        danger: { DEFAULT: palette.danger, soft: palette.dangerSoft },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      maxWidth: {
        prose: "68ch",
      },
    },
  },
  plugins: [],
};
