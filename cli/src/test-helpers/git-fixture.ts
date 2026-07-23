import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { gitOrThrow, runGit } from "../gitops/git.js";

/**
 * Operational workflow directories that live inside a thread and must never
 * enter the Git-boundary status set. The fixture commits ignore rules for them
 * so later queue-gate tests can drop files into a thread without dirtying the
 * worktree.
 */
const IGNORED_WORKFLOW_DIRS = [
  ".pending-decisions/",
  ".pending-reviews/",
  ".implementation-runs/",
];

const DEFAULT_THREAD_FOLDER = "260723121015Z-fixture-thread";
const DEFAULT_SEED = "# Seed\n\nA valid thread seed.\n";
const DEFAULT_DECISIONS = "# Decisions\n\nDR1: a settled decision.\n";

/**
 * Options for the single thread the fixture may create. Omit `thread` entirely
 * to init a bare-of-threads repository. Provide explicit `seed`/`decisions`
 * content (including empty or whitespace) for genesis-validation tests, or set
 * either `createSeed`/`createDecisions` to `false` to omit that file.
 */
export type RepoFixtureOptions = {
  thread?: {
    folder?: string;
    seed?: string;
    decisions?: string;
    createSeed?: boolean;
    createDecisions?: boolean;
  };
};

/**
 * A disposable Git repository for tests. `root` is the canonical (realpath)
 * worktree root; thread fields are present only when a thread was created.
 * `git` runs `git` inside the repo; `cleanup` removes the temp directory.
 */
export type RepoFixture = {
  root: string;
  threadFolder?: string;
  threadPath?: string;
  threadRelPath?: string;
  git: (args: string[]) => ReturnType<typeof runGit>;
  cleanup: () => Promise<void>;
};

/**
 * Create a disposable Git repository under the OS temp directory: initialize
 * it, configure a committer identity with signing disabled, and commit
 * `.gitignore` rules for the workflow's operational directories. Optionally
 * create one thread with seed/decision content and commit it. Every Git-backed
 * test reuses this helper.
 */
export async function createRepoFixture(
  options: RepoFixtureOptions = {},
): Promise<RepoFixture> {
  const rawDir = await fs.mkdtemp(path.join(os.tmpdir(), "antmay-git-"));
  const root = await fs.realpath(rawDir);

  await gitOrThrow(root, ["init"]);
  await gitOrThrow(root, ["config", "user.email", "afk@example.com"]);
  await gitOrThrow(root, ["config", "user.name", "AFK Fixture"]);
  await gitOrThrow(root, ["config", "commit.gpgsign", "false"]);

  await fs.writeFile(
    path.join(root, ".gitignore"),
    IGNORED_WORKFLOW_DIRS.map((dir) => `${dir}\n`).join(""),
    "utf8",
  );

  const fixture: RepoFixture = {
    root,
    git: (args: string[]) => runGit(root, args),
    cleanup: async () => {
      await fs.rm(rawDir, { recursive: true, force: true });
    },
  };

  const threadOpts = options.thread;
  if (threadOpts !== undefined) {
    const folder = threadOpts.folder ?? DEFAULT_THREAD_FOLDER;
    const threadPath = path.join(root, "docs", "threads", folder);
    await fs.mkdir(threadPath, { recursive: true });

    if (threadOpts.createSeed !== false) {
      await fs.writeFile(
        path.join(threadPath, "seed.md"),
        threadOpts.seed ?? DEFAULT_SEED,
        "utf8",
      );
    }
    if (threadOpts.createDecisions !== false) {
      await fs.writeFile(
        path.join(threadPath, "decisions.md"),
        threadOpts.decisions ?? DEFAULT_DECISIONS,
        "utf8",
      );
    }

    fixture.threadFolder = folder;
    fixture.threadPath = threadPath;
    fixture.threadRelPath = path.posix.join("docs", "threads", folder);
  }

  await gitOrThrow(root, ["add", "-A"]);
  await gitOrThrow(root, ["commit", "-m", "chore: fixture genesis"]);

  return fixture;
}
