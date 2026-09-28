import { readFileSync } from "node:fs";
import { join } from "node:path";

import { TAJWEED_COLORS, TAJWEED_RULES } from "@/utils/tajweed";

// the stylesheets with their whitespace collapsed, so the checks don't depend on the formatting
const read = (file: string) =>
  readFileSync(join(__dirname, file), "utf8").replace(/\s+/g, " ").replace(/\( /g, "(").replace(/ \)/g, ")");
const tajweedCss = read("tajweed.css");
const globalCss = read("global.css");

describe("tajweed.css", () => {
  it.each(TAJWEED_RULES.map((rule) => [rule.id, rule] as const))("styles the %s rule", (id, { classes, color }) => {
    const selectors = classes.map((c) => `tajweed.${c}`).join(", ");
    expect(tajweedCss).toContain(`${selectors} { color: var(--tajweed-${id}, var(--palette-${color})); }`);
    expect(tajweedCss).toContain(`:root.tajweed-fade-${id} :is(${selectors}) { opacity: 0.35; }`);
    expect(tajweedCss).toContain(`:root.tajweed-hide-${id} :is(${selectors}) { display: none; }`);
  });

  it("styles no plain classes but the verse-end marker", () => {
    expect(tajweedCss.match(/(?<![\w-])\.[A-Za-z_-]+/g)).toEqual([".end"]);
  });

  it("keeps the tajweed colors switch overriding the colors", () => {
    expect(tajweedCss).toContain(":root.no-tajweed tajweed { color: inherit; font-weight: inherit; }");
  });
});

describe("the palette", () => {
  it.each(TAJWEED_COLORS)("defines %s for every scheme", (color) => {
    expect(globalCss.match(new RegExp(`--palette-${color}: `, "g"))).toHaveLength(3);
  });
});
