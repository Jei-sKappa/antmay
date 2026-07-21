import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  discoverCodexRollout,
  readCodexRolloutEvidence,
  readCodexTranscriptEvidence,
} from "../src/transcripts/codex";

const FIXTURES = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "transcripts",
);
const REPO = "/home/dev/project";
const SPAWNED_AT = Date.parse("2026-07-21T10:00:00Z");

let workDir: string;

function sessionRoot(): string {
  if (workDir === undefined) {
    workDir = mkdtempSync(join(tmpdir(), "antmay-codex-"));
  }
  const nested = join(workDir, "2026", "07", "21");
  mkdirSync(nested, { recursive: true });
  return nested;
}

function stageRollout(name: string, content: string): string {
  const path = join(sessionRoot(), name);
  writeFileSync(path, content, "utf8");
  return path;
}

function fixtureContent(name: string): string {
  return readFileSync(join(FIXTURES, name), "utf8");
}

afterEach(() => {
  if (workDir !== undefined) {
    rmSync(workDir, { recursive: true, force: true });
    workDir = undefined as unknown as string;
  }
});

describe("readCodexRolloutEvidence classifies a top-level task completion", () => {
  it("classifies the final task_complete DONE with its complete reason", () => {
    const evidence = readCodexRolloutEvidence({
      rolloutPath: join(FIXTURES, "codex.jsonl"),
      repositoryPath: REPO,
    });
    expect(evidence).toEqual({
      kind: "final",
      outcome: {
        classification: "done",
        reason: "codex completed the top-level task",
      },
    });
  });

  it("rejects a subagent (thread_source) rollout without classifying it", () => {
    const evidence = readCodexRolloutEvidence({
      rolloutPath: join(FIXTURES, "codex-subagent.jsonl"),
      repositoryPath: REPO,
    });
    expect(evidence.kind).toBe("unavailable");
  });

  it("is unavailable when the recorded cwd does not match the repository", () => {
    const evidence = readCodexRolloutEvidence({
      rolloutPath: join(FIXTURES, "codex.jsonl"),
      repositoryPath: "/some/other/repo",
    });
    expect(evidence.kind).toBe("unavailable");
  });

  it("is pending when there is no task completion yet", () => {
    const path = stageRollout(
      "rollout-open.jsonl",
      [
        JSON.stringify({
          type: "session_meta",
          timestamp: "2026-07-21T10:00:00Z",
          payload: { id: "s", cwd: REPO },
        }),
        JSON.stringify({
          type: "response_item",
          timestamp: "2026-07-21T10:00:02Z",
          payload: {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: "still working" }],
          },
        }),
      ].join("\n"),
    );
    const evidence = readCodexRolloutEvidence({
      rolloutPath: path,
      repositoryPath: REPO,
    });
    expect(evidence.kind).toBe("pending");
  });

  it("is pending when task_complete carries no final agent message", () => {
    const path = stageRollout(
      "rollout-nomsg.jsonl",
      [
        JSON.stringify({
          type: "session_meta",
          timestamp: "2026-07-21T10:00:00Z",
          payload: { id: "s", cwd: REPO },
        }),
        JSON.stringify({
          type: "event_msg",
          timestamp: "2026-07-21T10:00:09Z",
          payload: { type: "task_complete", turn_id: "t1" },
        }),
      ].join("\n"),
    );
    const evidence = readCodexRolloutEvidence({
      rolloutPath: path,
      repositoryPath: REPO,
    });
    expect(evidence.kind).toBe("pending");
  });

  it("classifies despite malformed lines and reports malformed when no outcome", () => {
    const withOutcome = stageRollout(
      "rollout-noise-done.jsonl",
      [
        JSON.stringify({
          type: "session_meta",
          timestamp: "2026-07-21T10:00:00Z",
          payload: { id: "s", cwd: REPO },
        }),
        "not json at all",
        JSON.stringify({
          type: "event_msg",
          timestamp: "2026-07-21T10:00:09Z",
          payload: {
            type: "task_complete",
            turn_id: "t1",
            last_agent_message: "Outcome: DONE — done despite noise",
          },
        }),
      ].join("\n"),
    );
    expect(
      readCodexRolloutEvidence({
        rolloutPath: withOutcome,
        repositoryPath: REPO,
      }),
    ).toEqual({
      kind: "final",
      outcome: { classification: "done", reason: "done despite noise" },
    });

    const noOutcome = stageRollout(
      "rollout-noise-open.jsonl",
      [
        JSON.stringify({
          type: "session_meta",
          timestamp: "2026-07-21T10:00:00Z",
          payload: { id: "s", cwd: REPO },
        }),
        "{ broken",
      ].join("\n"),
    );
    const evidence = readCodexRolloutEvidence({
      rolloutPath: noOutcome,
      repositoryPath: REPO,
    });
    expect(evidence.kind).toBe("malformed");
    if (evidence.kind === "malformed") {
      expect(evidence.skippedLines).toBe(1);
    }
  });
});

describe("discoverCodexRollout selects the top-level rollout", () => {
  it("picks the cwd-matching, non-subagent rollout nearest the spawn time", () => {
    const top = stageRollout(
      "rollout-top.jsonl",
      fixtureContent("codex.jsonl"),
    );
    stageRollout("rollout-sub.jsonl", fixtureContent("codex-subagent.jsonl"));
    stageRollout(
      "rollout-decoy.jsonl",
      [
        JSON.stringify({
          type: "session_meta",
          timestamp: "2026-07-20T09:00:00Z",
          payload: { id: "decoy", cwd: REPO },
        }),
        JSON.stringify({
          type: "event_msg",
          timestamp: "2026-07-20T09:05:00Z",
          payload: {
            type: "task_complete",
            turn_id: "d1",
            last_agent_message: "Outcome: DONE — decoy older rollout",
          },
        }),
      ].join("\n"),
    );

    const discovered = discoverCodexRollout({
      sessionRoot: workDir,
      repositoryPath: REPO,
      spawnedAtMs: SPAWNED_AT,
    });
    expect(discovered).toBe(top);
  });

  it("reads terminal evidence from the discovered top-level rollout", () => {
    stageRollout("rollout-top.jsonl", fixtureContent("codex.jsonl"));
    stageRollout("rollout-sub.jsonl", fixtureContent("codex-subagent.jsonl"));

    const evidence = readCodexTranscriptEvidence({
      sessionRoot: workDir,
      repositoryPath: REPO,
      spawnedAtMs: SPAWNED_AT,
    });
    expect(evidence).toEqual({
      kind: "final",
      outcome: {
        classification: "done",
        reason: "codex completed the top-level task",
      },
    });
  });

  it("excludes a subagent rollout even when it is the only match", () => {
    stageRollout("rollout-sub.jsonl", fixtureContent("codex-subagent.jsonl"));
    expect(
      discoverCodexRollout({
        sessionRoot: workDir,
        repositoryPath: REPO,
        spawnedAtMs: SPAWNED_AT,
      }),
    ).toBeNull();
    expect(
      readCodexTranscriptEvidence({
        sessionRoot: workDir,
        repositoryPath: REPO,
        spawnedAtMs: SPAWNED_AT,
      }).kind,
    ).toBe("unavailable");
  });

  it("is unavailable when no rollout is discoverable", () => {
    const empty = mkdtempSync(join(tmpdir(), "antmay-codex-empty-"));
    try {
      expect(
        discoverCodexRollout({
          sessionRoot: empty,
          repositoryPath: REPO,
          spawnedAtMs: SPAWNED_AT,
        }),
      ).toBeNull();
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
