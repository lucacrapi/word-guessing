// Builds the Latin vocabulary from scripts/tmp-gaffiot/parsed.json (extracted by
// scripts/parse-gaffiot.mjs from the Gaffiot Latin-French dictionary). Each
// candidate part-of-speech list is ranked by dictionary entry length (a proxy
// for how common/important the word is) and capped to keep the vocabulary to a
// manageable, mostly-everyday-Latin size.
// Usage: node scripts/build-words-la.mjs
import { readFileSync, writeFileSync } from "fs";

const CAPS = { nouns: 1700, adjectives: 900, verbs: 900 };

const data = JSON.parse(readFileSync(new URL("./tmp-gaffiot/parsed.json", import.meta.url), "utf8"));

let combined = [];
for (const [cat, cap] of Object.entries(CAPS)) {
  const top = [...data[cat]].sort((a, b) => b.bodyLength - a.bodyLength).slice(0, cap);
  console.log(`${cat}: ${data[cat].length} candidates, kept top ${top.length}`);
  combined.push(...top.map((e) => e.lemma));
}

combined = [...new Set(combined)].sort();
console.log(`Combined unique: ${combined.length}`);

const header = `// Vocabulary of common Latin nouns, adjectives, and verbs (1st-person-singular
// present tense) used as the game dictionary (lowercase, no macrons). Extracted
// from the Gaffiot Latin-French dictionary
// (https://github.com/Gaffiot/digital-gaffiot-json) by scripts/parse-gaffiot.mjs
// and ranked/capped by scripts/build-words-la.mjs.
export const WORDS = [
${combined.map((w) => JSON.stringify(w)).join(",")}
];
`;

writeFileSync(new URL("./words-la.mjs", import.meta.url), header);
console.log("Wrote scripts/words-la.mjs");
