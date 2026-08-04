#!/usr/bin/env node

/**
 * Runs demo scenarios against a call-traced build of the CLI and writes, per
 * scenario, the terminal transcript, the ordered call tree, the modules in
 * first-call order, the cross-module edges, the per-function counts, and the
 * raw per-call JSONL. It answers "what actually runs, in what order" for a
 * reader mapping the executor, and sits outside the check gate like the demo it
 * drives.
 *
 * `npm run trace` traces the whole scenario catalog; `--scenario` names a
 * subset. Start at the `README.md` written to the output root.
 *
 * The traced binary behaves exactly like the ordinary one — the wrapper is
 * installed only when `ANTMAY_TRACE_DIR` is set. The demo driver is given the
 * binary through `--cli-binary` and told where to collect traces through
 * `--trace-dir`, so each scenario still runs the same public command surface
 * against the same isolated fixtures, and its transcript is the one an untraced
 * run prints.
 *
 * Two things to know before reading a trace:
 *
 * - **Only a top-level `function` declaration is traced.** Instrumentation
 *   replaces the binding rather than the body, so a `const` holding a function,
 *   a class method or accessor, and a method on a module-scope object literal
 *   each have no binding to replace. Those are listed under "Not instrumented",
 *   so a function missing from a trace is either reported there or genuinely
 *   never called. A function nested inside another is invisible for the same
 *   reason; those are not listed, having no module-level name to be looked for
 *   under.
 * - **The cross-module edges are call sites, not dependencies.** A closure
 *   carries no wrapper, so the calls it makes are recorded against whichever
 *   module invoked the closure — the engine's display and session callbacks
 *   appear under the harness invoker that called them. Every edge whose calling
 *   module does not import the callee is marked `⤴`.
 *
 * The pieces: `trace/instrument.mjs` builds the traced binary, `trace/runtime.ts`
 * is what it records with, `trace/report.mjs` renders a trace directory (and
 * runs standalone over one), and `trace/sources.mjs` is how all three read
 * `src/`.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildTracedCli } from "./trace/instrument.mjs";
import { EDGE_PREAMBLE, edgeLines, renderTraceDirectory } from "./trace/report.mjs";
import { scanFunctions } from "./trace/sources.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEMO = path.join(SCRIPT_DIR, "demo.mjs");
const SCENARIO_DIR = path.join(SCRIPT_DIR, "scenarios");
const USAGE =
  "Usage: node scripts/trace.mjs [--scenario <id>]... [--out <dir>] [--depth <n>]";

function scenarioIds() {
  return readdirSync(SCENARIO_DIR)
    .filter((name) => name.endsWith(".mjs"))
    .map((name) => name.slice(0, -".mjs".length))
    .sort((left, right) => left.localeCompare(right));
}

function parseArgs(argv) {
  const parsed = { scenarios: [], out: undefined, depth: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--scenario" || argument === "-s") {
      if (value === undefined) throw new Error(`${argument} requires an id.\n${USAGE}`);
      parsed.scenarios.push(value);
      index += 1;
      continue;
    }
    if (argument === "--out") {
      if (value === undefined) throw new Error(`--out requires a path.\n${USAGE}`);
      parsed.out = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--depth") {
      parsed.depth = Number.parseInt(value ?? "", 10);
      if (!Number.isInteger(parsed.depth)) {
        throw new Error(`--depth requires an integer.\n${USAGE}`);
      }
      index += 1;
      continue;
    }
    throw new Error(`Unrecognized argument: ${argument}\n${USAGE}`);
  }
  return parsed;
}

function stamp() {
  return new Date().toISOString().replaceAll(/[-:]/g, "").slice(0, 15);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const available = scenarioIds();
  const unknown = args.scenarios.filter((id) => !available.includes(id));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown scenario(s): ${unknown.join(", ")}\nAvailable:\n  ${available.join("\n  ")}`,
    );
  }
  const selected = args.scenarios.length > 0 ? args.scenarios : available;
  const outRoot = args.out ?? `/tmp/antmay-trace-${stamp()}`;
  mkdirSync(outRoot, { recursive: true });

  console.log("Building the call-traced CLI...");
  const { modules, wrapped, binary } = buildTracedCli({ quiet: true });
  console.log(`  ${wrapped} functions instrumented across ${modules} modules.`);
  console.log(`Output root: ${outRoot}\n`);

  const index = [];
  for (const [position, id] of selected.entries()) {
    const scenarioDir = path.join(outRoot, id);
    const traceDir = path.join(scenarioDir, "raw");
    // Every `trace-*.jsonl` in the directory is rendered as one process, so a
    // scenario retraced over its own earlier output would report both runs as
    // one. Each scenario starts from an empty directory.
    rmSync(scenarioDir, { recursive: true, force: true });
    mkdirSync(traceDir, { recursive: true });
    process.stdout.write(
      `[${String(position + 1).padStart(2)}/${selected.length}] ${id} … `,
    );

    const demo = spawnSync(
      process.execPath,
      [
        DEMO,
        "--scenario",
        id,
        "--cli-binary",
        binary,
        "--trace-dir",
        traceDir,
        "--no-color",
      ],
      { cwd: CLI_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    const transcript = `${demo.stdout ?? ""}${demo.stderr ?? ""}`;
    writeFileSync(path.join(scenarioDir, "transcript.txt"), transcript);

    let rendered;
    try {
      rendered = renderTraceDirectory(traceDir, { maxDepth: args.depth });
      writeFileSync(path.join(scenarioDir, "calls.txt"), `${rendered.text}\n`);
    } catch (error) {
      console.log(`render failed: ${error.message}`);
      continue;
    }

    const passed = demo.status === 0 && transcript.includes("[PASS]");
    index.push({ id, ...rendered, passed });
    console.log(
      `${rendered.processes} process(es), ${rendered.calls} calls${passed ? "" : "  ⚠ scenario did not pass"}`,
    );
  }

  writeFileSync(path.join(outRoot, "README.md"), renderIndex(index, available.length));
  console.log(`\nWrote ${index.length} traced scenario(s).`);
  console.log(`Start at ${path.join(outRoot, "README.md")}`);
  if (index.some((entry) => !entry.passed)) process.exitCode = 1;
}

function renderIndex(entries, catalogSize) {
  const allEdges = new Map();
  const allFunctions = new Map();
  for (const entry of entries) {
    for (const [edge, count] of entry.edges) {
      allEdges.set(edge, (allEdges.get(edge) ?? 0) + count);
    }
    for (const [name, count] of entry.functions) {
      allFunctions.set(name, (allFunctions.get(name) ?? 0) + count);
    }
  }

  const { declared, uninstrumented } = scanFunctions();
  const uncalled = declared.filter((name) => !allFunctions.has(name));
  const traced = `${entries.length} of ${catalogSize} scenario${catalogSize === 1 ? "" : "s"}`;

  const lines = [
    "# Antmay CLI call traces",
    "",
    `Generated ${new Date().toISOString()} from \`node scripts/trace.mjs\`, over ${traced}.`,
    "",
    "Each scenario directory holds:",
    "",
    "- `transcript.txt` — what the demo printed",
    "- `calls.txt` — the call tree, the modules in first-call order, the",
    "  cross-module edges, and the per-function counts",
    "- `raw/trace-<pid>.jsonl` — one line per call, for your own queries",
    "",
    "## Scenarios",
    "",
    "| Scenario | Processes | Calls | Distinct functions | Modules |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...entries.map(
      (entry) =>
        `| [${entry.id}](${entry.id}/calls.txt)${entry.passed ? "" : " ⚠"} | ${entry.processes} | ${entry.calls} | ${entry.functions.size} | ${new Set([...entry.functions.keys()].map((key) => key.split(" · ")[0])).size} |`,
    ),
    "",
    "## Cross-module calls, all traced scenarios",
    "",
    ...EDGE_PREAMBLE,
    "",
    "```",
    ...edgeLines(allEdges, 6),
    "```",
    "",
    `## Functions no traced scenario called (${uncalled.length})`,
    "",
    "```",
    ...(uncalled.length === 0 ? ["(none)"] : uncalled),
    "```",
    "",
    ...notInstrumentedSection(uninstrumented),
  ];
  return lines.join("\n");
}

/**
 * The functions a trace cannot show, so their absence above is not read as
 * dead code. Omitted entirely once there are none.
 */
function notInstrumentedSection(uninstrumented) {
  if (uninstrumented.length === 0) return [];
  return [
    "## Not instrumented",
    "",
    "Reachable by name but not declared as a top-level function, so there is no",
    "binding to replace and no call to one of these appears anywhere in a trace.",
    "An `Owner.member` entry is a class method or accessor, or a method on a",
    "module-scope object literal; a bare name is a `const` holding a function:",
    "",
    "```",
    ...uninstrumented,
    "```",
    "",
  ];
}

try {
  main();
} catch (error) {
  console.error(error.message ?? error);
  process.exitCode = 1;
}
