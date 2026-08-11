import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type {
  AttemptReference,
  WaitingInfo,
  WaitingReason,
  WaitingRecovery,
} from "../state/checkpoint/types.js";
import type { ArtifactMismatch } from "../thread/artifacts.js";

import type {
  FailedFinalization,
  HeldQueues,
  PreservedDoneEvidence,
  RecoveryCase,
} from "./recovery.js";
import { classifyRecovery, holdsPreservedDone } from "./recovery.js";
import { decideRecovery } from "./recovery-policy.js";
import type { RecoveryDirective } from "./recovery-policy.js";

const REFERENCE: AttemptReference = { stageIndex: 2, attempt: 3 };
const OTHER_REFERENCE: AttemptReference = { stageIndex: 2, attempt: 1 };

const RETRY_STAGE: WaitingRecovery = { kind: "retry-stage" };
const FINALIZED_ADVANCE: WaitingRecovery = {
  kind: "resume-finalized-done",
  attempt: REFERENCE,
  queueResolution: "advance",
};
const FINALIZED_RERUN: WaitingRecovery = {
  kind: "resume-finalized-done",
  attempt: REFERENCE,
  queueResolution: "rerun",
};
const RECHECK = {
  kind: "recheck-stage-contract",
  attempt: REFERENCE,
  pausedAtHead: "a".repeat(40),
} as const;
const GIT_RETRY = {
  kind: "retry-git-finalization",
  attempt: REFERENCE,
  pausedAtHead: "b".repeat(40),
} as const;

/** Every recovery a paused checkpoint can record, so a table can be exhaustive. */
const EVERY_RECOVERY: WaitingRecovery[] = [
  RETRY_STAGE,
  FINALIZED_ADVANCE,
  FINALIZED_RERUN,
  RECHECK,
  GIT_RETRY,
];

const PENDING: HeldQueues = {
  kind: "pending",
  pendingFiles: ["docs/threads/t/.pending-decisions/01-choice.md"],
};
const SCAN_FAILED: HeldQueues = {
  kind: "scan-failed",
  message: "Cannot scan /repo/docs/threads/t/.pending-reviews: EACCES",
};

const UNMET: ArtifactMismatch[] = [
  { dimension: "implementationReport", expected: true, observed: false },
];

const FINALIZATION_FAILED: FailedFinalization = {
  kind: "finalization-failed",
  failure: { kind: "git-policy-violation", treatment: "blocking" },
  message: "changes outside the stage's allowed paths",
  observedHead: "c".repeat(40),
};

const SATISFIED: PreservedDoneEvidence = { kind: "promise-satisfied" };

/** The case a held queue makes of any recovery, whatever that recovery is. */
function held(recovery: WaitingRecovery, queues: HeldQueues): RecoveryCase {
  return { decidedFrom: "held-queues", recovery, queues };
}

/**
 * The case a clear queue makes of one recovery, with the evidence its kind
 * declares. Built through the classification rather than by naming a variant, so
 * a recovery can only be paired with the evidence it is actually decided from.
 */
function cleared(
  recovery: WaitingRecovery,
  evidence: PreservedDoneEvidence,
): RecoveryCase {
  const classified = classifyRecovery(recovery);
  return classified.decidedFrom === "preserved-done"
    ? { ...classified, evidence }
    : classified;
}

