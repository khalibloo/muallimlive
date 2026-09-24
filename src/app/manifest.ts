import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

const manifest = async (): Promise<MetadataRoute.Manifest> => {
  const t = await getTranslations({ locale: "en", namespace: "common" });
  return {
    name: t("app-name"),
    short_name: t("app-name"),
    description: t("app-description"),
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#444444",
    theme_color: "#444444",
    icons: [
      { src: "/icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
};

export default manifest;
