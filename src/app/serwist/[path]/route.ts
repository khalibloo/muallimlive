import { createSerwistRoute } from "@serwist/turbopack";

import { resourceUrl } from "@/utils/packs";

// A new revision on every build, so each deploy re-fetches the offline page (its script URLs change)
const revision = crypto.randomUUID();

// Configurator mode: this Route Handler bundles src/app/sw.ts and serves it at /serwist/sw.js.
// This is the Turbopack-compatible path, since the webpack-based @serwist/next plugin cannot hook
// Next 16's default Turbopack build.
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
  // Service workers only run in browsers that support the SW API (all ES2020+). Without this, esbuild
  // inherits the app's browserslist target and fails to transform Serwist's syntax.
  esbuildOptions: { target: "es2020" },
  // The offline page and the resources it needs to render a chapter from the downloaded packs
  additionalPrecacheEntries: [
    "/~offline",
    resourceUrl("chapters"),
    resourceUrl("recitations"),
    resourceUrl("hadiths"),
  ].map((url) => ({
    url,
    revision,
  })),
});
