import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SCRIPTED_CASE_NAMES,
  SCRIPTED_HARNESS_TOGGLE_VAR,
  SCRIPTED_SCENARIO_FILENAME,
  interpretScriptedHarnessToggle,
  isCaseCompatibleWithStage,
  isScriptedCaseName,
  loadScriptedScenario,
  resolveScriptedScenarioPath,
  validateScriptedScenario,
  type ScriptedCaseName,
} from "./scenario.js";

/**
 * The stage IDs one representative Standard selection contributes. Scenario
 * validation is driven by the run's selected stage IDs, so the list is written
 * out here rather than derived from any document.
 */
const STANDARD_STAGE_IDS = [
  "spec",
  "reconcile-spec",
  "review-spec",
  "plan-strict",
  "reconcile-plan",
  "implement-plan-with-subagents",
];

const VALID_STANDARD_SCENARIO = {
  schemaVersion: 0,
  stages: {
    spec: ["spec-correct"],
    "reconcile-spec": ["reconcile-spec-correct"],
    "review-spec": ["outcome-done"],
    "plan-strict": ["plan-strict-correct"],
    "reconcile-plan": ["reconcile-plan-correct"],
    "implement-plan-with-subagents": ["implement-plan-with-subagents-correct"],
  },
} as const;

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "antmay-scripted-scenario-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function writeScenario(contents: string): string {
  const scenarioPath = path.join(dir, SCRIPTED_SCENARIO_FILENAME);
  fs.writeFileSync(scenarioPath, contents, "utf8");
  return scenarioPath;
}

describe("interpretScriptedHarnessToggle", () => {
  const cases: {
    label: string;
    env: NodeJS.ProcessEnv;
    expected:
      | { mode: "real" }
      | { mode: "scripted" }
      | { mode: "error"; contains: string[] };
  }[] = [
    { label: "unset", env: {}, expected: { mode: "real" } },
    {
      label: "empty string",
      env: { [SCRIPTED_HARNESS_TOGGLE_VAR]: "" },
      expected: { mode: "real" },
    },
    {
      label: "exact 1",
      env: { [SCRIPTED_HARNESS_TOGGLE_VAR]: "1" },
      expected: { mode: "scripted" },
    },
    {
      label: "true",
      env: { [SCRIPTED_HARNESS_TOGGLE_VAR]: "true" },
      expected: {
        mode: "error",
        contains: [SCRIPTED_HARNESS_TOGGLE_VAR, '"1"', '"true"'],
      },
    },
    {
      label: "0",
      env: { [SCRIPTED_HARNESS_TOGGLE_VAR]: "0" },
      expected: {
        mode: "error",
        contains: [SCRIPTED_HARNESS_TOGGLE_VAR, '"1"', '"0"'],
      },
    },
    {
      label: "yes",
      env: { [SCRIPTED_HARNESS_TOGGLE_VAR]: "yes" },
      expected: {
        mode: "error",
        contains: [SCRIPTED_HARNESS_TOGGLE_VAR, '"1"', '"yes"'],
      },
    },
  ];

  it.each(cases)("$label", ({ env, expected }) => {
    const result = interpretScriptedHarnessToggle(env);
    if (expected.mode === "error") {
      expect(result).toEqual({ mode: "error", message: expect.any(String) });
      if (result.mode !== "error") return;
      for (const fragment of expected.contains) {
        expect(result.message).toContain(fragment);
      }
      return;
    }
    expect(result).toEqual(expected);
  });
});

describe("resolveScriptedScenarioPath", () => {
  it("joins the config root with scripted-harness.json", () => {
    const configRoot = path.join(os.tmpdir(), "cfg", "antmay");
    expect(resolveScriptedScenarioPath(configRoot)).toBe(
      path.join(configRoot, SCRIPTED_SCENARIO_FILENAME),
    );
  });

  it("does not create the file", () => {
    const configRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "antmay-scripted-empty-root-"),
    );
    try {
      const scenarioPath = resolveScriptedScenarioPath(configRoot);
      expect(fs.existsSync(scenarioPath)).toBe(false);
    } finally {
      fs.rmSync(configRoot, { recursive: true, force: true });
    }
  });
});

