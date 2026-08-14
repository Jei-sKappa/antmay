/**
 * The settings document's envelope, over an already-parsed root: exactly one
 * root field `afk`, holding exactly one field `stages`, holding a possibly empty
 * stage-binding map. The stage map itself is the shared schema's business, and
 * the emptiness rule is applied here, because a settings document may bind zero
 * stages.
 */

import { isPlainObject } from "../../shared/validation.js";
import { validateStageMap } from "../binding/schema.js";
import type { SettingsValidation } from "../binding/types.js";

export function validateSettingsDocument(root: unknown): SettingsValidation {
  if (!isPlainObject(root)) {
    return { ok: false, errors: ["The settings document root must be an object."] };
  }

  const errors: string[] = [];
  for (const key of Object.keys(root)) {
    if (key !== "afk") {
      errors.push(
        `${key} is not a recognized top-level field; the only root field is "afk".`,
      );
    }
  }

  if (!("afk" in root)) {
    errors.push('afk is required; a settings document is {"afk":{"stages":{}}}.');
    return { ok: false, errors };
  }

  const afk = root.afk;
  if (!isPlainObject(afk)) {
    errors.push("afk must be an object.");
    return { ok: false, errors };
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
    return { ok: false, errors };
  }

  const stages = validateStageMap(afk.stages, "afk.stages");
  if (!stages.ok) {
    return { ok: false, errors: [...errors, ...stages.errors] };
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, stages: stages.stages };
}
