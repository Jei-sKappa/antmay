#!/usr/bin/env node
// Sync shared references from the canonical sources under `shared/references/`
// into each declaring skill's `references/` folder.
//
// Source of truth: `shared/references/`. Declarations: `shared/manifest.yaml`
// (a strictly flat map — skill-path key -> list of source paths relative to
// `shared/references/`). Each declared source is mirrored to the same relative
// path under the skill's `references/` folder. Edit the canonical sources and
// rerun; NEVER hand-edit the generated copies.
//
// Ownership model: the script owns exactly the files the manifest declares. On
// every run it deletes and rewrites precisely those files, leaving every other
// file under `references/` (hand-authored, skill-local references) untouched.
// Removing a manifest entry does NOT delete its previously generated copy —
// delete that orphan by hand.
//
// Guarantees:
//   * Validate everything before deleting anything (manifest parses; every
//     declared skill path contains a SKILL.md; every declared source exists).
//     Any validation failure -> exit non-zero, touch nothing.
//   * Deletion authority is structurally confined to files under each skill's
//     `references/` folder that are named by a current manifest entry (asserted
//     before every rm).
//   * Deterministic output: byte-for-byte copies, stable iteration order,
//     no timestamps written into outputs.
//
// Dependency-free: only `node:` built-ins.

import {
  readFileSync,
  statSync,
  rmSync,
  mkdirSync,
  copyFileSync,
} from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const MANIFEST_PATH = join(REPO_ROOT, "shared", "manifest.yaml");
const SHARED_REFS_DIR = join(REPO_ROOT, "shared", "references");

function fail(message) {
  console.error(`sync-shared-references: ${message}`);
  process.exit(1);
}

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

// Minimal parser for the restricted flat-map shape. Rejects anything that is
// not a zero-indent `skill/path:` key line or a two-space `  - value` list
// item — so anchors, nesting, inline values, and multiline strings all error.
function parseManifest(text, sourceLabel) {
  const map = new Map();
  let currentKey = null;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNo = i + 1;
    const where = `${sourceLabel}:${lineNo}`;

    if (raw.includes("\t")) {
      fail(`tab character not allowed (${where})`);
    }
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    if (!/^\s/.test(raw)) {
      // Top-level key: `skill/path:` with no inline value.
      const m = raw.match(/^(\S.*?):$/);
      if (!m) {
        fail(`expected a flat 'skill/path:' key with no inline value (${where}): ${raw}`);
      }
      const key = m[1];
      if (map.has(key)) {
        fail(`duplicate skill key '${key}' (${where})`);
      }
      map.set(key, []);
      currentKey = key;
      continue;
    }

    // Indented line: must be a two-space list item under a current key.
    const m = raw.match(/^ {2}- (\S.*?)$/);
    if (!m) {
      fail(`expected a two-space '  - <path>' list item (${where}): ${raw}`);
    }
    if (currentKey === null) {
      fail(`list item before any skill key (${where}): ${raw}`);
    }
    map.get(currentKey).push(m[1].trim());
  }

  for (const [key, entries] of map) {
    if (entries.length === 0) {
      fail(`skill key '${key}' declares no source entries`);
    }
  }
  if (map.size === 0) {
    fail(`manifest declares no skills (${sourceLabel})`);
  }
  return map;
}

// Structural guard: refuse to delete anything that is not a file living inside
// the skill's own `references/` folder (the manifest entry names it).
function assertGeneratedFile(absFile, skillDir) {
  const refsRoot = resolve(skillDir, "references");
  const underRefs = relative(refsRoot, absFile);
  if (underRefs.startsWith("..") || underRefs === "" || resolve(refsRoot, underRefs) !== absFile) {
    fail(`refusing to touch a path outside the skill's references/ folder: ${absFile}`);
  }
}

function main() {
  if (!isFile(MANIFEST_PATH)) {
    fail(`manifest not found at ${relative(REPO_ROOT, MANIFEST_PATH)}`);
  }

  const manifest = parseManifest(readFileSync(MANIFEST_PATH, "utf8"), "shared/manifest.yaml");

  // ---- VALIDATE EVERYTHING BEFORE DELETING ANYTHING ----
  const errors = [];
  for (const [skillPath, entries] of manifest) {
    const skillDir = resolve(REPO_ROOT, skillPath);
    if (relative(REPO_ROOT, skillDir).startsWith("..")) {
      errors.push(`skill path escapes the repo: ${skillPath}`);
      continue;
    }
    if (!isFile(join(skillDir, "SKILL.md"))) {
      errors.push(`declared skill path has no SKILL.md: ${skillPath}`);
    }
    for (const entry of entries) {
      const src = resolve(SHARED_REFS_DIR, entry);
      if (relative(SHARED_REFS_DIR, src).startsWith("..")) {
        errors.push(`source entry escapes shared/references/: ${entry} (in ${skillPath})`);
        continue;
      }
      if (!isFile(src)) {
        errors.push(`declared source missing under shared/references/: ${entry} (in ${skillPath})`);
      }
    }
  }
  if (errors.length > 0) {
    fail(`validation failed, nothing modified:\n  - ${errors.join("\n  - ")}`);
  }

  // ---- APPLY (only after full validation) ----
  let copied = 0;
  for (const [skillPath, entries] of manifest) {
    const skillDir = resolve(REPO_ROOT, skillPath);
    for (const entry of entries) {
      const src = resolve(SHARED_REFS_DIR, entry);
      const dest = resolve(skillDir, "references", entry);
      assertGeneratedFile(dest, skillDir);
      rmSync(dest, { force: true });
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      copied += 1;
    }
    console.log(`  ${skillPath}/references <- ${entries.length} file(s)`);
  }
  console.log(`sync-shared-references: wrote ${copied} file(s) across ${manifest.size} skill(s).`);
}

main();
