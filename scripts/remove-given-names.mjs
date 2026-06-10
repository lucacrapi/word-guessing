// One-off cleanup: removes English personal/given names that slipped into the
// vocabulary (tagged as nouns by WordNet via build-words.mjs but not caught by
// the GIVEN_NAMES blocklist). Updates words.mjs, the words-en.json embeddings,
// and regenerates the English daily schedule from the smaller pool.
import { readFileSync, writeFileSync } from "fs";
import { WORDS } from "./words.mjs";
import { REMOVE_NAMES } from "./blocklist.mjs";

const removeSet = new Set(REMOVE_NAMES);

// 1. words.mjs
const filteredWords = WORDS.filter((w) => !removeSet.has(w));
const body = filteredWords.map((w) => JSON.stringify(w)).join(",\n  ");
const content = `// Vocabulary of common English nouns, adjectives, and verbs used as the game
// dictionary. Generated from hand-curated lists merged with WordNet-tagged
// nouns, adjectives, and verbs from a frequency-ranked common-word list
// (see scripts/build-words.mjs).
export const WORDS = [
  ${body},
];
`;
writeFileSync(new URL("./words.mjs", import.meta.url), content);

// 2. words-en.json embeddings
const wordsEnUrl = new URL("../public/data/words-en.json", import.meta.url);
const vectors = JSON.parse(readFileSync(wordsEnUrl, "utf8"));
for (const w of removeSet) delete vectors[w];
writeFileSync(wordsEnUrl, JSON.stringify(vectors));

// 3. Regenerate the English daily schedule from the new pool
const YEARS = 15;
const EPOCH = "2026-06-10";
const SEED = 1;

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const start = new Date(`${EPOCH}T00:00:00Z`);
const end = new Date(start);
end.setUTCFullYear(end.getUTCFullYear() + YEARS);
const days = Math.round((end - start) / 86400000);

const pool = Object.keys(vectors).sort();
const result = [];
let cycle = 0;
while (result.length < days) {
  const rng = mulberry32(SEED * 1000003 + cycle);
  const shuffled = shuffle(pool, rng);
  if (result.length > 0 && shuffled[0] === result[result.length - 1]) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  result.push(...shuffled);
  cycle++;
}
result.length = days;

writeFileSync(new URL("../public/data/daily-en.json", import.meta.url), JSON.stringify({ epoch: EPOCH, words: result }));

console.log(`Removed ${removeSet.size} names. Words: ${WORDS.length} -> ${filteredWords.length}.`);
console.log(`Daily schedule regenerated: ${days} days from a pool of ${pool.length} words.`);
