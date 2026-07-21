// The per-case runner. It builds or locates the production `dist/index.js`,
// stands up an isolated world for one case (temporary git repositories and
// plain directories, a per-user state root, transcript/session roots, Claude and
// Codex skill roots, and a scripted-shim state directory), invokes the BUILT
// executable as a subprocess for each step, then checks the step's exit code and
// output, the resulting registry/shim/transcript/worker state, and the absolute
// repository write boundary. It ALWAYS reaps the case-owned observer workers it
// caused — identified by a per-case unique worker-module path — and never
// touches any process outside the case.

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect } from "vitest";
import type {
  CaseManifest,
  CaseStep,
  SeedRun,
  SkillSpec,
  StepExpect,
} from "./case-manifest";

const ESC = String.fromCharCode(27);
const ANSI_PATTERN = new RegExp(`${ESC}\\[[0-9;]*[A-Za-z]`, "g");

type RepoContext = { root: string; kind: "git" | "plain" };

type CaseContext = {
  manifest: CaseManifest;
  workspaceRoot: string;
  cliIndex: string;
  workerCopy: string;
  workerToken: string;
  tempRoot: string;
  stateHome: string;
  homeDir: string;
  transcriptRoot: string;
  sessionRoot: string;
  shimDir: string;
  claudeBin: string;
  codexBin: string;
  herdrBin: string;
  repos: Map<string, RepoContext>;
};

function label(context: CaseContext, detail: string): string {
  return `[${context.manifest.id}] ${detail}`;
}

/** The canonical root of the always-present `main` repository. */
function mainRoot(context: CaseContext): string {
  const repo = context.repos.get("main");
  if (repo === undefined)
    throw new Error(label(context, "missing main repository"));
  return repo.root;
}

/** Build the production CLI + worker bundle once if it is not already present. */
export function ensureBuilt(workspaceRoot: string): {
  cliIndex: string;
  worker: string;
} {
  const cliIndex = path.join(workspaceRoot, "packages/cli/dist/index.js");
  const worker = path.join(workspaceRoot, "packages/cli/dist/worker.js");
  if (!existsSync(cliIndex) || !existsSync(worker)) {
    const result = spawnSync("bun", ["run", "build"], {
      cwd: workspaceRoot,
      stdio: "inherit",
    });
    if (result.status !== 0) {
      throw new Error("failed to build the production CLI before the E2E run.");
    }
  }
  return { cliIndex, worker };
}

function chmodExecutable(file: string): void {
  try {
    spawnSync("chmod", ["+x", file]);
  } catch {
    // best effort; the shim already ships with a shebang
  }
}

function canonical(dir: string): string {
  return realpathSync.native(path.resolve(dir));
}

function repositoryDirKey(stateHome: string, repositoryPath: string): string {
  const key = createHash("sha256").update(repositoryPath).digest("hex");
  return path.join(stateHome, "runs", key);
}

function skillRootFor(context: CaseContext, skill: SkillSpec): string {
  const base =
    skill.scope === "user"
      ? context.homeDir
      : (context.repos.get(skill.repo)?.root ?? mainRoot(context));
  const rel = skill.harness === "claude" ? ".claude/skills" : ".agents/skills";
  return path.join(base, rel);
}

function installSkill(context: CaseContext, skill: SkillSpec): void {
  const dir = path.join(skillRootFor(context, skill), skill.name);
  mkdirSync(dir, { recursive: true });
  if (skill.omitSkillMd !== true) {
    const frontmatterName = skill.frontmatterName ?? skill.name;
    writeFileSync(
      path.join(dir, "SKILL.md"),
      `---\nname: ${frontmatterName}\ndescription: scripted skill\n---\n\nbody\n`,
      "utf8",
    );
  }
  const wantOpenai =
    skill.harness === "codex" ? skill.openai !== false : skill.openai === true;
  if (wantOpenai) {
    mkdirSync(path.join(dir, "agents"), { recursive: true });
    writeFileSync(
      path.join(dir, "agents", "openai.yaml"),
      "interface: {}\n",
      "utf8",
    );
  }
}

