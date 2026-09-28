import {
  TAJWEED_COLORS,
  TAJWEED_GROUPS,
  TAJWEED_RULES,
  parseTajweedRules,
  tajweedStyles,
  toTajweedChoices,
  toTajweedRules,
} from "./tajweed";

describe("tajweed rules", () => {
  it("lists 26 rules under 6 groups", () => {
    expect(TAJWEED_GROUPS.map((group) => group.id)).toEqual([
      "hamzat-wasl",
      "madd",
      "qalqalah",
      "noon-meem",
      "ra-lam",
      "other",
    ]);
    expect(TAJWEED_RULES).toHaveLength(26);
    expect(new Set(TAJWEED_RULES.map((rule) => rule.id)).size).toBe(26);
  });

  it("puts every class under exactly one rule", () => {
    const classes = TAJWEED_RULES.flatMap((rule) => rule.classes);
    expect(new Set(classes).size).toBe(classes.length);
    expect(classes).not.toContain("R");
    expect(classes).not.toContain("end");
  });

  it("gives every rule a palette color", () => {
    for (const rule of TAJWEED_RULES) {
      expect(TAJWEED_COLORS).toContain(rule.color);
    }
  });
});

describe("parseTajweedRules", () => {
  it("keeps known rules, colors and looks", () => {
    const rules = {
      "hamzat-wasl": { look: "hidden" },
      qalqalah: { color: "red", look: "faded" },
      ikhfa: { color: "none" },
    };
    expect(parseTajweedRules(rules)).toEqual(rules);
  });

  it("drops unknown rules, colors and looks, and the rules left empty", () => {
    expect(
      parseTajweedRules({
        "hamzat-wasl": { look: "blurred", color: "red" },
        qalqalah: { color: "pink" },
        "not-a-rule": { color: "red" },
        ikhfa: null,
        iqlab: "hidden",
      }),
    ).toEqual({ "hamzat-wasl": { color: "red" } });
  });

  it.each([undefined, null, "hidden", 3, [], {}, { qalqalah: {} }])("returns nothing for %j", (value) => {
    expect(parseTajweedRules(value)).toBeUndefined();
  });
});

describe("tajweedStyles", () => {
  it("turns colors into variables and looks into classes", () => {
    expect(
      tajweedStyles({
        "hamzat-wasl": { look: "hidden" },
        qalqalah: { color: "red", look: "faded" },
        ikhfa: { color: "none" },
      }),
    ).toEqual({
      classNames: ["tajweed-hide-hamzat-wasl", "tajweed-fade-qalqalah"],
      style: { "--tajweed-qalqalah": "var(--palette-red)", "--tajweed-ikhfa": "currentColor" },
    });
  });

  it("styles nothing for untouched rules", () => {
    expect(tajweedStyles()).toEqual({ classNames: [], style: {} });
    expect(tajweedStyles({})).toEqual({ classNames: [], style: {} });
  });
});

describe("the settings form values", () => {
  it("default to each rule's color and the normal look", () => {
    const choices = toTajweedChoices();
    expect(Object.keys(choices)).toHaveLength(26);
    expect(choices["hamzat-wasl"]).toEqual({ color: "sky", look: "normal" });
    expect(choices.qalqalah).toEqual({ color: "lime", look: "normal" });
  });

  it("show the saved choices", () => {
    const choices = toTajweedChoices({ qalqalah: { color: "red" }, "hamzat-wasl": { look: "faded" } });
    expect(choices.qalqalah).toEqual({ color: "red", look: "normal" });
    expect(choices["hamzat-wasl"]).toEqual({ color: "sky", look: "faded" });
  });

  it("store only what differs from the defaults", () => {
    const choices = toTajweedChoices();
    choices.qalqalah = { color: "red", look: "normal" };
    choices["hamzat-wasl"] = { color: "sky", look: "hidden" };
    choices.ikhfa = { color: "none", look: "normal" };
    expect(toTajweedRules(choices)).toEqual({
      "hamzat-wasl": { look: "hidden" },
      qalqalah: { color: "red" },
      ikhfa: { color: "none" },
    });
  });

  it("store nothing when every rule has its default", () => {
    expect(toTajweedRules(toTajweedChoices())).toBeUndefined();
    expect(toTajweedRules()).toBeUndefined();
  });
});
