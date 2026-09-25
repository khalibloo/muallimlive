import { isEqual } from "lodash-es";

import lf from "@/utils/localforage";
import {
  EMPTY_USER_DATA,
  clearAll,
  downloadBackup,
  getChangeCount,
  hasLiveData,
  mergeUserData,
  parseUserDataFile,
  readAll,
  toUserDataFile,
  writeMerged,
  type UserData,
} from "@/utils/userData";

export const SYNC_STATE_KEY = "sync-state";

export interface SyncAccount {
  accountId: string;
  email: string;
}

export interface SyncState extends SyncAccount {
  fileId?: string;
  /** Drive's version of the file when last synced */
  lastVersion?: string;
  lastSyncedAt?: number;
  /** The change counter covered by the last sync */
  syncedChange?: number;
  needsReauth?: true;
}

export type SyncErrorReason = "reauth" | "network" | "invalid-file";

export class SyncError extends Error {
  constructor(public reason: SyncErrorReason) {
    super(reason);
  }
}

export type SyncResult = "synced" | "unchanged" | "skipped" | "busy";
export type ConnectChoice = "merge" | "replace";
export interface PendingConnect extends SyncAccount {
  reason: "unknown-account" | "other-account";
}

const FILES = "https://www.googleapis.com/drive/v3/files";
const UPLOADS = "https://www.googleapis.com/upload/drive/v3/files";
const FILE_NAME = "muallimlive-data.json";
const FILE_FIELDS = "id,version";

interface DriveFile {
  id: string;
  version: string;
}

interface Token extends SyncAccount {
  accessToken: string;
  expiresAt: number;
}

let token: Token | undefined;

export const forgetToken = () => {
  token = undefined;
};

export const loginUrl = (returnTo: string) => `/api/sync/login?${new URLSearchParams({ returnTo })}`;

const getToken = async (fresh = false) => {
  if (!fresh && token && token.expiresAt - 60_000 > Date.now()) {
    return token;
  }
  let response: Response;
  try {
    response = await fetch("/api/sync/token", { method: "POST" });
  } catch {
    throw new SyncError("network");
  }
  if (response.status === 401) {
    forgetToken();
    throw new SyncError("reauth");
  }
  if (!response.ok) {
    throw new SyncError("network");
  }
  token = (await response.json()) as Token;
  return token;
};

const drive = async (url: string, init: RequestInit = {}) => {
  const { accessToken } = await getToken();
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${accessToken}` } });
  } catch {
    throw new SyncError("network");
  }
  if (response.status === 401) {
    // expired early; the next sync gets a new one
    forgetToken();
  }
  return response;
};

const findFile = async (fileId?: string): Promise<DriveFile | undefined> => {
  if (fileId) {
    const response = await drive(`${FILES}/${fileId}?fields=${FILE_FIELDS}`);
    if (response.ok) {
      return response.json();
    }
    if (response.status !== 404) {
      throw new SyncError("network");
    }
  }
  const query = new URLSearchParams({
    spaces: "appDataFolder",
    q: `name='${FILE_NAME}'`,
    fields: `files(${FILE_FIELDS})`,
  });
  const response = await drive(`${FILES}?${query}`);
  if (!response.ok) {
    throw new SyncError("network");
  }
  return ((await response.json()) as { files: DriveFile[] }).files[0];
};

const download = async (id: string) => {
  const response = await drive(`${FILES}/${id}?alt=media`);
  if (!response.ok) {
    throw new SyncError("network");
  }
  const data = parseUserDataFile(await response.json().catch(() => undefined));
  if (!data) {
    throw new SyncError("invalid-file");
  }
  return data;
};

const upload = async (data: UserData, id?: string): Promise<DriveFile> => {
  const content = new Blob([JSON.stringify(toUserDataFile(data))], { type: "application/json" });
  let response: Response;
  if (id) {
    response = await drive(`${UPLOADS}/${id}?uploadType=media&fields=${FILE_FIELDS}`, {
      method: "PATCH",
      body: content,
    });
  } else {
    const body = new FormData();
    const metadata = { name: FILE_NAME, parents: ["appDataFolder"] };
    body.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    body.append("file", content);
    response = await drive(`${UPLOADS}?uploadType=multipart&fields=${FILE_FIELDS}`, { method: "POST", body });
  }
  if (!response.ok) {
    throw new SyncError("network");
  }
  return response.json();
};

// Saves only while still syncing the same account, so stopping during a sync sticks
const saveState = async (accountId: string, update: Partial<SyncState>) => {
  const state = await lf.getItem<SyncState>(SYNC_STATE_KEY);
  if (state?.accountId === accountId) {
    await lf.setItem<SyncState>(SYNC_STATE_KEY, { ...state, ...update });
  }
};

let running = false;

// One sync at a time: across tabs with a Web Lock, and within this tab (or without Web Locks) with a flag
const exclusively = async (sync: () => Promise<SyncResult>): Promise<SyncResult> => {
  if (running) {
    return "busy";
  }
  running = true;
  try {
    return navigator.locks
      ? await navigator.locks.request("muallimlive-sync", { ifAvailable: true }, (lock) => (lock ? sync() : "busy"))
      : await sync();
  } finally {
    running = false;
  }
};

export const syncNow = () =>
  exclusively(async () => {
    const state = await lf.getItem<SyncState>(SYNC_STATE_KEY);
    if (!state || state.needsReauth) {
      return "skipped";
    }
    try {
      // read first, so a change made during this sync counts as unsynced
      const change = await getChangeCount();
      const file = await findFile(state.fileId);
      if (file && file.version === state.lastVersion && change === state.syncedChange) {
        await saveState(state.accountId, { lastSyncedAt: Date.now() });
        return "unchanged";
      }
      const remote = file ? await download(file.id) : EMPTY_USER_DATA;
      const merged = mergeUserData(await readAll(), remote);
      await writeMerged(merged);
      const saved = file && isEqual(merged, remote) ? file : await upload(merged, file?.id);
      await saveState(state.accountId, {
        fileId: saved.id,
        lastVersion: saved.version,
        lastSyncedAt: Date.now(),
        syncedChange: change,
      });
      return "synced";
    } catch (e) {
      if (e instanceof SyncError && e.reason === "reauth") {
        await saveState(state.accountId, { needsReauth: true });
      }
      throw e;
    }
  });

/** Starts syncing the account just signed in to, or returns the choice to ask when both sides have data */
export const startConnect = async (): Promise<PendingConnect | undefined> => {
  const { accountId, email } = await getToken(true);
  const state = await lf.getItem<SyncState>(SYNC_STATE_KEY);
  if (state?.accountId !== accountId && hasLiveData(await readAll())) {
    const file = await findFile();
    if (file && hasLiveData(await download(file.id))) {
      return { accountId, email, reason: state ? "other-account" : "unknown-account" };
    }
  }
  await finishConnect({ accountId, email }, "merge");
  return undefined;
};

export const finishConnect = async (account: SyncAccount, choice: ConnectChoice) => {
  if (choice === "replace") {
    await downloadBackup();
    await clearAll();
  }
  // a fresh state: the file and versions of a previous account don't apply
  await lf.setItem<SyncState>(SYNC_STATE_KEY, { accountId: account.accountId, email: account.email });
  return syncNow();
};

export const stopSyncing = async () => {
  // best effort: offline, the cookie stays until the next sign-in replaces it
  await fetch("/api/sync/disconnect", { method: "POST" }).catch(() => undefined);
  forgetToken();
  await lf.removeItem(SYNC_STATE_KEY);
};
