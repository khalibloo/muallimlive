import { chapterPath } from "./chapters";

describe("chapterPath", () => {
  it("links to a chapter", () => {
    expect(chapterPath(2)).toBe("/quran/2");
  });

  it("links to a verse of a chapter", () => {
    expect(chapterPath(2, 255)).toBe("/quran/2#v-255");
  });
});
