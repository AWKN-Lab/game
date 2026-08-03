/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./game/**/*.html", "./game/**/*.js"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'surface-dim': '#141218',
        'surface-bright': '#3b383e',
        'on-surface': '#e6e0e9',
        'on-surface-variant': '#cac4d0',
        'primary': '#f5d78e',
        'on-primary': '#4a3800',
        'primary-container': '#6b5b10',
        'on-primary-container': '#f5d78e',
        'secondary': '#d4bc8a',
        'tertiary': '#ef9b8c',
        'on-secondary-fixed-variant': '#5c432e',
      },
      fontFamily: {
        'headline': ['"Noto Serif SC"', 'serif'],
        'label': ['"Manrope"', 'sans-serif'],
        'body': ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
