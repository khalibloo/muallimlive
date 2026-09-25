# MuallimLive

Qur'an reading and recitation app built with Next.js 16, React 19, Ant Design 6, TailwindCSS 4, next-intl and Serwist. Read each chapter with configurable translations, tafsirs and Arabic scripts (optionally in a split view), listen to verse recitations, keep favorites and notes, and install it as a PWA.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

Copy `.env.sample` to `.env.local` and fill in the values.

| Variable                    | Description                     |
| --------------------------- | ------------------------------- |
| `API_URI`                   | Qur'an data CDN (server-only)   |
| `NEXT_PUBLIC_API_MEDIA_URI` | Recitation audio host           |
| `NEXT_PUBLIC_GTM_CODE`      | Optional: Google Tag Manager ID |
| `NEXT_PUBLIC_APP_ENV`       | Optional: environment label     |

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

The service worker is only registered in production builds (`pnpm build && pnpm start`).

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
