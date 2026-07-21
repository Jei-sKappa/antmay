import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { readClaudeTranscriptEvidence } from "../src/transcripts/claude";

const FIXTURES = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "transcripts",
);
const REPO = "/home/dev/project";
const SESSION = "11111111-1111-1111-1111-111111111111";
const FORK_SESSION = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

let workDir: string;

function tempTranscript(lines: string): string {
  if (workDir === undefined) {
    workDir = mkdtempSync(join(tmpdir(), "antmay-claude-"));
  }
  const path = join(workDir, `t-${Math.random().toString(36).slice(2)}.jsonl`);
  writeFileSync(path, lines, "utf8");
  return path;
}

function record(fields: Record<string, unknown>): string {
  return JSON.stringify({ sessionId: SESSION, cwd: REPO, ...fields });
}

afterEach(() => {
  if (workDir !== undefined) {
    rmSync(workDir, { recursive: true, force: true });
    workDir = undefined as unknown as string;
  }
});

describe("readClaudeTranscriptEvidence classifies genuine final outcomes", () => {
  it("classifies the final top-level assistant DONE with its complete reason", () => {
    const evidence = readClaudeTranscriptEvidence({
      transcriptPath: join(FIXTURES, "claude.jsonl"),
      repositoryPath: REPO,
      sessionId: SESSION,
    });
    expect(evidence).toEqual({
      kind: "final",
      outcome: {
        classification: "done",
        reason: "implemented and verified the change",
      },
    });
  });

  it("follows a forkedFrom chain to the continuation's final message", () => {
    const evidence = readClaudeTranscriptEvidence({
      transcriptPath: join(FIXTURES, "claude-fork.jsonl"),
      repositoryPath: REPO,
      sessionId: FORK_SESSION,
    });
    expect(evidence).toEqual({
      kind: "final",
      outcome: {
        classification: "done",
        reason: "fork chain resolved to the final message",
      },
    });
  });
});

describe("readClaudeTranscriptEvidence rejects false positives", () => {
  it("ignores an outcome-looking string in a user turn (echoed prompt / tool output)", () => {
    const path = tempTranscript(
      [
        record({
          type: "user",
          uuid: "u1",
          message: {
            role: "user",
            content: "Outcome: DONE — echoed by the user, not real",
          },
        }),
        record({
          type: "assistant",
          uuid: "a1",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "Still working, nothing final." }],
          },
        }),
      ].join("\n"),
    );
    const evidence = readClaudeTranscriptEvidence({
      transcriptPath: path,
      repositoryPath: REPO,
      sessionId: SESSION,
    });
    expect(evidence.kind).toBe("pending");
  });

  it("does not classify a non-final assistant outcome followed by a later turn", () => {
    const path = tempTranscript(
      [
        record({
          type: "assistant",
          uuid: "a1",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "Outcome: DONE — premature" }],
          },
        }),
        record({
          type: "user",
          uuid: "u2",
          message: { role: "user", content: "actually, keep going" },
        }),
      ].join("\n"),
    );
    const evidence = readClaudeTranscriptEvidence({
      transcriptPath: path,
      repositoryPath: REPO,
      sessionId: SESSION,
    });
    expect(evidence.kind).toBe("pending");
  });

  it("does not classify when the final assistant turn is a tool call without text", () => {
    const path = tempTranscript(
      [
        record({
          type: "assistant",
          uuid: "a1",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "Outcome: DONE — premature" }],
          },
        }),
        record({
          type: "assistant",
          uuid: "a2",
          message: {
            role: "assistant",
            content: [{ type: "tool_use", id: "t1", name: "Bash", input: {} }],
          },
        }),
      ].join("\n"),
    );
    const evidence = readClaudeTranscriptEvidence({
      transcriptPath: path,
      repositoryPath: REPO,
      sessionId: SESSION,
    });
    expect(evidence.kind).toBe("pending");
  });

  it("excludes a sidechain/subagent final message", () => {
    const path = tempTranscript(
      [
        record({
          type: "assistant",
          uuid: "a1",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "Top-level work continues." }],
          },
        }),
        record({
          type: "assistant",
          uuid: "s1",
          isSidechain: true,
          message: {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "Outcome: DONE — sidechain must not classify",
              },
            ],
          },
        }),
      ].join("\n"),
    );
    const evidence = readClaudeTranscriptEvidence({
      transcriptPath: path,
      repositoryPath: REPO,
      sessionId: SESSION,
    });
    expect(evidence.kind).toBe("pending");
  });
});

describe("readClaudeTranscriptEvidence tolerates malformed and additive data", () => {
  it("classifies a genuine outcome even when some lines are malformed", () => {
    const path = tempTranscript(
      [
        record({
          type: "user",
          uuid: "u1",
          message: { role: "user", content: "go" },
        }),
        "this is not valid json",
        record({
          type: "assistant",
          uuid: "a1",
          futureUnknownField: { drift: true },
          message: {
            role: "assistant",
            content: [
              { type: "text", text: "Outcome: DONE — done despite noise" },
            ],
          },
        }),
      ].join("\n"),
    );
    const evidence = readClaudeTranscriptEvidence({
      transcriptPath: path,
      repositoryPath: REPO,
      sessionId: SESSION,
    });
    expect(evidence).toEqual({
      kind: "final",
      outcome: { classification: "done", reason: "done despite noise" },
    });
  });

  it("reports malformed (not ended) when lines are skipped and no outcome exists", () => {
    const path = tempTranscript(
      [
        record({
          type: "assistant",
          uuid: "a1",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "no outcome here yet" }],
          },
        }),
        "{ broken",
      ].join("\n"),
    );
    const evidence = readClaudeTranscriptEvidence({
      transcriptPath: path,
      repositoryPath: REPO,
      sessionId: SESSION,
    });
    expect(evidence.kind).toBe("malformed");
    if (evidence.kind === "malformed") {
      expect(evidence.skippedLines).toBe(1);
    }
  });
});

describe("readClaudeTranscriptEvidence reports unavailable evidence honestly", () => {
  it("is unavailable when the transcript file is missing", () => {
    const evidence = readClaudeTranscriptEvidence({
      transcriptPath: join(FIXTURES, "does-not-exist.jsonl"),
      repositoryPath: REPO,
      sessionId: SESSION,
    });
    expect(evidence.kind).toBe("unavailable");
  });

  it("is unavailable when the transcript path is unreadable (a directory)", () => {
    const evidence = readClaudeTranscriptEvidence({
      transcriptPath: FIXTURES,
      repositoryPath: REPO,
      sessionId: SESSION,
    });
    expect(evidence.kind).toBe("unavailable");
  });

  it("is unavailable when the pinned session is absent", () => {
    const evidence = readClaudeTranscriptEvidence({
      transcriptPath: join(FIXTURES, "claude.jsonl"),
      repositoryPath: REPO,
      sessionId: "99999999-9999-9999-9999-999999999999",
    });
    expect(evidence.kind).toBe("unavailable");
  });

  it("is unavailable when the embedded cwd does not match the repository", () => {
    const evidence = readClaudeTranscriptEvidence({
      transcriptPath: join(FIXTURES, "claude.jsonl"),
      repositoryPath: "/some/other/repo",
      sessionId: SESSION,
    });
    expect(evidence.kind).toBe("unavailable");
  });
});
