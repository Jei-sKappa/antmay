import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_HEARTBEAT_SECONDS,
  DEFAULT_IDLE_TIMEOUT_SECONDS,
  loadExecutionProfile,
  loadStageSettings,
  resolveStageBindings,
  type AgentBinding,
  type StageBindingMap,
} from "./execution.js";

const CODEX: AgentBinding = { harness: "codex", model: "gpt-5.6-sol" };
const CLAUDE: AgentBinding = { harness: "claude-code", model: "claude-opus-5" };

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "antmay-execution-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function writeSettings(document: unknown): void {
  fs.writeFileSync(
    path.join(dir, "settings.json"),
    JSON.stringify(document),
    "utf8",
  );
}

function writeProfile(document: unknown, filename = "profile.json"): string {
  const source = path.join(dir, filename);
  fs.writeFileSync(source, JSON.stringify(document), "utf8");
  return source;
}

function settingsErrors(document: unknown): string[] {
  writeSettings(document);
  const result = loadStageSettings(dir);
  if (result.ok) {
    throw new Error("expected the settings document to be rejected");
  }
  return result.errors;
}

function settingsStages(document: unknown): StageBindingMap {
  writeSettings(document);
  const result = loadStageSettings(dir);
  if (!result.ok) {
    throw new Error(`expected valid settings: ${result.errors.join("; ")}`);
  }
  return result.stages;
}

function profileErrors(document: unknown): string[] {
  const result = loadExecutionProfile(writeProfile(document));
  if (result.ok) {
    throw new Error("expected the profile document to be rejected");
  }
  return result.errors;
}

/**
 * Wrap a stage binding in each container so one binding-schema case can be run
 * against both document types.
 */
function inSettings(binding: unknown): unknown {
  return { afk: { stages: { spec: binding } } };
}

function inProfile(binding: unknown): unknown {
  return { schemaVersion: 0, name: "p", stages: { spec: binding } };
}

