#!/usr/bin/env node

import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = path.resolve(SCRIPT_DIR, "..");
const DIST_MAIN = path.join(CLI_ROOT, "dist", "main.js");
const SCENARIO_DIR = path.join(SCRIPT_DIR, "scenarios");
// Listed first everywhere, and picked when the prompt is answered with Enter.
const DEFAULT_SCENARIO_ID = "happy-path";
const SCRIPTED_TOGGLE = "ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS";
const USAGE = "Usage: node scripts/demo.mjs [--scenario <id>] [--list]";

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

async function loadScenarios() {
  let entries;
  try {
    entries = readdirSync(SCENARIO_DIR, { withFileTypes: true });
  } catch (error) {
    fail(`Cannot read ${SCENARIO_DIR}: ${error.message}`);
  }
  const ids = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mjs"))
    .map((entry) => entry.name.slice(0, -".mjs".length))
    .sort((left, right) =>
      left === DEFAULT_SCENARIO_ID
        ? -1
        : right === DEFAULT_SCENARIO_ID
          ? 1
          : left.localeCompare(right),
    );
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

function parseArgs(argv) {
  const parsed = { scenarioId: undefined, list: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--list") {
      parsed.list = true;
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

async function selectScenario(scenarios, requestedId) {
  if (requestedId !== undefined) {
    const scenario = scenarios.get(requestedId);
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
  for (const [index, scenario] of choices.entries()) {
    const marker = scenario === fallback ? " (default)" : "";
    console.log(`  ${index + 1}) ${scenario.id} — ${scenario.label}${marker}`);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    let answer;
    try {
      answer = (
        await rl.question(
          `Scenario [1-${choices.length}, default ${fallback.id}]: `,
        )
      ).trim();
    } catch {
      // Ctrl+D closes the prompt without an answer.
      fail("\nCancelled.");
    }
    if (answer === "") {
      return fallback;
    }
    const picked = choices[Number.parseInt(answer, 10) - 1];
    if (picked === undefined) {
      fail(`Not a listed choice: ${answer}`);
    }
    return picked;
  } finally {
    rl.close();
  }
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

function prepareFixtureRepo(repoRoot) {
  const threadName = `${threadTimestamp()}-demo`;
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
  return threadName;
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

  const demoRoot = realpathSync(
    mkdtempSync(`/tmp/antmay-demo-${scenario.id}-`),
  );
  const configRoot = path.join(demoRoot, "config");
  const stateRoot = path.join(demoRoot, "state");
  const repoRoot = path.join(demoRoot, "repo");
  mkdirSync(configRoot);
  mkdirSync(stateRoot);
  mkdirSync(repoRoot);

  try {
    copyFileSync(realSettings, path.join(configRoot, "settings.json"));
  } catch (error) {
    fail(
      `Cannot copy ${realSettings} into the demo config root: ${error.message}\nCreate that settings file before running the demo.`,
    );
  }
  writeFileSync(
    path.join(configRoot, "scripted-harness.json"),
    `${JSON.stringify(scenario.scenario, null, 2)}\n`,
  );

  const threadName = prepareFixtureRepo(repoRoot);
  const context = { repoRoot, threadName, stateRoot, configRoot };

  console.log(`\nScenario:   ${scenario.id} — ${scenario.label}`);
  console.log(`Repository: ${repoRoot}`);
  console.log(`Thread:     ${threadName}`);

  const childEnv = {
    ...process.env,
    ANTMAY_CONFIG_HOME: configRoot,
    ANTMAY_STATE_HOME: stateRoot,
    [SCRIPTED_TOGGLE]: "1",
  };
  const results = [];
  for (const step of scenario.steps) {
    const args =
      step.command === "run"
        ? ["afk", "run", "standard", "--thread", threadName]
        : ["afk", "resume", soleRunId(stateRoot)];
    const label = `antmay ${args.join(" ")}`;

    separator(`${label} — STARTED`);
    const child = command(process.execPath, [DIST_MAIN, ...args], {
      cwd: repoRoot,
      env: childEnv,
    });
    separator(`${label} — FINISHED`);

    const actual = child.status ?? child.error;
    const ok = actual === step.expectExit;
    results.push(ok);
    console.log(
      ok
        ? `[PASS] ${label} exited ${step.expectExit}`
        : `[FAIL] ${label} — expected exit ${step.expectExit}, got ${JSON.stringify(actual)}`,
    );
    if (!ok) {
      break;
    }
  }

  const runIds = listRunIds(stateRoot);
  context.runId = runIds.length === 1 ? runIds[0] : undefined;
  printSummary(context);
  if (results.some((ok) => !ok)) {
    process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof DemoError ? error.message : error);
  process.exitCode = 1;
}
