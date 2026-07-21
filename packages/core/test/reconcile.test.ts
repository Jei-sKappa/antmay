import {
  type EndpointLiveness,
  reconcileEvidence,
  type TranscriptOutcomeSignal,
  transcriptTerminalOutcome,
} from "@antmay/core";
import { describe, expect, it } from "vitest";

const alive: EndpointLiveness = { kind: "alive" };
const ended: EndpointLiveness = { kind: "ended" };
const livenessGap: EndpointLiveness = {
  kind: "indeterminate",
  detail: "adapter read failed",
};

const cleanNoOutcome: TranscriptOutcomeSignal = { kind: "none" };
const transcriptGap: TranscriptOutcomeSignal = {
  kind: "indeterminate",
  detail: "transcript unreadable",
};

describe("reconcileEvidence", () => {
  it("finalizes a reliable transcript outcome regardless of liveness", () => {
    const outcome = transcriptTerminalOutcome("done", "shipped the change");
    for (const liveness of [alive, ended, livenessGap]) {
      const decision = reconcileEvidence({
        transcript: { kind: "final", outcome },
        liveness,
      });
      expect(decision).toEqual({
        action: "terminalize",
        outcome,
        health: { state: "healthy", detail: null },
      });
    }
  });

  it("prefers a reliable BLOCKED/REFUSED outcome with its complete reason", () => {
    for (const kind of ["blocked", "refused"] as const) {
      const outcome = transcriptTerminalOutcome(kind, `${kind} for a reason`);
      const decision = reconcileEvidence({
        transcript: { kind: "final", outcome },
        liveness: alive,
      });
      expect(decision.action).toBe("terminalize");
      if (decision.action === "terminalize") {
        expect(decision.outcome).toEqual(outcome);
      }
    }
  });

  it("keeps the run active with degraded health on an indeterminate transcript", () => {
    const decision = reconcileEvidence({
      transcript: transcriptGap,
      liveness: alive,
    });
    expect(decision).toEqual({
      action: "keep-active",
      health: { state: "degraded", detail: "transcript unreadable" },
    });
  });

  it("keeps the run active with degraded health on an indeterminate liveness read", () => {
    const decision = reconcileEvidence({
      transcript: cleanNoOutcome,
      liveness: livenessGap,
    });
    expect(decision).toEqual({
      action: "keep-active",
      health: { state: "degraded", detail: "adapter read failed" },
    });
  });

  it("never terminalizes on an indeterminate liveness read even without an outcome", () => {
    const decision = reconcileEvidence({
      transcript: transcriptGap,
      liveness: livenessGap,
    });
    expect(decision.action).toBe("keep-active");
  });

  it("stays healthy and active when the transcript is clean with no outcome and the endpoint is alive", () => {
    const decision = reconcileEvidence({
      transcript: cleanNoOutcome,
      liveness: alive,
    });
    expect(decision).toEqual({
      action: "keep-active",
      health: { state: "healthy", detail: null },
    });
  });

  it("yields unknown only after positive endpoint end plus no reliable outcome", () => {
    for (const transcript of [cleanNoOutcome, transcriptGap]) {
      const decision = reconcileEvidence({ transcript, liveness: ended });
      expect(decision.action).toBe("terminalize");
      if (decision.action === "terminalize") {
        expect(decision.outcome).toEqual({
          classification: "unknown",
          reason: null,
        });
      }
    }
  });
});
