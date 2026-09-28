/** A word group of a transliteration's markup, with its gloss when it has one */
export interface GlossGroup {
  html: string;
  gloss?: string;
}

interface OpenTag {
  name: string;
  tag: string;
}

/** A piece of a word's text and the markings around it, outermost first */
interface Run {
  text: string;
  open: OpenTag[];
}

const TOKEN = /<(\/?)([a-z]+)[^>]*>|[^<]+/gi;

// markings can span words, so each word's runs carry the tags that are open around them
const toWords = (html: string) => {
  const words: Run[][] = [[]];
  const open: OpenTag[] = [];
  for (const [token, closing, name] of html.matchAll(TOKEN)) {
    if (name && closing) {
      const i = open.findLastIndex((t) => t.name === name.toLowerCase());
      if (i >= 0) open.splice(i, 1);
    } else if (name) {
      open.push({ name: name.toLowerCase(), tag: token });
    } else {
      token.split(/(\s+)/).forEach((part, i) => {
        if (i % 2) words.push([]);
        else if (part) words.at(-1)!.push({ text: part, open: [...open] });
      });
    }
  }
  return words.filter((w) => w.length > 0);
};

const runHtml = ({ text, open }: Run) =>
  `${open.map((t) => t.tag).join("")}${text}${open
    .map((t) => `</${t.name}>`)
    .reverse()
    .join("")}`;

const toHtml = (words: Run[][]) => words.map((w) => w.map(runHtml).join("")).join(" ");

const plainText = (word: Run[]) => word.map((r) => r.text).join("");

// pause marks (ۖ ۗ ۚ …) stand between the words but have no gloss
const isPauseMark = (word: Run[]) => !/\p{L}/u.test(plainText(word));

/** Splits a transliteration's markup into its word groups, or gives up when they don't match its words */
export const glossGroups = (html: string, words: VerseWord[]): GlossGroup[] | undefined => {
  const tokens = toWords(html);
  const groups: GlossGroup[] = [];
  let i = 0;
  const addPauseMarks = () => {
    while (i < tokens.length && isPauseMark(tokens[i])) {
      groups.push({ html: toHtml([tokens[i++]]) });
    }
  };

  for (const word of words) {
    addPauseMarks();
    const expected = word.text.split(/\s+/);
    const taken: Run[][] = [];
    const found: string[] = [];
    while (i < tokens.length && found.length < expected.length) {
      const token = tokens[i++];
      taken.push(token);
      if (!isPauseMark(token)) found.push(plainText(token));
    }
    if (found.join(" ") !== expected.join(" ")) return undefined;
    groups.push({ html: toHtml(taken), ...(word.translation && { gloss: word.translation }) });
  }
  addPauseMarks();

  return i === tokens.length ? groups : undefined;
};
