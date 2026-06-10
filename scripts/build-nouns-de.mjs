// One-off generator: identifies which words in the German vocabulary
// (words-de.mjs) are nouns -- i.e. not in the curated adjective or verb
// lists -- and writes them to public/data/nouns-de.json. The app uses this
// list to capitalize German nouns when displaying them, per German
// orthography (only nouns are capitalized).
import { writeFileSync } from "fs";
import { WORDS } from "./words-de.mjs";
import { ADJECTIVES } from "./adjectives-de.mjs";
import { VERBS } from "./verbs-de.mjs";

const adjSet = new Set(ADJECTIVES);
const verbSet = new Set(VERBS);

const nouns = WORDS.filter((word) => !adjSet.has(word) && !verbSet.has(word));

writeFileSync(new URL("../public/data/nouns-de.json", import.meta.url), JSON.stringify(nouns));
console.log(`Words: ${WORDS.length}, adjectives: ${ADJECTIVES.length}, verbs: ${VERBS.length}, nouns: ${nouns.length}`);
