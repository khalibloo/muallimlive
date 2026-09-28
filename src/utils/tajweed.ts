export const TAJWEED_COLORS = [
  "red",
  "orange",
  "amber",
  "lime",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "rose",
  "gray",
] as const;

export const TAJWEED_LOOKS = ["faded", "hidden"] as const;

export type TajweedColorChoice = TajweedColor | "none";

export const COLOR_CHOICES: readonly TajweedColorChoice[] = [...TAJWEED_COLORS, "none"];

/** The rules readers can style, by heading. `classes` are the `<tajweed>` classes of both markups (quran.com's and
 * transliteration.org's); `color` is the default */
export const TAJWEED_GROUPS = [
  {
    id: "hamzat-wasl",
    rules: [{ id: "hamzat-wasl", classes: ["ham_wasl", "HmA", "HmI", "HmU"], color: "sky" }],
  },
  {
    id: "madd",
    rules: [
      { id: "madd-2", classes: ["madda_normal", "MS2"], color: "amber" },
      { id: "madd-arid", classes: ["MS"], color: "orange" },
      { id: "madd-badal", classes: ["MB"], color: "orange" },
      { id: "madd-lazim", classes: ["madda_necessary", "ML"], color: "rose" },
      { id: "madd-wajib", classes: ["madda_obligatory", "MWT"], color: "red" },
      { id: "madd-jaiz", classes: ["madda_permissible", "MJF"], color: "violet" },
    ],
  },
  {
    id: "qalqalah",
    rules: [{ id: "qalqalah", classes: ["qalaqah", "Q"], color: "lime" }],
  },
  {
    id: "noon-meem",
    rules: [
      { id: "ghunnah", classes: ["ghunnah", "GhSh"], color: "cyan" },
      { id: "idgham-ghunnah", classes: ["idgham_ghunnah", "Gh"], color: "teal" },
      { id: "idgham-no-ghunnah", classes: ["idgham_wo_ghunnah", "Kh"], color: "gray" },
      { id: "idgham-mithlayn", classes: ["DY"], color: "teal" },
      { id: "idgham-mutajanisayn", classes: ["idgham_mutajanisayn", "DJ"], color: "teal" },
      { id: "idgham-mutaqaribayn", classes: ["idgham_mutaqaribayn"], color: "teal" },
      { id: "idgham-shafawi", classes: ["idgham_shafawi", "DW"], color: "gray" },
      { id: "ikhfa", classes: ["ikhafa", "KhQ"], color: "purple" },
      { id: "ikhfa-shafawi", classes: ["ikhafa_shafawi", "KhW"], color: "purple" },
      { id: "iqlab", classes: ["iqlab", "IM"], color: "emerald" },
      { id: "izhar", classes: ["ZQ"], color: "indigo" },
    ],
  },
  {
    id: "ra-lam",
    rules: [
      { id: "light-ra", classes: ["Rq", "RqQ"], color: "red" },
      { id: "light-ra-reading-on", classes: ["RqW"], color: "orange" },
      { id: "light-lam", classes: ["TqL"], color: "red" },
      { id: "heavy-lam", classes: ["TfL"], color: "blue" },
    ],
  },
  {
    id: "other",
    rules: [
      { id: "ta-marbutah", classes: ["Th"], color: "blue" },
      { id: "dropped-ending", classes: ["EdAyh"], color: "gray" },
      { id: "silent-letter", classes: ["slnt", "laam_shamsiyah", "LaY"], color: "gray" },
    ],
  },
] as const satisfies readonly {
  id: string;
  rules: readonly { id: string; classes: readonly string[]; color: TajweedColor }[];
}[];

export type TajweedGroupId = (typeof TAJWEED_GROUPS)[number]["id"];
export type TajweedRuleId = (typeof TAJWEED_GROUPS)[number]["rules"][number]["id"];

export interface TajweedRule {
  id: TajweedRuleId;
  classes: readonly string[];
  color: TajweedColor;
}

export const TAJWEED_RULES: readonly TajweedRule[] = TAJWEED_GROUPS.flatMap(
  (group): readonly TajweedRule[] => group.rules,
);

/** A rule's value in the settings form */
export interface TajweedChoice {
  color: TajweedColorChoice;
  look: TajweedLook | "normal";
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Keeps the known rules, colors and looks of a cookie's `tajweedRules`, or returns nothing when none are left */
export const parseTajweedRules = (value: unknown): Record<string, TajweedRuleStyle> | undefined => {
  if (!isRecord(value)) return undefined;
  const rules: Record<string, TajweedRuleStyle> = {};
  for (const { id } of TAJWEED_RULES) {
    const rule = value[id];
    if (!isRecord(rule)) continue;
    const color = COLOR_CHOICES.find((c) => c === rule.color);
    const look = TAJWEED_LOOKS.find((l) => l === rule.look);
    if (color || look) {
      rules[id] = { ...(color && { color }), ...(look && { look }) };
    }
  }
  return Object.keys(rules).length > 0 ? rules : undefined;
};

/** The `<html>` classes and style variables that apply the rules' styles in `tajweed.css` */
export const tajweedStyles = (rules: Record<string, TajweedRuleStyle> = {}) => {
  const classNames: string[] = [];
  const style: Record<string, string> = {};
  for (const { id } of TAJWEED_RULES) {
    const { color, look } = rules[id] ?? {};
    if (color) style[`--tajweed-${id}`] = color === "none" ? "currentColor" : `var(--palette-${color})`;
    if (look === "faded") classNames.push(`tajweed-fade-${id}`);
    if (look === "hidden") classNames.push(`tajweed-hide-${id}`);
  }
  return { classNames, style };
};

/** The settings form's values: every rule's color and look, the defaults filling in what `rules` leaves out */
export const toTajweedChoices = (rules: Record<string, TajweedRuleStyle> = {}): Record<string, TajweedChoice> =>
  Object.fromEntries(
    TAJWEED_RULES.map(({ id, color }) => [id, { color: rules[id]?.color ?? color, look: rules[id]?.look ?? "normal" }]),
  );

/** The form's values as `tajweedRules`: only what differs from the defaults */
export const toTajweedRules = (choices: Record<string, Partial<TajweedChoice>> = {}) =>
  parseTajweedRules(
    Object.fromEntries(
      TAJWEED_RULES.map(({ id, color }) => {
        const choice = choices[id] ?? {};
        return [
          id,
          {
            ...(choice.color !== color && { color: choice.color }),
            ...(choice.look !== "normal" && { look: choice.look }),
          },
        ];
      }),
    ),
  );
