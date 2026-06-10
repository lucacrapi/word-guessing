const SIM_MAX = 1.0; // identical word

// Per-language vocabulary files and calibrated similarity floors (the "unrelated
// words" baseline differs by embedding model, so each language needs its own).
const LANGS = {
  en: { file: "data/words-en.json", simMin: 0.25 },
  de: { file: "data/words-de.json", simMin: 0.4 },
  la: { file: "data/words-la.json", simMin: 0.45 },
};

// Per-language daily challenge schedules: { epoch: "YYYY-MM-DD", words: [...] },
// where words[i] is the secret word for day i since epoch (UTC). Same for everyone.
const DAILY_FILES = {
  en: "data/daily-en.json",
  de: "data/daily-de.json",
  la: "data/daily-la.json",
};

const langCache = {}; // { langCode: { word: [vector...] } }
const dailyCache = {}; // { langCode: { epoch, words } }
const nounCache = {}; // { langCode: Set<word> } — words capitalized when displayed
let currentLang = "en";
let nounSet = null;

let mode = localStorage.getItem("wordcue-mode") === "practice" ? "practice" : "daily";

let wordVectors = null; // { word: [vector...] }
let words = []; // sorted list of vocabulary words

let target = null;
let guesses = []; // { word, score, time }
let guessedWords = new Set();
let won = false;
let gaveUp = false;
let revealedHints = []; // { word, score, time } — hints shown so far, in reveal order
let hintDifficulty = localStorage.getItem("wordcue-hint-difficulty") === "hard" ? "hard" : "easy";
let startTime = null;
let activeSuggestionIndex = -1;

const els = {
  input: document.getElementById("guess-input"),
  form: document.getElementById("guess-form"),
  status: document.getElementById("status"),
  bestGuessContent: document.getElementById("best-guess-content"),
  tempMarker: document.getElementById("temp-bar-marker"),
  historyBody: document.getElementById("history-body"),
  historyEmpty: document.getElementById("history-empty"),
  guessTotal: document.getElementById("guess-total"),
  hideColdToggle: document.getElementById("hide-cold-toggle"),
  hintBtn: document.getElementById("hint-btn"),
  hintCount: document.getElementById("hint-count"),
  hintsList: document.getElementById("hints-list"),
  hintDifficulty: document.getElementById("hint-difficulty"),
  newGameBtn: document.getElementById("new-game-btn"),
  howToPlayBtn: document.getElementById("how-to-play-btn"),
  closeModalBtn: document.getElementById("close-modal-btn"),
  gotItBtn: document.getElementById("got-it-btn"),
  howToPlayModal: document.getElementById("how-to-play-modal"),
  winModal: document.getElementById("win-modal"),
  winTitle: document.getElementById("win-title"),
  winWord: document.getElementById("win-word"),
  winStats: document.getElementById("win-stats"),
  playAgainBtn: document.getElementById("play-again-btn"),
  autocompleteList: document.getElementById("autocomplete-list"),
  giveUpBtn: document.getElementById("give-up-btn"),
  languageSelect: document.getElementById("language-select"),
  modeDailyBtn: document.getElementById("mode-daily-btn"),
  modePracticeBtn: document.getElementById("mode-practice-btn"),
  tagline: document.getElementById("tagline"),
  winDailyNote: document.getElementById("win-daily-note"),
};

init();

async function init() {
  pruneDailyStorage();
  els.hintDifficulty.value = hintDifficulty;
  await loadLanguage(currentLang);
  updateModeUI();
  await newGame();
  bindEvents();
}

async function loadLanguage(lang) {
  if (!langCache[lang]) {
    els.status.textContent = "Loading word list...";
    const res = await fetch(LANGS[lang].file);
    langCache[lang] = await res.json();
  }
  if (lang === "de" && !nounCache[lang]) {
    const res = await fetch("data/nouns-de.json");
    nounCache[lang] = new Set(await res.json());
  }
  currentLang = lang;
  wordVectors = langCache[lang];
  words = Object.keys(wordVectors).sort();
  nounSet = nounCache[lang] || null;
}

// German orthography capitalizes nouns; other languages and parts of speech
// are displayed as stored (lowercase).
function displayWord(word) {
  if (nounSet && nounSet.has(word)) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
  return word;
}

async function loadDaily(lang) {
  if (!dailyCache[lang]) {
    const res = await fetch(DAILY_FILES[lang]);
    dailyCache[lang] = await res.json();
  }
  return dailyCache[lang];
}

async function getDailyTarget(lang) {
  const daily = await loadDaily(lang);
  const idx = getDailyIndex(daily.epoch, daily.words.length);
  return daily.words[idx];
}

function todayUTC() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function todayDateStr() {
  return new Date(todayUTC()).toISOString().slice(0, 10);
}

