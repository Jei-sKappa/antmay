import { describe, expect, it } from "vitest";

import type { AttemptOutcome } from "../harness/types.js";
import type {
  BoundaryDisposition,
  Classification,
  ClassificationInput,
} from "./classify.js";
import { classifyAttempt } from "./classify.js";
import type {
  DoneTerminalResult,
  WaitingKind,
  WaitingReason,
} from "../state/checkpoint/types.js";
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
const advisoryHeadBoundary: BoundaryDisposition = {
  evaluated: true,
  ok: false,
  kind: "unexpected-head-movement",
  message: "The attempt moved HEAD from aaa111 to bbb222.",
};
const commitErrorBoundary: BoundaryDisposition = {
  evaluated: true,
  ok: false,
  kind: "commit-error",
  message: "The executor commit failed while finalizing the boundary.",
};

/** The advancing verdict a parse carries, as the classifier is handed it. */
function doneResultOf(parse: OutcomeParse | null): DoneTerminalResult | null {
  if (parse === null || parse.token !== "DONE") return null;
  return { token: "DONE", candidateLine: parse.candidateLine, detail: parse.detail };
}

function input(overrides: Partial<ClassificationInput>): ClassificationInput {
  // The verdict comes from the same parse the case declares, so a case states
  // its parse alone and the two can never disagree.
  const parse = overrides.parse === undefined ? doneParse : overrides.parse;
  return {
    attemptOutcome: completed,
    parse,
    done: doneResultOf(parse),
    pendingFiles: [],
    queueScanError: null,
    boundary: okBoundary,
    ...overrides,
  };
}

/**
 * Assert the result is a pause (or pause-done) and expose both views of it: the
 * governing reason that decides the resume path, and the full list of kinds the
 * pause reported.
 */
function pauseOf(result: Classification): {
  action: "pause" | "pause-done";
  kind: WaitingKind;
  message: string;
  detail: string | undefined;
  kinds: WaitingKind[];
  reasons: WaitingReason[];
} {
  if (result.action === "advance") {
    throw new Error(`expected a pause, got advance`);
  }
  const [governing] = result.reasons;
  return {
    action: result.action,
    kind: governing.kind,
    message: governing.message,
    detail: governing.detail,
    kinds: result.reasons.map((reason) => reason.kind),
    reasons: result.reasons,
  };
}

/** The reason of a given kind the pause reported, for asserting on a co-reason. */
function reasonOf(result: Classification, kind: WaitingKind): WaitingReason {
  const found = pauseOf(result).reasons.find((reason) => reason.kind === kind);
  if (found === undefined) {
    throw new Error(`expected a ${kind} reason`);
  }
  return found;
}

