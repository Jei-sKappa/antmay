/**
 * The settings document's disk semantics: which path is read, what a missing
 * file means, and how a failure names the file it came from.
 */

import fs from "node:fs";
import path from "node:path";

import type { StageSettingsResult } from "../binding/types.js";
import { validateSettingsDocument } from "./validate.js";

/**
 * Load the optional `<config-root>/settings.json`.
 *
 * Only that single path is read, and no file is ever created. A missing file is
 * not an error: it behaves exactly as the canonical empty document
 * `{"afk":{"stages":{}}}`, so a complete execution profile can run without any
 * settings file at all. A present file is validated strictly, and every
 * discovered problem is reported together against the resolved path this loader
 * is the only party to know. No environment interpolation is performed.
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

  const validated = validateSettingsDocument(parsed);
  if (!validated.ok) {
    return { ok: false, sourcePath, errors: validated.errors };
  }
  return { ok: true, stages: validated.stages };
}
