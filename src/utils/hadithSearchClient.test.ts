const malik = { id: "malik", books: [] };
const bukhari = { id: "bukhari", books: [] };

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage?: (event: MessageEvent) => void;
  onerror?: (event: ErrorEvent) => void;
  posted: { id: number; message: unknown }[] = [];
  terminated = false;
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage(data: { id: number; message: unknown }) {
    this.posted.push(data);
  }
  terminate() {
    this.terminated = true;
  }
  reply(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

describe("hadithSearchClient", () => {
  beforeEach(() => {
    vi.resetModules();
    FakeWorker.instances = [];
    vi.stubGlobal("Worker", FakeWorker);
  });

  it("sends requests to one worker and resolves their replies", async () => {
    const { listNarrators, searchHadiths } = await import("./hadithSearchClient");
    const narrators = listNarrators([malik]);
    const results = searchHadiths({ collections: [malik], query: "x", limit: 50 });
    const [worker] = FakeWorker.instances;
    expect(FakeWorker.instances).toHaveLength(1);
    worker.reply({ id: worker.posted[1].id, result: { matches: [] } });
    worker.reply({ id: worker.posted[0].id, result: ["Malik"] });
    await expect(narrators).resolves.toEqual(["Malik"]);
    await expect(results).resolves.toEqual({ matches: [] });
  });

  it("rejects a request the worker fails", async () => {
    const { listNarrators } = await import("./hadithSearchClient");
    const narrators = listNarrators([malik]);
    const [worker] = FakeWorker.instances;
    worker.reply({ id: worker.posted[0].id, error: "malik isn't downloaded" });
    await expect(narrators).rejects.toThrow("malik isn't downloaded");
  });

  it("stops every request when the worker crashes, and starts a new one", async () => {
    const { HadithSearchStopped, listNarrators } = await import("./hadithSearchClient");
    const narrators = listNarrators([bukhari]);
    const [worker] = FakeWorker.instances;
    worker.onerror?.(new ErrorEvent("error"));
    await expect(narrators).rejects.toBeInstanceOf(HadithSearchStopped);
    await expect(narrators).rejects.toThrow("The worker stopped or didn't start");
    expect(worker.terminated).toBe(true);
    listNarrators([malik]);
    expect(FakeWorker.instances).toHaveLength(2);
  });

  it("keeps the message of an uncaught error in the worker", async () => {
    const { listNarrators } = await import("./hadithSearchClient");
    const narrators = listNarrators([malik]);
    FakeWorker.instances[0].onerror?.(new ErrorEvent("error", { message: "Out of memory" }));
    await expect(narrators).rejects.toThrow("Out of memory");
  });
});
