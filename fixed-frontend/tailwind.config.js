import typography from '@tailwindcss/typography';

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#ECEBE3",
        forest: "#1b3b2f"
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: [require('@tailwindcss/typography')],

}