function getDailyIndex(epoch, length) {
  const [y, m, d] = epoch.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d);
  const diffDays = Math.floor((todayUTC() - start) / 86400000);
  return ((diffDays % length) + length) % length;
}

function dailyStorageKey(lang, dateStr) {
  return `wordcue-daily-${lang}-${dateStr}`;
}

function saveDailyState() {
  if (mode !== "daily") return;
  const data = {
    guesses: guesses.map((g) => ({ word: g.word, score: g.score, time: g.time.toISOString() })),
    revealedHints: revealedHints.map((h) => ({ word: h.word, score: h.score, time: h.time.toISOString() })),
    won,
    gaveUp,
  };
  localStorage.setItem(dailyStorageKey(currentLang, todayDateStr()), JSON.stringify(data));
}

function loadDailyState() {
  const raw = localStorage.getItem(dailyStorageKey(currentLang, todayDateStr()));
  if (!raw) return;

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }

  guesses = (data.guesses || []).map((g) => ({ word: g.word, score: g.score, time: new Date(g.time) }));
  guessedWords = new Set(guesses.map((g) => g.word));
  revealedHints = (data.revealedHints || []).map((h) => ({ word: h.word, score: h.score, time: new Date(h.time) }));
  renderHintsList();

  if (data.won) {
    won = true;
    disableInputs();
    setStatus(`You got it! The word was "${displayWord(target)}".`, "success");
  } else if (data.gaveUp) {
    won = true;
    gaveUp = true;
    disableInputs();
    setStatus(`The word was "${displayWord(target)}".`, "");
  }
}

function pruneDailyStorage() {
  const cutoff = new Date(todayUTC());
  cutoff.setUTCDate(cutoff.getUTCDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    const m = key && key.match(/^wordcue-daily-(?:en|de|la)-(\d{4}-\d{2}-\d{2})$/);
    if (m && m[1] < cutoffStr) localStorage.removeItem(key);
  }
}

function bindEvents() {
  els.form.addEventListener("submit", onGuess);
  els.newGameBtn.addEventListener("click", newGame);
  els.hintBtn.addEventListener("click", revealHint);
  els.hintDifficulty.addEventListener("change", onHintDifficultyChange);
  els.hideColdToggle.addEventListener("change", renderHistory);
  els.giveUpBtn.addEventListener("click", giveUp);
  els.languageSelect.addEventListener("change", onLanguageChange);
  els.modeDailyBtn.addEventListener("click", () => setMode("daily"));
  els.modePracticeBtn.addEventListener("click", () => setMode("practice"));

  els.input.addEventListener("input", updateAutocomplete);
  els.input.addEventListener("keydown", onInputKeydown);
  els.input.addEventListener("blur", () => hideAutocomplete());

  els.howToPlayBtn.addEventListener("click", () => els.howToPlayModal.classList.remove("hidden"));
  els.closeModalBtn.addEventListener("click", () => els.howToPlayModal.classList.add("hidden"));
  els.gotItBtn.addEventListener("click", () => els.howToPlayModal.classList.add("hidden"));
  els.playAgainBtn.addEventListener("click", () => {
    els.winModal.classList.add("hidden");
    if (mode === "daily") {
      setMode("practice");
    } else {
      newGame();
    }
  });
}

function onHintDifficultyChange() {
  hintDifficulty = els.hintDifficulty.value;
  localStorage.setItem("wordcue-hint-difficulty", hintDifficulty);
  renderHintsList();
}

async function onLanguageChange() {
  const lang = els.languageSelect.value;
  els.languageSelect.disabled = true;
  await loadLanguage(lang);
  els.languageSelect.disabled = false;
  await newGame();
}

function setMode(newMode) {
  if (newMode === mode) return;
  mode = newMode;
  localStorage.setItem("wordcue-mode", mode);
  updateModeUI();
  newGame();
}

function updateModeUI() {
  els.modeDailyBtn.classList.toggle("active", mode === "daily");
  els.modePracticeBtn.classList.toggle("active", mode === "practice");

  if (mode === "daily") {
    els.tagline.textContent = "Today's word — the same for everyone. A new word every day at midnight UTC!";
    els.newGameBtn.disabled = true;
    els.newGameBtn.title = "Daily Challenge: come back tomorrow for a new word";
  } else {
    els.tagline.textContent = "Find the hidden word. A new word every game!";
    els.newGameBtn.disabled = false;
    els.newGameBtn.title = "New game";
  }
}

