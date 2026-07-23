import { describe, expect, it } from "vitest";

import type { AttemptOutcome } from "../harness/types.js";
import type {
  BoundaryDisposition,
  Classification,
  ClassificationInput,
} from "./classify.js";
import { classifyAttempt } from "./classify.js";
import type { OutcomeParse } from "./outcome.js";

const completed: AttemptOutcome = { kind: "completed", finalText: "Outcome: DONE" };

function failed(
  category: "idle-timeout" | "aborted" | "provider-error",
): AttemptOutcome {
  return {
    kind: "failed",
    category,
    errorClass: "SomeError",
    errorMessage: "the harness fell over",
  };
}

const doneParse: OutcomeParse = {
  token: "DONE",
  candidateLine: "Outcome: DONE",
  detail: "",
};
const blockedParse: OutcomeParse = {
  token: "BLOCKED",
  candidateLine: "Outcome: BLOCKED — needs input",
  detail: "— needs input",
};
const refusedParse: OutcomeParse = {
  token: "REFUSED",
  candidateLine: "Outcome: REFUSED",
  detail: "",
};
const malformedParse: OutcomeParse = {
  token: null,
  candidateLine: "I think I finished",
};

const okBoundary: BoundaryDisposition = { evaluated: true, ok: true };
const notEvaluated: BoundaryDisposition = { evaluated: false };
const violationBoundary: BoundaryDisposition = {
  evaluated: true,
  ok: false,
  kind: "git-policy-violation",
  message: "The worktree changed a path outside the stage's allowed selectors.",
};
const commitErrorBoundary: BoundaryDisposition = {
  evaluated: true,
  ok: false,
  kind: "commit-error",
  message: "The executor commit failed while finalizing the boundary.",
};

function input(overrides: Partial<ClassificationInput>): ClassificationInput {
  return {
    attemptOutcome: completed,
    parse: doneParse,
    pendingFiles: [],
    queueScanError: null,
    boundary: okBoundary,
    ...overrides,
  };
}

/** Assert the result is a pause (or pause-done) and return it narrowed. */
function pauseOf(
  result: Classification,
): Exclude<Classification, { action: "advance" }> {
  if (result.action === "advance") {
    throw new Error(`expected a pause, got advance`);
  }
  return result;
}

