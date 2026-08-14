import { describe, expect, it } from "vitest";

import { validateStageMap } from "./schema.js";
import type { AgentBinding, StageBindingMap } from "./types.js";

const CODEX: AgentBinding = { harness: "codex", model: "gpt-5.6-sol" };
const CLAUDE: AgentBinding = { harness: "claude-code", model: "claude-opus-5" };

/**
 * The schema is reached with a base path and nothing else — no document, no
 * file — so a case states the container it validates directly.
 */
function errorsFor(container: unknown, basePath = "stages"): string[] {
  const result = validateStageMap(container, basePath);
  if (result.ok) {
    throw new Error("expected the stage map to be rejected");
  }
  return result.errors;
}

function stagesOf(container: unknown, basePath = "stages"): StageBindingMap {
  const result = validateStageMap(container, basePath);
  if (!result.ok) {
    throw new Error(`expected a valid stage map: ${result.errors.join("; ")}`);
  }
  return result.stages;
}

describe("the shared stage binding schema", () => {
  const cases = [
    {
      label: "a missing agent",
      binding: { idleTimeoutSeconds: 60 },
      contains: "agent is required",
    },
    {
      label: "a non-object agent",
      binding: { agent: "codex" },
      contains: "agent must be an object",
    },
    {
      label: "a missing harness",
      binding: { agent: { model: "m" } },
      contains: "agent.harness is required",
    },
    {
      label: "an unsupported harness",
      binding: { agent: { harness: "gemini", model: "m" } },
      contains: 'agent.harness must be one of "codex" or "claude-code"',
    },
    {
      label: "a missing model",
      binding: { agent: { harness: "codex" } },
      contains: "agent.model is required",
    },
    {
      label: "an empty model",
      binding: { agent: { harness: "codex", model: "" } },
      contains: "agent.model must be a non-empty string",
    },
    {
      label: "an unknown agent field",
      binding: { agent: { ...CODEX, prompt: "hi" } },
      contains: "agent.prompt is not a recognized agent field",
    },
    {
      label: "a prompt field",
      binding: { agent: CODEX, prompt: "extra guidance" },
      contains: "prompt is not a recognized stage binding field",
    },
    {
      label: "an instructions field",
      binding: { agent: CODEX, instructions: "extra guidance" },
      contains: "instructions is not a recognized stage binding field",
    },
    {
      label: "a flattened harness field",
      binding: { agent: CODEX, harness: "codex" },
      contains: "harness is not a recognized stage binding field",
    },
    {
      label: "a zero idle timeout",
      binding: { agent: CODEX, idleTimeoutSeconds: 0 },
      contains: "idleTimeoutSeconds must be a positive integer",
    },
    {
      label: "a negative heartbeat",
      binding: { agent: CODEX, heartbeatSeconds: -1 },
      contains: "heartbeatSeconds must be a positive integer",
    },
    {
      label: "a fractional idle timeout",
      binding: { agent: CODEX, idleTimeoutSeconds: 1.5 },
      contains: "idleTimeoutSeconds must be a positive integer",
    },
    {
      label: "a stringly typed heartbeat",
      binding: { agent: CODEX, heartbeatSeconds: "300" },
      contains: "heartbeatSeconds must be a positive integer",
    },
    {
      label: "a non-object binding",
      binding: 7,
      contains: "spec must be an object",
    },
  ];

  // One run of the table is the whole proof, because both documents validate
  // their stage maps through this one function.
  it.each(cases)("rejects $label", ({ binding, contains }) => {
    expect(errorsFor({ spec: binding }).join("\n")).toContain(contains);
  });

  it("rejects a non-object container", () => {
    expect(errorsFor([])).toEqual(["stages must be an object."]);
  });

  it("accepts a binding with no timing fields", () => {
    expect(stagesOf({ spec: { agent: CLAUDE } })).toEqual({
      spec: { agent: CLAUDE },
    });
  });

  it("accepts a complete binding", () => {
    expect(
      stagesOf({
        spec: { agent: CODEX, idleTimeoutSeconds: 60, heartbeatSeconds: 30 },
      }),
    ).toEqual({
      spec: { agent: CODEX, idleTimeoutSeconds: 60, heartbeatSeconds: 30 },
    });
  });

  it("holds no opinion about an empty container", () => {
    expect(validateStageMap({}, "stages")).toEqual({ ok: true, stages: {} });
  });

  it("reports every problem of every binding, in field and key order", () => {
    expect(
      errorsFor(
        {
          spec: {
            agent: { harness: "x", model: "", extra: 1 },
            prompt: 1,
            idleTimeoutSeconds: 0,
            heartbeatSeconds: -1,
          },
          "review-spec": {},
        },
        "afk.stages",
      ),
    ).toEqual([
      "afk.stages.spec.prompt is not a recognized stage binding field.",
      "afk.stages.spec.idleTimeoutSeconds must be a positive integer.",
      "afk.stages.spec.heartbeatSeconds must be a positive integer.",
      "afk.stages.spec.agent.extra is not a recognized agent field.",
      'afk.stages.spec.agent.harness must be one of "codex" or "claude-code".',
      "afk.stages.spec.agent.model must be a non-empty string.",
      "afk.stages.review-spec.agent is required.",
    ]);
  });
});

describe("catalog stage coverage", () => {
  it("accepts unused supported stage IDs", () => {
    expect(
      Object.keys(
        stagesOf({
          spec: { agent: CODEX },
          "implement-plan-with-subagents": { agent: CLAUDE },
        }),
      ).sort(),
    ).toEqual(["implement-plan-with-subagents", "spec"]);
  });

  it.each(["propose", "roadmap", "review", "Spec"])(
    "rejects the unknown stage ID %j",
    (stageId) => {
      expect(errorsFor({ [stageId]: { agent: CODEX } })).toEqual([
        `stages.${stageId} is not a supported catalog stage ID.`,
      ]);
    },
  );

  it("reports an unknown key's own problems alongside the unknown ID", () => {
    expect(errorsFor({ propose: { agent: CODEX, prompt: "x" } })).toEqual([
      "stages.propose.prompt is not a recognized stage binding field.",
      "stages.propose is not a supported catalog stage ID.",
    ]);
  });
});
