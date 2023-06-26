/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/pages/**/*.{ts,tsx,mdx}", "./src/components/**/*.{ts,tsx,mdx}", "./src/app/**/*.{ts,tsx,mdx}"],
  darkMode: true,
  important: true,
  theme: {
    extend: {
      colors: {
        primary: "#43A047",
        ["primary-tint"]: "#65ad66",
        ["111"]: "#111",
        ["222"]: "#222",
        ["333"]: "#333",
        ["444"]: "#444",
      },
      screens: {
        sm: "576px",
        md: "768px",
        lg: "992px",
        xl: "1200px",
        xxl: "1600px",
      },
    },
  },
  plugins: [],
};
