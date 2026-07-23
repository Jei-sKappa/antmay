import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveCurrentCheckoutWorkspace } from "./current-checkout.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    if (cleanup) await cleanup();
  }
});

async function tempDir(): Promise<string> {
  const raw = await fs.mkdtemp(path.join(os.tmpdir(), "antmay-ws-"));
  cleanups.push(() => fs.rm(raw, { recursive: true, force: true }));
  return fs.realpath(raw);
}

describe("resolveCurrentCheckoutWorkspace (AC-8.4, DR10, DR24)", () => {
  it("resolves a symlinked repo path to its canonical root", async () => {
    const realRoot = path.join(await tempDir(), "repo");
    await fs.mkdir(realRoot);
    const canonical = await fs.realpath(realRoot);

    const linkParent = await tempDir();
    const link = path.join(linkParent, "link-to-repo");
    await fs.symlink(realRoot, link);

    const config = await resolveCurrentCheckoutWorkspace(link);
    expect(config.path).toBe(canonical);
    expect(config.execution.cwd).toBe(canonical);
  });

  it("returns exact strategy, sandbox, and branch execution values", async () => {
    const root = path.join(await tempDir(), "repo");
    await fs.mkdir(root);
    const canonical = await fs.realpath(root);

    const config = await resolveCurrentCheckoutWorkspace(root);
    expect(config).toEqual({
      strategy: "current-checkout",
      path: canonical,
      execution: {
        cwd: canonical,
        sandbox: "none",
        branchStrategy: "head",
      },
    });
    // For current-checkout, path always equals execution.cwd.
    expect(config.path).toBe(config.execution.cwd);
  });
});
