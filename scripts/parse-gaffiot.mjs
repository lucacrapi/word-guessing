// Parses the full Gaffiot Latin-French dictionary JSON
// (https://github.com/Gaffiot/digital-gaffiot-json) and extracts a candidate
// vocabulary of common nouns and adjectives (plain ASCII, no diacritics).
// Usage: node scripts/parse-gaffiot.mjs
import { readFileSync, writeFileSync } from "fs";

const data = JSON.parse(readFileSync(new URL("./tmp-gaffiot/gaffiot.json", import.meta.url), "utf8"));

// Strip macrons/breves/etc. and expand æ/œ ligatures (used on \des{}/\gen{} text,
// which can contain diacritics even though latin_raw does not).
function normalize(s) {
  return s
    .replace(/æ/g, "ae").replace(/Æ/g, "Ae")
    .replace(/œ/g, "oe").replace(/Œ/g, "Oe")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const desRe = /\\des\{([^}]*)\}/g;
const genRe = /\\gen\{([^}]*)\}/g;

// Common irregular verbs whose defective principal-parts desinences (e.g. sum:
// "fui, esse", possum: "potui, posse") would otherwise be misread as 3rd-declension
// 3-termination adjective endings (e.g. celer: "eris, ere").
const IRREGULAR_VERBS = new Set(["sum", "possum", "volo", "nolo", "malo", "fero", "fio", "queo", "nequeo"]);

const byLemma = new Map();

for (const entry of data) {
  const raw = (entry.latin_raw || "").trim();
  if (!raw) continue;

  let lemma = raw.replace(/^\d+\s+/, "");
  if (/[\s,;.]/.test(lemma)) continue; // skip multi-word headwords/phrases

  const isProper = /^[A-Z]/.test(lemma);
  lemma = lemma.toLowerCase();
  if (!/^[a-z]+$/.test(lemma) || lemma.length < 3 || lemma.length > 12) continue;
  if (isProper) continue;

  const french = entry.french || "";
  // Only look at the lead-in before the first numbered sense, where the
  // declension/gender markers live.
  const head = french.split(/\\pp\{/)[0];

  let des = "";
  desRe.lastIndex = 0;
  const desMatch = desRe.exec(head);
  if (desMatch) des = normalize(desMatch[1]).replace(/\s+/g, " ").trim();

  const genders = new Set();
  let gm;
  genRe.lastIndex = 0;
  while ((gm = genRe.exec(head))) {
    const g = gm[1].trim();
    if (g === "m.") genders.add("m");
    else if (g === "f.") genders.add("f");
    else if (g === "n.") genders.add("n");
  }

  // Drop a trailing comma to simplify matching the desinence (genitive/declension
  // ending) Gaffiot prints right after the headword.
  const d = des.replace(/,$/, "");

  // Verbs (1st-person-singular headwords like "amo", "abeo") are tagged "tr."/"intr."
  // (transitive/intransitive/impersonal) right after the desinence, with no \gen{} tag.
  const looksLikeVerb = /\b(?:tr|intr|impers)\./.test(head);

  // Principal-parts desinence ending in an infinitive marker, e.g. "avi, atum, are"
  // (amo-type, with supine) or "ui, ere" (timeo-type, no supine -- perfect ending in
  // "-i" but not "-is", which would instead be a 3rd-decl. adjective genitive like
  // celer's "eris, ere").
  const dParts = d.split(/\s*,\s*/).filter(Boolean);
  const lastPart = dParts[dParts.length - 1];
  const looksLikeVerbDes =
    /^(?:are|ere|ire)$/.test(lastPart) &&
    (dParts.length === 3 || (dParts.length === 2 && /i$/.test(dParts[0]) && !/is$/.test(dParts[0])));

  let pos = null;
  if (IRREGULAR_VERBS.has(lemma)) {
    pos = "verb"; // sum, possum, volo, etc. -- defective principal parts confuse the des-based heuristics
  } else if (genders.has("n") && genders.size >= 2 && /is$/.test(d)) {
    pos = "adj"; // 3rd declension 1-termination adj. with explicit m./f./n., e.g. felix, "icis,"
  } else if (genders.size >= 1) {
    pos = "noun"; // nouns always carry an explicit \gen{} tag in this dataset
  } else if (looksLikeVerb || looksLikeVerbDes) {
    // Headword is already the 1st-person-singular present, e.g. "amo", "video", "duco".
    pos = "verb";
  } else if (d) {
    if (/^[ae]\s*,\s*um$/.test(d) || d === "um") {
      pos = "adj"; // 1st/2nd declension adjective: "a, um"
    } else if (d === "e" || /is\s*,\s*e$/.test(d)) {
      pos = "adj"; // 3rd declension 2-termination adjective: "e," or "is, e"
    } else if (/^[a-z]+\s*,\s*[a-z]+$/.test(d)) {
      pos = "adj"; // 3rd declension 3-termination adjective, e.g. celer: "eris, ere"
    } else if (/^[a-z]+$/.test(d) && d.length >= 2 && !lemma.endsWith("o")) {
      // 3rd declension 1-termination adjective, e.g. felix: "icis", vetus: "eris".
      // Lemmas ending in "o" here are 1st-person verb forms (e.g. "abito") rather
      // than adjectives, since Latin adjectives never end in "-o".
      pos = "adj";
    }
  } else if (lemma.endsWith("o")) {
    // No \des{}/\gen{}/tr.\intr. markers but ends in "-o" -- almost certainly a
    // 1st-person-singular present verb form (e.g. irregulars like "sum"-type entries).
    pos = "verb";
  }

  if (!pos) continue;

  const entryData = { lemma, pos, des, genders: [...genders], bodyLength: french.length };
  const existing = byLemma.get(lemma);
  if (!existing || entryData.bodyLength > existing.bodyLength) byLemma.set(lemma, entryData);
}

const all = [...byLemma.values()];
const nouns = all.filter((e) => e.pos === "noun");
const adjectives = all.filter((e) => e.pos === "adj");
const verbs = all.filter((e) => e.pos === "verb");

console.log(`Total candidate lemmas: ${all.length}`);
console.log(`  nouns: ${nouns.length}`);
console.log(`  adjectives: ${adjectives.length}`);
console.log(`  verbs: ${verbs.length}`);

writeFileSync(
  new URL("./tmp-gaffiot/parsed.json", import.meta.url),
  JSON.stringify({ nouns, adjectives, verbs }, null, 1)
);
