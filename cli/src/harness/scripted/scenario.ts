import fs from "node:fs/promises";
import path from "node:path";

/**
 * The sole environment variable that enables scripted harness mode for `run` and
 * `resume`. No other test-mode toggle exists.
 */
export const SCRIPTED_HARNESS_TOGGLE_VAR = "ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS";

/** Fixed scenario filename under the resolved config root. */
export const SCRIPTED_SCENARIO_FILENAME = "scripted-harness.json";

/**
 * The built-in scripted case catalog. Scenario files may select only these
 * names.
 */
export const SCRIPTED_CASE_NAMES = [
  "outcome-done",
  "outcome-blocked",
  "outcome-refused",
  "spec-correct",
  "reconcile-spec-correct",
  "plan-strict-correct",
  "reconcile-plan-correct",
  "implement-plan-with-subagents-correct",
] as const;

export type ScriptedCaseName = (typeof SCRIPTED_CASE_NAMES)[number];

const SCRIPTED_CASE_NAME_SET: ReadonlySet<string> = new Set(SCRIPTED_CASE_NAMES);

/**
 * Stage-specific cases accept only their identically named stage. Generic
 * outcome cases accept every stage.
 */
const STAGE_SPECIFIC_CASE_STAGE: Readonly<
  Partial<Record<ScriptedCaseName, string>>
> = {
  "spec-correct": "spec",
  "reconcile-spec-correct": "reconcile-spec",
  "plan-strict-correct": "plan-strict",
  "reconcile-plan-correct": "reconcile-plan",
  "implement-plan-with-subagents-correct": "implement-plan-with-subagents",
};

const OUTCOME_CASES: ReadonlySet<ScriptedCaseName> = new Set([
  "outcome-done",
  "outcome-blocked",
  "outcome-refused",
]);

export type ScriptedHarnessToggleMode =
  | { mode: "real" }
  | { mode: "scripted" }
  | { mode: "error"; message: string };

/**
 * A validated scripted scenario. Stage case arrays preserve the order from the
 * source file.
 */
export type ScriptedScenario = {
  readonly schemaVersion: 1;
  readonly stages: Readonly<Record<string, readonly ScriptedCaseName[]>>;
};

export type ValidateScriptedScenarioResult =
  | { ok: true; scenario: ScriptedScenario }
  | { ok: false; errors: string[] };

export type LoadScriptedScenarioResult =
  | { ok: true; scenarioPath: string; scenario: ScriptedScenario }
  | { ok: false; scenarioPath: string; errors: string[] };

export type ReadScenarioFile = (scenarioPath: string) => Promise<string>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readToggleValue(env: NodeJS.ProcessEnv): string | undefined {
  const value = env[SCRIPTED_HARNESS_TOGGLE_VAR];
  if (value === undefined || value === "") {
    return undefined;
  }
  return value;
}

/**
 * Interpret `ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS`. Unset or empty selects real
 * mode; the exact string `1` selects scripted mode; every other non-empty value
 * is a configuration error naming the variable and accepted value.
 */
export function interpretScriptedHarnessToggle(
  env: NodeJS.ProcessEnv,
): ScriptedHarnessToggleMode {
  const value = readToggleValue(env);
  if (value === undefined) {
    return { mode: "real" };
  }
  if (value === "1") {
    return { mode: "scripted" };
  }
  return {
    mode: "error",
    message: `${SCRIPTED_HARNESS_TOGGLE_VAR} must be exactly "1" to enable scripted harness mode, got: ${JSON.stringify(value)}`,
  };
}

/**
 * Resolve `<config-root>/scripted-harness.json`. Pure: no filesystem access and
 * no directory creation.
 */
export function resolveScriptedScenarioPath(configRoot: string): string {
  return path.join(configRoot, SCRIPTED_SCENARIO_FILENAME);
}

/**
 * Return whether `caseName` is a known catalog entry.
 */
export function isScriptedCaseName(value: string): value is ScriptedCaseName {
  return SCRIPTED_CASE_NAME_SET.has(value);
}

/**
 * Return whether `caseName` may appear under `stageId` in a validated scenario.
 */
export function isCaseCompatibleWithStage(
  caseName: ScriptedCaseName,
  stageId: string,
): boolean {
  if (OUTCOME_CASES.has(caseName)) {
    return true;
  }
  const requiredStage = STAGE_SPECIFIC_CASE_STAGE[caseName];
  return requiredStage !== undefined && stageId === requiredStage;
}

function normalizeExpectedStageIds(
  expectedStageIds: readonly string[],
): { ok: true; stageIds: readonly string[] } | { ok: false; errors: string[] } {
  const seen = new Set<string>();
  const stageIds: string[] = [];
  const errors: string[] = [];

  for (const stageId of expectedStageIds) {
    if (seen.has(stageId)) {
      errors.push(`Duplicate expected stage id: ${stageId}.`);
      continue;
    }
    seen.add(stageId);
    stageIds.push(stageId);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, stageIds };
}

