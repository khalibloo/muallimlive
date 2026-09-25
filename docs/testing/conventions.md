# Testing Conventions

## Vitest Conventions

### File Naming and Location

Test files are **co-located** with the source file they test:

```
src/utils/cookies.ts              -> src/utils/cookies.test.ts
src/components/Notes.tsx          -> src/components/Notes.test.tsx
src/app/chapters/[id]/Chapter.tsx -> src/app/chapters/[id]/Chapter.test.tsx
```

### Using TestProviders

Every component test must render inside `<TestProviders>`. Import it from `@/components/test/TestProviders`:

```tsx
import { render, screen } from "@testing-library/react";
import TestProviders from "@/components/test/TestProviders";

render(
  <TestProviders>
    <Fave faved={false} chapterNumber={1} verseNumber={1} />
  </TestProviders>,
);
```

`TestProviders` loads the real English catalogue by default, so assert the exact strings from `src/locales/en/common.json`. Pass `translations` only to test a missing or custom message.

### Querying Elements

**MUST use accessible queries. NEVER use `querySelector`, `getElementById`, CSS classes, or `data-testid`.**

Preferred query priority (from Testing Library best practices):

1. `screen.getByRole("button", { name: "Save Changes" })` -- roles and accessible names
2. `screen.getByLabelText("Audio Reciter")` -- form fields by label
3. `screen.getByText("Coming soon")` -- visible text content
4. `screen.findByText(...)` -- for async content (returns a Promise)

Scope queries to a region with `within()`, for example the verse `article` (named "Verse 1") or a drawer's `dialog`.

### Mocking Patterns

#### Server Actions

```tsx
vi.mock("@/components/saveReaderSettings", () => ({
  saveReaderSettings: vi.fn(),
}));
```

#### next/headers

Already mocked globally in `vitest-setup.ts`. For test-specific cookies:

```tsx
import { cookies } from "next/headers";
vi.mocked(cookies).mockResolvedValue({ get: vi.fn(), set: vi.fn() } as any);
```

#### localforage

jsdom runs `localforage` on its `localStorage` driver. Reset it in `beforeEach` and seed data directly:

```tsx
beforeEach(async () => {
  await lf.clear();
});

await lf.setItem("notes-quran-1-2", ["<p>First note</p>"]);
```

#### Heavy third-party components

Mock only what jsdom can't run. For example, `Notes.test.tsx` replaces Quill with a `<textarea>` that exposes itself as the editor root, so the real `NoteEditor` labelling still runs:

```tsx
vi.mock("react-quill-new", async () => {
  const { useImperativeHandle, useRef } = await import("react");
  return {
    default: function MockQuill({ value, onChange, ref }: any) {
      const rootRef = useRef<HTMLTextAreaElement>(null);
      useImperativeHandle(ref, () => ({ getEditor: () => ({ root: rootRef.current }) }));
      return <textarea ref={rootRef} value={value} onChange={(e) => onChange(e.target.value)} />;
    },
  };
});
```

### Form Testing

Use `userEvent` for interactions (not `fireEvent`):

```tsx
import userEvent from "@testing-library/user-event";

const user = userEvent.setup();
await user.click(screen.getByRole("switch", { name: "Use Split View" }));
await user.click(screen.getByRole("button", { name: "Save Changes" }));
```

Use `fireEvent` only where `userEvent` can't drive the component. For example, antd's Slider reads `keyCode` from key events.

### Pure Function Tests

For utility functions, no TestProviders needed -- just import and assert:

```ts
import { parseReaderSettings } from "./cookies";

it("falls back to the defaults for malformed JSON", () => {
  expect(parseReaderSettings("{not json")).toEqual(config.defaultReaderSettings);
});
```

---

## Playwright Conventions

### File Naming and Location

```
e2e/
  smoke/
    pages.test.ts          # Every page renders
    cookie-notice.test.ts  # Cookie notice
  flows/
    chapter.test.ts        # Reading, navigation, progress
    favourites.test.ts
    notes.test.ts
    settings.test.ts       # Display and play settings
    recitation.test.ts     # Audio player
    pwa.test.ts            # Manifest and service worker
  helpers/
    fixtures.ts            # Custom Playwright fixtures
    audio.ts               # Media host and silent WAV generator
    data.ts                # Reads the fixture CDN for expected text
  fixtures/cdn/            # Committed CDN subset
```

### Using Custom Fixtures

**Always import `test` and `expect` from `e2e/helpers/fixtures.ts`**, not from `@playwright/test` directly:

```ts
import { expect, test } from "../helpers/fixtures";
```

