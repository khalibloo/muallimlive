import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TestProviders from "@/components/test/TestProviders";
import ReaderSettingsForm from "./ReaderSettingsForm";
import { saveReaderSettings } from "./saveReaderSettings";

vi.mock("./saveReaderSettings", () => ({
  saveReaderSettings: vi.fn(),
}));

const languages: GetLanguagesResponse = {
  languages: [
    {
      id: 38,
      name: "English",
      iso_code: "en",
      native_name: "",
      direction: "ltr",
      translations_count: 2,
      translated_name: { name: "English", language_name: "english" },
    },
    {
      id: 20,
      name: "French",
      iso_code: "fr",
      native_name: "Français",
      direction: "ltr",
      translations_count: 1,
      translated_name: { name: "French", language_name: "english" },
    },
  ],
};

const resource = (id: number, name: string, languageName: string) => ({
  id,
  name,
  author_name: "",
  slug: "",
  language_name: languageName,
  translated_name: { name, language_name: "english" },
});

const translations: GetTranslationsResponse = {
  translations: [
    resource(20, "Saheeh International", "english"),
    resource(131, "Dr. Mustafa Khattab", "english"),
    resource(31, "Muhammad Hamidullah", "french"),
  ],
};

const tafsirs: GetTafsirsResponse = {
  tafsirs: [resource(169, "Ibn Kathir (Abridged)", "english"), resource(16, "Tafsir Muyassar", "arabic")],
};

const readerSettings: ReaderSettings = {
  splitView: true,
  left: [{ content: ["translation", "en", 20] }, { content: ["tafsir", "en", 169] }],
  right: [{ content: ["translation", "ar", "uthmani_tajweed"] }, { content: ["translation", "en", 131] }],
  textSize: 120,
};

const renderForm = (settings = readerSettings) => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(
    <TestProviders>
      <ReaderSettingsForm
        readerSettings={settings}
        languages={languages}
        translations={translations}
        tafsirs={tafsirs}
        onSubmit={onSubmit}
      />
    </TestProviders>,
  );
  return { user, onSubmit };
};

describe("ReaderSettingsForm", () => {
  it("shows the current panes in split view", () => {
    renderForm();

    expect(screen.getByRole("switch", { name: "Use Split View" })).toBeChecked();
    expect(screen.getByText("Left Pane")).toBeInTheDocument();
    expect(screen.getByText("Right Pane")).toBeInTheDocument();
    expect(screen.getByText("Right and left panes are merged if on a mobile screen")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Left pane content 1" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Left pane content 2" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Right pane content 1" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Right pane content 2" })).toBeInTheDocument();
    expect(screen.getByText("Translations / English / Saheeh International")).toBeInTheDocument();
    expect(screen.getByText("Tafsirs / English / Ibn Kathir (Abridged)")).toBeInTheDocument();
    expect(screen.getByText("Translations / Arabic / Uthmani Tajweed Script")).toBeInTheDocument();
    expect(screen.getByText("Translations / English / Dr. Mustafa Khattab")).toBeInTheDocument();
  });

  it("does not warn about merged panes on wide screens", () => {
    const { matchMedia } = window;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({ ...matchMedia(query), matches: true }));
    try {
      renderForm();

      expect(screen.getByText("Left Pane")).toBeInTheDocument();
      expect(screen.queryByText("Right and left panes are merged if on a mobile screen")).not.toBeInTheDocument();
    } finally {
      window.matchMedia = matchMedia;
    }
  });

  it("saves the settings unchanged", async () => {
    const { user, onSubmit } = renderForm();

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(readerSettings));
    expect(saveReaderSettings).toHaveBeenCalledWith(readerSettings);
  });

  it("merges the right pane into the left when split view is off", async () => {
    const { user, onSubmit } = renderForm();

    await user.click(screen.getByRole("switch", { name: "Use Split View" }));
    expect(screen.queryByText("Left Pane")).not.toBeInTheDocument();
    expect(screen.queryByText("Right and left panes are merged if on a mobile screen")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(saveReaderSettings).toHaveBeenCalledWith({
      splitView: false,
      left: [...readerSettings.left, ...readerSettings.right],
      right: [],
      textSize: 120,
    });
  });

  it("changes the text size, which defaults to 100%", async () => {
    const { textSize: _, ...withoutTextSize } = readerSettings;
    const { user, onSubmit } = renderForm(withoutTextSize);

    const slider = screen.getByRole("slider", { name: "Text Size" });
    expect(slider).toHaveAttribute("aria-valuenow", "100");
    // the slider only reads the legacy `keyCode`, which user-event never sets, so fireEvent is required here
    fireEvent.keyDown(slider, { key: "ArrowRight", keyCode: 39 });
    await waitFor(() => expect(slider).toHaveAttribute("aria-valuenow", "110"));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(saveReaderSettings).toHaveBeenCalledWith({ ...readerSettings, textSize: 110 });
  });

  it("removes pane content rows", async () => {
    const { user, onSubmit } = renderForm();

    await user.click(screen.getByRole("button", { name: "Remove left pane content 1" }));
    // the last remaining row cannot be removed
    expect(screen.queryByRole("button", { name: "Remove left pane content 1" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(saveReaderSettings).toHaveBeenCalledWith({ ...readerSettings, left: [readerSettings.left[1]] });
  });

  it("requires content for newly added rows", async () => {
    const { user, onSubmit } = renderForm();

    await user.click(screen.getByRole("button", { name: "Add right pane content" }));
    expect(screen.getByRole("combobox", { name: "Right pane content 3" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("Please select content")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("adds content picked by searching", async () => {
    const { user, onSubmit } = renderForm();

    await user.click(screen.getByRole("button", { name: "Add left pane content" }));
    await user.type(screen.getByRole("combobox", { name: "Left pane content 3" }), "french");
    await user.click(await screen.findByText("Muhammad Hamidullah", { exact: false }));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(saveReaderSettings).toHaveBeenCalledWith({
      ...readerSettings,
      left: [...readerSettings.left, { content: ["translation", "fr", 31] }],
    });
  });

  it("offers only languages that have tafsirs", async () => {
    const { user } = renderForm();

    await user.type(screen.getByRole("combobox", { name: "Left pane content 1" }), "tafsirs");

    expect(await screen.findByText("Tafsir Muyassar", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("French", { exact: false })).not.toBeInTheDocument();
  });
});
