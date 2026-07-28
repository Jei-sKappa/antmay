import { promises as fs } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createRepoFixture,
  type RepoFixture,
} from "../test-helpers/git-fixture.js";
import { GitSpawnError } from "./git.js";
import {
  checkTemporaryWorkspaces,
  type GitRunner,
} from "./temporary-workspaces.js";

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

const REPO = "/repo";
const THREAD = "docs/threads/260728000000Z-thread";

const INTRO =
  "Antmay skills write .pending-decisions/, .pending-reviews/, and " +
  ".implementation-runs/ inside the thread while a run is in progress. Git " +
  "has to ignore all three and track nothing under them, or the files a " +
  "skill writes there make a later stage fail its Git boundary.";

type Call = { cwd: string; args: string[] };

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
  const runner: GitRunner = (cwd, args) => {
    calls.push({ cwd, args: [...args] });
    if (args[0] === "check-ignore") {
      const target = args[args.length - 1] ?? "";
      const name = path.posix.basename(target);
      const code = options.coverage?.[name] ?? 0;
      return Promise.resolve({
        code,
        stdout: "",
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
    expect(result.ok).toBe(false);
    const message = result.ok ? "" : result.message;
    expect(message).toContain(`  - ${rel}/.pending-decisions/`);
    expect(message).toContain("  docs/threads/**/.pending-decisions/");
    // The two workspaces a trailing-slash rule still covers stay out of the
    // group and out of the correction block.
    expect(message).not.toContain(`  - ${rel}/.pending-reviews/`);
    expect(message).not.toContain(`  - ${rel}/.implementation-runs/`);
    expect(message).not.toContain("  docs/threads/**/.pending-reviews/");
    expect(message).not.toContain("  docs/threads/**/.implementation-runs/");
  });

  it("reports a force-added file under an ignored workspace as tracked", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;
    const runs = path.join(fixture.threadPath as string, ".implementation-runs");
    await fs.mkdir(runs, { recursive: true });
    await fs.writeFile(path.join(runs, "leftover.md"), "x", "utf8");
    await fixture.git(["add", "-f", "--", `${rel}/.implementation-runs`]);

    const result = await checkTemporaryWorkspaces(fixture.root, rel);
    expect(result.ok).toBe(false);
    const message = result.ok ? "" : result.message;
    expect(message).toContain("Tracked by Git:");
    expect(message).toContain(`  - ${rel}/.implementation-runs/leftover.md`);
    expect(message).toContain(
      `  git rm -r --cached -- ${rel}/.implementation-runs`,
    );
    expect(message).not.toContain("Not covered by Git's ignore rules:");
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
          "-q",
          "--no-index",
          "--",
          `${THREAD}/.pending-decisions/`,
        ],
      },
      {
        cwd: REPO,
        args: [
          "check-ignore",
          "-q",
          "--no-index",
          "--",
          `${THREAD}/.pending-reviews/`,
        ],
      },
      {
        cwd: REPO,
        args: [
          "check-ignore",
          "-q",
          "--no-index",
          "--",
          `${THREAD}/.implementation-runs/`,
        ],
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

    expect(result.ok).toBe(false);
    const message = result.ok ? "" : result.message;
    expect(message).toContain(`  - ${THREAD}/.pending-reviews/`);
    expect(message).not.toContain(`  - ${THREAD}/.pending-decisions/`);
    expect(message).not.toContain(`  - ${THREAD}/.implementation-runs/`);
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

    expect(result.ok).toBe(false);
    const message = result.ok ? "" : result.message;
    expect(message).toContain(`  - ${THREAD}/.pending-decisions/DR-open.md`);
    expect(message).toContain(
      `  - ${THREAD}/.pending-reviews/bundle/finding.md`,
    );
    expect(message).toContain(`  - ${THREAD}/.pending-reviews/bundle/second.md`);
    // One correction per affected directory, never one per file.
    expect(message).toContain(
      `  git rm -r --cached -- ${THREAD}/.pending-decisions ${THREAD}/.pending-reviews`,
    );
    expect(message).not.toContain(`${THREAD}/.implementation-runs`);
  });

  it("returns a check-ignore exit 128 as a Git error, not missing coverage", async () => {
    const { runner } = stub({
      coverage: { ".pending-decisions": 128 },
      coverageStderr: "fatal: not a git repository\n",
    });
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    expect(result.ok).toBe(false);
    const message = result.ok ? "" : result.message;
    expect(message).toContain(REPO);
    expect(message).toContain("exited with code 128");
    expect(message).toContain("fatal: not a git repository");
    expect(message).not.toContain("Not covered by Git's ignore rules:");
    expect(message).not.toContain("docs/threads/**/");
  });

  it("returns a non-zero ls-files result as a Git error", async () => {
    const { runner } = stub({ lsCode: 128, lsStderr: "fatal: bad pathspec\n" });
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    expect(result.ok).toBe(false);
    const message = result.ok ? "" : result.message;
    expect(message).toContain("ls-files");
    expect(message).toContain("exited with code 128");
    expect(message).toContain("fatal: bad pathspec");
    expect(message).not.toContain("Tracked by Git:");
  });

  it("returns a spawn failure as a Git error", async () => {
    const args = ["check-ignore", "-q", "--no-index", "--", "x/"];
    const runner: GitRunner = () =>
      Promise.reject(new GitSpawnError(args, new Error("spawn ENOENT")));
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    expect(result.ok).toBe(false);
    const message = result.ok ? "" : result.message;
    expect(message).toContain(REPO);
    expect(message).toContain("spawn ENOENT");
    expect(message).not.toContain("Not covered by Git's ignore rules:");
  });
});

