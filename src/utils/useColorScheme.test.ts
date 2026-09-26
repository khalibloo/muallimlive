import { renderHook } from "@testing-library/react";

import useColorScheme from "./useColorScheme";

const setCookie = (value?: string) => {
  document.cookie = value ? `color-scheme=${value}; path=/` : "color-scheme=; path=/; max-age=0";
};

describe("useColorScheme", () => {
  afterEach(() => setCookie());

  it("uses the rendered scheme when the cookie matches it", () => {
    setCookie("sepia");

    expect(renderHook(() => useColorScheme("sepia")).result.current).toBe("sepia");
  });

  it("switches to the cookie's scheme when the page was rendered with another", () => {
    setCookie("light");

    expect(renderHook(() => useColorScheme("dark")).result.current).toBe("light");
  });

  it("follows the rendered scheme after it changes", () => {
    setCookie("sepia");
    const { result, rerender } = renderHook(({ scheme }) => useColorScheme(scheme), {
      initialProps: { scheme: "sepia" as ColorScheme },
    });

    setCookie("light");
    rerender({ scheme: "light" });

    expect(result.current).toBe("light");
  });

  it("falls back to the default scheme without a cookie", () => {
    expect(renderHook(() => useColorScheme("light")).result.current).toBe("dark");
  });
});
