import { glossGroups } from "./glosses";

describe("glossGroups", () => {
  it("gives each word group its gloss and markup", () => {
    expect(
      glossGroups("Bismi <tajweed class=HmA>A</tajweed>llāhi", [
        { text: "Bismi", translation: "In the name of" },
        { text: "Allāhi", translation: "God" },
      ]),
    ).toEqual([
      { html: "Bismi", gloss: "In the name of" },
      { html: "<tajweed class=HmA>A</tajweed>llāhi", gloss: "God" },
    ]);
  });

  it("keeps several words in one group, and groups without a gloss", () => {
    expect(
      glossGroups("Wa 'Īyāka Nasta`īnu", [{ text: "Wa 'Īyāka", translation: "and You alone" }, { text: "Nasta`īnu" }]),
    ).toEqual([{ html: "Wa 'Īyāka", gloss: "and You alone" }, { html: "Nasta`īnu" }]);
  });

  it("splits a marking that spans two groups between them", () => {
    expect(
      glossGroups("Hi<tajweed class=ML>ya 'I</tajweed><tajweed class=GhSh>nn</tajweed>a", [
        { text: "Hiya", translation: "it" },
        { text: "'Inna", translation: "indeed" },
      ]),
    ).toEqual([
      { html: "Hi<tajweed class=ML>ya</tajweed>", gloss: "it" },
      { html: "<tajweed class=ML>'I</tajweed><tajweed class=GhSh>nn</tajweed>a", gloss: "indeed" },
    ]);
  });

  it("keeps nested markings", () => {
    expect(glossGroups("Bi<tajweed class=R><u>kh</u></tajweed>ā", [{ text: "Bikhā", translation: "x" }])).toEqual([
      { html: "Bi<tajweed class=R><u>kh</u></tajweed>ā", gloss: "x" },
    ]);
  });

  it("leaves pause marks between groups ungrouped, and keeps those inside a group", () => {
    expect(
      glossGroups("Rayba ۛ Fīhi ۛ Wa ۙ Al-Ladhīna ۚ", [
        { text: "Rayba", translation: "doubt" },
        { text: "Fīhi", translation: "in it" },
        { text: "Wa Al-Ladhīna", translation: "and those who" },
      ]),
    ).toEqual([
      { html: "Rayba", gloss: "doubt" },
      { html: "ۛ" },
      { html: "Fīhi", gloss: "in it" },
      { html: "ۛ" },
      { html: "Wa ۙ Al-Ladhīna", gloss: "and those who" },
      { html: "ۚ" },
    ]);
  });

  it.each([
    ["a word differs", "Bismi Allāhi", [{ text: "Bismi" }, { text: "Rabbi" }]],
    ["the text has more words", "Bismi Allāhi", [{ text: "Bismi" }]],
    ["the groups have more words", "Bismi", [{ text: "Bismi" }, { text: "Allāhi" }]],
  ])("gives up when %s", (_, html, words) => {
    expect(glossGroups(html, words)).toBeUndefined();
  });
});
