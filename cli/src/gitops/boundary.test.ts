import { promises as fs } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { STAGE_CATALOG } from "../pipeline/catalog.js";
import type { CatalogStageId, GitPolicy } from "../pipeline/types.js";
import {
  createRepoFixture,
  type RepoFixture,
} from "../test-helpers/git-fixture.js";
import { finalizeGitBoundary } from "./boundary.js";
import type {
  GitBoundaryContext,
  GitBoundaryOperations,
  GitBoundaryResult,
} from "./boundary.js";
import { runGit } from "./git.js";
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

function policyOf(id: CatalogStageId): GitPolicy {
  return STAGE_CATALOG[id].gitPolicy;
}

async function lastSubject(fixture: RepoFixture): Promise<string> {
  const result = await fixture.git(["log", "-1", "--pretty=%s"]);
  return result.stdout.trim();
}

async function commitCount(fixture: RepoFixture): Promise<number> {
  const result = await fixture.git(["rev-list", "--count", "HEAD"]);
  return Number(result.stdout.trim());
}

/** Write a thread file, creating any parent directory it names. */
async function writeThreadFile(
  fixture: RepoFixture,
  relPath: string,
  content: string,
): Promise<void> {
  const absPath = path.join(fixture.threadPath as string, relPath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, content, "utf8");
}

/** Move the tip with a commit of its own, returning the new tip. */
async function moveHead(fixture: RepoFixture, subject: string): Promise<string> {
  await fixture.git(["commit", "--allow-empty", "-m", subject]);
  return readHead(fixture.root);
}

/** Finalize the fixture's boundary under one policy and context. */
async function finalize(
  fixture: RepoFixture,
  policy: GitPolicy,
  context: GitBoundaryContext,
): Promise<GitBoundaryResult> {
  return finalizeGitBoundary({
    repoRoot: fixture.root,
    threadRelPath: fixture.threadRelPath as string,
    threadFolder: fixture.threadFolder as string,
    policy,
    context,
  });
}

function boundaryOperations(
  overrides: Partial<GitBoundaryOperations>,
): GitBoundaryOperations {
  return { readHead, collectBoundaryStatus, runGit, ...overrides };
}

async function finalizeWithOperations(
  fixture: RepoFixture,
  policy: GitPolicy,
  context: GitBoundaryContext,
  overrides: Partial<GitBoundaryOperations>,
): Promise<GitBoundaryResult> {
  return finalizeGitBoundary(
    {
      repoRoot: fixture.root,
      threadRelPath: fixture.threadRelPath as string,
      threadFolder: fixture.threadFolder as string,
      policy,
      context,
    },
    boundaryOperations(overrides),
  );
}

/** The context of an attempt that left the tip exactly where it found it. */
async function steadyAttempt(
  fixture: RepoFixture,
): Promise<GitBoundaryContext> {
  const head = await readHead(fixture.root);
  return {
    kind: "attempt",
    attempt: { headAtStart: head, headAfterAttempt: head },
  };
}

