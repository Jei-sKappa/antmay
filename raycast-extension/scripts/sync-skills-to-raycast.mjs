#!/usr/bin/env node
// Sync skills from `skills/` into the Raycast extension's bundled assets.
//
// Reads every `skills/**/SKILL.md`, strips YAML frontmatter, derives a friendly
// title and group label, and writes a single manifest JSON consumed by the
// extension at runtime via `environment.assetsPath`.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "node:fs/promises";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const EXTENSION_ROOT = resolve(SCRIPT_DIR, "..");
const REPO_ROOT = resolve(EXTENSION_ROOT, "..");
const SKILLS_DIR = join(REPO_ROOT, "skills");
const OUTPUT_PATH = join(EXTENSION_ROOT, "assets", "skills.json");

const GROUP_ORDER = [
  "capture-discussion",
  "propose",
  "spec",
  "plan",
  "implement",
  "review",
  "merge",
  "finish-navigate",
  "research",
  "documentation",
  "handoff",
  "support",
  "deprecated",
];

const titleCase = (kebab) =>
  kebab
    .split("-")
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");

const parseFrontmatter = (raw) => {
  if (!raw.startsWith("---\n")) {
    return { frontmatter: {}, body: raw };
  }
  const end = raw.indexOf("\n---", 4);
  if (end === -1) {
    return { frontmatter: {}, body: raw };
  }
  const yaml = raw.slice(4, end);
  const body = raw.slice(end + 4).replace(/^\n+/, "");
  const frontmatter = {};
  let currentKey = null;
  for (const line of yaml.split("\n")) {
    if (!line.trim()) continue;
    const match = line.match(/^(\s*)([\w.-]+):\s*(.*)$/);
    if (!match) continue;
    const [, indent, key, rest] = match;
    if (indent.length === 0) {
      currentKey = key;
      frontmatter[key] = rest.trim();
    } else if (currentKey) {
      if (typeof frontmatter[currentKey] !== "object") {
        frontmatter[currentKey] = {};
      }
      frontmatter[currentKey][key] = rest.trim();
    }
  }
  return { frontmatter, body };
};

const groupForPath = (relPath) => {
  const segments = relPath.split("/");
  if (segments[0] === "workflow") return segments[1];
  return segments[0];
};

const collectSkills = async () => {
  const files = [];
  for await (const file of glob("**/SKILL.md", { cwd: SKILLS_DIR })) {
    files.push(file);
  }
  files.sort();

  const skills = [];
  for (const file of files) {
    const absPath = join(SKILLS_DIR, file);
    const raw = await readFile(absPath, "utf8");
    const { frontmatter, body } = parseFrontmatter(raw);
    const dirName = file.split("/").slice(-2, -1)[0];
    const name = frontmatter.name || dirName;
    if (frontmatter.name && frontmatter.name !== dirName) {
      console.warn(
        `Warning: frontmatter name "${frontmatter.name}" does not match folder "${dirName}" (${file})`,
      );
    }
    const group = groupForPath(file);
    skills.push({
      name,
      title: titleCase(name),
      group,
      groupTitle: titleCase(group),
      description: frontmatter.description || "",
      version: frontmatter?.metadata?.version || "",
      sourcePath: relative(REPO_ROOT, absPath),
      body: body.trimEnd() + "\n",
    });
  }
  return skills;
};

const sortSkills = (skills) =>
  [...skills].sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a.group);
    const bi = GROUP_ORDER.indexOf(b.group);
    const ag = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const bg = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
    if (ag !== bg) return ag - bg;
    return a.name.localeCompare(b.name);
  });

const main = async () => {
  if (!existsSync(SKILLS_DIR)) {
    console.error(`Skills directory not found at ${SKILLS_DIR}`);
    process.exit(1);
  }

  const skills = sortSkills(await collectSkills());
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: "Jei-sKappa/skills",
    groupOrder: GROUP_ORDER,
    skills,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const byGroup = skills.reduce((acc, skill) => {
    acc[skill.group] = (acc[skill.group] || 0) + 1;
    return acc;
  }, {});
  const counts = Object.entries(byGroup)
    .map(([group, count]) => `  ${group}: ${count}`)
    .join("\n");
  console.log(`Wrote ${skills.length} skills to ${relative(REPO_ROOT, OUTPUT_PATH)}`);
  console.log(counts);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