describe("classifyAttempt", () => {
  it("DONE + ok boundary + empty queues advances, carrying the verdict", () => {
    expect(classifyAttempt(input({}))).toEqual({
      action: "advance",
      done: { token: "DONE", candidateLine: "Outcome: DONE", detail: "" },
    });
  });

  it("DONE + ok boundary + pending files pauses as pause-done", () => {
    const pending = ["docs/threads/t/.pending-reviews/b/report.md"];
    const classification = classifyAttempt(input({ pendingFiles: pending }));
    const result = pauseOf(classification);
    expect(result.action).toBe("pause-done");
    expect(result.kind).toBe("pending-queues");
    expect(result.message).toBe("1 pending bundle file awaits human resolution.");
    expect(reasonOf(classification, "pending-queues").pendingFiles).toEqual(
      pending,
    );
  });

  it("pause-done lists sorted pending paths", () => {
    const pending = ["docs/threads/t/z.md", "docs/threads/t/a.md"];
    const classification = classifyAttempt(input({ pendingFiles: pending }));
    const result = pauseOf(classification);
    expect(result.action).toBe("pause-done");
    expect(result.message).toBe(
      "2 pending bundle files await human resolution.",
    );
    expect(reasonOf(classification, "pending-queues").pendingFiles).toEqual([
      "docs/threads/t/a.md",
      "docs/threads/t/z.md",
    ]);
  });

  it("DONE + git-policy-violation keeps the boundary kind (no pending files)", () => {
    const result = classifyAttempt(input({ boundary: violationBoundary }));
    expect(result).toEqual({
      action: "pause",
      reasons: [
        { kind: "git-policy-violation", message: violationBoundary.message },
      ],
    });
  });

  it("DONE + advisory HEAD movement keeps the advisory reason distinct", () => {
    const result = classifyAttempt(input({ boundary: advisoryHeadBoundary }));
    expect(result).toEqual({
      action: "pause",
      reasons: [
        {
          kind: "unexpected-head-movement",
          message: advisoryHeadBoundary.message,
        },
      ],
    });
  });

  it("DONE + violation reports the pending files as their own reason", () => {
    const pending = ["docs/threads/t/.pending-decisions/d/q.md"];
    const result = classifyAttempt(
      input({ boundary: violationBoundary, pendingFiles: pending }),
    );
    // The boundary still governs, and the pending bundle is not swallowed by it.
    expect(pauseOf(result).kind).toBe("git-policy-violation");
    expect(pauseOf(result).message).toBe(violationBoundary.message);
    expect(pauseOf(result).message).not.toContain(pending[0]);
    expect(reasonOf(result, "pending-queues").pendingFiles).toEqual(pending);
  });

  it("DONE + violation + failed scan retains the boundary kind and reports both queue problems (AC-11.6)", () => {
    const result = classifyAttempt(
      input({
        boundary: violationBoundary,
        pendingFiles: ["docs/threads/t/p.md"],
        queueScanError: "EACCES reading .pending-reviews",
      }),
    );
    expect(pauseOf(result).kind).toBe("git-policy-violation");
    expect(pauseOf(result).kinds).toEqual([
      "git-policy-violation",
      "gate-error",
      "pending-queues",
    ]);
    expect(reasonOf(result, "gate-error").message).toContain(
      "EACCES reading .pending-reviews",
    );
    expect(reasonOf(result, "pending-queues")).toMatchObject({
      message: "1 pending bundle file awaits human resolution.",
      pendingFiles: ["docs/threads/t/p.md"],
    });
  });

  it("DONE + commit-error + failed scan retains commit-error, never gate-error", () => {
    const result = classifyAttempt(
      input({
        boundary: commitErrorBoundary,
        queueScanError: "EIO reading .pending-decisions",
      }),
    );
    expect(pauseOf(result).kind).toBe("commit-error");
    expect(pauseOf(result).message).toBe(commitErrorBoundary.message);
    expect(reasonOf(result, "gate-error").message).toContain(
      "EIO reading .pending-decisions",
    );
  });

  it("a failed queue scan without a failed DONE boundary is governed by gate-error", () => {
    const result = classifyAttempt(
      input({
        attemptOutcome: failed("provider-error"),
        parse: blockedParse,
        queueScanError: "EACCES reading .pending-reviews",
      }),
    );
    expect(pauseOf(result).kind).toBe("gate-error");
    expect(pauseOf(result).message).toContain("EACCES reading .pending-reviews");
    // The harness failure that also held is still reported.
    expect(reasonOf(result, "harness-error").message).toContain("provider-error");
  });

  it("gate-error governs a non-DONE pending queue when the scan itself failed, without hiding the rest", () => {
    const result = classifyAttempt(
      input({
        attemptOutcome: completed,
        parse: blockedParse,
        pendingFiles: ["docs/threads/t/p.md"],
        queueScanError: "unreadable",
      }),
    );
    expect(pauseOf(result).kind).toBe("gate-error");
    expect(pauseOf(result).kinds).toEqual([
      "gate-error",
      "pending-queues",
      "outcome-blocked",
    ]);
  });

  it("BLOCKED with no pending files pauses as outcome-blocked", () => {
    const result = pauseOf(
      classifyAttempt(input({ parse: blockedParse, boundary: okBoundary })),
    );
    expect(result.kind).toBe("outcome-blocked");
    // The sentence quotes the outcome line the attempt ended on, so it is pinned
    // byte for byte: it reaches the terminal, and the tokens and the prefix it
    // spells out are the protocol the skill suite emits against.
    expect(result.message).toBe(
      "The stage reported Outcome: BLOCKED and paused for human attention.",
    );
    // The agent's own reason travels separately from the classification
    // sentence, stripped of the dash that separated it from the token.
    expect(result.detail).toBe("needs input");
    expect(result.message).not.toContain("—");
  });

  it("BLOCKED with pending files is governed by pending-queues but reports both", () => {
    const result = classifyAttempt(
      input({ parse: blockedParse, pendingFiles: ["docs/threads/t/p.md"] }),
    );
    expect(pauseOf(result).action).toBe("pause");
    expect(pauseOf(result).kind).toBe("pending-queues");
    expect(pauseOf(result).kinds).toEqual(["pending-queues", "outcome-blocked"]);
    expect(reasonOf(result, "outcome-blocked").detail).toBe("needs input");
  });

  it("REFUSED with no pending files pauses as outcome-refused", () => {
    const result = pauseOf(classifyAttempt(input({ parse: refusedParse })));
    expect(result.kind).toBe("outcome-refused");
    expect(result.message).toBe(
      "The stage reported Outcome: REFUSED and paused for human attention.",
    );
  });

  it("REFUSED with pending files is governed by pending-queues but reports both", () => {
    const result = classifyAttempt(
      input({ parse: refusedParse, pendingFiles: ["docs/threads/t/p.md"] }),
    );
    expect(pauseOf(result).kind).toBe("pending-queues");
    expect(pauseOf(result).kinds).toEqual(["pending-queues", "outcome-refused"]);
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

  it("provider error with pending files is governed by pending-queues but reports both", () => {
    const result = classifyAttempt(
      input({
        attemptOutcome: failed("provider-error"),
        parse: null,
        boundary: notEvaluated,
        pendingFiles: ["docs/threads/t/p.md"],
      }),
    );
    expect(pauseOf(result).kind).toBe("pending-queues");
    expect(pauseOf(result).kinds).toEqual(["pending-queues", "harness-error"]);
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

  it("idle timeout with pending files is governed by pending-queues but reports both", () => {
    const result = classifyAttempt(
      input({
        attemptOutcome: failed("idle-timeout"),
        parse: null,
        boundary: notEvaluated,
        pendingFiles: ["docs/threads/t/p.md"],
      }),
    );
    expect(pauseOf(result).kind).toBe("pending-queues");
    expect(pauseOf(result).kinds).toEqual(["pending-queues", "idle-timeout"]);
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
    // The listed openings are the whole point of the diagnostic — an agent reads
    // them and writes its next final line from them — so the sentence is pinned
    // whole, including the `or` before the last of the three.
    expect(result.message).toBe(
      "The attempt produced no recognizable terminal outcome. The trimmed final " +
        "non-empty line must begin with one of: Outcome: DONE, Outcome: BLOCKED, " +
        'or Outcome: REFUSED. The final non-empty line was: "I think I finished".',
    );
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
    expect(result.message).toBe(
      "The attempt produced no recognizable terminal outcome. The trimmed final " +
        "non-empty line must begin with one of: Outcome: DONE, Outcome: BLOCKED, " +
        "or Outcome: REFUSED. No candidate final line was present.",
    );
  });
});