describe("finalizeGitBoundary — a normal attempt", () => {
  it("commits a required spec.md change with the exact subject", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    await writeThreadFile(fixture, "spec.md", "# Spec\n");
    const head = await readHead(fixture.root);

    const result = await finalize(
      fixture,
      policyOf("spec"),
      await steadyAttempt(fixture),
    );

    const subject = `docs(${fixture.threadFolder}): spec`;
    const afterHead = await readHead(fixture.root);
    expect(result).toEqual({
      kind: "finalized",
      commit: { kind: "committed", subject },
      observedPaths: [`${rel}/spec.md`],
      headAfterFinalization: afterHead,
    });
    expect(afterHead).not.toBe(head);
    expect(await lastSubject(fixture)).toBe(subject);
    expect(await collectBoundaryStatus(fixture.root)).toEqual([]);
  });

  it("commits paths whose names carry spaces and quotes", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    const awkward = `a task "01" - draft.md`;
    await writeThreadFile(fixture, "plan.md", "# Plan\n");
    await writeThreadFile(fixture, `plan-tasks/${awkward}`, "# Task\n");

    const result = await finalize(
      fixture,
      policyOf("plan-strict"),
      await steadyAttempt(fixture),
    );

    expect(result.kind).toBe("finalized");
    if (result.kind !== "finalized") return;
    expect(result.observedPaths).toEqual([
      `${rel}/plan-tasks/${awkward}`,
      `${rel}/plan.md`,
    ]);
    expect(await collectBoundaryStatus(fixture.root)).toEqual([]);
  });

  it("advances without a commit when the worktree is unchanged", async () => {
    const fixture = await newFixture();
    const head = await readHead(fixture.root);
    const before = await commitCount(fixture);

    const result = await finalize(
      fixture,
      policyOf("reconcile-spec"),
      await steadyAttempt(fixture),
    );

    expect(result).toEqual({
      kind: "finalized",
      commit: { kind: "none" },
      observedPaths: [],
      headAfterFinalization: head,
    });
    expect(await commitCount(fixture)).toBe(before);
  });

  it("treats any change as a git-policy-violation for a clean-boundary stage", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    await writeThreadFile(fixture, "spec.md", "# Spec\n");
    const before = await commitCount(fixture);

    const result = await finalize(
      fixture,
      policyOf("review-spec"),
      await steadyAttempt(fixture),
    );

    expect(result.kind).toBe("git-policy-violation");
    if (result.kind !== "git-policy-violation") return;
    expect(result.cause).toBe("out-of-bounds");
    expect(result.message).toContain(`${rel}/spec.md`);
    expect(result.observedPaths).toEqual([`${rel}/spec.md`]);
    expect(await commitCount(fixture)).toBe(before);
  });

  it("commits plan.md and plan-tasks descendants", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    await writeThreadFile(fixture, "plan.md", "# Plan\n");
    await writeThreadFile(fixture, "plan-tasks/01.md", "# Task\n");

    const result = await finalize(
      fixture,
      policyOf("plan-strict"),
      await steadyAttempt(fixture),
    );

    expect(result).toEqual({
      kind: "finalized",
      commit: {
        kind: "committed",
        subject: `docs(${fixture.threadFolder}): plan`,
      },
      observedPaths: [`${rel}/plan-tasks/01.md`, `${rel}/plan.md`],
      headAfterFinalization: await readHead(fixture.root),
    });
    expect(await collectBoundaryStatus(fixture.root)).toEqual([]);
  });

  it("violates when a stray file sits outside the allowed selectors", async () => {
    const fixture = await newFixture();
    await writeThreadFile(fixture, "plan.md", "# Plan\n");
    await fs.writeFile(path.join(fixture.root, "stray.txt"), "s", "utf8");

    const result = await finalize(
      fixture,
      policyOf("plan-strict"),
      await steadyAttempt(fixture),
    );

    expect(result.kind).toBe("git-policy-violation");
    if (result.kind !== "git-policy-violation") return;
    expect(result.cause).toBe("out-of-bounds");
    expect(result.message).toContain("stray.txt");
  });

  it("violates when the required change is missing", async () => {
    const fixture = await newFixture();

    const result = await finalize(
      fixture,
      policyOf("plan-strict"),
      await steadyAttempt(fixture),
    );

    expect(result.kind).toBe("git-policy-violation");
    if (result.kind !== "git-policy-violation") return;
    expect(result.cause).toBe("change-required");
    expect(result.message).toContain("at least one allowed change");
    expect(result.observedPaths).toEqual([]);
  });

  it("violates when a HEAD-permitting stage left no report to commit", async () => {
    const fixture = await newFixture();
    // The attempt made its own per-task commit, which this stage permits, but
    // left the required allowed change unmade.
    const headAtStart = await readHead(fixture.root);
    const headAfterAttempt = await moveHead(fixture, "chore: task commit");
    const before = await commitCount(fixture);

    const result = await finalize(
      fixture,
      policyOf("implement-plan-with-subagents"),
      { kind: "attempt", attempt: { headAtStart, headAfterAttempt } },
    );

    expect(result.kind).toBe("git-policy-violation");
    if (result.kind !== "git-policy-violation") return;
    expect(result.cause).toBe("change-required");
    expect(result.message).toContain("at least one allowed change");
    expect(result.observedPaths).toEqual([]);
    expect(await commitCount(fixture)).toBe(before);
  });

  it("commits the implementation report with the exact subject", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    await writeThreadFile(
      fixture,
      "implementation-report.md",
      "# Implementation Report\n",
    );

    const result = await finalize(
      fixture,
      policyOf("implement-plan-with-subagents"),
      await steadyAttempt(fixture),
    );

    const subject = `docs(${fixture.threadFolder}): implementation report`;
    expect(result).toEqual({
      kind: "finalized",
      commit: { kind: "committed", subject },
      observedPaths: [`${rel}/implementation-report.md`],
      headAfterFinalization: await readHead(fixture.root),
    });
    expect(await lastSubject(fixture)).toBe(subject);
    expect(await collectBoundaryStatus(fixture.root)).toEqual([]);
  });

  it("violates when uncommitted code sits beside the report", async () => {
    const fixture = await newFixture();
    await writeThreadFile(
      fixture,
      "implementation-report.md",
      "# Implementation Report\n",
    );
    await fs.writeFile(path.join(fixture.root, "src-leftover.ts"), "x", "utf8");

    const result = await finalize(
      fixture,
      policyOf("implement-plan-with-subagents"),
      await steadyAttempt(fixture),
    );

    expect(result.kind).toBe("git-policy-violation");
    if (result.kind !== "git-policy-violation") return;
    expect(result.message).toContain("src-leftover.ts");
    expect(result.message).not.toContain("implementation-report.md");
  });

  it("violates when the attempt moved HEAD under a forbidding policy", async () => {
    const fixture = await newFixture();
    const headAtStart = await readHead(fixture.root);
    const headAfterAttempt = await moveHead(fixture, "chore: move head");
    await writeThreadFile(fixture, "spec.md", "# Spec\n");
    const before = await commitCount(fixture);

    const result = await finalize(fixture, policyOf("spec"), {
      kind: "attempt",
      attempt: { headAtStart, headAfterAttempt },
    });

    expect(result.kind).toBe("git-policy-violation");
    if (result.kind !== "git-policy-violation") return;
    expect(result.cause).toBe("head-rule");
    expect(result.message).toContain("forbids HEAD movement");
    expect(result.headAfterFinalization).toBe(headAfterAttempt);
    expect(await commitCount(fixture)).toBe(before);
  });

  it("permits the implementation stages' own per-task commits", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    const headAtStart = await readHead(fixture.root);
    const headAfterAttempt = await moveHead(fixture, "chore: task commit");
    await writeThreadFile(
      fixture,
      "implementation-report.md",
      "# Implementation Report\n",
    );

    const result = await finalize(
      fixture,
      policyOf("implement-plan-with-subagents"),
      { kind: "attempt", attempt: { headAtStart, headAfterAttempt } },
    );

    expect(result.kind).toBe("finalized");
    if (result.kind !== "finalized") return;
    expect(result.observedPaths).toEqual([`${rel}/implementation-report.md`]);
    expect(result.headAfterFinalization).not.toBe(headAfterAttempt);
  });

  it("still bounds the boundary when HEAD movement is permitted", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    const headAtStart = await readHead(fixture.root);
    const headAfterAttempt = await moveHead(fixture, "chore: task commit");
    await writeThreadFile(
      fixture,
      "implementation-report.md",
      "# Implementation Report\n",
    );
    await writeThreadFile(fixture, "leftover.txt", "x");

    const result = await finalize(
      fixture,
      policyOf("implement-plan-with-subagents"),
      { kind: "attempt", attempt: { headAtStart, headAfterAttempt } },
    );

    expect(result.kind).toBe("git-policy-violation");
    if (result.kind !== "git-policy-violation") return;
    expect(result.cause).toBe("out-of-bounds");
    expect(result.message).toContain(`${rel}/leftover.txt`);
  });

  it("identifies an unresolvable allowed-change selector", async () => {
    const fixture = await newFixture();
    const policy: GitPolicy = {
      ...policyOf("spec"),
      allowedChanges: [
        { kind: "exact-file", threadRelativePath: "../outside.md" },
      ],
    };

    const result = await finalize(
      fixture,
      policy,
      await steadyAttempt(fixture),
    );

    expect(result.kind).toBe("git-policy-violation");
    if (result.kind !== "git-policy-violation") return;
    expect(result.cause).toBe("unresolvable-selector");
    expect(result.message).toContain("must not contain");
  });
});