describe("settings container", () => {
  it("treats a missing file as an empty stage map and creates nothing", () => {
    const result = loadStageSettings(dir);
    expect(result).toEqual({ ok: true, stages: {} });
    expect(fs.existsSync(path.join(dir, "settings.json"))).toBe(false);
  });

  it("accepts the canonical empty document", () => {
    expect(settingsStages({ afk: { stages: {} } })).toEqual({});
  });

  it("accepts a complete binding", () => {
    expect(
      settingsStages({
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
    expect(settingsErrors({}).join("\n")).toContain("afk is required");
  });

  it("rejects a document with no stages container", () => {
    expect(settingsErrors({ afk: {} }).join("\n")).toContain(
      "afk.stages is required",
    );
  });

  it("rejects an unknown root field", () => {
    expect(settingsErrors({ afk: { stages: {} }, extra: 1 }).join("\n")).toContain(
      "extra is not a recognized top-level field",
    );
  });

  it("rejects a defaults catch-all under afk", () => {
    expect(
      settingsErrors({ afk: { stages: {}, defaults: { model: "x" } } }).join("\n"),
    ).toContain("afk.defaults is not a recognized field");
  });

  it("rejects non-object containers", () => {
    expect(settingsErrors([]).join("\n")).toContain("root must be an object");
    expect(settingsErrors({ afk: 3 }).join("\n")).toContain(
      "afk must be an object",
    );
    expect(settingsErrors({ afk: { stages: [] } }).join("\n")).toContain(
      "afk.stages must be an object",
    );
  });

  it("reports a syntax error against the resolved path", () => {
    fs.writeFileSync(path.join(dir, "settings.json"), "{ not json", "utf8");
    const result = loadStageSettings(dir);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.sourcePath).toBe(path.join(dir, "settings.json"));
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("is not valid JSON");
  });
});

describe("shared stage binding schema", () => {
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

  it.each(cases)("settings reject $label", ({ binding, contains }) => {
    expect(settingsErrors(inSettings(binding)).join("\n")).toContain(contains);
  });

  it.each(cases)("profiles reject $label", ({ binding, contains }) => {
    expect(profileErrors(inProfile(binding)).join("\n")).toContain(contains);
  });

  it("accepts a binding with no timing fields", () => {
    expect(settingsStages(inSettings({ agent: CLAUDE }))).toEqual({
      spec: { agent: CLAUDE },
    });
  });

  it("collects every discoverable problem at once", () => {
    const errors = settingsErrors({
      afk: {
        stages: {
          spec: { agent: { harness: "gemini" }, prompt: "x", heartbeatSeconds: 0 },
          "review-spec": {},
        },
      },
    });
    expect(errors.length).toBeGreaterThanOrEqual(5);
    expect(errors.join("\n")).toContain("afk.stages.spec.agent.harness");
    expect(errors.join("\n")).toContain("afk.stages.spec.agent.model");
    expect(errors.join("\n")).toContain("afk.stages.spec.prompt");
    expect(errors.join("\n")).toContain("afk.stages.spec.heartbeatSeconds");
    expect(errors.join("\n")).toContain("afk.stages.review-spec.agent");
  });
});

describe("catalog stage coverage", () => {
  it("accepts unused supported stage IDs", () => {
    const stages = settingsStages({
      afk: {
        stages: {
          spec: { agent: CODEX },
          "implement-plan-with-subagents": { agent: CLAUDE },
        },
      },
    });
    expect(Object.keys(stages).sort()).toEqual([
      "implement-plan-with-subagents",
      "spec",
    ]);
  });

  it.each(["propose", "roadmap", "review", "Spec"])(
    "rejects the unknown stage ID %j in settings",
    (stageId) => {
      expect(
        settingsErrors({ afk: { stages: { [stageId]: { agent: CODEX } } } }).join(
          "\n",
        ),
      ).toContain(`afk.stages.${stageId} is not a supported catalog stage ID`);
    },
  );

  it("rejects an unknown stage ID in a profile", () => {
    expect(
      profileErrors({
        schemaVersion: 0,
        name: "p",
        stages: { propose: { agent: CODEX } },
      }).join("\n"),
    ).toContain("stages.propose is not a supported catalog stage ID");
  });
});

describe("execution profile document", () => {
  it("accepts the canonical document and keeps its declared identity", () => {
    const source = writeProfile(
      {
        schemaVersion: 0,
        name: "maximum-quality",
        stages: {
          spec: {
            agent: CODEX,
            idleTimeoutSeconds: 86400,
            heartbeatSeconds: 300,
          },
        },
      },
      // The declared name deliberately differs from the filename.
      "some-other-file.json",
    );
    const result = loadExecutionProfile(source);
    expect(result).toEqual({
      ok: true,
      profile: {
        name: "maximum-quality",
        stages: {
          spec: {
            agent: CODEX,
            idleTimeoutSeconds: 86400,
            heartbeatSeconds: 300,
          },
        },
      },
    });
  });

  const rootCases = [
    {
      label: "a missing schemaVersion",
      document: { name: "p", stages: { spec: { agent: CODEX } } },
      contains: "schemaVersion is required",
    },
    {
      label: "a future schemaVersion",
      document: { schemaVersion: 1, name: "p", stages: { spec: { agent: CODEX } } },
      contains: "schemaVersion must be 0",
    },
    {
      label: "a stringly typed schemaVersion",
      document: {
        schemaVersion: "0",
        name: "p",
        stages: { spec: { agent: CODEX } },
      },
      contains: "schemaVersion must be 0",
    },
    {
      label: "a missing name",
      document: { schemaVersion: 0, stages: { spec: { agent: CODEX } } },
      contains: "name is required",
    },
    {
      label: "an invalid name",
      document: {
        schemaVersion: 0,
        name: "Maximum Quality",
        stages: { spec: { agent: CODEX } },
      },
      contains: "name must be a string matching",
    },
    {
      label: "a missing stages map",
      document: { schemaVersion: 0, name: "p" },
      contains: "stages is required",
    },
    {
      label: "an empty stages map",
      document: { schemaVersion: 0, name: "p", stages: {} },
      contains: "stages must bind at least one stage",
    },
    {
      label: "an unknown root field",
      document: {
        schemaVersion: 0,
        name: "p",
        stages: { spec: { agent: CODEX } },
        defaults: { agent: CODEX },
      },
      contains: "defaults is not a recognized execution profile field",
    },
    {
      label: "a non-object root",
      document: [],
      contains: "root must be an object",
    },
  ];

  it.each(rootCases)("rejects $label", ({ document, contains }) => {
    expect(profileErrors(document).join("\n")).toContain(contains);
  });

  it.each(["Standard", "-p", "p-", "p--q", "p_q", ""])(
    "rejects the declared name %j",
    (name) => {
      expect(
        profileErrors({
          schemaVersion: 0,
          name,
          stages: { spec: { agent: CODEX } },
        }).join("\n"),
      ).toContain("name must be a string matching");
    },
  );

  it("reports a missing document against its exact path and searches nowhere else", () => {
    const source = path.join(dir, "profiles", "absent.json");
    const result = loadExecutionProfile(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      `No execution profile document exists at ${source}.`,
    ]);
    expect(fs.existsSync(path.join(dir, "profiles"))).toBe(false);
  });

  it("reports a syntax error against the source path", () => {
    const source = path.join(dir, "broken.json");
    fs.writeFileSync(source, "{ not json", "utf8");
    const result = loadExecutionProfile(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain(source);
    expect(result.errors[0]).toContain("is not valid JSON");
  });
});

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
    const result = resolveStageBindings(["spec", "plan-strict"], settings, profile);
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
