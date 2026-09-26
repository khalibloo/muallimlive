import { stubDrive } from "@/components/test/fakeDrive";
import lf from "@/utils/localforage";
import {
  SYNC_STATE_KEY,
  SyncError,
  finishConnect,
  forgetToken,
  startConnect,
  stopSyncing,
  syncNow,
  type SyncState,
} from "./sync";
import { addNote, readFaves, readNotes, setFave, type UserData } from "./userData";

vi.mock("./userData", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./userData")>()),
  downloadBackup: vi.fn(),
}));

const ACCOUNT = { accountId: "user-1", email: "reader@example.com" };
const driveData = (faves: string[]): UserData => ({
  faves: Object.fromEntries(faves.map((f) => [f, { updatedAt: 1 }])),
  notes: {},
});
const startSyncing = (state: Partial<SyncState> = {}) => lf.setItem(SYNC_STATE_KEY, { ...ACCOUNT, ...state });
const syncState = () => lf.getItem<SyncState>(SYNC_STATE_KEY);
const uploads = (fetchMock: ReturnType<typeof stubDrive>["fetchMock"]) =>
  fetchMock.mock.calls.filter(([url]) => `${url}`.includes("/upload/")).length;

describe("syncNow", () => {
  beforeEach(async () => {
    await lf.clear();
    forgetToken();
  });

  it("does nothing when not syncing", async () => {
    const { fetchMock } = stubDrive();
    expect(await syncNow()).toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates the Drive file on the first sync", async () => {
    const { stored } = stubDrive();
    await setFave(1, 1, true);
    await startSyncing();

    expect(await syncNow()).toBe("synced");

    expect(stored()).toMatchObject({
      app: "muallimlive",
      version: 2,
      faves: { "1:1": { updatedAt: expect.any(Number) } },
    });
    expect(await syncState()).toMatchObject({ fileId: "file-1", lastVersion: "1", syncedChange: 1 });
  });

  it("merges Drive's data in and uploads the result", async () => {
    const { stored } = stubDrive(driveData(["2:2"]));
    await setFave(1, 1, true);
    await startSyncing();

    await syncNow();

    expect(await readFaves()).toEqual(["1:1", "2:2"]);
    expect(Object.keys(stored().faves)).toEqual(expect.arrayContaining(["1:1", "2:2"]));
    expect(await syncState()).toMatchObject({ lastVersion: "2" });
  });

  it("doesn't upload when Drive already has everything", async () => {
    const { fetchMock } = stubDrive(driveData(["2:2"]));
    await startSyncing();

    await syncNow();

    expect(await readFaves()).toEqual(["2:2"]);
    expect(uploads(fetchMock)).toBe(0);
  });

  it("skips downloading when neither side changed", async () => {
    const { fetchMock } = stubDrive(driveData(["2:2"]));
    await startSyncing();
    await syncNow();
    fetchMock.mockClear();

    expect(await syncNow()).toBe("unchanged");
    expect(fetchMock.mock.calls.some(([url]) => `${url}`.includes("alt=media"))).toBe(false);
  });

  it("never overwrites an invalid Drive file", async () => {
    const { drive, fetchMock } = stubDrive(driveData([]));
    drive.file!.content = '{"app":"other"}';
    await setFave(1, 1, true);
    await startSyncing();

    await expect(syncNow()).rejects.toEqual(new SyncError("invalid-file"));
    expect(uploads(fetchMock)).toBe(0);
  });

  it("asks to sign in again when Google revoked access", async () => {
    const { drive } = stubDrive();
    drive.tokenStatus = 401;
    await startSyncing();

    await expect(syncNow()).rejects.toEqual(new SyncError("reauth"));
    expect(await syncState()).toMatchObject({ needsReauth: true });
    expect(await syncNow()).toBe("skipped");
  });

  it("asks to sign in again instead of syncing another account's Drive", async () => {
    const { drive, fetchMock } = stubDrive(driveData(["2:2"]));
    drive.account = { accountId: "user-2", email: "other@example.com" };
    await setFave(1, 1, true);
    await startSyncing();

    await expect(syncNow()).rejects.toEqual(new SyncError("reauth"));
    expect(await syncState()).toMatchObject({ ...ACCOUNT, needsReauth: true });
    expect(await readFaves()).toEqual(["1:1"]);
    expect(uploads(fetchMock)).toBe(0);
  });

  it("only reports a failure when the token route is unavailable", async () => {
    const { drive } = stubDrive();
    drive.tokenStatus = 503;
    await startSyncing();

    await expect(syncNow()).rejects.toEqual(new SyncError("network"));
    expect(await syncState()).toEqual(ACCOUNT);
  });

  it("runs one sync at a time", async () => {
    stubDrive();
    await startSyncing();

    const [first, second] = await Promise.all([syncNow(), syncNow()]);

    expect([first, second]).toContain("busy");
  });

  it("keeps an edit made while syncing, and uploads it next time", async () => {
    const { fetchMock, stored } = stubDrive(driveData(["2:2"]));
    await startSyncing();
    const respond = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => {
      if (`${input}`.includes("alt=media")) {
        await addNote(1, 1, "<p>Written during the sync</p>");
      }
      return respond(input, init);
    });

    await syncNow();

    expect((await readNotes(1, 1)).map((n) => n.html)).toEqual(["<p>Written during the sync</p>"]);
    fetchMock.mockImplementation(respond);
    expect(await syncNow()).toBe("synced");
    expect(stored().notes["1:1"]).toHaveLength(1);
  });

  it("doesn't restart syncing when stopped during a sync", async () => {
    const { fetchMock } = stubDrive(driveData(["2:2"]));
    await startSyncing();
    const respond = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => {
      if (`${input}`.includes("alt=media")) {
        await lf.removeItem(SYNC_STATE_KEY);
      }
      return respond(input, init);
    });

    await syncNow();

    expect(await syncState()).toBeNull();
  });
});

