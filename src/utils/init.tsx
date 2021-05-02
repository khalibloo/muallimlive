import * as Sentry from "@sentry/browser";
import config from "@/utils/config";
import { configResponsive } from "ahooks";
import { Button, notification } from "antd";

const init = () => {
  // sentry
  if (config.sentryDSN) {
    Sentry.init({
      dsn: config.sentryDSN,
      environment: config.env,
    });
  }

  // Responsive
  configResponsive({
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1600,
  });

  // SW
  if (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    window.workbox !== undefined
  ) {
    const wb = window.workbox;
    // add event listeners to handle any of PWA lifecycle event
    // https://developers.google.com/web/tools/workbox/reference-docs/latest/module-workbox-window.Workbox#events
    // wb.addEventListener("installed", (event) => {
    //   console.log(`Event ${event.type} is triggered.`);
    //   console.log(event);
    // });

    // wb.addEventListener("controlling", (event) => {
    //   console.log(`Event ${event.type} is triggered.`);
    //   console.log(event);
    // });

    // wb.addEventListener("activated", (event) => {
    //   console.log(`Event ${event.type} is triggered.`);
    //   console.log(event);
    // });

    // A common UX pattern for progressive web apps is to show a banner when a service worker has updated and waiting to install.
    // NOTE: MUST set skipWaiting to false in next.config.js pwa object
    // https://developers.google.com/web/tools/workbox/guides/advanced-recipes#offer_a_page_reload_for_users
    const promptNewVersionAvailable = (event) => {
      // `event.wasWaitingBeforeRegister` will be false if this is the first time the updated service worker is waiting.
      // When `event.wasWaitingBeforeRegister` is true, a previously updated service worker is still waiting.
      // You may want to customize the UI prompt accordingly.
      const key = `open${Date.now()}`;
      const btn = (
        <Button
          type="primary"
          onClick={() => {
            notification.close(key);
            wb.addEventListener("controlling", (event) => {
              window.location.reload();
            });

            // Send a message to the waiting service worker, instructing it to activate.
            wb.messageSkipWaiting();
          }}
        >
          Refresh
        </Button>
      );
      notification.open({
        message: "New Version Available",
        description: "Reload page to update?",
        btn,
        key,
        onClose: async () => {},
      });
    };

    wb.addEventListener("waiting", promptNewVersionAvailable);

    // ISSUE - this is not working as expected, why?
    // I could only make message event listenser work when I manually add this listenser into sw.js file
    // wb.addEventListener("message", (event) => {
    //   console.log(`Event ${event.type} is triggered.`);
    //   console.log(event);
    // });

    /*
    wb.addEventListener('redundant', event => {
      console.log(`Event ${event.type} is triggered.`)
      console.log(event)
    })
    wb.addEventListener('externalinstalled', event => {
      console.log(`Event ${event.type} is triggered.`)
      console.log(event)
    })
    wb.addEventListener('externalactivated', event => {
      console.log(`Event ${event.type} is triggered.`)
      console.log(event)
    })
    */

    // never forget to call register as auto register is turned off in next.config.js
    // wb.register();
  }
};

export default init;