describe("case catalog", () => {
  it("exposes exactly the seventeen built-in names", () => {
    expect([...SCRIPTED_CASE_NAMES]).toEqual([
      "outcome-done",
      "outcome-blocked",
      "outcome-refused",
      "outcome-malformed",
      "outcome-blocked-pending-decision",
      "outcome-blocked-long-detail",
      "harness-provider-error",
      "harness-idle-timeout",
      "harness-hang",
      "harness-crash",
      "spec-correct",
      "spec-correct-delayed",
      "reconcile-spec-correct",
      "reconcile-spec-pending-decision",
      "plan-strict-correct",
      "reconcile-plan-correct",
      "implement-plan-with-subagents-correct",
    ]);
  });

  it.each([
    ["outcome-done", "spec", true],
    ["outcome-blocked", "review-spec", true],
    ["outcome-refused", "implement-plan-with-subagents", true],
    ["harness-crash", "review-spec", true],
    ["spec-correct", "spec", true],
    ["spec-correct", "review-spec", false],
    ["spec-correct-delayed", "spec", true],
    ["spec-correct-delayed", "reconcile-spec", false],
    ["reconcile-spec-correct", "reconcile-spec", true],
    ["reconcile-spec-correct", "spec", false],
    ["reconcile-spec-pending-decision", "reconcile-spec", true],
    ["reconcile-spec-pending-decision", "spec", false],
    ["plan-strict-correct", "plan-strict", true],
    ["plan-strict-correct", "reconcile-plan", false],
    ["reconcile-plan-correct", "reconcile-plan", true],
    ["reconcile-plan-correct", "plan-strict", false],
    [
      "implement-plan-with-subagents-correct",
      "implement-plan-with-subagents",
      true,
    ],
    ["implement-plan-with-subagents-correct", "reconcile-plan", false],
  ] as const satisfies readonly [ScriptedCaseName, string, boolean][])(
    "%s on %s => %s",
    (caseName, stageId, compatible) => {
      expect(isScriptedCaseName(caseName)).toBe(true);
      expect(isCaseCompatibleWithStage(caseName, stageId)).toBe(compatible);
    },
  );

  it("rejects unknown case names", () => {
    expect(isScriptedCaseName("outcome-success")).toBe(false);
  });
});

describe("validateScriptedScenario — accepted Standard input", () => {
  it("accepts the spec example and preserves array order", () => {
    const document = {
      schemaVersion: 0,
      stages: {
        spec: ["outcome-blocked", "spec-correct"],
        "reconcile-spec": ["reconcile-spec-correct"],
        "review-spec": ["outcome-done"],
        "plan-strict": ["plan-strict-correct"],
        "reconcile-plan": ["reconcile-plan-correct"],
        "implement-plan-with-subagents": ["outcome-done"],
      },
    };
    const result = validateScriptedScenario(document, STANDARD_STAGE_IDS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scenario.schemaVersion).toBe(0);
    expect(result.scenario.stages.spec).toEqual([
      "outcome-blocked",
      "spec-correct",
    ]);
    expect(Object.keys(result.scenario.stages)).toEqual(STANDARD_STAGE_IDS);
  });

  it("validates against the selected suffix, not the whole document", () => {
    const suffix = ["plan-strict", "reconcile-plan"];
    const document = {
      schemaVersion: 0,
      stages: {
        "plan-strict": ["plan-strict-correct"],
        "reconcile-plan": ["reconcile-plan-correct"],
      },
    };
    const result = validateScriptedScenario(document, suffix);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.scenario.stages)).toEqual(suffix);

    // A skipped stage is not selected, so covering it is an unexpected entry.
    const withSkipped = validateScriptedScenario(
      { schemaVersion: 0, stages: { ...document.stages, spec: ["spec-correct"] } },
      suffix,
    );
    expect(withSkipped.ok).toBe(false);
    if (withSkipped.ok) return;
    expect(withSkipped.errors.join("\n")).toContain(
      "stages.spec is not an expected stage id.",
    );
  });
});

