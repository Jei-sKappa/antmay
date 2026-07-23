import { promises as fs } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { standardRecipe } from "../recipe/standard.js";
import type { GitPolicy } from "../recipe/types.js";
import {
  createRepoFixture,
  type RepoFixture,
} from "../test-helpers/git-fixture.js";
import { evaluateBoundary, finalizeBoundary } from "./boundary.js";
import { collectBoundaryStatus, readHead } from "./status.js";

const fixtures: RepoFixture[] = [];

afterEach(async () => {
  while (fixtures.length > 0) {
    const fixture = fixtures.pop();
    if (fixture) await fixture.cleanup();
  }
});

async function newFixture(): Promise<RepoFixture> {
  const fixture = await createRepoFixture({ thread: {} });
  fixtures.push(fixture);
  return fixture;
}

function policyOf(id: string): GitPolicy {
  const stage = standardRecipe.stages.find((entry) => entry.id === id);
  if (stage === undefined) throw new Error(`no standard stage "${id}"`);
  return stage.gitPolicy;
}

async function lastSubject(fixture: RepoFixture): Promise<string> {
  const result = await fixture.git(["log", "-1", "--pretty=%s"]);
  return result.stdout.trim();
}

async function commitCount(fixture: RepoFixture): Promise<number> {
  const result = await fixture.git(["rev-list", "--count", "HEAD"]);
  return Number(result.stdout.trim());
}

describe("evaluateBoundary + finalizeBoundary — standard `spec`", () => {
  it("commits a required spec.md change with the exact subject", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    await fs.writeFile(
      path.join(fixture.threadPath as string, "spec.md"),
      "# Spec\n",
      "utf8",
    );
    const head = await readHead(fixture.root);
    const observed = await collectBoundaryStatus(fixture.root);

    const evaluation = evaluateBoundary(
      policyOf("spec"),
      rel,
      observed,
      head,
      head,
    );
    expect(evaluation).toEqual({ ok: true, changedPaths: [`${rel}/spec.md`] });
    if (!evaluation.ok) return;

    const result = await finalizeBoundary(
      fixture.root,
      policyOf("spec"),
      fixture.threadFolder as string,
      evaluation,
    );
    expect(result).toEqual({
      kind: "committed",
      subject: `docs(${fixture.threadFolder}): spec`,
    });
    expect(await lastSubject(fixture)).toBe(
      `docs(${fixture.threadFolder}): spec`,
    );
    expect(await collectBoundaryStatus(fixture.root)).toEqual([]);
  });
});

describe("standard `reconcile-spec`", () => {
  it("advances without a commit when the worktree is unchanged", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    const head = await readHead(fixture.root);
    const before = await commitCount(fixture);

    const evaluation = evaluateBoundary(
      policyOf("reconcile-spec"),
      rel,
      [],
      head,
      head,
    );
    expect(evaluation).toEqual({ ok: true, changedPaths: [] });
    if (!evaluation.ok) return;

    const result = await finalizeBoundary(
      fixture.root,
      policyOf("reconcile-spec"),
      fixture.threadFolder as string,
      evaluation,
    );
    expect(result).toEqual({ kind: "advanced-without-commit" });
    expect(await commitCount(fixture)).toBe(before);
  });
});

describe("standard `review-spec`", () => {
  it("treats any change as a git-policy-violation", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    await fs.writeFile(
      path.join(fixture.threadPath as string, "spec.md"),
      "# Spec\n",
      "utf8",
    );
    const head = await readHead(fixture.root);
    const observed = await collectBoundaryStatus(fixture.root);

    const evaluation = evaluateBoundary(
      policyOf("review-spec"),
      rel,
      observed,
      head,
      head,
    );
    expect(evaluation.ok).toBe(false);
    if (evaluation.ok) return;
    expect(evaluation.kind).toBe("git-policy-violation");
  });
});

