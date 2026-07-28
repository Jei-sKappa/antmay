import fs from "node:fs";
import path from "node:path";

import { isCatalogStageId } from "../pipeline/catalog.js";
import type { CatalogStageId } from "../pipeline/types.js";
import { isPlainObject } from "../shared/validation.js";
import { isValidDocumentName, DOCUMENT_NAME_PATTERN } from "./references.js";

/**
 * A supported agentic harness the executor can drive.
 */
export type HarnessId = "codex" | "claude-code";

const HARNESS_IDS: readonly HarnessId[] = ["codex", "claude-code"];

/**
 * The external agent a stage runs on. Harness and model are one indivisible
 * pair: they are chosen together, validated together, and replaced together, so
 * a model can never be paired with a harness the author did not intend.
 */
export type AgentBinding = {
  harness: HarnessId;
  model: string;
};

/**
 * One stage's local execution binding exactly as a settings or execution-profile
 * document writes it. Timing fields are optional and fall back to the intrinsic
 * defaults; the binding carries no prompt or instructions, which stay with the
 * catalog and the portable pipeline document.
 */
export type StageBinding = {
  agent: AgentBinding;
  idleTimeoutSeconds?: number;
  heartbeatSeconds?: number;
};

/**
 * Stage bindings keyed by catalog stage ID. Both local document types use this
 * container, and both may bind stages a given pipeline never selects so one
 * document can serve several pipelines.
 */
export type StageBindingMap = Partial<Record<CatalogStageId, StageBinding>>;

/**
 * A validated execution-profile document: its declared display identity and its
 * non-empty stage bindings. The declared name is independent of the filename the
 * document was read from.
 */
export type ExecutionProfile = {
  name: string;
  stages: StageBindingMap;
};

/**
 * One selected stage's complete local execution binding, with every timing field
 * settled. It comes from exactly one source document — a profile entry or a
 * settings entry — never from a combination of the two.
 */
export type ResolvedStageBinding = {
  agent: AgentBinding;
  idleTimeoutSeconds: number;
  heartbeatSeconds: number;
};

/**
 * How long an attempt may go without output before the executor abandons it,
 * when the binding names no idle timeout. A full day lets a long unattended
 * stage finish while still bounding a wedged provider connection.
 */
export const DEFAULT_IDLE_TIMEOUT_SECONDS = 86_400;

/**
 * How often a live attempt reports that it is still working, when the binding
 * names no interval. Five minutes is quiet enough to stay out of the way of an
 * unattended run and frequent enough to prove the executor has not died.
 */
export const DEFAULT_HEARTBEAT_SECONDS = 300;

/**
 * The result of loading the optional `<config-root>/settings.json`. A missing
 * file succeeds with an empty stage map; a present file that fails the strict
 * schema reports every discoverable problem at once against its resolved path.
 */
export type StageSettingsResult =
  | { ok: true; stages: StageBindingMap }
  | { ok: false; sourcePath: string; errors: string[] };

/**
 * The result of loading one execution-profile document from an already resolved
 * source path.
 */
export type ExecutionProfileResult =
  | { ok: true; profile: ExecutionProfile }
  | { ok: false; errors: string[] };

/**
 * The result of binding every selected stage. On success the bindings are
 * index-aligned with the selected stage IDs; on failure every unbound selected
 * stage is named.
 */
export type StageBindingsResult =
  | { ok: true; bindings: ResolvedStageBinding[] }
  | { ok: false; errors: string[] };

/**
 * Validate one optional positive-integer timing field, appending a problem when
 * it is present and unusable.
 */
function validateTimingField(
  container: Record<string, unknown>,
  field: "idleTimeoutSeconds" | "heartbeatSeconds",
  basePath: string,
  errors: string[],
): number | undefined {
  if (!(field in container)) {
    return undefined;
  }
  const value = container[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    errors.push(`${basePath}.${field} must be a positive integer.`);
    return undefined;
  }
  return value;
}

/**
 * Validate the atomic `agent` object: exactly a supported `harness` and a
 * non-empty `model`. Returns `null` when the pair cannot be formed, having
 * recorded every problem it found.
 */
