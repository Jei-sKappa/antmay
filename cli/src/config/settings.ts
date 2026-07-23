import fs from "node:fs";
import path from "node:path";

/**
 * A supported agentic harness the executor can drive.
 */
export type HarnessId = "codex" | "claude-code";

/**
 * The fields a profile may carry. Every field is optional at the settings
 * layer; profile resolution supplies built-in defaults and enforces the
 * required harness and model.
 */
export type ProfileFields = {
  harness?: HarnessId;
  model?: string;
  prompt?: string;
  idleTimeoutSeconds?: number;
};

/**
 * The validated `afk` settings object: a `defaults` profile plus per-stage
 * overrides keyed by stage ID. Omitted `defaults`/`stages` normalize to empty
 * objects.
 */
export type AfkSettings = {
  defaults: ProfileFields;
  stages: Record<string, ProfileFields>;
};

/**
 * The result of loading `<config-root>/settings.json`.
 *
 * On failure the caller learns the fully resolved expected path, whether the
 * file was simply missing, and the complete list of collected problems (a
 * single missing-file or syntax entry, or every schema error at once).
 */
export type SettingsResult =
  | { ok: true; settings: AfkSettings }
  | { ok: false; expectedPath: string; missing: boolean; errors: string[] };

const HARNESS_IDS: ReadonlySet<string> = new Set<HarnessId>([
  "codex",
  "claude-code",
]);

const PROFILE_FIELDS: ReadonlySet<string> = new Set([
  "harness",
  "model",
  "prompt",
  "idleTimeoutSeconds",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}

/**
 * Validate a single profile object, appending every problem found to `errors`.
 * `basePath` is the JSON property path of the profile (e.g. `afk.defaults` or
 * `afk.stages.spec`). Returns the normalized profile, ignoring nothing: unknown
 * fields are recorded as errors but do not appear in the result.
 */
function validateProfile(
  value: unknown,
  basePath: string,
  errors: string[],
): ProfileFields {
  const profile: ProfileFields = {};
  if (!isPlainObject(value)) {
    errors.push(`${basePath} must be an object.`);
    return profile;
  }

  for (const key of Object.keys(value)) {
    if (!PROFILE_FIELDS.has(key)) {
      errors.push(`${basePath}.${key} is not a recognized profile field.`);
    }
  }

  if ("harness" in value) {
    const harness = value.harness;
    if (typeof harness !== "string" || !HARNESS_IDS.has(harness)) {
      errors.push(
        `${basePath}.harness must be one of "codex" or "claude-code".`,
      );
    } else {
      profile.harness = harness as HarnessId;
    }
  }

  if ("model" in value) {
    const model = value.model;
    if (typeof model !== "string" || model.length === 0) {
      errors.push(`${basePath}.model must be a non-empty string.`);
    } else {
      profile.model = model;
    }
  }

  if ("prompt" in value) {
    const prompt = value.prompt;
    if (typeof prompt !== "string") {
      errors.push(`${basePath}.prompt must be a string.`);
    } else {
      profile.prompt = prompt;
    }
  }

  if ("idleTimeoutSeconds" in value) {
    const idle = value.idleTimeoutSeconds;
    if (
      typeof idle !== "number" ||
      !Number.isInteger(idle) ||
      idle <= 0
    ) {
      errors.push(
        `${basePath}.idleTimeoutSeconds must be a positive finite integer.`,
      );
    } else {
      profile.idleTimeoutSeconds = idle;
    }
  }

  return profile;
}

/**
 * Validate the parsed settings document against the strict schema, collecting
 * every problem into `errors`. Stage keys absent from `knownStageIds` are
 * errors so the settings cannot silently target a stage no installed recipe
 * runs.
 */
function validateDocument(
  root: unknown,
  knownStageIds: ReadonlySet<string>,
  errors: string[],
): AfkSettings {
  const settings: AfkSettings = { defaults: {}, stages: {} };

  if (!isPlainObject(root)) {
    errors.push("The settings document root must be an object.");
    return settings;
  }

  for (const key of Object.keys(root)) {
    if (key !== "afk") {
      errors.push(`${key} is not a recognized top-level field.`);
    }
  }

  if (!("afk" in root)) {
    errors.push("afk must be present and an object.");
    return settings;
  }

  const afk = root.afk;
  if (!isPlainObject(afk)) {
    errors.push("afk must be an object.");
    return settings;
  }

  for (const key of Object.keys(afk)) {
    if (key !== "defaults" && key !== "stages") {
      errors.push(`afk.${key} is not a recognized field.`);
    }
  }

  if ("defaults" in afk) {
    settings.defaults = validateProfile(afk.defaults, "afk.defaults", errors);
  }

  if ("stages" in afk) {
    const stages = afk.stages;
    if (!isPlainObject(stages)) {
      errors.push("afk.stages must be an object.");
    } else {
      for (const stageId of Object.keys(stages)) {
        if (!knownStageIds.has(stageId)) {
          errors.push(
            `afk.stages.${stageId} is not a stage of any installed recipe.`,
          );
          // Still validate the override shape to surface all problems at once.
        }
        settings.stages[stageId] = validateProfile(
          stages[stageId],
          `afk.stages.${stageId}`,
          errors,
        );
      }
    }
  }

  return settings;
}

/**
 * Load and strictly validate `<config-root>/settings.json`.
 *
 * Only that single path is read. A missing file yields `missing: true` with an
 * errors entry naming the fully resolved expected path and pointing at the
 * copyable example in `cli/README.md`. A JSON syntax error names the file and
 * the parser's position. Otherwise the document is validated against the
 * strict schema and every discovered problem is reported together. No
 * environment interpolation is performed and no file is ever created.
 */
export function loadSettings(
  configRoot: string,
  knownStageIds: ReadonlySet<string>,
): SettingsResult {
  const expectedPath = path.join(configRoot, "settings.json");

  let raw: string;
  try {
    raw = fs.readFileSync(expectedPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        ok: false,
        expectedPath,
        missing: true,
        errors: [
          `No settings file found at ${expectedPath}. Create one; a complete copyable example lives in the "Settings" section of cli/README.md.`,
        ],
      };
    }
    return {
      ok: false,
      expectedPath,
      missing: false,
      errors: [`Cannot read ${expectedPath}: ${(error as Error).message}`],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      expectedPath,
      missing: false,
      errors: [`${expectedPath} is not valid JSON: ${(error as Error).message}`],
    };
  }

  const errors: string[] = [];
  const settings = validateDocument(parsed, knownStageIds, errors);
  if (errors.length > 0) {
    return { ok: false, expectedPath, missing: false, errors };
  }
  return { ok: true, settings };
}
