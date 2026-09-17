/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "#0E1419",
        surface: "#161E25",
        hairline: "#243039",
        text: "#E8EDF0",
        subtext: "#8FA0AC",
        amber: "#D9A441",
        censored: "#3A4854",
      },
      fontFamily: {
        sans: ["'Inter Tight'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
