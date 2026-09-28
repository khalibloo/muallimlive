import { render, screen } from "@testing-library/react";
import lf from "localforage";

import TestProviders from "@/components/test/TestProviders";
import BasicLayout from "./BasicLayout";
import type { SettingsResources } from "./NavBar";

vi.mock("@/components/saveReaderSettings", () => ({
  saveReaderSettings: vi.fn(),
}));
vi.mock("@/components/saveColorScheme", () => ({
  saveColorScheme: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const settingsResources: SettingsResources = {
  chapters: { chapters: [] },
  translations: { translations: [] },
  languages: { languages: [] },
  tafsirs: { tafsirs: [] },
  recitations: { recitations: [] },
  hadiths: { collections: [] },
  readerSettings: { splitView: false, left: [{ content: ["translation", "ar", "uthmani"] }], right: [] },
  playerSettings: { reciter: 1, hideTafsirs: true },
};

describe("BasicLayout", () => {
  beforeEach(async () => {
    await lf.clear();
  });

  it("renders the nav bar, page content, footer and cookie notice", async () => {
    render(
      <TestProviders>
        <BasicLayout settingsResources={settingsResources} colorScheme="dark">
          <p>Page content</p>
        </BasicLayout>
      </TestProviders>,
    );

    expect(screen.getByRole("link", { name: "MuallimLive" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms of Service" })).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Cookie notice" })).toBeInTheDocument();
  });
});
