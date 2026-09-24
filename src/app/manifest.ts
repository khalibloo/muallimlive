import type { MetadataRoute } from "next";

const manifest = (): MetadataRoute.Manifest => ({
  name: "MuallimLive",
  short_name: "MuallimLive",
  description: "Al-Qur'an reading app",
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
});

export default manifest;
