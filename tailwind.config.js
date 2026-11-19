/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/renderer/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Segoe UI"', '"Yu Gothic UI"', 'Meiryo', 'system-ui', 'sans-serif'],
      },
      colors: {
        panel: 'rgb(var(--panel) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        txt: 'rgb(var(--txt) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
      },
      boxShadow: {
        glow: '0 0 24px -6px rgb(var(--accent) / 0.55)',
      },
    },
  },
  plugins: [],
};
