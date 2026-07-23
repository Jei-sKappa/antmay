import { describe, expect, it } from "vitest";

import type { AfkSettings } from "../config/settings.js";
import { resolveStageProfiles } from "./profiles.js";
import type { Recipe } from "./types.js";

const dummyPolicy = {
  headMayChange: false,
  allowedChanges: [],
  changeRequired: false,
  commitSubjectTemplate: null,
};

function stage(id: string) {
  return {
    id,
    skill: id,
    target: { kind: "thread-root" } as const,
    gitPolicy: dummyPolicy,
    queueResolution: "rerun" as const,
  };
}

const recipe: Recipe = {
  name: "synthetic",
  stages: [stage("alpha"), stage("beta")],
};

describe("resolveStageProfiles (AC-4.1)", () => {
  it("seeds prompt and idleTimeout from built-ins when defaults supply harness/model", () => {
    const settings: AfkSettings = {
      defaults: { harness: "codex", model: "gpt-x" },
      stages: {},
    };
    const result = resolveStageProfiles(recipe, settings);
    expect(result).toEqual({
      ok: true,
      profiles: [
        { harness: "codex", model: "gpt-x", prompt: "", idleTimeoutSeconds: 86400 },
        { harness: "codex", model: "gpt-x", prompt: "", idleTimeoutSeconds: 86400 },
      ],
    });
  });

  it("applies merge precedence seed -> defaults -> stage override with plain replacement", () => {
    const settings: AfkSettings = {
      defaults: {
        harness: "codex",
        model: "default-model",
        prompt: "default prompt",
        idleTimeoutSeconds: 100,
      },
      stages: {
        beta: {
          harness: "claude-code",
          model: "beta-model",
          idleTimeoutSeconds: 200,
        },
      },
    };
    const result = resolveStageProfiles(recipe, settings);
    expect(result).toEqual({
      ok: true,
      profiles: [
        {
          harness: "codex",
          model: "default-model",
          prompt: "default prompt",
          idleTimeoutSeconds: 100,
        },
        {
          // harness/model/idle replaced; prompt inherited from defaults (no concat)
          harness: "claude-code",
          model: "beta-model",
          prompt: "default prompt",
          idleTimeoutSeconds: 200,
        },
      ],
    });
  });

  it("succeeds when defaults omit harness/model but every stage supplies them", () => {
    const settings: AfkSettings = {
      defaults: {},
      stages: {
        alpha: { harness: "codex", model: "a" },
        beta: { harness: "claude-code", model: "b" },
      },
    };
    const result = resolveStageProfiles(recipe, settings);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profiles[0].harness).toBe("codex");
    expect(result.profiles[1].harness).toBe("claude-code");
  });

  it("aggregates errors for every unresolved stage", () => {
    const settings: AfkSettings = { defaults: {}, stages: {} };
    const result = resolveStageProfiles(recipe, settings);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // missing harness + missing model for each of two stages
    expect(result.errors.length).toBe(4);
    expect(result.errors.some((e) => e.includes("alpha"))).toBe(true);
    expect(result.errors.some((e) => e.includes("beta"))).toBe(true);
  });

  it("reports a missing model even when harness is present", () => {
    const settings: AfkSettings = {
      defaults: { harness: "codex" },
      stages: {},
    };
    const result = resolveStageProfiles(recipe, settings);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.every((e) => e.includes("model"))).toBe(true);
  });

  it("lets a stage override supply an empty prompt as a plain replacement", () => {
    const settings: AfkSettings = {
      defaults: { harness: "codex", model: "m", prompt: "shared" },
      stages: { alpha: { prompt: "" } },
    };
    const result = resolveStageProfiles(recipe, settings);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profiles[0].prompt).toBe("");
    expect(result.profiles[1].prompt).toBe("shared");
  });
});
