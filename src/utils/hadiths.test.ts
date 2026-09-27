import { fetchData } from "./fetcher";
import { findBook, getCollectionPack, getHadith, getHadithResources } from "./hadiths";

vi.mock("./fetcher", () => ({ fetchData: vi.fn() }));

const collections = { collections: [{ id: "bukhari", name: "Sahih al-Bukhari", booksCount: 1, hadithsCount: 2 }] };
const books = { books: [{ id: 13, name: "Friday Prayer", volume: 2, hadiths: ["1", "2"], hadithsCount: 2 }] };

const mockCdn = () =>
  vi.mocked(fetchData).mockImplementation(async (path) => (path === "hadiths/collections" ? collections : books));

describe("hadiths", () => {
  it("reads the pack without Next's data cache, which refuses responses over 2 MB", async () => {
    vi.mocked(fetchData).mockResolvedValue({ hadiths: [] });
    await getCollectionPack("bukhari");
    expect(fetchData).toHaveBeenCalledWith("hadiths/bukhari/all", { cache: "no-store" });
  });

  it("reads one hadith by collection, book and id", async () => {
    vi.mocked(fetchData).mockResolvedValue({ id: "4.1.1" });
    await getHadith("malik", 4, "4.1.1");
    expect(fetchData).toHaveBeenCalledWith("hadiths/malik/4/4.1.1");
  });

  it("lists the collections with their books, without the hadith ids", async () => {
    mockCdn();
    await expect(getHadithResources()).resolves.toEqual({
      collections: [
        { ...collections.collections[0], books: [{ id: 13, name: "Friday Prayer", volume: 2, hadithsCount: 2 }] },
      ],
    });
  });

  it("finds a book of a known collection", async () => {
    mockCdn();
    await expect(findBook("bukhari", "13")).resolves.toMatchObject({ book: { id: 13 } });
  });

  it.each([
    ["an unknown collection", "tirmidhi", "13"],
    ["an unknown book", "bukhari", "14"],
    ["a book id that isn't a number", "bukhari", "13x"],
  ])("finds nothing for %s", async (_, collection, book) => {
    mockCdn();
    await expect(findBook(collection, book)).resolves.toBeUndefined();
  });
});
