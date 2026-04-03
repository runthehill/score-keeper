/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: { 900: '#0f0f23', 800: '#1a1a2e', 700: '#16213e', 600: '#2a2a3e' },
        home: { DEFAULT: '#3b82f6', dark: '#1a2744' },
        away: { DEFAULT: '#f59e0b', dark: '#2e2410' },
        accent: '#3b82f6',
      },
      fontFamily: { score: ['system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
