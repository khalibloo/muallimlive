import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import lf from "localforage";

import { ChapterSearchProvider } from "@/components/ChapterSearchContext";
import { stubCaches, stubFetch } from "@/components/test/fakeCaches";
import TestProviders from "@/components/test/TestProviders";
import { saveColorScheme } from "@/components/saveColorScheme";
import { saveReaderSettings } from "@/components/saveReaderSettings";
import { COLOR_SCHEME_KEY } from "@/utils/cookies";
import { downloadText } from "@/utils/offline";
import NavBar, { INSTALL_PROMPT_KEY, type SettingsResources } from "./NavBar";

vi.mock("@/components/saveReaderSettings", () => ({
  saveReaderSettings: vi.fn(),
}));
vi.mock("@/components/saveColorScheme", () => ({
  saveColorScheme: vi.fn(),
}));
const { pathname } = vi.hoisted(() => ({ pathname: vi.fn(() => "/") }));
vi.mock("next/navigation", () => ({ usePathname: pathname }));

const settingsResources: SettingsResources = {
  chapters: { chapters: [] },
  translations: { translations: [] },
  languages: { languages: [] },
  tafsirs: { tafsirs: [] },
  recitations: { recitations: [] },
  hadiths: { collections: [] },
  readerSettings: {
    splitView: true,
    left: [{ content: ["translation", "ar", "uthmani"] }],
    right: [{ content: ["translation", "ar", "indopak"] }],
  },
  playerSettings: { reciter: 1, hideTafsirs: true },
};

const renderNavBar = (resources = settingsResources, colorScheme: ColorScheme = "dark") => {
  const user = userEvent.setup();
  render(
    <TestProviders>
      {/* jsdom never fires transition events, so closing modals only completes with motion disabled */}
      <ConfigProvider theme={{ token: { motion: false } }}>
        <ChapterSearchProvider>
          <NavBar settingsResources={resources} colorScheme={colorScheme} />
        </ChapterSearchProvider>
      </ConfigProvider>
    </TestProviders>,
  );
  return user;
};

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Menu" }));
  return screen.findByRole("menu");
};

const openSettings = async (user: ReturnType<typeof userEvent.setup>, item: string) => {
  const menu = await openMenu(user);
  await user.click(within(menu).getByRole("menuitem", { name: item }));
  return screen.findByRole("dialog", { name: "Settings" });
};