describe("decideRecovery — queues gate every recovery (AC-3.1)", () => {
  for (const recovery of EVERY_RECOVERY) {
    const label = `${recovery.kind}${
      recovery.kind === "resume-finalized-done" ? ` (${recovery.queueResolution})` : ""
    }`;

    it(`keeps a ${label} recovery paused when the queue scan fails`, () => {
      expect(decideRecovery(held(recovery, SCAN_FAILED))).toEqual({
        kind: "remain-paused",
        recovery,
        facts: { kind: "queue-scan-failed", message: SCAN_FAILED.message },
      });
    });

    it(`keeps a ${label} recovery paused while bundles are still pending`, () => {
      expect(decideRecovery(held(recovery, PENDING))).toEqual({
        kind: "remain-paused",
        recovery,
        facts: {
          kind: "pending-bundles",
          pendingFiles: ["docs/threads/t/.pending-decisions/01-choice.md"],
        },
      });
    });

    it(`lets a ${label} recovery act once the queues are clear`, () => {
      expect(decideRecovery(cleared(recovery, SATISFIED)).kind).not.toBe(
        "remain-paused",
      );
    });
  }

  it("carries no promise, worktree, or Git evidence at all while a queue is held", () => {
    // The held case is the whole of what a held queue is decided from, so
    // evidence gathered under one has nowhere to be put and nothing to override.
    const paused = held(RECHECK, PENDING);
    expect(Object.keys(paused).sort()).toEqual(["decidedFrom", "queues", "recovery"]);
    expect(decideRecovery(paused)).toEqual({
      kind: "remain-paused",
      recovery: RECHECK,
      facts: { kind: "pending-bundles", pendingFiles: PENDING.pendingFiles },
    });
  });
});

describe("decideRecovery — contract recheck table (AC-3.2)", () => {
  it("requests first-time finalization of the referenced attempt when the promise is satisfied", () => {
    expect(decideRecovery(cleared(RECHECK, { kind: "promise-satisfied" }))).toEqual({
      kind: "finalize-boundary",
      recovery: RECHECK,
      context: "after-contract-repair",
    });
  });

  it("retries the stage when the promise is unmet over a clean worktree", () => {
    expect(
      decideRecovery(
        cleared(RECHECK, { kind: "promise-unmet", unmet: UNMET, worktree: "clean" }),
      ),
    ).toEqual({ kind: "retry-stage" });
  });

  it("remains paused with the unmet dimensions when the worktree is dirty", () => {
    expect(
      decideRecovery(
        cleared(RECHECK, { kind: "promise-unmet", unmet: UNMET, worktree: "dirty" }),
      ),
    ).toEqual({
      kind: "remain-paused",
      recovery: RECHECK,
      facts: { kind: "promise-unmet", unmet: UNMET, worktree: "dirty" },
    });
  });

  it("remains paused, keeping the saved DONE finalizable, when the thread cannot be inspected", () => {
    expect(
      decideRecovery(
        cleared(RECHECK, {
          kind: "promise-uninspectable",
          message: "cannot read the thread",
        }),
      ),
    ).toEqual({
      kind: "remain-paused",
      recovery: RECHECK,
      facts: {
        kind: "promise-uninspectable",
        message: "cannot read the thread",
      },
    });
  });

  it("cannot be asked to decide a contract recheck without fresh promise evidence", () => {
    // The property is the type's, not a runtime check's: a recovery that declared
    // promise evidence arrives with it or does not arrive at all, so there is no
    // input the decision has to refuse. The assertion is the compiler's — remove
    // the evidence and `npm run typecheck` fails here rather than a resume
    // throwing in production.
    // @ts-expect-error a preserved-done case is unconstructable without its evidence
    const missing: RecoveryCase = { decidedFrom: "preserved-done", recovery: RECHECK };
    expect(missing.decidedFrom).toBe("preserved-done");
  });
});

describe("decideRecovery — finalized DONE resolutions (AC-3.3)", () => {
  it("advances exactly once for a declared advance resolution", () => {
    expect(decideRecovery(cleared(FINALIZED_ADVANCE, SATISFIED))).toEqual({
      kind: "advance-stage",
    });
  });

  it("starts a new attempt at the same stage for a declared rerun resolution", () => {
    expect(decideRecovery(cleared(FINALIZED_RERUN, SATISFIED))).toEqual({
      kind: "retry-stage",
    });
  });

  it("neither advances nor reruns before the queues clear", () => {
    for (const recovery of [FINALIZED_ADVANCE, FINALIZED_RERUN]) {
      expect(decideRecovery(held(recovery, PENDING)).kind).toBe("remain-paused");
    }
  });

  it("never touches the finalized attempt again", () => {
    for (const recovery of [FINALIZED_ADVANCE, FINALIZED_RERUN]) {
      expect(decideRecovery(cleared(recovery, SATISFIED))).not.toHaveProperty(
        "attempt",
      );
    }
  });
});

