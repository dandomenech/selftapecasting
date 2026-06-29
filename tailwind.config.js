/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        stc: {
          dark: '#1a1a2e',
          accent: '#8b0000',
          gold: '#cc9966',
          bg: '#f5f5f0',
          border: '#d0d0c8',
          muted: '#666666',
          success: '#2e7d32',
          warning: '#c67100',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};
