/**
 * Where the scenario catalog lives, and what order it reads in.
 *
 * A scenario's id is its filename stem, so a new scenario is a new file and
 * nothing else. Every id carries a zero-padded ordering prefix, so plain lexical
 * order is the intended reading order: a normal run, then the pauses a user meets
 * routinely, then the ways a stage fails, then the rare and the cosmetic.
 *
 * The driver, the whole-catalog runner, and the call tracer all reach the catalog
 * through here, so that order is stated once.
 */

import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SCENARIO_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../scenarios",
);

/** Every scenario id on disk, in reading order. */
export function scenarioIds() {
  return readdirSync(SCENARIO_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mjs"))
    .map((entry) => entry.name.slice(0, -".mjs".length))
    .sort((left, right) => left.localeCompare(right));
}
