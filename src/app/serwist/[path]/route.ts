import { createSerwistRoute } from "@serwist/turbopack";

// Configurator mode: this Route Handler bundles src/app/sw.ts and serves it at /serwist/sw.js.
// This is the Turbopack-compatible path, since the webpack-based @serwist/next plugin cannot hook
// Next 16's default Turbopack build.
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
  // Service workers only run in browsers that support the SW API (all ES2020+). Without this, esbuild
  // inherits the app's browserslist target and fails to transform Serwist's syntax.
  esbuildOptions: { target: "es2020" },
});