function validateAgent(
  value: unknown,
  basePath: string,
  errors: string[],
): AgentBinding | null {
  if (!isPlainObject(value)) {
    errors.push(`${basePath} must be an object.`);
    return null;
  }

  for (const key of Object.keys(value)) {
    if (key !== "harness" && key !== "model") {
      errors.push(`${basePath}.${key} is not a recognized agent field.`);
    }
  }

  let harness: HarnessId | undefined;
  if (!("harness" in value)) {
    errors.push(`${basePath}.harness is required.`);
  } else if (
    typeof value.harness !== "string" ||
    !HARNESS_IDS.includes(value.harness as HarnessId)
  ) {
    errors.push(`${basePath}.harness must be one of "codex" or "claude-code".`);
  } else {
    harness = value.harness as HarnessId;
  }

  let model: string | undefined;
  if (!("model" in value)) {
    errors.push(`${basePath}.model is required.`);
  } else if (typeof value.model !== "string" || value.model.length === 0) {
    errors.push(`${basePath}.model must be a non-empty string.`);
  } else {
    model = value.model;
  }

  if (harness === undefined || model === undefined) {
    return null;
  }
  return { harness, model };
}

/**
 * Validate one stage binding against the schema both local document types
 * share. Returns `null` when the binding is not complete, having recorded every
 * problem it found. Prompt and instructions fields are rejected here as the
 * unknown fields they are.
 */
function validateBinding(
  value: unknown,
  basePath: string,
  errors: string[],
): StageBinding | null {
  if (!isPlainObject(value)) {
    errors.push(`${basePath} must be an object.`);
    return null;
  }

  for (const key of Object.keys(value)) {
    if (
      key !== "agent" &&
      key !== "idleTimeoutSeconds" &&
      key !== "heartbeatSeconds"
    ) {
      errors.push(`${basePath}.${key} is not a recognized stage binding field.`);
    }
  }

  const idleTimeoutSeconds = validateTimingField(
    value,
    "idleTimeoutSeconds",
    basePath,
    errors,
  );
  const heartbeatSeconds = validateTimingField(
    value,
    "heartbeatSeconds",
    basePath,
    errors,
  );

  if (!("agent" in value)) {
    errors.push(`${basePath}.agent is required.`);
    return null;
  }
  const agent = validateAgent(value.agent, `${basePath}.agent`, errors);
  if (agent === null) {
    return null;
  }

  const binding: StageBinding = { agent };
  if (idleTimeoutSeconds !== undefined) {
    binding.idleTimeoutSeconds = idleTimeoutSeconds;
  }
  if (heartbeatSeconds !== undefined) {
    binding.heartbeatSeconds = heartbeatSeconds;
  }
  return binding;
}

/**
 * Validate a stage-binding container. Every key must name a catalog stage — an
 * unknown ID invalidates the containing document — and every value must be a
 * complete binding. An unknown key's binding is still validated so one load
 * reports every problem the document has.
 */
function validateStageMap(
  value: unknown,
  basePath: string,
  requireNonEmpty: boolean,
  errors: string[],
): StageBindingMap {
  const stages: StageBindingMap = {};
  if (!isPlainObject(value)) {
    errors.push(`${basePath} must be an object.`);
    return stages;
  }

  const keys = Object.keys(value);
  if (requireNonEmpty && keys.length === 0) {
    errors.push(`${basePath} must bind at least one stage.`);
  }

  for (const key of keys) {
    const binding = validateBinding(value[key], `${basePath}.${key}`, errors);
    if (!isCatalogStageId(key)) {
      errors.push(`${basePath}.${key} is not a supported catalog stage ID.`);
      continue;
    }
    if (binding !== null) {
      stages[key] = binding;
    }
  }

  return stages;
}

/**
 * Validate a present settings document: exactly one root field `afk`, holding
 * exactly one field `stages`, holding a possibly empty stage-binding map.
 */
function validateSettingsDocument(
  root: unknown,
  errors: string[],
): StageBindingMap {
  if (!isPlainObject(root)) {
    errors.push("The settings document root must be an object.");
    return {};
  }

  for (const key of Object.keys(root)) {
    if (key !== "afk") {
      errors.push(
        `${key} is not a recognized top-level field; the only root field is "afk".`,
      );
    }
  }

  if (!("afk" in root)) {
    errors.push('afk is required; a settings document is {"afk":{"stages":{}}}.');
    return {};
  }

  const afk = root.afk;
  if (!isPlainObject(afk)) {
    errors.push("afk must be an object.");
    return {};
  }

  for (const key of Object.keys(afk)) {
    if (key !== "stages") {
      errors.push(
        `afk.${key} is not a recognized field; the only field under "afk" is "stages".`,
      );
    }
  }

  if (!("stages" in afk)) {
    errors.push("afk.stages is required and may be an empty object.");
    return {};
  }

  return validateStageMap(afk.stages, "afk.stages", false, errors);
}

/**
 * Validate an execution-profile document: `schemaVersion` exactly `0`, a
 * declared `name` matching the shared raw name grammar, and a non-empty stage
 * map. The declared name is the profile's display identity and is unrelated to
 * the filename it was read from.
 */
