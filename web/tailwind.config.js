/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nred: '#ec4141',
        nredDark: '#d93636',
      },
    },
  },
  plugins: [],
};