async function newGame() {
  if (mode === "daily") {
    target = await getDailyTarget(currentLang);
  } else {
    target = words[Math.floor(Math.random() * words.length)];
  }

  guesses = [];
  guessedWords = new Set();
  won = false;
  gaveUp = false;
  revealedHints = [];
  startTime = Date.now();

  els.input.value = "";
  enableInputs();
  els.status.textContent = "Start by guessing a common word.";
  els.status.className = "status";
  els.hintsList.innerHTML = "";
  els.hintCount.textContent = "0";
  els.winModal.classList.add("hidden");
  hideAutocomplete();

  if (mode === "daily") {
    loadDailyState();
  }

  renderBestGuess();
  renderHistory();
  els.input.focus();
}

function enableInputs() {
  els.input.disabled = false;
  els.form.querySelector("button").disabled = false;
  els.hintBtn.disabled = false;
  els.giveUpBtn.disabled = false;
}

function onGuess(e) {
  e.preventDefault();
  if (won) return;

  const raw = els.input.value.trim().toLowerCase();
  hideAutocomplete();
  if (!raw) return;

  if (!(raw in wordVectors)) {
    setStatus(`"${displayWord(raw)}" isn't in the word list. Try another common word.`, "error");
    return;
  }

  if (guessedWords.has(raw)) {
    setStatus(`You already guessed "${displayWord(raw)}".`, "error");
    return;
  }

  const score = scoreGuess(raw);
  const guess = { word: raw, score, time: new Date() };
  guesses.push(guess);
  guessedWords.add(raw);

  els.input.value = "";

  if (raw === target) {
    handleWin();
  } else {
    const tier = getTier(score);
    setStatus(`"${displayWord(raw)}" scores ${score}/100 — ${tier.label}`, "");
  }

  saveDailyState();
  renderBestGuess();
  renderHistory();
}

function scoreGuess(word) {
  if (word === target) return 100;
  const cos = cosineSimilarity(wordVectors[word], wordVectors[target]);
  const simMin = LANGS[currentLang].simMin;
  let t = (cos - simMin) / (SIM_MAX - simMin);
  t = Math.max(0, Math.min(1, t));
  return Math.round(t * 100);
}

function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

function getTier(score) {
  if (score >= 90) return { label: "Very Hot!", emoji: "🔴", className: "tier-veryhot" };
  if (score >= 75) return { label: "Hot!", emoji: "🟠", className: "tier-hot" };
  if (score >= 50) return { label: "Warm", emoji: "🟡", className: "tier-warm" };
  if (score >= 25) return { label: "Cool", emoji: "🔵", className: "tier-cool" };
  return { label: "Cold", emoji: "🧊", className: "tier-cold" };
}

function handleWin() {
  won = true;
  disableInputs();
  setStatus(`You got it! The word was "${displayWord(target)}".`, "success");

  const elapsedSec = Math.round((Date.now() - startTime) / 1000);
  els.winTitle.textContent = "🎉 You found it!";
  els.winWord.textContent = displayWord(target);
  els.winStats.textContent = `Solved in ${guesses.length} guess${guesses.length === 1 ? "" : "es"} (${elapsedSec}s).`;
  showWinModal();
}

function giveUp() {
  if (won) return;
  won = true;
  gaveUp = true;
  disableInputs();
  setStatus(`The word was "${displayWord(target)}".`, "");

  els.winTitle.textContent = "🔍 Here's the answer";
  els.winWord.textContent = displayWord(target);
  els.winStats.textContent = `You made ${guesses.length} guess${guesses.length === 1 ? "" : "es"}.`;
  showWinModal();
  saveDailyState();
}

function showWinModal() {
  els.winDailyNote.classList.toggle("hidden", mode !== "daily");
  els.playAgainBtn.textContent = mode === "daily" ? "Switch to Practice Mode" : "Play Again";
  els.winModal.classList.remove("hidden");
}

function disableInputs() {
  els.input.disabled = true;
  els.form.querySelector("button").disabled = true;
  els.hintBtn.disabled = true;
  els.giveUpBtn.disabled = true;
  hideAutocomplete();
}

function setStatus(text, kind) {
  els.status.textContent = text;
  els.status.className = "status" + (kind ? ` ${kind}` : "");
}

function renderBestGuess() {
  if (guesses.length === 0) {
    els.bestGuessContent.innerHTML = '<span class="placeholder">No guesses yet</span>';
    els.tempMarker.style.left = "0%";
    return;
  }

  const best = guesses.reduce((a, b) => (b.score > a.score ? b : a));
  const tier = getTier(best.score);
  els.bestGuessContent.innerHTML = `
    <span>${escapeHtml(displayWord(best.word))}</span>
    <span class="best-guess-score score-badge ${tier.className}">${best.score}</span>
  `;
  els.tempMarker.style.left = `${best.score}%`;
}

