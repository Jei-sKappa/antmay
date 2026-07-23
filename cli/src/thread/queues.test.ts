import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { scanPendingQueues } from "./queues.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    if (cleanup) await cleanup();
  }
});

const THREAD_REL = path.posix.join("docs", "threads", "t");

async function repoWithThread(): Promise<{ repoRoot: string; threadAbs: string }> {
  const raw = await fs.mkdtemp(path.join(os.tmpdir(), "antmay-queues-"));
  cleanups.push(() => fs.rm(raw, { recursive: true, force: true }));
  const repoRoot = await fs.realpath(raw);
  const threadAbs = path.join(repoRoot, THREAD_REL);
  await fs.mkdir(threadAbs, { recursive: true });
  return { repoRoot, threadAbs };
}

describe("scanPendingQueues (AC-11.1, AC-11.5)", () => {
  it("treats absent queue directories as empty", async () => {
    const { repoRoot } = await repoWithThread();
    const scan = await scanPendingQueues(repoRoot, THREAD_REL);
    expect(scan).toEqual({ ok: true, pendingFiles: [] });
  });

  it("collects direct regular files from both queues, sorted repo-relative", async () => {
    const { repoRoot, threadAbs } = await repoWithThread();
    await fs.mkdir(path.join(threadAbs, ".pending-decisions"));
    await fs.mkdir(path.join(threadAbs, ".pending-reviews"));
    await fs.writeFile(path.join(threadAbs, ".pending-decisions", "b.md"), "x");
    await fs.writeFile(path.join(threadAbs, ".pending-decisions", "a.md"), "x");
    await fs.writeFile(path.join(threadAbs, ".pending-reviews", "c.md"), "x");

    const scan = await scanPendingQueues(repoRoot, THREAD_REL);
    expect(scan).toEqual({
      ok: true,
      pendingFiles: [
        "docs/threads/t/.pending-decisions/a.md",
        "docs/threads/t/.pending-decisions/b.md",
        "docs/threads/t/.pending-reviews/c.md",
      ],
    });
  });

  it("ignores nested directories and their contents", async () => {
    const { repoRoot, threadAbs } = await repoWithThread();
    const queue = path.join(threadAbs, ".pending-decisions");
    await fs.mkdir(path.join(queue, "nested"), { recursive: true });
    await fs.writeFile(path.join(queue, "nested", "buried.md"), "x");
    await fs.writeFile(path.join(queue, "top.md"), "x");

    const scan = await scanPendingQueues(repoRoot, THREAD_REL);
    expect(scan).toEqual({
      ok: true,
      pendingFiles: ["docs/threads/t/.pending-decisions/top.md"],
    });
  });

  it("returns {ok:false} when a queue path is a file instead of a directory", async () => {
    const { repoRoot, threadAbs } = await repoWithThread();
    await fs.writeFile(path.join(threadAbs, ".pending-decisions"), "not a dir");
    const scan = await scanPendingQueues(repoRoot, THREAD_REL);
    expect(scan.ok).toBe(false);
  });

  it("returns {ok:false} when a queue directory is unreadable (chmod 000)", async () => {
    const { repoRoot, threadAbs } = await repoWithThread();
    const queue = path.join(threadAbs, ".pending-reviews");
    await fs.mkdir(queue);
    await fs.chmod(queue, 0o000);
    cleanups.push(async () => {
      await fs.chmod(queue, 0o700).catch(() => {});
    });
    const scan = await scanPendingQueues(repoRoot, THREAD_REL);
    expect(scan.ok).toBe(false);
  });

  it("never reads file contents (unreadable-content fixtures still count)", async () => {
    const { repoRoot, threadAbs } = await repoWithThread();
    const queue = path.join(threadAbs, ".pending-decisions");
    await fs.mkdir(queue);
    const unreadable = path.join(queue, "locked.md");
    await fs.writeFile(unreadable, "secret");
    await fs.chmod(unreadable, 0o000);
    cleanups.push(async () => {
      await fs.chmod(unreadable, 0o600).catch(() => {});
    });

    const scan = await scanPendingQueues(repoRoot, THREAD_REL);
    expect(scan).toEqual({
      ok: true,
      pendingFiles: ["docs/threads/t/.pending-decisions/locked.md"],
    });
  });
});
