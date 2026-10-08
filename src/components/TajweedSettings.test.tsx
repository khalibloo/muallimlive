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
  const onCancel = vi.fn();
  render(
    <TestProviders>
      <TajweedSettings readerSettings={settings} onSubmit={onSubmit} onCancel={onCancel} />
    </TestProviders>,
  );
  return { user, onSubmit, onCancel };
};

const ruleGroup = (rule: string) => screen.getByRole("group", { name: rule });

const colorFor = (rule: string) => within(ruleGroup(rule)).getByRole("combobox", { name: "Color" });

const lookFor = (rule: string) => within(ruleGroup(rule)).getByRole("combobox", { name: "Look" });

// the Select's accessible options can't be clicked in jsdom, so click the visible one, rendered after
// the rules that already show this choice
const pick = async (user: ReturnType<typeof userEvent.setup>, box: HTMLElement, choice: string) => {
  await user.type(box, choice);
  await user.click((await screen.findAllByTitle(choice)).at(-1)!);
};

const pickColor = (user: ReturnType<typeof userEvent.setup>, rule: string, color: string) =>
  pick(user, colorFor(rule), color);

const pickLook = (user: ReturnType<typeof userEvent.setup>, rule: string, look: string) =>
  pick(user, lookFor(rule), look);

const lookOf = (rule: string) => within(ruleGroup(rule)).getByText(/^(Normal|Faded|Hidden)$/);

const save = async (user: ReturnType<typeof userEvent.setup>, onSubmit: ReturnType<typeof vi.fn>) => {
  await user.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
};

const previewedVerse = () => within(screen.getByRole("region", { name: "Preview" })).getByText(/^Verse \d+:\d+$/);

describe("TajweedSettings", () => {
  it("explains every group under its heading", () => {
    renderSettings();

    for (const [heading, description] of [
      ["Hamzat al-Wasl", /^The connecting alif/],
      ["Madd", /^Vowels held long/],
      ["Qalqalah", /^The echoing bounce/],
      ["Noon & Meem", /^How a noon or meem/],
      ["Ra & Lam", /^Whether ra and lam/],
      ["Other", /^Letters written but/],
    ] as const) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
      expect(screen.getByText(description)).toBeInTheDocument();
    }
  });

  it("lists every rule with a labeled color and look, set to its default color and the normal look", () => {
    renderSettings();

    expect(screen.getByRole("switch", { name: "Tajweed Colors" })).toBeChecked();
    // a fieldset per group, and one per rule in the groups with several
    expect(screen.getAllByRole("group")).toHaveLength(30);
    expect(screen.getAllByRole("combobox", { name: "Color" })).toHaveLength(26);
    expect(screen.getAllByRole("combobox", { name: "Look" })).toHaveLength(26);
    expect(within(ruleGroup("Madd")).getByRole("group", { name: "Madd Wajib (4–5 counts)" })).toBeInTheDocument();
    expect(within(ruleGroup("Madd Wajib (4–5 counts)")).getByText("Red")).toBeInTheDocument();
    expect(within(ruleGroup("Hamzat al-Wasl")).getByText("Sky")).toBeInTheDocument();
    expect(lookOf("Qalqalah")).toHaveTextContent("Normal");
    expect(screen.getAllByText("Normal")).toHaveLength(26);
  });

  it("labels each field with a label element", () => {
    renderSettings();

    expect(within(ruleGroup("Qalqalah")).getByLabelText("Color")).toBe(colorFor("Qalqalah"));
    expect(within(ruleGroup("Qalqalah")).getByLabelText("Look")).toBe(lookFor("Qalqalah"));
  });

  it("names a group's only rule by its heading, without repeating it", () => {
    renderSettings();

    expect(within(ruleGroup("Qalqalah")).getByText("Lime")).toBeInTheDocument();
    expect(screen.getAllByText("Qalqalah")).toHaveLength(1);
    expect(screen.getAllByText("Hamzat al-Wasl")).toHaveLength(1);
  });

  it("shows the saved choices", () => {
    renderSettings({
      ...readerSettings,
      tajweedColors: false,
      tajweedRules: { qalqalah: { color: "red", look: "faded" } },
    });

    expect(screen.getByRole("switch", { name: "Tajweed Colors" })).not.toBeChecked();
    expect(within(ruleGroup("Qalqalah")).getByText("Red")).toBeInTheDocument();
    expect(lookOf("Qalqalah")).toHaveTextContent("Faded");
  });

  it("previews a verse showing the rule being edited", async () => {
    const { user } = renderSettings();

    expect(previewedVerse()).toHaveTextContent("Verse 30:23");
    await user.click(colorFor("Izhar"));
    expect(previewedVerse()).toHaveTextContent("Verse 79:38");
    // this verse shows hamzat al-wasl too, so it stays
    await pickLook(user, "Hamzat al-Wasl", "Faded");
    expect(previewedVerse()).toHaveTextContent("Verse 79:38");
    await pickLook(user, "Ta Marbutah", "Hidden");
    expect(previewedVerse()).toHaveTextContent("Verse 69:1");
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

    expect(screen.getByRole("switch", { name: "Tajweed Colors" })).toHaveAccessibleDescription(
      /faded and hidden rules still apply/i,
    );
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
    expect(within(ruleGroup("Qalqalah")).getByText("Lime")).toBeInTheDocument();
    expect(screen.getAllByText("Normal")).toHaveLength(26);
    await save(user, onSubmit);
    const [saved] = vi.mocked(saveReaderSettings).mock.lastCall!;
    expect(saved).toEqual({ ...readerSettings, tajweedColors: true });
    expect(saved.tajweedRules).toBeUndefined();
  });

  it("discards the changes on cancel", async () => {
    const { user, onSubmit, onCancel } = renderSettings();

    await pickColor(user, "Qalqalah", "Red");
    await pickLook(user, "Qalqalah", "Hidden");
    await user.click(screen.getByRole("switch", { name: "Tajweed Colors" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalled();
    expect(saveReaderSettings).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("switch", { name: "Tajweed Colors" })).toBeChecked();
    expect(within(ruleGroup("Qalqalah")).getByText("Lime")).toBeInTheDocument();
    expect(lookOf("Qalqalah")).toHaveTextContent("Normal");
  });
});
