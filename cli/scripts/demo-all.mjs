#!/usr/bin/env node

/**
 * Runs the whole demo scenario catalog and reports it as one verdict.
 *
 * `npm run demo` drives one scenario for a developer to read; this drives every
 * scenario for an answer. Each one runs in its own child of `demo.mjs`, through
 * the same `--cli-binary` seam `scripts/trace.mjs` uses, against that scenario's
 * own isolated fixtures. It passes no `--no-color`, so a batch run asserts
 * byte-identical output to a manual one.
 *
 * The whole catalog runs before anything is reported, rather than stopping at the
 * first failure, because that is what makes the result usable after a refactor
 * touches many renderings at once. A failing scenario's captured transcript is
 * printed in full so the failure is diagnosable without re-running it; a passing
 * one prints nothing beyond its line.
 *
 * Scenarios run serially and the wall clock is printed, because the fixtures are
 * cheap to isolate but the binary is spawned per invocation, and that number is
 * what a decision about which gate this suite belongs in rests on. Like the demo
 * it drives, it sits outside `npm run check`.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { scenarioIds } from "./demo/catalog.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEMO = path.join(SCRIPT_DIR, "demo.mjs");
const DIST_MAIN = path.join(CLI_ROOT, "dist", "main.js");
const RULE = "=".repeat(76);

function seconds(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Build the CLI once, so no scenario child pays for it. */
function buildCli() {
  const started = Date.now();
  process.stdout.write("Building CLI (tests are not run)... ");
  const build = spawnSync("npm", ["run", "build"], {
    cwd: CLI_ROOT,
    encoding: "utf8",
  });
  if (build.status !== 0) {
    throw new Error(
      `The CLI build failed.\n${build.stdout ?? ""}${build.stderr ?? ""}`.trimEnd(),
    );
  }
  const elapsed = Date.now() - started;
  console.log(seconds(elapsed));
  return elapsed;
}

/**
 * Run one scenario and keep everything it printed. `demo.mjs` exits non-zero
 * exactly when a step's exit code or a required marker did not hold, so its
 * status is this scenario's verdict.
 */
function runScenario(id) {
  const started = Date.now();
  const demo = spawnSync(
    process.execPath,
    [DEMO, "--scenario", id, "--cli-binary", DIST_MAIN],
    { cwd: CLI_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return {
    id,
    passed: demo.status === 0,
    transcript: `${demo.stdout ?? ""}${demo.stderr ?? ""}`,
    elapsedMs: Date.now() - started,
  };
}

function main() {
  const extra = process.argv.slice(2);
  if (extra.length > 0) {
    throw new Error(
      `Unrecognized argument: ${extra[0]}\n` +
        "Usage: node scripts/demo-all.mjs\n" +
        "Run one scenario with: npm run demo -- --scenario <id>",
    );
  }

  const ids = scenarioIds();
  if (ids.length === 0) {
    throw new Error("No scenario modules found.");
  }

  const buildMs = buildCli();
  console.log(`Running ${ids.length} scenarios serially.\n`);

  const started = Date.now();
  const results = [];
  for (const [position, id] of ids.entries()) {
    process.stdout.write(
      `[${String(position + 1).padStart(String(ids.length).length)}/${ids.length}] ${id} … `,
    );
    const result = runScenario(id);
    results.push(result);
    console.log(`${result.passed ? "pass" : "FAIL"}  ${seconds(result.elapsedMs)}`);
  }
  const catalogMs = Date.now() - started;

  const failures = results.filter((result) => !result.passed);
  for (const failure of failures) {
    console.log(`\n${RULE}\n${failure.id} — full transcript\n${RULE}`);
    console.log(failure.transcript.trimEnd());
  }

  console.log(
    `\n${results.length - failures.length}/${results.length} scenarios passed.`,
  );
  console.log(
    `Catalog: ${seconds(catalogMs)} (build ${seconds(buildMs)}, total ${seconds(buildMs + catalogMs)}).`,
  );
  if (failures.length > 0) {
    console.log(`Failed: ${failures.map((failure) => failure.id).join(", ")}`);
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error.message ?? error);
  process.exitCode = 1;
}