function validateProfileDocument(
  root: unknown,
  errors: string[],
): ExecutionProfile {
  const profile: ExecutionProfile = { name: "", stages: {} };

  if (!isPlainObject(root)) {
    errors.push("The execution profile document root must be an object.");
    return profile;
  }

  for (const key of Object.keys(root)) {
    if (key !== "schemaVersion" && key !== "name" && key !== "stages") {
      errors.push(`${key} is not a recognized execution profile field.`);
    }
  }

  if (!("schemaVersion" in root)) {
    errors.push("schemaVersion is required and must be 0.");
  } else if (root.schemaVersion !== 0) {
    errors.push("schemaVersion must be 0.");
  }

  if (!("name" in root)) {
    errors.push("name is required.");
  } else if (typeof root.name !== "string" || !isValidDocumentName(root.name)) {
    errors.push(`name must be a string matching ${DOCUMENT_NAME_PATTERN.source}.`);
  } else {
    profile.name = root.name;
  }

  if (!("stages" in root)) {
    errors.push("stages is required and must bind at least one stage.");
  } else {
    profile.stages = validateStageMap(root.stages, "stages", true, errors);
  }

  return profile;
}

/**
 * Load the optional `<config-root>/settings.json`.
 *
 * Only that single path is read, and no file is ever created. A missing file is
 * not an error: it behaves exactly as the canonical empty document
 * `{"afk":{"stages":{}}}`, so a complete execution profile can run without any
 * settings file at all. A present file is validated strictly, and every
 * discovered problem is reported together. No environment interpolation is
 * performed.
 */
export function loadStageSettings(configRoot: string): StageSettingsResult {
  const sourcePath = path.join(configRoot, "settings.json");

  let raw: string;
  try {
    raw = fs.readFileSync(sourcePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ok: true, stages: {} };
    }
    return {
      ok: false,
      sourcePath,
      errors: [`Cannot read ${sourcePath}: ${(error as Error).message}`],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      sourcePath,
      errors: [`${sourcePath} is not valid JSON: ${(error as Error).message}`],
    };
  }

  const errors: string[] = [];
  const stages = validateSettingsDocument(parsed, errors);
  if (errors.length > 0) {
    return { ok: false, sourcePath, errors };
  }
  return { ok: true, stages };
}

/**
 * Load one execution-profile document from the absolute source path a reference
 * already resolved to.
 *
 * Exactly that path is read. A missing file is an error rather than a prompt to
 * look elsewhere, because the reference's syntax already fixed where the
 * document lives.
 */
export function loadExecutionProfile(sourcePath: string): ExecutionProfileResult {
  let raw: string;
  try {
    raw = fs.readFileSync(sourcePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        ok: false,
        errors: [`No execution profile document exists at ${sourcePath}.`],
      };
    }
    return {
      ok: false,
      errors: [`Cannot read ${sourcePath}: ${(error as Error).message}`],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      errors: [`${sourcePath} is not valid JSON: ${(error as Error).message}`],
    };
  }

  const errors: string[] = [];
  const profile = validateProfileDocument(parsed, errors);
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, profile };
}

/**
 * Resolve the complete local execution binding of every selected stage.
 *
 * A selected stage takes the whole binding from the execution profile when the
 * profile binds it, and otherwise the whole binding from settings. Fields never
 * merge across the two sources, so a profile entry cannot inherit a settings
 * timing value or pair its model with a settings harness. Only the intrinsic
 * defaults fill an omitted timing field. A selected stage bound by neither
 * source is an error naming that stage; every such stage is reported together.
 */
export function resolveStageBindings(
  selectedStageIds: readonly CatalogStageId[],
  settingsStages: StageBindingMap,
  profileStages: StageBindingMap | null,
): StageBindingsResult {
  const bindings: ResolvedStageBinding[] = [];
  const errors: string[] = [];

  for (const stageId of selectedStageIds) {
    const binding = profileStages?.[stageId] ?? settingsStages[stageId];
    if (binding === undefined) {
      errors.push(
        profileStages === null
          ? `Stage "${stageId}" has no execution binding; add an "afk.stages.${stageId}" entry to settings.json.`
          : `Stage "${stageId}" has no execution binding; add a "${stageId}" entry to the selected execution profile or an "afk.stages.${stageId}" entry to settings.json.`,
      );
      continue;
    }
    bindings.push({
      agent: { ...binding.agent },
      idleTimeoutSeconds:
        binding.idleTimeoutSeconds ?? DEFAULT_IDLE_TIMEOUT_SECONDS,
      heartbeatSeconds: binding.heartbeatSeconds ?? DEFAULT_HEARTBEAT_SECONDS,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, bindings };
}
