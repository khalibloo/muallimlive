import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TestProviders from "@/components/test/TestProviders";
import lf from "@/utils/localforage";
import { readFaves, setFave, toUserDataFile, verseKey } from "@/utils/userData";
import { SyncContext, type SyncContextValue } from "./SyncProvider";
import SyncSettings from "./SyncSettings";

vi.mock("next/navigation", () => ({ usePathname: () => "/chapters/2" }));

const actions = () => ({
  syncing: false,
  syncNow: vi.fn(async () => {}),
  stop: vi.fn(async () => {}),
  clearDevice: vi.fn(async () => {}),
  deleteEverywhere: vi.fn(async () => {}),
});

const renderSettings = (sync: Partial<SyncContextValue> = {}) => {
  const value = { ...actions(), ...sync };
  const user = userEvent.setup();
  render(
    <TestProviders>
      <SyncContext value={value}>
        <SyncSettings />
      </SyncContext>
    </TestProviders>,
  );
  return { user, value };
};

const syncing = { state: { accountId: "u", email: "reader@example.com", lastSyncedAt: Date.now() - 60_000 } };

describe("SyncSettings", () => {
  beforeEach(async () => {
    await lf.clear();
  });

  it("offers to sync with Google Drive", () => {
    renderSettings();

    expect(screen.getByRole("link", { name: "Sync with Google Drive" })).toHaveAttribute(
      "href",
      "/api/sync/login?returnTo=%2Fchapters%2F2",
    );
    expect(screen.queryByRole("button", { name: "Delete from all devices" })).not.toBeInTheDocument();
  });

  it("can't connect offline", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderSettings();

    expect(screen.getByText("You're offline. Connect to the internet to sign in to Google.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sync with Google Drive" })).toBeDisabled();
    vi.restoreAllMocks();
  });

  it("shows the account and when it last synced", async () => {
    const { user, value } = renderSettings(syncing);

    expect(screen.getByText("Syncing as reader@example.com")).toBeInTheDocument();
    expect(screen.getByText("Last synced 1 minute ago")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sync now" }));
    expect(value.syncNow).toHaveBeenCalled();
  });

  it("says when the last sync failed", () => {
    renderSettings({ ...syncing, lastError: "network" });

    expect(screen.getByText("Last sync failed, will retry")).toBeInTheDocument();
  });

  it("stops syncing after confirming", async () => {
    const { user, value } = renderSettings(syncing);

    await user.click(screen.getByRole("button", { name: "Stop syncing" }));
    await user.click(await screen.findByRole("button", { name: "Yes" }));

    expect(value.stop).toHaveBeenCalled();
  });

  it("imports a backup by merging it", async () => {
    await setFave(verseKey(1, 1), true);
    const { user } = renderSettings();
    const file = new File(
      [JSON.stringify(toUserDataFile({ faves: { "2:2": { updatedAt: 1 } }, notes: {} }))],
      "backup.json",
      { type: "application/json" },
    );

    await user.upload(screen.getByLabelText("Import"), file);

    expect(await screen.findByText("Imported 1 favorite and 0 notes")).toBeInTheDocument();
    expect(await readFaves()).toEqual(["1:1", "2:2"]);
  });

  it("rejects a file that isn't a backup", async () => {
    const { user } = renderSettings();

    await user.upload(screen.getByLabelText("Import"), new File(["{}"], "other.json", { type: "application/json" }));

    expect(await screen.findByText("This isn't a MuallimLive backup file")).toBeInTheDocument();
  });

  it("clears this device after confirming, saying Drive keeps its copy", async () => {
    const { user, value } = renderSettings(syncing);

    await user.click(screen.getByRole("button", { name: "Clear this device" }));
    expect(
      await screen.findByText(
        "Delete the favorites and notes on this device and stop syncing? The copy in Google Drive is kept.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yes" }));

    expect(value.clearDevice).toHaveBeenCalled();
  });

  it("deletes from all devices after confirming", async () => {
    const { user, value } = renderSettings(syncing);

    await user.click(screen.getByRole("button", { name: "Delete from all devices" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete from all devices?" });
    expect(within(dialog).getByRole("button", { name: "Export first" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Delete from all devices" }));

    await waitFor(() => expect(value.deleteEverywhere).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: "Google Drive's app settings" })).toHaveAttribute(
      "href",
      "https://drive.google.com/drive/settings",
    );
  });
});
