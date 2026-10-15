/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#fafafa",
        surface: "#ffffff",
        subtle: "#f4f4f5",
        line: {
          DEFAULT: "#e4e4e7",
          strong: "#d4d4d8",
        },
        ink: {
          DEFAULT: "#18181b",
          muted: "#52525b",
          dim: "#71717a",
        },
        accent: {
          DEFAULT: "#0f766e",
          strong: "#115e59",
          soft: "#f0fdfa",
          border: "#99f6e4",
        },
        ok: "#15803d",
        warn: "#b45309",
        danger: "#b91c1c",
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
