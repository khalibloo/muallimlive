import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { stubDrive } from "@/components/test/fakeDrive";
import TestProviders from "@/components/test/TestProviders";
import lf from "@/utils/localforage";
import { SYNC_STATE_KEY, forgetToken, type SyncState } from "@/utils/sync";
import { hasLiveData, readFaves, setFave, toUserDataFile } from "@/utils/userData";
import SyncProvider, { useSync } from "./SyncProvider";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const ACCOUNT = { accountId: "user-1", email: "reader@example.com" };
const driveFaves = (faves: string[]) => ({
  faves: Object.fromEntries(faves.map((f) => [f, { updatedAt: 1 }])),
  notes: {},
});

const Status = () => {
  const { state, lastError, deleteEverywhere } = useSync();
  return (
    <>
      <p>{state ? `syncing ${state.email} ${lastError ?? "ok"}` : "not syncing"}</p>
      <button onClick={deleteEverywhere}>Delete everywhere</button>
    </>
  );
};

const renderProvider = () => {
  const user = userEvent.setup();
  render(
    <TestProviders>
      <SyncProvider>
        <Status />
      </SyncProvider>
    </TestProviders>,
  );
  return user;
};

describe("SyncProvider", () => {
  beforeEach(async () => {
    await lf.clear();
    forgetToken();
    window.history.replaceState(null, "", "/");
  });

  it("syncs on start", async () => {
    stubDrive(driveFaves(["2:2"]));
    await lf.setItem(SYNC_STATE_KEY, ACCOUNT);
    renderProvider();

    expect(await screen.findByText("syncing reader@example.com ok")).toBeInTheDocument();
    await waitFor(async () => expect(await readFaves()).toEqual(["2:2"]));
  });

  it("connects when returning from Google and drops the query", async () => {
    stubDrive(driveFaves(["2:2"]));
    window.history.replaceState(null, "", "/chapters/2?sync=connected");
    renderProvider();

    expect(await screen.findByText("syncing reader@example.com ok")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it.each([401, 503])("reports a connection that fails with %i, saving nothing", async (status) => {
    const { drive } = stubDrive();
    drive.tokenStatus = status;
    window.history.replaceState(null, "", "/?sync=connected");
    renderProvider();

    expect(await screen.findByText("Couldn't connect to Google Drive")).toBeInTheDocument();
    expect(await lf.getItem(SYNC_STATE_KEY)).toBeNull();
    expect(window.location.search).toBe("");
  });

  it("reports a failed sign-in", async () => {
    stubDrive();
    window.history.replaceState(null, "", "/?sync=failed");
    renderProvider();

    expect(await screen.findByText("Couldn't connect to Google Drive")).toBeInTheDocument();
  });

  it("asks before combining data, then merges", async () => {
    stubDrive(driveFaves(["2:2"]));
    await setFave(1, 1, true);
    window.history.replaceState(null, "", "/?sync=connected");
    const user = renderProvider();

    await user.click(await screen.findByRole("button", { name: "Merge" }));

    await waitFor(async () => expect(await readFaves()).toEqual(["1:1", "2:2"]));
  });

  it("shows the reauth dialog when Google revoked access", async () => {
    const { drive } = stubDrive();
    drive.tokenStatus = 401;
    await lf.setItem<SyncState>(SYNC_STATE_KEY, ACCOUNT);
    const user = renderProvider();

    expect(await screen.findByRole("dialog", { name: "Sign in to Google again" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Stop syncing" }));
    expect(await screen.findByText("not syncing")).toBeInTheDocument();
  });

  it("syncs a few seconds after a change", async () => {
    const { stored } = stubDrive();
    await lf.setItem(SYNC_STATE_KEY, ACCOUNT);
    renderProvider();
    await waitFor(() => expect(stored()).toBeDefined());

    await setFave(3, 3, true);

    await waitFor(() => expect(Object.keys(stored().faves)).toContain("3:3"), { timeout: 5000 });
  });

  it("deletes everywhere what another device added since the last sync", async () => {
    const { drive, stored } = stubDrive(driveFaves(["2:2"]));
    await lf.setItem(SYNC_STATE_KEY, ACCOUNT);
    const user = renderProvider();
    await waitFor(async () => expect(await readFaves()).toEqual(["2:2"]));
    drive.file = { ...drive.file!, version: 2, content: JSON.stringify(toUserDataFile(driveFaves(["2:2", "4:4"]))) };

    await user.click(screen.getByRole("button", { name: "Delete everywhere" }));

    await waitFor(() => expect(hasLiveData(stored())).toBe(false));
    expect(Object.keys(stored().faves)).toEqual(["2:2", "4:4"]);
  });

  it("records a failure and keeps syncing", async () => {
    const { drive } = stubDrive(driveFaves([]));
    drive.file!.content = "not json";
    await lf.setItem(SYNC_STATE_KEY, ACCOUNT);
    renderProvider();

    expect(await screen.findByText("syncing reader@example.com invalid-file")).toBeInTheDocument();
  });
});
