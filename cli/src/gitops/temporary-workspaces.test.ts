import { promises as fs } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createRepoFixture,
  type RepoFixture,
} from "../test-helpers/git-fixture.js";
import { GitSpawnError, splitNul } from "./git.js";
import {
  checkTemporaryWorkspaces,
  type GitRunner,
} from "./temporary-workspaces.js";

async function newFixture(): Promise<RepoFixture> {
  return createRepoFixture({ thread: {} });
}

const REPO = "/repo";
const THREAD = "docs/threads/260728000000Z-thread";

type Call = { cwd: string; args: string[]; stdin?: string };

type StubOptions = {
  /** Exit code `git check-ignore` reports per workspace name; `0` by default. */
  coverage?: Record<string, number>;
  /** Captured `check-ignore` stderr, used by the Git-error cases. */
  coverageStderr?: string;
  /** Raw NUL-delimited `git ls-files` output; empty by default. */
  tracked?: string;
  /** Exit code `git ls-files` reports; `0` by default. */
  lsCode?: number;
  lsStderr?: string;
};

/**
 * A `runGit` stand-in that answers each probe from a fixed table and records
 * every invocation, so the exact arguments and the completed-error paths are
 * assertable without a repository in that state.
 */
function stub(options: StubOptions): { runner: GitRunner; calls: Call[] } {
  const calls: Call[] = [];
  const runner: GitRunner = (cwd, args, stdin) => {
    calls.push({
      cwd,
      args: [...args],
      ...(stdin !== undefined ? { stdin } : {}),
    });
    if (args[0] === "check-ignore") {
      const targets = splitNul(stdin ?? "");
      const exceptionalCode = targets
        .map((target) => options.coverage?.[path.posix.basename(target)] ?? 0)
        .find((code) => code !== 0 && code !== 1);
      if (exceptionalCode !== undefined) {
        return Promise.resolve({
          code: exceptionalCode,
          stdout: "",
          stderr: options.coverageStderr ?? "",
        });
      }
      const covered = targets.filter(
        (target) =>
          (options.coverage?.[path.posix.basename(target)] ?? 0) === 0,
      );
      return Promise.resolve({
        code: covered.length > 0 ? 0 : 1,
        stdout: nul(...covered),
        stderr: options.coverageStderr ?? "",
      });
    }
    return Promise.resolve({
      code: options.lsCode ?? 0,
      stdout: options.tracked ?? "",
      stderr: options.lsStderr ?? "",
    });
  };
  return { runner, calls };
}

function nul(...paths: string[]): string {
  return paths.map((p) => `${p}\0`).join("");
}

function unsafe(
  result: Awaited<ReturnType<typeof checkTemporaryWorkspaces>>,
) {
  expect(result).toMatchObject({ ok: false, kind: "unsafe" });
  if (result.ok || result.kind !== "unsafe") {
    throw new Error("expected an unsafe temporary-workspace result");
  }
  return result.problems;
}

function inspectionError(
  result: Awaited<ReturnType<typeof checkTemporaryWorkspaces>>,
): string {
  expect(result).toMatchObject({ ok: false, kind: "inspection-error" });
  if (result.ok || result.kind !== "inspection-error") {
    throw new Error("expected a temporary-workspace inspection error");
  }
  return result.message;
}

