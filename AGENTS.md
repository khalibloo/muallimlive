# MuallimLive Codebase Guidelines for AI Coding Agents

## Project Overview

**MuallimLive** is a Qur'an reading and recitation app. Readers browse the 114 chapters, read each verse alongside configurable translations, tafsirs and Arabic scripts (optionally in a split view), choose a color and look for each tajweed rule, play verse recitations, search the verses of their texts, keep favorites and per-verse notes (listed together on the Favorites & Notes page), install the site as a PWA, and download content and recitations for offline use. They also browse hadith collections and books, read individual hadiths, search them, and favorite and note them alongside verses.

- **Stack**: Next.js 16 (App Router, Turbopack), TypeScript, React 19, Ant Design 6 (https://ant.design/llms.txt), TailwindCSS 4
- **Data Layer**: Static Qur'an JSON served from a CDN (`API_URI`), fetched in server components with `fetchData()` (`force-cache`). Hadith collections live under the same CDN's `data/hadiths/`, read by `src/utils/hadiths.ts` (see Section 9). The browser never sees the CDN: offline downloads go through the `/api/content`, `/api/hadiths` and `/api/resources` route handlers. Recitation audio comes straight from a third-party host (`NEXT_PUBLIC_API_MEDIA_URI`)
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
// src/app/quran/[id]/page.tsx
const chaptersData = await fetchData<GetChaptersResponse>("resources/chapters");
const chapter = chaptersData.chapters.find((c) => `${c.id}` === id);
if (!chapter) {
  notFound();
}
```

- Response types live in `src/api.d.ts` (ambient, no import needed).
- The chapter page fetches only the content types chosen in the reader settings and hands the result to the `Chapter` client component.
- The home page (`src/app/page.tsx`) is a dashboard of the app's modules: it fetches the chapter list and `getHadithResources()` and hands them to the `Dashboard` client component, a "Modules" grid of link cards (Qur'an → `/quran` with its chapter count, Hadith → `/hadiths` with its collection and hadith counts), the `ContinueReading` card and a Favorites & Notes link. A new module is one more card there and one more section in the `NavBar` menu.
- The Qur'an page (`src/app/quran/page.tsx`, `Quran`) holds a "Search the Qur'an" button (`openSearch("quran")`), `ContinueReading`, and the "Find a chapter" filter over the chapter grid. Chapters live at `/quran/<chapter>`; build their paths with `chapterPath(chapter, verse?)` (`src/utils/chapters.ts`), never by hand. The link cards share `LINK_CARD` (`src/components/linkCard.ts`).
- `ContinueReading` links to the `last-read` chapter (without a hash, since `Chapter` scrolls back to the saved progress) and renders nothing until one is stored.
- `Quran` and `Chapter`'s chapters drawer list every chapter as `t("chapter-name")` ("1. Al-Fatihah (The Opener)") and filter them with `searchChapters` (`src/utils/chapters.ts`), a `fuse.js` fuzzy search over the number, `name_simple` and `translated_name.name`.
- `ChapterHeader` is the banner above the verses: Arabic and English names, `t("chapter-details")` (revelation place and verse count), and the bismillah when `bismillah_pre` is set.
- `NavBar` holds the app name (linking home), the Search button and a Menu button (`MenuOutlined`) opening an antd `Dropdown` with three groups: "Go to" (Home, Qur'an, Hadith, Favorites & Notes, as links; the current section, matched from `usePathname`, is selected and `aria-current="page"`), "Theme" (Light/Sepia/Dark as `menuitemradio`s) and "Settings" (Display Settings, Tajweed, Offline Storage, Sync & Backup, each opening that tab of the Settings modal). "Settings → Offline Storage" below means that menu item.

### 2. Settings in cookies, user data in IndexedDB

- **Reader settings** (split view, left/right pane content, text size) and **player settings** (reciter, hide tafsirs) are JSON cookies, parsed with `parseReaderSettings`/`parsePlaySettings` in `src/utils/cookies.ts`, which fall back to `config.defaultReaderSettings`/`defaultPlaySettings` on missing or malformed values.
- They are written by the server actions in `src/components/saveReaderSettings.ts` and `savePlayerSettings.ts`, so the server-rendered chapter page reflects them on the next request.
- Settings cookies are written with `SETTINGS_COOKIE_OPTIONS` (1-year `maxAge`), and `src/proxy.ts` re-sets the ones a GET page request carries, so they only expire after a year without a visit. Add new settings cookies to `SETTINGS_COOKIE_KEYS`.
- The **text size** (`ReaderSettings.textSize`, a percentage, default 100) is set by the root layout as `--reader-scale` on `<html>`; the `text-verse*` Tailwind sizes scale with it, so verse text uses them instead of fixed sizes.
- The default right pane holds the color-coded Roman transliteration (translation 0, `config.defaultReaderSettings`), whose `words` are gloss groups. **Tajweed colors** (`ReaderSettings.tajweedColors`) and **word glosses** (`glosses`) are switches, on unless `false`. With the colors off, the root layout sets the `no-tajweed` class on `<html>`, and `src/styles/tajweed.css` then uncolors (and unbolds) every `<tajweed>` marking in every text. With glosses on, `Verse` renders a text with `words` through `GlossedText`, which shows each group's gloss in an antd `Tooltip` on hover or focus (`glossGroups` in `src/utils/glosses.ts` aligns the groups to the text, or returns nothing so the text renders plain). Glosses only appear in the reader; `/saved` and the search show the plain text.
- **Tajweed rule styles** (Settings → Tajweed, `TajweedSettings`): each of the 26 rules in `TAJWEED_GROUPS` (`src/utils/tajweed.ts`, one list for both markups' `<tajweed>` classes) has a palette color (or None, the text color) and a look (Normal, Faded, Hidden). `ReaderSettings.tajweedRules` stores only what differs from the defaults (`toTajweedRules`), parsed with `parseTajweedRules`. The root layout turns them into `<html>` style variables `--tajweed-<id>` and classes `tajweed-fade-<id>`/`tajweed-hide-<id>` (`tajweedStyles`), which `src/styles/tajweed.css` reads; `src/styles/tajweed.test.ts` keeps that file in sync with `TAJWEED_GROUPS`. The **Tajweed Colors** switch (`tajweedColors`) is on this tab, not the Display tab, and turns the colors off only; faded and hidden rules still apply. Hidden letters are `display: none`, so copied text leaves them out.
- The **color scheme** (`light`/`sepia`/`dark`, `COLOR_SCHEMES`, default `config.defaultColorScheme`) is the `color-scheme` cookie, parsed with `parseColorScheme` and written by `saveColorScheme` (the Theme group of the `NavBar` menu). The root layout reads it to set `<html class="light|sepia|dark">`, the viewport `themeColor`/`colorScheme` (sepia is `light` to the browser), and `Providers colorScheme` → `getTheme(scheme)`.
- **Favorites** and **notes** are stored client-side with `localforage` (`src/utils/localforage.ts`), and read and written only through `src/utils/userData.ts`, keyed by an item key: `verseKey(chapter, verse)` (`<chapter>:<verse>`) for a verse, `hadithKey(ref)` (`hadith:<collection>/<book>/<id>`) for a hadith (`isHadithKey`/`toHadithRef` tell the two apart and parse a hadith key back to its `HadithRef`). Favorites live under `faves-quran` for verses and, separately, `faves-hadith` for hadiths (`FAVES_KEY`/`HADITH_FAVES_KEY`), so a tab on an older release never rewrites the other kind; notes live under `notes-quran-<chapter>-<verse>` or `notes-hadith-<collection>/<book>/<id>` (`noteKey`). Both share the timestamped format (a deleted fave or note keeps a `deleted` marker), the one-time conversion of the old format, `mergeUserData` (newest `updatedAt` wins), and the change counter (`user-data-change`) that every write bumps. Components subscribe to the same keys with `lf.newObservable(...)` and must unsubscribe on unmount.
- **Favorites & Notes page** (`/saved`, linked from the `NavBar` menu and `Dashboard`): `Saved` lists the favorite verses and the verses with notes in two tabs, by chapter, each linking to `/quran/<chapter>#v-<verse>` with the existing `Fave` and `Notes` buttons. Favorites and notes live in the browser, so it loads their verse texts there, through the `/api/content` packs (the display settings' Arabic scripts and translations, not tafsirs), once per chapter. Each tab also lists the favorite hadiths or hadith notes, by collection and book, with the same `Fave`/`Notes`/`Share` actions; their texts are loaded once per collection, from a downloaded pack (`readHadiths`) or `/api/hadiths/<collection>/<book>/<id>` otherwise (see `Saved.tsx`), sorted by collection, book and hadith number. A text that can't be loaded says whether the reader is offline or the load failed. It observes every localforage key and reloads on the ones `isUserDataKey` matches, since notes are stored per verse or hadith.
- **Reading progress**: `Verse` stores the verse in view as `progress-surah-<chapter>` (where `Chapter` scrolls back to) and as `last-read` (`{ chapter, verse }`, for `ContinueReading` on the home and Qur'an pages). Opening a different chapter sets `last-read` to its verse 1 before any verse scrolls into view.
- **Verse links**: `Share` shares `/quran/<chapter>#v-<verse>` with the Web Share API, or copies it to the clipboard where that API is missing. On load, `Chapter` scrolls to a valid `#v-N` verse instead of the saved progress.

### 3. Audio playback

`AudioBar` owns a single `<audio>` element and the recitation state machine (play/pause, verse range, loop, auto-scroll, volume). `Chapter` wires `Verse` play buttons and `PlayForm` (verse range and reciter) to it. `AudioBar` shows the progress through the range and reports the verse being recited (`onVerseChange`), which `Chapter` highlights with `Verse highlighted` (`aria-current`). The verse list is virtualized with `react-virtuoso`; auto-scroll uses the virtuoso ref, never DOM lookups.

### 4. i18n with `next-intl`

- **No locale routing**: `src/i18n/request.ts` always returns locale `en` with `src/locales/en/common.json`.
- **Single namespace**: all strings live in the `common` namespace as a flat object with kebab-case keys. Keys are type-checked via `src/types/next-intl.d.ts`.
- **Server/Client**: `getTranslations("common")` in server components and `generateMetadata`; `useTranslations("common")` in client components. The layout wraps the app in `<NextIntlClientProvider>`.
- The locale JSON is kept key-sorted by lint-staged (`prettier-plugin-sort-json`).

### 5. PWA (Serwist)

- `src/app/sw.ts` is the service worker (precache manifest, the offline pack routes below, then `defaultCache`). Its precache plugin rebuilds the response it serves for the hadith search worker's `turbopack-worker-*.js` chunk (`isWorkerChunk`): Turbopack starts that worker with its bootstrap config (the dependent chunk list) in the URL fragment, but a precached response's recorded URL has none, so the fresh `Response` carries an empty URL list and the browser falls back to the fragment-carrying request URL instead of the fragment-less cached one.
- `@serwist/turbopack` builds it at request time through the `src/app/serwist/[path]/route.ts` route, so it is served at `/serwist/sw.js`.
- `ServiceWorkerEvents` registers it (production only) and `ServiceWorkerUpdater` prompts the user to reload when a new version is waiting.
- The web app manifest is generated by `src/app/manifest.ts`.

### 6. Offline packs

Every Arabic script, translation and tafsir is its own **text pack**, and each reciter's audio is an **audio pack** that can be downloaded per chapter or for all chapters. Changing a pane's content only needs the new pack.

- `src/utils/packs.ts` maps reader settings to packs (`getContentPack`) and builds the same-origin URLs: `/api/content/<type>/<id>/<chapter>`, `/api/resources/<chapters|recitations|hadiths>`, `/api/hadiths/<collection>`, `/api/hadiths/<collection>/<book>/<id>` and `/api/hadiths/synonyms`.
- `src/utils/content.ts` is the server side: it reads the CDN with `fetchData()` and returns one pack's verse texts (or a reciter's recitation list) for a chapter. The route handlers under `src/app/api/` serve it with `CACHE_HEADERS` (`s-maxage` so Netlify's CDN caches them).
- `src/utils/offline.ts` is the client side: `downloadText`/`downloadAudio` fill the `content-packs` and `audio-packs` caches (with `p-limit`), `getDownloadStatus` lists what's stored, `readText` reads a downloaded text pack back, and `useDownloads` tracks progress. For audio, the recitation list is stored after its mp3s, so it marks a complete chapter.
- Hadith collections download the same way, into the same `content-packs` cache: `downloadHadiths(collection)` fetches the shared synonyms (`SYNONYMS_URL`) once and the collection's pack (`hadithPackUrl(collection)`); `readHadiths` (in `hadithCache.ts`) and `removeHadiths` read a downloaded pack back or evict it, and `getDownloadStatus().hadiths` lists the downloaded collection ids (matched from the cache's URLs, like the text packs' pack keys).
- Only `offline.ts` writes the caches. The service worker reads them: navigations and RSC requests are `NetworkOnly`, `/api/content/` and `/api/hadiths/` answer from the cache first, and `.mp3` files use `CacheFirst` with `RangeRequestsPlugin` and no automatic writes.
- Offline, every navigation falls back to the precached `/~offline` page (`src/app/~offline/`), which renders the chapter, home (the dashboard), Qur'an (chapter list), Favorites & Notes, or hadith collection/book/hadith page from `window.location`, the reader settings cookie and the packs (fetched with `getJson`), and warns when a chapter pane's pack is missing. The hadith routes (`OfflineHadiths`, matched by a `HADITH_PATH` regex against `/hadiths(/<collection>(/<book>(/<id>)?)?)?`) resolve the collection and book from the precached `/api/resources/hadiths` response, then, past the collection, read the collection's downloaded pack directly with `readHadiths` rather than through `/api/hadiths/`, and show `hadith-collection-missing` (pointing to Offline Storage) when it isn't downloaded.
- The precached page keeps the theme and text size it was saved with, so the root layout's `SETTINGS_SCRIPT` (`src/utils/settingsScript.ts`) applies the cookies' `<html>` classes (color scheme, `no-tajweed` and the tajweed rule looks), `--reader-scale` and the `--tajweed-*` colors before the first paint, and `useColorScheme` (`Providers`, `NavBar`) switches the antd theme to the cookie's scheme after hydration.
- `OfflineStorage` (Settings → Offline Storage) manages downloads. After a reader saves display settings that use a pack they haven't downloaded (while having downloaded others), `NavBar` shows a notification that opens it.
- `NavBar` also offers the downloads once after the app is installed: on Chromium's `appinstalled` event, or on the first launch in `display-mode: standalone` (iOS fires no install event). It skips readers who already have their display settings' content or are offline, and stores `offline-install-prompt-shown` in localforage.

### 7. Google Drive sync

Favorites and notes can sync between a reader's devices through `muallimlive-data.json` in their Google Drive's hidden `appDataFolder` (scope `drive.appdata`). The data goes straight between the browser and Google; the server only holds the sign-in. The file is `{ app: "muallimlive", version: 3, faves, notes }` (`toUserDataFile`/`parseUserDataFile`, `src/utils/userData.ts`); the app reads versions 2 and 3 (an older release's file, without hadith faves or notes) and always writes 3, so a device still on an older release rejects the newer file with `invalid-file` and uploads nothing until it updates, rather than losing data.

- **Sign-in routes** (`src/app/api/sync/`, `google-auth-library` + `iron-session`, helpers in `src/utils/syncSession.ts`): `login` starts Google's OAuth with PKCE, `callback` verifies the ID token, fails when the reader withheld Drive access, and stores the refresh token, account id and email in the encrypted, httpOnly `sync-session` cookie (path `/api/sync`, re-saved on use so it lasts a year), `token` returns a fresh access token (401 when the sign-in is gone or revoked, 503 when Google is unreachable), and `disconnect` revokes the token and deletes the cookie.
- **`src/utils/sync.ts`** runs in the browser: it caches the access token, calls the Drive REST API directly, and `syncNow` downloads, merges (`mergeUserData`), writes and uploads, skipping the transfer when neither the Drive file's version nor the change counter moved. A Web Lock (plus an in-tab flag) allows one sync at a time. The `sync-state` localforage key holds the account, file id, last version and synced change; it's only saved while the same account is still syncing, so stopping mid-sync sticks. A 401, or a sign-in to an account other than the synced one, sets `needsReauth`. Merged data is written one value at a time, each merged with what's stored just before.
- **Connecting**: `startConnect` merges straight away unless this device and the account's Drive both have data and this device wasn't syncing that account; then the reader chooses to merge or use Drive only (which exports a backup first).
- **`SyncProvider`** (in `Providers`) syncs on load, 3 s after a local change, on becoming visible or online, and every 5 minutes while visible. It handles `?sync=connected|failed` after sign-in (then removes the param) and shows `SyncDialogs`: the merge choice and an undismissable "sign in again" dialog (sign in, stop syncing, or clear data and stop).
- **`SyncSettings`** (Settings → Sync & Backup): connect, sync now, stop syncing, JSON export/import (import merges), clear this device, and delete from all devices (which syncs first, so it also deletes what other devices synced since).
- The service worker sends `www.googleapis.com` requests `NetworkOnly`.

### 8. Verse search

`SearchModal` (the Search button in `NavBar`) searches the display settings' texts in the browser with `minisearch` (`src/utils/search.ts`). Chapter names keep their `fuse.js` search.

- `SearchModal` opens on a `Segmented` "Qur'an"/"Hadith" switch (`SearchMode`, `"quran" | "hadith"`): the `quran` mode is the verse search below, the `hadith` mode renders `HadithSearch` (Section 9). `ChapterSearchContext`'s `openSearch(mode)` sets which mode the switch starts on and opens the modal; the nav bar's Search button opens `hadith` on `/hadiths` paths and `quran` elsewhere, while the hadith pages' "Search the hadiths"/"Search this book" buttons always open `hadith`. Switching the `Segmented` after opening just changes local state, no re-fetch.
- `search.ts` builds one word index per text, normalizing texts and queries alike (`normalizeTerm`: no accents, Arabic diacritics or Qur'anic marks, one alef and one yaa) after `toPlainText` strips the CDN HTML. Every query word must match, as a prefix, with small typos allowed in longer words. `highlight` marks the matched words and shortens long texts around the first match.
- **Current chapter**: `Chapter` registers its texts, one per pack, and `goToVerse` through `ChapterSearchContext` (the provider is in `BasicLayout`). "Only <chapter>" is on by default there; it searches what the page already holds, tafsirs included, and a result scrolls the verse list instead of navigating.
- **Whole Qur'an**: searches the Arabic scripts and translations whose text packs are downloaded for every chapter, indexed once per session from Cache Storage (`loadPackIndex`). Tafsirs are left out, as their packs are too large to index. Missing packs can be downloaded from the modal, and browsers without Cache Storage can only search a chapter.
- Each text can be ticked off. The results are virtualized with `react-virtuoso` inside the modal's scroll area (`customScrollParent`), so every result is counted but only the ones in view are rendered; `Highlighted` renders `highlight`'s output for both searches.
- Merging trusts each device's clock, so a device whose clock is wrong can let an older edit win.

### 9. Hadiths

Readers browse collections (e.g. Bukhari, Muslim, Abu Dawud, Malik) → books → hadiths, search them, and favorite/note them like verses.

- **Pages**: `/hadiths` (`Hadiths`, collection cards with a book/hadith count and a "Search the hadiths" button), `/hadiths/[collection]` (`Collection`, its books, grouped by volume when any book has one, e.g. Bukhari), `/hadiths/[collection]/[book]` (`Book`, a `filterHadiths`-filterable list of the book's hadith excerpts from its `index.json`, plus a "Search this book" button), `/hadiths/[collection]/[book]/[id]` (`HadithView`, the full text, narrator chain, Fave/Notes/Share, and previous/next links that cross book boundaries via `getNeighbors`).
- **`src/utils/hadiths.ts`** (server-only) reads the CDN: `getCollections`, `getBooks`, `getBookIndex`, `getHadith`, `getSynonyms`, and `getCollectionPack` (`cache: "no-store"`, see the pack route below). `getHadithResources()` returns every collection's books without their hadith id lists, for the root layout, the search filters and the offline pages. `findBook(collectionId, bookId)` checks the collection and book lists before fetching a hadith, since the CDN fails on an unknown path instead of returning 404.
- **`src/utils/hadithPack.ts`** has the pure helpers shared by the hadith pages, the offline page and the search: `HadithRef`/`HadithPosition`, `hadithPath`, `toBookIndex` (a book's `index.json` shape, from a downloaded collection pack), `packBooks`/`getNeighbors` (previous/next hadiths across books), `fromPack` (a hadith page's data from a pack), `formatHadithText`, and `filterHadiths` (a `fuse.js` search over a book's hadith ids and first narrators, like `searchChapters`).
- **Routes**: `/api/hadiths/[collection]` and `/api/hadiths/[collection]/[book]/[id]` proxy the CDN with `CACHE_HEADERS`; `/api/hadiths/synonyms` serves the shared synonym groups; `/api/resources/hadiths` serves `getHadithResources()` for the offline pages and the service worker's precache. The collection pack route fetches with `cache: "no-store"`: Next's data cache refuses responses over 2 MB and Bukhari's pack is 4.6 MB, so the pack relies on the CDN's own cache (`CACHE_HEADERS`'s `s-maxage`) instead of Next's.
- **The worker search**: `HadithSearch` (the Hadith mode of `SearchModal`) runs the search in a Web Worker (`src/utils/hadithSearch.worker.ts`, started by `src/utils/hadithSearchClient.ts`'s `searchHadiths`/`listNarrators`), so building an index never blocks the page and running out of memory only stops the worker (`HadithSearchStopped`, shown as "hadith-search-stopped"; a fresh worker starts on the next request). `src/utils/hadithSearch.ts` builds one MiniSearch index per downloaded collection, over each hadith's text, narrators and book title: `tokenize` splits on Unicode punctuation/space after stripping apostrophes (they stand for Arabic letters in transliteration, e.g. "Mas'ud"), and `processHadithTerm` indexes each word both as normalized (`normalizeTerm`) and stemmed (`stemmer`), dropping English stop words. A query word also matches its synonym group's other words (`HadithSynonyms`, from `/api/hadiths/synonyms`), weighted down with `boostTerm` (0.5) unless that term is also typed as-is. A search runs the query's words `AND`-ed together first for `matches`; when the query has more than one word, it also runs them `OR`-ed together for `partial` (hits missing some words), excluding anything already in `matches`. Both lists are sorted by score and capped at the request's `limit`; `HadithSearch` virtualizes them like the verse search and raises the limit by 50 when the list's end is reached.
- **Downloads are never automatic**: the search only covers the selected collections that are downloaded, and lists the missing ones with a download button each (disabled offline). The worker reads the packs through `src/utils/hadithCache.ts` (`readHadiths`/`readSynonyms`), which only reads the cache, so the worker bundle doesn't pull in `offline.ts`.
- Downloaded collection packs and the shared synonyms live in `TEXT_CACHE` (`content-packs`, the same cache as text packs) — see Section 6.
- Favorites and notes use hadith-only localforage keys, `faves-hadith` and `notes-hadith-<collection>/<book>/<id>`, and the Drive/backup file is version 3 for them — see Section 2 and Section 7.

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
- **Hadith fixtures**: unit tests read the hadith fixture subset (`e2e/fixtures/cdn/data/hadiths`) only through `src/components/test/hadithFixtures.ts` (`fixture`/`fixtureText`/`hadithResources`/`fixtureCollection`), never by hand-rolling hadith data.

#### Playwright Key Patterns

- **Custom fixtures**: Import `test` and `expect` from `e2e/helpers/fixtures.ts` (not `@playwright/test`). They pre-accept the cookie notice, mock recitation audio, and wait for hydration. `preparePage` applies the same setup to a page in another context (a second device).
- **Google fakes**: `e2e/helpers/drive.ts` routes the sign-in, token and Drive requests per context to one in-memory `FakeGoogle`, which several contexts can share.
- **Fixture CDN**: E2E runs against `e2e/fixtures/cdn` served locally (`pnpm test:e2e:data -p 4010`, matching `.env.test`'s `API_URI` port; the script itself has no port). Regenerate the fixtures with `pnpm test:e2e:fixtures`, then delete `.next/cache/fetch-cache`, which otherwise keeps serving the old data.
- **Hadith fixture subset**: `e2e/fixtures/cdn/data/hadiths` holds a few small books per collection: Bukhari 1, 2 and 13 (13's hadith ids repeat book 1's), Muslim 43 (has a hadith without narrators), Abu Dawud 7, and Malik 4 (dotted hadith ids). `scripts/fetch-e2e-fixtures.mjs` downloads them from the CDN with the rest, or copies them from a local checkout of the data repo when given its folder (`pnpm test:e2e:fixtures <path-to-muallimlive-data>/data/hadiths`), e.g. to try data that isn't deployed yet.
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

**Deploy order**: the root layout calls `getHadithResources()` on every page, so `API_URI`'s CDN must have `data/hadiths/` before this deploys — otherwise `pnpm build` fails prerendering `/_not-found`, and a running deploy 500s on every page.

## File Organization

```
src/
├── app/                          # App Router
│   ├── layout.tsx                # Root layout: metadata, providers, GTM
│   ├── Providers.tsx             # AntdRegistry, ConfigProvider, App, SyncProvider
│   ├── BasicLayout.tsx           # NavBar + content + Footer + CookieNotice
│   ├── NavBar.tsx                # App name, Search, and the Menu (Go to, Theme, Settings)
│   ├── page.tsx, Dashboard.tsx   # Home: module cards, continue reading, saved link
│   ├── quran/                    # Qur'an page (server) + Quran (client): continue reading + chapter grid
│   ├── quran/[id]/               # Chapter page (server) + Chapter, ChapterHeader (client)
│   ├── hadiths/                  # Hadiths, Collection, Book, HadithView pages (server + client)
│   ├── saved/                    # Favorites & Notes page (server) + Saved (client)
│   ├── privacy/, terms/          # Legal pages
│   ├── api/                      # Route handlers proxying offline packs from the CDN
│   ├── api/hadiths/              # Hadith pack, hadith and synonyms route handlers
│   ├── api/sync/                 # Google sign-in for Drive sync: login, callback, token, disconnect
│   ├── ~offline/                 # Offline fallback page (renders downloaded packs)
│   ├── manifest.ts               # Web app manifest
│   ├── sw.ts                     # Serwist service worker
│   └── serwist/[path]/route.ts   # Serves the compiled service worker
├── components/
│   ├── AudioBar.tsx              # Recitation player
│   ├── ContinueReading.tsx       # "Continue reading" card from the last-read verse
│   ├── linkCard.ts               # LINK_CARD classes shared by the link cards
│   ├── OfflineStorage.tsx        # Offline downloads settings tab
│   ├── Verse.tsx                 # Verse row: panes, play, fave, notes, share
│   ├── GlossedText.tsx           # A transliteration with each word group's gloss in a tooltip
│   ├── Fave.tsx, Notes.tsx       # Favorites and notes (localforage)
│   ├── Share.tsx                 # Shares or copies a verse link
│   ├── NoteEditor.tsx            # Labelled Quill editor (loaded client-only)
│   ├── PlayForm.tsx              # Recitation options form
│   ├── ReaderSettingsForm.tsx    # Display settings form
│   ├── TajweedSettings.tsx       # Tajweed tab: each rule's color and look, the colors switch
│   ├── save*Settings.ts, saveColorScheme.ts # Server actions writing settings cookies
│   ├── SafeHtml.tsx              # DOMPurify-sanitized HTML
│   ├── SearchModal.tsx           # Verse/hadith search: the "Qur'an"/"Hadith" switch and the verse search
│   ├── HadithSearch.tsx          # Hadith search: collection/book/narrator filters, downloads, worker-backed results
│   ├── Highlighted.tsx           # Renders a search result's highlighted words
│   ├── ChapterSearchContext.tsx  # The open chapter's texts and the search modal's mode, for the search
│   ├── useHadithReference.ts     # "Volume 2, Book 13, Hadith 1" / "Book 7, Hadith 1406"
│   ├── SyncProvider.tsx          # Runs Drive sync in the background, handles ?sync= after sign-in
│   ├── SyncDialogs.tsx           # Merge choice and the required "sign in again" dialog
│   ├── SyncSettings.tsx          # Sync & Backup settings tab
│   └── test/                     # TestProviders, fakeCaches, fakeDrive, fakeCookies, hadithFixtures
├── utils/                        # config, fetcher, cookies, localforage, chapters, packs, content, offline,
│                                 # userData (faves/notes format and merge), sync, syncSession (server),
│                                 # search (verse indexes and highlighting), hadiths (server), hadithPack,
│                                 # hadithSearch, hadithSearch.worker, hadithSearchClient, hadithCache,
│                                 # glosses (aligns gloss groups to a transliteration), tajweed (rule table,
│                                 # palette, rule styles), settingsScript (the pre-paint settings script)
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
- **Theme-aware colors only** — no hardcoded greys or `white/…` tints. Use the semantic colors `bg-page`, `bg-surface`, `bg-surface-elevated`, `border-line`/`divide-line`, `text-primary`, `text-secondary` (CSS variables in `src/styles/global.css` for `:root`, `.sepia` and `.dark`, mirroring `palette` in `src/theme.ts`), or a `dark:` variant. Tailwind's `sepia` filter utility is disabled (`@source not inline`) because `sepia` is a scheme class. Tajweed rule colors are the `--palette-<color>` variables (per scheme, in `global.css`).
- **Verse text sizes** — use `text-verse`, `text-verse-lg`, `text-verse-arabic`, `text-verse-arabic-lg` so the reader's text size applies.
- **No text below 16px** — no `text-sm`/`text-xs` or smaller sizes; the antd theme keeps `fontSize` and `fontSizeSM` at 16.

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
