import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  envPrefix: "NEXT_PUBLIC_",
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  css: { postcss: { plugins: [] } },
  test: {
    environment: "jsdom",
    include: ["./src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest-setup.ts"],
    globals: true,
    clearMocks: true,
    passWithNoTests: true,
    env: {
      API_URI: "http://cdn.test",
      NEXT_PUBLIC_API_MEDIA_URI: "https://audio.test",
    },
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/types/**",
        "src/**/page.tsx",
        "src/**/layout.tsx",
        "src/**/not-found.tsx",
        "src/**/manifest.ts",
        "src/app/sw.ts",
        "src/app/serwist/**",
        "src/app/Providers.tsx",
        "src/i18n/**",
        "src/components/test/**",
        "src/**/*.d.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 60,
        functions: 70,
        lines: 80,
      },
    },
    testTimeout: process.env.TEST_TIMEOUT ? Number(process.env.TEST_TIMEOUT) : 10000,
  },
});
