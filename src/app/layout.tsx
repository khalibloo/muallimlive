import { AntdRegistry } from "@ant-design/nextjs-registry";
import { GoogleTagManager } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import { Mirza } from "next/font/google";
import { cookies, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";

import "@/styles/global.css";

import config from "@/utils/config";
import { getChapters } from "@/utils/content";
import { parsePlaySettings, parseReaderSettings, PLAYER_SETTINGS_KEY, READER_SETTINGS_KEY } from "@/utils/cookies";
import { fetchData } from "@/utils/fetcher";
import BasicLayout from "./BasicLayout";
import Providers from "./Providers";
import ServiceWorkerEvents from "./ServiceWorkerEvents";
import ServiceWorkerUpdater from "./ServiceWorkerUpdater";

const mirza = Mirza({ weight: "400", subsets: ["arabic"], display: "swap", variable: "--font-mirza" });

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
      "msapplication-TileColor": "#444",
      "msapplication-tap-highlight": "no",
    },
  };
};

export const viewport: Viewport = {
  themeColor: "#444",
};

const RootLayout: React.FC<{ children: React.ReactNode }> = async ({ children }) => {
  const [chapters, tafsirs, recitations, languages, translations] = await Promise.all([
    getChapters(),
    fetchData<GetTafsirsResponse>("resources/tafsirs"),
    fetchData<GetRecitationsResponse>("resources/recitations"),
    fetchData<GetLanguagesResponse>("resources/languages"),
    fetchData<GetTranslationsResponse>("resources/translations"),
  ]);

  const t = await getTranslations("common");
  const cookieStore = await cookies();
  const readerSettings = parseReaderSettings(cookieStore.get(READER_SETTINGS_KEY)?.value);
  const playerSettings = parsePlaySettings(cookieStore.get(PLAYER_SETTINGS_KEY)?.value);

  return (
    <html lang="en" className={mirza.variable}>
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
            <Providers>
              <BasicLayout
                settingsResources={{
                  chapters,
                  languages,
                  recitations,
                  tafsirs,
                  translations,
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
