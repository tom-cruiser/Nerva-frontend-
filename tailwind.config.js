/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './features/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F8FA',
        premium: '#121212',
        pulse: '#2DD4BF',
        highText: '#0A0A0A',
        obsidian: '#FFFFFF',
        divider: '#D1D5DB',
      },
    },
  },
  plugins: [],
};