function renderHistory() {
  const hideCold = els.hideColdToggle.checked;
  els.historyBody.innerHTML = "";
  els.guessTotal.textContent = guesses.length;

  const combined = [
    ...guesses.map((g) => ({ ...g, isHint: false })),
    ...revealedHints.map((h) => ({ ...h, isHint: true })),
  ];

  // Number entries in chronological order, then show most recent first.
  const chronological = combined.slice().sort((a, b) => a.time - b.time);
  chronological.forEach((g, i) => (g.idx = i + 1));
  const ordered = chronological.slice().reverse();
  const visible = hideCold ? ordered.filter((g) => g.score >= 25) : ordered;

  els.historyEmpty.classList.toggle("hidden", combined.length > 0);
  if (combined.length > 0 && visible.length === 0) {
    els.historyEmpty.classList.remove("hidden");
    els.historyEmpty.textContent = "All guesses so far are cold. Uncheck \"Hide Cold\" to see them.";
  } else if (combined.length === 0) {
    els.historyEmpty.textContent = 'No guesses yet. Try a common word like "dog" or "happy".';
  }

  for (const g of visible) {
    const tier = getTier(g.score);
    const tr = document.createElement("tr");
    if (g.word === target) tr.classList.add("row-correct");
    if (g.isHint) tr.classList.add("row-hint");
    tr.innerHTML = `
      <td>${g.idx}</td>
      <td>${g.isHint ? "💡 " : ""}${escapeHtml(displayWord(g.word))}</td>
      <td><span class="score-badge ${tier.className}">${g.score}</span></td>
      <td><span class="temp-label">${tier.emoji} ${tier.label}</span></td>
      <td>${formatTime(g.time)}</td>
    `;
    els.historyBody.appendChild(tr);
  }
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function revealHint() {
  const next = getNextHintCandidate();
  if (!next) return;

  revealedHints.push({ word: next, score: scoreGuess(next), time: new Date() });
  renderHintsList();
  renderHistory();
  saveDailyState();
}

function renderHintsList() {
  els.hintsList.innerHTML = "";
  revealedHints.forEach((hint, i) => {
    const li = document.createElement("li");
    li.textContent = `Hint ${i + 1}: A closely related word is "${displayWord(hint.word)}".`;
    els.hintsList.appendChild(li);
  });

  els.hintCount.textContent = revealedHints.length;
  els.hintBtn.disabled = won || !getNextHintCandidate();
}

// Hints are limited to words below a similarity-score ceiling, so they nudge
// without giving the answer away. "Easy" allows closer (more revealing)
// words than "Hard".
function getRelatedWords() {
  const threshold = hintDifficulty === "easy" ? 60 : 30;
  return words
    .filter((w) => w !== target && scoreGuess(w) < threshold)
    .sort((a, b) => cosineSimilarity(wordVectors[b], wordVectors[target]) - cosineSimilarity(wordVectors[a], wordVectors[target]));
}

function getNextHintCandidate() {
  const related = getRelatedWords();
  return related.find((w) => !revealedHints.some((h) => h.word === w));
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function updateAutocomplete() {
  const raw = els.input.value.trim().toLowerCase();
  activeSuggestionIndex = -1;

  if (!raw) {
    hideAutocomplete();
    return;
  }

  const matches = words
    .filter((w) => w.startsWith(raw))
    .sort((a, b) => a.length - b.length || a.localeCompare(b))
    .slice(0, 8);
  if (matches.length === 0) {
    hideAutocomplete();
    return;
  }

  els.autocompleteList.innerHTML = "";
  for (const word of matches) {
    const li = document.createElement("li");
    li.className = "autocomplete-item";
    li.textContent = displayWord(word);
    li.addEventListener("mousedown", (e) => {
      e.preventDefault(); // keep input focused so blur doesn't hide the list first
      selectSuggestion(displayWord(word));
    });
    els.autocompleteList.appendChild(li);
  }
  els.autocompleteList.classList.remove("hidden");
}

function onInputKeydown(e) {
  const items = els.autocompleteList.querySelectorAll(".autocomplete-item");
  if (els.autocompleteList.classList.contains("hidden") || items.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
    highlightSuggestion(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
    highlightSuggestion(items);
  } else if (e.key === "Enter") {
    if (activeSuggestionIndex >= 0) {
      e.preventDefault();
      selectSuggestion(items[activeSuggestionIndex].textContent);
    } else {
      hideAutocomplete();
    }
  } else if (e.key === "Escape") {
    hideAutocomplete();
  }
}

function highlightSuggestion(items) {
  items.forEach((item, i) => item.classList.toggle("active", i === activeSuggestionIndex));
}

function selectSuggestion(word) {
  els.input.value = word;
  hideAutocomplete();
  els.input.focus();
}

function hideAutocomplete() {
  els.autocompleteList.classList.add("hidden");
  els.autocompleteList.innerHTML = "";
  activeSuggestionIndex = -1;
}
