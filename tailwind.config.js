/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: { 900: '#0f0f23', 800: '#1a1a2e', 700: '#16213e', 600: '#2a2a3e' },
        home: { DEFAULT: '#4ecca3', dark: '#1a3a2e' },
        away: { DEFAULT: '#e94560', dark: '#2e1a1a' },
        accent: '#e94560',
      },
      fontFamily: { score: ['system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