describe("the temporary-workspace refusal", () => {
  it("groups both failure kinds with their own corrections", async () => {
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

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.message).toBe(
      [
        INTRO,
        "",
        "Not covered by Git's ignore rules:",
        `  - ${THREAD}/.pending-reviews/`,
        "",
        `Add these repository-wide rules to the .gitignore of ${REPO}:`,
        "  docs/threads/**/.pending-reviews/",
        "",
        "Tracked by Git:",
        `  - ${THREAD}/.pending-decisions/DR-open.md`,
        `  - ${THREAD}/.pending-reviews/bundle/finding.md`,
        "",
        "Untrack these directories and commit the removal:",
        `  git rm -r --cached -- ${THREAD}/.pending-decisions ${THREAD}/.pending-reviews`,
      ].join("\n"),
    );
  });

  it("omits the tracked group when only ignore coverage fails", async () => {
    const { runner } = stub({
      coverage: { ".pending-decisions": 1, ".implementation-runs": 1 },
    });
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.message).toBe(
      [
        INTRO,
        "",
        "Not covered by Git's ignore rules:",
        `  - ${THREAD}/.pending-decisions/`,
        `  - ${THREAD}/.implementation-runs/`,
        "",
        `Add these repository-wide rules to the .gitignore of ${REPO}:`,
        "  docs/threads/**/.pending-decisions/",
        "  docs/threads/**/.implementation-runs/",
      ].join("\n"),
    );
  });

  it("never returns success for a tracked path it cannot attribute", async () => {
    // Whatever made Git emit this path, the check has to fail closed: the
    // verdict follows Git's answer, never this module's attribution of it.
    const { runner } = stub({ tracked: nul("docs/threads/other/stray.md") });
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.message).toBe(
      [
        INTRO,
        "",
        "Tracked by Git:",
        "  - docs/threads/other/stray.md",
      ].join("\n"),
    );
  });

  it("omits the missing-coverage group when only tracked content fails", async () => {
    const { runner } = stub({
      tracked: nul(`${THREAD}/.implementation-runs/260728Z/report.md`),
    });
    const result = await checkTemporaryWorkspaces(REPO, THREAD, runner);

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.message).toBe(
      [
        INTRO,
        "",
        "Tracked by Git:",
        `  - ${THREAD}/.implementation-runs/260728Z/report.md`,
        "",
        "Untrack these directories and commit the removal:",
        `  git rm -r --cached -- ${THREAD}/.implementation-runs`,
      ].join("\n"),
    );
  });
});