describe("checkTemporaryWorkspaces against a real repository", () => {
  it("passes when trailing-slash directory rules cover all three workspaces", async () => {
    const fixture = await newFixture();
    const result = await checkTemporaryWorkspaces(
      fixture.root,
      fixture.threadRelPath as string,
    );
    expect(result).toEqual({ ok: true });
  });

  it("reports missing coverage for a rule that covers only some filenames", async () => {
    const fixture = await newFixture();
    await fs.writeFile(
      path.join(fixture.root, ".gitignore"),
      [
        "docs/threads/**/.pending-decisions/*.md",
        ".pending-reviews/",
        ".implementation-runs/",
        "",
      ].join("\n"),
      "utf8",
    );

    const rel = fixture.threadRelPath as string;
    const result = await checkTemporaryWorkspaces(fixture.root, rel);
    const problems = unsafe(result);
    expect(problems.uncovered).toEqual([
      {
        directory: `${rel}/.pending-decisions`,
        repositoryRule: "docs/threads/**/.pending-decisions/",
      },
    ]);
    // The two workspaces a trailing-slash rule still covers stay out of the
    // facts and out of the correction rules.
    expect(problems.uncovered).not.toContainEqual(
      expect.objectContaining({
        directory: `${rel}/.pending-reviews`,
      }),
    );
    expect(problems.uncovered).not.toContainEqual(
      expect.objectContaining({
        directory: `${rel}/.implementation-runs`,
      }),
    );
    expect(problems.trackedPaths).toEqual([]);
    expect(problems.trackedDirectories).toEqual([]);
  });

  it("reports a force-added file under an ignored workspace as tracked", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    const runs = path.join(fixture.threadPath as string, ".implementation-runs");
    await fs.mkdir(runs, { recursive: true });
    await fs.writeFile(path.join(runs, "leftover.md"), "x", "utf8");
    await fixture.git(["add", "-f", "--", `${rel}/.implementation-runs`]);

    const result = await checkTemporaryWorkspaces(fixture.root, rel);
    const problems = unsafe(result);
    expect(problems).toEqual({
      uncovered: [],
      trackedPaths: [`${rel}/.implementation-runs/leftover.md`],
      trackedDirectories: [`${rel}/.implementation-runs`],
    });
  });
});

describe("checkTemporaryWorkspaces probes", () => {
  it("probes every workspace as a directory and tracked content once", async () => {
    const { runner, calls } = stub({});
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    expect(result).toEqual({ ok: true });
    expect(calls).toEqual([
      {
        cwd: REPO,
        args: [
          "check-ignore",
          "--no-index",
          "-z",
          "--stdin",
        ],
        stdin: nul(
          `${THREAD}/.pending-decisions/`,
          `${THREAD}/.pending-reviews/`,
          `${THREAD}/.implementation-runs/`,
        ),
      },
      {
        cwd: REPO,
        args: [
          "ls-files",
          "-z",
          "--",
          `${THREAD}/.pending-decisions`,
          `${THREAD}/.pending-reviews`,
          `${THREAD}/.implementation-runs`,
        ],
      },
    ]);
  });

  it("reads check-ignore exit 1 as missing coverage for that workspace", async () => {
    const { runner } = stub({ coverage: { ".pending-reviews": 1 } });
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    expect(unsafe(result).uncovered).toEqual([
      {
        directory: `${THREAD}/.pending-reviews`,
        repositoryRule: "docs/threads/**/.pending-reviews/",
      },
    ]);
  });

  it("attributes every NUL-delimited tracked path to its workspace", async () => {
    const { runner } = stub({
      tracked: nul(
        `${THREAD}/.pending-decisions/DR-open.md`,
        `${THREAD}/.pending-reviews/bundle/finding.md`,
        `${THREAD}/.pending-reviews/bundle/second.md`,
      ),
    });
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    const problems = unsafe(result);
    expect(problems.trackedPaths).toEqual([
      `${THREAD}/.pending-decisions/DR-open.md`,
      `${THREAD}/.pending-reviews/bundle/finding.md`,
      `${THREAD}/.pending-reviews/bundle/second.md`,
    ]);
    // One correction per affected directory, never one per file.
    expect(problems.trackedDirectories).toEqual([
      `${THREAD}/.pending-decisions`,
      `${THREAD}/.pending-reviews`,
    ]);
  });

  it("returns a check-ignore exit 128 as a Git error, not missing coverage", async () => {
    const { runner } = stub({
      coverage: { ".pending-decisions": 128 },
      coverageStderr: "fatal: not a git repository\n",
    });
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    const message = inspectionError(result);
    expect(message).toContain(REPO);
    expect(message).toContain("exited with code 128");
    expect(message).toContain("fatal: not a git repository");
  });

  it("fails closed when check-ignore reports an unrequested path", async () => {
    const runner: GitRunner = (_cwd, args) =>
      Promise.resolve({
        code: 0,
        stdout:
          args[0] === "check-ignore"
            ? nul("docs/threads/other/.pending-decisions/")
            : "",
        stderr: "",
      });
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    expect(inspectionError(result)).toContain(
      "git check-ignore returned inconsistent coverage output",
    );
  });

  it("returns a non-zero ls-files result as a Git error", async () => {
    const { runner } = stub({ lsCode: 128, lsStderr: "fatal: bad pathspec\n" });
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    const message = inspectionError(result);
    expect(message).toContain("ls-files");
    expect(message).toContain("exited with code 128");
    expect(message).toContain("fatal: bad pathspec");
  });

  it("returns a spawn failure as a Git error", async () => {
    const args = ["check-ignore", "--no-index", "-z", "--stdin"];
    const runner: GitRunner = () =>
      Promise.reject(new GitSpawnError(args, new Error("spawn ENOENT")));
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    const message = inspectionError(result);
    expect(message).toContain(REPO);
    expect(message).toContain("spawn ENOENT");
  });
});

