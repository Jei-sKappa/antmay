// Harness-specific skill availability. The catalog — not a prose scan — defines
// eligibility; this module only confirms that a catalog skill is actually
// installed for the selected harness. Availability searches project scope before
// user scope, so a project skill wins over a same-named user skill. Every
// candidate needs a readable SKILL.md whose `name:` frontmatter equals the
// catalog name; a Codex candidate additionally needs `agents/openai.yaml`. A
// skill present only in the other harness's roots, a plugin cache, or a
// nonstandard root is unavailable. The two harness root lists are independently
// injectable so tests can replace Claude and Codex roots in isolation.

import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Harness } from "@antmay/core";

/**
 * Environment that overrides the default skill roots. Each value is a
 * PATH-style, `:`-delimited ordered list of skill parent directories. When set
 * non-empty it fully replaces the default project/user roots for that harness,
 * so Claude and Codex roots are replaceable independently.
 */
export type SkillRootsEnv = {
  readonly ANTMAY_CLAUDE_SKILL_ROOTS?: string | undefined;
  readonly ANTMAY_CODEX_SKILL_ROOTS?: string | undefined;
  readonly HOME?: string | undefined;
};

/** A resolved availability outcome for a single harness/skill pair. */
export type SkillAvailability =
  | {
      readonly available: true;
      readonly harness: Harness;
      readonly skill: string;
      readonly skillDir: string;
      readonly root: string;
    }
  | {
      readonly available: false;
      readonly harness: Harness;
      readonly skill: string;
      readonly searchedRoots: readonly string[];
      readonly remediation: string;
    };

/** Raised when a selected catalog skill is not installed for the harness. */
export class SkillUnavailableError extends Error {
  readonly harness: Harness;
  readonly skill: string;
  readonly searchedRoots: readonly string[];
  readonly remediation: string;

  constructor(failure: Extract<SkillAvailability, { available: false }>) {
    super(
      `The "${failure.skill}" skill is not installed for the ${failure.harness} harness. Searched roots: ${failure.searchedRoots.join(", ")}. Install it with: ${failure.remediation}`,
    );
    this.name = "SkillUnavailableError";
    this.harness = failure.harness;
    this.skill = failure.skill;
    this.searchedRoots = failure.searchedRoots;
    this.remediation = failure.remediation;
  }
}

function homeDir(env: SkillRootsEnv): string {
  const explicit = env.HOME;
  return explicit !== undefined && explicit.length > 0 ? explicit : homedir();
}

function defaultRoots(
  harness: Harness,
  repositoryPath: string,
  env: SkillRootsEnv,
): readonly string[] {
  const home = homeDir(env);
  if (harness === "claude") {
    return [
      join(repositoryPath, ".claude", "skills"),
      join(home, ".claude", "skills"),
    ];
  }
  return [
    join(repositoryPath, ".agents", "skills"),
    join(home, ".agents", "skills"),
  ];
}

function overrideValue(
  harness: Harness,
  env: SkillRootsEnv,
): string | undefined {
  const raw =
    harness === "claude"
      ? env.ANTMAY_CLAUDE_SKILL_ROOTS
      : env.ANTMAY_CODEX_SKILL_ROOTS;
  return raw !== undefined && raw.length > 0 ? raw : undefined;
}

/**
 * The ordered skill roots searched for a harness: an injected override when
 * present, otherwise the default project-then-user pair.
 */
export function skillRootsFor(
  harness: Harness,
  repositoryPath: string,
  env: SkillRootsEnv = {},
): readonly string[] {
  const override = overrideValue(harness, env);
  if (override !== undefined) {
    return override.split(":").filter((entry) => entry.length > 0);
  }
  return defaultRoots(harness, repositoryPath, env);
}

// Read the `name:` field from a SKILL.md YAML frontmatter block. Returns null
// when the file is unreadable, has no leading frontmatter, or declares no name.
function readFrontmatterName(skillMd: string): string | null {
  let raw: string;
  try {
    if (!statSync(skillMd).isFile()) {
      return null;
    }
    raw = readFileSync(skillMd, "utf8");
  } catch {
    return null;
  }
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return null;
  }
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (line.trim() === "---") {
      return null;
    }
    const match = /^name:\s*(.+?)\s*$/.exec(line);
    if (match?.[1] !== undefined) {
      return match[1].replace(/^["']|["']$/g, "").trim();
    }
  }
  return null;
}

function candidateSatisfies(
  harness: Harness,
  skill: string,
  skillDir: string,
): boolean {
  const name = readFrontmatterName(join(skillDir, "SKILL.md"));
  if (name !== skill) {
    return false;
  }
  if (harness === "codex") {
    return existsSync(join(skillDir, "agents", "openai.yaml"));
  }
  return true;
}

/**
 * Resolve whether `skill` is installed for `harness`, searching the harness's
 * ordered roots (project before user). The first satisfying candidate wins; the
 * failure form names every searched root and the exact install remediation.
 */
export function resolveSkillAvailability(input: {
  harness: Harness;
  skill: string;
  repositoryPath: string;
  env?: SkillRootsEnv;
}): SkillAvailability {
  const { harness, skill, repositoryPath } = input;
  const roots = skillRootsFor(harness, repositoryPath, input.env ?? {});
  for (const root of roots) {
    const skillDir = join(root, skill);
    if (candidateSatisfies(harness, skill, skillDir)) {
      return { available: true, harness, skill, skillDir, root };
    }
  }
  return {
    available: false,
    harness,
    skill,
    searchedRoots: roots,
    remediation: `npx skills add Jei-sKappa/antmay --skill ${skill}`,
  };
}
