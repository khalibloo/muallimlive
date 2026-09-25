import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";

import TestProviders from "@/components/test/TestProviders";
import { saveReaderSettings } from "@/components/saveReaderSettings";
import NavBar, { type SettingsResources } from "./NavBar";

vi.mock("@/components/saveReaderSettings", () => ({
  saveReaderSettings: vi.fn(),
}));

const settingsResources: SettingsResources = {
  translations: { translations: [] },
  languages: { languages: [] },
  tafsirs: { tafsirs: [] },
  recitations: { recitations: [] },
  readerSettings: {
    splitView: true,
    left: [{ content: ["translation", "ar", "uthmani"] }],
    right: [{ content: ["translation", "ar", "indopak"] }],
  },
};

const renderNavBar = () => {
  const user = userEvent.setup();
  render(
    <TestProviders>
      {/* jsdom never fires transition events, so closing modals only completes with motion disabled */}
      <ConfigProvider theme={{ token: { motion: false } }}>
        <NavBar settingsResources={settingsResources} />
      </ConfigProvider>
    </TestProviders>,
  );
  return user;
};

const openSettings = async (user: ReturnType<typeof userEvent.setup>, item: string) => {
  await user.click(screen.getByRole("button", { name: "Settings" }));
  await user.click(await screen.findByRole("menuitem", { name: item }));
  return screen.findByRole("dialog", { name: "Settings" });
};

describe("NavBar", () => {
  it("links the app name to the home page", () => {
    renderNavBar();

    expect(screen.getByRole("link", { name: "MuallimLive" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("heading", { level: 3, name: "MuallimLive" })).toBeInTheDocument();
  });

  it("offers the settings sections", async () => {
    const user = renderNavBar();

    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(await screen.findByRole("menuitem", { name: "Display Settings" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Offline Storage" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Sync Settings" })).toBeInTheDocument();
  });

  it.each([
    ["Offline Storage", "Storage"],
    ["Sync Settings", "Sync"],
  ])("opens %s on the %s tab", async (item, tab) => {
    const user = renderNavBar();

    const dialog = await openSettings(user, item);

    expect(within(dialog).getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true");
    expect(within(dialog).getByText("Coming soon")).toBeInTheDocument();
  });

  it("switches between tabs", async () => {
    const user = renderNavBar();
    const dialog = await openSettings(user, "Offline Storage");

    await user.click(within(dialog).getByRole("tab", { name: "Display" }));

    expect(within(dialog).getByRole("tab", { name: "Display" })).toHaveAttribute("aria-selected", "true");
    expect(within(dialog).getByRole("switch", { name: "Use Split View" })).toBeInTheDocument();
  });

  it("saves display settings and confirms with a notification", async () => {
    const user = renderNavBar();
    const dialog = await openSettings(user, "Display Settings");

    expect(within(dialog).getByRole("tab", { name: "Display" })).toHaveAttribute("aria-selected", "true");
    await user.click(within(dialog).getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("Changes Saved Successfully")).toBeInTheDocument();
    expect(saveReaderSettings).toHaveBeenCalledWith(settingsResources.readerSettings);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument());
  });

  it("closes the settings modal", async () => {
    const user = renderNavBar();
    const dialog = await openSettings(user, "Display Settings");

    await user.click(within(dialog).getByRole("button", { name: "Close" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument());
  });
});
