"use client";

import { useEffect } from "react";
import { App, Button } from "antd";
import { useTranslations } from "next-intl";

/**
 * With skipWaiting + clientsClaim, a freshly-built service worker takes control automatically. When
 * that happens on an already-open tab (controllerchange), prompt the user to reload so the new assets
 * are used consistently. The very first controller acquisition (no prior controller) is the initial
 * install, not an update, so it is ignored.
 */
const ServiceWorkerUpdater: React.FC = () => {
  const t = useTranslations("common");
  const { notification } = App.useApp();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return undefined;
    }
    const hadController = !!navigator.serviceWorker.controller;

    const onControllerChange = () => {
      if (!hadController) {
        return;
      }
      const key = "sw-update";
      notification.info({
        key,
        title: t("new-version-available"),
        description: t("new-version-description"),
        duration: 0,
        actions: (
          <Button
            type="primary"
            size="small"
            onClick={() => {
              notification.destroy(key);
              window.location.reload();
            }}
          >
            {t("reload")}
          </Button>
        ),
      });
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return null;
};

export default ServiceWorkerUpdater;
