const appEnv = process.env.NEXT_PUBLIC_APP_ENV;

if (process.env.NODE_ENV === "production") {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
const defaultReaderSettings: ReaderSettings = {
  splitView: true,
  left: [{ content: ["translation", "en", 22] }],
  right: [
    { content: ["translation", "ar", "imlaei"] },
    { content: ["translation", "en", 57] },
  ],
};

const defaultPlaySettings: PlaySettings = {
  reciter: 1,
  hideTafsirs: true,
};

export default {
  env: appEnv,
  apiUri: process.env.NEXT_PUBLIC_API_URI,
  apiMediaUri: process.env.NEXT_PUBLIC_API_MEDIA_URI,
  sentryDSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  gtmEnabled: Boolean(process.env.NEXT_PUBLIC_GTM_CODE),
  gtmCode: process.env.NEXT_PUBLIC_GTM_CODE,
  staleTime: 30 * 86400 * 1000, // 30 days
  defaultReaderSettings,
  defaultPlaySettings,
};
