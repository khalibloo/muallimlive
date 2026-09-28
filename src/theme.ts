import { theme as antdTheme, type ThemeConfig } from "antd";

// Keep in sync with the CSS variables in src/styles/global.css
export const palette = {
  dark: {
    primary: "#43a047",
    text: undefined,
    page: "#131414",
    surface: "#1c1d1d",
    elevated: "#242626",
    surfaceLow: "#2a2c2b",
    border: "rgba(255, 255, 255, 0.14)",
    borderSecondary: "rgba(255, 255, 255, 0.08)",
  },
  // a warm paper page with white cards, so long reading is easy on the eyes
  light: {
    primary: "#2e7d32",
    text: undefined,
    page: "#f7f5ef",
    surface: "#ffffff",
    elevated: "#ffffff",
    surfaceLow: "#efefeb",
    border: "#d9d9d4",
    borderSecondary: "#e8e8e3",
  },
  // aged paper with brown ink, the lowest contrast of the three
  sepia: {
    primary: "#2e6b30",
    text: "#3d2f1f",
    page: "#f1e7d0",
    surface: "#faf3e3",
    elevated: "#fdf8ec",
    surfaceLow: "#ece0c4",
    border: "#dccdab",
    borderSecondary: "#e7dcc2",
  },
} satisfies Record<ColorScheme, object>;

const getTheme = (scheme: ColorScheme): ThemeConfig => {
  const colors = palette[scheme];
  const dark = scheme === "dark";

  return {
    algorithm: dark ? antdTheme.darkAlgorithm : undefined,
    token: {
      colorPrimary: colors.primary,
      colorLink: colors.primary,
      colorLinkHover: colors.primary,
      colorTextBase: colors.text,
      fontSize: 16,
      fontSizeSM: 16,
      borderRadius: 8,
      wireframe: false,
      colorBgBase: dark ? colors.page : undefined,
      colorBgLayout: colors.page,
      colorBgContainer: colors.surface,
      colorBgElevated: colors.elevated,
      colorBorder: colors.border,
      colorBorderSecondary: colors.borderSecondary,
      // soft, diffuse shadows instead of the default tight ones
      ...(dark
        ? {}
        : {
            boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.12)",
            boxShadowSecondary: "0 6px 20px -8px rgba(0, 0, 0, 0.12)",
          }),
    },
    components: {
      Layout: { headerBg: colors.surface, bodyBg: colors.page, footerBg: colors.surface },
      Menu: { itemSelectedBg: colors.surfaceLow, itemHoverBg: colors.surfaceLow, itemSelectedColor: colors.primary },
      Select: { optionSelectedBg: colors.surfaceLow },
      Divider: { colorSplit: colors.border },
      Typography: { linkHoverDecoration: "underline" },
    },
  };
};

export default getTheme;
