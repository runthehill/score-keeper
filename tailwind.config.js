/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
          // legacy (kept until each screen migrates in later phases):
          900: '#0f0f23',
          800: '#1a1a2e',
          700: '#16213e',
          600: '#2a2a3e',
        },
        line: { DEFAULT: 'var(--line)', 2: 'var(--line-2)' },
        txt: { DEFAULT: 'var(--txt)', 2: 'var(--txt-2)', 3: 'var(--txt-3)' },
        danger: 'var(--danger)',
        // legacy, unchanged:
        home: { DEFAULT: '#60a5fa', dark: '#1e3a5f' },
        away: { DEFAULT: '#fbbf24', dark: '#2e2a14' },
        accent: '#2563eb',
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        score: ['"Saira Condensed"', 'system-ui', 'sans-serif'],
      },
      boxShadow: { card: 'var(--shadow-card)' },
    },
  },
  plugins: [],
};
