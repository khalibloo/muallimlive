import { render, screen } from "@testing-library/react";
import lf from "localforage";

import TestProviders from "@/components/test/TestProviders";
import BasicLayout from "./BasicLayout";
import type { SettingsResources } from "./NavBar";

vi.mock("@/components/saveReaderSettings", () => ({
  saveReaderSettings: vi.fn(),
}));

const settingsResources: SettingsResources = {
  translations: { translations: [] },
  languages: { languages: [] },
  tafsirs: { tafsirs: [] },
  recitations: { recitations: [] },
  readerSettings: { splitView: false, left: [{ content: ["translation", "ar", "uthmani"] }], right: [] },
};

describe("BasicLayout", () => {
  beforeEach(async () => {
    await lf.clear();
  });

  it("renders the nav bar, page content, footer and cookie notice", async () => {
    render(
      <TestProviders>
        <BasicLayout settingsResources={settingsResources}>
          <p>Page content</p>
        </BasicLayout>
      </TestProviders>,
    );

    expect(screen.getByRole("link", { name: "MuallimLive" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms of Service" })).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Cookie notice" })).toBeInTheDocument();
  });
});
