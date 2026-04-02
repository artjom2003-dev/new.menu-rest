/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#E8491D',
        'dark-bg': '#0F1117',
        surface: '#1A1D27',
        'surface-2': '#242836',
        'surface-3': '#2E3344',
        border: '#363B4E',
        'text-primary': '#EAEAEA',
        'text-secondary': '#A0A0B8',
        'text-muted': '#6C6C88',
      },
    },
  },
  plugins: [],
};
