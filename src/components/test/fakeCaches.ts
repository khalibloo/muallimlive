// jsdom has no Cache Storage. This in-memory stand-in covers the parts the offline downloads use,
// keyed by absolute URL like the real one.

const toUrl = (request: RequestInfo | URL) =>
  new URL(request instanceof Request ? request.url : `${request}`, window.location.origin).href;

class FakeCache {
  entries = new Map<string, Response>();

  async match(request: RequestInfo | URL) {
    return this.entries.get(toUrl(request))?.clone();
  }

  async add(request: RequestInfo | URL) {
    const response = await fetch(toUrl(request));
    if (!response.ok) {
      throw new TypeError(`Request failed: ${response.status}`);
    }
    this.entries.set(toUrl(request), response);
  }

  async put(request: RequestInfo | URL, response: Response) {
    this.entries.set(toUrl(request), response);
  }

  async delete(request: RequestInfo | URL) {
    return this.entries.delete(toUrl(request));
  }

  async keys() {
    return [...this.entries.keys()].map((url) => new Request(url));
  }
}

/** Installs an empty fake `caches` global and returns its caches by name */
export const stubCaches = () => {
  const stores = new Map<string, FakeCache>();
  const open = async (name: string) => {
    if (!stores.has(name)) {
      stores.set(name, new FakeCache());
    }
    return stores.get(name)!;
  };
  const match = async (request: RequestInfo | URL) => {
    for (const cache of stores.values()) {
      const response = await cache.match(request);
      if (response) {
        return response;
      }
    }
    return undefined;
  };
  vi.stubGlobal("caches", { open, match });
  return stores;
};

/** Stubs `fetch` to answer JSON by pathname; other paths get a 404 */
export const stubFetch = (responses: Record<string, unknown>) => {
  const fetchMock = vi.fn(async (request: RequestInfo | URL) => {
    const { pathname } = new URL(toUrl(request));
    return pathname in responses ? Response.json(responses[pathname]) : new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};
