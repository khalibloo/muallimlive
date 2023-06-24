/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
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
    },
  },
  plugins: [],
};
