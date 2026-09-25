import Fuse from "fuse.js";

/** Fuzzy matches the number, the transliterated name and the English name. The index is only built while searching. */
export const searchChapters = (chapters: Chapter[], query: string) =>
  query.trim()
    ? new Fuse(chapters, {
        keys: [{ name: "id", getFn: (c) => `${c.id}` }, "name_simple", "translated_name.name"],
        ignoreLocation: true,
        threshold: 0.3,
      })
        .search(query.trim())
        .map((result) => result.item)
    : chapters;
