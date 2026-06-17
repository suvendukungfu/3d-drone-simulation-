/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pluto: {
          dark: '#0B0F19',
          light: '#E2E8F0',
          accent: '#00F0FF',
        }
      }
    },
  },
  plugins: [],
}
