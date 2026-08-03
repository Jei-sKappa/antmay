import { describe, expect, it } from "vitest";

import type {
  AttemptReference,
  WaitingInfo,
  WaitingKind,
  WaitingReason,
  WaitingReasons,
  WaitingRecovery,
} from "../state/checkpoint.js";
import type { ArtifactMismatch } from "../thread/artifacts.js";

import { Pause, isAdvisoryHeadMovement, waitingEquals } from "./pause.js";
import type { GitFinalizationFailure } from "./recovery-policy.js";

const ATTEMPT: AttemptReference = { stageIndex: 1, attempt: 2 };
const HEAD = "a".repeat(40);
const OTHER_HEAD = "b".repeat(40);
const PENDING = ["docs/threads/t/.pending-decisions/01-choice.md"];
const UNMET: ArtifactMismatch[] = [
  { dimension: "spec", expected: true, observed: false },
];
const QUEUE_REASON: WaitingReason = {
  kind: "pending-queues",
  message: "1 pending bundle file awaits human resolution.",
  pendingFiles: PENDING,
};
const CLASSIFIED: WaitingReasons = [
  { kind: "outcome-blocked", message: "The stage reported Outcome: BLOCKED." },
];

/**
 * The pause every refresh builder is handed: what a resume found persisted. Its
 * governing reason is the one a refresh replaces or keeps, and the stale
 * `gate-error` behind it is the one a refresh must not carry forward twice.
 */
const PERSISTED: WaitingInfo = {
  reasons: [
    { kind: "git-policy-violation", message: "The boundary was refused." },
    { kind: "gate-error", message: "An earlier scan failed." },
    QUEUE_REASON,
  ],
  recovery: { kind: "retry-git-finalization", attempt: ATTEMPT, pausedAtHead: HEAD },
  nextAction: "Dispose of the unvalidated changes.",
};

const kindsOf = (waiting: WaitingInfo): WaitingKind[] =>
  waiting.reasons.map((reason) => reason.kind);

