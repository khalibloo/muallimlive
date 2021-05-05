const appEnv = process.env.NEXT_PUBLIC_APP_ENV;

if (process.env.NODE_ENV === "production") {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
const defaultSettings: ReaderSettings = {
  splitView: true,
  left: [
    { content: ["translation", "en", 22] },
    { content: ["tafsir", "en", 169] },
  ],
  right: [
    { content: ["translation", "ar", "indopak"] },
    { content: ["translation", "en", 57] },
  ],
};

export default {
  env: appEnv,
  apiUri: process.env.NEXT_PUBLIC_API_URI,
  sentryDSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  gtmEnabled: Boolean(process.env.NEXT_PUBLIC_GTM_CODE),
  gtmCode: process.env.NEXT_PUBLIC_GTM_CODE,
  staleTime: 30 * 86400 * 1000, // 30 days
  defaultReaderSettings: defaultSettings,
};
