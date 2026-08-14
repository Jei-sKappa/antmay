/**
 * The execution-profile document's disk semantics: exactly one path is read, and
 * a missing document there is an error rather than a search.
 */

import fs from "node:fs";

import type { ExecutionProfileResult } from "../binding/types.js";
import { validateProfileDocument } from "./validate.js";

/**
 * Load one execution-profile document from the absolute source path a reference
 * already resolved to.
 *
 * Exactly that path is read. A missing file is an error rather than a prompt to
 * look elsewhere, because the reference's syntax already fixed where the
 * document lives. The failure names no source path of its own: the caller
 * resolved the path it passed in and uses that same value in its refusal.
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

  return validateProfileDocument(parsed);
}
