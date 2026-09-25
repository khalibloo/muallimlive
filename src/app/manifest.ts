import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

import { palette } from "@/theme";

const manifest = async (): Promise<MetadataRoute.Manifest> => {
  const t = await getTranslations({ locale: "en", namespace: "common" });
  return {
    name: t("app-name"),
    short_name: t("app-name"),
    description: t("app-description"),
    start_url: "/",
    scope: "/",
    display: "standalone",
    // the manifest is shared by every reader, so it uses the default dark scheme
    background_color: palette.dark.page,
    theme_color: palette.dark.surface,
    icons: [
      { src: "/icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
};

export default manifest;
