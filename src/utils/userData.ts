import { isEqual, isPlainObject, keyBy, pickBy, sortBy } from "lodash-es";
import { z } from "zod";

import type { HadithRef } from "@/utils/hadithPack";
import lf from "@/utils/localforage";

export const FAVES_KEY = "faves-quran";
// Hadiths have their own keys, so a tab still running an older version never rewrites them
export const HADITH_FAVES_KEY = "faves-hadith";
/** Counts local changes, so a sync knows whether there's anything to upload */
export const CHANGE_KEY = "user-data-change";
const VERSION_KEY = "user-data-version";
const NOTES_PREFIX = "notes-quran-";
const HADITH_NOTES_PREFIX = "notes-hadith-";
const HADITH_PREFIX = "hadith:";
const VERSE_KEY = /^\d+:\d+$/;
const HADITH_KEY = /^hadith:[a-z-]+\/\d+\/[\w.]+$/;
const ITEM_KEY = new RegExp(`${VERSE_KEY.source}|${HADITH_KEY.source}`);
const FAVES_PATTERNS: Record<string, RegExp> = { [FAVES_KEY]: VERSE_KEY, [HADITH_FAVES_KEY]: HADITH_KEY };
const FAVES_KEYS = Object.keys(FAVES_PATTERNS);

export const verseKey = (chapter: number, verse: number) => `${chapter}:${verse}`;
export const hadithKey = ({ collection, book, id }: HadithRef) => `${HADITH_PREFIX}${collection}/${book}/${id}`;
export const isHadithKey = (key: string) => HADITH_KEY.test(key);
export const toHadithRef = (key: string): HadithRef => {
  const [collection, book, id] = key.slice(HADITH_PREFIX.length).split("/");
  return { collection, book: Number(book), id };
};
const favesKeyOf = (itemKey: string) => (isHadithKey(itemKey) ? HADITH_FAVES_KEY : FAVES_KEY);

/** The localforage key of a verse's or a hadith's notes */
export const noteKey = (itemKey: string) =>
  isHadithKey(itemKey)
    ? `${HADITH_NOTES_PREFIX}${itemKey.slice(HADITH_PREFIX.length)}`
    : `${NOTES_PREFIX}${itemKey.replace(":", "-")}`;
const itemKeyOf = (key: string) =>
  key.startsWith(HADITH_NOTES_PREFIX)
    ? `${HADITH_PREFIX}${key.slice(HADITH_NOTES_PREFIX.length)}`
    : key.slice(NOTES_PREFIX.length).replace("-", ":");

/** Whether a localforage key holds favorites or notes */
export const isUserDataKey = (key: string) =>
  FAVES_KEYS.includes(key) || key.startsWith(NOTES_PREFIX) || key.startsWith(HADITH_NOTES_PREFIX);

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
  version: z.union([z.literal(2), z.literal(3)]),
  faves: z.record(z.string().regex(ITEM_KEY), faveSchema),
  notes: z.record(z.string().regex(ITEM_KEY), z.array(noteSchema)),
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

export const toUserDataFile = (data: UserData) => ({ app: "muallimlive", version: 3, ...data });

