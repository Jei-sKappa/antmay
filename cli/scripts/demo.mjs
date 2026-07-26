#!/usr/bin/env node

/**
 * Developer demo driver. Builds the CLI, stands up a disposable repository under
 * `/tmp`, and executes one scenario's ordered steps against it.
 *
 * The driver is deliberately generic: it knows how to run the built CLI, how to
 * run a scenario-supplied action, and how to compare exit codes. Everything a
 * particular scenario needs — which scripted cases run, what the fixture looks
 * like partway through, which flags a command carries — lives in that scenario's
 * own file under `scripts/scenarios/`.
 */

import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = path.resolve(SCRIPT_DIR, "..");
const DIST_MAIN = path.join(CLI_ROOT, "dist", "main.js");
const SCENARIO_DIR = path.join(SCRIPT_DIR, "scenarios");
// Picked when the prompt is answered with Enter. Scenario ids carry an ordering
// prefix, so this is also the one that sorts first.
const DEFAULT_SCENARIO_ID = "01-all-done";
const SCRIPTED_TOGGLE = "ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS";
const DEFAULT_RECIPE = "standard";
const USAGE =
  "Usage: node scripts/demo.mjs [--scenario <id>] [--list] [--no-color] [--show-demo-summary]";

class DemoError extends Error {}

function fail(message) {
  throw new DemoError(message);
}

function command(commandName, args, options = {}) {
  const capture = options.capture === true;
  const result = spawnSync(commandName, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  const error =
    result.error?.message ??
    (result.signal !== null
      ? `terminated by ${result.signal}`
      : result.status === 0
        ? undefined
        : capture && result.stderr?.trim()
          ? result.stderr.trim()
          : `exit ${result.status}`);
  return {
    ok: error === undefined,
    status: result.status,
    output: capture ? (result.stdout ?? "") : "",
    error,
  };
}

/**
 * Run the built CLI to completion, inheriting the terminal so its stream is what
 * the developer sees. When the step carries a `during` hook it is fired once the
 * child has been alive for `afterMs`, so a scenario can act on a live run.
 */
function runChild(step, ctx, childEnv) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [DIST_MAIN, ...step.argv(ctx)], {
      cwd: ctx.repoRoot,
      env: childEnv,
      stdio: "inherit",
    });
    let timer;
    if (step.during !== undefined) {
      timer = setTimeout(() => {
        Promise.resolve(step.during(ctx, child)).catch((error) => {
          console.error(`  during-hook failed: ${error.message}`);
        });
      }, step.afterMs);
      timer.unref();
    }
    child.on("error", (error) => {
      if (timer !== undefined) clearTimeout(timer);
      resolve({ actual: error.message });
    });
    child.on("close", (code, signal) => {
      if (timer !== undefined) clearTimeout(timer);
      // A child killed outright reports the conventional 128 + signum, which is
      // what the CLI's own handlers would have exited with had they won the
      // race; either way the number is what the scenario is checked against.
      resolve({ actual: code === null ? 128 + signalNumber(signal) : code });
    });
  });
}

function signalNumber(signal) {
  return { SIGHUP: 1, SIGINT: 2, SIGTERM: 15 }[signal] ?? 0;
}

async function loadScenarios() {
  let entries;
  try {
    entries = readdirSync(SCENARIO_DIR, { withFileTypes: true });
  } catch (error) {
    fail(`Cannot read ${SCENARIO_DIR}: ${error.message}`);
  }
  // Every id carries a zero-padded ordering prefix, so plain lexical order is
  // the intended reading order: a normal run, then the pauses a user meets
  // routinely, then the ways a stage fails, then the rare and the cosmetic.
  const ids = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mjs"))
    .map((entry) => entry.name.slice(0, -".mjs".length))
    .sort((left, right) => left.localeCompare(right));
  if (ids.length === 0) {
    fail(`No scenario modules found under ${SCENARIO_DIR}.`);
  }
  const scenarios = new Map();
  for (const id of ids) {
    const module = await import(
      pathToFileURL(path.join(SCENARIO_DIR, `${id}.mjs`)).href
    );
    scenarios.set(id, { id, ...module.default });
  }
  return scenarios;
}

// npm's own parser claims every `-`-prefixed token that precedes `--`, so
// `npm run demo --list` never forwards the flag: npm keeps it as one of its
// configs and it reaches us only as an `npm_config_*` variable. Left
// undetected, that invocation looks exactly like a bare `npm run demo` and
// silently opens the selection prompt instead.
const NPM_SWALLOWED_FLAGS = new Map([
  ["npm_config_list", "--list"],
  ["npm_config_scenario", "--scenario"],
  ["npm_config_show_demo_summary", "--show-demo-summary"],
]);