describe("classifyAttempt", () => {
  it("DONE + ok boundary + empty queues advances", () => {
    expect(classifyAttempt(input({}))).toEqual({ action: "advance" });
  });

  it("DONE + ok boundary + pending files pauses as pause-done", () => {
    const pending = ["docs/threads/t/.pending-reviews/b/report.md"];
    const result = pauseOf(classifyAttempt(input({ pendingFiles: pending })));
    expect(result.action).toBe("pause-done");
    expect(result.kind).toBe("pending-queues");
    expect(result.message).toContain(pending[0]);
  });

  it("pause-done lists sorted pending paths", () => {
    const pending = ["docs/threads/t/z.md", "docs/threads/t/a.md"];
    const result = pauseOf(classifyAttempt(input({ pendingFiles: pending })));
    expect(result.action).toBe("pause-done");
    expect(result.message).toContain("docs/threads/t/a.md, docs/threads/t/z.md");
  });

  it("DONE + git-policy-violation keeps the boundary kind (no pending files)", () => {
    const result = classifyAttempt(input({ boundary: violationBoundary }));
    expect(result).toEqual({
      action: "pause",
      kind: "git-policy-violation",
      message: violationBoundary.message,
    });
  });

  it("DONE + violation lists pending files in the message", () => {
    const pending = ["docs/threads/t/.pending-decisions/d/q.md"];
    const result = pauseOf(
      classifyAttempt(input({ boundary: violationBoundary, pendingFiles: pending })),
    );
    expect(result.kind).toBe("git-policy-violation");
    expect(result.message).toContain(violationBoundary.message);
    expect(result.message).toContain(pending[0]);
  });

  it("DONE + violation + failed scan retains the boundary kind with the scan folded in (DR57/AC-11.6)", () => {
    const result = pauseOf(
      classifyAttempt(
        input({
          boundary: violationBoundary,
          pendingFiles: ["docs/threads/t/p.md"],
          queueScanError: "EACCES reading .pending-reviews",
        }),
      ),
    );
    expect(result.kind).toBe("git-policy-violation");
    expect(result.kind).not.toBe("gate-error");
    expect(result.message).toContain(violationBoundary.message);
    expect(result.message).toContain("docs/threads/t/p.md");
    expect(result.message).toContain("EACCES reading .pending-reviews");
  });

  it("DONE + commit-error + failed scan retains commit-error, never gate-error", () => {
    const result = pauseOf(
      classifyAttempt(
        input({
          boundary: commitErrorBoundary,
          queueScanError: "EIO reading .pending-decisions",
        }),
      ),
    );
    expect(result.kind).toBe("commit-error");
    expect(result.message).toContain(commitErrorBoundary.message);
    expect(result.message).toContain("EIO reading .pending-decisions");
  });

  it("a failed queue scan without a failed DONE boundary is a gate-error", () => {
    const result = pauseOf(
      classifyAttempt(
        input({
          attemptOutcome: failed("provider-error"),
          parse: blockedParse,
          queueScanError: "EACCES reading .pending-reviews",
        }),
      ),
    );
    expect(result.kind).toBe("gate-error");
    expect(result.message).toContain("EACCES reading .pending-reviews");
  });

  it("gate-error dominates a non-DONE pending queue when the scan itself failed", () => {
    const result = pauseOf(
      classifyAttempt(
        input({
          attemptOutcome: completed,
          parse: blockedParse,
          pendingFiles: ["docs/threads/t/p.md"],
          queueScanError: "unreadable",
        }),
      ),
    );
    expect(result.kind).toBe("gate-error");
  });

  it("BLOCKED with no pending files pauses as outcome-blocked", () => {
    const result = pauseOf(
      classifyAttempt(input({ parse: blockedParse, boundary: okBoundary })),
    );
    expect(result.kind).toBe("outcome-blocked");
    expect(result.message).toContain("BLOCKED");
    expect(result.message).toContain("— needs input");
  });

  it("BLOCKED with pending files pauses as pending-queues (waiting)", () => {
    const result = pauseOf(
      classifyAttempt(
        input({ parse: blockedParse, pendingFiles: ["docs/threads/t/p.md"] }),
      ),
    );
    expect(result.action).toBe("pause");
    expect(result.kind).toBe("pending-queues");
  });

  it("REFUSED with no pending files pauses as outcome-refused", () => {
    const result = pauseOf(classifyAttempt(input({ parse: refusedParse })));
    expect(result.kind).toBe("outcome-refused");
  });

  it("REFUSED with pending files pauses as pending-queues", () => {
    const result = pauseOf(
      classifyAttempt(
        input({ parse: refusedParse, pendingFiles: ["docs/threads/t/p.md"] }),
      ),
    );
    expect(result.kind).toBe("pending-queues");
  });

  it("provider error with no pending files pauses as harness-error", () => {
    const result = pauseOf(
      classifyAttempt(
        input({
          attemptOutcome: failed("provider-error"),
          parse: null,
          boundary: notEvaluated,
        }),
      ),
    );
    expect(result.kind).toBe("harness-error");
    expect(result.message).toContain("provider-error");
    expect(result.message).toContain("SomeError");
    expect(result.message).toContain("the harness fell over");
  });

  it("provider error with pending files pauses as pending-queues (queue dominance)", () => {
    const result = pauseOf(
      classifyAttempt(
        input({
          attemptOutcome: failed("provider-error"),
          parse: null,
          boundary: notEvaluated,
          pendingFiles: ["docs/threads/t/p.md"],
        }),
      ),
    );
    expect(result.kind).toBe("pending-queues");
  });

  it("idle timeout with no pending files pauses as idle-timeout", () => {
    const result = pauseOf(
      classifyAttempt(
        input({
          attemptOutcome: failed("idle-timeout"),
          parse: null,
          boundary: notEvaluated,
        }),
      ),
    );
    expect(result.kind).toBe("idle-timeout");
    expect(result.message).toContain("idle-timeout");
  });

  it("idle timeout with pending files pauses as pending-queues", () => {
    const result = pauseOf(
      classifyAttempt(
        input({
          attemptOutcome: failed("idle-timeout"),
          parse: null,
          boundary: notEvaluated,
          pendingFiles: ["docs/threads/t/p.md"],
        }),
      ),
    );
    expect(result.kind).toBe("pending-queues");
  });

  it("a missing/unrecognizable token pauses as malformed-outcome with prefixes and the candidate line", () => {
    const result = pauseOf(
      classifyAttempt(
        input({
          attemptOutcome: completed,
          parse: malformedParse,
          boundary: notEvaluated,
        }),
      ),
    );
    expect(result.kind).toBe("malformed-outcome");
    expect(result.message).toContain("Outcome: DONE");
    expect(result.message).toContain("Outcome: BLOCKED");
    expect(result.message).toContain("Outcome: REFUSED");
    expect(result.message).toContain("I think I finished");
  });

  it("a Sandcastle completion signal without a valid final-line token classifies as malformed, never advance (AC-10.2)", () => {
    const result = pauseOf(
      classifyAttempt(
        input({
          attemptOutcome: { kind: "completed", finalText: "Outcome: DONE\ntalk" },
          parse: { token: null, candidateLine: "talk" },
          boundary: notEvaluated,
        }),
      ),
    );
    expect(result.action).toBe("pause");
    expect(result.kind).toBe("malformed-outcome");
  });

  it("malformed with no candidate line still names the expected prefixes", () => {
    const result = pauseOf(
      classifyAttempt(
        input({
          attemptOutcome: { kind: "completed", finalText: "" },
          parse: { token: null, candidateLine: null },
          boundary: notEvaluated,
        }),
      ),
    );
    expect(result.kind).toBe("malformed-outcome");
    expect(result.message).toContain("Outcome: DONE");
    expect(result.message).toContain("No candidate final line");
  });
});
