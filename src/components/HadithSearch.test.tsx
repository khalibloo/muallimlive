import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VirtuosoMockContext } from "react-virtuoso";

import { stubCaches } from "@/components/test/fakeCaches";
import { fixtureCollection } from "@/components/test/hadithFixtures";
import TestProviders from "@/components/test/TestProviders";
import { downloadHadiths, getDownloadStatus } from "@/utils/offline";
import { HadithSearchStopped, listNarrators, searchHadiths } from "@/utils/hadithSearchClient";
import HadithSearch from "./HadithSearch";

vi.mock("@/utils/hadithSearchClient", () => ({
  HadithSearchStopped: class extends Error {},
  searchHadiths: vi.fn(),
  listNarrators: vi.fn(),
}));
vi.mock("@/utils/offline", async (importOriginal) => ({
  ...(await importOriginal()),
  getDownloadStatus: vi.fn(),
  downloadHadiths: vi.fn(),
}));

const hadiths = { collections: [fixtureCollection("bukhari"), fixtureCollection("malik")] };
const hit = {
  collection: "bukhari",
  book: 13,
  id: "1",
  volume: 2,
  narrators: ["Abu Huraira"],
  text: "We are the last to come",
  terms: ["last"],
  score: 1,
};

const renderSearch = (path = "/") => {
  window.history.pushState({}, "", path);
  const onClose = vi.fn();
  render(
    <TestProviders>
      <VirtuosoMockContext.Provider value={{ viewportHeight: 1000, itemHeight: 100 }}>
        <HadithSearch hadiths={hadiths} onClose={onClose} />
      </VirtuosoMockContext.Provider>
    </TestProviders>,
  );
  return { user: userEvent.setup(), onClose };
};

beforeEach(() => {
  stubCaches();
  vi.mocked(getDownloadStatus).mockResolvedValue({ text: {}, audio: {}, hadiths: ["bukhari", "malik"] });
  vi.mocked(listNarrators).mockResolvedValue(["Abu Huraira", "Malik"]);
  vi.mocked(searchHadiths).mockResolvedValue({ matches: [hit], partial: [], matchCount: 1, partialCount: 0 });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const searchedIds = () => vi.mocked(searchHadiths).mock.lastCall?.[0].collections.map((c) => c.id);

it("searches every downloaded collection and links to the hadith", async () => {
  const { user, onClose } = renderSearch();
  await user.type(screen.getByRole("searchbox", { name: "Search words" }), "last");
  const result = await screen.findByRole("article", { name: "Sahih al-Bukhari, Volume 2, Book 13, Hadith 1" });
  expect(within(result).getByText("last", { selector: "mark" })).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent("1 hadith matches every word");
  await user.click(within(result).getByRole("link"));
  expect(onClose).toHaveBeenCalled();
  expect(searchHadiths).toHaveBeenLastCalledWith(expect.objectContaining({ query: "last" }));
  expect(searchedIds()).toEqual(["bukhari", "malik"]);
});

it("passes the book titles to the search, and marks the matching words in them", async () => {
  vi.mocked(searchHadiths).mockResolvedValue({
    matches: [{ ...hit, terms: ["friday"] }],
    partial: [],
    matchCount: 1,
    partialCount: 0,
  });
  const { user } = renderSearch();
  await user.type(screen.getByRole("searchbox", { name: "Search words" }), "friday");
  const result = await screen.findByRole("article", { name: "Sahih al-Bukhari, Volume 2, Book 13, Hadith 1" });
  expect(within(result).getByText("Friday", { selector: "mark" })).toBeVisible();
  const [bukhari] = vi.mocked(searchHadiths).mock.lastCall![0].collections;
  expect(bukhari.books).toContainEqual(expect.objectContaining({ id: 13, name: "Friday Prayer" }));
});

it("starts with the collection and book of the page", async () => {
  const { user } = renderSearch("/hadiths/bukhari/13/1");
  expect(screen.getByRole("combobox", { name: "Collection" })).toBeVisible();
  await user.type(screen.getByRole("searchbox", { name: "Search words" }), "last");
  await waitFor(() => expect(searchHadiths).toHaveBeenLastCalledWith(expect.objectContaining({ book: 13 })));
  expect(searchedIds()).toEqual(["bukhari"]);
});

it("narrows by narrator", async () => {
  const { user } = renderSearch();
  await user.type(screen.getByRole("searchbox", { name: "Search words" }), "prayer");
  await user.click(screen.getByRole("combobox", { name: "Narrator" }));
  await user.click(await screen.findByTitle("Abu Huraira"));
  await waitFor(() =>
    expect(searchHadiths).toHaveBeenLastCalledWith(expect.objectContaining({ narrator: "Abu Huraira" })),
  );
});

it("clears the narrator when the collection changes", async () => {
  const { user } = renderSearch();
  await user.type(screen.getByRole("searchbox", { name: "Search words" }), "prayer");
  await user.click(screen.getByRole("combobox", { name: "Narrator" }));
  await user.click(await screen.findByTitle("Abu Huraira"));
  await user.click(screen.getByRole("combobox", { name: "Collection" }));
  await user.click(await screen.findByTitle("Muwatta Malik"));
  await waitFor(() => expect(searchedIds()).toEqual(["malik"]));
  expect(searchHadiths).toHaveBeenLastCalledWith(expect.objectContaining({ narrator: undefined }));
});

it("lists partial matches under their own heading", async () => {
  vi.mocked(searchHadiths).mockResolvedValue({ matches: [], partial: [hit], matchCount: 0, partialCount: 1 });
  const { user } = renderSearch();
  await user.type(screen.getByRole("searchbox", { name: "Search words" }), "last zzz");
  expect(await screen.findByText("1 partial match")).toBeVisible();
});

it("loads the next page at the end of the list, keeping the earlier results in the document", async () => {
  const manyMatches = { matches: [hit], partial: [], matchCount: 100, partialCount: 0 };
  let resolveSecond!: (value: typeof manyMatches) => void;
  vi.mocked(searchHadiths)
    .mockResolvedValueOnce(manyMatches)
    .mockImplementationOnce(() => new Promise((resolve) => (resolveSecond = resolve)));
  renderSearch();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search words" }), { target: { value: "last" } });

  // the whole first page fits in the list's viewport, so its end is reached at once
  await waitFor(() => expect(searchHadiths).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 100 })));
  expect(screen.getByRole("article", { name: "Sahih al-Bukhari, Volume 2, Book 13, Hadith 1" })).toBeVisible();

  await act(async () => resolveSecond({ ...manyMatches, matchCount: 1 }));
  expect(searchHadiths).toHaveBeenCalledTimes(2);
});