describe("standard `plan-strict`", () => {
  it("commits plan.md and plan-tasks descendants", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    const threadPath = fixture.threadPath as string;
    await fs.writeFile(path.join(threadPath, "plan.md"), "# Plan\n", "utf8");
    await fs.mkdir(path.join(threadPath, "plan-tasks"));
    await fs.writeFile(
      path.join(threadPath, "plan-tasks", "01.md"),
      "# Task\n",
      "utf8",
    );
    const head = await readHead(fixture.root);
    const observed = await collectBoundaryStatus(fixture.root);

    const evaluation = evaluateBoundary(
      policyOf("plan-strict"),
      rel,
      observed,
      head,
      head,
    );
    expect(evaluation.ok).toBe(true);
    if (!evaluation.ok) return;

    const result = await finalizeBoundary(
      fixture.root,
      policyOf("plan-strict"),
      fixture.threadFolder as string,
      evaluation,
    );
    expect(result).toEqual({
      kind: "committed",
      subject: `docs(${fixture.threadFolder}): plan`,
    });
    expect(await collectBoundaryStatus(fixture.root)).toEqual([]);
  });

  it("violates when a stray file is present", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    await fs.writeFile(
      path.join(fixture.threadPath as string, "plan.md"),
      "# Plan\n",
      "utf8",
    );
    await fs.writeFile(path.join(fixture.root, "stray.txt"), "s", "utf8");
    const head = await readHead(fixture.root);
    const observed = await collectBoundaryStatus(fixture.root);

    const evaluation = evaluateBoundary(
      policyOf("plan-strict"),
      rel,
      observed,
      head,
      head,
    );
    expect(evaluation.ok).toBe(false);
    if (evaluation.ok) return;
    expect(evaluation.message).toContain("stray.txt");
  });

  it("violates when the required change is missing on a normal attempt", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    const head = await readHead(fixture.root);

    const evaluation = evaluateBoundary(
      policyOf("plan-strict"),
      rel,
      [],
      head,
      head,
    );
    expect(evaluation.ok).toBe(false);
  });
});

describe("resume-finalization mode", () => {
  it("accepts an already-committed required diff and does not enforce HEAD", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    const headAtStart = await readHead(fixture.root);

    // The user deliberately committed the intended diff themselves.
    await fs.writeFile(
      path.join(fixture.threadPath as string, "spec.md"),
      "# Spec\n",
      "utf8",
    );
    await fixture.git(["add", "-A"]);
    await fixture.git(["commit", "-m", "docs: user-committed spec"]);
    const headAtBoundary = await readHead(fixture.root);

    const evaluation = evaluateBoundary(
      policyOf("spec"),
      rel,
      [],
      headAtStart,
      headAtBoundary,
      { enforceHead: false, allowRequiredChangeToBeAlreadyCommitted: true },
    );
    expect(evaluation).toEqual({ ok: true, changedPaths: [] });
    if (!evaluation.ok) return;

    const before = await commitCount(fixture);
    const result = await finalizeBoundary(
      fixture.root,
      policyOf("spec"),
      fixture.threadFolder as string,
      evaluation,
    );
    expect(result).toEqual({ kind: "advanced-without-commit" });
    expect(await commitCount(fixture)).toBe(before);
  });
});

