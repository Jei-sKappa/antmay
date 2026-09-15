#!/usr/bin/env node
// Verify that `.claude-plugin/marketplace.json` declares every skill under
// `suite/skills/`, and only skills that exist.
//
// Why this is a hard gate: the `skills` CLI finds a skill in this repo ONLY
// because the marketplace manifest names it. Discovery scans a fixed list of
// root-relative priority directories (the repo root, `skills/`, the per-agent
// skill dirs) and then appends the parent directory of every path in each
// plugin entry's `skills` array. Since the skills live under `suite/`, no
// priority directory matches them and the manifest is the only thing that
// makes them visible. A skill missing from the manifest is NOT a cosmetic
// grouping bug: it silently disappears from `npx skills add`, because the
// recursive fallback scan only runs when discovery found nothing at all — and
// the other declared skills are always found.
//
// Also rejects duplicate frontmatter `name:` values across skills: discovery
// de-duplicates on name and keeps whichever it reaches first, so a collision
// silently drops a skill, and `--skill <name>` matches on that field alone.
//
// Also rejects frontmatter a YAML parser would refuse. The CLI parses the
// block with a real YAML parser and skips the skill on any error, with a
// warning that scrolls past; `update` then reads the missing skill as deleted
// upstream and removes it from the machine. The usual trigger is an unquoted
// value holding `: ` — YAML reads that as a nested mapping. Without a YAML
// dependency this script validates the subset the suite writes: single-line
// `key: value` entries, one level of nesting under a key with no value, and
// plain or quoted scalars that follow YAML's plain-scalar rules.
//
// Path resolution mirrors the CLI: pluginBase = <repo>/<metadata.pluginRoot>/
// <plugins[].source>, and each `skills` entry resolves relative to pluginBase.
// Only relative paths starting with `./` are honored, matching the manifest
// spec the CLI enforces.
//
// Exit codes: 0 = manifest and disk agree; 1 = drift or malformed input.
//
// Dependency-free: only `node:` built-ins.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SUITE_ROOT = resolve(SCRIPT_DIR, "..");
const REPO_ROOT = resolve(SUITE_ROOT, "..");
const MARKETPLACE_PATH = join(REPO_ROOT, ".claude-plugin", "marketplace.json");
const SKILLS_ROOT = join(SUITE_ROOT, "skills");

// Mirrors the CLI's own skip list so the two agree on what is not a skill dir.
const SKIP_DIRS = ["node_modules", ".git", "dist", "build", "__pycache__"];

function fail(message) {
  console.error(`check-marketplace-skills: ${message}`);
  process.exit(1);
}

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function rel(absPath) {
  return relative(REPO_ROOT, absPath);
}

// Every directory under suite/skills/ that holds a SKILL.md, at any depth.
function findSkillDirs(root) {
  const found = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      fail(`cannot read directory: ${rel(dir)}`);
    }
    if (isFile(join(dir, "SKILL.md"))) {
      // A skill folder is a leaf: never treat a nested SKILL.md as its own skill.
      found.push(dir);
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP_DIRS.includes(entry.name)) continue;
      walk(join(dir, entry.name));
    }
  };
  walk(root);
  return found.sort();
}

// The frontmatter block of a SKILL.md, parsed as the YAML subset the suite
// writes. Returns `{ data, errors }`: `data` maps top-level keys to their
// scalar value (or to a nested map), and `errors` lists everything a YAML
// parser would reject, or that falls outside the subset, in the words a
// skill author needs to fix it.
function parseFrontmatter(skillDir) {
  const text = readFileSync(join(skillDir, "SKILL.md"), "utf8");
  const lines = text.split(/\r?\n/);
  const errors = [];
  const data = {};
  if (lines[0].trim() !== "---") {
    return { data, errors: ["SKILL.md does not open with a '---' frontmatter block"] };
  }

  let closed = false;
  let parent = null; // top-level key whose nested map is being filled
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const where = `line ${i + 1}`;
    if (line.trim() === "---") {
      closed = true;
      break;
    }
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    const m = line.match(/^( *)([A-Za-z][A-Za-z0-9_-]*):(?:[ \t]+(.*?))?[ \t]*$/);
    if (!m) {
      errors.push(`${where} is not a 'key: value' entry: ${line.trim()}`);
      continue;
    }
    const [, indent, key, rawValue] = m;
    const value = rawValue ?? "";

    if (indent.length === 0) {
      parent = null;
      if (value === "") {
        data[key] = {};
        parent = key;
      } else {
        data[key] = value;
      }
    } else if (indent.length === 2 && parent !== null) {
      if (value === "") {
        errors.push(`${where}: nested key '${key}' has no value; the suite writes one level of nesting only`);
        continue;
      }
      data[parent][key] = value;
    } else {
      errors.push(`${where}: unexpected indentation before '${key}:'`);
      continue;
    }

    if (value !== "") {
      const problem = plainScalarProblem(value);
      if (problem) errors.push(`${where}, '${key}:' ${problem}`);
    }
  }
  if (!closed) errors.push("frontmatter block is never closed by a second '---'");

  for (const required of ["name", "description"]) {
    if (typeof data[required] !== "string" || data[required] === "") {
      errors.push(`missing required frontmatter field '${required}:' (the CLI skips the skill without it)`);
    }
  }
  return { data, errors };
}

