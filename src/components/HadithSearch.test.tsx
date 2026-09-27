import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
      <HadithSearch hadiths={hadiths} onClose={onClose} />
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

it("searches every downloaded collection and links to the hadith", async () => {
  const { user, onClose } = renderSearch();
  await user.type(screen.getByRole("searchbox", { name: "Search words" }), "last");
  const result = await screen.findByRole("article", { name: "Sahih al-Bukhari, Volume 2, Book 13, Hadith 1" });
  expect(within(result).getByText("last", { selector: "mark" })).toBeVisible();
  await user.click(within(result).getByRole("link"));
  expect(onClose).toHaveBeenCalled();
  expect(searchHadiths).toHaveBeenLastCalledWith(
    expect.objectContaining({ collections: ["bukhari", "malik"], query: "last" }),
  );
});

it("starts with the collection and book of the page", async () => {
  const { user } = renderSearch("/hadiths/bukhari/13/1");
  expect(screen.getByRole("combobox", { name: "Collection" })).toBeVisible();
  await user.type(screen.getByRole("searchbox", { name: "Search words" }), "last");
  await waitFor(() =>
    expect(searchHadiths).toHaveBeenLastCalledWith(expect.objectContaining({ collections: ["bukhari"], book: 13 })),
  );
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

it("lists partial matches under their own heading", async () => {
  vi.mocked(searchHadiths).mockResolvedValue({ matches: [], partial: [hit], matchCount: 0, partialCount: 1 });
  const { user } = renderSearch();
  await user.type(screen.getByRole("searchbox", { name: "Search words" }), "last zzz");
  expect(await screen.findByText("1 partial match")).toBeVisible();
});

it("keeps the earlier results in the document while the next page loads", async () => {
  const manyMatches = { matches: [hit], partial: [], matchCount: 100, partialCount: 0 };
  let resolveSecond!: (value: typeof manyMatches) => void;
  vi.mocked(searchHadiths)
    .mockResolvedValueOnce(manyMatches)
    .mockImplementationOnce(() => new Promise((resolve) => (resolveSecond = resolve)));
  const { user } = renderSearch();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search words" }), { target: { value: "last" } });
  await user.click(await screen.findByRole("button", { name: "Show more" }));

  expect(screen.getByRole("article", { name: "Sahih al-Bukhari, Volume 2, Book 13, Hadith 1" })).toBeVisible();

  resolveSecond(manyMatches);
  await waitFor(() => expect(searchHadiths).toHaveBeenCalledTimes(2));
});

it("downloads the selected collections that are missing", async () => {
  vi.mocked(getDownloadStatus).mockResolvedValue({ text: {}, audio: {}, hadiths: [] });
  vi.mocked(downloadHadiths).mockResolvedValue();
  renderSearch("/hadiths/malik");
  await waitFor(() => expect(downloadHadiths).toHaveBeenCalledWith("malik"));
  expect(downloadHadiths).toHaveBeenCalledTimes(1);
});

it("shows missing collections as unavailable offline", async () => {
  vi.mocked(getDownloadStatus).mockResolvedValue({ text: {}, audio: {}, hadiths: ["bukhari"] });
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  renderSearch();
  expect(await screen.findByText("Not downloaded. Connect to the internet to download it.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Download Muwatta Malik" })).toBeDisabled();
  expect(downloadHadiths).not.toHaveBeenCalled();
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