function seedRegistry(context: CaseContext): void {
  const byRepo = new Map<string, SeedRun[]>();
  for (const seed of context.manifest.seedRuns) {
    const list = byRepo.get(seed.repo) ?? [];
    list.push(seed);
    byRepo.set(seed.repo, list);
  }
  for (const [repoName, seeds] of byRepo) {
    const repo = context.repos.get(repoName);
    if (repo === undefined)
      throw new Error(
        label(context, `seedRun references unknown repo ${repoName}`),
      );
    const repositoryPath = repo.root;
    const runs = seeds.map((seed) => {
      const threadPath = path.join(repositoryPath, "docs/threads", seed.thread);
      mkdirSync(threadPath, { recursive: true });
      return {
        id: seed.id,
        repositoryPath,
        threadPath,
        skill: seed.skill,
        harness: seed.harness,
        adapter: "herdr",
        session: { kind: seed.sessionKind, id: seed.sessionId },
        attachment: { available: seed.handle !== null, handle: seed.handle },
        classification: seed.classification,
        reason: null,
        workerHealth: { state: "healthy", detail: null },
      };
    });
    const dirKey = repositoryDirKey(context.stateHome, repositoryPath);
    mkdirSync(dirKey, { recursive: true });
    writeFileSync(
      path.join(dirKey, "record.json"),
      `${JSON.stringify({ schemaVersion: 1, repositoryPath, runs }, null, 2)}\n`,
      "utf8",
    );
    for (const seed of seeds) {
      if (seed.handle !== null) {
        mkdirSync(path.join(context.shimDir, "panes"), { recursive: true });
        writeFileSync(
          path.join(
            context.shimDir,
            "panes",
            `${encodeURIComponent(seed.handle)}.json`,
          ),
          `${JSON.stringify({ id: seed.handle, alive: true, cwd: repositoryPath, env: {}, launchCount: 2, runs: [] })}\n`,
          "utf8",
        );
      }
      if (seed.worker !== undefined) {
        const workersDir = path.join(dirKey, "workers");
        mkdirSync(workersDir, { recursive: true });
        const heartbeatAt = new Date(
          Date.now() - seed.worker.heartbeatAgeMs,
        ).toISOString();
        writeFileSync(
          path.join(workersDir, `${seed.id}.json`),
          `${JSON.stringify(
            {
              schemaVersion: 1,
              runId: seed.id,
              heartbeatAt,
              health: { state: seed.worker.state, detail: null },
              diagnostic: null,
              tailCursor: null,
              session: { kind: seed.sessionKind, id: seed.sessionId },
              adapter: "herdr",
              attachHandle: seed.handle,
            },
            null,
            2,
          )}\n`,
          "utf8",
        );
      }
    }
  }
}

// Write every seeded harness transcript into its isolated root so the built CLI
// reconciles against a real on-disk transcript of the exact shape under test: a
// Claude transcript at `<transcriptRoot>/<sessionId>.jsonl`, a Codex rollout at
// `<sessionRoot>/<file>`. `{{repo}}` placeholders resolve to the real temp repo
// path so the reader's cwd match succeeds.
function seedTranscripts(context: CaseContext): void {
  for (const transcript of context.manifest.transcripts ?? []) {
    const content = resolvePlaceholders(context, transcript.content);
    if (transcript.harness === "claude") {
      mkdirSync(context.transcriptRoot, { recursive: true });
      writeFileSync(
        path.join(context.transcriptRoot, `${transcript.sessionId}.jsonl`),
        content,
        "utf8",
      );
    } else {
      mkdirSync(context.sessionRoot, { recursive: true });
      writeFileSync(
        path.join(context.sessionRoot, transcript.file ?? "rollout.jsonl"),
        content,
        "utf8",
      );
    }
  }
}

function writeControl(shimDir: string, control: Record<string, unknown>): void {
  mkdirSync(shimDir, { recursive: true });
  writeFileSync(
    path.join(shimDir, "control.json"),
    `${JSON.stringify(control, null, 2)}\n`,
    "utf8",
  );
}

function mergeControl(shimDir: string, patch: Record<string, unknown>): void {
  const file = path.join(shimDir, "control.json");
  const current = existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8"))
    : {};
  writeControl(shimDir, { ...current, ...patch });
}

// A path -> content-hash snapshot of every file under a directory, used to prove
// the CLI wrote nothing inside a repository across the case.
function snapshot(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        out.set(
          path.relative(root, full),
          createHash("sha256").update(readFileSync(full)).digest("hex"),
        );
      }
    }
  };
  if (existsSync(root)) walk(root);
  return out;
}

