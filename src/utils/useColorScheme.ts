import { useState } from "react";
import { useCookieState, useMount } from "ahooks";

import { COLOR_SCHEME_KEY, parseColorScheme } from "./cookies";

/**
 * The color scheme to show. Pages are rendered with the scheme cookie, except the precached offline page, which
 * keeps the scheme it was saved with, so the cookie's scheme replaces it after hydration.
 */
export default function useColorScheme(rendered: ColorScheme) {
  const [cookie] = useCookieState(COLOR_SCHEME_KEY);
  const [saved, setSaved] = useState<ColorScheme>();

  useMount(() => {
    const scheme = parseColorScheme(cookie);
    if (scheme !== rendered) {
      setSaved(scheme);
    }
  });

  return saved ?? rendered;
}
