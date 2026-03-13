import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark theme (из прототипа WOW.html)
        bg: {
          DEFAULT: '#06060A',
          2: '#0D0D14',
          3: '#14141E',
        },
        accent: {
          DEFAULT: '#FF5C28',
          2: '#FF8C5A',
          light: '#D94E1A', // light theme
        },
        lime: {
          DEFAULT: '#BAFF39',
          light: '#4A8C10',
        },
        teal: {
          DEFAULT: '#39FFD1',
          light: '#0E8A6E',
        },
        gold: '#FFD700',
        // Text
        text: {
          1: '#F2F0ED',
          2: '#B8B4AE',
          3: '#706C66',
          4: '#3E3C38',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Sora', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'fade-up': 'fadeUp 0.8s cubic-bezier(.4,0,.2,1) both',
        'shimmer': 'shimmer 4s linear infinite',
        'pulse-dot': 'pulse 2s ease infinite',
        'orb-float': 'orbFloat 12s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0%' },
          '100%': { backgroundPosition: '200%' },
        },
        orbFloat: {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '100%': { transform: 'translate(30px, -40px) scale(1.1)' },
        },
      },
      boxShadow: {
        'glow-accent': '0 0 40px rgba(255,92,40,0.15), 0 8px 32px rgba(255,92,40,0.2)',
        'glow-teal': '0 0 40px rgba(57,255,209,0.1)',
        'glow-lime': '0 0 40px rgba(186,255,57,0.12)',
        'card': '0 32px 80px rgba(0,0,0,0.4)',
      },
      backdropBlur: {
        '40': '40px',
      },
    },
  },
  plugins: [],
};

export default config;
