const appEnv = process.env.NEXT_PUBLIC_APP_ENV;

const defaultReaderSettings: ReaderSettings = {
  splitView: true,
  left: [{ content: ["translation", "en", 22] }, { content: ["tafsir", "en", 0] }],
  right: [{ content: ["translation", "ar", "uthmani_tajweed"] }, { content: ["translation", "en", 57] }],
};

const defaultPlaySettings: PlaySettings = {
  reciter: 1,
  hideTafsirs: true,
};

export default {
  env: appEnv,
  apiUri: process.env.API_URI,
  apiMediaUri: process.env.NEXT_PUBLIC_API_MEDIA_URI,
  gtmCode: process.env.NEXT_PUBLIC_GTM_CODE,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  syncSessionSecret: process.env.SYNC_SESSION_SECRET,
  defaultReaderSettings,
  defaultPlaySettings,
  defaultColorScheme: "dark" as ColorScheme,
};
