import { promises as fs } from "node:fs";
import path from "node:path";

import { gitOrThrow, runGit } from "../gitops/git.js";
import { tempDir } from "./temp-root.js";

/**
 * Operational thread directories that live inside a thread and must never
 * enter the Git-boundary status set. The fixture commits ignore rules for them
 * so later queue-gate tests can drop files into a thread without dirtying the
 * worktree.
 */
const IGNORED_THREAD_DIRS = [
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
 * A disposable Git repository for tests. `root` is the canonical worktree root;
 * thread fields are present only when a thread was created. `git` runs `git`
 * inside the repo.
 */
export type RepoFixture = {
  root: string;
  threadFolder?: string;
  threadPath?: string;
  threadRelPath?: string;
  git: (args: string[]) => ReturnType<typeof runGit>;
};

/**
 * The genesis content of a fixture repository with every option default already
 * resolved: the thread folder to create and the exact seed/decisions bytes, or
 * `null` for a file that must not exist. A spec fully determines the committed
 * repository, so its serialization doubles as the template cache key.
 */
type TemplateSpec = {
  thread: {
    folder: string;
    seed: string | null;
    decisions: string | null;
  } | null;
};

function templateSpecFor(options: RepoFixtureOptions): TemplateSpec {
  const threadOpts = options.thread;
  if (threadOpts === undefined) {
    return { thread: null };
  }
  return {
    thread: {
      folder: threadOpts.folder ?? DEFAULT_THREAD_FOLDER,
      seed:
        threadOpts.createSeed === false
          ? null
          : (threadOpts.seed ?? DEFAULT_SEED),
      decisions:
        threadOpts.createDecisions === false
          ? null
          : (threadOpts.decisions ?? DEFAULT_DECISIONS),
    },
  };
}

/**
 * Built templates keyed by serialized `TemplateSpec`. The map stores the
 * in-flight promise rather than the resolved path so concurrent callers asking
 * for the same spec await one build instead of racing to create duplicates.
 */
const templates = new Map<string, Promise<string>>();

let templatesDir: Promise<string> | undefined;

/** The one directory holding this worker's templates, created on first use. */
function templatesDirectory(): Promise<string> {
  templatesDir ??= tempDir("antmay-git-template-");
  return templatesDir;
}

/**
 * Build the pristine repository a spec describes: initialize it, configure a
 * committer identity with signing disabled, write the thread's operational
 * ignore rules plus any thread content, and commit the lot as genesis. Runs at
 * most once per distinct spec; `createRepoFixture` copies the result.
 */
async function buildTemplate(spec: TemplateSpec): Promise<string> {
  const root = await fs.mkdtemp(path.join(await templatesDirectory(), "t-"));

  await gitOrThrow(root, ["init"]);
  await gitOrThrow(root, ["config", "user.email", "afk@example.com"]);
  await gitOrThrow(root, ["config", "user.name", "AFK Fixture"]);
  await gitOrThrow(root, ["config", "commit.gpgsign", "false"]);

  await fs.writeFile(
    path.join(root, ".gitignore"),
    IGNORED_THREAD_DIRS.map((dir) => `${dir}\n`).join(""),
    "utf8",
  );

  if (spec.thread !== null) {
    const threadPath = path.join(root, "docs", "threads", spec.thread.folder);
    await fs.mkdir(threadPath, { recursive: true });
    if (spec.thread.seed !== null) {
      await fs.writeFile(
        path.join(threadPath, "seed.md"),
        spec.thread.seed,
        "utf8",
      );
    }
    if (spec.thread.decisions !== null) {
      await fs.writeFile(
        path.join(threadPath, "decisions.md"),
        spec.thread.decisions,
        "utf8",
      );
    }
  }

  await gitOrThrow(root, ["add", "-A"]);
  await gitOrThrow(root, ["commit", "-m", "chore: fixture genesis"]);

  return root;
}

/**
 * Create a disposable Git repository holding the thread's operational ignore
 * rules and, unless `thread` is omitted, one thread with seed/decision
 * content — all already committed as genesis.
 *
 * The repository is a filesystem copy of a cached template built once per
 * distinct set of options, which keeps a suite of Git-backed tests off the
 * `init`/`config`/`add`/`commit` subprocess path for every single case. The copy
 * is a fully independent worktree: tests commit into it and mutate it freely.
 * Every Git-backed test reuses this helper.
 */
export async function createRepoFixture(
  options: RepoFixtureOptions = {},
): Promise<RepoFixture> {
  const spec = templateSpecFor(options);
  const key = JSON.stringify(spec);
  let template = templates.get(key);
  if (template === undefined) {
    template = buildTemplate(spec);
    templates.set(key, template);
  }

  const root = await tempDir("antmay-git-");
  await fs.cp(await template, root, { recursive: true });

  const fixture: RepoFixture = {
    root,
    git: (args: string[]) => runGit(root, args),
  };

  if (spec.thread !== null) {
    fixture.threadFolder = spec.thread.folder;
    fixture.threadPath = path.join(root, "docs", "threads", spec.thread.folder);
    fixture.threadRelPath = path.posix.join(
      "docs",
      "threads",
      spec.thread.folder,
    );
  }

  return fixture;
}
