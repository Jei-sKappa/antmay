import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type {
  AttemptReference,
  WaitingInfo,
  WaitingReasons,
  WaitingRecovery,
} from "../state/checkpoint.js";
import type { ArtifactMismatch } from "../thread/artifacts.js";

import { decideRecovery, holdsPreservedDone } from "./recovery-policy.js";
import type {
  ContractEvidence,
  GitReadiness,
  QueueEvidence,
  RecoveryDirective,
} from "./recovery-policy.js";

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
const RECHECK: WaitingRecovery = {
  kind: "recheck-stage-contract",
  attempt: REFERENCE,
  pausedAtHead: "a".repeat(40),
};
const GIT_RETRY: WaitingRecovery = {
  kind: "retry-git-finalization",
  attempt: REFERENCE,
  pausedAtHead: "b".repeat(40),
};

/** Every recovery a paused checkpoint can record, so a table can be exhaustive. */
const EVERY_RECOVERY: WaitingRecovery[] = [
  RETRY_STAGE,
  FINALIZED_ADVANCE,
  FINALIZED_RERUN,
  RECHECK,
  GIT_RETRY,
];

const CLEAR: QueueEvidence = { kind: "clear" };
const PENDING: QueueEvidence = {
  kind: "pending",
  pendingFiles: ["docs/threads/t/.pending-decisions/01-choice.md"],
};
const SCAN_FAILED: QueueEvidence = {
  kind: "scan-failed",
  message: "Cannot scan /repo/docs/threads/t/.pending-reviews: EACCES",
};

const UNMET: ArtifactMismatch[] = [
  { dimension: "implementationReport", expected: true, observed: false },
];

const FINALIZATION_FAILED: Extract<
  GitReadiness,
  { kind: "finalization-failed" }
> = {
  kind: "finalization-failed",
  failure: "git-policy-violation",
  message: "changes outside the stage's allowed paths",
  observedHead: "c".repeat(40),
};

/**
 * The evidence a contract recheck needs, so the queue table can exercise that
 * recovery without asserting anything about the promise.
 */
const SATISFIED: ContractEvidence = { kind: "satisfied" };

describe("decideRecovery — queues gate every recovery (AC-3.1)", () => {
  for (const recovery of EVERY_RECOVERY) {
    const label = `${recovery.kind}${
      recovery.kind === "resume-finalized-done" ? ` (${recovery.queueResolution})` : ""
    }`;

    it(`keeps a ${label} recovery paused when the queue scan fails`, () => {
      const directive = decideRecovery(recovery, {
        queues: SCAN_FAILED,
        contract: SATISFIED,
      });
      expect(directive).toEqual({
        kind: "remain-paused",
        recovery,
        facts: { kind: "queue-scan-failed", message: SCAN_FAILED.message },
      });
    });

    it(`keeps a ${label} recovery paused while bundles are still pending`, () => {
      const directive = decideRecovery(recovery, {
        queues: PENDING,
        contract: SATISFIED,
      });
      expect(directive).toEqual({
        kind: "remain-paused",
        recovery,
        facts: {
          kind: "pending-bundles",
          pendingFiles: ["docs/threads/t/.pending-decisions/01-choice.md"],
        },
      });
    });

    it(`lets a ${label} recovery act once the queues are clear`, () => {
      const directive = decideRecovery(recovery, {
        queues: CLEAR,
        contract: SATISFIED,
      });
      expect(directive.kind).not.toBe("remain-paused");
    });
  }

  it("needs no promise, worktree, or Git evidence to hold a pause", () => {
    expect(decideRecovery(RECHECK, { queues: PENDING })).toEqual({
      kind: "remain-paused",
      recovery: RECHECK,
      facts: { kind: "pending-bundles", pendingFiles: PENDING.pendingFiles },
    });
  });
});

