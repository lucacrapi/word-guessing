// One-off generator: filters a frequency-ranked English word list down to common
// nouns, adjectives, and verbs (via WordNet through wordpos), merges with the
// hand-curated lists, and rewrites words.mjs with the combined vocabulary.
import { readFileSync, writeFileSync } from "fs";
import WordPOS from "wordpos";
import { WORDS as CURATED } from "./words.mjs";
import { ADJECTIVES as CURATED_ADJ } from "./adjectives.mjs";
import { VERBS as CURATED_VERBS } from "./verbs.mjs";
import { BLOCKLIST } from "./blocklist.mjs";

const wordpos = new WordPOS();

const candidates = readFileSync(new URL("./wordlists/google-10000-english.txt", import.meta.url), "utf8")
  .split("\n")
  .map((w) => w.trim().toLowerCase())
  .filter((w) => /^[a-z]+$/.test(w) && w.length >= 3 && w.length <= 12);

const nouns = [];
const adjectives = [];
const verbs = [];
for (const word of candidates) {
  if (await wordpos.isNoun(word)) nouns.push(word);
  if (await wordpos.isAdjective(word)) adjectives.push(word);
  if (await wordpos.isVerb(word)) verbs.push(word);
}

let combined = new Set([...CURATED, ...nouns, ...CURATED_ADJ, ...adjectives, ...CURATED_VERBS, ...verbs]);

// Drop blocklisted words (countries, names, abbreviations, etc.)
for (const word of BLOCKLIST) combined.delete(word);

// Drop simple plurals whose singular form is also present (e.g. "laws" when "law" exists)
for (const word of combined) {
  if (word.endsWith("s") && word.length > 4) {
    const singular = word.slice(0, -1);
    if (combined.has(singular)) combined.delete(word);
  }
}

combined = [...combined].sort();

const body = combined.map((w) => JSON.stringify(w)).join(",\n  ");
const content = `// Vocabulary of common English nouns, adjectives, and verbs used as the game
// dictionary. Generated from hand-curated lists merged with WordNet-tagged
// nouns, adjectives, and verbs from a frequency-ranked common-word list
// (see scripts/build-words.mjs).
export const WORDS = [
  ${body},
];
`;

writeFileSync(new URL("./words.mjs", import.meta.url), content);
console.log(
  `Curated nouns: ${CURATED.length}, frequency nouns: ${nouns.length}, ` +
  `curated adjectives: ${CURATED_ADJ.length}, frequency adjectives: ${adjectives.length}, ` +
  `curated verbs: ${CURATED_VERBS.length}, frequency verbs: ${verbs.length}, ` +
  `combined unique: ${combined.length}`
);