/**
 * Strictly validate a parsed scenario document against the supplied stage IDs.
 * Collects every schema problem before returning.
 */
export function validateScriptedScenario(
  parsed: unknown,
  expectedStageIds: readonly string[],
): ValidateScriptedScenarioResult {
  const normalized = normalizeExpectedStageIds(expectedStageIds);
  if (!normalized.ok) {
    return { ok: false, errors: normalized.errors };
  }
  const stageIds = normalized.stageIds;
  const expectedStageSet = new Set(stageIds);
  const errors: string[] = [];
  const stages: Record<string, ScriptedCaseName[]> = {};

  if (!isPlainObject(parsed)) {
    errors.push("The scenario document root must be an object.");
    return { ok: false, errors };
  }

  for (const key of Object.keys(parsed)) {
    if (key !== "schemaVersion" && key !== "stages") {
      errors.push(`${key} is not a recognized top-level field.`);
    }
  }

  if (!("schemaVersion" in parsed)) {
    errors.push("schemaVersion must be present.");
  } else if (parsed.schemaVersion !== 1) {
    errors.push("schemaVersion must be the number 1.");
  }

  if (!("stages" in parsed)) {
    errors.push("stages must be present and an object.");
    return { ok: false, errors };
  }

  const stagesValue = parsed.stages;
  if (!isPlainObject(stagesValue)) {
    errors.push("stages must be an object.");
    return { ok: false, errors };
  }

  for (const stageId of Object.keys(stagesValue)) {
    if (!expectedStageSet.has(stageId)) {
      errors.push(`stages.${stageId} is not an expected stage id.`);
    }
  }

  for (const stageId of stageIds) {
    if (!(stageId in stagesValue)) {
      errors.push(`stages.${stageId} must be present.`);
      continue;
    }

    const casesValue = stagesValue[stageId];
    const casesPath = `stages.${stageId}`;

    if (!Array.isArray(casesValue)) {
      errors.push(`${casesPath} must be an array.`);
      continue;
    }
    if (casesValue.length === 0) {
      errors.push(`${casesPath} must be a non-empty array.`);
      continue;
    }

    const cases: ScriptedCaseName[] = [];
    for (let index = 0; index < casesValue.length; index += 1) {
      const entry = casesValue[index];
      const entryPath = `${casesPath}[${index}]`;
      if (typeof entry !== "string") {
        errors.push(`${entryPath} must be a non-empty string.`);
        continue;
      }
      if (entry.length === 0) {
        errors.push(`${entryPath} must be a non-empty string.`);
        continue;
      }
      if (!isScriptedCaseName(entry)) {
        errors.push(`${entryPath} is not a recognized scripted case name.`);
        continue;
      }
      if (!isCaseCompatibleWithStage(entry, stageId)) {
        errors.push(
          `${entryPath} (${entry}) is not compatible with stage ${stageId}.`,
        );
        continue;
      }
      cases.push(entry);
    }

    stages[stageId] = cases;
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const frozenStages: Record<string, readonly ScriptedCaseName[]> = {};
  for (const stageId of stageIds) {
    frozenStages[stageId] = Object.freeze([...stages[stageId]!]);
  }

  return {
    ok: true,
    scenario: Object.freeze({
      schemaVersion: 1 as const,
      stages: Object.freeze(frozenStages),
    }),
  };
}

/**
 * Read and strictly validate `<config-root>/scripted-harness.json` once. The
 * file is never created or rewritten. `readFile` exists for tests that assert
 * single-read behavior.
 */
export async function loadScriptedScenario(
  configRoot: string,
  expectedStageIds: readonly string[],
  readFile: ReadScenarioFile = (scenarioPath) =>
    fs.readFile(scenarioPath, "utf8"),
): Promise<LoadScriptedScenarioResult> {
  const scenarioPath = resolveScriptedScenarioPath(configRoot);

  let raw: string;
  try {
    raw = await readFile(scenarioPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return {
        ok: false,
        scenarioPath,
        errors: [`No scripted scenario file found at ${scenarioPath}.`],
      };
    }
    return {
      ok: false,
      scenarioPath,
      errors: [`Cannot read ${scenarioPath}: ${(error as Error).message}`],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      scenarioPath,
      errors: [
        `${scenarioPath} is not valid JSON: ${(error as Error).message}`,
      ],
    };
  }

  const validated = validateScriptedScenario(parsed, expectedStageIds);
  if (!validated.ok) {
    return { ok: false, scenarioPath, errors: validated.errors };
  }

  return {
    ok: true,
    scenarioPath,
    scenario: validated.scenario,
  };
}
