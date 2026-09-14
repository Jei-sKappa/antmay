#!/usr/bin/env node
// Check the text of every `.md` under `suite/skills/` and
// `suite/shared/references/` against three mechanical rules, and report every
// hit as `path:line: rule`.
//
// Why each rule is a hard gate:
//
//   * bare-reference — a `references/` path without the `<skill_path>/` prefix
//     is indistinguishable, to an agent working at the project root, from a
//     path in the project it is operating on. The agent either looks for a
//     folder that does not exist there or, worse, finds an unrelated one. The
//     prefix is what says "inside this skill's own folder".
//   * per-before-path — `per <a file>` reads as a citation the agent may skip;
//     a pointer at a shipped reference file is a directive to open and follow
//     that file. `per` before a same-body heading pointer is fine and is not
//     matched: the rule fires only on ``per `<skill_path>``.
//   * indented-fence — a fenced block with leading whitespace renders
//     inconsistently across list and quote contexts, and can be swallowed into
//     the surrounding block. Fences start at column one.
//
// `suite/authoring/` is deliberately NOT walked: the authoring documents quote
// the forbidden forms as negative examples, so every rule would fire on them by
// design. `scripts/` and `shared/manifest.yaml` are outside the walk roots for
// the same reason of scope — this check reads shipped prose only, and modifies
// nothing.
//
// Exit codes: 0 = no hit; 1 = at least one hit.
//
// Dependency-free: only `node:` built-ins.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SUITE_ROOT = resolve(SCRIPT_DIR, "..");

// The only two roots this check walks: shipped skill folders and the canonical
// shared references they are generated from.
const WALK_ROOTS = [join(SUITE_ROOT, "skills"), join(SUITE_ROOT, "shared", "references")];

// Mirrors the marketplace check's skip list so the scripts agree on what is
// not suite content.
const SKIP_DIRS = ["node_modules", ".git", "dist", "build", "__pycache__"];

const SKILL_PATH_PREFIX = "<skill_path>/";
const REFERENCES = "references/";

function fail(message) {
  console.error(`check-skill-text: ${message}`);
  process.exit(1);
}

function rel(absPath) {
  return relative(SUITE_ROOT, absPath);
}

// Every `.md` file under `root`, at any depth, in stable path order.
function findMarkdownFiles(root) {
  const found = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      fail(`cannot read directory: ${rel(dir)}`);
    }
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.includes(entry.name)) continue;
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        found.push(full);
      }
    }
  };
  walk(root);
  return found;
}

// A `references/` path is skill-local only when `<skill_path>/` immediately
// precedes it; every other occurrence is a hit.
function bareReferenceHits(line) {
  let count = 0;
  let i = line.indexOf(REFERENCES);
  while (i !== -1) {
    const prefixStart = i - SKILL_PATH_PREFIX.length;
    if (prefixStart < 0 || line.slice(prefixStart, i) !== SKILL_PATH_PREFIX) count++;
    i = line.indexOf(REFERENCES, i + 1);
  }
  return count;
}

function checkLine(line) {
  const rules = [];
  for (let n = bareReferenceHits(line); n > 0; n--) rules.push("bare-reference");
  if (line.includes("per `" + SKILL_PATH_PREFIX.slice(0, -1))) rules.push("per-before-path");
  if (/^[ \t]+```/.test(line)) rules.push("indented-fence");
  return rules;
}

function main() {
  const files = WALK_ROOTS.flatMap((root) => findMarkdownFiles(root));
  const hits = [];

  for (const file of files) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      for (const rule of checkLine(lines[index])) {
        hits.push({ path: rel(file), lineNo: index + 1, rule });
      }
    }
  }

  if (hits.length > 0) {
    for (const hit of hits) {
      console.error(`${hit.path}:${hit.lineNo}: ${hit.rule}`);
    }
    process.exit(1);
  }

  console.log(
    `check-skill-text: OK — ${files.length} file(s) under skills/ and shared/references/, no bare reference, no per-before-path, no indented fence.`,
  );
}

main();
