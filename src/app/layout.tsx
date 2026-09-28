import { AntdRegistry } from "@ant-design/nextjs-registry";
import { GoogleTagManager } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import { Amiri_Quran } from "next/font/google";
import { cookies, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import clsx from "clsx";

import "@/styles/global.css";

import { palette } from "@/theme";
import config from "@/utils/config";
import { getChapters } from "@/utils/content";
import {
  COLOR_SCHEME_KEY,
  COLOR_SCHEMES,
  parseColorScheme,
  parsePlaySettings,
  parseReaderSettings,
  PLAYER_SETTINGS_KEY,
  READER_SETTINGS_KEY,
} from "@/utils/cookies";
import { fetchData } from "@/utils/fetcher";
import { getHadithResources } from "@/utils/hadiths";
import BasicLayout from "./BasicLayout";
import Providers from "./Providers";
import ServiceWorkerEvents from "./ServiceWorkerEvents";
import ServiceWorkerUpdater from "./ServiceWorkerUpdater";

const amiriQuran = Amiri_Quran({ weight: "400", subsets: ["arabic"], display: "swap", variable: "--font-amiri-quran" });

const getOrigin = async () => {
  const host = (await headers()).get("host");
  return `${process.env.NODE_ENV === "development" ? "http" : "https"}://${host}`;
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("common");
  const appName = t("app-name");
  return {
    metadataBase: new URL(await getOrigin()),
    title: { default: appName, template: `%s | ${appName}` },
    description: t("app-description"),
    applicationName: appName,
    appleWebApp: { capable: true, statusBarStyle: "default", title: appName },
    formatDetection: { telephone: false },
    icons: {
      icon: [
        { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
      other: { rel: "mask-icon", url: "/icons/safari-pinned-tab.svg", color: "#5bbad5" },
    },
    openGraph: { type: "website", siteName: appName, url: "/", images: ["/icons/apple-touch-icon.png"] },
    twitter: { card: "summary", creator: "@khalibloo", images: ["/icons/android-chrome-192x192.png"] },
    other: {
      "mobile-web-app-capable": "yes",
      "msapplication-config": "/icons/browserconfig.xml",
      "msapplication-TileColor": palette.dark.surface,
      "msapplication-tap-highlight": "no",
    },
  };
};

const NO_TAJWEED_CLASS = "no-tajweed";

// Applies the theme, text size and tajweed colours cookies before the first paint. The precached offline page keeps
// the ones it was saved with; on other pages this sets what the server already rendered.
const SETTINGS_SCRIPT = `(() => {
  const cookie = (name) => {
    const entry = document.cookie.split("; ").find((c) => c.startsWith(name + "="));
    return entry && decodeURIComponent(entry.slice(name.length + 1));
  };
  const schemes = ${JSON.stringify(COLOR_SCHEMES)};
  const scheme = schemes.find((s) => s === cookie("${COLOR_SCHEME_KEY}")) ?? "${config.defaultColorScheme}";
  let textSize = 100;
  let tajweedColors = true;
  try {
    const settings = JSON.parse(cookie("${READER_SETTINGS_KEY}"));
    if (typeof settings.textSize === "number") textSize = settings.textSize;
    if (settings.tajweedColors === false) tajweedColors = false;
  } catch {}
  const html = document.documentElement;
  html.classList.remove(...schemes);
  html.classList.add(scheme);
  html.classList.toggle("${NO_TAJWEED_CLASS}", !tajweedColors);
  html.style.setProperty("--reader-scale", textSize / 100);
})()`;

const getColorScheme = async () => parseColorScheme((await cookies()).get(COLOR_SCHEME_KEY)?.value);

export const generateViewport = async (): Promise<Viewport> => {
  const colorScheme = await getColorScheme();
  // sepia is a light scheme to the browser (form controls, scrollbars)
  return { themeColor: palette[colorScheme].surface, colorScheme: colorScheme === "dark" ? "dark" : "light" };
};

const RootLayout: React.FC<{ children: React.ReactNode }> = async ({ children }) => {
  const [chapters, tafsirs, recitations, languages, translations, hadiths] = await Promise.all([
    getChapters(),
    fetchData<GetTafsirsResponse>("resources/tafsirs"),
    fetchData<GetRecitationsResponse>("resources/recitations"),
    fetchData<GetLanguagesResponse>("resources/languages"),
    fetchData<GetTranslationsResponse>("resources/translations"),
    getHadithResources(),
  ]);

  const t = await getTranslations("common");
  const cookieStore = await cookies();
  const readerSettings = parseReaderSettings(cookieStore.get(READER_SETTINGS_KEY)?.value);
  const playerSettings = parsePlaySettings(cookieStore.get(PLAYER_SETTINGS_KEY)?.value);
  const colorScheme = await getColorScheme();

  return (
    <html
      lang="en"
      className={clsx(amiriQuran.variable, colorScheme, {
        [NO_TAJWEED_CLASS]: readerSettings.tajweedColors === false,
      })}
      style={{ "--reader-scale": (readerSettings.textSize ?? 100) / 100 } as React.CSSProperties}
      // SETTINGS_SCRIPT may change the class and style before hydration
      suppressHydrationWarning
    >
      <head>
        {/* the script is a constant built from the scheme and cookie names above */}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: SETTINGS_SCRIPT }} />
      </head>
      {config.gtmCode && <GoogleTagManager gtmId={config.gtmCode} />}
      <body>
        {config.gtmCode && (
          <noscript>
            <iframe
              title={t("google-tag-manager")}
              src={`https://www.googletagmanager.com/ns.html?id=${config.gtmCode}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <NextIntlClientProvider>
          <AntdRegistry layer>
            <Providers colorScheme={colorScheme}>
              <BasicLayout
                colorScheme={colorScheme}
                settingsResources={{
                  chapters,
                  languages,
                  recitations,
                  tafsirs,
                  translations,
                  hadiths,
                  readerSettings,
                  playerSettings,
                }}
              >
                {children}
              </BasicLayout>
              <ServiceWorkerEvents />
              <ServiceWorkerUpdater />
            </Providers>
          </AntdRegistry>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
