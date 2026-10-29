/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        royal: { DEFAULT: '#123B7A', 50: '#EEF3FB', 100: '#D9E4F5', 200: '#B3C8EA', 600: '#123B7A', 700: '#0F3166', 800: '#0D2A57' },
        navy: '#0B1F3A',
        gold: { DEFAULT: '#D4AF37', 100: '#F8F0D5', 300: '#E6CC7A', 600: '#B8932A', 700: '#8A6D1C' },
        mist: '#F4F6FA',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Inter', 'system-ui', '-apple-system', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        display: ['"Bahnschrift"', '"DIN Alternate"', '"Segoe UI Semibold"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,31,58,.06), 0 8px 24px -12px rgba(11,31,58,.18)',
        lift: '0 2px 4px rgba(11,31,58,.08), 0 18px 40px -16px rgba(11,31,58,.28)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { 'fade-up': 'fade-up .35s ease-out both', shimmer: 'shimmer 1.4s infinite' },
    },
  },
  plugins: [],
};