describe("decideRecovery — contract recheck table (AC-3.2)", () => {
  it("requests first-time finalization of the referenced attempt when the promise is satisfied", () => {
    expect(
      decideRecovery(RECHECK, { queues: CLEAR, contract: { kind: "satisfied" } }),
    ).toEqual({
      kind: "finalize-boundary",
      recovery: RECHECK,
      context: "after-contract-repair",
    });
  });

  it("retries the stage when the promise is unmet over a clean worktree", () => {
    expect(
      decideRecovery(RECHECK, {
        queues: CLEAR,
        contract: { kind: "unmet", unmet: UNMET, worktree: "clean" },
      }),
    ).toEqual({ kind: "retry-stage" });
  });

  it("remains paused with the unmet dimensions when the worktree is dirty", () => {
    expect(
      decideRecovery(RECHECK, {
        queues: CLEAR,
        contract: { kind: "unmet", unmet: UNMET, worktree: "dirty" },
      }),
    ).toEqual({
      kind: "remain-paused",
      recovery: RECHECK,
      facts: { kind: "promise-unmet", unmet: UNMET },
    });
  });

  it("remains paused, keeping the saved DONE finalizable, when the thread cannot be inspected", () => {
    expect(
      decideRecovery(RECHECK, { queues: CLEAR, contract: { kind: "uninspectable" } }),
    ).toEqual({
      kind: "remain-paused",
      recovery: RECHECK,
      facts: { kind: "promise-uninspectable" },
    });
  });

  it("refuses to decide a contract recheck without fresh promise evidence", () => {
    expect(() => decideRecovery(RECHECK, { queues: CLEAR })).toThrow(
      /requires fresh promised-artifact evidence/,
    );
  });
});

describe("decideRecovery — finalized DONE resolutions (AC-3.3)", () => {
  it("advances exactly once for a declared advance resolution", () => {
    expect(decideRecovery(FINALIZED_ADVANCE, { queues: CLEAR })).toEqual({
      kind: "advance-stage",
    });
  });

  it("starts a new attempt at the same stage for a declared rerun resolution", () => {
    expect(decideRecovery(FINALIZED_RERUN, { queues: CLEAR })).toEqual({
      kind: "retry-stage",
    });
  });

  it("neither advances nor reruns before the queues clear", () => {
    for (const recovery of [FINALIZED_ADVANCE, FINALIZED_RERUN]) {
      expect(decideRecovery(recovery, { queues: PENDING }).kind).toBe("remain-paused");
    }
  });

  it("never touches the finalized attempt again", () => {
    for (const recovery of [FINALIZED_ADVANCE, FINALIZED_RERUN]) {
      expect(decideRecovery(recovery, { queues: CLEAR })).not.toHaveProperty("attempt");
    }
  });
});

describe("decideRecovery — Git finalization retry (AC-3.4)", () => {
  it("requests a boundary retry for the exact referenced attempt", () => {
    expect(decideRecovery(GIT_RETRY, { queues: CLEAR })).toEqual({
      kind: "finalize-boundary",
      recovery: GIT_RETRY,
      context: "boundary-retry",
    });
  });

  it("requests the attempt the recovery names, not the stage's latest", () => {
    const directive = decideRecovery(
      { kind: "retry-git-finalization", attempt: OTHER_REFERENCE, pausedAtHead: "d".repeat(40) },
      { queues: CLEAR },
    );
    expect(directive).toMatchObject({ recovery: { attempt: OTHER_REFERENCE } });
  });

  it("keeps the same recovery, re-aimed at the fresh tip, when the boundary still fails", () => {
    expect(
      decideRecovery(GIT_RETRY, { queues: CLEAR, git: FINALIZATION_FAILED }),
    ).toEqual({
      kind: "remain-paused",
      recovery: {
        kind: "retry-git-finalization",
        attempt: REFERENCE,
        pausedAtHead: FINALIZATION_FAILED.observedHead,
      },
      facts: {
        kind: "git-finalization-failed",
        failure: "git-policy-violation",
        message: FINALIZATION_FAILED.message,
      },
    });
  });

  it("leaves a repaired contract's failed boundary retryable without reconsulting the promise", () => {
    expect(
      decideRecovery(RECHECK, {
        queues: CLEAR,
        git: { ...FINALIZATION_FAILED, failure: "commit-error", message: "the pre-commit hook rejected the commit" },
      }),
    ).toEqual({
      kind: "remain-paused",
      recovery: {
        kind: "retry-git-finalization",
        attempt: REFERENCE,
        pausedAtHead: FINALIZATION_FAILED.observedHead,
      },
      facts: {
        kind: "git-finalization-failed",
        failure: "commit-error",
        message: "the pre-commit hook rejected the commit",
      },
    });
  });
});

