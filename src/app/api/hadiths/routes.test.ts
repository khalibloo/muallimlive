import * as hadiths from "@/utils/hadiths";
import { GET as getHadithRoute } from "./[collection]/[book]/[id]/route";
import { GET as getPack } from "./[collection]/route";
import { GET as getSynonymsRoute } from "./synonyms/route";
import { GET as getResources } from "../resources/hadiths/route";

vi.mock("@/utils/hadiths", () => ({
  getCollections: vi.fn(),
  getCollectionPack: vi.fn(),
  getSynonyms: vi.fn(),
  findBook: vi.fn(),
  getHadith: vi.fn(),
  getHadithResources: vi.fn(),
}));

const request = new Request("http://localhost");
const CACHE_CONTROL = "public, max-age=86400, s-maxage=31536000";
const book = { id: 4, name: "Forgetfulness in Prayer", hadiths: ["4.1.1"], hadithsCount: 1 };

describe("hadith routes", () => {
  beforeEach(() => {
    vi.mocked(hadiths.getCollections).mockResolvedValue({
      collections: [{ id: "malik", name: "Muwatta Malik", booksCount: 1, hadithsCount: 1 }],
    });
  });

  it("serves a collection's pack", async () => {
    vi.mocked(hadiths.getCollectionPack).mockResolvedValue({ hadiths: [] });
    const response = await getPack(request, { params: Promise.resolve({ collection: "malik" }) });
    await expect(response.json()).resolves.toEqual({ hadiths: [] });
    expect(response.headers.get("Cache-Control")).toBe(CACHE_CONTROL);
  });

  it("is not found for an unknown collection", async () => {
    await expect(getPack(request, { params: Promise.resolve({ collection: "x" }) })).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
    expect(hadiths.getCollectionPack).not.toHaveBeenCalled();
  });

  it("serves the synonyms", async () => {
    vi.mocked(hadiths.getSynonyms).mockResolvedValue({ groups: [["salat", "prayer"]] });
    const response = await getSynonymsRoute();
    await expect(response.json()).resolves.toEqual({ groups: [["salat", "prayer"]] });
    expect(response.headers.get("Cache-Control")).toBe(CACHE_CONTROL);
  });

  it("serves one hadith with a dotted id", async () => {
    vi.mocked(hadiths.findBook).mockResolvedValue({ collection: {} as HadithCollection, books: [book], book });
    vi.mocked(hadiths.getHadith).mockResolvedValue({ id: "4.1.1" } as Hadith);
    const params = Promise.resolve({ collection: "malik", book: "4", id: "4.1.1" });
    const response = await getHadithRoute(request, { params });
    await expect(response.json()).resolves.toEqual({ id: "4.1.1" });
    expect(hadiths.getHadith).toHaveBeenCalledWith("malik", 4, "4.1.1");
  });

  it("is not found for a hadith the book doesn't list", async () => {
    vi.mocked(hadiths.findBook).mockResolvedValue({ collection: {} as HadithCollection, books: [book], book });
    const params = Promise.resolve({ collection: "malik", book: "4", id: "9" });
    await expect(getHadithRoute(request, { params })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("serves the collections with their books", async () => {
    vi.mocked(hadiths.getHadithResources).mockResolvedValue({ collections: [] });
    const response = await getResources();
    await expect(response.json()).resolves.toEqual({ collections: [] });
    expect(response.headers.get("Cache-Control")).toBe(CACHE_CONTROL);
  });
});