it("offers to download the missing collections, without downloading them unasked", async () => {
  vi.mocked(getDownloadStatus).mockResolvedValue({ text: {}, audio: {}, hadiths: ["bukhari"] });
  vi.mocked(downloadHadiths).mockResolvedValue();
  const { user } = renderSearch();
  expect(await screen.findByText("Download a collection to search its hadiths.")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Download Sahih al-Bukhari" })).toBeNull();
  expect(downloadHadiths).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "Download Muwatta Malik" }));

  expect(downloadHadiths).toHaveBeenCalledExactlyOnceWith("malik");
});

it("only offers the collection of the page", async () => {
  vi.mocked(getDownloadStatus).mockResolvedValue({ text: {}, audio: {}, hadiths: [] });
  renderSearch("/hadiths/malik");
  expect(await screen.findByRole("button", { name: "Download Muwatta Malik" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Download Sahih al-Bukhari" })).toBeNull();
});

it("shows missing collections as unavailable offline, until the connection is back", async () => {
  vi.mocked(getDownloadStatus).mockResolvedValue({ text: {}, audio: {}, hadiths: ["bukhari"] });
  const onLine = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  renderSearch();
  expect(await screen.findByText("Not downloaded. Connect to the internet to download it.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Download Muwatta Malik" })).toBeDisabled();

  onLine.mockReturnValue(true);
  act(() => {
    window.dispatchEvent(new Event("online"));
  });

  expect(screen.getByRole("button", { name: "Download Muwatta Malik" })).toBeEnabled();
  expect(screen.queryByText("Not downloaded. Connect to the internet to download it.")).toBeNull();
});

it("says so when the search stops", async () => {
  vi.mocked(searchHadiths).mockRejectedValue(new HadithSearchStopped());
  const { user } = renderSearch();
  await user.type(screen.getByRole("searchbox", { name: "Search words" }), "last");
  expect(await screen.findByText("Hadith search stopped. Try searching fewer collections.")).toBeVisible();
});

it("clears a stopped search's message once there is nothing left to search", async () => {
  vi.mocked(searchHadiths).mockRejectedValue(new HadithSearchStopped());
  const { user } = renderSearch();
  const searchbox = screen.getByRole("searchbox", { name: "Search words" });
  await user.type(searchbox, "last");
  expect(await screen.findByText("Hadith search stopped. Try searching fewer collections.")).toBeVisible();

  await user.clear(searchbox);

  await waitFor(() => expect(screen.queryByText("Hadith search stopped. Try searching fewer collections.")).toBeNull());
});
