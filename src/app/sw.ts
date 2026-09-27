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

// Turbopack starts the hadith search worker with its bootstrap config (the dependent chunk list) in the
// URL fragment. A precached response's URL list was recorded at install time, without the fragment, and
// the worker's self.location is taken from that URL — losing the fragment. Rebuilding the response gives
// it an empty URL list instead, which makes the browser fall back to the (fragment-carrying) request URL.
const isWorkerChunk = (url: URL) => /\/turbopack-worker-[^/]+\.js$/.test(url.pathname);

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    plugins: [
      {
        cachedResponseWillBeUsed: async ({ request, cachedResponse }) =>
          cachedResponse && isWorkerChunk(new URL(request.url))
            ? new Response(cachedResponse.body, {
                headers: cachedResponse.headers,
                status: cachedResponse.status,
                statusText: cachedResponse.statusText,
              })
            : cachedResponse,
      },
    ],
  },
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
    // Hadith collection packs and the shared synonyms
    {
      matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/api/hadiths/"),
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
    // Drive sync always needs the live file, and responses carry the reader's data
    { matcher: ({ url }) => url.hostname === "www.googleapis.com", handler: new NetworkOnly() },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: "/~offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();
