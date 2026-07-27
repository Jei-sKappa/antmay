import fs from "node:fs";

import {
  DOCUMENT_NAME_PATTERN,
  isValidDocumentName,
} from "../config/references.js";
import { isCatalogStageId } from "./catalog.js";
import type {
  CatalogStageId,
  PipelineDocument,
  PipelineStageEntry,
} from "./types.js";

/**
 * The result of loading one pipeline document from an already resolved source
 * path. A rejected document reports every problem the one load discovered.
 */
export type PipelineDocumentResult =
  | { ok: true; document: PipelineDocument }
  | { ok: false; errors: string[] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validate one `stages` entry: an object with a required catalog `stage` and an
 * optional non-empty `instructions`. Returns `null` when no selection can be
 * formed, having recorded every problem it found.
 *
 * Unknown-field rejection is what keeps a pipeline document portable: an
 * `agent`, `model`, `idleTimeoutSeconds`, `target`, `gitPolicy`,
 * `queueResolution`, `prerequisite`, `promises`, or `prompt` sibling is an
 * unrecognized field here, because every one of them belongs to the catalog or
 * to a local binding rather than to a shared pipeline.
 */
function validateStageEntry(
  value: unknown,
  basePath: string,
  selected: Set<CatalogStageId>,
  errors: string[],
): PipelineStageEntry | null {
  if (!isPlainObject(value)) {
    errors.push(
      `${basePath} must be an object with a "stage" field; a stage entry has no string shorthand.`,
    );
    return null;
  }

  for (const key of Object.keys(value)) {
    if (key !== "stage" && key !== "instructions") {
      errors.push(
        `${basePath}.${key} is not a recognized stage entry field; an entry carries only "stage" and "instructions".`,
      );
    }
  }

  let instructions: string | undefined;
  if ("instructions" in value) {
    if (
      typeof value.instructions !== "string" ||
      value.instructions.length === 0
    ) {
      errors.push(`${basePath}.instructions must be a non-empty string.`);
    } else {
      instructions = value.instructions;
    }
  }

  if (!("stage" in value)) {
    errors.push(`${basePath}.stage is required.`);
    return null;
  }
  if (typeof value.stage !== "string" || !isCatalogStageId(value.stage)) {
    errors.push(
      `${basePath}.stage must name a catalog stage; ${JSON.stringify(value.stage)} is not a supported catalog stage ID.`,
    );
    return null;
  }
  if (selected.has(value.stage)) {
    errors.push(
      `${basePath}.stage repeats "${value.stage}"; a pipeline may select each stage only once.`,
    );
    return null;
  }
  selected.add(value.stage);

  const entry: PipelineStageEntry = { stage: value.stage };
  if (instructions !== undefined) {
    entry.instructions = instructions;
  }
  return entry;
}

/**
 * Validate a pipeline document: `schemaVersion` exactly `0`, a declared `name`
 * matching the shared raw name grammar, and a non-empty `stages` array of
 * entries. There are no pipeline-wide instructions and no other root field.
 */
function validatePipelineDocument(
  root: unknown,
  errors: string[],
): { name: string; stages: PipelineStageEntry[] } {
  const validated: { name: string; stages: PipelineStageEntry[] } = {
    name: "",
    stages: [],
  };

  if (!isPlainObject(root)) {
    errors.push("The pipeline document root must be an object.");
    return validated;
  }

  for (const key of Object.keys(root)) {
    if (key !== "schemaVersion" && key !== "name" && key !== "stages") {
      errors.push(`${key} is not a recognized pipeline field.`);
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
    validated.name = root.name;
  }

  if (!("stages" in root)) {
    errors.push("stages is required and must list at least one stage.");
    return validated;
  }
  if (!Array.isArray(root.stages)) {
    errors.push("stages must be an array of stage entries.");
    return validated;
  }
  if (root.stages.length === 0) {
    errors.push("stages must list at least one stage.");
    return validated;
  }

  const selected = new Set<CatalogStageId>();
  root.stages.forEach((value, index) => {
    const entry = validateStageEntry(value, `stages[${index}]`, selected, errors);
    if (entry !== null) {
      validated.stages.push(entry);
    }
  });

  return validated;
}

/**
 * Load one pipeline document from the absolute source path a reference already
 * resolved to.
 *
 * Exactly that path is read. A missing file is an error rather than a prompt to
 * look elsewhere, because the reference's syntax already fixed where the
 * document lives. The loaded document keeps only what the author owns — the
 * declared identity, the ordered selections, and their portable instructions —
 * and never a copy of any catalog-owned stage definition.
 */
export function loadPipelineDocument(sourcePath: string): PipelineDocumentResult {
  let raw: string;
  try {
    raw = fs.readFileSync(sourcePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        ok: false,
        errors: [`No pipeline document exists at ${sourcePath}.`],
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
  const { name, stages } = validatePipelineDocument(parsed, errors);
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, document: { name, sourcePath, stages } };
}
