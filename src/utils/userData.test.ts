import lf from "@/utils/localforage";
import {
  EMPTY_USER_DATA,
  FAVES_KEY,
  HADITH_FAVES_KEY,
  addNote,
  clearAll,
  countLive,
  deleteEverywhere,
  deleteNote,
  getChangeCount,
  hadithKey,
  hasLiveData,
  importData,
  isHadithKey,
  isUserDataKey,
  liveFaves,
  liveNotes,
  mergeUserData,
  noteKey,
  parseUserDataFile,
  readAll,
  readFaves,
  readNotes,
  setFave,
  toHadithRef,
  toUserDataFile,
  updateNote,
  verseKey,
  writeMerged,
  type Note,
  type UserData,
} from "./userData";

const note = (id: string, updatedAt: number, extra: Partial<Note> = {}): Note => ({
  id,
  html: `<p>${id}</p>`,
  createdAt: 1,
  updatedAt,
  ...extra,
});

describe("mergeUserData", () => {
  it("keeps the newer version of each item", () => {
    const a: UserData = { faves: { "1:1": { updatedAt: 2 } }, notes: { "1:1": [note("n", 5, { html: "new" })] } };
    const b: UserData = { faves: { "1:1": { updatedAt: 3, deleted: true } }, notes: { "1:1": [note("n", 4)] } };

    expect(mergeUserData(a, b)).toEqual({
      faves: { "1:1": { updatedAt: 3, deleted: true } },
      notes: { "1:1": [note("n", 5, { html: "new" })] },
    });
  });

  it("lets a deletion win a tie, and the larger text between live notes", () => {
    const deleted = note("n", 5, { html: "", deleted: true });
    expect(
      mergeUserData({ faves: {}, notes: { "1:1": [note("n", 5)] } }, { faves: {}, notes: { "1:1": [deleted] } }),
    ).toEqual({ faves: {}, notes: { "1:1": [deleted] } });

    const a = { faves: {}, notes: { "1:1": [note("n", 5, { html: "a" })] } };
    const b = { faves: {}, notes: { "1:1": [note("n", 5, { html: "b" })] } };
    expect(mergeUserData(a, b)).toEqual(b);
    expect(mergeUserData(b, a)).toEqual(b);
  });

  it("keeps items from both sides, sorted by creation", () => {
    const a: UserData = { faves: { "1:1": { updatedAt: 1 } }, notes: { "1:1": [note("x", 1, { createdAt: 2 })] } };
    const b: UserData = { faves: { "2:2": { updatedAt: 1 } }, notes: { "1:1": [note("y", 1, { createdAt: 1 })] } };

    expect(mergeUserData(a, b)).toEqual({
      faves: { "1:1": { updatedAt: 1 }, "2:2": { updatedAt: 1 } },
      notes: { "1:1": [note("y", 1, { createdAt: 1 }), note("x", 1, { createdAt: 2 })] },
    });
  });

  it("is commutative and idempotent", () => {
    const a: UserData = {
      faves: { "1:1": { updatedAt: 2 }, "1:2": { updatedAt: 1 } },
      notes: { "3:1": [note("a", 3)] },
    };
    const b: UserData = {
      faves: { "1:1": { updatedAt: 1, deleted: true } },
      notes: { "3:1": [note("a", 2), note("b", 1)] },
    };

    expect(mergeUserData(a, b)).toEqual(mergeUserData(b, a));
    expect(mergeUserData(mergeUserData(a, b), b)).toEqual(mergeUserData(a, b));
  });
});

describe("file schema", () => {
  const valid = {
    app: "muallimlive",
    version: 2,
    faves: { "1:3": { updatedAt: 1 } },
    notes: { "1:3": [note("n", 1)] },
  };

  it("accepts a valid file", () => {
    expect(parseUserDataFile(valid)).toEqual({ faves: valid.faves, notes: valid.notes });
    expect(parseUserDataFile(toUserDataFile({ faves: valid.faves, notes: valid.notes }))).toBeDefined();
  });

  it.each([
    ["another app", { ...valid, app: "other" }],
    ["an unknown version", { ...valid, version: 4 }],
    ["a bad verse key", { ...valid, faves: { "one:3": { updatedAt: 1 } } }],
    ["a note without an id", { ...valid, notes: { "1:3": [{ html: "", createdAt: 1, updatedAt: 1 }] } }],
    ["not an object", "hello"],
  ])("rejects %s", (_, file) => {
    expect(parseUserDataFile(file)).toBeUndefined();
  });
});