describe("decideRecovery — Git finalization retry (AC-3.4)", () => {
  it("requests a boundary retry for the exact referenced attempt", () => {
    expect(decideRecovery(cleared(GIT_RETRY, SATISFIED))).toEqual({
      kind: "finalize-boundary",
      recovery: GIT_RETRY,
      context: "boundary-retry",
    });
  });

  it("requests the attempt the recovery names, not the stage's latest", () => {
    const directive = decideRecovery(
      cleared(
        {
          kind: "retry-git-finalization",
          attempt: OTHER_REFERENCE,
          pausedAtHead: "d".repeat(40),
        },
        SATISFIED,
      ),
    );
    expect(directive).toMatchObject({ recovery: { attempt: OTHER_REFERENCE } });
  });

  it("redirects an unmet promise through contract repair", () => {
    expect(
      decideRecovery(
        cleared(GIT_RETRY, { kind: "promise-unmet", unmet: UNMET, worktree: "clean" }),
      ),
    ).toEqual({
      kind: "remain-paused",
      recovery: {
        kind: "recheck-stage-contract",
        attempt: REFERENCE,
        pausedAtHead: GIT_RETRY.pausedAtHead,
      },
      facts: { kind: "promise-unmet", unmet: UNMET, worktree: "clean" },
    });
  });

  it("redirects an uninspectable promise through contract repair", () => {
    expect(
      decideRecovery(
        cleared(GIT_RETRY, {
          kind: "promise-uninspectable",
          message: "cannot read the thread",
        }),
      ),
    ).toEqual({
      kind: "remain-paused",
      recovery: {
        kind: "recheck-stage-contract",
        attempt: REFERENCE,
        pausedAtHead: GIT_RETRY.pausedAtHead,
      },
      facts: {
        kind: "promise-uninspectable",
        message: "cannot read the thread",
      },
    });
  });

  it("keeps the same recovery, re-aimed at the fresh tip, when the boundary still fails", () => {
    expect(decideRecovery(cleared(GIT_RETRY, FINALIZATION_FAILED))).toEqual({
      kind: "remain-paused",
      recovery: {
        kind: "retry-git-finalization",
        attempt: REFERENCE,
        pausedAtHead: FINALIZATION_FAILED.observedHead,
      },
      facts: {
        kind: "git-finalization-failed",
        failure: FINALIZATION_FAILED.failure,
        message: FINALIZATION_FAILED.message,
      },
    });
  });

  it("leaves a repaired contract's failed boundary retryable without reconsulting the promise", () => {
    expect(
      decideRecovery(
        cleared(RECHECK, {
          ...FINALIZATION_FAILED,
          failure: { kind: "commit-error" },
          message: "the pre-commit hook rejected the commit",
        }),
      ),
    ).toEqual({
      kind: "remain-paused",
      recovery: {
        kind: "retry-git-finalization",
        attempt: REFERENCE,
        pausedAtHead: FINALIZATION_FAILED.observedHead,
      },
      facts: {
        kind: "git-finalization-failed",
        failure: { kind: "commit-error" },
        message: "the pre-commit hook rejected the commit",
      },
    });
  });
});

describe("decideRecovery — retry-stage recovery", () => {
  it("launches a fresh attempt once the queues are clear", () => {
    expect(decideRecovery(cleared(RETRY_STAGE, SATISFIED))).toEqual({
      kind: "retry-stage",
    });
  });
});

