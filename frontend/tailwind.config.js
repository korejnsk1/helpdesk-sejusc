export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
      },
      boxShadow: {
        card: "0 1px 4px 0 rgb(0 0 0 / .09), 0 1px 2px -1px rgb(0 0 0 / .06)",
        "card-md": "0 4px 8px -1px rgb(0 0 0 / .10), 0 2px 4px -2px rgb(0 0 0 / .08)",
      },
    },
  },
  plugins: [],
};
