module.exports = {
  purge: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/layouts/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: false, // or 'media' or 'class'
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
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
