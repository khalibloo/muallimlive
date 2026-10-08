import { TAJWEED_RULES } from "./tajweed";
import { TAJWEED_SAMPLES } from "./tajweedSamples";

const classesOf = (html: string) =>
  new Set([...html.matchAll(/class=(?:"([^"]+)"|([^\s>]+))/g)].flatMap((m) => (m[1] ?? m[2]).split(" ")));

describe("the tajweed samples", () => {
  it.each(TAJWEED_SAMPLES.map((sample) => [`${sample.chapter}:${sample.verse}`, sample] as const))(
    "lists the rules %s marks",
    (_, { arabic, transliteration, rules }) => {
      const classes = new Set([...classesOf(arabic), ...classesOf(transliteration)]);
      const marked = TAJWEED_RULES.filter((rule) => rule.classes.some((c) => classes.has(c))).map((rule) => rule.id);
      expect(rules).toEqual(marked);
    },
  );

  it("show every rule", () => {
    const shown = new Set(TAJWEED_SAMPLES.flatMap((sample) => sample.rules));
    expect(TAJWEED_RULES.filter((rule) => !shown.has(rule.id))).toEqual([]);
  });
});
