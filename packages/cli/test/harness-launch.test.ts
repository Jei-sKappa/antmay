import {
  type AttachmentHandle,
  asAttachmentHandle,
  type CatalogEntry,
  findCatalogEntry,
} from "@antmay/core";
import { describe, expect, it } from "vitest";
import type {
  ExecutionAdapter,
  ReadResult,
  SpawnedSession,
  SpawnSpec,
} from "../src/adapters/types";
import {
  type LaunchRequest,
  launchHarness,
  planHarnessLaunch,
} from "../src/harnesses/index";

const implement = findCatalogEntry("implement") as CatalogEntry;
const propose = findCatalogEntry("propose") as CatalogEntry;

const REPO = "/canonical/repo";
const THREAD = "/canonical/repo/docs/threads/260718155545Z-x";

class RecordingAdapter implements ExecutionAdapter {
  readonly name = "herdr" as const;
  spawnedWith: SpawnSpec | null = null;
  spawn(spec: SpawnSpec): SpawnedSession {
    this.spawnedWith = spec;
    return { handle: asAttachmentHandle("w1:p1") };
  }
  send(): void {}
  read(): ReadResult {
    return { output: "" };
  }
  liveness(): { alive: boolean } {
    return { alive: true };
  }
  enumerate(): readonly AttachmentHandle[] {
    return [];
  }
  attach(): void {}
}

function claudeRequest(overrides: Partial<LaunchRequest> = {}): LaunchRequest {
  return {
    skill: implement,
    harness: "claude",
    repositoryPath: REPO,
    threadPath: THREAD,
    request: "task 5",
    harnessExecutable: "/bin/claude",
    generateSessionId: () => "fixed-uuid",
    ...overrides,
  };
}

describe("launchHarness — Claude", () => {
  it("pins a generated session UUID via --session-id and records it", () => {
    const adapter = new RecordingAdapter();
    const launch = launchHarness(
      adapter,
      claudeRequest({
        env: { ANTMAY_CLAUDE_TRANSCRIPT_ROOT: "/tscript" },
      }),
    );

    expect(launch.session).toEqual({ kind: "pinned", id: "fixed-uuid" });
    expect(adapter.spawnedWith?.command).toBe("/bin/claude");
    expect(adapter.spawnedWith?.args).toEqual(["--session-id", "fixed-uuid"]);
    expect(adapter.spawnedWith?.cwd).toBe(REPO);
    // The transcript root is both passed to the pane and carried for the reader.
    expect(adapter.spawnedWith?.env).toEqual({
      ANTMAY_CLAUDE_TRANSCRIPT_ROOT: "/tscript",
    });
    expect(launch.observation).toEqual({
      kind: "claude",
      sessionId: "fixed-uuid",
      transcriptRoot: "/tscript",
    });
    expect(launch.handle).toBe(asAttachmentHandle("w1:p1"));
  });

  it("injects no permission posture flags", () => {
    const adapter = new RecordingAdapter();
    launchHarness(adapter, claudeRequest());
    const args = adapter.spawnedWith?.args ?? [];
    expect(args.join(" ")).not.toMatch(/permission|dangerous|skip/i);
    expect(args).toEqual(["--session-id", "fixed-uuid"]);
  });

  it("submits the rendered invocation as the initial input", () => {
    const adapter = new RecordingAdapter();
    const launch = launchHarness(adapter, claudeRequest({ request: "task 5" }));
    expect(adapter.spawnedWith?.initialInput).toBe(
      `/implement ${THREAD}\n\ntask 5`,
    );
    expect(launch.invocation).toBe(adapter.spawnedWith?.initialInput);
  });
});

describe("launchHarness — Codex", () => {
  it("records a heuristic cwd/spawn-time identity with no deterministic id", () => {
    const adapter = new RecordingAdapter();
    const launch = launchHarness(adapter, {
      skill: propose,
      harness: "codex",
      repositoryPath: REPO,
      threadPath: THREAD,
      request: null,
      harnessExecutable: "/bin/codex",
      now: () => 1_700_000_000_000,
      env: { ANTMAY_CODEX_SESSION_ROOT: "/sroot" },
    });

    expect(launch.session).toEqual({ kind: "heuristic", id: null });
    expect(adapter.spawnedWith?.command).toBe("/bin/codex");
    expect(adapter.spawnedWith?.args).toEqual([]);
    expect(adapter.spawnedWith?.cwd).toBe(REPO);
    expect(adapter.spawnedWith?.env).toEqual({
      ANTMAY_CODEX_SESSION_ROOT: "/sroot",
    });
    expect(launch.observation).toEqual({
      kind: "codex",
      sessionRoot: "/sroot",
      spawnedAtMs: 1_700_000_000_000,
    });
  });

  it("differs from Claude: no --session-id and the dollar identity", () => {
    const plan = planHarnessLaunch({
      skill: propose,
      harness: "codex",
      repositoryPath: REPO,
      threadPath: THREAD,
      request: null,
      harnessExecutable: "/bin/codex",
      now: () => 1,
    });
    expect(plan.spec.args).toEqual([]);
    expect(plan.spec.initialInput.startsWith("$propose ")).toBe(true);
  });
});
