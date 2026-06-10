// One-off generator: builds the "daily challenge" word schedule for each
// language. Produces public/data/daily-{lang}.json, each containing
// { epoch, words }, where `words[i]` is the secret word for day `i` since
// `epoch` (an ISO date, UTC). The same file is served to every player, so
// everyone gets the same word on a given day.
//
// The schedule is a deterministic shuffle of each language's vocabulary
// (seeded, so re-running this script reproduces the same schedule), repeated
// in freshly-reshuffled cycles until it covers the requested number of years.
import { readFileSync, writeFileSync } from "fs";

const YEARS = 15;
const EPOCH = "2026-06-10";

const LANGS = {
  en: { data: "../public/data/words-en.json", out: "../public/data/daily-en.json", seed: 1 },
  de: { data: "../public/data/words-de.json", out: "../public/data/daily-de.json", seed: 2 },
  la: { data: "../public/data/words-la.json", out: "../public/data/daily-la.json", seed: 3 },
};

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

for (const [lang, cfg] of Object.entries(LANGS)) {
  const vectors = JSON.parse(readFileSync(new URL(cfg.data, import.meta.url), "utf8"));
  const pool = Object.keys(vectors).sort();

  const result = [];
  let cycle = 0;
  while (result.length < days) {
    const rng = mulberry32(cfg.seed * 1000003 + cycle);
    const shuffled = shuffle(pool, rng);
    // Avoid the same word landing on consecutive days across a cycle boundary.
    if (result.length > 0 && shuffled[0] === result[result.length - 1]) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    result.push(...shuffled);
    cycle++;
  }
  result.length = days;

  writeFileSync(new URL(cfg.out, import.meta.url), JSON.stringify({ epoch: EPOCH, words: result }));
  console.log(`${lang}: ${days} days from a pool of ${pool.length} words -> ${cfg.out}`);
}
