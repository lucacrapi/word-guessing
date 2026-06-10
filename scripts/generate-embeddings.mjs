// Precomputes embeddings for a game vocabulary using a small local model.
// Usage: node scripts/generate-embeddings.mjs <en|de>
// Output: public/data/words-<lang>.json -> { "word": [vector...], ... }
import { pipeline } from "@xenova/transformers";
import { writeFileSync } from "fs";

const LANG = process.argv[2];

const CONFIGS = {
  en: {
    model: "Xenova/all-MiniLM-L6-v2",
    wordsModule: "./words.mjs",
    output: "../public/data/words-en.json",
    // English embeddings are insensitive to case; embed as-is.
    embedInput: (word) => word,
    samplePairs: [
      ["dog", "cat"],
      ["dog", "puppy"],
      ["dog", "computer"],
      ["king", "queen"],
      ["apple", "banana"],
      ["apple", "ocean"],
    ],
  },
  de: {
    model: "Xenova/LaBSE",
    wordsModule: "./words-de.mjs",
    output: "../public/data/words-de.json",
    // German nouns are conventionally capitalized; LaBSE produces much more
    // semantically meaningful embeddings for the capitalized form.
    embedInput: (word) => word.charAt(0).toUpperCase() + word.slice(1),
    samplePairs: [
      ["hund", "katze"],
      ["hund", "welpe"],
      ["hund", "computer"],
      ["könig", "königin"],
      ["apfel", "banane"],
      ["apfel", "ozean"],
    ],
  },
  la: {
    model: "Xenova/LaBSE",
    wordsModule: "./words-la.mjs",
    output: "../public/data/words-la.json",
    // Lowercase gives a clearer similarity gradient for Latin than capitalized forms.
    embedInput: (word) => word,
    samplePairs: [
      ["canis", "felis"],
      ["canis", "catulus"],
      ["canis", "mare"],
      ["rex", "regina"],
      ["bonus", "malus"],
      ["magnus", "parvus"],
      ["amo", "odi"],
      ["pater", "mater"],
    ],
  },
};

const config = CONFIGS[LANG];
if (!config) {
  console.error("Usage: node scripts/generate-embeddings.mjs <en|de>");
  process.exit(1);
}

const { WORDS } = await import(config.wordsModule);
const unique = [...new Set(WORDS.map((w) => w.toLowerCase().trim()))].sort();

console.log(`Loading model ${config.model}... (${unique.length} words to embed)`);
const extractor = await pipeline("feature-extraction", config.model, {
  quantized: true,
});

const result = {};
for (let i = 0; i < unique.length; i++) {
  const word = unique[i];
  const output = await extractor(config.embedInput(word), { pooling: "mean", normalize: true });
  result[word] = Array.from(output.data).map((x) => Math.round(x * 1000) / 1000);
  if ((i + 1) % 100 === 0 || i === unique.length - 1) {
    console.log(`  ${i + 1}/${unique.length}`);
  }
}

writeFileSync(new URL(config.output, import.meta.url), JSON.stringify(result));
console.log(`Done. Wrote ${unique.length} word vectors to ${config.output.replace("../", "")}`);

// Quick sanity check of similarity scale
function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
console.log("\nSample cosine similarities:");
for (const [a, b] of config.samplePairs) {
  if (result[a] && result[b]) {
    console.log(`  ${a} / ${b}: ${cosine(result[a], result[b]).toFixed(3)}`);
  }
}
