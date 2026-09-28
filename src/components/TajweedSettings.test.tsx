import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TestProviders from "@/components/test/TestProviders";
import { saveReaderSettings } from "./saveReaderSettings";
import TajweedSettings from "./TajweedSettings";

vi.mock("./saveReaderSettings", () => ({
  saveReaderSettings: vi.fn(),
}));

const readerSettings: ReaderSettings = {
  splitView: true,
  left: [{ content: ["translation", "en", 20] }],
  right: [{ content: ["translation", "ar", "uthmani_tajweed"] }, { content: ["translation", "en", 0] }],
  textSize: 120,
  glosses: true,
};

const renderSettings = (settings = readerSettings) => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(
    <TestProviders>
      <TajweedSettings readerSettings={settings} onSubmit={onSubmit} />
    </TestProviders>,
  );
  return { user, onSubmit };
};

// the Select's accessible options can't be clicked in jsdom, so click the visible one, rendered after
// the rules that already show this color
const pickColor = async (user: ReturnType<typeof userEvent.setup>, rule: string, color: string) => {
  await user.type(screen.getByRole("combobox", { name: `Color for ${rule}` }), color);
  await user.click((await screen.findAllByTitle(color)).at(-1)!);
};

const lookFor = (rule: string) => screen.getByRole("radiogroup", { name: `Look for ${rule}` });

// the Segmented radio inputs ignore pointer events, so click their labels
const pickLook = (user: ReturnType<typeof userEvent.setup>, rule: string, look: string) =>
  user.click(within(lookFor(rule)).getByText(look));

const save = async (user: ReturnType<typeof userEvent.setup>, onSubmit: ReturnType<typeof vi.fn>) => {
  await user.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
};

describe("TajweedSettings", () => {
  it("lists every rule under its heading, with its default color and the normal look", () => {
    renderSettings();

    for (const heading of ["Hamzat al-Wasl", "Madd", "Qalqalah", "Noon & Meem", "Ra & Lam", "Other"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByRole("switch", { name: "Tajweed Colors" })).toBeChecked();
    expect(screen.getAllByRole("combobox", { name: /^Color for / })).toHaveLength(26);
    expect(screen.getByRole("combobox", { name: "Color for Madd Wajib (4–5 counts)" })).toBeInTheDocument();
    expect(screen.getByText("Sky")).toBeInTheDocument();
    expect(screen.getByText("Lime")).toBeInTheDocument();
    expect(screen.getAllByText("Teal")).toHaveLength(4);
    expect(screen.getAllByRole("radio", { name: "Normal", checked: true })).toHaveLength(26);
  });

  it("shows the saved choices", () => {
    renderSettings({
      ...readerSettings,
      tajweedColors: false,
      tajweedRules: { qalqalah: { color: "red", look: "faded" } },
    });

    expect(screen.getByRole("switch", { name: "Tajweed Colors" })).not.toBeChecked();
    expect(screen.queryByText("Lime")).not.toBeInTheDocument();
    expect(screen.getAllByText("Red")).toHaveLength(4);
    expect(within(lookFor("Qalqalah")).getByRole("radio", { name: "Faded" })).toBeChecked();
  });

  it("saves only the changed rules, keeping the display settings", async () => {
    const { user, onSubmit } = renderSettings();

    await pickColor(user, "Qalqalah", "Red");
    await pickLook(user, "Hamzat al-Wasl", "Hidden");
    await save(user, onSubmit);

    const saved = {
      ...readerSettings,
      tajweedColors: true,
      tajweedRules: { qalqalah: { color: "red" }, "hamzat-wasl": { look: "hidden" } },
    };
    expect(saveReaderSettings).toHaveBeenCalledWith(saved);
    expect(onSubmit).toHaveBeenCalledWith(saved);
  });

  it("clears a rule's color with None", async () => {
    const { user, onSubmit } = renderSettings();

    await pickColor(user, "Ikhfa", "None");
    await save(user, onSubmit);

    expect(saveReaderSettings).toHaveBeenCalledWith({
      ...readerSettings,
      tajweedColors: true,
      tajweedRules: { ikhfa: { color: "none" } },
    });
  });

  it("turns the tajweed colors off, keeping the rules", async () => {
    const tajweedRules = { "hamzat-wasl": { look: "hidden" as const } };
    const { user, onSubmit } = renderSettings({ ...readerSettings, tajweedRules });

    await user.click(screen.getByRole("switch", { name: "Tajweed Colors" }));
    await save(user, onSubmit);

    expect(saveReaderSettings).toHaveBeenCalledWith({ ...readerSettings, tajweedColors: false, tajweedRules });
  });

  it("resets every rule to its default", async () => {
    const { user, onSubmit } = renderSettings({
      ...readerSettings,
      tajweedColors: false,
      tajweedRules: { qalqalah: { color: "red", look: "hidden" }, ikhfa: { color: "none" } },
    });

    await user.click(screen.getByRole("button", { name: "Reset to Defaults" }));

    expect(screen.getByRole("switch", { name: "Tajweed Colors" })).toBeChecked();
    expect(screen.getByText("Lime")).toBeInTheDocument();
    expect(screen.getAllByRole("radio", { name: "Normal", checked: true })).toHaveLength(26);
    await save(user, onSubmit);
    const [saved] = vi.mocked(saveReaderSettings).mock.lastCall!;
    expect(saved).toEqual({ ...readerSettings, tajweedColors: true });
    expect(saved.tajweedRules).toBeUndefined();
  });
});