describe("NavBar", () => {
  afterEach(() => {
    pathname.mockReturnValue("/");
    document.cookie = `${COLOR_SCHEME_KEY}=; max-age=0`;
  });

  it("links the app name to the home page", () => {
    renderNavBar();

    expect(screen.getByRole("link", { name: "MuallimLive" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("heading", { level: 3, name: "MuallimLive" })).toBeInTheDocument();
  });

  it("keeps the sections, theme and settings in the menu", () => {
    renderNavBar();

    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Search", "Menu"]);
  });

  it("links to every section from the menu", async () => {
    const user = renderNavBar();
    const menu = await openMenu(user);

    expect(within(menu).getByText("Go to")).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(within(menu).getByRole("link", { name: "Qur'an" })).toHaveAttribute("href", "/quran");
    expect(within(menu).getByRole("link", { name: "Hadith" })).toHaveAttribute("href", "/hadiths");
    expect(within(menu).getByRole("link", { name: "Favorites & Notes" })).toHaveAttribute("href", "/saved");
  });

  it.each([
    ["/", "Home"],
    ["/quran/2", "Qur'an"],
    ["/hadiths/bukhari/13", "Hadith"],
    ["/saved", "Favorites & Notes"],
  ])("marks %s as in the %s section", async (path, section) => {
    pathname.mockReturnValue(path);
    const user = renderNavBar();
    const menu = await openMenu(user);

    expect(within(menu).getByRole("link", { name: section })).toHaveAttribute("aria-current", "page");
    expect(
      within(menu)
        .getAllByRole("link")
        .filter((l) => l.hasAttribute("aria-current")),
    ).toHaveLength(1);
  });

  it("marks the current theme", async () => {
    document.cookie = `${COLOR_SCHEME_KEY}=sepia`;
    const user = renderNavBar(settingsResources, "sepia");
    const menu = await openMenu(user);

    expect(within(menu).getByRole("menuitemradio", { name: "Sepia" })).toHaveAttribute("aria-checked", "true");
    expect(within(menu).getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute("aria-checked", "false");
  });

  it("opens the verse search", async () => {
    const user = renderNavBar();

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByRole("dialog", { name: "Search" })).toBeInTheDocument();
  });

  it.each([
    ["/quran/2", "Qur'an"],
    ["/hadiths/bukhari", "Hadith"],
  ])("opens the search on %s in the %s mode", async (path, mode) => {
    pathname.mockReturnValue(path);
    const user = renderNavBar();

    await user.click(screen.getByRole("button", { name: "Search" }));

    const dialog = await screen.findByRole("dialog", { name: "Search" });
    expect(within(dialog).getByRole("radio", { name: mode })).toBeChecked();
  });

  it.each([
    ["dark", "Light", "light"],
    ["light", "Sepia", "sepia"],
    ["sepia", "Dark", "dark"],
  ] as const)("switches from the %s theme to %s", async (colorScheme, label, next) => {
    const user = renderNavBar(settingsResources, colorScheme);

    const menu = await openMenu(user);
    await user.click(within(menu).getByRole("menuitemradio", { name: label }));

    expect(saveColorScheme).toHaveBeenCalledWith(next);
  });

  it("offers the settings sections", async () => {
    const user = renderNavBar();
    const menu = await openMenu(user);

    expect(within(menu).getByText("Settings")).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Display Settings" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Tajweed" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Offline Storage" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Sync & Backup" })).toBeInTheDocument();
  });

  it.each([
    // jsdom has no Cache Storage, so the storage tab reports it as unsupported
    ["Offline Storage", "Storage", "This browser doesn't support offline storage."],
    ["Sync & Backup", "Sync & Backup", "Sync with Google Drive"],
  ])("opens %s on the %s tab", async (item, tab, content) => {
    const user = renderNavBar();

    const dialog = await openSettings(user, item);

    expect(within(dialog).getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true");
    expect(within(dialog).getByText(content)).toBeInTheDocument();
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
    expect(saveReaderSettings).toHaveBeenCalledWith({
      ...settingsResources.readerSettings,
      textSize: 100,
      glosses: true,
    });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument());
  });

  it("opens the tajweed settings and saves them with a notification", async () => {
    const user = renderNavBar();
    const dialog = await openSettings(user, "Tajweed");

    expect(within(dialog).getByRole("tab", { name: "Tajweed" })).toHaveAttribute("aria-selected", "true");
    await user.click(within(dialog).getByRole("switch", { name: "Tajweed Colors" }));
    await user.click(within(dialog).getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("Changes Saved Successfully")).toBeInTheDocument();
    expect(saveReaderSettings).toHaveBeenCalledWith({ ...settingsResources.readerSettings, tajweedColors: false });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument());
  });

  describe("with offline downloads", () => {
    const resources = {
      ...settingsResources,
      chapters: {
        chapters: [{ id: 1, name_simple: "Al-Fatihah", translated_name: { name: "The Opener" } }],
      } as GetChaptersResponse,
    };

    beforeEach(() => {
      stubCaches();
      stubFetch({ "/api/content/arabic/uthmani/1": [], "/api/content/translation/20/1": [] });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("offers to download the new settings' content", async () => {
      await downloadText({ type: "translation", id: "20" }, [1]);
      const user = renderNavBar(resources);
      const dialog = await openSettings(user, "Display Settings");

      await user.click(within(dialog).getByRole("button", { name: "Save Changes" }));

      expect(await screen.findByText("Not downloaded for offline use")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Your display settings now show Uthmani Script and Indopak Script. Download them to keep reading offline.",
        ),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Open Offline Storage" }));

      const storage = await screen.findByRole("dialog", { name: "Settings" });
      expect(within(storage).getByRole("tab", { name: "Storage" })).toHaveAttribute("aria-selected", "true");
    });

    it("stays quiet when the new settings' content is downloaded", async () => {
      await downloadText({ type: "arabic", id: "uthmani" }, [1]);
      const user = renderNavBar({ ...resources, readerSettings: { ...settingsResources.readerSettings, right: [] } });
      const dialog = await openSettings(user, "Display Settings");

      await user.click(within(dialog).getByRole("button", { name: "Save Changes" }));

      expect(await screen.findByText("Changes Saved Successfully")).toBeInTheDocument();
      expect(screen.queryByText("Not downloaded for offline use")).not.toBeInTheDocument();
    });

    it("stays quiet for readers without downloads", async () => {
      const user = renderNavBar(resources);
      const dialog = await openSettings(user, "Display Settings");

      await user.click(within(dialog).getByRole("button", { name: "Save Changes" }));

      expect(await screen.findByText("Changes Saved Successfully")).toBeInTheDocument();
      expect(screen.queryByText("Not downloaded for offline use")).not.toBeInTheDocument();
    });
  });

  describe("after installing the app", () => {
    const resources = {
      ...settingsResources,
      chapters: {
        chapters: [{ id: 1, name_simple: "Al-Fatihah", translated_name: { name: "The Opener" } }],
      } as GetChaptersResponse,
    };
    const prompt = "Read offline";

    /** Makes the page look launched from the home screen */
    const stubStandalone = () => {
      const matchMedia = window.matchMedia;
      vi.stubGlobal("matchMedia", (query: string) => ({
        ...matchMedia(query),
        matches: query === "(display-mode: standalone)",
      }));
    };

    // The prompt checks storage asynchronously, so give it time to (not) show
    const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    beforeEach(async () => {
      await lf.clear();
      stubCaches();
      stubFetch({ "/api/content/arabic/uthmani/1": [], "/api/content/arabic/indopak/1": [] });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("offers the offline downloads on the first launch from the home screen", async () => {
      stubStandalone();
      const user = renderNavBar(resources);

      expect(await screen.findByText(prompt)).toBeInTheDocument();
      expect(
        screen.getByText(
          "Download the content in your display settings, and recitations if you like, to keep reading and listening without an internet connection.",
        ),
      ).toBeInTheDocument();
      expect(await lf.getItem(INSTALL_PROMPT_KEY)).toBe(true);

      await user.click(screen.getByRole("button", { name: "Open Offline Storage" }));

      const storage = await screen.findByRole("dialog", { name: "Settings" });
      expect(within(storage).getByRole("tab", { name: "Storage" })).toHaveAttribute("aria-selected", "true");
    });

    it("offers the offline downloads when the browser installs the app", async () => {
      renderNavBar(resources);
      await settle();
      expect(screen.queryByText(prompt)).not.toBeInTheDocument();

      fireEvent(window, new Event("appinstalled"));

      expect(await screen.findByText(prompt)).toBeInTheDocument();
    });

    it("only offers them once", async () => {
      await lf.setItem(INSTALL_PROMPT_KEY, true);
      stubStandalone();
      renderNavBar(resources);

      await settle();
      expect(screen.queryByText(prompt)).not.toBeInTheDocument();
    });

    it("stays quiet when the display settings' content is downloaded", async () => {
      await downloadText({ type: "arabic", id: "uthmani" }, [1]);
      await downloadText({ type: "arabic", id: "indopak" }, [1]);
      stubStandalone();
      renderNavBar(resources);

      await settle();
      expect(screen.queryByText(prompt)).not.toBeInTheDocument();
    });

    it("waits for a launch with a connection", async () => {
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
      stubStandalone();
      renderNavBar(resources);

      await settle();
      expect(screen.queryByText(prompt)).not.toBeInTheDocument();
      expect(await lf.getItem(INSTALL_PROMPT_KEY)).toBeNull();
    });
  });

  it("closes the settings modal", async () => {
    const user = renderNavBar();
    const dialog = await openSettings(user, "Display Settings");

    await user.click(within(dialog).getByRole("button", { name: "Close" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument());
  });
});