// Why a YAML parser would reject `value` as written on one line, or null when
// it would read it as the intended string. Quoted scalars must close on the
// same line; plain scalars follow YAML's plain-scalar restrictions.
function plainScalarProblem(value) {
  const first = value[0];
  if (first === '"' || first === "'") {
    if (value.length < 2 || value[value.length - 1] !== first) {
      return `opens with ${first} but does not close on the same line`;
    }
    return null;
  }
  if ("[]{}&*!|>%@`".includes(first) || value.startsWith("- ") || value === "-") {
    return `starts with '${first}', which YAML reads as syntax rather than text; rephrase or quote the value`;
  }
  if (value.includes(": ") || value.endsWith(":")) {
    return "contains ': ', which YAML reads as a nested mapping and refuses; rephrase without the colon";
  }
  if (value.includes(" #")) {
    return "contains ' #', which YAML reads as the start of a comment; rephrase or quote the value";
  }
  return null;
}

// Absolute skill paths the manifest declares, resolved the way the CLI does.
function declaredSkillDirs(manifest) {
  const pluginRoot = manifest.metadata?.pluginRoot;
  if (pluginRoot !== undefined && !pluginRoot.startsWith("./")) {
    fail(`metadata.pluginRoot must start with './': ${pluginRoot}`);
  }

  const declared = new Map();
  const plugins = manifest.plugins ?? [];
  if (plugins.length === 0) {
    fail("marketplace.json declares no plugins");
  }

  for (const plugin of plugins) {
    const label = plugin.name ?? "<unnamed plugin>";
    if (plugin.source !== undefined && typeof plugin.source !== "string") {
      fail(`plugin '${label}' uses a remote source; the CLI skips it and its skills would vanish`);
    }
    if (plugin.source !== undefined && !plugin.source.startsWith("./")) {
      fail(`plugin '${label}' has a source that does not start with './': ${plugin.source}`);
    }
    const pluginBase = join(REPO_ROOT, pluginRoot ?? "", plugin.source ?? "");

    for (const skillPath of plugin.skills ?? []) {
      if (!skillPath.startsWith("./")) {
        fail(`plugin '${label}' declares a skill path that does not start with './': ${skillPath}`);
      }
      const skillDir = resolve(pluginBase, skillPath);
      if (declared.has(skillDir)) {
        fail(`skill declared twice: ${rel(skillDir)}`);
      }
      declared.set(skillDir, label);
    }
  }
  return declared;
}

function main() {
  if (!isFile(MARKETPLACE_PATH)) {
    fail(`marketplace manifest not found at ${rel(MARKETPLACE_PATH)}`);
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MARKETPLACE_PATH, "utf8"));
  } catch (error) {
    fail(`marketplace.json is not valid JSON: ${error.message}`);
  }

  const declared = declaredSkillDirs(manifest);
  const onDisk = findSkillDirs(SKILLS_ROOT);
  const onDiskSet = new Set(onDisk);

  const errors = [];

  for (const skillDir of onDisk) {
    if (!declared.has(skillDir)) {
      errors.push(
        `on disk but NOT declared in marketplace.json (it would be silently uninstallable): ${rel(skillDir)}`,
      );
    }
  }

  for (const [skillDir, pluginName] of declared) {
    if (!onDiskSet.has(skillDir)) {
      const reason = isFile(join(skillDir, "SKILL.md"))
        ? "outside suite/skills/"
        : "no SKILL.md there";
      errors.push(`declared by plugin '${pluginName}' but ${reason}: ${rel(skillDir)}`);
    }
  }

  const names = new Map();
  for (const skillDir of onDisk) {
    const { data, errors: frontmatterErrors } = parseFrontmatter(skillDir);
    for (const problem of frontmatterErrors) {
      errors.push(`invalid frontmatter in ${rel(join(skillDir, "SKILL.md"))}: ${problem}`);
    }
    const name = typeof data.name === "string" ? data.name : null;
    if (!name) continue;
    if (names.has(name)) {
      errors.push(
        `duplicate skill name '${name}' (${rel(names.get(name))} and ${rel(skillDir)}): discovery keeps only one`,
      );
      continue;
    }
    names.set(name, skillDir);
  }

  if (errors.length > 0) {
    fail(`suite/skills/ has problems:\n  - ${errors.join("\n  - ")}`);
  }

  console.log(
    `check-marketplace-skills: OK — ${onDisk.length} skill(s) under suite/skills/, all declared in marketplace.json.`,
  );
}

main();
