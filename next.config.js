const antdLess = require("next-plugin-antd-less");
const pwa = require("next-pwa");
const withPlugins = require("next-compose-plugins");
const lessToJS = require("less-vars-to-js");
const fs = require("fs");

const storageUri = process.env.NEXT_PUBLIC_STORAGE_URI;
const darkTheme = lessToJS(
  fs.readFileSync("./node_modules/antd/lib/style/themes/dark.less", "utf8"),
);
const themeOverride = lessToJS(
  fs.readFileSync("./src/styles/theme.less", "utf8"),
);
module.exports = withPlugins([antdLess, pwa], {
  // use modifyVars or lessVarsFilePath or both
  // lessVarsFilePath: "",
  modifyVars: { ...darkTheme, ...themeOverride },

  i18n: {
    // These are all the locales you want to support in
    // your application
    locales: ["en-US"],
    // This is the default locale you want to be used when visiting
    // a non-locale prefixed path e.g. `/hello`
    defaultLocale: "en-US",
  },

  images: {
    domains: ["www.gravatar.com", ...(storageUri ? [storageUri] : [])],
  },

  // other configs here...
  webpack(config) {
    // svg import support
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },

  pwa: {
    dest: "public",
    disable: process.env.NODE_ENV === "development",
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
});
