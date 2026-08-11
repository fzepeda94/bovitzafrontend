/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pine: { 50: '#edf5f1', 100: '#d7e8df', 500: '#26735c', 600: '#1d5b49', 700: '#173f35', 900: '#102d27' },
        clay: { 50: '#fbf5ed', 400: '#d98b52', 500: '#c6753d' }
      },
      boxShadow: { card: '0 12px 35px rgba(23, 63, 53, .08)' },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'], display: ['Manrope', 'Inter', 'sans-serif'] }
    }
  },
  plugins: []
}
