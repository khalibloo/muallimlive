# MuallimLive Codebase Guidelines for AI Coding Agents

## Project Overview

**MuallimLive** is a Qur'an reading and recitation app. Readers browse the 114 chapters, read each verse alongside configurable translations, tafsirs and Arabic scripts (optionally in a split view), play verse recitations, keep favorites and per-verse notes, install the site as a PWA, and download content and recitations for offline use.

- **Stack**: Next.js 16 (App Router, Turbopack), TypeScript, React 19, Ant Design 6 (https://ant.design/llms.txt), TailwindCSS 4
- **Data Layer**: Static Qur'an JSON served from a CDN (`API_URI`), fetched in server components with `fetchData()` (`force-cache`). The browser never sees the CDN: offline downloads go through the `/api/content` and `/api/resources` route handlers. Recitation audio comes straight from a third-party host (`NEXT_PUBLIC_API_MEDIA_URI`)
- **Client storage**: Favorites and notes in IndexedDB via `localforage` (+ `localforage-observable`); reader/player settings in cookies so server components can read them; offline packs in Cache Storage
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

### 2. Settings in cookies, user data in IndexedDB

- **Reader settings** (split view, left/right pane content) and **player settings** (reciter, hide tafsirs) are JSON cookies, parsed with `parseReaderSettings`/`parsePlaySettings` in `src/utils/cookies.ts`, which fall back to `config.defaultReaderSettings`/`defaultPlaySettings` on missing or malformed values.
- They are written by the server actions in `src/components/saveReaderSettings.ts` and `savePlayerSettings.ts`, so the server-rendered chapter page reflects them on the next request.
- **Favorites** (`faves-quran`) and **notes** (`notes-quran-<chapter>-<verse>`) are stored client-side with `localforage` (`src/utils/localforage.ts`). Components subscribe with `lf.newObservable(...)` and must unsubscribe on unmount.

### 3. Audio playback

`AudioBar` owns a single `<audio>` element and the recitation state machine (play/pause, verse range, loop, auto-scroll, volume). `Chapter` wires `Verse` play buttons and `PlayForm` (verse range and reciter) to it. The verse list is virtualized with `react-virtuoso`; auto-scroll uses the virtuoso ref, never DOM lookups.

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
- `src/utils/offline.ts` is the client side: `downloadText`/`downloadAudio` fill the `content-packs` and `audio-packs` caches (with `p-limit`), `getDownloadStatus` lists what's stored, and `useDownloads` tracks progress. For audio, the recitation list is stored after its mp3s, so it marks a complete chapter.
- Only `offline.ts` writes the caches. The service worker reads them: navigations and RSC requests are `NetworkOnly`, `/api/content/` answers from the cache first, and `.mp3` files use `CacheFirst` with `RangeRequestsPlugin` and no automatic writes.
- Offline, every navigation falls back to the precached `/~offline` page (`src/app/~offline/`), which renders the chapter from `window.location`, the reader settings cookie and the packs, and warns when a pane's pack is missing.
- `OfflineStorage` (Settings → Offline Storage) manages downloads. After a reader saves display settings that use a pack they haven't downloaded (while having downloaded others), `NavBar` shows a notification that opens it.
- `NavBar` also offers the downloads once after the app is installed: on Chromium's `appinstalled` event, or on the first launch in `display-mode: standalone` (iOS fires no install event). It skips readers who already have their display settings' content or are offline, and stores `offline-install-prompt-shown` in localforage.

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
- **Mocking**: `server-only` and `next/headers` are globally mocked in `vitest-setup.ts`, along with `matchMedia`, `ResizeObserver`, `IntersectionObserver` (`react-intersection-observer/test-utils`) and `HTMLMediaElement.play/pause`. Mock server actions with `vi.mock("@/components/saveReaderSettings")`. jsdom has no Cache Storage; offline tests use `stubCaches`/`stubFetch` from `src/components/test/fakeCaches.ts`.
- **Coverage thresholds**: statements 80%, branches 60%, functions 70%, lines 80%.

#### Playwright Key Patterns

- **Custom fixtures**: Import `test` and `expect` from `e2e/helpers/fixtures.ts` (not `@playwright/test`). They pre-accept the cookie notice, mock recitation audio, and wait for hydration.
- **Fixture CDN**: E2E runs against `e2e/fixtures/cdn` served locally (`pnpm test:e2e:data`), configured by `.env.test`. Regenerate the fixtures with `pnpm test:e2e:fixtures`, then delete `.next/cache/fetch-cache`, which otherwise keeps serving the old data.
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
```

**Security**: Never commit `.env.local` or any file with real secrets.

## File Organization

```
src/
├── app/                          # App Router
│   ├── layout.tsx                # Root layout: metadata, providers, GTM
│   ├── Providers.tsx             # AntdRegistry, ConfigProvider, App
│   ├── BasicLayout.tsx           # NavBar + content + Footer + CookieNotice
│   ├── page.tsx                  # Chapter list (home)
│   ├── chapters/[id]/            # Chapter page (server) + Chapter (client)
│   ├── privacy/, terms/          # Legal pages
│   ├── api/                      # Route handlers proxying offline packs from the CDN
│   ├── ~offline/                 # Offline fallback page (renders downloaded packs)
│   ├── manifest.ts               # Web app manifest
│   ├── sw.ts                     # Serwist service worker
│   └── serwist/[path]/route.ts   # Serves the compiled service worker
├── components/
│   ├── AudioBar.tsx              # Recitation player
│   ├── OfflineStorage.tsx        # Offline downloads settings tab
│   ├── Verse.tsx                 # Verse row: panes, play, fave, notes
│   ├── Fave.tsx, Notes.tsx       # Favorites and notes (localforage)
│   ├── NoteEditor.tsx            # Labelled Quill editor (loaded client-only)
│   ├── PlayForm.tsx              # Recitation options form
│   ├── ReaderSettingsForm.tsx    # Display settings form
│   ├── save*Settings.ts          # Server actions writing settings cookies
│   ├── SafeHtml.tsx              # DOMPurify-sanitized HTML
│   └── test/                     # TestProviders, fakeCaches
├── utils/                        # config, fetcher, cookies, localforage, packs, content, offline
├── i18n/request.ts               # next-intl request config
├── locales/en/common.json        # UI strings
├── types/next-intl.d.ts          # next-intl type augmentation
├── api.d.ts                      # CDN response types (ambient)
├── typings.d.ts                  # App types (ReaderSettings, PlaySettings, …)
└── theme.ts                      # Ant Design theme config
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