function resolvePlaceholders(context: CaseContext, value: string): string {
  return value
    .replace(/\{\{stateHome\}\}/g, context.stateHome)
    .replace(/\{\{home\}\}/g, context.homeDir)
    .replace(/\{\{repo(?::([a-z][a-z0-9-]*))?\}\}/g, (_m, name) => {
      const repo = context.repos.get(name ?? "main");
      if (repo === undefined)
        throw new Error(label(context, `unknown repo placeholder ${name}`));
      return repo.root;
    })
    .replace(/\{\{thread:([^}]+)\}\}/g, (_m, name) => {
      return path.join(mainRoot(context), "docs/threads", name);
    });
}

function resolveCwd(context: CaseContext, cwd: string): string {
  if (cwd === ".") return mainRoot(context);
  const repoMatch = /^repo:([a-z][a-z0-9-]*)(?:\/(.+))?$/.exec(cwd);
  if (repoMatch !== null) {
    const repo = context.repos.get(repoMatch[1] ?? "");
    if (repo === undefined)
      throw new Error(label(context, `unknown repo in cwd ${cwd}`));
    const sub = repoMatch[2];
    const full = sub === undefined ? repo.root : path.join(repo.root, sub);
    mkdirSync(full, { recursive: true });
    return full;
  }
  const dirMatch = /^dir:([a-z][a-z0-9-]*)(?:\/(.+))?$/.exec(cwd);
  if (dirMatch !== null) {
    const dir = context.repos.get(`dir:${dirMatch[1] ?? ""}`);
    if (dir === undefined)
      throw new Error(label(context, `unknown plain dir in cwd ${cwd}`));
    const sub = dirMatch[2];
    const full = sub === undefined ? dir.root : path.join(dir.root, sub);
    mkdirSync(full, { recursive: true });
    return full;
  }
  const full = path.join(mainRoot(context), cwd);
  mkdirSync(full, { recursive: true });
  return full;
}

function subprocessEnv(context: CaseContext): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH,
    HOME: context.homeDir,
    ANTMAY_STATE_HOME: context.stateHome,
    ANTMAY_HERDR_BIN: context.herdrBin,
    ANTMAY_CLAUDE_BIN: context.claudeBin,
    ANTMAY_CODEX_BIN: context.codexBin,
    ANTMAY_CLAUDE_TRANSCRIPT_ROOT: context.transcriptRoot,
    ANTMAY_CODEX_SESSION_ROOT: context.sessionRoot,
    ANTMAY_CLAUDE_SKILL_ROOTS: `${path.join(mainRoot(context), ".claude/skills")}:${path.join(context.homeDir, ".claude/skills")}`,
    ANTMAY_CODEX_SKILL_ROOTS: `${path.join(mainRoot(context), ".agents/skills")}:${path.join(context.homeDir, ".agents/skills")}`,
    ANTMAY_SHIM_DIR: context.shimDir,
    ANTMAY_WORKER_MODULE: context.workerCopy,
  };
}

type RunOutput = { code: number | null; stdout: string; stderr: string };

