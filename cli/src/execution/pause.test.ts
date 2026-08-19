import { describe, expect, it } from "vitest";

import type {
  AttemptReference,
  WaitingInfo,
  WaitingKind,
  WaitingReason,
  WaitingReasons,
  WaitingRecovery,
} from "../state/checkpoint/types.js";
import { reasonOf } from "../test-helpers/waiting.js";
import type { ArtifactMismatch } from "../thread/artifacts.js";

import { Pause, isAdvisoryHeadMovement, waitingEquals } from "./pause.js";
import type { GitFinalizationFailure } from "./recovery.js";

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
  {
    kind: "outcome-blocked",
    message: "The stage reported Outcome: BLOCKED.",
    agentReason: "The spec contradicts the roadmap.",
  },
];
const NEXT_ACTION = "Dispose of the unvalidated changes.";

/**
 * The pause every refresh builder is handed: what a resume found persisted. Its
 * governing reason is the one a refresh replaces or keeps, and the stale
 * `gate-error` behind it is the one a refresh must not carry forward twice.
 */
const PERSISTED: WaitingInfo = {
  reasons: [
    { kind: "git-policy-violation", message: "The boundary was refused." },
    { kind: "gate-error", message: "An earlier scan failed.", errorMessage: "EIO" },
    QUEUE_REASON,
  ],
  recovery: { kind: "retry-git-finalization", attempt: ATTEMPT, pausedAtHead: HEAD },
  nextAction: NEXT_ACTION,
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
      governing: "stage-prerequisite-uninspectable",
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
      governing: "stage-contract-uninspectable",
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
      governing: "stage-contract-unmet",
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
        abort: null,
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
        abort: null,
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
        origin: "SIGINT",
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
      }),
      governing: "stage-contract-uninspectable",
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
      }),
      governing: "stage-contract-unmet",
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

  it("keeps each split pair on one recovery and one instruction", () => {
    // The two kinds in each pair differ in the evidence they carry and in
    // nothing a reader acts on, which is what lets them share a banner.
    const prerequisite = [
      Pause.prerequisiteUninspectable({
        stagePosition: "2/3",
        stageId: "plan-strict",
        message: "EACCES",
      }),
      Pause.prerequisiteUnmet({
        stagePosition: "2/3",
        stageId: "plan-strict",
        unmet: UNMET,
      }),
    ];
    const contract = [
      Pause.contractUninspectable({
        attempt: ATTEMPT,
        pausedAtHead: HEAD,
        pendingFiles: [],
        queueScanError: null,
        message: "EACCES",
      }),
      Pause.contractViolated({
        attempt: ATTEMPT,
        pausedAtHead: HEAD,
        pendingFiles: [],
        queueScanError: null,
        unmet: UNMET,
      }),
    ];
    for (const [uninspectable, unmet] of [prerequisite, contract] as const) {
      expect(uninspectable!.recovery).toEqual(unmet!.recovery);
      expect(uninspectable!.nextAction).toBe(unmet!.nextAction);
      expect(uninspectable!.reasons[0].kind).not.toBe(unmet!.reasons[0].kind);
    }
  });

  it("appends the queue reasons a post-DONE violation observed alongside it", () => {
    const waiting = Pause.contractViolated({
      attempt: ATTEMPT,
      pausedAtHead: HEAD,
      pendingFiles: PENDING,
      queueScanError: null,
      unmet: UNMET,
    });
    expect(kindsOf(waiting)).toEqual(["stage-contract-unmet", "pending-queues"]);
  });

  it("keeps an aborted attempt's queue reasons and drops its stage reason", () => {
    const waiting = Pause.attemptStopped({
      classified: [
        QUEUE_REASON,
        { kind: "harness-error", message: "The harness attempt failed." },
      ],
      abort: { origin: "SIGINT" },
      attempt: ATTEMPT,
      boundary: { refused: false },
    });
    expect(kindsOf(waiting)).toEqual(["interrupted", "pending-queues"]);
    expect(reasonOf(waiting.reasons[0], "interrupted").origin).toBe("SIGINT");
  });

  it("carries the classifier's reasons unchanged when no signal ended the attempt", () => {
    const classified: WaitingReasons = [
      QUEUE_REASON,
      { kind: "idle-timeout", message: "The harness went idle." },
    ];
    const waiting = Pause.attemptStopped({
      classified,
      abort: null,
      attempt: ATTEMPT,
      boundary: { refused: false },
    });
    expect(waiting.reasons).toEqual(classified);
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
    expect(reasonOf(restated.reasons[2], "pending-queues").pendingFiles).toEqual([
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
    expect(
      kindsOf(
        Pause.refreshPromiseUninspectable({
          paused: PERSISTED,
          recovery: PERSISTED.recovery,
          message: "EACCES",
        }),
      ),
    ).toEqual(["stage-contract-uninspectable", "pending-queues"]);
    expect(
      kindsOf(
        Pause.refreshPromiseUnmet({
          paused: PERSISTED,
          recovery: PERSISTED.recovery,
          unmet: UNMET,
          worktree: "clean",
        }),
      ),
    ).toEqual(["stage-contract-unmet", "pending-queues"]);
  });

  it("says why an unmet promise was not run again, from the worktree alone", () => {
    const dirty = Pause.refreshPromiseUnmet({
      paused: PERSISTED,
      recovery: PERSISTED.recovery,
      unmet: UNMET,
      worktree: "dirty",
    });
    const clean = Pause.refreshPromiseUnmet({
      paused: PERSISTED,
      recovery: PERSISTED.recovery,
      unmet: UNMET,
      worktree: "clean",
    });
    expect(
      reasonOf(dirty.reasons[0], "stage-contract-unmet").preservationNote,
    ).toContain("dirty");
    expect(
      reasonOf(clean.reasons[0], "stage-contract-unmet").preservationNote,
    ).toContain("preserved");
  });
});

