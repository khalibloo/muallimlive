import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TestProviders from "@/components/test/TestProviders";
import lf from "@/utils/localforage";
import { liveFaves } from "@/utils/userData";
import Fave from "./Fave";

const storedFaves = async () => liveFaves(await lf.getItem("faves-quran"));

describe("Fave", () => {
  beforeEach(async () => {
    await lf.clear();
  });

  it("adds the verse to favorites when not faved", async () => {
    const user = userEvent.setup();
    await lf.setItem("faves-quran", ["2:5"]);
    render(
      <TestProviders>
        <Fave faved={false} itemKey="2:255" />
      </TestProviders>,
    );

    const button = screen.getByRole("button", { name: "Add to favorites" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await user.click(button);

    await waitFor(async () => expect(await storedFaves()).toEqual(["2:5", "2:255"]));
  });

  it("creates the favorites list when none is stored", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <Fave faved={false} itemKey="2:255" />
      </TestProviders>,
    );

    await user.click(screen.getByRole("button", { name: "Add to favorites" }));

    await waitFor(async () => expect(await storedFaves()).toEqual(["2:255"]));
  });

  it("removes the verse from favorites when faved", async () => {
    const user = userEvent.setup();
    await lf.setItem("faves-quran", ["2:255", "2:5"]);
    render(
      <TestProviders>
        <Fave faved itemKey="2:255" />
      </TestProviders>,
    );

    const button = screen.getByRole("button", { name: "Remove from favorites" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    await user.click(button);

    await waitFor(async () => expect(await storedFaves()).toEqual(["2:5"]));
  });

  it("counts toggling as a change to sync", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <Fave faved={false} itemKey="2:255" />
      </TestProviders>,
    );

    await user.click(screen.getByRole("button", { name: "Add to favorites" }));

    await waitFor(async () => expect(await lf.getItem("user-data-change")).toBe(1));
  });

  it("adds a hadith to favorites, apart from verse favorites", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <Fave faved={false} itemKey="hadith:bukhari/13/1" />
      </TestProviders>,
    );

    await user.click(screen.getByRole("button", { name: "Add to favorites" }));

    await waitFor(async () => expect(liveFaves(await lf.getItem("faves-hadith"))).toEqual(["hadith:bukhari/13/1"]));
    expect(await lf.getItem("faves-quran")).toBeNull();
  });
});