describe("finalizeGitBoundary — first finalization after a contract repair", () => {
  it("judges the preserved attempt's own interval, not the movement across the pause", async () => {
    const fixture = await newFixture();
    // The attempt itself committed, which the `spec` stage forbids; the human
    // then repaired the promise and committed something else of their own.
    const headAtStart = await readHead(fixture.root);
    const headAfterAttempt = await moveHead(fixture, "chore: attempt commit");
    await writeThreadFile(fixture, "spec.md", "# Spec\n");
    const pausedAtHead = headAfterAttempt;
    const observedHead = await moveHead(fixture, "chore: human commit");
    const before = await commitCount(fixture);

    const result = await finalize(fixture, policyOf("spec"), {
      kind: "after-contract-repair",
      attempt: { headAtStart, headAfterAttempt },
      pausedAtHead,
    });

    expect(result.kind).toBe("git-policy-violation");
    if (result.kind !== "git-policy-violation") return;
    expect(result.cause).toBe("head-rule");
    expect(result.message).toContain("forbids HEAD movement");
    expect(result.message).toContain(headAtStart);
    expect(result.message).toContain(headAfterAttempt);
    // The human's movement is evidence the transition owner reports, not a rule.
    expect(result.headMovedWhilePaused).toEqual({ pausedAtHead, observedHead });
    expect(await commitCount(fixture)).toBe(before);
  });

  it("commits the repaired diff while reporting cross-pause movement", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    const headAtStart = await readHead(fixture.root);
    const pausedAtHead = headAtStart;
    const observedHead = await moveHead(fixture, "chore: human commit");
    await writeThreadFile(fixture, "spec.md", "# Spec\n");

    const result = await finalize(fixture, policyOf("spec"), {
      kind: "after-contract-repair",
      attempt: { headAtStart, headAfterAttempt: headAtStart },
      pausedAtHead,
    });

    expect(result).toEqual({
      kind: "finalized",
      commit: {
        kind: "committed",
        subject: `docs(${fixture.threadFolder}): spec`,
      },
      observedPaths: [`${rel}/spec.md`],
      headAfterFinalization: await readHead(fixture.root),
      headMovedWhilePaused: { pausedAtHead, observedHead },
    });
  });
});

