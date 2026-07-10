/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './lib/**/*.{ts,tsx,js,jsx}',
    './features/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Teal accent used across the operational (dark) surfaces
        pulse: {
          DEFAULT: '#2DD4BF',
          hover: '#26BFA8',
        },
        // Obsidian ink for text on light surfaces
        ink: '#121212',
        // Dark panel / canvas surfaces
        panel: '#111114',
        canvas: '#F7F8FA',
        // Neutral border on light surfaces
        muted: '#E2E8F0',
      },
      borderRadius: {
        xl2: '1rem',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(45, 212, 191, 0.30), 0 8px 30px -8px rgba(45, 212, 191, 0.25)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
