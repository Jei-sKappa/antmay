import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadExecutionProfile, loadStageSettings } from "../config/execution.js";
import { resolveDocumentReference } from "../config/references.js";
import { CATALOG_STAGE_IDS, STAGE_CATALOG } from "./catalog.js";
import { loadPipelineDocument } from "./documents.js";
import type { ArtifactPrerequisite } from "../thread/artifacts.js";
import type { CatalogStageId } from "./types.js";

/**
 * The published documentation is a contract surface of its own: `cli/README.md`
 * is where a user learns which documents to write and which skills can be
 * stages, and nothing in the executor fails when that prose drifts away from the
 * code. These cases close that gap — the copyable documents are fed to the
 * production loaders, and the support matrix is compared against the skills the
 * suite actually publishes and against the catalog's own prerequisites.
 */

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), "utf8");
}

const CLI_README = readRepoFile("cli/README.md");
const ROOT_README = readRepoFile("README.md");
const ROOT_AGENTS = readRepoFile("AGENTS.md");
const CLI_AGENTS = readRepoFile("cli/AGENTS.md");
const SUITE_AGENTS = readRepoFile("suite/AGENTS.md");

const tempRoots: string[] = [];

function configRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "antmay-doc-config-"));
  tempRoots.push(root);
  return root;
}

