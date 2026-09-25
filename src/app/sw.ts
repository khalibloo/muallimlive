import { defaultCache } from "@serwist/turbopack/worker";
import { CacheFirst, NetworkOnly, RangeRequestsPlugin, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig, SerwistPlugin } from "serwist";

import { AUDIO_CACHE } from "@/utils/packs";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Offline packs are written only by the Storage settings tab (src/utils/offline.ts), never by the worker
const noAutoWrites: SerwistPlugin = { cacheWillUpdate: async () => null };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Pages are rendered from the reader settings, so they're never cached: offline, every page is the
    // precached offline page, which renders the chapter from the downloaded packs instead
    { matcher: ({ request }) => request.mode === "navigate", handler: new NetworkOnly() },
    // A failed RSC request makes Next fall back to a full navigation, which gets the offline page
    {
      matcher: ({ request, sameOrigin }) => sameOrigin && request.headers.get("RSC") === "1",
      handler: new NetworkOnly(),
    },
    // Text packs, and the recitation lists stored with the audio packs
    {
      matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/api/content/"),
      handler: async ({ request }) => (await caches.match(request)) ?? fetch(request),
    },
    // Audio packs. The recitation host is cross-origin, and RegExp matchers only match cross-origin URLs
    // from their start, hence the function. Range support lets <audio> seek in a cached file.
    {
      matcher: ({ url }) => url.pathname.endsWith(".mp3"),
      handler: new CacheFirst({
        cacheName: AUDIO_CACHE,
        matchOptions: { ignoreVary: true },
        plugins: [noAutoWrites, new RangeRequestsPlugin()],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: "/~offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();
