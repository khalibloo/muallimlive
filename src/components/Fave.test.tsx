import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TestProviders from "@/components/test/TestProviders";
import lf from "@/utils/localforage";
import Fave from "./Fave";

describe("Fave", () => {
  beforeEach(async () => {
    await lf.clear();
  });

  it("adds the verse to favorites when not faved", async () => {
    const user = userEvent.setup();
    await lf.setItem("faves-quran", ["2:5"]);
    render(
      <TestProviders>
        <Fave faved={false} chapterNumber={1} verseNumber={3} />
      </TestProviders>,
    );

    const button = screen.getByRole("button", { name: "Add to favorites" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await user.click(button);

    await waitFor(async () => expect(await lf.getItem("faves-quran")).toEqual(["2:5", "1:3"]));
  });

  it("creates the favorites list when none is stored", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <Fave faved={false} chapterNumber={1} verseNumber={3} />
      </TestProviders>,
    );

    await user.click(screen.getByRole("button", { name: "Add to favorites" }));

    await waitFor(async () => expect(await lf.getItem("faves-quran")).toEqual(["1:3"]));
  });

  it("removes the verse from favorites when faved", async () => {
    const user = userEvent.setup();
    await lf.setItem("faves-quran", ["1:3", "2:5"]);
    render(
      <TestProviders>
        <Fave faved chapterNumber={1} verseNumber={3} />
      </TestProviders>,
    );

    const button = screen.getByRole("button", { name: "Remove from favorites" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    await user.click(button);

    await waitFor(async () => expect(await lf.getItem("faves-quran")).toEqual(["2:5"]));
  });
});