function assertFlagsWereForwarded() {
  const swallowed = [...NPM_SWALLOWED_FLAGS]
    .filter(([variable]) => process.env[variable] !== undefined)
    .map(([, flag]) => flag);
  if (swallowed.length === 0) {
    return;
  }
  fail(
    `npm kept ${swallowed.join(" and ")} for itself instead of passing ${
      swallowed.length === 1 ? "it" : "them"
    } to the demo.\n` +
      "Put `--` before the demo's own flags:\n" +
      "  npm run demo -- --list\n" +
      USAGE,
  );
}

// `--no-color` is the one flag npm both swallows and answers itself, so take
// npm's answer rather than insisting on the `--` form for it.
function npmDisabledColor() {
  const color = process.env.npm_config_color;
  return color === "" || color === "false";
}

function parseArgs(argv) {
  const parsed = {
    scenarioId: undefined,
    list: false,
    showSummary: false,
    noColor: npmDisabledColor(),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--list") {
      parsed.list = true;
      continue;
    }
    if (argument === "--show-demo-summary") {
      parsed.showSummary = true;
      continue;
    }
    if (argument === "--no-color") {
      parsed.noColor = true;
      continue;
    }
    if (argument === "--scenario" || argument === "-s") {
      parsed.scenarioId = argv[index + 1];
      index += 1;
      if (parsed.scenarioId === undefined) {
        fail(`${argument} requires a scenario id.\n${USAGE}`);
      }
      continue;
    }
    fail(`Unrecognized argument: ${argument}\n${USAGE}`);
  }
  return parsed;
}

function describeScenarios(scenarios) {
  return [...scenarios.values()]
    .map((scenario) => `  ${scenario.id} — ${scenario.label}`)
    .join("\n");
}

/**
 * Resolve one scenario from what a human typed: the whole id (`03-refused`),
 * its ordering number alone (`3`), or just its name (`refused`). Naming a
 * scenario should not require remembering which number it sits at.
 */
function findScenario(scenarios, answer) {
  const exact = scenarios.get(answer);
  if (exact !== undefined) {
    return exact;
  }
  const asNumber = Number.parseInt(answer, 10);
  if (String(asNumber) === answer.replace(/^0+(?=\d)/, "")) {
    const padded = String(asNumber).padStart(2, "0");
    const numbered = [...scenarios.values()].find((scenario) =>
      scenario.id.startsWith(`${padded}-`),
    );
    if (numbered !== undefined) {
      return numbered;
    }
  }
  return [...scenarios.values()].find(
    (scenario) => scenario.id.replace(/^\d+-/, "") === answer,
  );
}

async function selectScenario(scenarios, requestedId) {
  if (requestedId !== undefined) {
    const scenario = findScenario(scenarios, requestedId);
    if (scenario === undefined) {
      fail(
        `Unknown scenario: ${requestedId}\nAvailable scenarios:\n${describeScenarios(scenarios)}`,
      );
    }
    return scenario;
  }
  if (process.stdin.isTTY !== true) {
    fail(
      `No scenario selected and stdin is not a terminal.\nPass --scenario <id>. Available scenarios:\n${describeScenarios(scenarios)}`,
    );
  }

  const choices = [...scenarios.values()];
  const fallback = scenarios.get(DEFAULT_SCENARIO_ID) ?? choices[0];
  console.log("Available scenarios:");
  for (const scenario of choices) {
    const marker = scenario === fallback ? " (default)" : "";
    // The id already carries its number, so it is not printed twice.
    console.log(`  ${scenario.id} — ${scenario.label}${marker}`);
  }

  // A whole line rather than one keypress: the catalog is longer than a single
  // digit can address, and naming what you want beats counting down the list.
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let answer;
  try {
    answer = (
      await rl.question(`Scenario [number, name, or id — Enter for ${fallback.id}]: `)
    ).trim();
  } finally {
    rl.close();
  }
  if (answer === "") {
    return fallback;
  }
  const picked = findScenario(scenarios, answer);
  if (picked === undefined) {
    fail(`Not a listed choice: ${JSON.stringify(answer)}`);
  }
  return picked;
}

function resolveRealConfigRoot() {
  for (const [variable, segments] of [
    ["ANTMAY_CONFIG_HOME", []],
    ["XDG_CONFIG_HOME", ["antmay"]],
  ]) {
    const value = process.env[variable];
    if (value === undefined || value === "") {
      continue;
    }
    if (!path.isAbsolute(value)) {
      fail(`${variable} must be an absolute path, got: ${value}`);
    }
    return path.normalize(path.join(value, ...segments));
  }
  const userHome = homedir();
  if (userHome === "") {
    fail("Cannot resolve the config root: the home directory is empty.");
  }
  return path.join(userHome, ".config", "antmay");
}

