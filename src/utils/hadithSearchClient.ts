import type {
  HadithSearchCollection,
  HadithSearchMessage,
  HadithSearchRequest,
  HadithSearchResult,
} from "./hadithSearch";

// Runs the hadith search in a worker, so building an index never blocks the page, and running out of memory
// only stops the worker

/** The worker crashed, for example out of memory, or couldn't start; a new one starts with the next request */
export class HadithSearchStopped extends Error {}

type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void };

let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, Pending>();

const getWorker = () => {
  if (!worker) {
    const started = new Worker(new URL("./hadithSearch.worker.ts", import.meta.url), { type: "module" });
    started.onmessage = ({ data }: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
      const request = pending.get(data.id);
      pending.delete(data.id);
      if (data.error === undefined) {
        request?.resolve(data.result);
      } else {
        request?.reject(new Error(data.error));
      }
    };
    // an uncaught error in the worker comes with its message; a worker that failed to load or crashed has none
    started.onerror = (event) => {
      started.terminate();
      worker = undefined;
      const cause = event instanceof ErrorEvent && event.message ? event.message : "The worker stopped or didn't start";
      pending.forEach((request) => request.reject(new HadithSearchStopped(cause)));
      pending.clear();
    };
    worker = started;
  }
  return worker;
};

const send = <T>(message: HadithSearchMessage) =>
  new Promise<T>((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve: (value) => resolve(value as T), reject });
    getWorker().postMessage({ id, message });
  });

export const searchHadiths = (request: HadithSearchRequest) => send<HadithSearchResult>({ type: "search", ...request });

export const listNarrators = (collections: HadithSearchCollection[]) =>
  send<string[]>({ type: "narrators", collections });