describe("finalizeGitBoundary — retry after a refused boundary", () => {
  it("commits the corrected diff without judging the attempt interval again", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    // A retry carries no attempt interval: the run already judged that boundary
    // under the stage's HEAD rule, so only the human's movement is left to see.
    const pausedAtHead = await readHead(fixture.root);
    const observedHead = await moveHead(fixture, "chore: human commit");
    await writeThreadFile(fixture, "spec.md", "# Spec\n");

    const result = await finalize(fixture, policyOf("spec"), {
      kind: "boundary-retry",
      pausedAtHead,
    });

    expect(result.kind).toBe("finalized");
    if (result.kind !== "finalized") return;
    expect(result.observedPaths).toEqual([`${rel}/spec.md`]);
    expect(result.headMovedWhilePaused).toEqual({ pausedAtHead, observedHead });
    expect(await lastSubject(fixture)).toBe(
      `docs(${fixture.threadFolder}): spec`,
    );
  });

  it("accepts a deliberately precommitted required change on a clean worktree", async () => {
    const fixture = await newFixture();
    const pausedAtHead = await readHead(fixture.root);
    // The human committed the intended diff themselves.
    await writeThreadFile(fixture, "spec.md", "# Spec\n");
    await fixture.git(["add", "-A"]);
    await fixture.git(["commit", "-m", "docs: user-committed spec"]);
    const observedHead = await readHead(fixture.root);
    const before = await commitCount(fixture);

    const result = await finalize(fixture, policyOf("spec"), {
      kind: "boundary-retry",
      pausedAtHead,
    });

    expect(result).toEqual({
      kind: "finalized",
      commit: { kind: "none" },
      observedPaths: [],
      headAfterFinalization: observedHead,
      headMovedWhilePaused: { pausedAtHead, observedHead },
    });
    expect(await commitCount(fixture)).toBe(before);
  });

  it.each(["after-contract-repair", "boundary-retry"] as const)(
    "waives changeRequired in the %s context",
    async (kind) => {
      const fixture = await newFixture();
      const head = await readHead(fixture.root);
      const context: GitBoundaryContext =
        kind === "after-contract-repair"
          ? {
              kind,
              attempt: { headAtStart: head, headAfterAttempt: head },
              pausedAtHead: head,
            }
          : { kind, pausedAtHead: head };

      const result = await finalize(fixture, policyOf("spec"), context);

      expect(result).toEqual({
        kind: "finalized",
        commit: { kind: "none" },
        observedPaths: [],
        headAfterFinalization: head,
      });
    },
  );

  it("keeps the selectors strict on a retry", async () => {
    const fixture = await newFixture();
    const pausedAtHead = await readHead(fixture.root);
    await writeThreadFile(fixture, "spec.md", "# Spec\n");
    await fs.writeFile(path.join(fixture.root, "stray.txt"), "s", "utf8");

    const result = await finalize(fixture, policyOf("spec"), {
      kind: "boundary-retry",
      pausedAtHead,
    });

    expect(result.kind).toBe("git-policy-violation");
    if (result.kind !== "git-policy-violation") return;
    expect(result.cause).toBe("out-of-bounds");
    expect(result.message).toContain("stray.txt");
    expect(result.headMovedWhilePaused).toBeUndefined();
  });
});

