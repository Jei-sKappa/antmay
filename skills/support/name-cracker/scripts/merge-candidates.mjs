#!/usr/bin/env node
// Merges the per-category candidate files a name-cracker run produced into the
// single deliverable file, leaving the ## Brief and ## Shortlist placeholders
// for the orchestrator to fill.
//
// Usage: node merge-candidates.mjs <scratch-dir> <output-path>

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const [scratchDir, outPath] = process.argv.slice(2);
if (!scratchDir || !outPath) {
  console.error("Usage: node merge-candidates.mjs <scratch-dir> <output-path>");
  process.exit(1);
}

let files;
try {
  files = readdirSync(scratchDir)
    .filter((f) => f.endsWith(".md"))
    .sort();
} catch (err) {
  console.error(`Cannot read scratch directory ${scratchDir}: ${err.message}`);
  process.exit(1);
}
if (files.length === 0) {
  console.error(`No .md candidate files found in ${scratchDir}`);
  process.exit(1);
}

// - **Name** — rationale   (em dash, en dash, or hyphen accepted)
const CANDIDATE = /^\s*[-*]\s+\*\*(.+?)\*\*\s*[—–-]+\s*(.+?)\s*$/;

const categories = files.map((file) => {
  const lines = readFileSync(join(scratchDir, file), "utf8").split("\n");
  const heading = lines.find((l) => l.startsWith("# "));
  const title = heading ? heading.slice(2).trim() : basename(file, ".md");
  const candidates = [];
  for (const line of lines) {
    const m = line.match(CANDIDATE);
    if (m) candidates.push({ name: m[1].trim(), rationale: m[2].trim() });
  }
  return { title, file, candidates, kept: [] };
});

// Collapse duplicates case-insensitively; the first category keeps the entry,
// later ones become attributions on it.
const dedupeKey = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "");
const seen = new Map();
for (const cat of categories) {
  for (const cand of cat.candidates) {
    const key = dedupeKey(cand.name);
    const prior = seen.get(key);
    if (prior) {
      if (!prior.also.includes(cat.title)) prior.also.push(cat.title);
    } else {
      const entry = { ...cand, also: [] };
      seen.set(key, entry);
      cat.kept.push(entry);
    }
  }
}

const empty = categories.filter((c) => c.candidates.length === 0);
const filled = categories.length - empty.length;
const total = seen.size;

const out = [];
out.push("# Name candidates");
out.push("");
out.push(`${total} unique names across ${filled} categories.`);
out.push("");
out.push("## Brief");
out.push("");
out.push("<!-- brief: replaced by the orchestrator with the naming brief, verbatim -->");
out.push("");
out.push("## Shortlist");
out.push("");
out.push("<!-- shortlist: replaced by the orchestrator with ~10 picks from the list below -->");
out.push("");
out.push("## All candidates");
for (const cat of categories) {
  if (cat.kept.length === 0) continue;
  out.push("");
  out.push(`### ${cat.title}`);
  out.push("");
  for (const e of cat.kept) {
    const also = e.also.length ? ` *(also proposed under: ${e.also.join(", ")})*` : "";
    out.push(`- **${e.name}** — ${e.rationale}${also}`);
  }
}
if (empty.length > 0) {
  out.push("");
  out.push("## Categories with no candidates");
  out.push("");
  for (const c of empty) out.push(`- ${c.title} (\`${c.file}\`)`);
}
out.push("");

writeFileSync(resolve(outPath), out.join("\n"));
console.log(
  `Merged ${total} unique candidates from ${files.length} files (${empty.length} empty) -> ${outPath}`,
);
