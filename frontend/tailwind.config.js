/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors:{
        gray: {
          300: "rgb(var(--bsc-gray-300) / <alpha-value>)",
          400: "rgb(var(--bsc-gray-400) / <alpha-value>)",
          500: "rgb(var(--bsc-gray-500) / <alpha-value>)",
          600: "rgb(var(--bsc-gray-600) / <alpha-value>)",
          700: "rgb(var(--bsc-gray-700) / <alpha-value>)",
          800: "rgb(var(--bsc-gray-800) / <alpha-value>)",
          900: "rgb(var(--bsc-gray-900) / <alpha-value>)",
          950: "rgb(var(--bsc-gray-950) / <alpha-value>)",
        },
        primary:"#f42c37",
        secondary:"#f42c37",
        brandYellow:"#fdc62e",
        brandGreen:"#2dcc6f",
        brandBlue:"#1376f4",
        brandWhite:"#eeeeee",
      },
      container:{
        center: true,
        padding:{
          DEFAULT: "1rem",
          sm: "3rem",
        },
      },
    },
  },
  plugins: [],
}