describe("finalizeGitBoundary — commit failures", () => {
  it("returns commit-error when a pre-commit hook rejects the boundary", async () => {
    const fixture = await newFixture();
    const hookDir = path.join(fixture.root, ".git", "hooks");
    await fs.mkdir(hookDir, { recursive: true });
    await fs.writeFile(
      path.join(hookDir, "pre-commit"),
      "#!/bin/sh\necho 'hook rejected' 1>&2\nexit 1\n",
      { mode: 0o755 },
    );
    await writeThreadFile(fixture, "spec.md", "# Spec\n");
    const head = await readHead(fixture.root);

    const result = await finalize(
      fixture,
      policyOf("spec"),
      await steadyAttempt(fixture),
    );

    expect(result.kind).toBe("commit-error");
    if (result.kind !== "commit-error") return;
    expect(result.headAfterFinalization).toBe(head);
  });

  it("returns commit-error when the staged set does not equal the validated set", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    // A committed clean filter replays the seed's committed bytes whatever the
    // worktree holds: `git status` reports the file modified, and `git add` then
    // stages content identical to `HEAD`, so nothing is left staged.
    await fs.writeFile(
      path.join(fixture.root, ".gitattributes"),
      `${rel}/seed.md filter=freeze\n`,
      "utf8",
    );
    await fixture.git(["add", "--", ".gitattributes"]);
    await fixture.git(["commit", "-m", "chore: freeze the seed"]);
    await fixture.git([
      "config",
      "filter.freeze.clean",
      `cat >/dev/null; git cat-file blob HEAD:${rel}/seed.md`,
    ]);
    await writeThreadFile(fixture, "seed.md", "# Rewritten\n");

    const seedOnly: GitPolicy = {
      headMayChange: false,
      allowedChanges: [{ kind: "exact-file", threadRelativePath: "seed.md" }],
      changeRequired: false,
      commitSubjectTemplate: "docs(<thread-folder>): seed",
    };
    const before = await commitCount(fixture);

    const result = await finalize(
      fixture,
      seedOnly,
      await steadyAttempt(fixture),
    );

    expect(result.kind).toBe("commit-error");
    if (result.kind !== "commit-error") return;
    expect(result.message).toContain("staged set does not equal");
    expect(result.message).toContain(`${rel}/seed.md`);
    expect(await commitCount(fixture)).toBe(before);
  });
});

