module.exports = {
  purge: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        primary: "#3dbe2b",
        ["primary-tint"]: "#62cc50",
        secondary: "#939093",
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
