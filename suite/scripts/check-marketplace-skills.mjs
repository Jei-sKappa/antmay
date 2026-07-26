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

// The `name:` value from a skill's YAML frontmatter — the only field the CLI
// matches `--skill <name>` against.
function readFrontmatterName(skillDir) {
  const text = readFileSync(join(skillDir, "SKILL.md"), "utf8");
  const lines = text.split(/\r?\n/);
  if (lines[0].trim() !== "---") return null;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "---") break;
    const m = line.match(/^name:\s*(\S.*?)\s*$/);
    if (m) return m[1];
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
    const name = readFrontmatterName(skillDir);
    if (!name) {
      errors.push(`SKILL.md has no frontmatter 'name:' field: ${rel(skillDir)}`);
      continue;
    }
    if (names.has(name)) {
      errors.push(
        `duplicate skill name '${name}' (${rel(names.get(name))} and ${rel(skillDir)}): discovery keeps only one`,
      );
      continue;
    }
    names.set(name, skillDir);
  }

  if (errors.length > 0) {
    fail(`marketplace.json and suite/skills/ disagree:\n  - ${errors.join("\n  - ")}`);
  }

  console.log(
    `check-marketplace-skills: OK — ${onDisk.length} skill(s) under suite/skills/, all declared in marketplace.json.`,
  );
}

main();
