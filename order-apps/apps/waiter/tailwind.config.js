/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/shared-ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#E8491D',
        'dark-bg': '#1A1A2E',
        surface: '#16213E',
        'surface-light': '#1E2A47',
        card: '#0F3460',
      },
    },
  },
  plugins: [],
};