describe("waitingEquals — whether two pauses say the same thing", () => {
  it("holds for a pause rebuilt from its fields in another key order", () => {
    // The property the durable-write decision rests on. A serialized comparison
    // answers "were these built the same way" and would report these unequal, so
    // an unchanged refresh would rewrite the checkpoint and restamp `updatedAt`.
    const rebuilt: WaitingInfo = {
      nextAction: NEXT_ACTION,
      recovery: {
        pausedAtHead: HEAD,
        attempt: { attempt: 2, stageIndex: 1 },
        kind: "retry-git-finalization",
      },
      reasons: [
        { message: "The boundary was refused.", kind: "git-policy-violation" },
        { errorMessage: "EIO", message: "An earlier scan failed.", kind: "gate-error" },
        { pendingFiles: [...PENDING], message: QUEUE_REASON.message, kind: "pending-queues" },
      ],
    };
    expect(waitingEquals(rebuilt, PERSISTED)).toBe(true);
    expect(JSON.stringify(rebuilt)).not.toBe(JSON.stringify(PERSISTED));
  });

  it("treats an absent instruction and an undefined one as the same", () => {
    const absent: WaitingInfo = {
      reasons: [
        { kind: "gate-error", message: "The scan failed.", errorMessage: "ENOTDIR" },
      ],
      recovery: { kind: "retry-stage" },
    };
    // The instruction belongs to the run rather than to any reason and stays
    // optional, so it is the one key a pause can carry as `undefined` — a shape
    // only a cast can build. `waitingEquals` compares field by field, so it reads
    // such a pause as saying what an absent-key one says.
    const undefinedInstruction = {
      ...absent,
      nextAction: undefined,
    } as unknown as WaitingInfo;
    expect(waitingEquals(absent, undefinedInstruction)).toBe(true);
  });

  it("never equals a run that is not paused at all", () => {
    expect(waitingEquals(PERSISTED, null)).toBe(false);
  });

  it("separates two pauses that differ in anything a reader would see", () => {
    const { nextAction: _carried, ...withoutNextAction } = PERSISTED;
    const differing: WaitingInfo[] = [
      { ...PERSISTED, nextAction: "Something else." },
      withoutNextAction,
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
          PERSISTED.reasons[0],
          {
            kind: "gate-error",
            message: "An earlier scan failed.",
            errorMessage: "EPERM",
          },
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

  it("separates two reasons of one kind that differ in the evidence it carries", () => {
    // Every kind that carries evidence at all, so no kind's own fields can drop
    // out of the comparison the durable-write decision rests on.
    const groups: WaitingReason[][] = [
      [
        { kind: "outcome-blocked", message: "m", agentReason: "one" },
        { kind: "outcome-blocked", message: "m", agentReason: "two" },
        { kind: "outcome-blocked", message: "m", agentReason: null },
      ],
      [
        { kind: "outcome-refused", message: "m", agentReason: "one" },
        { kind: "outcome-refused", message: "m", agentReason: null },
      ],
      [
        { kind: "pending-queues", message: "m", pendingFiles: PENDING },
        { kind: "pending-queues", message: "m", pendingFiles: [] },
      ],
      [
        { kind: "malformed-outcome", message: "m", candidateLine: "Outcome: X" },
        { kind: "malformed-outcome", message: "m", candidateLine: null },
      ],
      [
        { kind: "interrupted", message: "m", origin: "SIGINT" },
        { kind: "interrupted", message: "m", origin: "SIGTERM" },
      ],
      [
        { kind: "gate-error", message: "m", errorMessage: "EACCES" },
        { kind: "gate-error", message: "m", errorMessage: "ENOTDIR" },
      ],
      [
        { kind: "stage-prerequisite-unmet", message: "m", contract: UNMET },
        { kind: "stage-prerequisite-unmet", message: "m", contract: [] },
      ],
      [
        { kind: "stage-prerequisite-uninspectable", message: "m", errorMessage: "EACCES" },
        { kind: "stage-prerequisite-uninspectable", message: "m", errorMessage: "ENOENT" },
      ],
      [
        { kind: "stage-contract-unmet", message: "m", contract: UNMET, preservationNote: null },
        { kind: "stage-contract-unmet", message: "m", contract: UNMET, preservationNote: "held" },
        { kind: "stage-contract-unmet", message: "m", contract: [], preservationNote: null },
      ],
      [
        { kind: "stage-contract-uninspectable", message: "m", errorMessage: "EACCES" },
        { kind: "stage-contract-uninspectable", message: "m", errorMessage: "ENOENT" },
      ],
    ];
    const only = (reason: WaitingReason): WaitingInfo => ({
      reasons: [reason],
      recovery: { kind: "retry-stage" },
    });
    for (const group of groups) {
      for (const [left, a] of group.entries()) {
        for (const [right, b] of group.entries()) {
          expect(
            waitingEquals(only(a), only(b)),
            `${a.kind}: ${left} vs ${right}`,
          ).toBe(left === right);
        }
      }
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
