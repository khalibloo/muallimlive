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
    // the settings' preview shows its own looks, not the saved ones
    for (const [look, cls, declaration] of [
      ["faded", "fade", "opacity: 0.35;"],
      ["hidden", "hide", "display: none;"],
    ]) {
      expect(tajweedCss, look).toContain(
        `:root.tajweed-${cls}-${id} :is(${selectors}):not(.tajweed-preview *), ` +
          `.tajweed-preview.tajweed-${cls}-${id} :is(${selectors}) { ${declaration} }`,
      );
    }
  });

  it("styles no plain classes but the verse-end marker and the preview", () => {
    expect(new Set(tajweedCss.match(/(?<![\w-])\.[A-Za-z_-]+/g))).toEqual(new Set([".end", ".tajweed-preview"]));
  });

  it("keeps the tajweed colors switch overriding the colors, in the page and the preview", () => {
    expect(tajweedCss).toContain(
      ":root.no-tajweed tajweed:not(.tajweed-preview *), .tajweed-preview.no-tajweed tajweed " +
        "{ color: inherit; font-weight: inherit; }",
    );
  });
});

describe("the palette", () => {
  it.each(TAJWEED_COLORS)("defines %s for every scheme", (color) => {
    expect(globalCss.match(new RegExp(`--palette-${color}: `, "g"))).toHaveLength(3);
  });
});
