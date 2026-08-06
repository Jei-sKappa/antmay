import { promises as fs } from "node:fs";
import path from "node:path";

import type { CheckpointResult } from "./checkpoint/types.js";
import { validateCheckpoint } from "./checkpoint/validate.js";

/**
 * Read and validate `<runDir>/state.json`. Only `state.json` is authoritative;
 * leftover temp files are ignored. A missing or unreadable file, malformed
 * JSON, or a schema/invariant violation all return a failed result carrying
 * human-readable errors.
 *
 * Loading a checkpoint lives deliberately apart from the writer: a consumer that
 * may only read one — a resume preflight — then cannot reach a writer through the
 * module it reads from.
 */
export async function readCheckpoint(runDir: string): Promise<CheckpointResult> {
  const statePath = path.join(runDir, "state.json");

  let raw: string;
  try {
    raw = await fs.readFile(statePath, "utf8");
  } catch (error) {
    return {
      ok: false,
      errors: [`Cannot read ${statePath}: ${(error as Error).message}`],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      errors: [`${statePath} is not valid JSON: ${(error as Error).message}`],
    };
  }

  return validateCheckpoint(parsed);
}