**Always use `testPage`** (not `page`) for navigating the app. It pre-accepts the cookie notice, mocks recitation audio and waits for hydration after `goto()`/`reload()`.

| Option               | Default | Use                                                          |
| -------------------- | ------- | ------------------------------------------------------------ |
| `acceptCookieNotice` | `true`  | `test.use({ acceptCookieNotice: false })` to test the notice |
| `audioClipSeconds`   | `30`    | Short clips (e.g. `1`) to test auto-advance and looping      |

### Expected Data

Never hard-code Qur'an text. Read it from the fixture CDN with `e2e/helpers/data.ts`:

```ts
import { chapterName, translationText } from "../helpers/data";

await expect(verse.getByText(translationText(114, 20, 1), { exact: true })).toBeVisible();
```

If a test needs a chapter or content ID that isn't in the fixtures, add it to `scripts/fetch-e2e-fixtures.mjs` and run `pnpm test:e2e:fixtures`.

### Assertions

#### Use heading role for page/section titles

```ts
await expect(testPage.getByRole("heading", { name: "Privacy Policy", exact: true })).toBeVisible();
```

#### Verify actions with success notifications

```ts
await dialog.getByRole("button", { name: "Save Changes", exact: true }).click();
await expect(testPage.getByRole("alert").filter({ hasText: "Changes Saved Successfully" })).toBeVisible();
```

#### Verify persisted state after reload

Settings (cookies), favorites and notes (IndexedDB) must survive a reload. Reload and assert again:

```ts
await addButton(testPage).click();
await testPage.reload();
await expect(testPage.getByRole("button", { name: "Remove from favorites", exact: true })).toHaveCount(1);
```

#### After destructive actions, verify absence

```ts
await expect(dialog.getByText("Delete me", { exact: true })).toBeHidden();
```

---

## Code Review Checklist for Tests

- [ ] Test file is co-located with the source file
- [ ] Component tests use `<TestProviders>`
- [ ] Queries use `getByRole`, `getByLabelText`, or `getByText` -- never `querySelector`, IDs, classes, or `data-testid`
- [ ] `userEvent` is used for interactions, not `fireEvent`
- [ ] E2E tests import `test`/`expect` from `e2e/helpers/fixtures.ts` and use `testPage`
- [ ] E2E expected text comes from `e2e/helpers/data.ts`, not hard-coded copies
- [ ] Tests assert behavior, not implementation details
- [ ] Persisted state is checked after a reload
- [ ] Async content uses `findBy` queries or `waitFor`

---

## E2E Selector Rules

### Use `getByRole` with `exact: true` as the default

```ts
await testPage.getByRole("button", { name: "Recite", exact: true }).click();
await testPage.getByRole("switch", { name: "Use Split View", exact: true }).click();
await dialog.getByRole("textbox", { name: "New note", exact: true }).fill("...");
```

### Scope to a verse instead of using `.first()`

Every verse is an `article` named "Verse N", so target a verse's controls through it:

```ts
const verse1 = testPage.getByRole("article", { name: "Verse 1", exact: true });
await verse1.getByRole("button", { name: "Play verse", exact: true }).click();
```

The verse list is virtualized (`react-virtuoso`), so only verses near the viewport are in the DOM.

### Notifications use `role="alert"` with filter

Next.js has a route announcer that also uses `role="alert"`. Always filter:

```ts
await expect(testPage.getByRole("alert").filter({ hasText: "Changes Saved Successfully" })).toBeVisible();
```

### Retry dropped clicks in popups with `toPass()`

Under parallel load, a click in an antd popup (dropdown menu, Popconfirm) can land while it is still animating or being realigned, and get dropped. Wrap the open and pick steps in `expect(...).toPass()` so the whole interaction retries:

```ts
await expect(async () => {
  await testPage.getByRole("button", { name: "Delete", exact: true }).click({ timeout: 2000 });
  await expect(confirmation).toBeHidden({ timeout: 1000 });
}).toPass();
```

### Use exact i18n strings, not regex guesses

Read `src/locales/en/common.json` for the exact translated string.

### Never use `{ force: true }` or `.locator()` with CSS selectors

If a click is blocked, dismiss the overlay first. If `getByRole`/`getByText` can't reach an element, treat it as an accessibility bug and fix the markup rather than working around it.

---

## E2E Test Independence

- Each test gets a fresh browser context, so storage never leaks between tests. Don't rely on another test's favorites, notes or settings.
- Extract repeated setup into helpers within the spec file (e.g. `openNotes`, `addNote`, `openSettings`).
- Never use `test.describe.configure({ mode: "serial" })` to chain dependent tests.
