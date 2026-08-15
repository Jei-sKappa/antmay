import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readCheckpoint } from "./checkpoint/read.js";
import type { RunCheckpoint } from "./checkpoint/types.js";
import type { FileHandleLike, FsOps } from "./persist.js";
import { writeCheckpoint } from "./persist.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    if (cleanup) await cleanup();
  }
});

async function tempDir(): Promise<string> {
  const raw = await fs.mkdtemp(path.join(os.tmpdir(), "antmay-persist-"));
  cleanups.push(() => fs.rm(raw, { recursive: true, force: true }));
  return raw;
}

function checkpoint(): RunCheckpoint {
  return {
    schemaVersion: 0,
    runId: "20260723T121500123Z-0a1b2c3d",
    executor: { pid: 1, version: "0.1.0" },
    createdAt: "2026-07-23T12:15:00.123Z",
    updatedAt: "2026-07-23T12:16:00.000Z",
    repoRoot: "/tmp/repo",
    threadRelPath: "docs/threads/t",
    workspace: {
      strategy: "current-checkout",
      path: "/tmp/repo",
      execution: { cwd: "/tmp/repo", sandbox: "none", branchStrategy: "head" },
    },
    dangerouslySkipPermissions: false,
    pipelineName: "standard",
    pipelineSourcePath: "/tmp/config/pipelines/standard.json",
    profileSelection: { kind: "settings-only" },
    stages: [
      {
        id: "spec",
        skill: "spec",
        targetRule: { kind: "fixed", target: { kind: "thread-root" } },
        prerequisite: { validThread: true },
        promises: { spec: true },
        gitPolicy: {
          headMayChange: false,
          allowedChanges: [],
          changeRequired: false,
          commitSubjectTemplate: null,
        },
        queueResolution: "rerun",
        resolvedTarget: "docs/threads/t/",
        instructions: "Keep it short.",
        binding: {
          agent: { harness: "codex", model: "gpt-5" },
          idleTimeoutSeconds: 900,
          heartbeatSeconds: 300,
        },
      },
    ],
    observedHarnessVersions: { codex: "codex 1.0.0" },
    runtime: { kind: "real" },
    stageIndex: 0,
    condition: "ready",
    attempts: [],
    waiting: null,
  };
}

function fakeHandle(overrides: Partial<FileHandleLike> = {}): FileHandleLike {
  return {
    write: async () => undefined,
    sync: async () => undefined,
    close: async () => undefined,
    ...overrides,
  };
}

/**
 * Wrap the real open so the temp file is genuinely created on disk, then apply
 * `overrides`: cleanup must unlink that exact path.
 */
function realOpen(
  overrides: Partial<FileHandleLike> = {},
): FsOps["open"] {
  return async (filePath, flags, mode) => {
    const handle = await fs.open(filePath, flags, mode);
    return {
      write: (data) => handle.write(data),
      sync: () => handle.sync(),
      close: () => handle.close(),
      ...overrides,
    };
  };
}

async function tempFiles(dir: string): Promise<string[]> {
  const names = await fs.readdir(dir);
  return names.filter((n) => n.startsWith(".state.json.") && n.endsWith(".tmp"));
}

describe("writeCheckpoint serialization (AC-13.2)", () => {
  it("writes deterministic two-space JSON with a trailing newline", async () => {
    const dir = await tempDir();
    const cp = checkpoint();
    await writeCheckpoint(dir, cp);
    const raw = await fs.readFile(path.join(dir, "state.json"), "utf8");
    expect(raw).toBe(`${JSON.stringify(cp, null, 2)}\n`);
  });

  it("round-trips through readCheckpoint", async () => {
    const dir = await tempDir();
    const cp = checkpoint();
    await writeCheckpoint(dir, cp);
    const result = await readCheckpoint(dir);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.checkpoint).toEqual(cp);
  });
});

