/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#050508",
        surface: "#0d0d1a",
        border: "rgba(255,255,255,0.06)",
        accent: {
          blue: "#00d4ff",
          green: "#00ff88",
          amber: "#f59e0b",
          red: "#ff4444",
          purple: "#7c3aed",
        },
      },
      fontFamily: {
        mono: ["'Space Mono'", "monospace"],
        display: ["'Syne'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
