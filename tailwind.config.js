/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3f9f8",
          100: "#d8efea",
          500: "#1f8a70",
          600: "#18725d",
          700: "#125746"
        }
      }
    }
  },
  plugins: []
};