describe("connecting", () => {
  beforeEach(async () => {
    await lf.clear();
    forgetToken();
  });

  it("downloads silently to a device without data", async () => {
    stubDrive(driveData(["2:2"]));

    expect(await startConnect()).toBeUndefined();

    expect(await readFaves()).toEqual(["2:2"]);
    expect(await syncState()).toMatchObject(ACCOUNT);
  });

  it("uploads silently to an empty Drive", async () => {
    const { stored } = stubDrive();
    await setFave(1, 1, true);

    expect(await startConnect()).toBeUndefined();
    expect(Object.keys(stored().faves)).toEqual(["1:1"]);
  });

  it("merges silently when signing in again to the same account", async () => {
    stubDrive(driveData(["2:2"]));
    await setFave(1, 1, true);
    await startSyncing({ needsReauth: true });

    expect(await startConnect()).toBeUndefined();
    expect(await readFaves()).toEqual(["1:1", "2:2"]);
    expect((await syncState())?.needsReauth).toBeUndefined();
  });

  it.each([
    ["unknown-account", undefined],
    ["other-account", { accountId: "user-2", email: "other@example.com" }],
  ])("asks when both sides have data (%s)", async (reason, stored) => {
    stubDrive(driveData(["2:2"]));
    await setFave(1, 1, true);
    if (stored) {
      await lf.setItem(SYNC_STATE_KEY, stored);
    }

    expect(await startConnect()).toEqual({ ...ACCOUNT, reason });
    expect(await readFaves()).toEqual(["1:1"]);
  });

  it("replaces this device's data after exporting it", async () => {
    const { downloadBackup } = await import("./userData");
    stubDrive(driveData(["2:2"]));
    await setFave(1, 1, true);

    await finishConnect(ACCOUNT, "replace");

    expect(downloadBackup).toHaveBeenCalled();
    expect(await readFaves()).toEqual(["2:2"]);
  });

  it("stops syncing and keeps the data", async () => {
    const { fetchMock } = stubDrive();
    await setFave(1, 1, true);
    await startSyncing();

    await stopSyncing();

    expect(fetchMock).toHaveBeenCalledWith("/api/sync/disconnect", { method: "POST" });
    expect(await syncState()).toBeNull();
    expect(await readFaves()).toEqual(["1:1"]);
  });
});
