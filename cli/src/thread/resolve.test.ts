import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { gitOrThrow } from "../gitops/git.js";
import { createRepoFixture } from "../test-helpers/git-fixture.js";
import { resolveThreadTarget } from "./resolve.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    if (cleanup) await cleanup();
  }
});

async function fixture(options?: Parameters<typeof createRepoFixture>[0]) {
  const f = await createRepoFixture(options);
  cleanups.push(f.cleanup);
  return f;
}

async function tempDir(prefix = "antmay-resolve-"): Promise<string> {
  const raw = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const dir = await fs.realpath(raw);
  cleanups.push(() => fs.rm(raw, { recursive: true, force: true }));
  return dir;
}

describe("AC-5.1: all three forms resolve to the identical canonical result", () => {
  it("bare name, relative path, and absolute path agree", async () => {
    const f = await fixture({ thread: {} });
    const folder = f.threadFolder!;
    const expected = {
      ok: true as const,
      repoRoot: f.root,
      threadRelPath: `docs/threads/${folder}`,
      threadFolder: folder,
    };

    const bare = await resolveThreadTarget(folder, f.root);
    const relative = await resolveThreadTarget(
      path.join("docs", "threads", folder),
      f.root,
    );
    const absolute = await resolveThreadTarget(f.threadPath!, f.root);

    expect(bare).toEqual(expected);
    expect(relative).toEqual(expected);
    expect(absolute).toEqual(expected);
  });

  it("resolves the bare form from a subdirectory cwd", async () => {
    const f = await fixture({ thread: {} });
    const folder = f.threadFolder!;
    const subdir = path.join(f.root, "packages", "app");
    await fs.mkdir(subdir, { recursive: true });

    const result = await resolveThreadTarget(folder, subdir);
    expect(result).toEqual({
      ok: true,
      repoRoot: f.root,
      threadRelPath: `docs/threads/${folder}`,
      threadFolder: folder,
    });
  });
});

describe("AC-5.2: DR47 rejections, each with a distinct message and no writes", () => {
  it("rejects a nested docs/threads suffix (lexical)", async () => {
    const f = await fixture({ thread: {} });
    const nested = path.join(
      f.root,
      "docs",
      "threads",
      "a",
      "docs",
      "threads",
      "b",
    );
    const result = await resolveThreadTarget(nested, f.root);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("nested");
  });

  it("rejects a multi-segment tail after docs/threads", async () => {
    const f = await fixture({ thread: {} });
    const result = await resolveThreadTarget(
      path.join("docs", "threads", "a", "b"),
      f.root,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("docs/threads/<thread-folder>");
  });

  it("rejects an archived-thread path", async () => {
    const f = await fixture({ thread: {} });
    const archived = path.join(
      f.root,
      "docs",
      "threads",
      "archive",
      "260723121015Z-old",
    );
    const result = await resolveThreadTarget(archived, f.root);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("archived");
  });

  it("rejects a bare repository", async () => {
    const bareRoot = await tempDir("antmay-bare-");
    await gitOrThrow(bareRoot, ["init", "--bare"]);
    const threadPath = path.join(bareRoot, "docs", "threads", "260723121015Z-x");
    await fs.mkdir(threadPath, { recursive: true });
    await fs.writeFile(path.join(threadPath, "seed.md"), "seed\n", "utf8");
    await fs.writeFile(
      path.join(threadPath, "decisions.md"),
      "decisions\n",
      "utf8",
    );

    const result = await resolveThreadTarget(threadPath, bareRoot);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("bare repository");
  });

  it("rejects a target that is not inside any Git worktree", async () => {
    const plainRoot = await tempDir("antmay-norepo-");
    const threadPath = path.join(
      plainRoot,
      "docs",
      "threads",
      "260723121015Z-x",
    );
    await fs.mkdir(threadPath, { recursive: true });
    await fs.writeFile(path.join(threadPath, "seed.md"), "seed\n", "utf8");
    await fs.writeFile(
      path.join(threadPath, "decisions.md"),
      "decisions\n",
      "utf8",
    );

    const result = await resolveThreadTarget(threadPath, plainRoot);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("not inside a Git worktree");
  });

  it("rejects a mismatched worktree root (docs/threads not at the repo root)", async () => {
    const f = await fixture({ thread: {} });
    const nested = path.join(
      f.root,
      "sub",
      "docs",
      "threads",
      "260723121015Z-x",
    );
    await fs.mkdir(nested, { recursive: true });
    await fs.writeFile(path.join(nested, "seed.md"), "seed\n", "utf8");
    await fs.writeFile(path.join(nested, "decisions.md"), "decisions\n", "utf8");

    const result = await resolveThreadTarget(nested, f.root);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("docs/threads/");
  });

  it("rejects a symlinked thread folder pointing outside the repository", async () => {
    const f = await fixture({ thread: {} });
    const outside = await tempDir("antmay-outside-");
    const linkPath = path.join(f.root, "docs", "threads", "260723121015Z-link");
    await fs.symlink(outside, linkPath);

    const result = await resolveThreadTarget("260723121015Z-link", f.root);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("symlink");
  });

  it("rejects a nonexistent thread target", async () => {
    const f = await fixture({});
    const result = await resolveThreadTarget("260723121015Z-absent", f.root);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("does not exist");
  });
});

describe("AC-5.3: genesis validation of seed.md and decisions.md only", () => {
  it("rejects a missing seed.md", async () => {
    const f = await fixture({ thread: { createSeed: false } });
    const result = await resolveThreadTarget(f.threadFolder!, f.root);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("seed.md");
  });

  it("rejects a missing decisions.md", async () => {
    const f = await fixture({ thread: { createDecisions: false } });
    const result = await resolveThreadTarget(f.threadFolder!, f.root);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("decisions.md");
  });

  it("rejects an empty seed.md", async () => {
    const f = await fixture({ thread: { seed: "" } });
    const result = await resolveThreadTarget(f.threadFolder!, f.root);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("seed.md");
  });

  it("rejects a whitespace-only decisions.md", async () => {
    const f = await fixture({ thread: { decisions: "   \n\t  \n" } });
    const result = await resolveThreadTarget(f.threadFolder!, f.root);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("decisions.md");
  });

  it("does not require any other artifact (no spec.md/plan.md check)", async () => {
    const f = await fixture({ thread: {} });
    // Thread has only seed.md and decisions.md — no spec.md or plan.md.
    const result = await resolveThreadTarget(f.threadFolder!, f.root);
    expect(result.ok).toBe(true);
  });
});
