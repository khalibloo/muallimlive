import config from "./config";
import { COLOR_SCHEME_KEY, COLOR_SCHEMES, READER_SETTINGS_KEY } from "./cookies";
import { TAJWEED_COLORS, TAJWEED_RULES } from "./tajweed";

export const NO_TAJWEED_CLASS = "no-tajweed";

/** Applies the theme, text size and tajweed cookies before the first paint. The precached offline page keeps the ones
 * it was saved with; on other pages this sets what the server already rendered (see `tajweedStyles`) */
export const SETTINGS_SCRIPT = `(() => {
  const cookie = (name) => {
    const entry = document.cookie.split("; ").find((c) => c.startsWith(name + "="));
    return entry && decodeURIComponent(entry.slice(name.length + 1));
  };
  const schemes = ${JSON.stringify(COLOR_SCHEMES)};
  const scheme = schemes.find((s) => s === cookie("${COLOR_SCHEME_KEY}")) ?? "${config.defaultColorScheme}";
  let textSize = 100;
  let tajweedColors = true;
  let rules = {};
  try {
    const settings = JSON.parse(cookie("${READER_SETTINGS_KEY}"));
    if (typeof settings.textSize === "number") textSize = settings.textSize;
    if (settings.tajweedColors === false) tajweedColors = false;
    if (typeof settings.tajweedRules === "object" && settings.tajweedRules) rules = settings.tajweedRules;
  } catch {}
  const html = document.documentElement;
  html.classList.remove(...schemes);
  html.classList.add(scheme);
  html.classList.toggle("${NO_TAJWEED_CLASS}", !tajweedColors);
  html.style.setProperty("--reader-scale", textSize / 100);
  const colors = ${JSON.stringify(TAJWEED_COLORS)};
  for (const id of ${JSON.stringify(TAJWEED_RULES.map((rule) => rule.id))}) {
    const rule = rules[id] ?? {};
    let color = "";
    if (rule.color === "none") color = "currentColor";
    else if (colors.includes(rule.color)) color = "var(--palette-" + rule.color + ")";
    if (color) html.style.setProperty("--tajweed-" + id, color);
    else html.style.removeProperty("--tajweed-" + id);
    html.classList.toggle("tajweed-fade-" + id, rule.look === "faded");
    html.classList.toggle("tajweed-hide-" + id, rule.look === "hidden");
  }
})()`;
