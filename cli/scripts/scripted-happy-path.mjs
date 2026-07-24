#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = path.resolve(SCRIPT_DIR, "..");
const DIST_MAIN = path.join(CLI_ROOT, "dist", "main.js");
const SCRIPTED_TOGGLE = "ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS";
const UNAVAILABLE = "<unavailable>";

const HAPPY_SCENARIO = {
  schemaVersion: 1,
  stages: {
    spec: ["spec-correct"],
    "reconcile-spec": ["reconcile-spec-correct"],
    "review-spec": ["outcome-done"],
    "plan-strict": ["plan-strict-correct"],
    "reconcile-plan": ["reconcile-plan-correct"],
    "implement-plan-with-subagents": ["outcome-done"],
  },
};

const EXPECTED_ARTIFACTS = {
  "spec.md":
    "# Spec: Fake\n\nPlaceholder\n<!-- scripted reconcile-spec append -->\n",
  "plan.md":
    "# Plan: Fake\n\nPlaceholder plan.\n<!-- scripted reconcile-plan append -->\n",
  "plan-tasks/01-fake-task.md":
    "# Task 01\n\nPlaceholder task.\n<!-- scripted reconcile-plan append -->\n",
};

let passed = 0;
let failed = 0;
let disposableRepo;

function display(value) {
  return typeof value === "string" ? JSON.stringify(value) : JSON.stringify(value);
}

function check(label, expected, actual, equal = Object.is) {
  if (equal(actual, expected)) {
    passed += 1;
    console.log(`[PASS] ${label} — ${display(actual)}`);
    return true;
  }
  failed += 1;
  console.error(`[FAIL] ${label}`);
  console.error(`       expected: ${display(expected)}`);
  console.error(`       actual:   ${display(actual)}`);
  return false;
}

function checkTrue(label, condition, actual) {
  return check(label, true, condition) && actual !== undefined
    ? (console.log(`       observed: ${display(actual)}`), true)
    : condition;
}

function printSummary() {
  const total = passed + failed;
  console.log(`\nDemo checks: ${passed} passed, ${failed} failed, ${total} total.`);
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function envValue(name) {
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return value.map(stableJson);
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableJson(value[key])]),
    );
  }
  return value;
}

function sameJson(left, right) {
  return JSON.stringify(stableJson(left)) === JSON.stringify(stableJson(right));
}

function resolveDefaultRoot(xdgVariable, homeSegments) {
  const xdgRoot = envValue(xdgVariable);
  if (xdgRoot !== undefined) {
    return path.isAbsolute(xdgRoot)
      ? { ok: true, root: path.normalize(path.join(xdgRoot, "antmay")) }
      : { ok: false, error: `${xdgVariable} is not absolute: ${xdgRoot}` };
  }
  const userHome = homedir();
  return userHome === ""
    ? { ok: false, error: "the home directory is empty" }
    : { ok: true, root: path.join(userHome, ...homeSegments) };
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
    output: capture ? result.stdout ?? "" : "",
    error,
  };
}

function inspectJson(filePath, label) {
  let regular = false;
  let raw;
  let parsed;

  try {
    regular = statSync(filePath).isFile();
    check(`${label} is a regular file`, true, regular);
  } catch (error) {
    check(`${label} is a regular file`, filePath, error.message);
  }

  if (regular) {
    try {
      raw = readFileSync(filePath, "utf8");
      check(`${label} is readable`, true, true);
    } catch (error) {
      check(`${label} is readable`, "readable UTF-8", error.message);
    }
  } else {
    check(`${label} is readable`, "readable UTF-8", UNAVAILABLE);
  }

  if (raw !== undefined) {
    try {
      parsed = JSON.parse(raw);
      check(`${label} contains valid JSON`, true, true);
    } catch (error) {
      check(`${label} contains valid JSON`, "valid JSON", error.message);
    }
  } else {
    check(`${label} contains valid JSON`, "valid JSON", UNAVAILABLE);
  }
  return parsed;
}

