// Writes ../lexicon/<clone>.json from a translation workspace:
//   <dir>/source.json          [{id, text}] from extract.mjs (deduplicated)
//   <dir>/per-clone.json       {clone: [id, ...]}
//   <dir>/translations/<code>.json  {id: literal translation}
// Usage (from apps/scc): node components/mobile/transform/language/tools/build-lexicon.mjs <dir>
import fs from "node:fs";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname);
const dir = path.resolve(process.argv[2] ?? ".");
const codes = [...fs.readFileSync(path.join(here, "../languages.ts"), "utf8").matchAll(/code: "([a-z]+)"/g)].map((match) => match[1]);
const source = JSON.parse(fs.readFileSync(path.join(dir, "source.json"), "utf8"));
const perClone = JSON.parse(fs.readFileSync(path.join(dir, "per-clone.json"), "utf8"));
const translations = codes.map((code) => JSON.parse(fs.readFileSync(path.join(dir, "translations", `${code}.json`), "utf8")));

// Each non-Latin language must actually be written in its script.
const scripts = { ko: /\p{Script=Hangul}/u, ja: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, zh: /\p{Script=Han}/u, th: /\p{Script=Thai}/u, hi: /\p{Script=Devanagari}/u, bn: /\p{Script=Bengali}/u, ta: /\p{Script=Tamil}/u, ur: /\p{Script=Arabic}/u, fa: /\p{Script=Arabic}/u, ar: /\p{Script=Arabic}/u, he: /\p{Script=Hebrew}/u, ru: /\p{Script=Cyrillic}/u, uk: /\p{Script=Cyrillic}/u, el: /\p{Script=Greek}/u, am: /\p{Script=Ethiopic}/u, ka: /\p{Script=Georgian}/u, hy: /\p{Script=Armenian}/u, mn: /\p{Script=Cyrillic}/u, km: /\p{Script=Khmer}/u, my: /\p{Script=Myanmar}/u, si: /\p{Script=Sinhala}/u };
let failed = false;
codes.forEach((code, column) => {
  const missing = source.filter(({ id }) => typeof translations[column][id] !== "string" || !translations[column][id].trim());
  const script = scripts[code];
  const foreign = script ? source.filter(({ id, text }) => /\p{L}{2}/u.test(text) && !script.test(translations[column][id] ?? "")) : [];
  const copied = code !== "en" && code !== "ko" ? source.filter(({ id, text }) => text.length > 12 && translations[column][id] === text) : [];
  if (missing.length || foreign.length > 40 || copied.length > 25) failed = true;
  console.log(`${code}: missing ${missing.length}, outside script ${foreign.length}, untranslated ${copied.length}`);
});
if (failed && !process.argv.includes("--force")) process.exit(1);

fs.mkdirSync(path.join(here, "../lexicon"), { recursive: true });
for (const [clone, ids] of Object.entries(perClone)) {
  // Keep the source's own edge punctuation and spacing: a fragment such as "rep" (followed
  // by a separately styled ".") must not gain a period, nor lose a leading " · ".
  const edges = (text, value) => {
    let out = value.trim();
    if (!/[.。]$/.test(text.trim()) && /[^.]\.$/.test(out)) out = out.slice(0, -1);
    return `${text.match(/^\s*/)[0]}${out}${text.match(/\s*$/)[0]}`;
  };
  const entries = ids.map((id) => [source[id].text, ...translations.map((table) => edges(source[id].text, table[id]))]);
  fs.writeFileSync(path.join(here, "../lexicon", `${clone}.json`), `${JSON.stringify({ languages: codes, entries }).replace(/\],\[/g, "],\n[")}\n`);
}
console.log(`wrote ${Object.keys(perClone).length} lexicon files`);