function runPlain(
  context: CaseContext,
  argv: string[],
  cwd: string,
): Promise<RunOutput> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [context.cliIndex, ...argv], {
      cwd,
      env: subprocessEnv(context),
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

// A tiny Python pty.spawn driver, run through `python3 -c`. It gives the built
// CLI a real pseudo-terminal for its stdin/stdout — so the CLI's own TTY
// detection reports an interactive terminal and its transient prompts run — while
// this harness's own stdio remain ordinary pipes (unlike `script(1)`, whose BSD
// build refuses non-tty stdio). Python's pty.spawn tolerates a non-tty parent
// stdin, forwards it to the child pty, and copies the child's output back.
const PTY_DRIVER = "import pty,sys; sys.exit(pty.spawn(sys.argv[1:]))";

// Run the built CLI under a real pseudo-terminal, feeding the scripted answers
// one per prompt with a small delay. The CLI's exit is detected by output
// quiescence rather than the driver's exit: Python's pty.spawn does not reliably
// return after the child exits on macOS, and a PTY does not propagate the child's
// exit status anyway, so once the answers are fed and the output has been quiet
// for a settle window the driver is terminated and the collected output returned.
function runTty(
  context: CaseContext,
  argv: string[],
  cwd: string,
  stdinLines: string[],
): Promise<RunOutput> {
  return new Promise((resolve) => {
    const child = spawn(
      "python3",
      ["-c", PTY_DRIVER, process.execPath, context.cliIndex, ...argv],
      { cwd, env: subprocessEnv(context) },
    );
    let output = "";
    let lastData = Date.now();
    let fed = false;
    let settled = false;
    const onData = (d: Buffer): void => {
      output += d.toString();
      lastData = Date.now();
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);

    const finish = (): void => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      try {
        child.stdin.end();
      } catch {
        // already closed
      }
      child.kill("SIGKILL");
      resolve({ code: child.exitCode, stdout: output, stderr: "" });
    };

    const started = Date.now();
    const poll = setInterval(() => {
      const idleMs = Date.now() - lastData;
      // A completion marker (success, cancellation, or error) means the CLI has
      // finished; a short grace lets its final bytes drain. Otherwise resolve once
      // the answers are fed and output has been quiet for a longer settle window
      // (launch does silent work between the last prompt and the success line),
      // or after an absolute safety cap.
      const sawTerminal = /Launched run |Spawn cancelled|Error:/.test(output);
      if (
        (fed && sawTerminal && idleMs > 400) ||
        (fed && idleMs > 4000) ||
        Date.now() - started > 25_000
      ) {
        finish();
      }
    }, 150);

    let index = 0;
    const feed = (): void => {
      if (index >= stdinLines.length) {
        fed = true;
        return;
      }
      const line = stdinLines[index];
      index += 1;
      setTimeout(() => {
        child.stdin.write(`${line}\n`);
        feed();
      }, 300);
    };
    setTimeout(feed, 400);
    child.on("close", () => finish());
  });
}

function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, "").replace(/\r/g, "");
}

function assertOutput(
  context: CaseContext,
  step: CaseStep,
  index: number,
  result: RunOutput,
): void {
  const expectSpec: StepExpect = step.expect;
  const where = label(context, `step[${index}] ${step.argv.join(" ")}`);

  if (step.tty) {
    // A PTY does not reliably propagate the child's exit status across
    // platforms, and merges stdout/stderr into one stream carrying control
    // bytes and echoed input, so interactive steps assert success or failure
    // purely through cleaned combined-stream substrings.
    const combined = stripAnsi(result.stdout);
    for (const needle of expectSpec.stdoutContains ?? []) {
      expect(combined, `${where} stdoutContains ${needle}`).toContain(
        resolvePlaceholders(context, needle),
      );
    }
    for (const needle of expectSpec.stderrContains ?? []) {
      expect(combined, `${where} (tty) contains ${needle}`).toContain(
        resolvePlaceholders(context, needle),
      );
    }
    return;
  }

  expect(result.code, `${where} exitCode`).toBe(expectSpec.exitCode);
  if (expectSpec.stdoutEquals !== undefined) {
    expect(result.stdout, `${where} stdoutEquals`).toBe(
      resolvePlaceholders(context, expectSpec.stdoutEquals),
    );
  }
  if (expectSpec.stdoutEmpty === true) {
    expect(result.stdout, `${where} stdoutEmpty`).toBe("");
  }
  for (const needle of expectSpec.stdoutContains ?? []) {
    expect(result.stdout, `${where} stdoutContains ${needle}`).toContain(
      resolvePlaceholders(context, needle),
    );
  }
  for (const needle of expectSpec.stdoutNotContains ?? []) {
    expect(result.stdout, `${where} stdoutNotContains ${needle}`).not.toContain(
      resolvePlaceholders(context, needle),
    );
  }
  if (expectSpec.stderrEquals !== undefined) {
    expect(result.stderr, `${where} stderrEquals`).toBe(
      resolvePlaceholders(context, expectSpec.stderrEquals),
    );
  }
  for (const needle of expectSpec.stderrContains ?? []) {
    expect(result.stderr, `${where} stderrContains ${needle}`).toContain(
      resolvePlaceholders(context, needle),
    );
  }
}

function readAllRuns(context: CaseContext): Array<Record<string, unknown>> {
  const runsRoot = path.join(context.stateHome, "runs");
  if (!existsSync(runsRoot)) return [];
  const runs: Array<Record<string, unknown>> = [];
  for (const entry of readdirSync(runsRoot, { withFileTypes: true }).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    if (!entry.isDirectory()) continue;
    const file = path.join(runsRoot, entry.name, "record.json");
    if (!existsSync(file)) continue;
    const parsed = JSON.parse(readFileSync(file, "utf8")) as { runs?: unknown };
    if (Array.isArray(parsed.runs))
      runs.push(...(parsed.runs as Array<Record<string, unknown>>));
  }
  return runs;
}