describe("Pause — the catalog of pauses the executor can record", () => {
  /**
   * Every situation, with what a reader and a resume each get from it: the reason
   * the pause leads with, the recovery that alone decides the resume, and whether
   * the run carries a closing instruction. One table, so a pause added later is
   * added here too rather than discovered in a transcript.
   */
  const CATALOG: {
    builder: keyof typeof Pause;
    situation: string;
    waiting: WaitingInfo;
    governing: WaitingKind;
    recovery: WaitingRecovery["kind"];
    nextAction: boolean;
  }[] = [
    {
      builder: "queueUnreadable",
      situation: "the pre-attempt queue scan failed",
      waiting: Pause.queueUnreadable("ENOTDIR"),
      governing: "gate-error",
      recovery: "retry-stage",
      nextAction: false,
    },
    {
      builder: "queueBlocked",
      situation: "bundles await human resolution before the attempt",
      waiting: Pause.queueBlocked(PENDING),
      governing: "pending-queues",
      recovery: "retry-stage",
      nextAction: false,
    },
    {
      builder: "prerequisiteUninspectable",
      situation: "the stage's requirements could not be checked",
      waiting: Pause.prerequisiteUninspectable({
        stagePosition: "2/3",
        stageId: "plan-strict",
        message: "EACCES",
      }),
      governing: "stage-prerequisite-unmet",
      recovery: "retry-stage",
      nextAction: true,
    },
    {
      builder: "prerequisiteUnmet",
      situation: "the stage's requirements are unmet",
      waiting: Pause.prerequisiteUnmet({
        stagePosition: "2/3",
        stageId: "plan-strict",
        unmet: UNMET,
      }),
      governing: "stage-prerequisite-unmet",
      recovery: "retry-stage",
      nextAction: true,
    },
    {
      builder: "contractUninspectable",
      situation: "a DONE promise could not be verified",
      waiting: Pause.contractUninspectable({
        attempt: ATTEMPT,
        pausedAtHead: HEAD,
        pendingFiles: [],
        queueScanError: null,
        message: "EACCES",
      }),
      governing: "stage-contract-violation",
      recovery: "recheck-stage-contract",
      nextAction: true,
    },
    {
      builder: "contractViolated",
      situation: "a DONE left the promised artifact state behind",
      waiting: Pause.contractViolated({
        attempt: ATTEMPT,
        pausedAtHead: HEAD,
        pendingFiles: [],
        queueScanError: null,
        unmet: UNMET,
      }),
      governing: "stage-contract-violation",
      recovery: "recheck-stage-contract",
      nextAction: true,
    },
    {
      builder: "donePendingQueues",
      situation: "a finalized DONE is held by its queue",
      waiting: Pause.donePendingQueues({
        classified: [QUEUE_REASON],
        attempt: ATTEMPT,
        queueResolution: "advance",
      }),
      governing: "pending-queues",
      recovery: "resume-finalized-done",
      nextAction: false,
    },
    {
      builder: "attemptStopped",
      situation: "the attempt stopped on its own terms",
      waiting: Pause.attemptStopped({
        classified: CLASSIFIED,
        aborted: false,
        diagnostics: undefined,
        attempt: ATTEMPT,
        boundary: { refused: false },
      }),
      governing: "outcome-blocked",
      recovery: "retry-stage",
      nextAction: true,
    },
    {
      builder: "attemptStopped",
      situation: "the attempt's Git boundary was refused",
      waiting: Pause.attemptStopped({
        classified: [{ kind: "commit-error", message: "The commit failed." }],
        aborted: false,
        diagnostics: undefined,
        attempt: ATTEMPT,
        boundary: {
          refused: true,
          advisoryHeadMovement: false,
          observedHead: HEAD,
        },
      }),
      governing: "commit-error",
      recovery: "retry-git-finalization",
      nextAction: true,
    },
    {
      builder: "attemptInterrupted",
      situation: "a reserved attempt was finished by a signal",
      waiting: Pause.attemptInterrupted({
        diagnostics: { origin: "SIGINT" },
        pendingFiles: [],
      }),
      governing: "interrupted",
      recovery: "retry-stage",
      nextAction: true,
    },
    {
      builder: "refreshPendingBundles",
      situation: "a resume found the bundles still there",
      waiting: Pause.refreshPendingBundles({
        paused: PERSISTED,
        pendingFiles: PENDING,
      }),
      governing: "git-policy-violation",
      recovery: "retry-git-finalization",
      nextAction: true,
    },
    {
      builder: "refreshQueueUnreadableHoldingDone",
      situation: "a resume holding a saved DONE could not scan the queues",
      waiting: Pause.refreshQueueUnreadableHoldingDone({
        paused: PERSISTED,
        recovery: PERSISTED.recovery,
        scanMessage: "ENOTDIR",
      }),
      governing: "git-policy-violation",
      recovery: "retry-git-finalization",
      nextAction: true,
    },
    {
      builder: "refreshQueueUnreadable",
      situation: "a resume with nothing saved could not scan the queues",
      waiting: Pause.refreshQueueUnreadable({
        paused: PERSISTED,
        recovery: PERSISTED.recovery,
        scanMessage: "ENOTDIR",
      }),
      governing: "gate-error",
      recovery: "retry-git-finalization",
      nextAction: true,
    },
    {
      builder: "refreshPromiseUninspectable",
      situation: "a resume could not re-read the promise",
      waiting: Pause.refreshPromiseUninspectable({
        paused: PERSISTED,
        recovery: { kind: "recheck-stage-contract", attempt: ATTEMPT, pausedAtHead: HEAD },
        message: "EACCES",
        candidateLine: "Outcome: DONE",
      }),
      governing: "stage-contract-violation",
      recovery: "recheck-stage-contract",
      nextAction: true,
    },
    {
      builder: "refreshPromiseUnmet",
      situation: "a resume found the promise still unmet",
      waiting: Pause.refreshPromiseUnmet({
        paused: PERSISTED,
        recovery: { kind: "recheck-stage-contract", attempt: ATTEMPT, pausedAtHead: HEAD },
        unmet: UNMET,
        worktree: "dirty",
        candidateLine: undefined,
      }),
      governing: "stage-contract-violation",
      recovery: "recheck-stage-contract",
      nextAction: true,
    },
    {
      builder: "refreshBoundaryRefused",
      situation: "a resume had its retried boundary refused again",
      waiting: Pause.refreshBoundaryRefused({
        recovery: PERSISTED.recovery,
        failure: { kind: "commit-error" },
        message: "The commit failed.",
        candidateLine: undefined,
      }),
      governing: "commit-error",
      recovery: "retry-git-finalization",
      nextAction: true,
    },
  ];

  it("covers every builder it offers", () => {
    expect([...new Set(CATALOG.map((entry) => entry.builder))].sort()).toEqual(
      Object.keys(Pause).sort(),
    );
  });

  for (const entry of CATALOG) {
    it(`leads with the reason and recovery that fit ${entry.situation}`, () => {
      expect(entry.waiting.reasons[0].kind).toBe(entry.governing);
      expect(entry.waiting.recovery.kind).toBe(entry.recovery);
      expect(entry.waiting.nextAction !== undefined).toBe(entry.nextAction);
      // Every reason carries something to read; the schema requires it.
      for (const reason of entry.waiting.reasons) {
        expect(reason.message.length).toBeGreaterThan(0);
      }
    });
  }

  it("appends the queue reasons a post-DONE violation observed alongside it", () => {
    const waiting = Pause.contractViolated({
      attempt: ATTEMPT,
      pausedAtHead: HEAD,
      pendingFiles: PENDING,
      queueScanError: null,
      unmet: UNMET,
    });
    expect(kindsOf(waiting)).toEqual([
      "stage-contract-violation",
      "pending-queues",
    ]);
  });

  it("keeps an aborted attempt's queue reasons and drops its stage reason", () => {
    const waiting = Pause.attemptStopped({
      classified: [
        QUEUE_REASON,
        { kind: "harness-error", message: "The harness attempt failed." },
      ],
      aborted: true,
      diagnostics: { errorClass: "AbortError", errorMessage: "aborted", origin: "SIGINT" },
      attempt: ATTEMPT,
      boundary: { refused: false },
    });
    expect(kindsOf(waiting)).toEqual(["interrupted", "pending-queues"]);
    expect(waiting.reasons[0].diagnostics?.origin).toBe("SIGINT");
  });

  it("attaches harness telemetry to the reason that reports the failure", () => {
    const waiting = Pause.attemptStopped({
      classified: [
        QUEUE_REASON,
        { kind: "idle-timeout", message: "The harness went idle." },
      ],
      aborted: false,
      diagnostics: { errorClass: "IdleTimeout", errorMessage: "no output" },
      attempt: ATTEMPT,
      boundary: { refused: false },
    });
    expect(waiting.reasons[0].diagnostics).toBeUndefined();
    expect(waiting.reasons[1]!.diagnostics?.errorClass).toBe("IdleTimeout");
  });

  it("names an advisory HEAD movement and tells the reader it will not block", () => {
    const advisory: GitFinalizationFailure = {
      kind: "git-policy-violation",
      treatment: "advisory-head-movement",
    };
    expect(isAdvisoryHeadMovement(advisory)).toBe(true);
    expect(isAdvisoryHeadMovement({ kind: "commit-error" })).toBe(false);
    const waiting = Pause.refreshBoundaryRefused({
      recovery: PERSISTED.recovery,
      failure: advisory,
      message: "The attempt moved HEAD.",
      candidateLine: undefined,
    });
    expect(waiting.reasons[0].kind).toBe("unexpected-head-movement");
    expect(waiting.nextAction).toContain("will not block");
  });

  it("restates a still-held queue reason and adds one the pause never had", () => {
    const restated = Pause.refreshPendingBundles({
      paused: PERSISTED,
      pendingFiles: ["docs/threads/t/.pending-reviews/02-audit.md"],
    });
    expect(kindsOf(restated)).toEqual(kindsOf(PERSISTED));
    expect(restated.reasons[2]!.pendingFiles).toEqual([
      "docs/threads/t/.pending-reviews/02-audit.md",
    ]);

    const gained = Pause.refreshPendingBundles({
      paused: { reasons: CLASSIFIED, recovery: { kind: "retry-stage" } },
      pendingFiles: PENDING,
    });
    expect(kindsOf(gained)).toEqual(["outcome-blocked", "pending-queues"]);
  });

  it("keeps a saved DONE's own reason when the queue scan fails behind it", () => {
    const waiting = Pause.refreshQueueUnreadableHoldingDone({
      paused: PERSISTED,
      recovery: PERSISTED.recovery,
      scanMessage: "ENOTDIR",
    });
    // The governing reason survives, the fresh scan diagnostic sits directly
    // behind it, and the stale one it replaces is gone.
    expect(kindsOf(waiting)).toEqual([
      "git-policy-violation",
      "gate-error",
      "pending-queues",
    ]);
    expect(waiting.reasons[1]!.message).toContain("ENOTDIR");
  });

  it("replaces what a pause with nothing saved explains, never what it may do", () => {
    const paused: WaitingInfo = {
      reasons: CLASSIFIED,
      recovery: { kind: "retry-stage" },
      nextAction: "Dispose of the unvalidated changes.",
    };
    const waiting = Pause.refreshQueueUnreadable({
      paused,
      recovery: paused.recovery,
      scanMessage: "ENOTDIR",
    });
    expect(kindsOf(waiting)).toEqual(["gate-error"]);
    expect(waiting.recovery).toEqual(paused.recovery);
    expect(waiting.nextAction).toBe(paused.nextAction);
  });

  it("drops a stale scan diagnostic when a promise refresh replaces the reason", () => {
    for (const waiting of [
      Pause.refreshPromiseUninspectable({
        paused: PERSISTED,
        recovery: PERSISTED.recovery,
        message: "EACCES",
        candidateLine: undefined,
      }),
      Pause.refreshPromiseUnmet({
        paused: PERSISTED,
        recovery: PERSISTED.recovery,
        unmet: UNMET,
        worktree: "clean",
        candidateLine: undefined,
      }),
    ]) {
      expect(kindsOf(waiting)).toEqual([
        "stage-contract-violation",
        "pending-queues",
      ]);
    }
  });

  it("says why an unmet promise was not run again, from the worktree alone", () => {
    const dirty = Pause.refreshPromiseUnmet({
      paused: PERSISTED,
      recovery: PERSISTED.recovery,
      unmet: UNMET,
      worktree: "dirty",
      candidateLine: undefined,
    });
    const clean = Pause.refreshPromiseUnmet({
      paused: PERSISTED,
      recovery: PERSISTED.recovery,
      unmet: UNMET,
      worktree: "clean",
      candidateLine: undefined,
    });
    expect(dirty.reasons[0].detail).toContain("dirty");
    expect(clean.reasons[0].detail).toContain("preserved");
  });
});

