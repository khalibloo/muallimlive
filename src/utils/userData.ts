import { isEqual, isPlainObject, keyBy, sortBy } from "lodash-es";
import { z } from "zod";

import lf from "@/utils/localforage";

export const FAVES_KEY = "faves-quran";
/** Counts local changes, so a sync knows whether there's anything to upload */
export const CHANGE_KEY = "user-data-change";
const VERSION_KEY = "user-data-version";
const NOTES_PREFIX = "notes-quran-";
const VERSE_KEY = /^\d+:\d+$/;

export const noteKey = (chapter: number, verse: number) => `${NOTES_PREFIX}${chapter}-${verse}`;
const storageKey = (verseKey: string) => `${NOTES_PREFIX}${verseKey.replace(":", "-")}`;
const verseKeyOf = (key: string) => key.slice(NOTES_PREFIX.length).replace("-", ":");

const faveSchema = z.object({ updatedAt: z.number(), deleted: z.literal(true).optional() });
const noteSchema = z.object({
  id: z.string().min(1),
  html: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deleted: z.literal(true).optional(),
});
const fileSchema = z.object({
  app: z.literal("muallimlive"),
  version: z.literal(2),
  faves: z.record(z.string().regex(VERSE_KEY), faveSchema),
  notes: z.record(z.string().regex(VERSE_KEY), z.array(noteSchema)),
});

export type FaveEntry = z.infer<typeof faveSchema>;
export type Note = z.infer<typeof noteSchema>;
export interface UserData {
  faves: Record<string, FaveEntry>;
  notes: Record<string, Note[]>;
}

export const EMPTY_USER_DATA: UserData = { faves: {}, notes: {} };

export const parseUserDataFile = (value: unknown): UserData | undefined => {
  const result = fileSchema.safeParse(value);
  return result.success ? { faves: result.data.faves, notes: result.data.notes } : undefined;
};

export const toUserDataFile = (data: UserData) => ({ app: "muallimlive", version: 2, ...data });

// Stored values are validated item by item, so one bad item never hides or uploads the rest
const validFaves = (value: unknown): Record<string, FaveEntry> =>
  isPlainObject(value)
    ? Object.fromEntries(
        Object.entries(value as object).filter(
          ([key, fave]) => VERSE_KEY.test(key) && faveSchema.safeParse(fave).success,
        ),
      )
    : {};
const validNotes = (value: unknown): Note[] =>
  Array.isArray(value) ? value.filter((n) => noteSchema.safeParse(n).success) : [];
const sortNotes = (notes: Note[]) => sortBy(notes, ["createdAt", "id"]);

export const liveFaves = (value: unknown) =>
  Object.entries(validFaves(value))
    .filter(([, fave]) => !fave.deleted)
    .map(([key]) => key);
export const liveNotes = (value: unknown) => sortNotes(validNotes(value).filter((n) => !n.deleted));

type Item = { updatedAt: number; deleted?: true; html?: string };
// The newer item wins; on a tie a deletion wins, then the larger text, so both sides merge the same way
const newer = <T extends Item>(a: T, b: T) => {
  if (a.updatedAt !== b.updatedAt) {
    return a.updatedAt > b.updatedAt ? a : b;
  }
  if (!a.deleted !== !b.deleted) {
    return a.deleted ? a : b;
  }
  if ((a.html ?? "") !== (b.html ?? "")) {
    return (a.html ?? "") > (b.html ?? "") ? a : b;
  }
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
};
const mergeRecords = <T extends Item>(a: Record<string, T>, b: Record<string, T>) => {
  const merged = { ...a };
  for (const [key, item] of Object.entries(b)) {
    merged[key] = key in merged ? newer(merged[key], item) : item;
  }
  return merged;
};

export const mergeUserData = (a: UserData, b: UserData): UserData => {
  const notes: Record<string, Note[]> = {};
  for (const key of new Set([...Object.keys(a.notes), ...Object.keys(b.notes)])) {
    notes[key] = sortNotes(
      Object.values(mergeRecords(keyBy(a.notes[key] ?? [], "id"), keyBy(b.notes[key] ?? [], "id"))),
    );
  }
  return { faves: mergeRecords(a.faves, b.faves), notes };
};

export const countLive = (data: UserData) => ({
  faves: Object.values(data.faves).filter((f) => !f.deleted).length,
  notes: Object.values(data.notes)
    .flat()
    .filter((n) => !n.deleted).length,
});
export const hasLiveData = (data: UserData) => {
  const { faves, notes } = countLive(data);
  return faves + notes > 0;
};

const noteStorageKeys = async () => (await lf.keys()).filter((key) => key.startsWith(NOTES_PREFIX));

