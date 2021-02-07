const withAntdLess = require("next-plugin-antd-less");

module.exports = withAntdLess({
  // use modifyVars or lessVarsFilePath or both
  // modifyVars: { '@primary-color': '#04f' },
  lessVarsFilePath: "./styles/theme.less",

  // other configs here...
  webpack(config) {
    return config;
  },
});
