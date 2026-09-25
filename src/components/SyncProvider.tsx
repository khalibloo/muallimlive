"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { App } from "antd";
import { useDebounceFn, useDocumentVisibility, useEventListener, useInterval } from "ahooks";
import { useTranslations } from "next-intl";

import lf from "@/utils/localforage";
import {
  SYNC_STATE_KEY,
  SyncError,
  finishConnect,
  startConnect,
  stopSyncing,
  syncNow,
  type ConnectChoice,
  type PendingConnect,
  type SyncErrorReason,
  type SyncState,
} from "@/utils/sync";
import { CHANGE_KEY, clearAll, deleteEverywhere } from "@/utils/userData";
import SyncDialogs from "./SyncDialogs";

export interface SyncContextValue {
  /** Set while syncing is on */
  state?: SyncState;
  syncing: boolean;
  lastError?: SyncErrorReason;
  syncNow: () => Promise<void>;
  stop: () => Promise<void>;
  clearDevice: () => Promise<void>;
  deleteEverywhere: () => Promise<void>;
}

const noop = async () => {};

export const SyncContext = createContext<SyncContextValue>({
  syncing: false,
  syncNow: noop,
  stop: noop,
  clearDevice: noop,
  deleteEverywhere: noop,
});

export const useSync = () => useContext(SyncContext);

const SYNC_INTERVAL = 5 * 60 * 1000;

const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useTranslations("common");
  const { message } = App.useApp();
  const visibility = useDocumentVisibility();
  const [state, setState] = useState<SyncState>();
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<SyncErrorReason>();
  const [pending, setPending] = useState<PendingConnect>();

  const handle = async (sync: () => Promise<unknown>) => {
    setSyncing(true);
    try {
      await sync();
      setLastError(undefined);
    } catch (e) {
      if (!(e instanceof SyncError)) {
        throw e;
      }
      // a revoked sign-in shows the reauth dialog through sync-state instead
      setLastError(e.reason === "reauth" ? undefined : e.reason);
    } finally {
      setSyncing(false);
    }
  };

  // syncNow skips by itself when sync is off or needs a new sign-in
  const run = async () => {
    if (navigator.onLine && !pending) {
      await handle(syncNow);
    }
  };
  const { run: runSoon } = useDebounceFn(run, { wait: 3000 });

  const connect = async () => {
    setSyncing(true);
    try {
      setPending(await startConnect());
    } catch {
      message.error(t("sync-connect-failed"));
    } finally {
      setSyncing(false);
    }
  };

  const choose = async (choice: ConnectChoice) => {
    const account = pending!;
    setPending(undefined);
    await handle(() => finishConnect(account, choice));
  };

  useEffect(() => {
    let cancelled = false;
    const subscriptions: Subscription[] = [];

    lf.ready().then(async () => {
      const saved = await lf.getItem<SyncState>(SYNC_STATE_KEY);
      if (cancelled) {
        return;
      }
      setState(saved ?? undefined);
      lf.configObservables({ crossTabNotification: true, crossTabChangeDetection: true });
      subscriptions.push(
        lf
          .newObservable({ key: SYNC_STATE_KEY, crossTabNotification: true })
          .subscribe({ next: (args) => setState(args.newValue ?? undefined) }),
        // local changes only: the tab that made a change syncs it
        lf.newObservable({ key: CHANGE_KEY, crossTabNotification: false }).subscribe({ next: runSoon }),
      );

      // back from Google's sign-in
      const url = new URL(window.location.href);
      const result = url.searchParams.get("sync");
      if (result) {
        url.searchParams.delete("sync");
        window.history.replaceState(null, "", url);
      }
      if (result === "failed") {
        message.error(t("sync-connect-failed"));
      }
      if (result === "connected") {
        connect();
      } else {
        run();
      }
    });

    return () => {
      cancelled = true;
      subscriptions.forEach((s) => s.unsubscribe());
    };
  }, []);

  useEventListener("visibilitychange", () => visibility === "visible" && run(), { target: () => document });
  useEventListener("online", run);
  useInterval(run, visibility === "visible" ? SYNC_INTERVAL : undefined);

  const stop = async () => {
    await stopSyncing();
    setLastError(undefined);
  };
  const clearDevice = async () => {
    if (state) {
      await stop();
    }
    await clearAll();
  };

  const value: SyncContextValue = {
    state,
    syncing,
    lastError,
    syncNow: run,
    stop,
    clearDevice,
    deleteEverywhere: async () => {
      await deleteEverywhere();
      await run();
    },
  };

  return (
    <SyncContext value={value}>
      {children}
      <SyncDialogs
        pending={pending}
        onChoose={choose}
        reauthEmail={state?.needsReauth ? state.email : undefined}
        onStop={stop}
        onClearAndStop={clearDevice}
      />
    </SyncContext>
  );
};

export default SyncProvider;
