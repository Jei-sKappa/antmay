import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  resolveSkillAvailability,
  SkillUnavailableError,
  skillRootsFor,
} from "../src/preflight/skill-availability";

let sandbox: string;
let repo: string;
let home: string;

beforeEach(() => {
  sandbox = realpathSync.native(mkdtempSync(join(tmpdir(), "antmay-skill-")));
  repo = join(sandbox, "repo");
  home = join(sandbox, "home");
  mkdirSync(repo, { recursive: true });
  mkdirSync(home, { recursive: true });
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function writeSkill(
  root: string,
  name: string,
  opts: {
    frontmatterName?: string;
    openai?: boolean;
    skipSkillMd?: boolean;
  } = {},
): void {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  if (opts.skipSkillMd !== true) {
    writeFileSync(
      join(dir, "SKILL.md"),
      `---\nname: ${opts.frontmatterName ?? name}\ndescription: does a thing\n---\n\nbody\n`,
      "utf8",
    );
  }
  if (opts.openai === true) {
    mkdirSync(join(dir, "agents"), { recursive: true });
    writeFileSync(
      join(dir, "agents", "openai.yaml"),
      "interface: {}\n",
      "utf8",
    );
  }
}

const claudeProject = () => join(repo, ".claude", "skills");
const claudeUser = () => join(home, ".claude", "skills");
const codexProject = () => join(repo, ".agents", "skills");
const codexUser = () => join(home, ".agents", "skills");

describe("skillRootsFor", () => {
  it("orders default Claude roots project-then-user", () => {
    expect(skillRootsFor("claude", repo, { HOME: home })).toEqual([
      claudeProject(),
      claudeUser(),
    ]);
  });

  it("orders default Codex roots project-then-user", () => {
    expect(skillRootsFor("codex", repo, { HOME: home })).toEqual([
      codexProject(),
      codexUser(),
    ]);
  });

  it("replaces only the targeted harness roots via its override", () => {
    const custom = join(sandbox, "custom");
    expect(
      skillRootsFor("claude", repo, {
        HOME: home,
        ANTMAY_CLAUDE_SKILL_ROOTS: custom,
      }),
    ).toEqual([custom]);
    // Codex roots stay default when only the Claude override is set.
    expect(
      skillRootsFor("codex", repo, {
        HOME: home,
        ANTMAY_CLAUDE_SKILL_ROOTS: custom,
      }),
    ).toEqual([codexProject(), codexUser()]);
  });
});

describe("resolveSkillAvailability", () => {
  it("resolves a matching Claude project skill", () => {
    writeSkill(claudeProject(), "propose");
    const result = resolveSkillAvailability({
      harness: "claude",
      skill: "propose",
      repositoryPath: repo,
      env: { HOME: home },
    });
    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.root).toBe(claudeProject());
    }
  });

  it("falls back to the Claude user root", () => {
    writeSkill(claudeUser(), "propose");
    const result = resolveSkillAvailability({
      harness: "claude",
      skill: "propose",
      repositoryPath: repo,
      env: { HOME: home },
    });
    expect(result.available && result.root).toBe(claudeUser());
  });

  it("prefers the project root when both scopes match", () => {
    writeSkill(claudeProject(), "propose");
    writeSkill(claudeUser(), "propose");
    const result = resolveSkillAvailability({
      harness: "claude",
      skill: "propose",
      repositoryPath: repo,
      env: { HOME: home },
    });
    expect(result.available && result.root).toBe(claudeProject());
  });

  it("rejects a frontmatter-name mismatch", () => {
    writeSkill(claudeProject(), "propose", {
      frontmatterName: "something-else",
    });
    const result = resolveSkillAvailability({
      harness: "claude",
      skill: "propose",
      repositoryPath: repo,
      env: { HOME: home },
    });
    expect(result.available).toBe(false);
  });

  it("rejects a missing SKILL.md", () => {
    writeSkill(claudeProject(), "propose", { skipSkillMd: true });
    const result = resolveSkillAvailability({
      harness: "claude",
      skill: "propose",
      repositoryPath: repo,
      env: { HOME: home },
    });
    expect(result.available).toBe(false);
  });

  it("requires agents/openai.yaml for a Codex skill", () => {
    writeSkill(codexProject(), "propose");
    const missing = resolveSkillAvailability({
      harness: "codex",
      skill: "propose",
      repositoryPath: repo,
      env: { HOME: home },
    });
    expect(missing.available).toBe(false);

    writeSkill(codexProject(), "propose", { openai: true });
    const present = resolveSkillAvailability({
      harness: "codex",
      skill: "propose",
      repositoryPath: repo,
      env: { HOME: home },
    });
    expect(present.available).toBe(true);
  });

  it("does not resolve a skill present only in the other harness roots", () => {
    // Installed for Codex only; Claude availability must not see it.
    writeSkill(codexProject(), "propose", { openai: true });
    const result = resolveSkillAvailability({
      harness: "claude",
      skill: "propose",
      repositoryPath: repo,
      env: { HOME: home },
    });
    expect(result.available).toBe(false);
  });

  it("emits the exact install remediation on failure", () => {
    const result = resolveSkillAvailability({
      harness: "claude",
      skill: "propose",
      repositoryPath: repo,
      env: { HOME: home },
    });
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.remediation).toBe(
        "npx skills add Jei-sKappa/antmay --skill propose",
      );
      expect(result.searchedRoots).toEqual([claudeProject(), claudeUser()]);
    }
  });

  it("carries harness, roots, and remediation on the thrown error", () => {
    const failure = resolveSkillAvailability({
      harness: "claude",
      skill: "propose",
      repositoryPath: repo,
      env: { HOME: home },
    });
    if (failure.available) {
      throw new Error("expected unavailable");
    }
    const error = new SkillUnavailableError(failure);
    expect(error.message).toContain("claude");
    expect(error.message).toContain(claudeProject());
    expect(error.message).toContain(
      "npx skills add Jei-sKappa/antmay --skill propose",
    );
  });
});
