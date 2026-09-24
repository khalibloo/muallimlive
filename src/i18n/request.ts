import { getRequestConfig } from "next-intl/server";

// Single-locale app: no i18n routing, every request is served in English.
export default getRequestConfig(async () => ({
  locale: "en",
  messages: (await import("@/locales/en/common.json")).default,
}));
