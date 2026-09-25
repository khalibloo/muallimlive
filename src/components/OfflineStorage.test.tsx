import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { stubCaches, stubFetch } from "@/components/test/fakeCaches";
import TestProviders from "@/components/test/TestProviders";
import { downloadText } from "@/utils/offline";
import OfflineStorage from "./OfflineStorage";

const chapters = {
  chapters: [
    { id: 1, name_simple: "Al-Fatihah", translated_name: { name: "The Opener" } },
    { id: 2, name_simple: "Al-Baqarah", translated_name: { name: "The Cow" } },
  ],
} as GetChaptersResponse;
const translations = {
  translations: [
    { id: 20, translated_name: { name: "Saheeh International" } },
    { id: 85, translated_name: { name: "Abdel Haleem" } },
  ],
} as GetTranslationsResponse;
const tafsirs = { tafsirs: [{ id: 169, translated_name: { name: "Ibn Kathir" } }] } as GetTafsirsResponse;
const recitations = {
  recitations: [
    { id: 7, style: "", translated_name: { name: "Mishari Rashid al-Afasy" } },
    { id: 3, style: "Murattal", translated_name: { name: "Hani ar-Rifai" } },
  ],
} as GetRecitationsResponse;
const readerSettings: ReaderSettings = {
  splitView: true,
  left: [{ content: ["translation", "ar", "uthmani"] }, { content: ["translation", "en", 20] }],
  right: [{ content: ["tafsir", "en", 169] }, { content: ["translation", "en", 20] }],
};

const recitation = (chapter: number) => [
  { id: 1, verse_key: `${chapter}:1`, url: `https://audio.test/${chapter}.mp3` },
];

const responses: Record<string, unknown> = {
  "/1.mp3": {},
  "/2.mp3": {},
  "/api/content/recitation/7/1": recitation(1),
  "/api/content/recitation/7/2": recitation(2),
};
for (const pack of ["arabic/uthmani", "translation/20", "translation/85", "tafsir/169"]) {
  for (const chapter of [1, 2]) {
    responses[`/api/content/${pack}/${chapter}`] = [];
  }
}

const renderStorage = () => {
  const user = userEvent.setup();
  render(
    <TestProviders>
      <OfflineStorage
        chapters={chapters}
        translations={translations}
        tafsirs={tafsirs}
        recitations={recitations}
        readerSettings={readerSettings}
        playerSettings={{ reciter: 7, hideTafsirs: true }}
      />
    </TestProviders>,
  );
  return user;
};

const packRow = (name: string) => screen.getByText(name).closest("li")!;

describe("OfflineStorage", () => {
  beforeEach(() => {
    stubCaches();
    stubFetch(responses);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports browsers without offline storage", () => {
    vi.unstubAllGlobals();
    renderStorage();

    expect(screen.getByText("This browser doesn't support offline storage.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download All" })).not.toBeInTheDocument();
  });

  it("lists each content pack in the display settings once", async () => {
    renderStorage();

    expect(await screen.findAllByText(/· Not downloaded/)).toHaveLength(3);
    expect(within(packRow("Uthmani Script")).getByText("Arabic · Not downloaded")).toBeInTheDocument();
    expect(within(packRow("Saheeh International")).getByText("Translation · Not downloaded")).toBeInTheDocument();
    expect(within(packRow("Ibn Kathir")).getByText("Tafsir · Not downloaded")).toBeInTheDocument();
  });

  it("downloads every pack in the display settings", async () => {
    const user = renderStorage();

    await user.click(await screen.findByRole("button", { name: "Download All" }));

    expect(await screen.findAllByText(/· Downloaded/)).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Download All" })).not.toBeInTheDocument();
  });

  it("downloads and removes a single pack", async () => {
    const user = renderStorage();

    await user.click(await screen.findByRole("button", { name: "Download Ibn Kathir" }));
    expect(await within(packRow("Ibn Kathir")).findByText("Tafsir · Downloaded")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download Ibn Kathir" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove Ibn Kathir" }));
    expect(await within(packRow("Ibn Kathir")).findByText("Tafsir · Not downloaded")).toBeInTheDocument();
  });

  it("lists partly downloaded packs and packs from earlier settings", async () => {
    await downloadText({ type: "translation", id: "20" }, [1]);
    await downloadText({ type: "translation", id: "85" }, [1, 2]);
    renderStorage();

    expect(
      await within(packRow("Saheeh International")).findByText("Translation · 1 of 2 chapters downloaded"),
    ).toBeInTheDocument();
    expect(within(packRow("Abdel Haleem")).getByText("Translation · Downloaded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Abdel Haleem" })).toBeInTheDocument();
  });

  it("reports failed downloads", async () => {
    stubFetch({});
    const user = renderStorage();

    await user.click(await screen.findByRole("button", { name: "Download Uthmani Script" }));

    expect(await screen.findByText("Download failed. Check your connection and try again.")).toBeInTheDocument();
    expect(within(packRow("Uthmani Script")).getByText("Arabic · Not downloaded")).toBeInTheDocument();
  });

  it("downloads and removes the reciter's audio for every chapter", async () => {
    const user = renderStorage();

    expect(await screen.findByText("0 of 2 chapters downloaded for this reciter")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Download recitation audio" }));
    expect(await screen.findByText("2 of 2 chapters downloaded for this reciter")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download recitation audio" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove recitation audio" }));
    expect(await screen.findByText("0 of 2 chapters downloaded for this reciter")).toBeInTheDocument();
  });

  it("downloads audio for the chosen chapter and reciter", async () => {
    const user = renderStorage();

    await user.click(screen.getByRole("combobox", { name: "Chapter" }));
    await user.click((await screen.findAllByText("1. Al-Fatihah (The Opener)")).at(-1)!);
    await user.click(screen.getByRole("button", { name: "Download recitation audio" }));
    expect(await screen.findByText("1 of 2 chapters downloaded for this reciter")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Audio Reciter" }));
    await user.click((await screen.findAllByText("Hani ar-Rifai (Murattal)")).at(-1)!);
    expect(await screen.findByText("0 of 2 chapters downloaded for this reciter")).toBeInTheDocument();
  });

  it("shows the storage used", async () => {
    // jsdom has no StorageManager
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { estimate: async () => ({ usage: 1_500_000 }) },
    });
    try {
      renderStorage();

      expect(await screen.findByText("Storage used on this device: 1.5 MB")).toBeInTheDocument();
    } finally {
      Reflect.deleteProperty(navigator, "storage");
    }
  });
});
