# Testing Architecture

## Overview

MuallimLive uses two test layers:

| Layer            | Tool                     | Scope                                       | Location                 |
| ---------------- | ------------------------ | ------------------------------------------- | ------------------------ |
| Unit / Component | Vitest + Testing Library | Pure functions, React components, utilities | `src/**/*.test.{ts,tsx}` |
| End-to-End       | Playwright               | Full flows through a real browser           | `e2e/**/*.test.ts`       |

**The boundary rule**: if it can be tested without a running server, it goes in Vitest. If it needs the server-rendered chapter page, cookies round-tripping through server actions, IndexedDB persistence across reloads, real audio playback or the service worker, it goes in Playwright.

---

## Vitest Architecture

### Environment

Vitest runs in a **jsdom** environment configured in `vitest.config.mts`:

```ts
// vitest.config.mts (key settings)
export default defineConfig({
  envPrefix: "NEXT_PUBLIC_",
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["./src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest-setup.ts"],
    globals: true,
    clearMocks: true,
    env: {
      API_URI: "http://cdn.test",
      NEXT_PUBLIC_API_MEDIA_URI: "https://audio.test",
    },
    testTimeout: process.env.TEST_TIMEOUT ? Number(process.env.TEST_TIMEOUT) : 10000,
  },
});
```

### TestProviders Wrapper

Component tests render inside `<TestProviders>` (`src/components/test/TestProviders.tsx`), which wraps children with:

- **NextIntlClientProvider** -- locale `en`, timezone `UTC`, and the translations
- **Ant Design ConfigProvider** -- the app's dark theme (`getTheme("dark")` from `src/theme.ts`)
- **StyleProvider** -- CSS-in-JS for Ant Design
- **App** -- Ant Design's App context (message, notification)

| Prop           | Type  | Default                           | Purpose                               |
| -------------- | ----- | --------------------------------- | ------------------------------------- |
| `translations` | `any` | `src/locales/en/common.json` (\*) | i18n messages object, namespace-keyed |

(\*) The real English catalogue is the default so tests assert the exact user-facing strings.

### Global Mocks (vitest-setup.ts)

1. **jest-dom matchers** -- `@testing-library/jest-dom/vitest`
2. **Browser APIs** -- `window.matchMedia`, `ResizeObserver`, `IntersectionObserver` (`react-intersection-observer/test-utils`), `HTMLMediaElement.play`/`pause`
3. **Module mocks**:
   - `server-only` -- stubbed to an empty module
   - `next/headers` -- `cookies()` is a `vi.fn()`

jsdom has no IndexedDB, so `localforage` falls back to its `localStorage` driver. Tests call `lf.clear()` in `beforeEach` and seed data with `lf.setItem()`.

### Coverage Configuration

Pages, layouts, the manifest, the service worker and its route, the i18n request config and type declarations are excluded. They are thin wrappers or need a real server, and Playwright covers them. The thresholds are:

| Metric     | Threshold |
| ---------- | --------- |
| Statements | 80%       |
| Branches   | 60%       |
| Functions  | 70%       |
| Lines      | 80%       |

---

## Playwright E2E Architecture

### Fixture CDN

The app reads all Qur'an data from a static JSON CDN (`API_URI`). E2E never hits the real CDN. Instead:

- `e2e/fixtures/cdn/data/**` holds a committed subset of the CDN: chapters 1, 112, 113 and 114, the default reader settings' content, Saheeh International, and reciters 1 and 7. The chapter list (`resources/chapters`) is trimmed to those four chapters, so offline downloads of "every chapter" stay small.
- `pnpm test:e2e:data` serves it with `http-server` on port 4010.
- `.env.test` points `API_URI` at `http://localhost:4010`. `playwright.config.ts` loads it before starting the servers.
- `pnpm test:e2e:fixtures` (`scripts/fetch-e2e-fixtures.mjs`) re-downloads the subset. Re-run it when a test needs a new chapter or content ID.
- `fetchData()` uses `force-cache`, and Next keeps that cache in `.next/cache/fetch-cache` across builds. After changing an existing fixture file, delete that directory, or the app keeps serving the old data.

`e2e/helpers/data.ts` reads the same fixture files, so tests assert exactly what the app renders instead of hard-coding Qur'an text. It provides `chapterHeading`, `chapterName`, `chapterLabel`, `chapterTranslatedName`, `translationText`, `arabicText`, `tafsirExcerpt` and `recitationUrl`.

