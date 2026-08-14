import { describe, expect, it } from "vitest";

import type { AgentBinding, StageBindingMap } from "../binding/types.js";
import { validateSettingsDocument } from "./validate.js";

const CODEX: AgentBinding = { harness: "codex", model: "gpt-5.6-sol" };

function errorsFor(document: unknown): string[] {
  const result = validateSettingsDocument(document);
  if (result.ok) {
    throw new Error("expected the settings document to be rejected");
  }
  return result.errors;
}

function stagesOf(document: unknown): StageBindingMap {
  const result = validateSettingsDocument(document);
  if (!result.ok) {
    throw new Error(`expected valid settings: ${result.errors.join("; ")}`);
  }
  return result.stages;
}

describe("the settings envelope", () => {
  it("accepts the canonical empty document", () => {
    expect(stagesOf({ afk: { stages: {} } })).toEqual({});
  });

  it("accepts a complete binding", () => {
    expect(
      stagesOf({
        afk: {
          stages: {
            spec: { agent: CODEX, idleTimeoutSeconds: 60, heartbeatSeconds: 30 },
          },
        },
      }),
    ).toEqual({
      spec: { agent: CODEX, idleTimeoutSeconds: 60, heartbeatSeconds: 30 },
    });
  });

  it("rejects an empty document", () => {
    expect(errorsFor({})).toEqual([
      'afk is required; a settings document is {"afk":{"stages":{}}}.',
    ]);
  });

  it("rejects a document with no stages container", () => {
    expect(errorsFor({ afk: {} })).toEqual([
      "afk.stages is required and may be an empty object.",
    ]);
  });

  it("reports an unknown root field alongside the envelope problem it hides", () => {
    expect(errorsFor({ extra: 1 })).toEqual([
      'extra is not a recognized top-level field; the only root field is "afk".',
      'afk is required; a settings document is {"afk":{"stages":{}}}.',
    ]);
  });

  it("rejects an unknown root field beside a valid envelope", () => {
    expect(errorsFor({ afk: { stages: {} }, extra: 1 })).toEqual([
      'extra is not a recognized top-level field; the only root field is "afk".',
    ]);
  });

  it("rejects a defaults catch-all under afk", () => {
    expect(errorsFor({ afk: { stages: {}, defaults: { model: "x" } } })).toEqual([
      'afk.defaults is not a recognized field; the only field under "afk" is "stages".',
    ]);
  });

  it("rejects non-object containers", () => {
    expect(errorsFor([])).toEqual([
      "The settings document root must be an object.",
    ]);
    expect(errorsFor({ afk: 3 })).toEqual(["afk must be an object."]);
    expect(errorsFor({ afk: { stages: [] } })).toEqual([
      "afk.stages must be an object.",
    ]);
  });
});

describe("the base path the settings document hands the shared schema", () => {
  it("names every stage-binding problem under afk.stages", () => {
    expect(
      errorsFor({
        afk: {
          stages: {
            spec: { agent: { harness: "gemini" }, prompt: "x", heartbeatSeconds: 0 },
            "review-spec": {},
            propose: { agent: CODEX },
          },
        },
      }),
    ).toEqual([
      "afk.stages.spec.prompt is not a recognized stage binding field.",
      "afk.stages.spec.heartbeatSeconds must be a positive integer.",
      'afk.stages.spec.agent.harness must be one of "codex" or "claude-code".',
      "afk.stages.spec.agent.model is required.",
      "afk.stages.review-spec.agent is required.",
      "afk.stages.propose is not a supported catalog stage ID.",
    ]);
  });

  it("reports an envelope problem before the stage map's", () => {
    expect(
      errorsFor({
        afk: { stages: { spec: {} }, defaults: {} },
        extra: 1,
      }),
    ).toEqual([
      'extra is not a recognized top-level field; the only root field is "afk".',
      'afk.defaults is not a recognized field; the only field under "afk" is "stages".',
      "afk.stages.spec.agent is required.",
    ]);
  });
});
