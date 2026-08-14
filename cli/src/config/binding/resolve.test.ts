import { describe, expect, it } from "vitest";

import {
  DEFAULT_HEARTBEAT_SECONDS,
  DEFAULT_IDLE_TIMEOUT_SECONDS,
  resolveStageBindings,
} from "./resolve.js";
import type { AgentBinding, StageBindingMap } from "./types.js";

const CODEX: AgentBinding = { harness: "codex", model: "gpt-5.6-sol" };
const CLAUDE: AgentBinding = { harness: "claude-code", model: "claude-opus-5" };

describe("selected stage binding resolution", () => {
  const settings: StageBindingMap = {
    spec: {
      agent: { harness: "codex", model: "settings-model" },
      idleTimeoutSeconds: 111,
      heartbeatSeconds: 22,
    },
    "plan-strict": { agent: { harness: "codex", model: "settings-plan" } },
  };

  it("applies the intrinsic timing defaults to an omitted field", () => {
    const result = resolveStageBindings(["plan-strict"], settings, null);
    expect(result).toEqual({
      ok: true,
      bindings: [
        {
          agent: { harness: "codex", model: "settings-plan" },
          idleTimeoutSeconds: DEFAULT_IDLE_TIMEOUT_SECONDS,
          heartbeatSeconds: DEFAULT_HEARTBEAT_SECONDS,
        },
      ],
    });
    expect(DEFAULT_IDLE_TIMEOUT_SECONDS).toBe(86400);
    expect(DEFAULT_HEARTBEAT_SECONDS).toBe(300);
  });

  it("keeps explicit timing values", () => {
    const result = resolveStageBindings(["spec"], settings, null);
    expect(result).toEqual({
      ok: true,
      bindings: [
        {
          agent: { harness: "codex", model: "settings-model" },
          idleTimeoutSeconds: 111,
          heartbeatSeconds: 22,
        },
      ],
    });
  });

  it("replaces the whole settings entry with the profile entry, merging nothing", () => {
    const profile: StageBindingMap = {
      spec: { agent: { harness: "claude-code", model: "profile-model" } },
    };
    const result = resolveStageBindings(["spec"], settings, profile);
    expect(result).toEqual({
      ok: true,
      bindings: [
        {
          // Neither the settings harness/model pair nor its timing values leak
          // into the profile's binding.
          agent: { harness: "claude-code", model: "profile-model" },
          idleTimeoutSeconds: DEFAULT_IDLE_TIMEOUT_SECONDS,
          heartbeatSeconds: DEFAULT_HEARTBEAT_SECONDS,
        },
      ],
    });
  });

  it("falls back to the whole settings entry for an omitted profile stage", () => {
    const profile: StageBindingMap = {
      "plan-strict": { agent: CLAUDE, heartbeatSeconds: 5 },
    };
    const result = resolveStageBindings(
      ["spec", "plan-strict"],
      settings,
      profile,
    );
    expect(result).toEqual({
      ok: true,
      bindings: [
        {
          agent: { harness: "codex", model: "settings-model" },
          idleTimeoutSeconds: 111,
          heartbeatSeconds: 22,
        },
        {
          agent: CLAUDE,
          idleTimeoutSeconds: DEFAULT_IDLE_TIMEOUT_SECONDS,
          heartbeatSeconds: 5,
        },
      ],
    });
  });

  it("runs from a complete profile with no settings at all", () => {
    const profile: StageBindingMap = {
      spec: { agent: CODEX },
      "review-spec": { agent: CLAUDE },
    };
    const result = resolveStageBindings(["spec", "review-spec"], {}, profile);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bindings.map((binding) => binding.agent)).toEqual([
      CODEX,
      CLAUDE,
    ]);
  });

  it("ignores unused bindings in either source", () => {
    const profile: StageBindingMap = {
      spec: { agent: CODEX },
      implement: { agent: CLAUDE },
    };
    const result = resolveStageBindings(["spec"], settings, profile);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bindings).toHaveLength(1);
  });

  it("names every selected stage that neither source binds", () => {
    const result = resolveStageBindings(
      ["spec", "review-spec", "implement-plan"],
      settings,
      { spec: { agent: CODEX } },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain('Stage "review-spec"');
    expect(result.errors[0]).toContain("execution profile");
    expect(result.errors[1]).toContain('Stage "implement-plan"');
  });

  it("points at settings alone when no profile was selected", () => {
    const result = resolveStageBindings(["review-spec"], settings, null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      'Stage "review-spec" has no execution binding; add an "afk.stages.review-spec" entry to settings.json.',
    ]);
  });
});
