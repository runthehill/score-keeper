/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: { 900: '#0f0f23', 800: '#1a1a2e', 700: '#16213e', 600: '#2a2a3e' },
        home: { DEFAULT: '#60a5fa', dark: '#1e3a5f' },
        away: { DEFAULT: '#fbbf24', dark: '#2e2a14' },
        accent: '#2563eb',
      },
      fontFamily: { score: ['system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
