import type { HadithSearchMessage, HadithSearchRequest, HadithSearchResult } from "./hadithSearch";

// Runs the hadith search in a worker, so building an index never blocks the page, and running out of memory
// only stops the worker

/** The worker crashed, for example out of memory; a new one starts with the next request */
export class HadithSearchStopped extends Error {}

type Pending = { resolve: (value: never) => void; reject: (error: Error) => void };

let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, Pending>();

const getWorker = () => {
  if (!worker) {
    const started = new Worker(new URL("./hadithSearch.worker.ts", import.meta.url), { type: "module" });
    started.onmessage = ({ data }: MessageEvent<{ id: number; result?: never; error?: string }>) => {
      const request = pending.get(data.id);
      pending.delete(data.id);
      if (data.error === undefined) {
        request?.resolve(data.result!);
      } else {
        request?.reject(new Error(data.error));
      }
    };
    started.onerror = () => {
      started.terminate();
      worker = undefined;
      pending.forEach((request) => request.reject(new HadithSearchStopped()));
      pending.clear();
    };
    worker = started;
  }
  return worker;
};

const send = <T>(message: HadithSearchMessage) =>
  new Promise<T>((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve: resolve as Pending["resolve"], reject });
    getWorker().postMessage({ id, message });
  });

export const searchHadiths = (request: HadithSearchRequest) => send<HadithSearchResult>({ type: "search", ...request });

export const listNarrators = (collections: string[]) => send<string[]>({ type: "narrators", collections });
