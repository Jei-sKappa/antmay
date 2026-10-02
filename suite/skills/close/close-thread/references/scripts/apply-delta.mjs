#!/usr/bin/env node
// Land a thread's delta on the project layer, all or nothing.
//
// Usage: node apply-delta.mjs <thread root>
// Run from the project root: every delta document's target is written
// relative to the current working directory.
//
// Guarantees:
//   * Runs the whole check of `./check-delta.mjs` first. On any failure it
//     prints that check's report and writes nothing.
//   * Otherwise it writes every `create` (creating the folders it needs),
//     then writes every edited target, then removes every deleted target.
//     Each written file holds exactly the content the check computed, so the
//     check predicts the landing byte for byte.
//   * Prints one line per file, `wrote <target>` or `removed <target>`; a
//     delta with no documents prints `no delta documents`.
//   * Lands documents and does nothing else.
//
// Exit codes: 0 landed (or nothing to land); 1 the check failed and nothing
// was written; 2 usage error (a missing or extra argument, or a thread root
// that is not a directory).
//
// Imports `./check-delta.mjs` by that relative path, so the two files ship
// together. Dependency-free otherwise: only `node:` built-ins.

import { mkdirSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { checkDelta, formatReport } from "./check-delta.mjs";

const USAGE = "usage: node apply-delta.mjs <thread root>";

function isDirectory(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Land the checked delta of `result` under `projectRoot`. Assumes the check
 * found no failure. Returns one line per file written or removed.
 * @param {import("./check-delta.mjs").CheckResult} result
 * @param {string} projectRoot
 * @returns {string[]}
 */
function land(result, projectRoot) {
  const lines = [];
  const at = (target) => join(projectRoot, ...target.split("/"));
  for (const doc of result.documents.filter((d) => d.type === "create")) {
    const path = at(doc.target);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, doc.landed);
    lines.push(`wrote ${doc.target}`);
  }
  for (const doc of result.documents.filter((d) => d.type === "edit")) {
    writeFileSync(at(doc.target), doc.landed);
    lines.push(`wrote ${doc.target}`);
  }
  for (const doc of result.documents.filter((d) => d.type === "delete")) {
    rmSync(at(doc.target));
    lines.push(`removed ${doc.target}`);
  }
  return lines;
}

function main(args) {
  if (args.length !== 1) {
    console.error(USAGE);
    process.exit(2);
  }
  const threadRoot = args[0];
  if (!isDirectory(threadRoot)) {
    console.error(`apply-delta: "${threadRoot}" is not a directory`);
    console.error(USAGE);
    process.exit(2);
  }
  const result = checkDelta(threadRoot);
  if (result.failures.length > 0) {
    process.stdout.write(formatReport(result));
    process.exitCode = 1;
    return;
  }
  if (result.documents.length === 0) {
    console.log("no delta documents");
    process.exitCode = 0;
    return;
  }
  for (const line of land(result, process.cwd())) console.log(line);
  process.exitCode = 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main(process.argv.slice(2));
}
