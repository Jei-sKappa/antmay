/**
 * The stage-binding schema both local documents accept, at every depth it has:
 * a map of bindings, one binding, its optional timing fields, and its atomic
 * agent pair. One module answers the whole question a reader brings — what a
 * stage binding may contain and what each violation says — and both documents
 * reach it, because duplicated validation is how two documents' diagnostics
 * drift apart.
 *
 * The schema holds no opinion about whether a stage map may be empty: an empty
 * map produces no diagnostics here, and each document applies its own emptiness
 * rule at its own call site.
 */

import { HARNESS_IDS, isHarnessId } from "../../harness/id.js";
import type { HarnessId } from "../../harness/id.js";
import { isCatalogStageId } from "../../pipeline/catalog.js";
import { isPlainObject } from "../../shared/validation.js";

import type {
  AgentBinding,
  StageBinding,
  StageBindingMap,
  StageMapValidation,
} from "./types.js";

/** One optional timing field: absent, a usable value, or the one problem it has. */
type TimingValidation =
  | { ok: true; value: number | undefined }
  | { ok: false; error: string };

type AgentValidation =
  | { ok: true; agent: AgentBinding }
  | { ok: false; errors: string[] };

type BindingValidation =
  | { ok: true; binding: StageBinding }
  | { ok: false; errors: string[] };

/** Validate one optional positive-integer timing field. */
function validateTimingField(
  container: Record<string, unknown>,
  field: "idleTimeoutSeconds" | "heartbeatSeconds",
  basePath: string,
): TimingValidation {
  if (!(field in container)) {
    return { ok: true, value: undefined };
  }
  const value = container[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return {
      ok: false,
      error: `${basePath}.${field} must be a positive integer.`,
    };
  }
  return { ok: true, value };
}

/**
 * Validate the atomic `agent` object: exactly a supported `harness` and a
 * non-empty `model`. Every problem the pair has is reported, and an unknown
 * field fails it even when the pair itself could be formed.
 */
function validateAgent(value: unknown, basePath: string): AgentValidation {
  if (!isPlainObject(value)) {
    return { ok: false, errors: [`${basePath} must be an object.`] };
  }

  const errors: string[] = [];
  for (const key of Object.keys(value)) {
    if (key !== "harness" && key !== "model") {
      errors.push(`${basePath}.${key} is not a recognized agent field.`);
    }
  }

  let harness: HarnessId | undefined;
  if (!("harness" in value)) {
    errors.push(`${basePath}.harness is required.`);
  } else if (!isHarnessId(value.harness)) {
    errors.push(
      `${basePath}.harness must be one of ${HARNESS_IDS.map((id) => `"${id}"`).join(" or ")}.`,
    );
  } else {
    harness = value.harness;
  }

  let model: string | undefined;
  if (!("model" in value)) {
    errors.push(`${basePath}.model is required.`);
  } else if (typeof value.model !== "string" || value.model.length === 0) {
    errors.push(`${basePath}.model must be a non-empty string.`);
  } else {
    model = value.model;
  }

  if (errors.length > 0 || harness === undefined || model === undefined) {
    return { ok: false, errors };
  }
  return { ok: true, agent: { harness, model } };
}

/**
 * Validate one stage binding. Every problem the binding has is reported, in the
 * order the fields are checked: unknown fields, then the timing fields, then the
 * agent pair. Prompt and instructions fields are rejected here as the unknown
 * fields they are.
 */
function validateBinding(value: unknown, basePath: string): BindingValidation {
  if (!isPlainObject(value)) {
    return { ok: false, errors: [`${basePath} must be an object.`] };
  }

  const errors: string[] = [];
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
  );
  if (!idleTimeoutSeconds.ok) {
    errors.push(idleTimeoutSeconds.error);
  }
  const heartbeatSeconds = validateTimingField(
    value,
    "heartbeatSeconds",
    basePath,
  );
  if (!heartbeatSeconds.ok) {
    errors.push(heartbeatSeconds.error);
  }

  if (!("agent" in value)) {
    errors.push(`${basePath}.agent is required.`);
    return { ok: false, errors };
  }
  const agent = validateAgent(value.agent, `${basePath}.agent`);
  if (!agent.ok) {
    return { ok: false, errors: [...errors, ...agent.errors] };
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const binding: StageBinding = { agent: agent.agent };
  if (idleTimeoutSeconds.ok && idleTimeoutSeconds.value !== undefined) {
    binding.idleTimeoutSeconds = idleTimeoutSeconds.value;
  }
  if (heartbeatSeconds.ok && heartbeatSeconds.value !== undefined) {
    binding.heartbeatSeconds = heartbeatSeconds.value;
  }
  return { ok: true, binding };
}

/**
 * Validate a stage-binding container against the schema both local documents
 * share. Every key must name a catalog stage — an unknown ID invalidates the
 * containing document — and every value must be a complete binding. An unknown
 * key's binding is still validated, so one pass reports every problem the
 * container has.
 */
export function validateStageMap(
  value: unknown,
  basePath: string,
): StageMapValidation {
  if (!isPlainObject(value)) {
    return { ok: false, errors: [`${basePath} must be an object.`] };
  }

  const stages: StageBindingMap = {};
  const errors: string[] = [];
  for (const key of Object.keys(value)) {
    const binding = validateBinding(value[key], `${basePath}.${key}`);
    if (!binding.ok) {
      errors.push(...binding.errors);
    }
    if (!isCatalogStageId(key)) {
      errors.push(`${basePath}.${key} is not a supported catalog stage ID.`);
      continue;
    }
    if (binding.ok) {
      stages[key] = binding.binding;
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, stages };
}
