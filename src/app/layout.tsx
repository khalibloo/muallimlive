import { Metadata } from "next";
import { headers } from "next/headers";

import "antd/dist/reset.css";

import BasicLayout from "./BasicLayout";
import Providers from "./Providers";

import "@/styles/global.css";
import config from "@/utils/config";

export const metadata: Metadata = {
  title: "Muallimlive",
  description: "Al-Qur'an reading app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const origin = `${process.env.NODE_ENV === "development" ? "http" : "https"}://${headers().get("host")}`;

  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="MuallimLive" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MuallimLive" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#444" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#444" />

        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#5bbad5" />
        <link rel="shortcut icon" href="/favicon.ico" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content={origin} />
        <meta name="twitter:image" content={`${origin}/icons/android-chrome-192x192.png`} />
        <meta name="twitter:creator" content="@khalibloo" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="MuallimLive" />
        <meta property="og:url" content={origin} />
        <meta property="og:image" content={`${origin}/icons/apple-touch-icon.png`} />

        {/* <link rel="preconnect" href={config.apiUri} /> */}

        {config.gtmCode && (
          <>
            <script dangerouslySetInnerHTML={{ __html: `dataLayer = [];` }} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                    (function(w, d, s, l, i) {
                      w[l] = w[l] || [];
                      w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
                      var f = d.getElementsByTagName(s)[0],
                        j = d.createElement(s),
                        dl = l != "dataLayer" ? "&l=" + l : "";
                      j.async = true;
                      j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
                      f.parentNode.insertBefore(j, f);
                    })(window, document, "script", "dataLayer", "${config.gtmCode}");
                    `,
              }}
            />
          </>
        )}
      </head>
      <body>
        {config.gtmCode && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${config.gtmCode}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            ></iframe>
          </noscript>
        )}
        <Providers>
          <BasicLayout>{children}</BasicLayout>
        </Providers>
      </body>
    </html>
  );
}
