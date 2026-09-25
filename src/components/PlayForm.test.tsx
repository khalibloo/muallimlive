import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TestProviders from "@/components/test/TestProviders";
import PlayForm from "./PlayForm";
import { savePlayerSettings } from "./savePlayerSettings";

vi.mock("./savePlayerSettings", () => ({
  savePlayerSettings: vi.fn(),
}));

const recitation = (id: number, name: string, style: string): Recitation => ({
  id,
  reciter_name: name,
  style,
  translated_name: { name, language_name: "english" },
});

const recitations: GetRecitationsResponse = {
  recitations: [
    recitation(2, "Mishari Rashid al-`Afasy", ""),
    recitation(1, "AbdulBaset AbdulSamad", "Mujawwad"),
    recitation(3, "Hani ar-Rifai", "Murattal"),
  ],
};

const renderForm = (onSubmit = vi.fn()) => {
  const user = userEvent.setup();
  render(
    <TestProviders>
      <PlayForm
        recitations={recitations}
        verseCount={7}
        playSettings={{ reciter: 1, hideTafsirs: true }}
        onSubmit={onSubmit}
      />
    </TestProviders>,
  );
  return { user, onSubmit };
};

describe("PlayForm", () => {
  it("plays the entire surah with the saved settings by default", async () => {
    const { user, onSubmit } = renderForm();

    expect(screen.getByText("AbdulBaset AbdulSamad (Mujawwad)")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Hide Tafsirs" })).toBeChecked();
    expect(screen.getByText("Entire Surah")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: "From Verse" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Play" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ reciter: 1, hideTafsirs: true, start: 1, end: 7 }));
    expect(savePlayerSettings).toHaveBeenCalledWith({ reciter: 1, hideTafsirs: true });
  });

  it("lists reciters alphabetically without reordering the props", async () => {
    const { user } = renderForm();
    const originalOrder = recitations.recitations.map((r) => r.id);

    await user.click(screen.getByRole("combobox", { name: "Audio Reciter" }));

    // the dropdown is portalled after the selected value, so its options are the last matches in DOM order
    const options = (await screen.findAllByText(/AbdulBaset|Hani|Mishari/)).slice(-3);
    expect(options.map((o) => o.textContent)).toEqual([
      "AbdulBaset AbdulSamad (Mujawwad)",
      "Hani ar-Rifai (Murattal)",
      "Mishari Rashid al-`Afasy",
    ]);
    expect(recitations.recitations.map((r) => r.id)).toEqual(originalOrder);
  });

  it("saves the chosen reciter and tafsir visibility", async () => {
    const { user, onSubmit } = renderForm();

    await user.click(screen.getByRole("combobox", { name: "Audio Reciter" }));
    await user.click((await screen.findAllByText("Hani ar-Rifai (Murattal)")).at(-1)!);
    await user.click(screen.getByRole("checkbox", { name: "Hide Tafsirs" }));
    await user.click(screen.getByRole("button", { name: "Play" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ reciter: 3, hideTafsirs: false, start: 1, end: 7 }));
    expect(savePlayerSettings).toHaveBeenCalledWith({ reciter: 3, hideTafsirs: false });
  });

  it("plays a verse range", async () => {
    const { user, onSubmit } = renderForm();

    await user.click(screen.getByRole("combobox", { name: "Recite" }));
    await user.click((await screen.findAllByText("Verse Range")).at(-1)!);

    const from = await screen.findByRole("spinbutton", { name: "From Verse" });
    const to = screen.getByRole("spinbutton", { name: "To Verse" });
    expect(from).toHaveValue("1");
    expect(to).toHaveValue("7");

    await user.clear(from);
    await user.type(from, "3");
    await user.clear(to);
    await user.type(to, "5");
    await user.click(screen.getByRole("button", { name: "Play" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ reciter: 1, hideTafsirs: true, start: 3, end: 5 }));
  });

  it("requires the verse range bounds", async () => {
    const { user, onSubmit } = renderForm();

    await user.click(screen.getByRole("combobox", { name: "Recite" }));
    await user.click((await screen.findAllByText("Verse Range")).at(-1)!);
    await user.clear(await screen.findByRole("spinbutton", { name: "From Verse" }));
    await user.clear(screen.getByRole("spinbutton", { name: "To Verse" }));
    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(await screen.findByText("Please select start")).toBeInTheDocument();
    expect(screen.getByText("Please select end")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
