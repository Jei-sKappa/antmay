#!/usr/bin/env node
// Check a thread's delta against the project layer, and compute what landing
// it would write.
//
// Usage: node check-delta.mjs <thread root>
// Run from the project root: every delta document's target is read relative
// to the current working directory.
//
// Each file under `<thread root>/delta/` is one delta document. A name ending
// `.json` is an `edit` or `delete` document for the path without the suffix;
// any other name is a `create`, whose whole content is the file to write.
//
// Guarantees:
//   * Writes nothing: no file is opened for writing, under any input.
//   * Reports every failure in one run, each with its kind — `malformed` for a
//     document that breaks the format, `conflict` for a well-formed document
//     that does not fit the project layer as it stands.
//   * Matching is exact after normalizing line ends and trailing spaces and
//     tabs; a landed edit keeps every other byte of its target unchanged.
//   * An edit already done (its `new_string` occurs and every occurrence of
//     its `old_string` lies inside one) changes nothing and is no failure.
//   * The computation is exported (`checkDelta`, `formatReport`,
//     `isProjectLayerPath`), so a landing script reuses it; the command runs
//     only when this file is run directly.
//
// Exit codes: 0 no failure; 1 any failure; 2 usage error (a missing argument,
// or a thread root that is not a directory).
//
// Dependency-free: only `node:` built-ins.

import { readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * @typedef {{ index: number,                       // 1-based position in `edits`
 *             old_string: string, new_string: string, replace_all: boolean,
 *             status: "applies" | "already done" | "failed" }} EditResult
 * @typedef {{ path: string,                        // relative to the thread root, e.g. "delta/AGENTS.md.json"
 *             target: string,                      // relative to the project root, e.g. "AGENTS.md"
 *             type: "create" | "edit" | "delete" | null,   // null when the type cannot be read
 *             malformed: boolean,
 *             before: string | null,               // target as read; null when it does not exist
 *             landed: string | null,               // target after landing; null for a delete or a failed document
 *             edits: EditResult[] }} DeltaDocument
 * @typedef {{ kind: "malformed" | "conflict", document: string, edit: number | null, message: string }} Failure
 * @typedef {{ threadRoot: string, documents: DeltaDocument[], failures: Failure[] }} CheckResult
 */

const DELTA_DIR = "delta";
const IGNORED_NAMES = new Set([".DS_Store"]);
const EDIT_KEYS = new Set(["old_string", "new_string", "replace_all"]);

// ---------------------------------------------------------------------------
// Project-layer paths

/**
 * Whether `path` (relative to the project root, `/`-separated) names a file
 * of the project layer: `docs/glossary.md`, a direct child `.md` of
 * `docs/adr/` or `docs/pdr/`, or an agents file outside `.work/`.
 * @param {string} path
 * @returns {boolean}
 */
export function isProjectLayerPath(path) {
  if (typeof path !== "string" || path === "") return false;
  const segments = path.split("/");
  if (segments.some((s) => s === "" || s === "." || s === "..")) return false;
  if (path === "docs/glossary.md") return true;
  if (
    segments.length === 3 &&
    segments[0] === "docs" &&
    (segments[1] === "adr" || segments[1] === "pdr") &&
    segments[2].endsWith(".md") &&
    segments[2].length > ".md".length
  ) {
    return true;
  }
  const last = segments[segments.length - 1];
  return (last === "AGENTS.md" || last === "CLAUDE.md") && segments[0] !== ".work";
}

// ---------------------------------------------------------------------------
// Filesystem reading

function isDirectory(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function pathExists(p) {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

function readFileOrNull(p) {
  try {
    if (!statSync(p).isFile()) return null;
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

// Every file under `dir`, as `/`-separated paths relative to `dir`, sorted.
function listFiles(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_NAMES.has(entry.name)) continue;
    const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    const full = join(dir, entry.name);
    if (isDirectory(full)) out.push(...listFiles(full, rel));
    else out.push(rel);
  }
  return out;
}

function targetOf(relPath) {
  return relPath.endsWith(".json") ? relPath.slice(0, -".json".length) : relPath;
}

// ---------------------------------------------------------------------------
// Normalization and matching

/**
 * Normalize line ends to `\n` and strip spaces and tabs at the end of every
 * line. `map[i]` is the original offset of normalized character `i`, and
 * `ends[i]` the original offset just past it.
 */
function normalizeWithMap(text) {
  let norm = "";
  const map = [];
  const ends = [];
  let i = 0;
  while (i < text.length) {
    // Gather one line's content and its line end.
    let j = i;
    while (j < text.length && text[j] !== "\n" && text[j] !== "\r") j++;
    let contentEnd = j;
    while (contentEnd > i && (text[contentEnd - 1] === " " || text[contentEnd - 1] === "\t")) {
      contentEnd--;
    }
    for (let k = i; k < contentEnd; k++) {
      norm += text[k];
      map.push(k);
      ends.push(k + 1);
    }
    if (j >= text.length) break;
    const eolLength = text[j] === "\r" && text[j + 1] === "\n" ? 2 : 1;
    norm += "\n";
    map.push(j);
    ends.push(j + eolLength);
    i = j + eolLength;
  }
  return { norm, map, ends };
}

function normalize(text) {
  return normalizeWithMap(text).norm;
}

// Start positions of `needle` in `haystack`, overlapping occurrences included.
function occurrences(haystack, needle) {
  const found = [];
  if (needle === "") return found;
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    found.push(at);
    at = haystack.indexOf(needle, at + 1);
  }
  return found;
}

// Already done: `new_string` occurs, and every occurrence of `old_string` lies
// inside an occurrence of `new_string`. With an empty `new_string`, done
// exactly when `old_string` does not occur.
function isAlreadyDone(normContent, normOld, normNew) {
  const oldAt = occurrences(normContent, normOld);
  if (normNew === "") return oldAt.length === 0;
  const newAt = occurrences(normContent, normNew);
  if (newAt.length === 0) return false;
  return oldAt.every((p) =>
    newAt.some((q) => q <= p && p + normOld.length <= q + normNew.length),
  );
}

// Non-overlapping occurrences, left to right.
function disjointOccurrences(haystack, needle) {
  const found = [];
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    found.push(at);
    at = haystack.indexOf(needle, at + needle.length);
  }
  return found;
}

function withLineEnding(text, content) {
  const lf = text.replace(/\r\n?/g, "\n");
  return content.includes("\r\n") ? lf.replace(/\n/g, "\r\n") : lf;
}

// Replace the normalized matches at `starts` (each `length` long) in the
// original `content`, keeping every other byte unchanged.
function splice(content, normalized, starts, length, replacement) {
  const { map, ends } = normalized;
  const inserted = withLineEnding(replacement, content);
  let result = content;
  for (const s of [...starts].reverse()) {
    const from = map[s];
    const to = ends[s + length - 1];
    result = result.slice(0, from) + inserted + result.slice(to);
  }
  return result;
}

/**
 * Apply one edit to `content`.
 * @returns {{ status: EditResult["status"], content: string, count: number }}
 */
function applyEdit(content, edit) {
  const normalized = normalizeWithMap(content);
  const normOld = normalize(edit.old_string);
  const normNew = normalize(edit.new_string);
  if (isAlreadyDone(normalized.norm, normOld, normNew)) {
    return { status: "already done", content, count: 0 };
  }
  const count = occurrences(normalized.norm, normOld).length;
  if (count === 1 || (count > 1 && edit.replace_all)) {
    const starts = edit.replace_all
      ? disjointOccurrences(normalized.norm, normOld)
      : occurrences(normalized.norm, normOld);
    return {
      status: "applies",
      content: splice(content, normalized, starts, normOld.length, edit.new_string),
      count,
    };
  }
  return { status: "failed", content, count };
}

// ---------------------------------------------------------------------------
// Validation

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Problems with one edit object, as messages; an empty list means well formed.
function editProblems(edit) {
  if (!isPlainObject(edit)) return ["an edit must be a JSON object"];
  const problems = [];
  for (const key of Object.keys(edit)) {
    if (!EDIT_KEYS.has(key)) problems.push(`unknown key "${key}"`);
  }
  if (!("old_string" in edit)) problems.push(`missing key "old_string"`);
  else if (typeof edit.old_string !== "string" || edit.old_string === "") {
    problems.push(`"old_string" must be a non-empty string`);
  } else if (normalize(edit.old_string) === "") {
    problems.push(`"old_string" is empty after normalizing trailing spaces`);
  }
  if (!("new_string" in edit)) problems.push(`missing key "new_string"`);
  else if (typeof edit.new_string !== "string") problems.push(`"new_string" must be a string`);
  if ("replace_all" in edit && typeof edit.replace_all !== "boolean") {
    problems.push(`"replace_all" must be a boolean`);
  }
  return problems;
}

// Problems with a parsed JSON document's top level, as messages.
function topLevelProblems(json) {
  if (!isPlainObject(json)) return ["the document must be a JSON object"];
  const problems = [];
  if (!("type" in json)) problems.push(`missing key "type"`);
  else if (json.type !== "edit" && json.type !== "delete") {
    problems.push(`"type" must be "edit" or "delete"`);
  }
  const allowed = json.type === "edit" ? ["type", "edits"] : ["type"];
  for (const key of Object.keys(json)) {
    if (key === "edits" && json.type !== "edit" && json.type !== "delete") continue;
    if (!allowed.includes(key)) problems.push(`unknown key "${key}"`);
  }
  if (json.type === "edit") {
    if (!("edits" in json)) problems.push(`missing key "edits"`);
    else if (!Array.isArray(json.edits) || json.edits.length === 0) {
      problems.push(`"edits" must be a non-empty array`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Checking

function newDocument(path, target) {
  return { path, target, type: null, malformed: false, before: null, landed: null, edits: [] };
}

/**
 * Read one delta file into a document. Malformed findings are pushed to
 * `failures`; parsed edits (when well formed) are returned alongside.
 */
function readDocument(threadRoot, relPath, duplicated, failures) {
  const path = `${DELTA_DIR}/${relPath}`;
  const doc = newDocument(path, targetOf(relPath));
  const malformed = (message, edit = null) => {
    doc.malformed = true;
    failures.push({ kind: "malformed", document: path, edit, message });
  };
  const text = readFileSync(join(threadRoot, DELTA_DIR, ...relPath.split("/")), "utf8");

  if (!isProjectLayerPath(doc.target)) {
    malformed(`target "${doc.target}" mirrors no project-layer path`);
  }
  if (duplicated.has(doc.target)) {
    malformed(`target "${doc.target}" has two delta documents, delta/${doc.target} and delta/${doc.target}.json`);
  }

  if (!relPath.endsWith(".json")) {
    doc.type = "create";
    return { doc, text, edits: [] };
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    malformed(`the JSON does not parse (${error.message})`);
    return { doc, text, edits: [] };
  }
  if (isPlainObject(json) && (json.type === "edit" || json.type === "delete")) doc.type = json.type;
  for (const problem of topLevelProblems(json)) malformed(problem);
  if (doc.type === "edit" && Array.isArray(json.edits)) {
    json.edits.forEach((edit, i) => {
      for (const problem of editProblems(edit)) malformed(problem, i + 1);
    });
  }
  const edits = doc.malformed ? [] : json.edits ?? [];
  return { doc, text, edits };
}

// Conflict checks and the landing computation for a well-formed document.
function checkDocument(doc, text, edits, projectRoot, failures) {
  const targetPath = join(projectRoot, ...doc.target.split("/"));
  const exists = pathExists(targetPath);
  doc.before = exists ? readFileOrNull(targetPath) : null;
  const conflict = (message, edit = null) =>
    failures.push({ kind: "conflict", document: doc.path, edit, message });

  if (doc.type === "create") {
    if (exists) conflict(`create targets "${doc.target}", which exists`);
    else doc.landed = text;
    return;
  }

  const results = edits.map((e, i) => ({
    index: i + 1,
    old_string: e.old_string,
    new_string: e.new_string,
    replace_all: e.replace_all === true,
    status: "failed",
  }));
  doc.edits = results;

  if (doc.before === null) {
    conflict(
      exists
        ? `${doc.type} targets "${doc.target}", which is not a readable file`
        : `${doc.type} targets "${doc.target}", which does not exist`,
    );
    return;
  }
  if (doc.type === "delete") return;

  let content = doc.before;
  let failed = false;
  for (const result of results) {
    const outcome = applyEdit(content, result);
    result.status = outcome.status;
    if (outcome.status === "failed") {
      failed = true;
      conflict(
        outcome.count > 1
          ? `old_string occurs ${outcome.count} times and replace_all is not set`
          : `old_string does not occur, and the edit is not already done`,
        result.index,
      );
    } else {
      content = outcome.content;
    }
  }
  doc.landed = failed ? null : content;
}

/**
 * Check the delta of the thread at `threadRoot` against the project layer at
 * `projectRoot`, and compute each target as it would stand after landing.
 * Opens no file for writing.
 * @param {string} threadRoot
 * @param {string} [projectRoot]
 * @returns {CheckResult}
 */
export function checkDelta(threadRoot, projectRoot = process.cwd()) {
  /** @type {CheckResult} */
  const result = { threadRoot, documents: [], failures: [] };
  const deltaDir = join(threadRoot, DELTA_DIR);
  if (!isDirectory(deltaDir)) return result;

  const files = listFiles(deltaDir).sort();
  const targetCounts = new Map();
  for (const f of files) targetCounts.set(targetOf(f), (targetCounts.get(targetOf(f)) ?? 0) + 1);
  const duplicated = new Set([...targetCounts].filter(([, n]) => n > 1).map(([t]) => t));

  for (const relPath of files) {
    const { doc, text, edits } = readDocument(threadRoot, relPath, duplicated, result.failures);
    if (!doc.malformed) checkDocument(doc, text, edits, projectRoot, result.failures);
    result.documents.push(doc);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Report

/**
 * Render a check result as text: one header per document, one line per edit,
 * one line per failure, and a closing count.
 * @param {CheckResult} result
 * @returns {string}
 */
export function formatReport(result) {
  const lines = [];
  if (result.documents.length === 0) lines.push(`no delta documents under ${DELTA_DIR}/`);
  for (const doc of result.documents) {
    const type = doc.type ?? "unknown type";
    lines.push(`${doc.path} -> ${doc.target} (${type}${doc.malformed ? ", malformed" : ""})`);
    if (doc.type === "edit") {
      for (const edit of doc.edits) lines.push(`  edit ${edit.index}: ${edit.status}`);
    }
  }
  if (result.failures.length > 0) lines.push("");
  for (const f of result.failures) {
    const where = f.edit === null ? f.document : `${f.document} edit ${f.edit}`;
    lines.push(`${f.kind}: ${where}: ${f.message}`);
  }
  lines.push("");
  const n = result.failures.length;
  lines.push(n === 0 ? "no failures" : `${n} failure${n === 1 ? "" : "s"}`);
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------
// Command

function main(args) {
  if (args.length !== 1) {
    console.error("usage: node check-delta.mjs <thread root>");
    process.exit(2);
  }
  const threadRoot = args[0];
  if (!isDirectory(threadRoot)) {
    console.error(`check-delta: "${threadRoot}" is not a directory`);
    process.exit(2);
  }
  const result = checkDelta(threadRoot);
  process.stdout.write(formatReport(result));
  process.exitCode = result.failures.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main(process.argv.slice(2));
}