function threadTimestamp() {
  return `${new Date()
    .toISOString()
    .slice(2, 19)
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace("T", "")}Z`;
}

function separator(label) {
  console.log(`\n==================== ${label} ====================`);
}

function prepareFixtureRepo(repoRoot, threadSlug) {
  const threadName = `${threadTimestamp()}-${threadSlug}`;
  const threadRoot = path.join(repoRoot, "docs", "threads", threadName);
  mkdirSync(threadRoot, { recursive: true });
  writeFileSync(
    path.join(repoRoot, ".gitignore"),
    ".pending-decisions/\n.pending-reviews/\n.implementation-runs/\n",
  );
  writeFileSync(
    path.join(threadRoot, "seed.md"),
    "# Seed\n\nDrive the scripted CLI demo.\n",
  );
  writeFileSync(
    path.join(threadRoot, "decisions.md"),
    "# Decisions\n\nDR1: Run the Standard recipe.\n",
  );

  const disabledHooks = path.join(repoRoot, ".git", "hooks-disabled");
  const steps = [
    ["initialize repository", ["init", "--quiet"]],
    ["set email", ["config", "user.email", "afk@example.com"]],
    ["set name", ["config", "user.name", "AFK Scripted Demo"]],
    ["disable signing", ["config", "commit.gpgsign", "false"]],
  ];
  for (const [label, args] of steps) {
    const result = command("git", args, { cwd: repoRoot, capture: true });
    if (!result.ok) {
      fail(`Cannot prepare the fixture repository (${label}): ${result.error}`);
    }
  }
  mkdirSync(disabledHooks);
  for (const [label, args] of [
    ["disable hooks", ["config", "core.hooksPath", disabledHooks]],
    ["stage genesis", ["add", "-A"]],
    ["commit genesis", ["commit", "--quiet", "-m", "chore: fixture genesis"]],
  ]) {
    const result = command("git", args, { cwd: repoRoot, capture: true });
    if (!result.ok) {
      fail(`Cannot prepare the fixture repository (${label}): ${result.error}`);
    }
  }
  return { threadName, threadRoot };
}

/**
 * Merge a scenario's profile overrides into the copied settings file's
 * `afk.defaults`. The developer's own harness and model survive; only the fields
 * the scenario names are replaced.
 */
function applySettingsDefaults(settingsPath, overrides) {
  let document;
  try {
    document = JSON.parse(readFileSync(settingsPath, "utf8"));
  } catch (error) {
    fail(`Cannot read the demo settings at ${settingsPath}: ${error.message}`);
  }
  document.afk ??= {};
  document.afk.defaults = { ...(document.afk.defaults ?? {}), ...overrides };
  writeFileSync(settingsPath, `${JSON.stringify(document, null, 2)}\n`);
}