function listRunIds(stateRoot) {
  try {
    return readdirSync(path.join(stateRoot, "afk-runs"), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    return error.code === "ENOENT" ? [] : undefined;
  }
}

function threadTimestamp() {
  return `${new Date()
    .toISOString()
    .slice(2, 19)
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace("T", "")}Z`;
}

function cliSeparator(label) {
  console.log(`\n==================== ${label} ====================`);
}

function main() {
  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  checkTrue("Node.js version is at least 22", nodeMajor >= 22, process.versions.node);
  check("Platform is macOS", "darwin", process.platform);
  for (const variable of ["ANTMAY_CONFIG_HOME", "ANTMAY_STATE_HOME"]) {
    check(`${variable} is unset`, undefined, envValue(variable));
  }

  const gitProbe = command("git", ["--version"], { capture: true });
  check(
    "Git executable is available",
    "available",
    gitProbe.ok ? "available" : gitProbe.error,
  );

  const configResolution = resolveDefaultRoot("XDG_CONFIG_HOME", [
    ".config",
    "antmay",
  ]);
  const stateResolution = resolveDefaultRoot("XDG_STATE_HOME", [
    ".local",
    "state",
    "antmay",
  ]);
  check(
    "Default config root resolves",
    "absolute path",
    configResolution.ok ? "absolute path" : configResolution.error,
  );
  if (configResolution.ok) {
    console.log(`       observed: ${display(configResolution.root)}`);
  }
  check(
    "Default state root resolves",
    "absolute path",
    stateResolution.ok ? "absolute path" : stateResolution.error,
  );
  if (stateResolution.ok) {
    console.log(`       observed: ${display(stateResolution.root)}`);
  }

  const configRoot = configResolution.ok ? configResolution.root : undefined;
  const stateRoot = stateResolution.ok ? stateResolution.root : undefined;
  const settings =
    configRoot === undefined
      ? undefined
      : inspectJson(path.join(configRoot, "settings.json"), "Antmay settings");
  const scenario =
    configRoot === undefined
      ? undefined
      : inspectJson(
          path.join(configRoot, "scripted-harness.json"),
          "Scripted scenario",
        );

  if (configRoot === undefined) {
    for (const label of [
      "Antmay settings is a regular file",
      "Antmay settings is readable",
      "Antmay settings contains valid JSON",
      "Scripted scenario is a regular file",
      "Scripted scenario is readable",
      "Scripted scenario contains valid JSON",
    ]) {
      check(label, "resolved config root", UNAVAILABLE);
    }
  }

  check(
    "Settings contain an afk object",
    true,
    isObject(settings) && isObject(settings.afk),
  );
  check(
    "Scenario is the exact Standard happy path",
    HAPPY_SCENARIO,
    scenario ?? UNAVAILABLE,
    sameJson,
  );
  if (failed > 0) {
    return;
  }

  console.log("\nBuilding CLI (tests are not run)...");
  const build = command("npm", ["run", "build"], { cwd: CLI_ROOT });
  check("CLI build exits successfully", 0, build.status ?? build.error);
  if (!build.ok) {
    return;
  }

  try {
    disposableRepo = realpathSync(mkdtempSync("/tmp/antmay-scripted-happy-"));
    checkTrue(
      "Unique disposable repository is created under /tmp",
      disposableRepo.startsWith("/private/tmp/") || disposableRepo.startsWith("/tmp/"),
      disposableRepo,
    );
  } catch (error) {
    check("Unique disposable repository is created under /tmp", "created", error.message);
    return;
  }

  const threadName = `${threadTimestamp()}-scripted-happy`;
  const threadRelPath = path.posix.join("docs", "threads", threadName);
  const threadRoot = path.join(disposableRepo, "docs", "threads", threadName);
  try {
    mkdirSync(threadRoot, { recursive: true });
    writeFileSync(
      path.join(disposableRepo, ".gitignore"),
      ".pending-decisions/\n.pending-reviews/\n.implementation-runs/\n",
    );
    writeFileSync(
      path.join(threadRoot, "seed.md"),
      "# Seed\n\nTest the complete scripted CLI happy path.\n",
    );
    writeFileSync(
      path.join(threadRoot, "decisions.md"),
      "# Decisions\n\nDR1: Run the complete Standard recipe.\n",
    );
    check("Thread genesis files are written", "written", "written");
  } catch (error) {
    check("Thread genesis files are written", "written", error.message);
    return;
  }

  const git = (args) =>
    command("git", args, { cwd: disposableRepo, capture: true });
  const gitSteps = [
    ["initialize repository", ["init", "--quiet"]],
    ["set email", ["config", "user.email", "afk@example.com"]],
    ["set name", ["config", "user.name", "AFK Scripted Demo"]],
    ["disable signing", ["config", "commit.gpgsign", "false"]],
  ];
  let gitSetupError;
  for (const [label, args] of gitSteps) {
    const result = git(args);
    if (!result.ok) {
      gitSetupError = `${label}: ${result.error}`;
      break;
    }
  }
  if (gitSetupError === undefined) {
    const disabledHooks = path.join(disposableRepo, ".git", "hooks-disabled");
    mkdirSync(disabledHooks);
    for (const [label, args] of [
      ["disable hooks", ["config", "core.hooksPath", disabledHooks]],
      ["stage genesis", ["add", "-A"]],
      ["commit genesis", ["commit", "--quiet", "-m", "chore: fixture genesis"]],
    ]) {
      const result = git(args);
      if (!result.ok) {
        gitSetupError = `${label}: ${result.error}`;
        break;
      }
    }
  }
  check(
    "Git repository and genesis commit are prepared",
    "prepared",
    gitSetupError ?? "prepared",
  );
  check(
    "plan-tasks is absent before the CLI run",
    false,
    existsSync(path.join(threadRoot, "plan-tasks")),
  );
  if (gitSetupError !== undefined) {
    return;
  }

  const priorRunIds = new Set(listRunIds(stateRoot) ?? []);
  console.log(`\nRepository: ${disposableRepo}`);
  console.log(`Thread:     ${threadName}`);

  cliSeparator("ANTMAY CLI STARTED");
  const cli = command(
    process.execPath,
    [DIST_MAIN, "afk", "run", "standard", "--thread", threadName],
    {
      cwd: disposableRepo,
      env: { ...process.env, [SCRIPTED_TOGGLE]: "1" },
    },
  );
  cliSeparator("ANTMAY CLI FINISHED");

  check(
    "Antmay CLI exits successfully",
    0,
    cli.status ?? cli.error ?? UNAVAILABLE,
  );

  const status = git(["status", "--porcelain=v1"]);
  check(
    "Git worktree is clean",
    "",
    status.ok ? status.output : status.error,
  );

  const expectedSubjects = [
    "chore: fixture genesis",
    `docs(${threadName}): spec`,
    `docs(${threadName}): reconcile spec`,
    `docs(${threadName}): plan`,
    `docs(${threadName}): reconcile plan`,
  ];
  const history = git(["log", "--format=%s", "--reverse"]);
  const actualSubjects = history.ok ? history.output.trimEnd().split("\n") : [];
  const commitCount = Math.max(expectedSubjects.length, actualSubjects.length);
  for (let index = 0; index < commitCount; index += 1) {
    check(
      `Commit ${index + 1} subject`,
      expectedSubjects[index] ?? "<no additional commit>",
      actualSubjects[index] ?? "<missing>",
    );
  }

  for (const [relativePath, expected] of Object.entries(EXPECTED_ARTIFACTS)) {
    const artifactPath = path.join(threadRoot, relativePath);
    let actual;
    try {
      actual = readFileSync(artifactPath, "utf8");
    } catch (error) {
      actual = `<unreadable: ${error.message}>`;
    }
    check(`Artifact ${relativePath}`, expected, actual);
  }

  const currentRunIds = listRunIds(stateRoot);
  const newRunIds =
    currentRunIds?.filter((runId) => !priorRunIds.has(runId)) ?? [];
  check("Exactly one new run directory is created", 1, newRunIds.length);

  let checkpoint;
  let checkpointPath;
  if (newRunIds.length === 1) {
    checkpointPath = path.join(
      stateRoot,
      "afk-runs",
      newRunIds[0],
      "state.json",
    );
    checkpoint = inspectJson(checkpointPath, "Demo checkpoint");
  } else {
    for (const label of [
      "Demo checkpoint is a regular file",
      "Demo checkpoint is readable",
      "Demo checkpoint contains valid JSON",
    ]) {
      check(label, "one new run directory", UNAVAILABLE);
    }
  }
  check(
    "Checkpoint repository matches the demo",
    disposableRepo,
    checkpoint?.repoRoot ?? UNAVAILABLE,
  );
  check(
    "Checkpoint thread matches the demo",
    threadRelPath,
    checkpoint?.threadRelPath ?? UNAVAILABLE,
  );
  check(
    "Checkpoint condition is completed",
    "completed",
    checkpoint?.condition ?? UNAVAILABLE,
  );
  check(
    "Checkpoint records scripted start",
    true,
    checkpoint?.startedScripted ?? UNAVAILABLE,
  );

  console.log("\nDemo artifacts were preserved for inspection.");
  console.log(`  Repository: ${disposableRepo}`);
  console.log(`  Thread:     ${threadName}`);
  if (newRunIds.length === 1) {
    console.log(`  Run:        ${newRunIds[0]}`);
    console.log(`  Checkpoint: ${checkpointPath}`);
  }
}

try {
  main();
} catch (error) {
  check("Unexpected demo error", "no unexpected error", error.message);
} finally {
  printSummary();
  if (disposableRepo !== undefined) {
    console.log(`Disposable repository: ${disposableRepo}`);
  }
  if (failed > 0) {
    process.exitCode = 1;
  }
}
