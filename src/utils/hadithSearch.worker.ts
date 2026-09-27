import { handleMessage, type HadithSearchMessage } from "./hadithSearch";

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async ({ data }: MessageEvent<{ id: number; message: HadithSearchMessage }>) => {
  try {
    self.postMessage({ id: data.id, result: await handleMessage(data.message) });
  } catch (error) {
    self.postMessage({ id: data.id, error: error instanceof Error ? error.message : `${error}` });
  }
};
