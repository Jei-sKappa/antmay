import { promises as fs } from "node:fs";
import path from "node:path";

import { tempDir } from "./temp-root.js";

const THREAD_FOLDER = "260723121015Z-fixture-thread";
const SEED = "# Seed\n\nA valid thread seed.\n";

/**
 * A workspace holding one thread, with no Git repository under it. `root` is
 * the workspace a request's `cwd` names; the thread is addressed absolutely by
 * `threadPath` and relatively by `threadRelPath`, the way a stage target is.
 */
export type ThreadTree = {
  root: string;
  threadFolder: string;
  threadPath: string;
  threadRelPath: string;
};

/**
 * Build that workspace. The scripted harness resolves a thread by `realpath`
 * and prefix containment and reads and writes ordinary files under it, so what
 * it needs is a directory tree; giving it a repository would buy an `init`,
 * three `config` calls, an `add`, and a `commit` that nothing then interrogates.
 */
export async function createThreadTree(): Promise<ThreadTree> {
  const root = await tempDir("antmay-thread-");
  const threadRelPath = path.posix.join("docs", "threads", THREAD_FOLDER);
  const threadPath = path.join(root, "docs", "threads", THREAD_FOLDER);
  await fs.mkdir(threadPath, { recursive: true });
  await fs.writeFile(path.join(threadPath, "seed.md"), SEED, "utf8");
  return { root, threadFolder: THREAD_FOLDER, threadPath, threadRelPath };
}