describe("writeCheckpoint atomic temp file", () => {
  it("exclusively creates the temp file with flag wx and mode 0600", async () => {
    const opens: Array<{ path: string; flags: string; mode?: number | undefined }> =
      [];
    let renamed = false;
    const fsOps: FsOps = {
      open: async (p, flags, mode) => {
        opens.push({ path: p, flags, mode });
        return fakeHandle();
      },
      rename: async () => {
        renamed = true;
      },
    };
    await writeCheckpoint("/tmp/run", checkpoint(), fsOps);
    const tempOpen = opens.find((o) => o.path.includes(".state.json."));
    expect(tempOpen).toBeDefined();
    expect(tempOpen?.flags).toBe("wx");
    expect(tempOpen?.mode).toBe(0o600);
    expect(renamed).toBe(true);
  });
});

describe("writeCheckpoint failure atomicity (AC-13.2)", () => {
  it("leaves the previous state.json intact on injected write failure", async () => {
    const dir = await tempDir();
    const first = checkpoint();
    await writeCheckpoint(dir, first);

    let renamed = false;
    const failing: FsOps = {
      open: async () => fakeHandle({ write: async () => { throw new Error("disk full"); } }),
      rename: async () => { renamed = true; },
    };
    const second = { ...checkpoint(), runId: "20260723T999999999Z-ffffffff" };
    await expect(writeCheckpoint(dir, second, failing)).rejects.toThrow("disk full");
    expect(renamed).toBe(false);

    const result = await readCheckpoint(dir);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.checkpoint).toEqual(first);
  });

  it("leaves the previous state.json intact on injected rename failure", async () => {
    const dir = await tempDir();
    const first = checkpoint();
    await writeCheckpoint(dir, first);

    const failing: FsOps = {
      open: async () => fakeHandle(),
      rename: async () => { throw new Error("rename failed"); },
    };
    const second = { ...checkpoint(), runId: "20260723T999999999Z-ffffffff" };
    await expect(writeCheckpoint(dir, second, failing)).rejects.toThrow("rename failed");

    const result = await readCheckpoint(dir);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.checkpoint).toEqual(first);
  });

  it("leaves no temp file behind when the write fails", async () => {
    const dir = await tempDir();
    await writeCheckpoint(dir, checkpoint());

    const failing: FsOps = {
      open: realOpen({ write: () => Promise.reject(new Error("disk full")) }),
      rename: async () => {
        throw new Error("rename must not be reached");
      },
    };
    await expect(writeCheckpoint(dir, checkpoint(), failing)).rejects.toThrow(
      "disk full",
    );
    expect(await tempFiles(dir)).toEqual([]);
  });

  it("leaves no temp file behind when the rename fails", async () => {
    const dir = await tempDir();
    await writeCheckpoint(dir, checkpoint());

    const failing: FsOps = {
      open: realOpen(),
      rename: () => Promise.reject(new Error("rename failed")),
    };
    await expect(writeCheckpoint(dir, checkpoint(), failing)).rejects.toThrow(
      "rename failed",
    );
    expect(await tempFiles(dir)).toEqual([]);
  });

  it("propagates the original failure when cleanup also fails", async () => {
    const dir = await tempDir();
    const failing: FsOps = {
      open: async () =>
        fakeHandle({
          write: () => Promise.reject(new Error("disk full")),
          close: () => Promise.reject(new Error("close failed")),
        }),
      rename: async () => undefined,
    };
    await expect(writeCheckpoint(dir, checkpoint(), failing)).rejects.toThrow(
      "disk full",
    );
  });
});

describe("readCheckpoint ignores leftover temp files", () => {
  it("reads only state.json and ignores stray temp files", async () => {
    const dir = await tempDir();
    const cp = checkpoint();
    await writeCheckpoint(dir, cp);
    await fs.writeFile(path.join(dir, ".state.json.deadbeef.tmp"), "not json {{{", "utf8");
    const result = await readCheckpoint(dir);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.checkpoint).toEqual(cp);
  });

  it("reports a failure when state.json is missing", async () => {
    const dir = await tempDir();
    const result = await readCheckpoint(dir);
    expect(result.ok).toBe(false);
  });
});