describe("waitingEquals — whether two pauses say the same thing", () => {
  it("holds for a pause rebuilt from its fields in another key order", () => {
    // The property the durable-write decision rests on. A serialized comparison
    // answers "were these built the same way" and would report these unequal, so
    // an unchanged refresh would rewrite the checkpoint and restamp `updatedAt`.
    const rebuilt: WaitingInfo = {
      nextAction: PERSISTED.nextAction,
      recovery: {
        pausedAtHead: HEAD,
        attempt: { attempt: 2, stageIndex: 1 },
        kind: "retry-git-finalization",
      },
      reasons: [
        { message: "The boundary was refused.", kind: "git-policy-violation" },
        { message: "An earlier scan failed.", kind: "gate-error" },
        { pendingFiles: [...PENDING], message: QUEUE_REASON.message, kind: "pending-queues" },
      ],
    };
    expect(waitingEquals(rebuilt, PERSISTED)).toBe(true);
    expect(JSON.stringify(rebuilt)).not.toBe(JSON.stringify(PERSISTED));
  });

  it("treats an absent optional field and an undefined one as the same", () => {
    const absent: WaitingInfo = {
      reasons: [{ kind: "gate-error", message: "The scan failed." }],
      recovery: { kind: "retry-stage" },
    };
    const undefinedFields: WaitingInfo = {
      reasons: [
        {
          kind: "gate-error",
          message: "The scan failed.",
          detail: undefined,
          candidateLine: undefined,
          pendingFiles: undefined,
          diagnostics: undefined,
          contract: undefined,
        },
      ],
      recovery: { kind: "retry-stage" },
      nextAction: undefined,
    };
    expect(waitingEquals(absent, undefinedFields)).toBe(true);
  });

  it("never equals a run that is not paused at all", () => {
    expect(waitingEquals(PERSISTED, null)).toBe(false);
  });

  it("separates two pauses that differ in anything a reader would see", () => {
    const differing: WaitingInfo[] = [
      { ...PERSISTED, nextAction: "Something else." },
      { ...PERSISTED, nextAction: undefined },
      { ...PERSISTED, reasons: [PERSISTED.reasons[0]] },
      {
        ...PERSISTED,
        reasons: [PERSISTED.reasons[1]!, PERSISTED.reasons[0], QUEUE_REASON],
      },
      {
        ...PERSISTED,
        reasons: [
          { ...PERSISTED.reasons[0], message: "Reworded." },
          PERSISTED.reasons[1]!,
          QUEUE_REASON,
        ],
      },
      {
        ...PERSISTED,
        reasons: [
          { ...PERSISTED.reasons[0], detail: "Added." },
          PERSISTED.reasons[1]!,
          QUEUE_REASON,
        ],
      },
      {
        ...PERSISTED,
        reasons: [
          { ...PERSISTED.reasons[0], candidateLine: "Outcome: DONE" },
          PERSISTED.reasons[1]!,
          QUEUE_REASON,
        ],
      },
      {
        ...PERSISTED,
        reasons: [
          { ...PERSISTED.reasons[0], contract: UNMET },
          PERSISTED.reasons[1]!,
          QUEUE_REASON,
        ],
      },
      {
        ...PERSISTED,
        reasons: [
          { ...PERSISTED.reasons[0], diagnostics: { origin: "SIGINT" } },
          PERSISTED.reasons[1]!,
          QUEUE_REASON,
        ],
      },
      {
        ...PERSISTED,
        reasons: [
          PERSISTED.reasons[0],
          PERSISTED.reasons[1]!,
          { ...QUEUE_REASON, pendingFiles: [...PENDING, "docs/threads/t/.pending-reviews/x.md"] },
        ],
      },
      {
        ...PERSISTED,
        reasons: [PERSISTED.reasons[0], PERSISTED.reasons[1]!, { ...QUEUE_REASON, pendingFiles: [] }],
      },
    ];
    for (const [index, waiting] of differing.entries()) {
      expect(waitingEquals(waiting, PERSISTED), `variation ${index}`).toBe(false);
      expect(waitingEquals(PERSISTED, waiting), `variation ${index} reversed`).toBe(
        false,
      );
    }
  });

  it("separates every recovery from every other, and from its own re-aim", () => {
    const recoveries: WaitingRecovery[] = [
      { kind: "retry-stage" },
      { kind: "resume-finalized-done", attempt: ATTEMPT, queueResolution: "advance" },
      { kind: "resume-finalized-done", attempt: ATTEMPT, queueResolution: "rerun" },
      { kind: "resume-finalized-done", attempt: { stageIndex: 1, attempt: 3 }, queueResolution: "advance" },
      { kind: "recheck-stage-contract", attempt: ATTEMPT, pausedAtHead: HEAD },
      { kind: "recheck-stage-contract", attempt: ATTEMPT, pausedAtHead: OTHER_HEAD },
      { kind: "recheck-stage-contract", attempt: { stageIndex: 0, attempt: 2 }, pausedAtHead: HEAD },
      { kind: "retry-git-finalization", attempt: ATTEMPT, pausedAtHead: HEAD },
      { kind: "retry-git-finalization", attempt: ATTEMPT, pausedAtHead: OTHER_HEAD },
    ];
    for (const [left, a] of recoveries.entries()) {
      for (const [right, b] of recoveries.entries()) {
        expect(
          waitingEquals({ ...PERSISTED, recovery: a }, { ...PERSISTED, recovery: b }),
          `${left} vs ${right}`,
        ).toBe(left === right);
      }
    }
  });

  it("holds for a refresh that computed the pause already persisted", () => {
    // The end-to-end shape of the property: a resume whose fresh evidence says
    // exactly what the checkpoint already says needs no durable write.
    const first = Pause.refreshQueueUnreadableHoldingDone({
      paused: PERSISTED,
      recovery: PERSISTED.recovery,
      scanMessage: "ENOTDIR",
    });
    const again = Pause.refreshQueueUnreadableHoldingDone({
      paused: first,
      recovery: first.recovery,
      scanMessage: "ENOTDIR",
    });
    expect(waitingEquals(again, first)).toBe(true);
  });
});
