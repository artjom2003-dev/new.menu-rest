/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#E8491D',
        'primary-hover': '#D43D15',
        accent: '#FF5C28',
        lime: '#BAFF39',
        teal: '#39FFD1',
        'dark-bg': '#0A0A14',
        surface: '#12121E',
        'surface-2': '#1A1A2E',
        'surface-3': '#222236',
        card: '#16162A',
        border: '#2A2A44',
        'text-primary': '#EAEAEA',
        'text-secondary': '#A0A0B8',
        'text-muted': '#6C6C88',
      },
    },
  },
  plugins: [],
};
