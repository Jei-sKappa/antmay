import {
  type AttachmentHandle,
  asAttachmentHandle,
  asRepositoryPath,
  asRunId,
  asThreadPath,
  type RunRecord,
} from "@antmay/core";
import { describe, expect, it } from "vitest";
import { HerdrAdapter, HerdrAdapterError } from "../src/adapters/herdr";
import type {
  ExecutionAdapter,
  ReadResult,
  SpawnedSession,
  SpawnSpec,
} from "../src/adapters/types";
import { attachRun } from "../src/attach/operation";
import type {
  ProcessRunner,
  ProcessRunResult,
} from "../src/process/process-runner";

class SpyAdapter implements ExecutionAdapter {
  readonly name = "herdr" as const;
  attachCalls: AttachmentHandle[] = [];
  constructor(private readonly failWith?: Error) {}
  spawn(_spec: SpawnSpec): SpawnedSession {
    return { handle: asAttachmentHandle("x") };
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
  attach(handle: AttachmentHandle): void {
    this.attachCalls.push(handle);
    if (this.failWith !== undefined) {
      throw this.failWith;
    }
  }
}

function record(): RunRecord {
  return {
    id: asRunId("run-1"),
    repositoryPath: asRepositoryPath("/repo"),
    threadPath: asThreadPath("/repo/docs/threads/t"),
    skill: "propose",
    harness: "claude",
    adapter: "herdr",
    session: { kind: "pinned", id: "s" },
    attachment: { available: true, handle: asAttachmentHandle("w1:p1") },
    classification: "done",
    reason: "done reason",
    workerHealth: { state: "healthy", detail: null },
  };
}

describe("attachRun", () => {
  it("delegates to the adapter with the recorded handle", () => {
    const adapter = new SpyAdapter();
    const run = record();
    attachRun(adapter, run.attachment.handle as AttachmentHandle);
    expect(adapter.attachCalls).toEqual([asAttachmentHandle("w1:p1")]);
  });

  it("propagates the adapter failure and mutates no run state", () => {
    const adapter = new SpyAdapter(new Error("pane gone"));
    const run = record();
    const before = { ...run };
    expect(() =>
      attachRun(adapter, run.attachment.handle as AttachmentHandle),
    ).toThrow("pane gone");
    // The record this caller holds is untouched: attachRun never receives it.
    expect(run).toEqual(before);
    expect(run.classification).toBe("done");
    expect(run.attachment.handle).toBe(asAttachmentHandle("w1:p1"));
  });

  it("delegates through the real herdr adapter's attach command", () => {
    const calls: string[][] = [];
    const runner: ProcessRunner = {
      run(_p, args): ProcessRunResult {
        calls.push([...args]);
        return { code: 0, stdout: "", stderr: "" };
      },
      locate: () => null,
    };
    attachRun(new HerdrAdapter(runner), asAttachmentHandle("w1:p1"));
    expect(calls).toEqual([["terminal", "attach", "w1:p1"]]);
  });

  it("surfaces the adapter's retained-handle error unchanged on failure", () => {
    const runner: ProcessRunner = {
      run: () => ({ code: 1, stdout: "", stderr: "no pane" }),
      locate: () => null,
    };
    try {
      attachRun(new HerdrAdapter(runner), asAttachmentHandle("w1:p1"));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(HerdrAdapterError);
      expect((error as HerdrAdapterError).retainedHandle).toBe(
        asAttachmentHandle("w1:p1"),
      );
    }
  });
});
