/**
 * metadata_all.json から配信用IDリスト (public/data/id-list.json) を生成する
 *
 * Usage: node scripts/generate-id-list.mjs [--input path] [--seed number]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// --- CLI args ---
const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(name);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined;
}

const inputPath = getArg("--input") ?? resolve(ROOT, ".tmp/metadata_all.json");
const seed = Number(getArg("--seed") ?? 42);
const outputPath = resolve(ROOT, "public/data/id-list.json");

// --- Seeded PRNG (mulberry32) ---
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Fisher-Yates shuffle ---
function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- Main ---
console.log(`Reading: ${inputPath}`);
const raw = JSON.parse(readFileSync(inputPath, "utf-8"));
const works = raw.works ?? raw;

// Filter: copyright-free & plain text available
const eligible = works.filter(
  (w) => w.copyrightFlag === false && w.sourceUrls?.text,
);

// Extract numeric IDs and shuffle
const ids = eligible.map((w) => Number(w.id));
const rng = mulberry32(seed);
shuffle(ids, rng);

writeFileSync(outputPath, JSON.stringify(ids));

console.log(`Total works: ${works.length}`);
console.log(`Eligible: ${eligible.length}`);
console.log(`Output: ${outputPath}`);
console.log(`Seed: ${seed}`);
