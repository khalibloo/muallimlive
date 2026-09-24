import { theme as antdTheme, type ThemeConfig } from "antd";

const theme: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: "#43A047",
    fontSize: 16,
    colorBgBase: "#444",
    colorBgElevated: "#333",
    colorLink: "#43A047",
    colorLinkHover: "#43A047",
    borderRadius: 4,
    colorBorder: "#666",
  },
  components: {
    Button: { colorBgContainer: "#111" },
    Input: { colorBgContainer: "#111" },
    Layout: {
      headerBg: "#333",
      bodyBg: "#444",
    },
  },
};

export default theme;
