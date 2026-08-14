#!/usr/bin/env node

/**
 * Compares two trace runs scenario by scenario, for the one property a refactor
 * that moved code has to prove: the cross-module side-effect sequence did not
 * change.
 *
 * `calls.txt` cannot answer that directly — a function that moved file changes
 * its module label, and a closure promoted to a top-level declaration becomes
 * traced where it was previously invisible. So the ordered call sequence is read
 * from `raw/*.jsonl` and compared by function name, filtered to the names the
 * baseline already had. Newly visible names and re-attributed modules are
 * reported separately rather than counted as differences. A refactor may name a
 * removed orchestration frame or a proven-pure call with `--ignore-call`; the
 * comparator removes that name from both sequences and reports its before/after
 * count so the exception stays explicit and auditable.
 *
 * Usage: npm run trace:compare -- <baseline-dir> <after-dir>
 *   [--ignore-call <function-name>]...
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const USAGE =
  "Usage: npm run trace:compare -- <baseline-dir> <after-dir> " +
  "[--ignore-call <function-name>]...";

function parseArgs(argv) {
  const [baseRoot, afterRoot, ...options] = argv;
  if (baseRoot === undefined || afterRoot === undefined) {
    throw new Error(USAGE);
  }

  const ignoredCallNames = new Set();
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    const value = options[index + 1];
    if (option !== "--ignore-call") {
      throw new Error(`Unrecognized argument: ${option}\n${USAGE}`);
    }
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`--ignore-call requires a function name.\n${USAGE}`);
    }
    ignoredCallNames.add(value);
    index += 1;
  }
  return { baseRoot, afterRoot, ignoredCallNames };
}

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message ?? error);
  process.exit(2);
}
const { baseRoot, afterRoot, ignoredCallNames } = args;

function scenarios(root) {
  return readdirSync(root)
    .filter((name) => statSync(path.join(root, name)).isDirectory())
    .sort();
}

/** Every traced process of one scenario, in launch order, as call sequences. */
function processesOf(scenarioDir) {
  const rawDir = path.join(scenarioDir, "raw");
  const files = readdirSync(rawDir)
    .filter((name) => name.endsWith(".jsonl"))
    .map((name) => ({
      name,
      pid: Number.parseInt(name.replace(/^trace-|\.jsonl$/g, ""), 10),
    }))
    .sort((a, b) => a.pid - b.pid);
  return files.map(({ name }) => {
    const lines = readFileSync(path.join(rawDir, name), "utf8")
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line));
    const proc = lines.find((event) => event.e === "proc");
    const calls = lines
      .filter((event) => event.e === ">")
      .map((event) => ({ module: event.m, name: event.n }));
    return { argv: normalizeTranscript((proc?.argv ?? []).join(" ")), calls };
  });
}

function normalizeTranscript(text) {
  return text
    .replace(/\(node:\d+\)/g, "(node:PID)")
    .replace(
      /^Using supplied CLI binary: .+$/gm,
      "Using supplied CLI binary: <CLI_BINARY>",
    )
    .replace(/antmay-demo-[^/\s]+/g, "antmay-demo-X")
    .replace(/\b\d{8}T\d{9}Z-[0-9a-f]{8}\b/g, "<RUNID>")
    .replace(/\b\d{12}Z-/g, "<STAMP>-")
    .replace(/\b\d{4}-\d{2}-\d{2}T[\d:.]+Z\b/g, "<ISO>")
    .replace(/\b[0-9a-f]{7,40}\b/g, "<SHA>")
    .replace(/\b\d+(?:\.\d+)?\s*(?:ms|s|m)\b/g, "<DUR>");
}

let orderFindings = 0;
let transcriptFindings = 0;
let structureFindings = 0;
const newNames = new Map();
const movedNames = new Map();
const goneNames = new Map();
const ignoredCounts = new Map(
  [...ignoredCallNames].map((name) => [name, { baseline: 0, after: 0 }]),
);

function includedCalls(calls, side) {
  return calls.filter((call) => {
    const counts = ignoredCounts.get(call.name);
    if (counts === undefined) return true;
    counts[side] += 1;
    return false;
  });
}

const ids = scenarios(baseRoot);
const afterIds = scenarios(afterRoot);
if (ids.join() !== afterIds.join()) {
  console.log("! scenario sets differ");
  structureFindings += 1;
}