describe("finalizeGitBoundary — Git invocation failures", () => {
  function fail(operation: string): never {
    throw new Error(`${operation} unavailable`);
  }

  async function expectGitFailure(
    result: GitBoundaryResult,
    phase: Extract<GitBoundaryResult, { kind: "git-error" }>['phase'],
  ): Promise<void> {
    expect(result.kind).toBe("git-error");
    if (result.kind !== "git-error") return;
    expect(result.phase).toBe(phase);
    expect(result.message).toContain("unavailable");
  }

  it("returns the paused-head phase when recovery cannot read the current tip", async () => {
    const fixture = await newFixture();
    const head = await readHead(fixture.root);

    const result = await finalizeWithOperations(
      fixture,
      policyOf("spec"),
      { kind: "boundary-retry", pausedAtHead: head },
      { readHead: async () => fail("paused HEAD") },
    );

    await expectGitFailure(result, "paused-head");
  });

  it("returns the boundary-status phase when status cannot be collected", async () => {
    const fixture = await newFixture();

    const result = await finalizeWithOperations(
      fixture,
      policyOf("spec"),
      await steadyAttempt(fixture),
      { collectBoundaryStatus: async () => fail("boundary status") },
    );

    await expectGitFailure(result, "boundary-status");
  });

  it("returns the staging phase when git add cannot be run", async () => {
    const fixture = await newFixture();
    await writeThreadFile(fixture, "spec.md", "# Spec\n");

    const result = await finalizeWithOperations(
      fixture,
      policyOf("spec"),
      await steadyAttempt(fixture),
      {
        runGit: async (cwd, args) =>
          args[0] === "add" ? fail("git add") : runGit(cwd, args),
      },
    );

    await expectGitFailure(result, "staging");
  });

  it("returns the staged-status phase when the staged set cannot be read", async () => {
    const fixture = await newFixture();
    await writeThreadFile(fixture, "spec.md", "# Spec\n");

    const result = await finalizeWithOperations(
      fixture,
      policyOf("spec"),
      await steadyAttempt(fixture),
      {
        runGit: async (cwd, args) =>
          args[0] === "diff" ? fail("staged status") : runGit(cwd, args),
      },
    );

    await expectGitFailure(result, "staged-status");
  });

  it("returns the commit phase when git commit cannot be run", async () => {
    const fixture = await newFixture();
    await writeThreadFile(fixture, "spec.md", "# Spec\n");

    const result = await finalizeWithOperations(
      fixture,
      policyOf("spec"),
      await steadyAttempt(fixture),
      {
        runGit: async (cwd, args) =>
          args[0] === "commit" ? fail("git commit") : runGit(cwd, args),
      },
    );

    await expectGitFailure(result, "commit");
  });

  it("returns the final-head phase when the resulting tip cannot be read", async () => {
    const fixture = await newFixture();

    const result = await finalizeWithOperations(
      fixture,
      policyOf("reconcile-spec"),
      await steadyAttempt(fixture),
      { readHead: async () => fail("final HEAD") },
    );

    await expectGitFailure(result, "final-head");
  });
});

describe("finalizeGitBoundary — policy data only (no stage-name branching)", () => {
  it("performs no executor commit for a policy with a null subject template", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    const synthetic: GitPolicy = {
      headMayChange: true,
      allowedChanges: [{ kind: "subtree", threadRelativePath: "notes" }],
      changeRequired: false,
      commitSubjectTemplate: null,
    };
    await writeThreadFile(fixture, "notes/a.md", "n");
    const head = await readHead(fixture.root);
    const before = await commitCount(fixture);

    const result = await finalize(
      fixture,
      synthetic,
      await steadyAttempt(fixture),
    );

    expect(result).toEqual({
      kind: "finalized",
      commit: { kind: "none" },
      observedPaths: [`${rel}/notes/a.md`],
      headAfterFinalization: head,
    });
    expect(await commitCount(fixture)).toBe(before);
  });
});
