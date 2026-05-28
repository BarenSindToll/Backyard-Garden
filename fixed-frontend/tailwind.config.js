import typography from '@tailwindcss/typography';

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#fbf7ea",
        cream: "#ece2c8",
        sage: "#d8e3c0",
        forest: "#3d6b34",
        "forest-2": "#5e9050",
        "forest-deep": "#1f3a18",
        ink: "#1d2a20",
        "ink-soft": "#485547",
        muted: "#7c857a",
        line: "#d3cdb8",
        "line-soft": "#e8e2cc",
        earth: "#b87348",
        "earth-soft": "#d4a484",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Newsreader", "Georgia", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      }
    }
  },
  plugins: [require('@tailwindcss/typography')],
}