describe("stored data", () => {
  beforeEach(async () => {
    await lf.clear();
    vi.spyOn(Date, "now").mockReturnValue(1000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("converts the old lists once, skipping malformed values", async () => {
    await lf.setItem(FAVES_KEY, ["1:2", 5, "bad"]);
    await lf.setItem(noteKey(verseKey(1, 2)), ["<p>Old</p>", 7]);
    await lf.setItem(noteKey(verseKey(1, 3)), "not a list");

    expect(await readFaves()).toEqual(["1:2"]);
    const [converted] = await readNotes(verseKey(1, 2));
    expect(converted).toEqual({ id: expect.any(String), html: "<p>Old</p>", createdAt: 1000, updatedAt: 1000 });
    expect(await lf.getItem(noteKey(verseKey(1, 3)))).toBeNull();
    expect(await lf.getItem("user-data-version")).toBe(2);

    // a second read doesn't convert again
    expect((await readNotes(verseKey(1, 2)))[0].id).toBe(converted.id);
  });

  it("keeps the order of converted notes", async () => {
    const htmls = ["<p>1</p>", "<p>2</p>", "<p>3</p>", "<p>4</p>", "<p>5</p>", "<p>6</p>"];
    await lf.setItem(noteKey(verseKey(1, 2)), htmls);

    expect((await readNotes(verseKey(1, 2))).map((n) => n.html)).toEqual(htmls);
  });

  it("ignores malformed items instead of reading or uploading them", async () => {
    await lf.setItem("user-data-version", 2);
    await lf.setItem(FAVES_KEY, { "1:1": { updatedAt: 1 }, "1:2": {}, x: { updatedAt: 1 } });
    await lf.setItem(noteKey(verseKey(1, 1)), [note("n", 1), "<p>stray</p>"]);
    await lf.setItem("notes-quran-abc", [note("m", 1)]);

    expect(await readAll()).toEqual({ faves: { "1:1": { updatedAt: 1 } }, notes: { "1:1": [note("n", 1)] } });
  });

  it("bumps the change counter on every change", async () => {
    await setFave(verseKey(1, 1), true);
    await addNote(verseKey(1, 1), "<p>A</p>");
    const [added] = await readNotes(verseKey(1, 1));
    await updateNote(verseKey(1, 1), added.id, "<p>B</p>");
    await deleteNote(verseKey(1, 1), added.id);
    await setFave(verseKey(1, 1), false);

    expect(await getChangeCount()).toBe(5);
    expect(await readFaves()).toEqual([]);
    expect(await readNotes(verseKey(1, 1))).toEqual([]);
    expect(await readAll()).toEqual({
      faves: { "1:1": { updatedAt: 1000, deleted: true } },
      notes: { "1:1": [{ id: added.id, html: "", createdAt: 1000, updatedAt: 1000, deleted: true }] },
    });
  });

  it("writes merged data without counting it as a change", async () => {
    await setFave(verseKey(1, 1), true);
    await writeMerged({ faves: { "2:2": { updatedAt: 5 } }, notes: { "2:2": [note("n", 5)] } });

    expect(await readFaves()).toEqual(["1:1", "2:2"]);
    expect(await readNotes(verseKey(2, 2))).toEqual([note("n", 5)]);
    expect(await getChangeCount()).toBe(1);
  });

  it("keeps a fave set while merged data is being written", async () => {
    await addNote(verseKey(2, 2), "<p>A</p>");
    const getItem = lf.getItem.bind(lf);
    let faved = false;
    vi.spyOn(lf, "getItem").mockImplementation(async (key: string) => {
      if (key === noteKey(verseKey(2, 2)) && !faved) {
        faved = true;
        await setFave(verseKey(3, 3), true);
      }
      return getItem(key);
    });

    await writeMerged({ faves: { "2:2": { updatedAt: 5 } }, notes: { "2:2": [note("n", 5)] } });

    expect(await readFaves()).toEqual(["2:2", "3:3"]);
  });

  it("imports by merging and counts what the file holds", async () => {
    await setFave(verseKey(1, 1), true);
    const counts = await importData({
      faves: { "2:2": { updatedAt: 5 }, "3:3": { updatedAt: 5, deleted: true } },
      notes: { "2:2": [note("n", 5)] },
    });

    expect(counts).toEqual({ faves: 1, notes: 1 });
    expect(await readFaves()).toEqual(["1:1", "2:2"]);
    expect(await getChangeCount()).toBe(2);
  });

  it("clears the device without leaving deletion markers", async () => {
    await setFave(verseKey(1, 1), true);
    await addNote(verseKey(1, 1), "<p>A</p>");
    await clearAll();

    expect(await readAll()).toEqual(EMPTY_USER_DATA);
  });

  it("marks everything deleted to delete it everywhere", async () => {
    await setFave(verseKey(1, 1), true);
    await addNote(verseKey(1, 1), "<p>A</p>");
    vi.mocked(Date.now).mockReturnValue(2000);
    await deleteEverywhere();

    const data = await readAll();
    expect(hasLiveData(data)).toBe(false);
    expect(data.faves["1:1"]).toEqual({ updatedAt: 2000, deleted: true });
    expect(data.notes["1:1"][0]).toMatchObject({ html: "", updatedAt: 2000, deleted: true });
    expect(await getChangeCount()).toBe(3);
  });
});

describe("live views", () => {
  it("lists live faves and live notes in creation order", () => {
    expect(liveFaves({ "1:1": { updatedAt: 1 }, "1:2": { updatedAt: 1, deleted: true } })).toEqual(["1:1"]);
    expect(liveFaves(null)).toEqual([]);
    expect(liveNotes([note("b", 1, { createdAt: 2 }), note("a", 1, { deleted: true }), note("c", 1)])).toEqual([
      note("c", 1),
      note("b", 1, { createdAt: 2 }),
    ]);
    expect(countLive({ faves: { "1:1": { updatedAt: 1 } }, notes: { "1:1": [note("a", 1)] } })).toEqual({
      faves: 1,
      notes: 1,
    });
  });
});

describe("hadith favorites and notes", () => {
  const hadith = hadithKey({ collection: "malik", book: 4, id: "4.1.1" });

  beforeEach(async () => {
    await lf.clear();
  });

  it("builds hadith keys and their note keys", () => {
    expect(hadith).toBe("hadith:malik/4/4.1.1");
    expect(isHadithKey(hadith)).toBe(true);
    expect(isHadithKey(verseKey(2, 255))).toBe(false);
    expect(toHadithRef(hadith)).toEqual({ collection: "malik", book: 4, id: "4.1.1" });
    expect(noteKey(hadith)).toBe("notes-hadith-malik/4/4.1.1");
    expect(noteKey(verseKey(2, 255))).toBe("notes-quran-2-255");
    expect(isUserDataKey(HADITH_FAVES_KEY)).toBe(true);
    expect(isUserDataKey(noteKey(hadith))).toBe(true);
  });

  it("stores hadith favorites apart from verse favorites", async () => {
    await setFave(verseKey(1, 1), true);
    const quran = await lf.getItem(FAVES_KEY);
    await setFave(hadith, true);
    expect(await lf.getItem(FAVES_KEY)).toEqual(quran);
    expect(Object.keys((await lf.getItem(HADITH_FAVES_KEY)) as object)).toEqual([hadith]);
    await expect(readFaves()).resolves.toEqual(["1:1", hadith]);
  });

  it("stores hadith notes under their own key", async () => {
    await addNote(hadith, "<p>note</p>");
    expect(await lf.getItem("notes-hadith-malik/4/4.1.1")).toHaveLength(1);
    expect((await readNotes(hadith)).map((n) => n.html)).toEqual(["<p>note</p>"]);
  });

  it("reads, merges and writes both kinds of key", async () => {
    await setFave(hadith, true);
    await addNote(verseKey(2, 255), "<p>verse</p>");
    const data = await readAll();
    expect(Object.keys(data.faves)).toEqual([hadith]);
    expect(Object.keys(data.notes)).toEqual(["2:255"]);

    await clearAll();
    await writeMerged(data);
    await expect(readAll()).resolves.toEqual(data);
  });

  it("clears and deletes everywhere across both kinds", async () => {
    await setFave(verseKey(1, 1), true);
    await setFave(hadith, true);
    await addNote(hadith, "<p>note</p>");
    await deleteEverywhere();
    await expect(readFaves()).resolves.toEqual([]);
    await expect(readNotes(hadith)).resolves.toEqual([]);
    await clearAll();
    expect(await lf.getItem(HADITH_FAVES_KEY)).toBeNull();
    expect(await lf.getItem(noteKey(hadith))).toBeNull();
  });

  it("writes version 3 and reads versions 2 and 3", () => {
    const data = { faves: { [hadith]: { updatedAt: 1 } }, notes: {} };
    expect(toUserDataFile(data)).toEqual({ app: "muallimlive", version: 3, ...data });
    expect(
      parseUserDataFile({ app: "muallimlive", version: 2, faves: { "1:1": { updatedAt: 1 } }, notes: {} }),
    ).toEqual({
      faves: { "1:1": { updatedAt: 1 } },
      notes: {},
    });
    expect(parseUserDataFile(toUserDataFile(data))).toEqual(data);
  });
});
