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

// Turbopack starts a worker chunk with its bootstrap config (the dependent chunk list) in the URL fragment.
// Any service worker interception of that request — even a plain network passthrough — makes the browser
// drop the fragment before the worker reads it, so the hadith search worker never starts. This chunk is
// left unmatched by any route here, including defaultCache's static-JS one, so the browser fetches it
// (and caches it normally over HTTP) without the service worker touching the request at all.
const isWorkerChunk = (url: URL) => /\/turbopack-worker-[^/]+\.js$/.test(url.pathname);
const defaultCacheWithoutWorkerChunk = defaultCache.map((entry) =>
  entry.matcher instanceof RegExp && entry.matcher.source === "\\/_next\\/static.+\\.js$"
    ? { ...entry, matcher: ({ url }: { url: URL }) => !isWorkerChunk(url) && (entry.matcher as RegExp).test(url.href) }
    : entry,
);

// Precaching would serve the same broken cached response for it (see isWorkerChunk above), so it's
// excluded here too; the browser's own HTTP cache still keeps it available once visited.
const precacheEntries = (self.__SW_MANIFEST ?? []).filter((entry) => {
  const url = typeof entry === "string" ? entry : entry.url;
  return !isWorkerChunk(new URL(url, self.location.origin));
});

const serwist = new Serwist({
  precacheEntries,
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
    ...defaultCacheWithoutWorkerChunk,
  ],
  fallbacks: {
    entries: [{ url: "/~offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();
