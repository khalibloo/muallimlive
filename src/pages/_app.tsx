import React, { useEffect } from "react";
import { AppProps } from "next/app";
import { Provider } from "react-redux";
import { QueryClientProvider } from "react-query";

import { store } from "@/utils/store";

import "@/styles/global.css";
import Head from "next/head";
import config from "@/utils/config";
import { queryClient } from "@/utils/request";
import init from "@/utils/init";
require("@/styles/global.less");

const App: React.FC<AppProps> = ({ Component, pageProps }) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    init();
  }, []);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Head>
          <meta name="application-name" content="MuallimLive" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="default"
          />
          <meta name="apple-mobile-web-app-title" content="MuallimLive" />
          <meta name="description" content="Al-Qur'an reader" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta
            name="msapplication-config"
            content="/icons/browserconfig.xml"
          />
          <meta name="msapplication-TileColor" content="#444" />
          <meta name="msapplication-tap-highlight" content="no" />
          <meta name="theme-color" content="#444" />

          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="/icons/apple-touch-icon.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="/icons/favicon-32x32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="/icons/favicon-16x16.png"
          />
          <link rel="manifest" href="/manifest.json" />
          <link
            rel="mask-icon"
            href="/icons/safari-pinned-tab.svg"
            color="#5bbad5"
          />
          <link rel="shortcut icon" href="/favicon.ico" />

          <meta name="twitter:card" content="summary" />
          <meta name="twitter:url" content={origin} />
          <meta name="twitter:title" content="MuallimLive" />
          <meta name="twitter:description" content="Al-Qur'an reader" />
          <meta
            name="twitter:image"
            content={`${origin}/icons/android-chrome-192x192.png`}
          />
          <meta name="twitter:creator" content="@khalibloo" />

          <meta property="og:type" content="website" />
          <meta property="og:title" content="MuallimLive" />
          <meta property="og:description" content="Al-Qur'an reader" />
          <meta property="og:site_name" content="MuallimLive" />
          <meta property="og:url" content={origin} />
          <meta
            property="og:image"
            content={`${origin}/icons/apple-touch-icon.png`}
          />

          <link rel="preconnect" href={config.apiUri} />

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
        </Head>
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
        <Component {...pageProps} />
      </QueryClientProvider>
    </Provider>
  );
};

export default App;
