import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
// @serwist/turbopack (configurator mode): the SW is bundled by a Route Handler
// (src/app/serwist/[path]/route.ts) and served at /serwist/sw.js, so it works with Next 16's default
// Turbopack build. withSerwist only augments headers/rewrites for that route.
import { withSerwist } from "@serwist/turbopack";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // AGENTS.md is maintained by hand, so stop `next dev` from rewriting it
  agentRules: false,
};

export default withSerwist(withNextIntl(nextConfig));