describe("validateScriptedScenario — invalid shape classes (AC-2.2)", () => {
  function expectRejected(document: unknown, matcher: RegExp | string): void {
    const result = validateScriptedScenario(document, STANDARD_STAGE_IDS);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const joined = result.errors.join("\n");
    if (typeof matcher === "string") {
      expect(joined).toContain(matcher);
      return;
    }
    expect(joined).toMatch(matcher);
  }

  it("rejects a non-object root", () => {
    expectRejected(null, "root must be an object");
    expectRejected([], "root must be an object");
    expectRejected(42, "root must be an object");
  });

  it("rejects unknown and missing root fields", () => {
    expectRejected(
      { schemaVersion: 0 },
      "stages must be present and an object.",
    );
    expectRejected({ stages: {} }, "schemaVersion must be present.");
    expectRejected(
      { schemaVersion: 0, stages: {}, extra: true },
      "extra is not a recognized top-level field.",
    );
  });

  it("rejects non-0 schemaVersion without coercion", () => {
    expectRejected(
      { ...VALID_STANDARD_SCENARIO, schemaVersion: 2 },
      "schemaVersion must be the number 0.",
    );
    expectRejected(
      { ...VALID_STANDARD_SCENARIO, schemaVersion: "0" },
      "schemaVersion must be the number 0.",
    );
  });

  it("rejects a non-object stages value", () => {
    expectRejected(
      { schemaVersion: 0, stages: [] },
      "stages must be an object.",
    );
    expectRejected(
      { schemaVersion: 0, stages: "spec" },
      "stages must be an object.",
    );
  });

  it("rejects missing and unknown stage keys", () => {
    const missingReview = {
      schemaVersion: 0,
      stages: {
        spec: ["spec-correct"],
        "reconcile-spec": ["reconcile-spec-correct"],
        "plan-strict": ["plan-strict-correct"],
        "reconcile-plan": ["reconcile-plan-correct"],
        "implement-plan-with-subagents": ["outcome-done"],
      },
    };
    expectRejected(missingReview, "stages.review-spec must be present.");

    const unknownStage = {
      ...VALID_STANDARD_SCENARIO,
      stages: {
        ...VALID_STANDARD_SCENARIO.stages,
        stray: ["outcome-done"],
      },
    };
    expectRejected(unknownStage, "stages.stray is not an expected stage id.");
  });

  it("rejects non-array, empty, non-string, empty-string, and unknown cases", () => {
    expectRejected(
      {
        ...VALID_STANDARD_SCENARIO,
        stages: { ...VALID_STANDARD_SCENARIO.stages, spec: "spec-correct" },
      },
      "stages.spec must be an array.",
    );
    expectRejected(
      {
        ...VALID_STANDARD_SCENARIO,
        stages: { ...VALID_STANDARD_SCENARIO.stages, spec: [] },
      },
      "stages.spec must be a non-empty array.",
    );
    expectRejected(
      {
        ...VALID_STANDARD_SCENARIO,
        stages: { ...VALID_STANDARD_SCENARIO.stages, spec: [42] },
      },
      "stages.spec[0] must be a non-empty string.",
    );
    expectRejected(
      {
        ...VALID_STANDARD_SCENARIO,
        stages: { ...VALID_STANDARD_SCENARIO.stages, spec: [""] },
      },
      "stages.spec[0] must be a non-empty string.",
    );
    expectRejected(
      {
        ...VALID_STANDARD_SCENARIO,
        stages: {
          ...VALID_STANDARD_SCENARIO.stages,
          spec: ["not-a-real-case"],
        },
      },
      "stages.spec[0] is not a recognized scripted case name.",
    );
  });

  it("rejects incompatible stage-specific assignments", () => {
    expectRejected(
      {
        ...VALID_STANDARD_SCENARIO,
        stages: {
          ...VALID_STANDARD_SCENARIO.stages,
          "review-spec": ["spec-correct"],
        },
      },
      /stages\.review-spec\[0\] \(spec-correct\) is not compatible with stage review-spec/,
    );
    expectRejected(
      {
        ...VALID_STANDARD_SCENARIO,
        stages: {
          ...VALID_STANDARD_SCENARIO.stages,
          spec: ["reconcile-plan-correct"],
        },
      },
      /stages\.spec\[0\] \(reconcile-plan-correct\) is not compatible with stage spec/,
    );
    expectRejected(
      {
        ...VALID_STANDARD_SCENARIO,
        stages: {
          ...VALID_STANDARD_SCENARIO.stages,
          "review-spec": ["implement-plan-with-subagents-correct"],
        },
      },
      /stages\.review-spec\[0\] \(implement-plan-with-subagents-correct\) is not compatible with stage review-spec/,
    );
  });

  it("rejects duplicate expected stage ids", () => {
    const result = validateScriptedScenario(VALID_STANDARD_SCENARIO, [
      "spec",
      "spec",
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("Duplicate expected stage id: spec.");
  });
});

describe("loadScriptedScenario", () => {
  it("loads a valid file from the fixed path", async () => {
    writeScenario(JSON.stringify(VALID_STANDARD_SCENARIO));
    const result = await loadScriptedScenario(dir, STANDARD_STAGE_IDS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scenarioPath).toBe(path.join(dir, SCRIPTED_SCENARIO_FILENAME));
    expect(result.scenario.stages["review-spec"]).toEqual(["outcome-done"]);
  });

  it("reports a missing file with the resolved path", async () => {
    const result = await loadScriptedScenario(dir, STANDARD_STAGE_IDS);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.scenarioPath).toBe(path.join(dir, SCRIPTED_SCENARIO_FILENAME));
    expect(result.errors[0]).toContain(result.scenarioPath);
    expect(result.errors[0]).toContain("No scripted scenario file found");
    expect(fs.existsSync(result.scenarioPath)).toBe(false);
  });

  it("reports unreadable files with the resolved path", async () => {
    const scenarioPath = path.join(dir, SCRIPTED_SCENARIO_FILENAME);
    fs.mkdirSync(scenarioPath);
    const result = await loadScriptedScenario(dir, STANDARD_STAGE_IDS);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain(scenarioPath);
    expect(result.errors[0]).toContain("Cannot read");
  });

  it("reports JSON syntax failures with the resolved path", async () => {
    const scenarioPath = writeScenario("{ not json");
    const result = await loadScriptedScenario(dir, STANDARD_STAGE_IDS);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain(scenarioPath);
    expect(result.errors[0]).toContain("not valid JSON");
  });

  it("reads and parses the scenario file exactly once", async () => {
    writeScenario(JSON.stringify(VALID_STANDARD_SCENARIO));
    const readFile = vi.fn(async () => JSON.stringify(VALID_STANDARD_SCENARIO));
    const result = await loadScriptedScenario(dir, STANDARD_STAGE_IDS, readFile);
    expect(readFile).toHaveBeenCalledTimes(1);
    expect(readFile).toHaveBeenCalledWith(path.join(dir, SCRIPTED_SCENARIO_FILENAME));
    expect(result.ok).toBe(true);
  });

  it("returns a reusable frozen scenario object", async () => {
    writeScenario(JSON.stringify(VALID_STANDARD_SCENARIO));
    const result = await loadScriptedScenario(dir, STANDARD_STAGE_IDS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.isFrozen(result.scenario)).toBe(true);
    expect(Object.isFrozen(result.scenario.stages)).toBe(true);
    expect(Object.isFrozen(result.scenario.stages.spec)).toBe(true);
  });
});