function listRunIds(stateRoot) {
  try {
    return readdirSync(path.join(stateRoot, "afk-runs"), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

function soleRunId(stateRoot) {
  const runIds = listRunIds(stateRoot);
  if (runIds.length !== 1) {
    fail(
      `Expected exactly one run directory under ${path.join(stateRoot, "afk-runs")}, found ${runIds.length}.`,
    );
  }
  return runIds[0];
}

function printSummary(context) {
  const { repoRoot, threadName, stateRoot, configRoot, runId } = context;
  const git = (args) => command("git", args, { cwd: repoRoot, capture: true });

  separator("DEMO SUMMARY");
  console.log(`Repository: ${repoRoot}`);
  console.log(`Thread:     ${threadName}`);
  if (runId !== undefined) {
    console.log(`Run:        ${runId}`);
    console.log(
      `Checkpoint: ${path.join(stateRoot, "afk-runs", runId, "state.json")}`,
    );
  }

  const history = git(["log", "--format=%h %s", "--reverse"]);
  console.log("\nCommits:");
  console.log(
    history.ok
      ? history.output.trimEnd().replace(/^/gm, "  ")
      : `  <unavailable: ${history.error}>`,
  );

  const status = git(["status", "--porcelain=v1"]);
  const worktree = status.ok ? status.output.trimEnd() : undefined;
  console.log("\nWorking tree:");
  console.log(
    worktree === undefined
      ? `  <unavailable: ${status.error}>`
      : worktree === ""
        ? "  clean"
        : worktree.replace(/^/gm, "  "),
  );

  console.log("\nInspect further with:");
  console.log(
    `  ANTMAY_CONFIG_HOME=${configRoot} ANTMAY_STATE_HOME=${stateRoot} \\\n    ${SCRIPTED_TOGGLE}=1 \\\n    node ${DIST_MAIN} afk list`,
  );
}

async function main() {
  assertFlagsWereForwarded();
  const args = parseArgs(process.argv.slice(2));
  const scenarios = await loadScenarios();
  if (args.list) {
    console.log(`Available scenarios:\n${describeScenarios(scenarios)}`);
    return;
  }
  const scenario = await selectScenario(scenarios, args.scenarioId);

  const realConfigRoot = resolveRealConfigRoot();
  const realSettings = path.join(realConfigRoot, "settings.json");

  console.log("\nBuilding CLI (tests are not run)...");
  const build = command("npm", ["run", "build"], { cwd: CLI_ROOT });
  if (!build.ok) {
    fail(`The CLI build failed: ${build.error}`);
  }

  const demoRoot = realpathSync(mkdtempSync(`/tmp/antmay-demo-${scenario.id}-`));
  const configRoot = path.join(demoRoot, "config");
  const stateRoot = path.join(demoRoot, "state");
  const repoRoot = path.join(demoRoot, "repo");
  mkdirSync(configRoot);
  mkdirSync(stateRoot);
  mkdirSync(repoRoot);

  const demoSettings = path.join(configRoot, "settings.json");
  try {
    copyFileSync(realSettings, demoSettings);
  } catch (error) {
    fail(
      `Cannot copy ${realSettings} into the demo config root: ${error.message}\nCreate that settings file before running the demo.`,
    );
  }
  // A scenario that needs a different profile than the developer's own says so
  // in `settingsDefaults`, which is merged over the copied `afk.defaults`.
  if (scenario.settingsDefaults !== undefined) {
    applySettingsDefaults(demoSettings, scenario.settingsDefaults);
  }
  writeFileSync(
    path.join(configRoot, "scripted-harness.json"),
    `${JSON.stringify(scenario.scenario, null, 2)}\n`,
  );

  const { threadName, threadRoot } = prepareFixtureRepo(repoRoot, scenario.id);

  console.log(`\nScenario:   ${scenario.id} — ${scenario.label}`);
  console.log(`Repository: ${repoRoot}`);
  console.log(`Thread:     ${threadName}`);
  // Scenarios whose shape is not self-evident explain themselves here, so the
  // reason for an extra invocation is on screen rather than in the source.
  if (scenario.note !== undefined) {
    console.log(`\nNote: ${scenario.note}`);
  }

  const childEnv = {
    ...process.env,
    ANTMAY_CONFIG_HOME: configRoot,
    ANTMAY_STATE_HOME: stateRoot,
    [SCRIPTED_TOGGLE]: "1",
    ...(args.noColor ? { NO_COLOR: "1" } : {}),
  };

  // Everything a scenario's own action steps are given. The run identifiers are
  // resolved lazily, because the earliest steps run before any run exists.
  const cleanups = [];
  const ctx = {
    repoRoot,
    threadRoot,
    threadName,
    stateRoot,
    configRoot,
    demoRoot,
    recipe: scenario.recipe ?? DEFAULT_RECIPE,
    runId: () => soleRunId(stateRoot),
    runDir: () => path.join(stateRoot, "afk-runs", soleRunId(stateRoot)),
    // Registered by an action that made something unreadable or unwritable, so
    // the temporary tree is still inspectable after the demo ends.
    onCleanup: (restore) => cleanups.push(restore),
  };

  let failed = false;
  try {
    for (const step of scenario.steps) {
      if (step.kind === "action") {
        console.log(`\n[SETUP] ${step.describe}`);
        await step.perform(ctx);
        continue;
      }

      const label = `antmay ${step.argv(ctx).join(" ")}`;
      separator("ANTMAY DEMO STARTED");
      const { actual } = await runChild(step, ctx, childEnv);
      separator("ANTMAY DEMO FINISHED");

      const ok = actual === step.expectExit;
      console.log(
        ok
          ? `[PASS] ${label} exited ${step.expectExit}`
          : `[FAIL] ${label} — expected exit ${step.expectExit}, got ${JSON.stringify(actual)}`,
      );
      if (!ok) {
        failed = true;
        break;
      }
    }
  } finally {
    for (const restore of cleanups.reverse()) {
      try {
        restore();
      } catch (error) {
        console.error(`  cleanup failed: ${error.message}`);
      }
    }
  }

  if (args.showSummary) {
    const runIds = listRunIds(stateRoot);
    printSummary({
      repoRoot,
      threadName,
      stateRoot,
      configRoot,
      runId: runIds.length === 1 ? runIds[0] : undefined,
    });
  }
  if (failed) {
    process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof DemoError ? error.message : error);
  process.exitCode = 1;
}
