/**
 * The execution-profile document's envelope, over an already-parsed root:
 * `schemaVersion` exactly `0`, a declared `name` matching the shared raw name
 * grammar, and a stage map. The declared name is the profile's display identity
 * and is unrelated to the filename it was read from. The stage map itself is the
 * shared schema's business, and the emptiness rule is applied here, because a
 * profile must bind at least one stage.
 */

import { isPlainObject } from "../../shared/validation.js";
import { validateStageMap } from "../binding/schema.js";
import type {
  ExecutionProfileResult,
  StageBindingMap,
} from "../binding/types.js";
import { DOCUMENT_NAME_PATTERN, isValidDocumentName } from "../references.js";

export function validateProfileDocument(root: unknown): ExecutionProfileResult {
  if (!isPlainObject(root)) {
    return {
      ok: false,
      errors: ["The execution profile document root must be an object."],
    };
  }

  const errors: string[] = [];
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

  let name: string | undefined;
  if (!("name" in root)) {
    errors.push("name is required.");
  } else if (typeof root.name !== "string" || !isValidDocumentName(root.name)) {
    errors.push(`name must be a string matching ${DOCUMENT_NAME_PATTERN.source}.`);
  } else {
    name = root.name;
  }

  let stages: StageBindingMap | undefined;
  if (!("stages" in root)) {
    errors.push("stages is required and must bind at least one stage.");
  } else {
    const validated = validateStageMap(root.stages, "stages");
    if (!validated.ok) {
      errors.push(...validated.errors);
    } else if (Object.keys(validated.stages).length === 0) {
      // The shared schema accepts an empty container and says nothing about it,
      // so this document's own rule lands exactly where its diagnostic did: after
      // the envelope's, and in place of the per-key diagnostics an empty map has
      // none of.
      errors.push("stages must bind at least one stage.");
    } else {
      stages = validated.stages;
    }
  }

  if (errors.length > 0 || name === undefined || stages === undefined) {
    return { ok: false, errors };
  }
  return { ok: true, profile: { name, stages } };
}