describe("decideRecovery — diagnostics cannot reach a directive (AC-2.4)", () => {
  // Three pauses of the same run: one that observed two things, one that
  // observed the same two in the other precedence order, and one that observed a
  // third as well. Their recovery is identical, which is the whole of what the
  // policy reads about a pause.
  const boundary: WaitingReason = {
    kind: "git-policy-violation",
    message: "changes outside the allowed paths.",
  };
  const queue: WaitingReason = {
    kind: "pending-queues",
    message: "One bundle awaits attention.",
  };
  const pauses: WaitingInfo[] = [
    { reasons: [boundary, queue], recovery: GIT_RETRY },
    { reasons: [queue, boundary], recovery: GIT_RETRY },
    {
      reasons: [
        queue,
        { kind: "gate-error", message: "The pending-queue scan failed." },
        boundary,
      ],
      recovery: GIT_RETRY,
    },
  ];

  const cases: [string, (recovery: WaitingRecovery) => RecoveryCase][] = [
    ["clear", (recovery) => cleared(recovery, SATISFIED)],
    ["pending", (recovery) => held(recovery, PENDING)],
    ["scan-failed", (recovery) => held(recovery, SCAN_FAILED)],
  ];
  for (const [label, asCase] of cases) {
    it(`decides identically for every reason order under ${label} queues`, () => {
      const [first, ...others] = pauses.map((pause) =>
        decideRecovery(asCase(pause.recovery)),
      );
      for (const other of others) {
        expect(other).toEqual(first);
      }
    });
  }
});

describe("decideRecovery — requesting a finalization (AC-3.4)", () => {
  it("carries a recovery a failure can be re-decided from", () => {
    for (const recovery of [RECHECK, GIT_RETRY]) {
      const requested = decideRecovery(cleared(recovery, SATISFIED));
      if (requested.kind !== "finalize-boundary") {
        throw new Error(`expected ${recovery.kind} to request a finalization`);
      }
      // The re-consult is what makes a repeated failure keep the same attempt
      // finalizable, so the requested recovery has to be one the policy accepts
      // fresh Git evidence for.
      expect(holdsPreservedDone(requested.recovery)).toBe(true);
      expect(
        decideRecovery({
          decidedFrom: "preserved-done",
          recovery: requested.recovery,
          evidence: FINALIZATION_FAILED,
        }),
      ).toMatchObject({
        kind: "remain-paused",
        recovery: { kind: "retry-git-finalization", attempt: REFERENCE },
      });
    }
  });
});

describe("recovery-policy module — purity (AC-3.5)", () => {
  const source = readFileSync(new URL("./recovery-policy.ts", import.meta.url), "utf8");

  it("declares no import of the filesystem, Git, harness, display, or persistence", () => {
    // A static source assertion rather than a fixture: the property under test is
    // what the module may reach at all, which no runtime call can demonstrate.
    const statements = [...source.matchAll(/^import[\s\S]*?;$/gm)].map((m) => m[0]);
    expect(statements).toHaveLength(3);
    // Type-only, so the module has no runtime dependency on any of them.
    for (const statement of statements) {
      expect(statement.startsWith("import type ")).toBe(true);
    }
    expect(statements.map((s) => /from "([^"]+)"/.exec(s)?.[1])).toEqual([
      "../state/checkpoint/types.js",
      "../thread/artifacts.js",
      "./recovery.js",
    ]);
    expect(source).not.toMatch(/node:|Date\(|process\./);
  });

  it("returns domain directives rather than checkpoint fragments", () => {
    const directives: RecoveryDirective[] = [
      decideRecovery(cleared(RETRY_STAGE, SATISFIED)),
      decideRecovery(cleared(FINALIZED_ADVANCE, SATISFIED)),
      decideRecovery(cleared(GIT_RETRY, SATISFIED)),
      decideRecovery(cleared(RECHECK, SATISFIED)),
      decideRecovery(held(RECHECK, SCAN_FAILED)),
      decideRecovery(cleared(GIT_RETRY, FINALIZATION_FAILED)),
    ];
    for (const directive of directives) {
      expect(Object.keys(directive).sort()).not.toContain("condition");
      for (const checkpointField of [
        "schemaVersion",
        "condition",
        "stageIndex",
        "attempts",
        "waiting",
        "stages",
        "updatedAt",
      ]) {
        expect(directive).not.toHaveProperty(checkpointField);
      }
    }
  });
});