// Stored values are validated item by item, so one bad item never hides or uploads the rest
const validFaves = (value: unknown, pattern = ITEM_KEY): Record<string, FaveEntry> =>
  isPlainObject(value)
    ? Object.fromEntries(
        Object.entries(value as object).filter(
          ([key, fave]) => pattern.test(key) && faveSchema.safeParse(fave).success,
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

const noteStorageKeys = async () =>
  (await lf.keys()).filter((key) => key.startsWith(NOTES_PREFIX) || key.startsWith(HADITH_NOTES_PREFIX));

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

const readFaveRecord = async (favesKey: string) => {
  await ensureConverted();
  return validFaves(await lf.getItem(favesKey), FAVES_PATTERNS[favesKey]);
};
const readNoteList = async (key: string) => {
  await ensureConverted();
  return validNotes(await lf.getItem(key));
};

export const getChangeCount = async () => (await lf.getItem<number>(CHANGE_KEY)) ?? 0;
const countChange = async () => lf.setItem(CHANGE_KEY, (await getChangeCount()) + 1);

export const readFaves = async () =>
  (await Promise.all(FAVES_KEYS.map(async (key) => liveFaves(await readFaveRecord(key))))).flat();
export const readNotes = async (itemKey: string) => liveNotes(await readNoteList(noteKey(itemKey)));

export const setFave = async (itemKey: string, faved: boolean) => {
  const favesKey = favesKeyOf(itemKey);
  const faves = await readFaveRecord(favesKey);
  const entry: FaveEntry = faved ? { updatedAt: Date.now() } : { updatedAt: Date.now(), deleted: true };
  await lf.setItem(favesKey, { ...faves, [itemKey]: entry });
  await countChange();
};

const saveNotes = async (itemKey: string, update: (notes: Note[]) => Note[]) => {
  const key = noteKey(itemKey);
  await lf.setItem(key, update(await readNoteList(key)));
  await countChange();
};

export const addNote = (itemKey: string, html: string) => {
  const now = Date.now();
  return saveNotes(itemKey, (notes) => [...notes, { id: crypto.randomUUID(), html, createdAt: now, updatedAt: now }]);
};

export const updateNote = (itemKey: string, id: string, html: string) =>
  saveNotes(itemKey, (notes) => notes.map((n) => (n.id === id ? { ...n, html, updatedAt: Date.now() } : n)));

// Deleted notes keep only what the merge needs
const deleted = (n: Note, now: number): Note => ({
  id: n.id,
  html: "",
  createdAt: n.createdAt,
  updatedAt: now,
  deleted: true,
});

export const deleteNote = (itemKey: string, id: string) =>
  saveNotes(itemKey, (notes) => notes.map((n) => (n.id === id ? deleted(n, Date.now()) : n)));

export const readAll = async (): Promise<UserData> => {
  const records = await Promise.all(FAVES_KEYS.map(readFaveRecord));
  const notes: Record<string, Note[]> = {};
  for (const key of await noteStorageKeys()) {
    const list = await readNoteList(key);
    const itemKey = itemKeyOf(key);
    if (list.length > 0 && ITEM_KEY.test(itemKey) && noteKey(itemKey) === key) {
      notes[itemKey] = list;
    }
  }
  return { faves: Object.assign({}, ...records), notes };
};

/** Merges data into this device's, writing only the keys that change. Not counted as a local change. */
export const writeMerged = async (data: UserData) => {
  // each value is merged with what's stored just before writing it, so an edit made during a sync isn't overwritten
  for (const favesKey of FAVES_KEYS) {
    const faves = await readFaveRecord(favesKey);
    const incoming = pickBy(data.faves, (_, key) => FAVES_PATTERNS[favesKey].test(key));
    const nextFaves = mergeUserData({ faves, notes: {} }, { faves: incoming, notes: {} }).faves;
    if (!isEqual(nextFaves, faves)) {
      await lf.setItem(favesKey, nextFaves);
    }
  }
  for (const [key, notes] of Object.entries(data.notes)) {
    const current = await readNoteList(noteKey(key));
    const next = mergeUserData({ faves: {}, notes: { [key]: current } }, { faves: {}, notes: { [key]: notes } }).notes[
      key
    ];
    if (!isEqual(next, current)) {
      await lf.setItem(noteKey(key), next);
    }
  }
};

export const importData = async (data: UserData) => {
  await writeMerged(data);
  await countChange();
  return countLive(data);
};

export const clearAll = async () => {
  for (const key of [...FAVES_KEYS, ...(await noteStorageKeys())]) {
    await lf.removeItem(key);
  }
};

export const deleteEverywhere = async () => {
  const now = Date.now();
  const { faves, notes } = await readAll();
  for (const favesKey of FAVES_KEYS) {
    await lf.setItem(
      favesKey,
      Object.fromEntries(
        Object.keys(faves)
          .filter((key) => FAVES_PATTERNS[favesKey].test(key))
          .map((key) => [key, { updatedAt: now, deleted: true }]),
      ),
    );
  }
  for (const [key, list] of Object.entries(notes)) {
    await lf.setItem(
      noteKey(key),
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
