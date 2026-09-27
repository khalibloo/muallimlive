# MuallimLive

Qur'an reading and recitation app built with Next.js 16, React 19, Ant Design 6, TailwindCSS 4, next-intl and Serwist. Find chapters with a fuzzy search by number or name, pick up where you left off, read each one with configurable translations, tafsirs and Arabic scripts (optionally in a split view) at your preferred text size, listen to verse recitations with the current verse highlighted, search the verses of your texts (in the open chapter, tafsirs included, or across the whole Qur'an once its texts are downloaded), keep favorites and notes, all listed on one page (synced between devices through your own Google Drive, or backed up to a file), share links to verses, switch between dark, light and sepia themes, and install it as a PWA. Each Arabic script, translation and tafsir can be downloaded separately (plus recitation audio per reciter and chapter) to read and listen offline. Also browse hadith collections and books, read individual hadiths, search them by word (with stemming and synonyms) or narrator, and favorite and note them alongside verses; a downloaded hadith collection reads and searches offline too.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

Copy `.env.sample` to `.env.local` and fill in the values.

| Variable                    | Description                                         |
| --------------------------- | --------------------------------------------------- |
| `API_URI`                   | Qur'an data CDN (server-only)                       |
| `NEXT_PUBLIC_API_MEDIA_URI` | Recitation audio host                               |
| `NEXT_PUBLIC_GTM_CODE`      | Optional: Google Tag Manager ID                     |
| `NEXT_PUBLIC_APP_ENV`       | Optional: environment label                         |
| `GOOGLE_CLIENT_ID`          | Google OAuth client ID for Drive sync (server-only) |
| `GOOGLE_CLIENT_SECRET`      | Its client secret (server-only)                     |
| `SYNC_SESSION_SECRET`       | Random secret encrypting the sync sign-in cookie    |

### Google Drive sync setup

1. In the [Google Cloud console](https://console.cloud.google.com/), create a project and enable the **Google Drive API**.
2. Set up the OAuth consent screen: External, the app name, a support email, the home page and `/privacy` URLs, and the scopes `openid`, `email` and `https://www.googleapis.com/auth/drive.appdata` (non-sensitive, so only basic verification). **Publish it "In production"**: while it's in Testing, refresh tokens expire after 7 days.
3. Under Credentials, create an OAuth client ID for a web application with the authorized redirect URIs `http://localhost:3000/api/sync/callback` and `https://<production host>/api/sync/callback`. Deploy previews can't sign in.
4. Put the client ID and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and a random `SYNC_SESSION_SECRET` (`openssl rand -base64 32`).

## Scripts

| Command          | Description              |
| ---------------- | ------------------------ |
| `pnpm dev`       | Start dev server         |
| `pnpm build`     | Production build         |
| `pnpm start`     | Start production server  |
| `pnpm lint:fix`  | ESLint (auto-fix)        |
| `pnpm lint:ci`   | ESLint (no warnings)     |
| `pnpm format`    | Prettier (auto-fix)      |
| `pnpm typecheck` | TypeScript type checking |

The service worker is only registered in production builds (`pnpm build && pnpm start`), so offline reading can only be tried there. Downloads are managed in Settings → Offline Storage.

## Testing

MuallimLive uses two test layers: **Vitest** for unit/component tests and **Playwright** for end-to-end tests. See [`docs/testing/`](docs/testing/) for full architecture and conventions.

### Unit / Component Tests (Vitest)

```bash
pnpm test             # Single run
pnpm test:watch       # Watch mode
pnpm test:cov         # With coverage report
pnpm test:ui          # Vitest UI with coverage
```

### End-to-End Tests (Playwright)

E2E tests run against a production build of the app backed by a local copy of the CDN data in `e2e/fixtures/cdn`. No external services are needed; Playwright starts the fixture server and the app automatically.

```bash
pnpm test:e2e:install   # Install Playwright browsers (first time or after upgrade)
pnpm test:e2e           # Run the suite
pnpm test:e2e:ui        # UI mode (interactive)
pnpm test:e2e:fixtures  # Refresh the CDN fixtures from the live CDN
```

### CI

Tests run on every push to `main` and on pull requests via GitHub Actions (`.github/workflows/test.yml`). The pipeline runs Prettier, ESLint, TypeScript, Vitest and Playwright in parallel, and publishes the results as PR checks.

## Learn More

- [Project conventions](AGENTS.md) -- architecture, patterns, and coding standards
- [Testing docs](docs/testing/) -- testing architecture and conventions
- [Next.js Documentation](https://nextjs.org/docs)
- [Ant Design Documentation](https://ant.design)
- [next-intl Documentation](https://next-intl.dev)
- [Serwist Documentation](https://serwist.pages.dev)