describe("HEAD rule", () => {
  it("violates when HEAD moves mid-attempt under a forbidding policy", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    const headAtStart = await readHead(fixture.root);
    await fixture.git(["commit", "--allow-empty", "-m", "chore: move head"]);
    const headAtBoundary = await readHead(fixture.root);

    const evaluation = evaluateBoundary(
      policyOf("spec"),
      rel,
      [],
      headAtStart,
      headAtBoundary,
    );
    expect(evaluation.ok).toBe(false);
    if (evaluation.ok) return;
    expect(evaluation.message).toContain("HEAD");
  });

  it("permits HEAD movement for implement-plan-with-subagents but still requires a clean end", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    const headAtStart = await readHead(fixture.root);
    await fixture.git(["commit", "--allow-empty", "-m", "chore: task commit"]);
    const headAtBoundary = await readHead(fixture.root);
    const implementPolicy = policyOf("implement-plan-with-subagents");

    // Clean end: HEAD moved, but no residual change → passes, no commit.
    const clean = evaluateBoundary(
      implementPolicy,
      rel,
      [],
      headAtStart,
      headAtBoundary,
    );
    expect(clean).toEqual({ ok: true, changedPaths: [] });
    if (!clean.ok) return;
    const finalizeClean = await finalizeBoundary(
      fixture.root,
      implementPolicy,
      fixture.threadFolder as string,
      clean,
    );
    expect(finalizeClean).toEqual({ kind: "advanced-without-commit" });

    // Residual worktree change → violation despite the permitted HEAD move.
    const dirty = evaluateBoundary(
      implementPolicy,
      rel,
      [`${rel}/leftover.txt`],
      headAtStart,
      headAtBoundary,
    );
    expect(dirty.ok).toBe(false);
  });
});

describe("finalizeBoundary error surfaces", () => {
  it("returns commit-error on a staged-set discrepancy", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    // The tracked seed.md is unchanged, so `git add` stages no diff and the
    // staged set will not equal the validated set.
    const evaluation = {
      ok: true as const,
      changedPaths: [`${rel}/seed.md`],
    };
    const result = await finalizeBoundary(
      fixture.root,
      policyOf("spec"),
      fixture.threadFolder as string,
      evaluation,
    );
    expect(result.kind).toBe("commit-error");
  });

  it("returns commit-error when a pre-commit hook fails", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    const hookDir = path.join(fixture.root, ".git", "hooks");
    await fs.mkdir(hookDir, { recursive: true });
    const hook = path.join(hookDir, "pre-commit");
    await fs.writeFile(hook, "#!/bin/sh\necho 'hook rejected' 1>&2\nexit 1\n", {
      mode: 0o755,
    });

    await fs.writeFile(
      path.join(fixture.threadPath as string, "spec.md"),
      "# Spec\n",
      "utf8",
    );
    const head = await readHead(fixture.root);
    const observed = await collectBoundaryStatus(fixture.root);
    const evaluation = evaluateBoundary(
      policyOf("spec"),
      rel,
      observed,
      head,
      head,
    );
    expect(evaluation.ok).toBe(true);
    if (!evaluation.ok) return;

    const result = await finalizeBoundary(
      fixture.root,
      policyOf("spec"),
      fixture.threadFolder as string,
      evaluation,
    );
    expect(result.kind).toBe("commit-error");
  });
});

describe("policy-data-only (no stage-name branching)", () => {
  it("performs no executor commit for a synthetic policy with a null template", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    const synthetic: GitPolicy = {
      headMayChange: true,
      allowedChanges: [{ kind: "subtree", threadRelativePath: "notes" }],
      changeRequired: false,
      commitSubjectTemplate: null,
    };
    await fs.mkdir(path.join(fixture.threadPath as string, "notes"));
    await fs.writeFile(
      path.join(fixture.threadPath as string, "notes", "a.md"),
      "n",
      "utf8",
    );
    const head = await readHead(fixture.root);
    const observed = await collectBoundaryStatus(fixture.root);

    const evaluation = evaluateBoundary(synthetic, rel, observed, head, head);
    expect(evaluation.ok).toBe(true);
    if (!evaluation.ok) return;
    expect(evaluation.changedPaths).toEqual([`${rel}/notes/a.md`]);

    const before = await commitCount(fixture);
    const result = await finalizeBoundary(
      fixture.root,
      synthetic,
      fixture.threadFolder as string,
      evaluation,
    );
    expect(result).toEqual({ kind: "advanced-without-commit" });
    expect(await commitCount(fixture)).toBe(before);
  });
});
