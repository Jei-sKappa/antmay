import fs from "node:fs/promises";
import path from "node:path";

import { isPlainObject } from "../../../shared/validation.js";

/** Fixed scenario filename under the resolved config root. */
export const SIMULATED_SCENARIO_FILENAME = "simulated-harness.json";

/**
 * The built-in simulated case catalog. Scenario files may select only these
 * names.
 */
export const SIMULATED_CASE_NAMES = [
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
] as const;

export type SimulatedCaseName = (typeof SIMULATED_CASE_NAMES)[number];

const SIMULATED_CASE_NAME_SET: ReadonlySet<string> = new Set(SIMULATED_CASE_NAMES);

/**
 * Stage-specific cases accept only their identically named stage. Generic
 * cases accept every stage.
 */
const STAGE_SPECIFIC_CASE_STAGE: Readonly<
  Partial<Record<SimulatedCaseName, string>>
> = {
  "spec-correct": "spec",
  "spec-correct-delayed": "spec",
  "reconcile-spec-correct": "reconcile-spec",
  "reconcile-spec-pending-decision": "reconcile-spec",
  "plan-strict-correct": "plan-strict",
  "reconcile-plan-correct": "reconcile-plan",
  "implement-plan-with-subagents-correct": "implement-plan-with-subagents",
};

const GENERIC_CASES: ReadonlySet<SimulatedCaseName> = new Set([
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
]);

/**
 * A validated simulated scenario. Stage case arrays preserve the order from the
 * source file.
 */
export type SimulatedScenario = {
  readonly schemaVersion: 0;
  readonly stages: Readonly<Record<string, readonly SimulatedCaseName[]>>;
};

export type ValidateSimulatedScenarioResult =
  | { ok: true; scenario: SimulatedScenario }
  | { ok: false; errors: string[] };

export type LoadSimulatedScenarioResult =
  | { ok: true; scenarioPath: string; scenario: SimulatedScenario }
  | { ok: false; scenarioPath: string; errors: string[] };

export type ReadScenarioFile = (scenarioPath: string) => Promise<string>;

/**
 * Resolve `<config-root>/simulated-harness.json`. Pure: no filesystem access and
 * no directory creation.
 */
export function resolveSimulatedScenarioPath(configRoot: string): string {
  return path.join(configRoot, SIMULATED_SCENARIO_FILENAME);
}

/**
 * Return whether `caseName` is a known catalog entry.
 */
export function isSimulatedCaseName(value: string): value is SimulatedCaseName {
  return SIMULATED_CASE_NAME_SET.has(value);
}

/**
 * Return whether `caseName` may appear under `stageId` in a validated scenario.
 */
export function isCaseCompatibleWithStage(
  caseName: SimulatedCaseName,
  stageId: string,
): boolean {
  if (GENERIC_CASES.has(caseName)) {
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
export function validateSimulatedScenario(
  parsed: unknown,
  expectedStageIds: readonly string[],
): ValidateSimulatedScenarioResult {
  const normalized = normalizeExpectedStageIds(expectedStageIds);
  if (!normalized.ok) {
    return { ok: false, errors: normalized.errors };
  }
  const stageIds = normalized.stageIds;
  const expectedStageSet = new Set(stageIds);
  const errors: string[] = [];
  const stages: Record<string, SimulatedCaseName[]> = {};

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
  } else if (parsed.schemaVersion !== 0) {
    errors.push("schemaVersion must be the number 0.");
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

    const cases: SimulatedCaseName[] = [];
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
      if (!isSimulatedCaseName(entry)) {
        errors.push(`${entryPath} is not a recognized simulated case name.`);
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

  const frozenStages: Record<string, readonly SimulatedCaseName[]> = {};
  for (const stageId of stageIds) {
    frozenStages[stageId] = Object.freeze([...stages[stageId]!]);
  }

  return {
    ok: true,
    scenario: Object.freeze({
      schemaVersion: 0 as const,
      stages: Object.freeze(frozenStages),
    }),
  };
}

/**
 * Read and strictly validate `<config-root>/simulated-harness.json` once. The
 * file is never created or rewritten. `readFile` exists for tests that assert
 * single-read behavior.
 */
export async function loadSimulatedScenario(
  configRoot: string,
  expectedStageIds: readonly string[],
  readFile: ReadScenarioFile = (scenarioPath) =>
    fs.readFile(scenarioPath, "utf8"),
): Promise<LoadSimulatedScenarioResult> {
  const scenarioPath = resolveSimulatedScenarioPath(configRoot);

  let raw: string;
  try {
    raw = await readFile(scenarioPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return {
        ok: false,
        scenarioPath,
        errors: [`No simulated scenario file found at ${scenarioPath}.`],
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

  const validated = validateSimulatedScenario(parsed, expectedStageIds);
  if (!validated.ok) {
    return { ok: false, scenarioPath, errors: validated.errors };
  }

  return {
    ok: true,
    scenarioPath,
    scenario: validated.scenario,
  };
}