describe("decideRecovery — retry-stage recovery", () => {
  it("launches a fresh attempt once the queues are clear", () => {
    expect(decideRecovery(RETRY_STAGE, { queues: CLEAR })).toEqual({
      kind: "retry-stage",
    });
  });
});

describe("decideRecovery — diagnostics cannot reach a directive (AC-2.4)", () => {
  // Three pauses of the same run: one that observed two things, one that
  // observed the same two in the other precedence order, and one that observed a
  // third as well. Their recovery is identical, which is the whole of what the
  // policy reads about a pause.
  const boundaryFirst: WaitingReasons = [
    { kind: "git-policy-violation", message: "changes outside the allowed paths." },
    { kind: "pending-queues", message: "One bundle awaits attention." },
  ];
  const pauses: WaitingInfo[] = [
    { reasons: boundaryFirst, recovery: GIT_RETRY },
    { reasons: [boundaryFirst[1], boundaryFirst[0]], recovery: GIT_RETRY },
    {
      reasons: [
        boundaryFirst[1],
        { kind: "gate-error", message: "The pending-queue scan failed." },
        boundaryFirst[0],
      ],
      recovery: GIT_RETRY,
    },
  ];

  for (const queues of [CLEAR, PENDING, SCAN_FAILED]) {
    it(`decides identically for every reason order under ${queues.kind} queues`, () => {
      const [first, ...others] = pauses.map((pause) =>
        decideRecovery(pause.recovery, { queues }),
      );
      for (const other of others) {
        expect(other).toEqual(first);
      }
    });
  }
});

describe("holdsPreservedDone — which pauses hold a saved DONE (AC-3.4)", () => {
  it("names exactly the two recoveries a finalization can be requested for", () => {
    expect(EVERY_RECOVERY.filter(holdsPreservedDone).map((r) => r.kind)).toEqual([
      "recheck-stage-contract",
      "retry-git-finalization",
    ]);
  });

  it("requests a finalization carrying a recovery a failure can be re-decided from", () => {
    for (const recovery of [RECHECK, GIT_RETRY]) {
      const requested = decideRecovery(recovery, {
        queues: CLEAR,
        contract: SATISFIED,
      });
      if (requested.kind !== "finalize-boundary") {
        throw new Error(`expected ${recovery.kind} to request a finalization`);
      }
      // The re-consult is what makes a repeated failure keep the same attempt
      // finalizable, so the requested recovery has to be one the policy accepts
      // fresh Git evidence for.
      expect(holdsPreservedDone(requested.recovery)).toBe(true);
      expect(
        decideRecovery(requested.recovery, {
          queues: CLEAR,
          git: FINALIZATION_FAILED,
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
    expect(statements).toHaveLength(2);
    // Type-only, so the module has no runtime dependency on either.
    for (const statement of statements) {
      expect(statement.startsWith("import type ")).toBe(true);
    }
    expect(statements.map((s) => /from "([^"]+)"/.exec(s)?.[1])).toEqual([
      "../state/checkpoint.js",
      "../thread/artifacts.js",
    ]);
    expect(source).not.toMatch(/node:|Date\(|process\./);
  });

  it("returns domain directives rather than checkpoint fragments", () => {
    const directives: RecoveryDirective[] = [
      decideRecovery(RETRY_STAGE, { queues: CLEAR }),
      decideRecovery(FINALIZED_ADVANCE, { queues: CLEAR }),
      decideRecovery(GIT_RETRY, { queues: CLEAR }),
      decideRecovery(RECHECK, { queues: CLEAR, contract: SATISFIED }),
      decideRecovery(RECHECK, { queues: SCAN_FAILED }),
      decideRecovery(GIT_RETRY, { queues: CLEAR, git: FINALIZATION_FAILED }),
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