// Faves used to be a list of verse keys and notes a list of HTML strings. Converting is idempotent, so two
// tabs converting at once can't damage the data.
export const ensureConverted = async () => {
  await lf.ready();
  if ((await lf.getItem(VERSION_KEY)) === 2) {
    return;
  }
  const now = Date.now();
  const faves = await lf.getItem(FAVES_KEY);
  if (Array.isArray(faves)) {
    const keys = faves.filter((f): f is string => typeof f === "string" && VERSE_KEY.test(f));
    await lf.setItem(FAVES_KEY, Object.fromEntries(keys.map((key) => [key, { updatedAt: now }])));
  } else if (faves !== null && !isPlainObject(faves)) {
    await lf.removeItem(FAVES_KEY);
  }
  for (const key of await noteStorageKeys()) {
    const notes = await lf.getItem(key);
    if (!Array.isArray(notes)) {
      await lf.removeItem(key);
    } else if (notes.some((n) => typeof n === "string")) {
      // notes sort by creation, so each one is a millisecond apart to keep their order
      await lf.setItem(
        key,
        notes.flatMap((n, i) =>
          typeof n === "string"
            ? [{ id: crypto.randomUUID(), html: n, createdAt: now + i, updatedAt: now }]
            : validNotes([n]),
        ),
      );
    }
  }
  await lf.setItem(VERSION_KEY, 2);
};

const readFaveRecord = async () => {
  await ensureConverted();
  return validFaves(await lf.getItem(FAVES_KEY));
};
const readNoteList = async (key: string) => {
  await ensureConverted();
  return validNotes(await lf.getItem(key));
};

export const getChangeCount = async () => (await lf.getItem<number>(CHANGE_KEY)) ?? 0;
const countChange = async () => lf.setItem(CHANGE_KEY, (await getChangeCount()) + 1);

export const readFaves = async () => liveFaves(await readFaveRecord());
export const readNotes = async (chapter: number, verse: number) =>
  liveNotes(await readNoteList(noteKey(chapter, verse)));

export const setFave = async (chapter: number, verse: number, faved: boolean) => {
  const faves = await readFaveRecord();
  const entry: FaveEntry = faved ? { updatedAt: Date.now() } : { updatedAt: Date.now(), deleted: true };
  await lf.setItem(FAVES_KEY, { ...faves, [`${chapter}:${verse}`]: entry });
  await countChange();
};

const saveNotes = async (chapter: number, verse: number, update: (notes: Note[]) => Note[]) => {
  const key = noteKey(chapter, verse);
  await lf.setItem(key, update(await readNoteList(key)));
  await countChange();
};

export const addNote = (chapter: number, verse: number, html: string) => {
  const now = Date.now();
  return saveNotes(chapter, verse, (notes) => [
    ...notes,
    { id: crypto.randomUUID(), html, createdAt: now, updatedAt: now },
  ]);
};

export const updateNote = (chapter: number, verse: number, id: string, html: string) =>
  saveNotes(chapter, verse, (notes) => notes.map((n) => (n.id === id ? { ...n, html, updatedAt: Date.now() } : n)));

// Deleted notes keep only what the merge needs
const deleted = (n: Note, now: number): Note => ({
  id: n.id,
  html: "",
  createdAt: n.createdAt,
  updatedAt: now,
  deleted: true,
});

export const deleteNote = (chapter: number, verse: number, id: string) =>
  saveNotes(chapter, verse, (notes) => notes.map((n) => (n.id === id ? deleted(n, Date.now()) : n)));

export const readAll = async (): Promise<UserData> => {
  const faves = await readFaveRecord();
  const notes: Record<string, Note[]> = {};
  for (const key of await noteStorageKeys()) {
    const list = await readNoteList(key);
    if (list.length > 0) {
      notes[verseKeyOf(key)] = list;
    }
  }
  return { faves, notes };
};

/** Merges data into this device's, writing only the verses that change. Not counted as a local change. */
export const writeMerged = async (data: UserData) => {
  // merged with what's stored now, so an edit made while a sync was downloading isn't overwritten
  const current = await readAll();
  const next = mergeUserData(current, data);
  if (!isEqual(next.faves, current.faves)) {
    await lf.setItem(FAVES_KEY, next.faves);
  }
  for (const [key, notes] of Object.entries(next.notes)) {
    if (!isEqual(notes, current.notes[key])) {
      await lf.setItem(storageKey(key), notes);
    }
  }
};

export const importData = async (data: UserData) => {
  await writeMerged(data);
  await countChange();
  return countLive(data);
};

export const clearAll = async () => {
  await lf.removeItem(FAVES_KEY);
  for (const key of await noteStorageKeys()) {
    await lf.removeItem(key);
  }
};

export const deleteEverywhere = async () => {
  const now = Date.now();
  const { faves, notes } = await readAll();
  await lf.setItem(
    FAVES_KEY,
    Object.fromEntries(Object.keys(faves).map((key) => [key, { updatedAt: now, deleted: true }])),
  );
  for (const [key, list] of Object.entries(notes)) {
    await lf.setItem(
      storageKey(key),
      list.map((n) => deleted(n, now)),
    );
  }
  await countChange();
};

export const downloadBackup = async () => {
  const blob = new Blob([JSON.stringify(toUserDataFile(await readAll()))], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `muallimlive-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
};
