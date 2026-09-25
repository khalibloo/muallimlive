import { fetchData } from "./fetcher";

describe("fetchData", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the JSON file from the API with force-cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ chapters: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchData("resources/chapters")).resolves.toEqual({ chapters: [] });
    expect(fetchMock).toHaveBeenCalledWith("http://cdn.test/data/resources/chapters.json", { cache: "force-cache" });
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await expect(fetchData("resources/missing")).rejects.toThrow("Failed to fetch data");
  });
});