function readEvents(
  context: CaseContext,
): Array<{ op: string; args: unknown }> {
  const file = path.join(context.shimDir, "events.jsonl");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

function readWorkerRecords(
  context: CaseContext,
): Array<Record<string, unknown>> {
  const runsRoot = path.join(context.stateHome, "runs");
  if (!existsSync(runsRoot)) return [];
  const out: Array<Record<string, unknown>> = [];
  for (const entry of readdirSync(runsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const workersDir = path.join(runsRoot, entry.name, "workers");
    if (!existsSync(workersDir)) continue;
    for (const worker of readdirSync(workersDir)) {
      if (worker.endsWith(".json")) {
        out.push(
          JSON.parse(readFileSync(path.join(workersDir, worker), "utf8")),
        );
      }
    }
  }
  return out;
}

// Push every recorded worker heartbeat back in time so a later status
// reconciliation sees the observer as stale and restores it.
function ageWorkerHeartbeats(context: CaseContext, ms: number): void {
  const runsRoot = path.join(context.stateHome, "runs");
  if (!existsSync(runsRoot)) return;
  for (const entry of readdirSync(runsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const workersDir = path.join(runsRoot, entry.name, "workers");
    if (!existsSync(workersDir)) continue;
    for (const worker of readdirSync(workersDir)) {
      if (!worker.endsWith(".json")) continue;
      const file = path.join(workersDir, worker);
      const parsed = JSON.parse(readFileSync(file, "utf8"));
      if (typeof parsed.heartbeatAt === "string") {
        const base = Date.parse(parsed.heartbeatAt);
        const from = Number.isFinite(base) ? base : Date.now();
        parsed.heartbeatAt = new Date(from - ms).toISOString();
        writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
      }
    }
  }
}

function workerAlive(context: CaseContext): boolean {
  const result = spawnSync("pgrep", ["-f", context.workerToken]);
  return result.status === 0;
}

async function pollRunClassification(
  context: CaseContext,
  select: number,
  expected: string,
  timeoutMs: number,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let latest = "";
  while (Date.now() < deadline) {
    const runs = readAllRuns(context);
    const run = runs[select];
    latest = run === undefined ? "<missing>" : String(run.classification);
    if (latest === expected) return latest;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return latest;
}

async function assertState(context: CaseContext): Promise<void> {
  for (const assertion of context.manifest.assertState) {
    const key = Object.keys(assertion)[0];
    if (key === undefined)
      throw new Error(label(context, "empty assertState entry"));
    const value = assertion[key] as Record<string, unknown>;
    const where = label(context, `assertState.${key}`);
    if (key === "registryRunCount") {
      expect(readAllRuns(context).length, where).toBe(assertion[key] as number);
    } else if (key === "run") {
      const runs = readAllRuns(context);
      const run = runs[value.select as number];
      expect(run, `${where} present`).toBeDefined();
      if (run === undefined) continue;
      if (value.skill !== undefined)
        expect(run.skill, `${where} skill`).toBe(value.skill);
      if (value.harness !== undefined)
        expect(run.harness, `${where} harness`).toBe(value.harness);
      if (value.adapter !== undefined)
        expect(run.adapter, `${where} adapter`).toBe(value.adapter);
      if (value.classification !== undefined)
        expect(run.classification, `${where} classification`).toBe(
          value.classification,
        );
      if (value.sessionKind !== undefined)
        expect(
          (run.session as { kind: string }).kind,
          `${where} sessionKind`,
        ).toBe(value.sessionKind);
      if (value.hasHandle !== undefined)
        expect(
          (run.attachment as { handle: string | null }).handle !== null,
          `${where} hasHandle`,
        ).toBe(value.hasHandle);
      if (value.reasonContains !== undefined)
        expect(String(run.reason ?? ""), `${where} reasonContains`).toContain(
          value.reasonContains as string,
        );
    } else if (key === "herdrOp") {
      const present = value.present === undefined ? true : value.present;
      const events = readEvents(context);
      const matched = events.some((event) => {
        if (event.op !== value.op) return false;
        const argsJson = JSON.stringify(event.args);
        return ((value.argsContains as string[] | undefined) ?? []).every(
          (needle) => argsJson.includes(resolvePlaceholders(context, needle)),
        );
      });
      expect(matched, `${where} present=${present}`).toBe(present);
    } else if (key === "herdrRunText") {
      const events = readEvents(context);
      const texts = events
        .filter((event) => event.op === "launch" || event.op === "submit")
        .map((event) => (event.args as { text: string }).text)
        .join("\n \n");
      for (const needle of (value.contains as string[]) ?? []) {
        expect(texts, `${where} contains`).toContain(
          resolvePlaceholders(context, needle),
        );
      }
    } else if (key === "transcriptWritten") {
      const root =
        value.harness === "claude"
          ? context.transcriptRoot
          : context.sessionRoot;
      const present = existsSync(root) && readdirSync(root).length > 0;
      expect(present, where).toBe(value.present as boolean);
    } else if (key === "workerHeartbeat") {
      const present = value.present as boolean;
      let workers = readWorkerRecords(context);
      if (present) {
        // The detached worker writes its first heartbeat asynchronously; poll.
        const deadline = Date.now() + 4000;
        while (workers.length === 0 && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          workers = readWorkerRecords(context);
        }
        expect(workers.length, `${where} present`).toBeGreaterThan(0);
        if (value.state !== undefined) {
          expect(
            workers.some(
              (w) => (w.health as { state: string }).state === value.state,
            ),
            `${where} state ${value.state}`,
          ).toBe(true);
        }
      } else {
        expect(workers.length, `${where} absent`).toBe(0);
      }
    } else if (key === "workerRunning") {
      const want = assertion[key] as boolean;
      // A just-launched worker needs a moment to appear; a reaped/exited worker
      // needs a moment to disappear. Poll toward the expected state.
      let alive = workerAlive(context);
      const deadline = Date.now() + 4000;
      while (alive !== want && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        alive = workerAlive(context);
      }
      expect(alive, where).toBe(want);
    } else if (key === "runFinalizes") {
      const reached = await pollRunClassification(
        context,
        value.select as number,
        value.classification as string,
        (value.timeoutMs as number | undefined) ?? 8000,
      );
      expect(reached, where).toBe(value.classification);
    } else if (key === "noRepoWrites") {
      // handled by the global audit; presence here documents intent
    } else if (key === "defaultStateRootAbsent") {
      // With ANTMAY_STATE_HOME injected, nothing may land in the default
      // per-user root ($XDG_STATE_HOME/antmay or ~/.local/state/antmay). HOME is
      // pinned to the case home dir and XDG_STATE_HOME is unset, so the default
      // root would be `<home>/.local/state/antmay`; it must not exist.
      const defaultRoot = path.join(
        context.homeDir,
        ".local",
        "state",
        "antmay",
      );
      expect(existsSync(defaultRoot), where).toBe(false);
    } else {
      throw new Error(label(context, `unknown assertState key ${key}`));
    }
  }
}

function reapWorkers(context: CaseContext): void {
  spawnSync("pkill", ["-f", context.workerToken]);
}

export async function runCase(
  workspaceRoot: string,
  cliIndex: string,
  worker: string,
  manifest: CaseManifest,
): Promise<void> {
  // Canonicalize the temp root: on macOS the tmp dir lives under a symlinked
  // /var, and the worker's own entry guard compares argv[1] against the realpath
  // of its module URL, so a symlinked worker-copy path would silently no-op.
  const tempRoot = realpathSync.native(
    mkdtempSync(path.join(tmpdir(), "antmay-e2e-")),
  );
  const workerToken = `antmay-e2e-worker-${manifest.id}-${path.basename(tempRoot)}`;
  const workerCopy = path.join(tempRoot, `${workerToken}.mjs`);
  const context: CaseContext = {
    manifest,
    workspaceRoot,
    cliIndex,
    workerCopy,
    workerToken,
    tempRoot,
    stateHome: path.join(tempRoot, "state"),
    homeDir: path.join(tempRoot, "home"),
    transcriptRoot: path.join(tempRoot, "claude-transcripts"),
    sessionRoot: path.join(tempRoot, "codex-sessions"),
    shimDir: path.join(tempRoot, "shim"),
    herdrBin: path.join(
      workspaceRoot,
      "packages/cli/test/e2e/harness/shims/herdr.mjs",
    ),
    claudeBin: path.join(
      workspaceRoot,
      "packages/cli/test/e2e/harness/shims/claude.mjs",
    ),
    codexBin: path.join(
      workspaceRoot,
      "packages/cli/test/e2e/harness/shims/codex.mjs",
    ),
    repos: new Map(),
  };

  try {
    // The self-contained worker bundle copied to a per-case unique path so the
    // worker's command line is uniquely reapable without touching other cases.
    cpSync(worker, workerCopy);
    for (const bin of [context.herdrBin, context.claudeBin, context.codexBin]) {
      chmodExecutable(bin);
    }
    mkdirSync(context.homeDir, { recursive: true });
    mkdirSync(context.shimDir, { recursive: true });

    for (const repoName of manifest.repos) {
      const dir = path.join(tempRoot, `repo-${repoName}`);
      mkdirSync(dir, { recursive: true });
      spawnSync("git", ["init", "-q"], { cwd: dir });
      spawnSync("git", ["config", "user.email", "e2e@antmay.test"], {
        cwd: dir,
      });
      spawnSync("git", ["config", "user.name", "antmay-e2e"], { cwd: dir });
      context.repos.set(repoName, { root: canonical(dir), kind: "git" });
    }
    for (const dirName of manifest.plainDirs) {
      const dir = path.join(tempRoot, `plain-${dirName}`);
      mkdirSync(dir, { recursive: true });
      context.repos.set(`dir:${dirName}`, {
        root: canonical(dir),
        kind: "plain",
      });
    }

    const mainRepoRoot = mainRoot(context);
    for (const thread of manifest.threads) {
      mkdirSync(path.join(mainRepoRoot, "docs/threads", thread), {
        recursive: true,
      });
    }
    for (const thread of manifest.archivedThreads) {
      mkdirSync(path.join(mainRepoRoot, "docs/threads/archive", thread), {
        recursive: true,
      });
    }

    for (const file of manifest.files) {
      const full = path.join(mainRepoRoot, file.path);
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, file.content, "utf8");
    }

    for (const skill of manifest.skills) installSkill(context, skill);
    writeControl(context.shimDir, manifest.control);
    seedRegistry(context);
    seedTranscripts(context);

    // Snapshot every git repository AFTER fixture setup so the write audit
    // attributes only CLI-caused writes, then confirm none appear.
    const before = new Map<string, Map<string, string>>();
    if (manifest.auditRepoWrites) {
      for (const [name, repo] of context.repos) {
        before.set(name, snapshot(repo.root));
      }
    }

    for (const [index, step] of manifest.steps.entries()) {
      if (step.before?.control !== undefined)
        mergeControl(context.shimDir, step.before.control);
      if (step.before?.paneEnded !== undefined) {
        for (const paneId of step.before.paneEnded) {
          const file = path.join(
            context.shimDir,
            "panes",
            `${encodeURIComponent(paneId)}.json`,
          );
          if (existsSync(file)) {
            const pane = JSON.parse(readFileSync(file, "utf8"));
            pane.alive = false;
            writeFileSync(file, JSON.stringify(pane, null, 2), "utf8");
          }
        }
      }
      if (step.before?.ageWorkerHeartbeatsMs !== undefined) {
        ageWorkerHeartbeats(context, step.before.ageWorkerHeartbeatsMs);
      }
      const cwd = resolveCwd(context, step.cwd);
      const argv = step.argv.map((arg) => resolvePlaceholders(context, arg));
      const result = step.tty
        ? await runTty(context, argv, cwd, step.stdin)
        : await runPlain(context, argv, cwd);
      assertOutput(context, step, index, result);
    }

    await assertState(context);

    if (manifest.auditRepoWrites) {
      for (const [name, repo] of context.repos) {
        const after = snapshot(repo.root);
        const baseline = before.get(name) ?? new Map();
        const writes: string[] = [];
        for (const [file, hash] of after) {
          if (baseline.get(file) !== hash) writes.push(file);
        }
        expect(
          writes,
          label(context, `no tool writes inside repo ${name}`),
        ).toEqual([]);
      }
    }
  } finally {
    reapWorkers(context);
    // Give a reaped worker a moment to release the temp tree before removal.
    await new Promise((resolve) => setTimeout(resolve, 50));
    reapWorkers(context);
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

export function noLeakedWorkers(tokens: readonly string[]): string[] {
  const leaked: string[] = [];
  for (const token of tokens) {
    if (spawnSync("pgrep", ["-f", token]).status === 0) leaked.push(token);
  }
  return leaked;
}

// Re-exported for the harness self-tests.
export { snapshot as snapshotDirectory, stripAnsi };
