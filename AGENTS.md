# MuallimLive Codebase Guidelines for AI Coding Agents

## Project Overview

**MuallimLive** is a Qur'an reading and recitation app. Readers browse the 114 chapters, read each verse alongside configurable translations, tafsirs and Arabic scripts (optionally in a split view), play verse recitations, search the verses of their texts, keep favorites and per-verse notes (listed together on the Favorites & Notes page), install the site as a PWA, and download content and recitations for offline use.

- **Stack**: Next.js 16 (App Router, Turbopack), TypeScript, React 19, Ant Design 6 (https://ant.design/llms.txt), TailwindCSS 4
- **Data Layer**: Static Qur'an JSON served from a CDN (`API_URI`), fetched in server components with `fetchData()` (`force-cache`). The browser never sees the CDN: offline downloads go through the `/api/content` and `/api/resources` route handlers. Recitation audio comes straight from a third-party host (`NEXT_PUBLIC_API_MEDIA_URI`)
- **Client storage**: Favorites and notes in IndexedDB via `localforage` (+ `localforage-observable`), timestamped with deletion markers so devices can merge them, and optionally synced through the reader's Google Drive; reader/player settings in cookies so server components can read them; offline packs in Cache Storage
- **i18n**: `next-intl` without locale routing (English only, `src/i18n/request.ts`)
- **PWA**: Serwist (`@serwist/turbopack`), service worker in `src/app/sw.ts`, served by `src/app/serwist/[path]/route.ts`
- **Testing**: Vitest (unit), Playwright (E2E against local CDN fixtures), both generate JUnit XML for CI

## Workflow Rules (mandatory)

### Always use project scripts — never raw tool invocations

Run tasks through the `package.json` scripts, never `pnpm exec`, `npx`, or a raw `playwright`/`vitest`/`eslint`/`tsc` command when a script exists.

| Task       | Use                                                | Never                                          |
| ---------- | -------------------------------------------------- | ---------------------------------------------- |
| Type check | `pnpm typecheck`                                   | `tsc --noEmit` directly                        |
| Lint       | `pnpm lint:ci` (check) / `pnpm lint:fix` (autofix) | `eslint .` directly                            |
| Format     | `pnpm format:ci` (check) / `pnpm format` (autofix) | `prettier` directly                            |
| Unit tests | `pnpm test [file]`                                 | `pnpm exec vitest`, `vitest run`               |
| E2E run    | `pnpm test:e2e [file] [--flags]`                   | `pnpm exec playwright test`, `playwright test` |

Trailing args to `test:e2e` (e.g. `--workers=1 --project=chromium`) pass through to Playwright. Only fall back to a raw command if no script covers the operation.

### Commits

- **Do NOT create git commits** unless the user explicitly asks.
- Commit messages follow the repo's existing format: `feat: …`, `fix: …`, `chore: …`. Keep them short, one line, no body or trailers.
- The husky pre-commit hook runs `lint-staged` (Prettier, ESLint, sorted locale JSON) and `pnpm typecheck`.

## Critical Architecture Patterns

### 1. Server-first data fetching from a static CDN

The Qur'an data is static JSON, so every read happens in server components through `fetchData()` (`src/utils/fetcher.ts`), which requests `${API_URI}/data/<path>.json` with `cache: "force-cache"`.

```typescript
// src/app/chapters/[id]/page.tsx
const chaptersData = await fetchData<GetChaptersResponse>("resources/chapters");
const chapter = chaptersData.chapters.find((c) => `${c.id}` === id);
if (!chapter) {
  notFound();
}
```

- Response types live in `src/api.d.ts` (ambient, no import needed).
- The chapter page fetches only the content types chosen in the reader settings and hands the result to the `Chapter` client component.
- The home page (`src/app/page.tsx`) fetches the chapter list and hands it to the `Home` client component: a "continue reading" card and a searchable grid of chapters.
- `Home` and `Chapter`'s chapters drawer list every chapter as `t("chapter-name")` ("1. Al-Fatihah (The Opener)") and filter them with `searchChapters` (`src/utils/chapters.ts`), a `fuse.js` fuzzy search over the number, `name_simple` and `translated_name.name`.
- `ChapterHeader` is the banner above the verses: Arabic and English names, `t("chapter-details")` (revelation place and verse count), and the bismillah when `bismillah_pre` is set.

### 2. Settings in cookies, user data in IndexedDB

- **Reader settings** (split view, left/right pane content, text size) and **player settings** (reciter, hide tafsirs) are JSON cookies, parsed with `parseReaderSettings`/`parsePlaySettings` in `src/utils/cookies.ts`, which fall back to `config.defaultReaderSettings`/`defaultPlaySettings` on missing or malformed values.
- They are written by the server actions in `src/components/saveReaderSettings.ts` and `savePlayerSettings.ts`, so the server-rendered chapter page reflects them on the next request.
- Settings cookies are written with `SETTINGS_COOKIE_OPTIONS` (1-year `maxAge`), and `src/proxy.ts` re-sets the ones a GET page request carries, so they only expire after a year without a visit. Add new settings cookies to `SETTINGS_COOKIE_KEYS`.
- The **text size** (`ReaderSettings.textSize`, a percentage, default 100) is set by the root layout as `--reader-scale` on `<html>`; the `text-verse*` Tailwind sizes scale with it, so verse text uses them instead of fixed sizes.
- The **color scheme** (`light`/`sepia`/`dark`, `COLOR_SCHEMES`, default `config.defaultColorScheme`) is the `color-scheme` cookie, parsed with `parseColorScheme` and written by `saveColorScheme` (the Theme dropdown in `NavBar`). The root layout reads it to set `<html class="light|sepia|dark">`, the viewport `themeColor`/`colorScheme` (sepia is `light` to the browser), and `Providers colorScheme` → `getTheme(scheme)`.
- **Favorites** (`faves-quran`) and **notes** (`notes-quran-<chapter>-<verse>`) are stored client-side with `localforage` (`src/utils/localforage.ts`), and read and written only through `src/utils/userData.ts`: the timestamped format (a deleted fave or note keeps a `deleted` marker), the one-time conversion of the old format, `mergeUserData` (newest `updatedAt` wins), and the change counter (`user-data-change`) that every write bumps. Components subscribe to the same keys with `lf.newObservable(...)` and must unsubscribe on unmount.
- **Favorites & Notes page** (`/saved`, linked from `NavBar` and `Home`): `Saved` lists the favorite verses and the verses with notes in two tabs, by chapter, each linking to `/chapters/<chapter>#v-<verse>` with the existing `Fave` and `Notes` buttons. Favorites and notes live in the browser, so it loads their verse texts there, through the `/api/content` packs (the display settings' Arabic scripts and translations, not tafsirs), once per chapter. It observes every localforage key and reloads on the ones `isUserDataKey` matches, since notes are stored per verse.
- **Reading progress**: `Verse` stores the verse in view as `progress-surah-<chapter>` (where `Chapter` scrolls back to) and as `last-read` (`{ chapter, verse }`, for the home page's "continue reading"). Opening a different chapter sets `last-read` to its verse 1 before any verse scrolls into view.
- **Verse links**: `Share` shares `/chapters/<chapter>#v-<verse>` with the Web Share API, or copies it to the clipboard where that API is missing. On load, `Chapter` scrolls to a valid `#v-N` verse instead of the saved progress.

### 3. Audio playback

`AudioBar` owns a single `<audio>` element and the recitation state machine (play/pause, verse range, loop, auto-scroll, volume). `Chapter` wires `Verse` play buttons and `PlayForm` (verse range and reciter) to it. `AudioBar` shows the progress through the range and reports the verse being recited (`onVerseChange`), which `Chapter` highlights with `Verse highlighted` (`aria-current`). The verse list is virtualized with `react-virtuoso`; auto-scroll uses the virtuoso ref, never DOM lookups.

### 4. i18n with `next-intl`

- **No locale routing**: `src/i18n/request.ts` always returns locale `en` with `src/locales/en/common.json`.
- **Single namespace**: all strings live in the `common` namespace as a flat object with kebab-case keys. Keys are type-checked via `src/types/next-intl.d.ts`.
- **Server/Client**: `getTranslations("common")` in server components and `generateMetadata`; `useTranslations("common")` in client components. The layout wraps the app in `<NextIntlClientProvider>`.
- The locale JSON is kept key-sorted by lint-staged (`prettier-plugin-sort-json`).

### 5. PWA (Serwist)

- `src/app/sw.ts` is the service worker (precache manifest, the offline pack routes below, then `defaultCache`).
- `@serwist/turbopack` builds it at request time through the `src/app/serwist/[path]/route.ts` route, so it is served at `/serwist/sw.js`.
- `ServiceWorkerEvents` registers it (production only) and `ServiceWorkerUpdater` prompts the user to reload when a new version is waiting.
- The web app manifest is generated by `src/app/manifest.ts`.

### 6. Offline packs

Every Arabic script, translation and tafsir is its own **text pack**, and each reciter's audio is an **audio pack** that can be downloaded per chapter or for all chapters. Changing a pane's content only needs the new pack.

- `src/utils/packs.ts` maps reader settings to packs (`getContentPack`) and builds the same-origin URLs: `/api/content/<type>/<id>/<chapter>` and `/api/resources/<chapters|recitations>`.
- `src/utils/content.ts` is the server side: it reads the CDN with `fetchData()` and returns one pack's verse texts (or a reciter's recitation list) for a chapter. The route handlers under `src/app/api/` serve it with `CACHE_HEADERS` (`s-maxage` so Netlify's CDN caches them).
- `src/utils/offline.ts` is the client side: `downloadText`/`downloadAudio` fill the `content-packs` and `audio-packs` caches (with `p-limit`), `getDownloadStatus` lists what's stored, `readText` reads a downloaded text pack back, and `useDownloads` tracks progress. For audio, the recitation list is stored after its mp3s, so it marks a complete chapter.
- Only `offline.ts` writes the caches. The service worker reads them: navigations and RSC requests are `NetworkOnly`, `/api/content/` answers from the cache first, and `.mp3` files use `CacheFirst` with `RangeRequestsPlugin` and no automatic writes.
- Offline, every navigation falls back to the precached `/~offline` page (`src/app/~offline/`), which renders the chapter, home or Favorites & Notes page from `window.location`, the reader settings cookie and the packs (fetched with `getJson`), and warns when a chapter pane's pack is missing.
- The precached page keeps the theme and text size it was saved with, so the root layout's `SETTINGS_SCRIPT` applies the cookies' `<html>` class and `--reader-scale` before the first paint, and `useColorScheme` (`Providers`, `NavBar`) switches the antd theme to the cookie's scheme after hydration.
- `OfflineStorage` (Settings → Offline Storage) manages downloads. After a reader saves display settings that use a pack they haven't downloaded (while having downloaded others), `NavBar` shows a notification that opens it.
- `NavBar` also offers the downloads once after the app is installed: on Chromium's `appinstalled` event, or on the first launch in `display-mode: standalone` (iOS fires no install event). It skips readers who already have their display settings' content or are offline, and stores `offline-install-prompt-shown` in localforage.

### 7. Google Drive sync

Favorites and notes can sync between a reader's devices through `muallimlive-data.json` in their Google Drive's hidden `appDataFolder` (scope `drive.appdata`). The data goes straight between the browser and Google; the server only holds the sign-in.

- **Sign-in routes** (`src/app/api/sync/`, `google-auth-library` + `iron-session`, helpers in `src/utils/syncSession.ts`): `login` starts Google's OAuth with PKCE, `callback` verifies the ID token, fails when the reader withheld Drive access, and stores the refresh token, account id and email in the encrypted, httpOnly `sync-session` cookie (path `/api/sync`, re-saved on use so it lasts a year), `token` returns a fresh access token (401 when the sign-in is gone or revoked, 503 when Google is unreachable), and `disconnect` revokes the token and deletes the cookie.
- **`src/utils/sync.ts`** runs in the browser: it caches the access token, calls the Drive REST API directly, and `syncNow` downloads, merges (`mergeUserData`), writes and uploads, skipping the transfer when neither the Drive file's version nor the change counter moved. A Web Lock (plus an in-tab flag) allows one sync at a time. The `sync-state` localforage key holds the account, file id, last version and synced change; it's only saved while the same account is still syncing, so stopping mid-sync sticks. A 401, or a sign-in to an account other than the synced one, sets `needsReauth`. Merged data is written one value at a time, each merged with what's stored just before.
- **Connecting**: `startConnect` merges straight away unless this device and the account's Drive both have data and this device wasn't syncing that account; then the reader chooses to merge or use Drive only (which exports a backup first).
- **`SyncProvider`** (in `Providers`) syncs on load, 3 s after a local change, on becoming visible or online, and every 5 minutes while visible. It handles `?sync=connected|failed` after sign-in (then removes the param) and shows `SyncDialogs`: the merge choice and an undismissable "sign in again" dialog (sign in, stop syncing, or clear data and stop).
- **`SyncSettings`** (Settings → Sync & Backup): connect, sync now, stop syncing, JSON export/import (import merges), clear this device, and delete from all devices (which syncs first, so it also deletes what other devices synced since).
- The service worker sends `www.googleapis.com` requests `NetworkOnly`.

### 8. Verse search

`SearchModal` (the Search button in `NavBar`) searches the display settings' texts in the browser with `minisearch` (`src/utils/search.ts`). Chapter names keep their `fuse.js` search.

- `search.ts` builds one word index per text, normalizing texts and queries alike (`normalizeTerm`: no accents, Arabic diacritics or Qur'anic marks, one alef and one yaa) after `toPlainText` strips the CDN HTML. Every query word must match, as a prefix, with small typos allowed in longer words. `highlight` marks the matched words and shortens long texts around the first match.
- **Current chapter**: `Chapter` registers its texts, one per pack, and `goToVerse` through `ChapterSearchContext` (the provider is in `BasicLayout`). "Only <chapter>" is on by default there; it searches what the page already holds, tafsirs included, and a result scrolls the verse list instead of navigating.
- **Whole Qur'an**: searches the Arabic scripts and translations whose text packs are downloaded for every chapter, indexed once per session from Cache Storage (`loadPackIndex`). Tafsirs are left out, as their packs are too large to index. Missing packs can be downloaded from the modal, and browsers without Cache Storage can only search a chapter.
- Each text can be ticked off; results show 50 at a time.
- Merging trusts each device's clock, so a device whose clock is wrong can let an older edit win.

## Development Workflows

### Build & Dev Commands

```bash
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Next.js build
pnpm start            # Start production server
```

### Testing

> Full documentation: [`docs/testing/architecture.md`](docs/testing/architecture.md) and [`docs/testing/conventions.md`](docs/testing/conventions.md)

```bash
pnpm test             # Unit tests (Vitest) single run
pnpm test:watch       # Vitest watch mode
pnpm test:cov         # Coverage report
pnpm test:ui          # Vitest UI with coverage
pnpm test:e2e         # Playwright E2E (starts the fixture CDN and the app automatically)
pnpm test:e2e:ui      # Playwright UI mode
pnpm test:e2e:ci      # CI mode (JUnit XML)
```

#### Vitest Key Patterns

- **TestProviders**: Wrap all component renders in `<TestProviders>` (`src/components/test/TestProviders.tsx`). It defaults to the real English catalogue so tests assert the exact user-facing strings; pass `translations` to override.
- **Accessible queries only**: Use `screen.getByRole()`, `getByLabelText()`, `getByText()`. Never use `querySelector`, IDs, CSS classes, or `data-testid`.
- **Mocking**: `server-only` and `next/headers` are globally mocked in `vitest-setup.ts`, along with `matchMedia`, `ResizeObserver`, `IntersectionObserver` (`react-intersection-observer/test-utils`) and `HTMLMediaElement.play/pause`. Mock server actions with `vi.mock("@/components/saveReaderSettings")`. jsdom has no Cache Storage; offline tests use `stubCaches`/`stubFetch` from `src/components/test/fakeCaches.ts`. Sync tests fake the token route and Drive with `stubDrive` (`src/components/test/fakeDrive.ts`) and call `forgetToken()` in `beforeEach`; the sign-in route tests use `stubCookies` (`fakeCookies.ts`), spy on `OAuth2Client.prototype`, and run in `@vitest-environment node`.
- **Coverage thresholds**: statements 80%, branches 60%, functions 70%, lines 80%.

#### Playwright Key Patterns

- **Custom fixtures**: Import `test` and `expect` from `e2e/helpers/fixtures.ts` (not `@playwright/test`). They pre-accept the cookie notice, mock recitation audio, and wait for hydration. `preparePage` applies the same setup to a page in another context (a second device).
- **Google fakes**: `e2e/helpers/drive.ts` routes the sign-in, token and Drive requests per context to one in-memory `FakeGoogle`, which several contexts can share.
- **Fixture CDN**: E2E runs against `e2e/fixtures/cdn` served locally (`pnpm test:e2e:data`), configured by `.env.test`. Regenerate the fixtures with `pnpm test:e2e:fixtures`, then delete `.next/cache/fetch-cache`, which otherwise keeps serving the old data.
- **No hosts or ports in tests**: the app's port is `PORT` in `.env.test`, which `playwright.config.ts` turns into `baseURL`. E2E tests use relative paths, or the `baseURL` fixture where an absolute URL is needed. Unit tests assert paths only.
- **Service workers** are blocked except in `pwa.test.ts` and `offline.test.ts`, which opt in with `test.use({ serviceWorkers: "allow" })`.

### Code Quality

```bash
pnpm lint:fix         # ESLint fix
pnpm format           # Prettier fix
pnpm typecheck        # tsc --noEmit
```

## Definition of Done (Mandatory Checklist)

**A task is NOT complete until every applicable item below is done and verified.** When you report a task done, explicitly state which of these you ran and their result.

### Work is self-healing — fix everything you touch through, not just what you broke

- **Any** build error, type error, lint error, or failing test that surfaces while you work MUST be fixed before the task is done — regardless of whether your change caused it.
- **A check you cannot run is NOT a pass.** If a required check is impossible in the current environment, surface it explicitly in the final summary as unverified and do not report the work as complete.
- **When you find a logic issue or latent bug unrelated to the current work**, surface it explicitly in the final summary and ask the user for a decision. Mechanical issues (lint, types, stale tests, missing i18n keys) you fix directly.

### 1. Build & type safety — ALWAYS

- `pnpm build` must succeed.
- `pnpm typecheck` must pass — the build does NOT type-check the same way.
- `pnpm lint:ci` must pass (warnings fail CI).

### 2. Tests — ALWAYS run, and fix every failure

- **Unit:** `pnpm test` must be fully green.
- **E2E:** `pnpm test:e2e` must be fully green. It needs no external services.

### 3. Internationalization — when adding/changing any user-visible string

- Every user-visible string (including `aria-label`s and metadata) must come from an i18n key in `src/locales/en/common.json`.

### 4. Documentation — when behavior changes

- Update this file, `README.md` and `docs/` when a documented flow or convention changes.

## Environment Variables & Configuration

All configuration is centralized in `src/utils/config.ts`. See `.env.sample` for available variables.

```bash
API_URI=https://d28mcm0t8zev62.cloudfront.net       # Qur'an data CDN (server-only)
NEXT_PUBLIC_API_MEDIA_URI=...                       # Recitation audio host
NEXT_PUBLIC_GTM_CODE=...                            # Optional: Google Tag Manager
NEXT_PUBLIC_APP_ENV=development                     # Optional: environment label
GOOGLE_CLIENT_ID=...                                # Google OAuth client for Drive sync (server-only)
GOOGLE_CLIENT_SECRET=...                            # Its secret (server-only)
SYNC_SESSION_SECRET=...                             # 32+ random characters encrypting the sync-session cookie
```

**Security**: Never commit `.env.local` or any file with real secrets.

## File Organization

```
src/
├── app/                          # App Router
│   ├── layout.tsx                # Root layout: metadata, providers, GTM
│   ├── Providers.tsx             # AntdRegistry, ConfigProvider, App, SyncProvider
│   ├── BasicLayout.tsx           # NavBar + content + Footer + CookieNotice
│   ├── page.tsx, Home.tsx        # Home: continue reading + searchable chapter grid
│   ├── chapters/[id]/            # Chapter page (server) + Chapter, ChapterHeader (client)
│   ├── saved/                    # Favorites & Notes page (server) + Saved (client)
│   ├── privacy/, terms/          # Legal pages
│   ├── api/                      # Route handlers proxying offline packs from the CDN
│   ├── api/sync/                 # Google sign-in for Drive sync: login, callback, token, disconnect
│   ├── ~offline/                 # Offline fallback page (renders downloaded packs)
│   ├── manifest.ts               # Web app manifest
│   ├── sw.ts                     # Serwist service worker
│   └── serwist/[path]/route.ts   # Serves the compiled service worker
├── components/
│   ├── AudioBar.tsx              # Recitation player
│   ├── OfflineStorage.tsx        # Offline downloads settings tab
│   ├── Verse.tsx                 # Verse row: panes, play, fave, notes, share
│   ├── Fave.tsx, Notes.tsx       # Favorites and notes (localforage)
│   ├── Share.tsx                 # Shares or copies a verse link
│   ├── NoteEditor.tsx            # Labelled Quill editor (loaded client-only)
│   ├── PlayForm.tsx              # Recitation options form
│   ├── ReaderSettingsForm.tsx    # Display settings form
│   ├── save*Settings.ts, saveColorScheme.ts # Server actions writing settings cookies
│   ├── SafeHtml.tsx              # DOMPurify-sanitized HTML
│   ├── SearchModal.tsx           # Verse search: the chapter's texts or the downloaded packs
│   ├── ChapterSearchContext.tsx  # The open chapter's texts, for the verse search
│   ├── SyncProvider.tsx          # Runs Drive sync in the background, handles ?sync= after sign-in
│   ├── SyncDialogs.tsx           # Merge choice and the required "sign in again" dialog
│   ├── SyncSettings.tsx          # Sync & Backup settings tab
│   └── test/                     # TestProviders, fakeCaches, fakeDrive, fakeCookies
├── utils/                        # config, fetcher, cookies, localforage, chapters, packs, content, offline,
│                                 # userData (faves/notes format and merge), sync, syncSession (server),
│                                 # search (verse indexes and highlighting)
├── proxy.ts                      # Renews the settings cookies on page visits
├── i18n/request.ts               # next-intl request config
├── locales/en/common.json        # UI strings
├── types/next-intl.d.ts          # next-intl type augmentation
├── api.d.ts                      # CDN response types (ambient)
├── typings.d.ts                  # App types (ReaderSettings, PlaySettings, …)
└── theme.ts                      # palette + getTheme(scheme) Ant Design theme
```

## Common Patterns & Conventions

- **Server vs Client**: Server components by default; `"use client"` only for interactivity.
- **Async params**: Always `await params` / `searchParams` in pages and `generateMetadata`.
- **Not found**: Use `notFound()` from `next/navigation`.
- **HTML content**: Render CDN HTML (tafsirs, tajweed) only through `SafeHtml`.
- **Forms**: Ant Design `Form` with `onFinish`; settings forms call the server actions.

## Ant Design Deprecations

These Ant Design props are deprecated in v6. Use the replacements:

| Component | Deprecated     | Use Instead                                            |
| --------- | -------------- | ------------------------------------------------------ |
| `Alert`   | `message`      | `title`                                                |
| `Card`    | `bodyStyle`    | `classNames={{ body: "" }}` or `styles={{ body: {} }}` |
| `Space`   | `direction`    | `orientation`                                          |
| `Divider` | `type`         | `orientation`                                          |
| `Drawer`  | `width`        | `size`                                                 |
| `Modal`   | `maskClosable` | `mask={{ closable: boolean }}`                         |

## React 19 Conventions

- **No `useMemo` / `useCallback`** unless profiling shows a need.
- **`useDeepCompareEffect` for reference deps** — when `useEffect` dependencies include objects or arrays, use `useDeepCompareEffect` from `ahooks`.

## Tailwind CSS Conventions

- **Consistent spacing values only** — 0, 1, 2, 4, 6, 8, 12, 16, 20, 24.
- **Prefer Tailwind over `style` prop** — only use `style` for dynamically computed values (e.g. theme token colors).
- Tailwind and antd share CSS layers (`AntdRegistry layer`); keep global overrides in `src/styles/`.
- **Theme-aware colors only** — no hardcoded greys or `white/…` tints. Use the semantic colors `bg-page`, `bg-surface`, `bg-surface-elevated`, `border-line`/`divide-line`, `text-primary`, `text-secondary` (CSS variables in `src/styles/global.css` for `:root`, `.sepia` and `.dark`, mirroring `palette` in `src/theme.ts`), or a `dark:` variant. Tailwind's `sepia` filter utility is disabled (`@source not inline`) because `sepia` is a scheme class.
- **Verse text sizes** — use `text-verse`, `text-verse-sm`, `text-verse-lg`, `text-verse-arabic`, `text-verse-arabic-lg` so the reader's text size applies.

## Ant Design Conventions

- **`Flex`/`Space` gap** — use `"small"`, `"middle"`, `"large"`, not pixel values.
- **Don't overuse `theme.useToken()`** — use it for colors, not spacing or radius.

## Accessibility Conventions

- **Decorative icons must have `aria-hidden`**. Icon-only buttons need a translated `aria-label`.
- **Toggle buttons** (favorite, play, mute) expose state with `aria-pressed` or a state-specific label.
- **Form items must have visible labels** from i18n keys.

## i18n Conventions

- **No string concatenation for visible text** — use parameterized keys (`t("notes-title", { chapter, verse })`).
- **No hardcoded visible strings** — every user-visible string must come from an i18n key.
- Rich text uses `t.rich(key, { link: (chunks) => <a …>{chunks}</a> })`.

## Red Flags to Avoid

- ❌ Client-side `fetch` of CDN data; fetch in server components with `fetchData()`, or through `/api/*` for offline packs
- ❌ Writing offline packs from the service worker; only `src/utils/offline.ts` writes them
- ❌ Reading `process.env` outside `src/utils/config.ts`
- ❌ `useTranslations()` in server components (use `getTranslations()`)
- ❌ Not awaiting `params` in pages
- ❌ Rendering CDN HTML with `dangerouslySetInnerHTML` directly instead of `SafeHtml`
- ❌ Subscribing to localforage observables without unsubscribing
- ❌ Forgetting `"use client"` for interactive components

## External Documentation

- Next.js: `node_modules/next/dist/docs/`
- Ant Design: https://ant.design/llms.txt
- next-intl: https://next-intl.dev
- Serwist: https://serwist.pages.dev