describe("the temporary-workspace problem facts", () => {
  it("groups both failure kinds with their own correction facts", async () => {
    // `.pending-decisions` is covered but tracked, `.pending-reviews` is
    // neither covered nor untracked, `.implementation-runs` passes both probes.
    const { runner } = stub({
      coverage: { ".pending-reviews": 1 },
      tracked: nul(
        `${THREAD}/.pending-decisions/DR-open.md`,
        `${THREAD}/.pending-reviews/bundle/finding.md`,
      ),
    });
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    expect(unsafe(result)).toEqual({
      uncovered: [
        {
          directory: `${THREAD}/.pending-reviews`,
          repositoryRule: "docs/threads/**/.pending-reviews/",
        },
      ],
      trackedPaths: [
        `${THREAD}/.pending-decisions/DR-open.md`,
        `${THREAD}/.pending-reviews/bundle/finding.md`,
      ],
      trackedDirectories: [
        `${THREAD}/.pending-decisions`,
        `${THREAD}/.pending-reviews`,
      ],
    });
  });

  it("omits the tracked group when only ignore coverage fails", async () => {
    const { runner } = stub({
      coverage: { ".pending-decisions": 1, ".implementation-runs": 1 },
    });
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    expect(unsafe(result)).toEqual({
      uncovered: [
        {
          directory: `${THREAD}/.pending-decisions`,
          repositoryRule: "docs/threads/**/.pending-decisions/",
        },
        {
          directory: `${THREAD}/.implementation-runs`,
          repositoryRule: "docs/threads/**/.implementation-runs/",
        },
      ],
      trackedPaths: [],
      trackedDirectories: [],
    });
  });

  it("never returns success for a tracked path it cannot attribute", async () => {
    // Whatever made Git emit this path, the check has to fail closed: the
    // verdict follows Git's answer, never this module's attribution of it.
    const { runner } = stub({ tracked: nul("docs/threads/other/stray.md") });
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    expect(unsafe(result)).toEqual({
      uncovered: [],
      trackedPaths: ["docs/threads/other/stray.md"],
      trackedDirectories: [],
    });
  });

  it("omits the missing-coverage group when only tracked content fails", async () => {
    const { runner } = stub({
      tracked: nul(`${THREAD}/.implementation-runs/260728Z/report.md`),
    });
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    expect(unsafe(result)).toEqual({
      uncovered: [],
      trackedPaths: [`${THREAD}/.implementation-runs/260728Z/report.md`],
      trackedDirectories: [`${THREAD}/.implementation-runs`],
    });
  });
});
