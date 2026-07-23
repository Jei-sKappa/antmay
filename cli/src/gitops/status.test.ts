import { promises as fs } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createRepoFixture,
  type RepoFixture,
} from "../test-helpers/git-fixture.js";
import {
  collectBoundaryStatus,
  isWorktreeClean,
  readHead,
} from "./status.js";

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

describe("collectBoundaryStatus", () => {
  it("reports staged, unstaged, deleted, and untracked paths", async () => {
    const fixture = await newFixture();
    const rel = fixture.threadRelPath as string;

    // Unstaged modification of a tracked file.
    await fs.writeFile(
      path.join(fixture.threadPath as string, "seed.md"),
      "# Seed\n\nedited.\n",
      "utf8",
    );
    // Unstaged deletion of a tracked file.
    await fs.rm(path.join(fixture.threadPath as string, "decisions.md"));
    // Staged brand-new file.
    await fs.writeFile(path.join(fixture.root, "staged.txt"), "x", "utf8");
    await fixture.git(["add", "--", "staged.txt"]);
    // Untracked file.
    await fs.writeFile(path.join(fixture.root, "untracked.txt"), "y", "utf8");

    const status = await collectBoundaryStatus(fixture.root);
    expect(status).toContain(`${rel}/seed.md`);
    expect(status).toContain(`${rel}/decisions.md`);
    expect(status).toContain("staged.txt");
    expect(status).toContain("untracked.txt");
    // Deduplicated and sorted.
    expect(status).toEqual([...new Set(status)].sort());
  });

  it("expands an untracked directory to its individual files", async () => {
    const fixture = await newFixture();
    await fs.mkdir(path.join(fixture.root, "newdir"));
    await fs.writeFile(path.join(fixture.root, "newdir", "a.txt"), "a", "utf8");
    await fs.writeFile(path.join(fixture.root, "newdir", "b.txt"), "b", "utf8");

    const status = await collectBoundaryStatus(fixture.root);
    expect(status).toContain("newdir/a.txt");
    expect(status).toContain("newdir/b.txt");
    expect(status).not.toContain("newdir/");
    expect(status).not.toContain("newdir");
  });

  it("excludes gitignored operational-directory files", async () => {
    const fixture = await newFixture();
    const reviews = path.join(fixture.threadPath as string, ".pending-reviews");
    await fs.mkdir(reviews, { recursive: true });
    await fs.writeFile(path.join(reviews, "finding.md"), "z", "utf8");

    const status = await collectBoundaryStatus(fixture.root);
    expect(status.some((p) => p.includes(".pending-reviews"))).toBe(false);
  });

  it("reports a rename's old and new paths (delete + add form)", async () => {
    const fixture = await newFixture();
    const before = path.join(fixture.root, "renameme.txt");
    await fs.writeFile(before, "content", "utf8");
    await fixture.git(["add", "--", "renameme.txt"]);
    await fixture.git(["commit", "-m", "chore: add file to rename"]);

    await fixture.git(["mv", "renameme.txt", "renamed.txt"]);

    const status = await collectBoundaryStatus(fixture.root);
    expect(status).toContain("renameme.txt");
    expect(status).toContain("renamed.txt");
  });

  it("round-trips filenames with spaces, quotes, and newlines", async () => {
    const fixture = await newFixture();
    const spaced = "a file with spaces.txt";
    const quoted = 'has"a quote.txt';
    const newlined = "line\nbreak.txt";
    for (const name of [spaced, quoted, newlined]) {
      await fs.writeFile(path.join(fixture.root, name), "v", "utf8");
    }

    const status = await collectBoundaryStatus(fixture.root);
    expect(status).toContain(spaced);
    expect(status).toContain(quoted);
    expect(status).toContain(newlined);
  });
});

describe("readHead", () => {
  it("returns the current HEAD object name", async () => {
    const fixture = await newFixture();
    const head = await readHead(fixture.root);
    expect(head).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe("isWorktreeClean", () => {
  it("is true on a clean worktree and false once a file appears", async () => {
    const fixture = await newFixture();
    expect(await isWorktreeClean(fixture.root)).toBe(true);
    await fs.writeFile(path.join(fixture.root, "dirty.txt"), "d", "utf8");
    expect(await isWorktreeClean(fixture.root)).toBe(false);
  });
});
