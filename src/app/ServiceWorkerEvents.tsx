"use client";

import React, { useEffect } from "react";
import { Workbox } from "workbox-window";

const ServiceWorkerEvents: React.FC = () => {
  // This hook only run once in browser after the component is rendered for the first time.
  // It has same effect as the old componentDidMount lifecycle callback.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // const wb = (window as any).workbox;
      const wb = new Workbox("/sw.js");

      // A common UX pattern for progressive web apps is to show a banner when a service worker has updated and waiting to install.
      // NOTE: MUST set skipWaiting to false in next.config.js pwa object
      // https://developers.google.com/web/tools/workbox/guides/advanced-recipes#offer_a_page_reload_for_users
      const updateHandler = () => {
        // `event.wasWaitingBeforeRegister` will be false if this is the first time the updated service worker is waiting.
        // When `event.wasWaitingBeforeRegister` is true, a previously updated service worker is still waiting.
        // You may want to customize the UI prompt accordingly.
        // eslint-disable-next-line no-restricted-globals, no-alert
        if (confirm("A newer version of this web app is available, reload to update?")) {
          wb.addEventListener("controlling", () => {
            window.location.reload();
          });

          // Send a message to the waiting service worker, instructing it to activate.
          wb.messageSkipWaiting();
        }
      };
      wb.addEventListener("waiting", updateHandler);

      // never forget to call register as auto register is turned off in next.config.js
      wb.register();
    }
  }, []);

  return null;
};

export default ServiceWorkerEvents;