afterAll(() => {
  for (const root of tempRoots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

/**
 * The body of the first fenced JSON block that follows `anchor`, which is the
 * block a reader copies out of that section.
 */
function jsonBlockAfter(anchor: string): string {
  const anchorAt = CLI_README.indexOf(anchor);
  expect(anchorAt, `cli/README.md has no "${anchor}" section`).toBeGreaterThan(-1);
  const open = CLI_README.indexOf("```json\n", anchorAt);
  expect(open, `no JSON block follows "${anchor}"`).toBeGreaterThan(-1);
  const start = open + "```json\n".length;
  const close = CLI_README.indexOf("\n```", start);
  expect(close, `the JSON block after "${anchor}" is unterminated`).toBeGreaterThan(-1);
  return CLI_README.slice(start, close);
}

describe("the copyable documents in cli/README.md", () => {
  it("publishes a Standard pipeline the production loader accepts at the documented path", () => {
    const root = configRoot();
    // Saved exactly where the README says to save it, and reached the way the
    // README says to reach it: by the bare name `standard`.
    const reference = resolveDocumentReference("standard", "pipeline", root, root);
    expect(reference.ok).toBe(true);
    if (!reference.ok) return;
    const source = reference.reference.sourcePath;
    expect(source).toBe(path.join(root, "pipelines", "standard.json"));

    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(
      source,
      jsonBlockAfter("### The Standard pipeline, ready to copy"),
      "utf8",
    );

    const loaded = loadPipelineDocument(source);
    expect(loaded.ok ? [] : loaded.errors).toEqual([]);
    if (!loaded.ok) return;
    expect(loaded.document.name).toBe("standard");
    expect(loaded.document.stages.map((entry) => entry.stage)).toEqual([
      "spec",
      "reconcile-spec",
      "review-spec",
      "plan-strict",
      "reconcile-plan",
      "implement-plan-with-subagents",
    ]);
  });

  it("publishes a settings document the production loader accepts", () => {
    const root = configRoot();
    fs.writeFileSync(
      path.join(root, "settings.json"),
      jsonBlockAfter("### `settings.json`"),
      "utf8",
    );

    const loaded = loadStageSettings(root);
    expect(loaded.ok ? [] : loaded.errors).toEqual([]);
    if (!loaded.ok) return;
    expect(Object.keys(loaded.stages).length).toBeGreaterThan(0);
  });

  it("publishes an execution profile the production loader accepts at the documented path", () => {
    const root = configRoot();
    const reference = resolveDocumentReference("codex-planning", "profile", root, root);
    expect(reference.ok).toBe(true);
    if (!reference.ok) return;
    const source = reference.reference.sourcePath;
    expect(source).toBe(path.join(root, "profiles", "codex-planning.json"));

    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(source, jsonBlockAfter("### Execution profiles"), "utf8");

    const loaded = loadExecutionProfile(source);
    expect(loaded.ok ? [] : loaded.errors).toEqual([]);
    if (!loaded.ok) return;
    expect(loaded.profile.name).toBe("codex-planning");
  });
});

type SupportLabel = "Supported" | "Planned" | "Unsupported";

type MatrixRow = {
  skill: string;
  support: string;
  note: string;
};

/**
 * The support matrix parsed out of its README section: one row per skill, with
 * the support label and the prerequisite-or-reason cell.
 */
function matrixRows(): MatrixRow[] {
  const start = CLI_README.indexOf("## Antmay skill support");
  expect(start, "cli/README.md has no skill support section").toBeGreaterThan(-1);
  const end = CLI_README.indexOf("\n## ", start + 1);
  const section = CLI_README.slice(start, end === -1 ? undefined : end);

  const rows: MatrixRow[] = [];
  for (const line of section.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== 3) continue;
    const [first, support, note] = cells as [string, string, string];
    if (first === "Skill" || /^-+$/.test(first)) continue;
    const named = /^\[?`([^`]+)`\]?/.exec(first);
    expect(named, `matrix row "${line}" does not name a skill`).not.toBeNull();
    rows.push({ skill: named![1]!, support, note });
  }
  return rows;
}

/** Every skill the suite publishes, by folder name. */
function publishedSkills(): string[] {
  const skillsRoot = path.join(REPO_ROOT, "suite", "skills");
  const names: string[] = [];
  for (const category of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const categoryDir = path.join(skillsRoot, category.name);
    for (const skill of fs.readdirSync(categoryDir, { withFileTypes: true })) {
      if (!skill.isDirectory()) continue;
      if (!fs.existsSync(path.join(categoryDir, skill.name, "SKILL.md"))) continue;
      names.push(skill.name);
    }
  }
  return names.sort();
}

/** Every skill the root README indexes, by the name in its section heading. */
function indexedSkills(): string[] {
  const names: string[] = [];
  const pattern = /^#+ \[`([^`]+)`\]\(\.\/suite\/skills\//gm;
  for (const match of ROOT_README.matchAll(pattern)) {
    names.push(match[1]!);
  }
  return names.sort();
}

/**
 * The phrases a supported stage's cell must contain, and the ones it must not,
 * derived from the catalog's own prerequisite so the documentation cannot drift
 * from the contract it describes.
 */
function prerequisitePhrases(prerequisite: ArtifactPrerequisite): {
  required: string[];
  forbidden: string[];
} {
  expect(
    Object.keys(prerequisite).sort(),
    "a prerequisite dimension exists that the documentation check cannot phrase",
  ).toEqual(
    Object.keys(prerequisite)
      .filter((key) => key === "validThread" || key === "spec" || key === "plan")
      .sort(),
  );

  const required: string[] = [];
  const forbidden: string[] = [];
  if (prerequisite.validThread === true) required.push("valid thread");
  (prerequisite.spec === true ? required : forbidden).push("`spec.md`");
  (prerequisite.plan === "brief" ? required : forbidden).push("brief plan");
  (prerequisite.plan === "strict" ? required : forbidden).push("strict plan");
  return { required, forbidden };
}

const PLANNED_SKILLS = [
  "propose",
  "reconcile-proposal",
  "reconcile-roadmap",
  "review-roadmap",
  "roadmap",
];

describe("the Antmay skill support matrix in cli/README.md", () => {
  // Parsed in a hook rather than in the suite body, so a missing section or a
  // malformed row fails these cases instead of collapsing the whole file into a
  // collection error.
  let rows: MatrixRow[] = [];
  beforeAll(() => {
    rows = matrixRows();
  });

  it("covers every published skill exactly once", () => {
    const listed = rows.map((row) => row.skill).sort();
    expect(new Set(listed).size).toBe(listed.length);
    expect(listed).toEqual(publishedSkills());
    expect(listed).toEqual(indexedSkills());
  });

  it("uses one of the three support labels on every row", () => {
    const labels: SupportLabel[] = ["Supported", "Planned", "Unsupported"];
    for (const row of rows) {
      expect(labels, `${row.skill} has an unrecognized support label`).toContain(
        row.support,
      );
    }
  });

  it("marks exactly the catalog stages supported, with the catalog's prerequisites", () => {
    const supported = rows
      .filter((row) => row.support === "Supported")
      .map((row) => row.skill)
      .sort();
    expect(supported).toEqual([...CATALOG_STAGE_IDS].sort());

    for (const row of rows.filter((entry) => entry.support === "Supported")) {
      const stage = STAGE_CATALOG[row.skill as CatalogStageId];
      const { required, forbidden } = prerequisitePhrases(stage.prerequisite);
      for (const phrase of required) {
        expect(row.note, `${row.skill} must document "${phrase}"`).toContain(phrase);
      }
      for (const phrase of forbidden) {
        expect(row.note, `${row.skill} must not document "${phrase}"`).not.toContain(
          phrase,
        );
      }
    }
  });

  it("labels exactly the deferred proposal and Roadmap capabilities planned", () => {
    const planned = rows
      .filter((row) => row.support === "Planned")
      .map((row) => row.skill)
      .sort();
    expect(planned).toEqual(PLANNED_SKILLS);
    for (const row of rows.filter((entry) => entry.support === "Planned")) {
      expect(row.note.toLowerCase()).toContain("still being evaluated");
    }
  });

  it("gives a user-visible reason for every other unsupported skill", () => {
    const unsupported = rows.filter((row) => row.support === "Unsupported");
    expect(unsupported.length).toBe(
      rows.length - CATALOG_STAGE_IDS.length - PLANNED_SKILLS.length,
    );
    for (const row of unsupported) {
      // A reason has to say something a user can act on, so a bare restatement
      // of the label, a dash, or a placeholder does not pass. The threshold is
      // structural on purpose — a length and a closing period, nothing about
      // meaning: no assertion expressible in a test can decide whether prose is
      // genuinely user-facing, so a long reason worded for maintainers passes
      // here too, and only a human reading the published table catches that.
      expect(
        row.note.length,
        `${row.skill} needs a user-visible reason, not "${row.note}"`,
      ).toBeGreaterThan(40);
      expect(row.note.toLowerCase()).not.toBe("unsupported");
      expect(row.note).not.toBe("—");
      expect(row.note).toMatch(/\.$/);
    }
  });
});

describe("the cross-module maintenance rule", () => {
  const HEADING = "## Keep the CLI stage support reference current";
  /**
   * A clause long enough that only a copy of the rule carries it: a module file
   * that happens to mention one of these terms in passing is not a restatement.
   * Both sides are whitespace-collapsed before matching, so rewrapping the
   * paragraph the clause lives in does not move it out of reach.
   */
  const OBLIGATION =
    "invocation posture, accepted inputs, durable outputs, or side-effect boundaries";

  function flowed(body: string): string {
    return body.replace(/\s+/g, " ");
  }

  it("lives in the root AGENTS.md", () => {
    expect(ROOT_AGENTS).toContain(HEADING);
    expect(flowed(ROOT_AGENTS)).toContain(OBLIGATION);
  });

  it("is not restated in either module's AGENTS.md", () => {
    for (const [name, body] of [
      ["cli/AGENTS.md", CLI_AGENTS],
      ["suite/AGENTS.md", SUITE_AGENTS],
    ] as const) {
      expect(body, `${name} restates the root rule's heading`).not.toContain(HEADING);
      expect(flowed(body), `${name} restates the root rule`).not.toContain(OBLIGATION);
    }
  });
});
