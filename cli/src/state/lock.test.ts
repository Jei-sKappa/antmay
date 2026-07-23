import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { LockFsOps } from "./lock.js";
import { acquireWorkspaceLock, lockPathFor, locksDirectory } from "./lock.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    if (cleanup) await cleanup();
  }
});

async function stateRootDir(): Promise<string> {
  const raw = await fs.mkdtemp(path.join(os.tmpdir(), "antmay-lock-"));
  cleanups.push(() => fs.rm(raw, { recursive: true, force: true }));
  return path.join(await fs.realpath(raw), "state");
}

const WORKSPACE = "/canonical/workspace/root";
const NOW = new Date(Date.UTC(2026, 6, 23, 12, 15, 0, 123));

async function exists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

describe("lockPathFor (AC-8.1)", () => {
  it("is the sha256 hex of the workspace path under afk-locks/", async () => {
    const stateRoot = await stateRootDir();
    const digest = createHash("sha256").update(WORKSPACE).digest("hex");
    expect(lockPathFor(stateRoot, WORKSPACE)).toBe(
      path.join(locksDirectory(stateRoot), `${digest}.lock`),
    );
  });
});

describe("acquireWorkspaceLock (AC-8.1)", () => {
  it("creates the lock at mode 0600 with all record fields", async () => {
    const stateRoot = await stateRootDir();
    const outcome = await acquireWorkspaceLock(stateRoot, WORKSPACE, "run-1", NOW);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const st = await fs.stat(outcome.handle.lockPath);
    expect(st.mode & 0o777).toBe(0o600);

    const record = JSON.parse(await fs.readFile(outcome.handle.lockPath, "utf8"));
    expect(record).toMatchObject({
      lockVersion: 1,
      workspacePath: WORKSPACE,
      runId: "run-1",
      pid: process.pid,
      acquiredAt: "2026-07-23T12:15:00.123Z",
      ownerToken: outcome.handle.ownerToken,
    });
    expect(typeof record.ownerToken).toBe("string");
    expect(record.ownerToken.length).toBeGreaterThan(0);
  });

  it("creates afk-locks/ at mode 0700", async () => {
    const stateRoot = await stateRootDir();
    await acquireWorkspaceLock(stateRoot, WORKSPACE, "run-1", NOW);
    const st = await fs.stat(locksDirectory(stateRoot));
    expect(st.mode & 0o777).toBe(0o700);
  });

  it("leaves no lock path behind when the record write fails", async () => {
    const stateRoot = await stateRootDir();
    const lockPath = lockPathFor(stateRoot, WORKSPACE);
    // Wrap the real open so the file is genuinely created on disk, then force
    // the record write to reject: cleanup must unlink that exact path.
    const failingWrite: LockFsOps = {
      open: async (filePath, flags, mode) => {
        const handle = await fs.open(filePath, flags, mode);
        return {
          write: () => Promise.reject(new Error("disk full")),
          sync: () => handle.sync(),
          close: () => handle.close(),
        };
      },
    };
    await expect(
      acquireWorkspaceLock(stateRoot, WORKSPACE, "run-1", NOW, failingWrite),
    ).rejects.toThrow("disk full");
    expect(await exists(lockPath)).toBe(false);
  });

  it("returns contention with the existing record and path on a second acquire", async () => {
    const stateRoot = await stateRootDir();
    const first = await acquireWorkspaceLock(stateRoot, WORKSPACE, "run-1", NOW);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await acquireWorkspaceLock(stateRoot, WORKSPACE, "run-2", NOW);
    expect(second.ok).toBe(false);
    if (second.ok) return;

    expect(second.lockPath).toBe(first.handle.lockPath);
    const record = JSON.parse(second.existingRecord);
    expect(record.runId).toBe("run-1");
    // Contention never reclaims: the original lock is untouched.
    expect(await exists(first.handle.lockPath)).toBe(true);
  });
});

describe("LockHandle.release (AC-8.3)", () => {
  it("unlinks when the stored owner token matches", async () => {
    const stateRoot = await stateRootDir();
    const outcome = await acquireWorkspaceLock(stateRoot, WORKSPACE, "run-1", NOW);
    if (!outcome.ok) throw new Error("expected acquisition");
    await outcome.handle.release();
    expect(await exists(outcome.handle.lockPath)).toBe(false);
  });

  it("leaves the file alone when the stored token has been tampered", async () => {
    const stateRoot = await stateRootDir();
    const outcome = await acquireWorkspaceLock(stateRoot, WORKSPACE, "run-1", NOW);
    if (!outcome.ok) throw new Error("expected acquisition");

    // Simulate a different owner (e.g. a reclaimed run) rewriting the token.
    const tampered = { ...JSON.parse(await fs.readFile(outcome.handle.lockPath, "utf8")), ownerToken: "someone-else" };
    await fs.writeFile(outcome.handle.lockPath, JSON.stringify(tampered));

    await outcome.handle.release();
    expect(await exists(outcome.handle.lockPath)).toBe(true);
  });

  it("is idempotent: a second release after unlink is a no-op", async () => {
    const stateRoot = await stateRootDir();
    const outcome = await acquireWorkspaceLock(stateRoot, WORKSPACE, "run-1", NOW);
    if (!outcome.ok) throw new Error("expected acquisition");
    await outcome.handle.release();
    await expect(outcome.handle.release()).resolves.toBeUndefined();
    expect(await exists(outcome.handle.lockPath)).toBe(false);
  });
});