### Web Servers

`playwright.config.ts` starts two servers, reusing running ones outside CI:

| Command               | URL                     | Purpose                                   |
| --------------------- | ----------------------- | ----------------------------------------- |
| `pnpm test:e2e:data`  | `http://localhost:4010` | Fixture CDN                               |
| `pnpm test:e2e:start` | `http://localhost:3000` | Production build (`next build` + `start`) |

### Custom Fixtures (`e2e/helpers/fixtures.ts`)

The `testPage` fixture wraps `page`:

- **Cookie notice pre-accepted**: an init script seeds `accepted_cookie_notice` into localforage's IndexedDB store before any app script runs. Opt out with `test.use({ acceptCookieNotice: false })`.
- **Recitation audio mocked**: every request to the media host (`NEXT_PUBLIC_API_MEDIA_URI`) is fulfilled with a generated silent WAV (`e2e/helpers/audio.ts`), with CORS like the real host. Its length is set by the `audioClipSeconds` option (default 30). Use short clips to test auto-advance. The mock is a `context.route()`, so it also covers the service worker's requests.
- **Hydration wait**: `goto()` and `reload()` wait for `html[data-hydrated="true"]`, which `Providers` sets once React mounts, so clicks never land on unhydrated markup.

The same setup is exported as `preparePage(page, context, options)`, for a page in a context the test creates itself, such as a second device.

### Google Sign-in and Drive Fakes (`e2e/helpers/drive.ts`)

E2E never reaches Google. `routeFakeGoogle(context, google)` routes, per context:

- `/api/sync/login` straight back to the page with `?sync=connected`, as Google's consent and the callback would;
- `/api/sync/token` to an access token for `google.account`, or `google.tokenStatus` (set it to 401 to test an expired sign-in);
- `/api/sync/disconnect` to a 204;
- `www.googleapis.com` to an in-memory Drive app folder holding one file.

A `FakeGoogle` from `createFakeGoogle()` can be routed into several contexts, so two devices share one Drive; `driveFaves(google)` lists the live favorites in its file. The real sign-in routes are covered by unit tests only (`src/app/api/sync/routes.test.ts`).

### Service Workers

The production build registers the Serwist service worker. That would cache pages and data across tests and hide `page.route()` mocks, so the config sets `serviceWorkers: "block"`. The PWA and offline specs (`e2e/flows/pwa.test.ts`, `e2e/flows/offline.test.ts`) opt back in with `test.use({ serviceWorkers: "allow" })`.

The offline spec downloads packs from the Storage tab, then calls `context.setOffline(true)`. It also swaps the media mock for one that aborts and records requests, which proves the recitations play from Cache Storage.

### Isolation and Parallelism

Tests run `fullyParallel`. Every test gets a fresh browser context, so cookies (reader and player settings) and IndexedDB (favorites, notes, progress) never leak between tests. There is no shared server-side state.

### Playwright Configuration

```ts
// playwright.config.ts (key settings)
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html"], ["junit", { outputFile: "playwright-report/junit.xml" }]] : "html",
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry", serviceWorkers: "block" },
  timeout: 30000,
  expect: { timeout: 5000 },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

`PLAYWRIGHT_TEST_TIMEOUT` and `PLAYWRIGHT_TEST_EXPECT_TIMEOUT` override the timeouts.

---

## CI Architecture

The GitHub Actions workflow (`.github/workflows/test.yml`) runs on push to `main` and on PRs, with these parallel jobs:

| Job          | Tool       | What it does                                               |
| ------------ | ---------- | ---------------------------------------------------------- |
| `format`     | Prettier   | Checks code formatting                                     |
| `lint`       | ESLint     | Lints with zero-warning threshold                          |
| `typecheck`  | TypeScript | `tsc --noEmit`                                             |
| `vitest`     | Vitest     | Runs unit/component tests with coverage, outputs JUnit XML |
| `playwright` | Playwright | Builds the app, serves the fixture CDN, runs E2E tests     |

### Test Result Reporting

Both runners output JUnit XML:

- `coverage/junit.xml` -- Vitest results
- `playwright-report/junit.xml` -- Playwright results

These are published by `EnricoMi/publish-unit-test-result-action`, which adds check annotations and summary tables to PRs. The Playwright HTML report is uploaded as an artifact.
