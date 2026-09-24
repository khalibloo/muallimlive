"use client";

import { useMount } from "ahooks";

const ServiceWorkerEvents: React.FC = () => {
  useMount(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    // Never register in development: the precache manifest is built for production chunk URLs, so
    // the SW would break Turbopack's HMR chunks. Unregister any SW left over from a production run.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      return;
    }

    navigator.serviceWorker.register("/serwist/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  });

  return null;
};

export default ServiceWorkerEvents;