for (const id of ids) {
  const base = processesOf(path.join(baseRoot, id));
  const after = processesOf(path.join(afterRoot, id));
  const notes = [];

  if (base.length !== after.length) {
    notes.push(`process count ${base.length} → ${after.length}`);
    structureFindings += 1;
  }

  for (let index = 0; index < Math.min(base.length, after.length); index += 1) {
    if (base[index].argv !== after[index].argv) {
      notes.push(
        `process ${index + 1} argv "${base[index].argv}" → "${after[index].argv}"`,
      );
      structureFindings += 1;
    }
    const baseSeq = includedCalls(base[index].calls, "baseline");
    const afterAllCalls = includedCalls(after[index].calls, "after");
    const known = new Set(baseSeq.map((call) => call.name));
    const afterSeq = afterAllCalls.filter((call) => known.has(call.name));

    // Names the baseline never saw: a closure now declared at module level.
    for (const call of afterAllCalls) {
      if (known.has(call.name)) continue;
      newNames.set(call.name, `${call.module} · ${call.name}`);
    }

    const baseNames = baseSeq.map((call) => call.name);
    const afterNames = afterSeq.map((call) => call.name);
    if (baseNames.join("\n") !== afterNames.join("\n")) {
      const at = baseNames.findIndex((name, i) => name !== afterNames[i]);
      notes.push(
        `process ${index + 1} call order diverges at #${at + 1}: ` +
          `expected ${baseNames[at] ?? "(end)"}, got ${afterNames[at] ?? "(end)"} ` +
          `(${baseNames.length} → ${afterNames.length} known calls)`,
      );
      orderFindings += 1;
    }

    // Same call, different home: the relocation this refactor is made of. Homes
    // are a set per name, because two modules may declare the same private
    // helper and a name alone would report their difference as a move.
    const baseHomes = new Map();
    for (const call of baseSeq) {
      if (!baseHomes.has(call.name)) baseHomes.set(call.name, new Set());
      baseHomes.get(call.name).add(call.module);
    }
    for (const call of afterSeq) {
      const homes = baseHomes.get(call.name);
      if (homes !== undefined && !homes.has(call.module)) {
        movedNames.set(call.name, `${[...homes].join(", ")} → ${call.module}`);
      }
    }
    const afterAll = new Set(afterAllCalls.map((call) => call.name));
    for (const name of known) {
      if (!afterAll.has(name)) {
        goneNames.set(name, [...baseHomes.get(name)].join(", "));
      }
    }
  }

  const baseTranscript = normalizeTranscript(
    readFileSync(path.join(baseRoot, id, "transcript.txt"), "utf8"),
  );
  const afterTranscript = normalizeTranscript(
    readFileSync(path.join(afterRoot, id, "transcript.txt"), "utf8"),
  );
  if (baseTranscript !== afterTranscript) {
    const baseLines = baseTranscript.split("\n");
    const afterLines = afterTranscript.split("\n");
    const at = baseLines.findIndex((line, i) => line !== afterLines[i]);
    notes.push(
      `transcript diverges at line ${at + 1}:\n      - ${baseLines[at]}\n      + ${afterLines[at]}`,
    );
    transcriptFindings += 1;
  }

  console.log(
    `${notes.length === 0 ? "ok  " : "DIFF"} ${id}` +
      notes.map((note) => `\n    ${note}`).join(""),
  );
}

for (const [name, counts] of ignoredCounts) {
  if (counts.baseline === 0 && counts.after === 0) {
    console.log(`! ignored call name was absent from both traces: ${name}`);
    structureFindings += 1;
  }
}

console.log("");
console.log(`Order findings:      ${orderFindings}`);
console.log(`Transcript findings: ${transcriptFindings}`);
console.log(`Structure findings:  ${structureFindings}`);
console.log("");
console.log(`Newly visible functions (${newNames.size}):`);
for (const label of [...newNames.values()].sort()) console.log(`  + ${label}`);
console.log("");
console.log(`Relocated functions (${movedNames.size}):`);
for (const [name, move] of [...movedNames.entries()].sort()) {
  console.log(`  ~ ${name}: ${move}`);
}
console.log("");
console.log(`Functions no longer called (${goneNames.size}):`);
for (const [name, was] of [...goneNames.entries()].sort()) {
  console.log(`  - ${was} · ${name}`);
}
console.log("");
console.log(`Ignored call names (${ignoredCounts.size}):`);
for (const [name, counts] of [...ignoredCounts.entries()].sort()) {
  console.log(`  ~ ${name}: ${counts.baseline} → ${counts.after}`);
}
if (orderFindings > 0 || transcriptFindings > 0 || structureFindings > 0) {
  process.exitCode = 1;
}
