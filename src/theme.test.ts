import { theme as antdTheme } from "antd";

import getTheme, { palette } from "./theme";

describe("getTheme", () => {
  it("uses the dark algorithm and palette for the dark scheme", () => {
    const theme = getTheme("dark");

    expect(theme.algorithm).toBe(antdTheme.darkAlgorithm);
    expect(theme.token).toMatchObject({ colorPrimary: palette.dark.primary, colorBgLayout: palette.dark.page });
  });

  it("uses the default algorithm and the light palette for the light scheme", () => {
    const theme = getTheme("light");

    expect(theme.algorithm).toBeUndefined();
    expect(theme.token).toMatchObject({ colorPrimary: palette.light.primary, colorBgLayout: palette.light.page });
  });

  it("uses the default algorithm with brown text for the sepia scheme", () => {
    const theme = getTheme("sepia");

    expect(theme.algorithm).toBeUndefined();
    expect(theme.token).toMatchObject({ colorTextBase: palette.sepia.text, colorBgLayout: palette.sepia.page });
  });

  it.each(["light", "sepia", "dark"] as const)("keeps every %s font size at 16px or more", (scheme) => {
    const { fontSize, fontSizeSM } = antdTheme.getDesignToken(getTheme(scheme));

    expect(fontSize).toBe(16);
    expect(fontSizeSM).toBe(16);
  });
});
