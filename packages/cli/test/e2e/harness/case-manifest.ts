// Strict loader for the declarative E2E case files under
// `packages/cli/test/e2e/cases/`. Each file is a YAML list of case manifests;
// every manifest carries a stable id, `covers` traceability refs, the fixture
// setup (isolated repositories, installed skills, threads, seeded runs, and
// scripted-shim control), an ordered list of steps that invoke the built CLI,
// and the state/output/process/write assertions the runner checks. The loader
// rejects any unknown field or malformed shape so a broken case can never run
// as if it were valid, and enforces safe relative paths for anything that lands
// in the temporary tree.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

const CASE_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const ACCEPTANCE_REF_PATTERN = /^[A-Z]+-FR-\d{4}\.AC-\d{4}$/;
const REPO_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

const CASE_FIELDS = new Set([
  "id",
  "covers",
  "title",
  "description",
  "repos",
  "plainDirs",
  "threads",
  "archivedThreads",
  "files",
  "skills",
  "control",
  "seedRuns",
  "steps",
  "assertState",
  "auditRepoWrites",
]);
const SKILL_FIELDS = new Set([
  "harness",
  "name",
  "scope",
  "repo",
  "frontmatterName",
  "openai",
  "omitSkillMd",
]);
const SEED_RUN_FIELDS = new Set([
  "id",
  "repo",
  "thread",
  "skill",
  "harness",
  "classification",
  "sessionKind",
  "sessionId",
  "handle",
  "worker",
]);
const SEED_WORKER_FIELDS = new Set(["state", "heartbeatAgeMs"]);
const STEP_FIELDS = new Set([
  "argv",
  "cwd",
  "tty",
  "stdin",
  "before",
  "expect",
]);
const BEFORE_FIELDS = new Set([
  "control",
  "paneEnded",
  "ageWorkerHeartbeatsMs",
]);
const EXPECT_FIELDS = new Set([
  "exitCode",
  "stdoutEquals",
  "stderrEquals",
  "stdoutContains",
  "stderrContains",
  "stdoutNotContains",
  "stdoutEmpty",
]);

export type CaseFile = { path: string; content: string };

export type SkillSpec = {
  harness: "claude" | "codex";
  name: string;
  scope: "project" | "user";
  repo: string;
  frontmatterName?: string;
  openai?: boolean;
  omitSkillMd?: boolean;
};

export type SeedWorker = {
  state: "healthy" | "degraded" | "stale";
  heartbeatAgeMs: number;
};

export type SeedRun = {
  id: string;
  repo: string;
  thread: string;
  skill: string;
  harness: "claude" | "codex";
  classification: "active" | "done" | "blocked" | "refused" | "unknown";
  sessionKind: "pinned" | "heuristic";
  sessionId: string | null;
  handle: string | null;
  worker?: SeedWorker;
};

export type StepBefore = {
  control?: Record<string, unknown>;
  paneEnded?: string[];
  ageWorkerHeartbeatsMs?: number;
};

export type StepExpect = {
  exitCode: number;
  stdoutEquals?: string;
  stderrEquals?: string;
  stdoutContains?: string[];
  stderrContains?: string[];
  stdoutNotContains?: string[];
  stdoutEmpty?: boolean;
};

export type CaseStep = {
  argv: string[];
  cwd: string;
  tty: boolean;
  stdin: string[];
  before?: StepBefore;
  expect: StepExpect;
};

export type CaseManifest = {
  id: string;
  covers: string[];
  title: string;
  description: string;
  repos: string[];
  plainDirs: string[];
  threads: string[];
  archivedThreads: string[];
  files: CaseFile[];
  skills: SkillSpec[];
  control: Record<string, unknown>;
  seedRuns: SeedRun[];
  steps: CaseStep[];
  assertState: Record<string, unknown>[];
  auditRepoWrites: boolean;
};

export type LoadedCase = {
  manifest: CaseManifest;
  filePath: string;
};

type Source = { filePath: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(source: Source, detail: string): never {
  throw new Error(`${source.filePath}: ${detail}`);
}

function rejectUnknownFields(
  value: Record<string, unknown>,
  allowed: Set<string>,
  label: string,
  source: Source,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(source, `unknown ${label} field ${key}`);
  }
}

function requireString(value: unknown, field: string, source: Source): string {
  if (typeof value !== "string" || value.length === 0) {
    fail(source, `${field} must be a non-empty string.`);
  }
  return value;
}

function requireBoolean(
  value: unknown,
  field: string,
  source: Source,
): boolean {
  if (typeof value !== "boolean") fail(source, `${field} must be a boolean.`);
  return value;
}

function requireStringArray(
  value: unknown,
  field: string,
  source: Source,
): string[] {
  if (!Array.isArray(value)) fail(source, `${field} must be an array.`);
  return value.map((item, index) => {
    if (typeof item !== "string") {
      fail(source, `${field}[${index}] must be a string.`);
    }
    return item;
  });
}

/** Reject an absolute path, a `..` escape, or a backslash — anything that could
 * leave the temporary tree the runner controls. */
export function validateSafeRelPath(
  field: string,
  value: unknown,
  source: Source,
): string {
  if (typeof value !== "string" || value.length === 0) {
    fail(source, `${field} must be a non-empty relative path.`);
  }
  if (value.includes("\\"))
    fail(source, `${field} must use forward slashes: ${value}`);
  if (path.posix.isAbsolute(value))
    fail(source, `${field} must not be absolute: ${value}`);
  if (value.split("/").some((segment) => segment === "..")) {
    fail(source, `${field} must not contain .. path segments: ${value}`);
  }
  return value;
}

function validateEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
  source: Source,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(source, `${field} must be one of ${allowed.join(", ")}.`);
  }
  return value as T;
}

function validateSkill(
  value: unknown,
  index: number,
  source: Source,
): SkillSpec {
  if (!isRecord(value)) fail(source, `skills[${index}] must be a mapping.`);
  rejectUnknownFields(value, SKILL_FIELDS, "skill", source);
  const harness = validateEnum(
    value.harness,
    ["claude", "codex"] as const,
    `skills[${index}].harness`,
    source,
  );
  const name = requireString(value.name, `skills[${index}].name`, source);
  const scope =
    value.scope === undefined
      ? "project"
      : validateEnum(
          value.scope,
          ["project", "user"] as const,
          `skills[${index}].scope`,
          source,
        );
  const repo =
    value.repo === undefined
      ? "main"
      : requireString(value.repo, `skills[${index}].repo`, source);
  const skill: SkillSpec = { harness, name, scope, repo };
  if (value.frontmatterName !== undefined) {
    skill.frontmatterName = requireString(
      value.frontmatterName,
      `skills[${index}].frontmatterName`,
      source,
    );
  }
  if (value.openai !== undefined) {
    skill.openai = requireBoolean(
      value.openai,
      `skills[${index}].openai`,
      source,
    );
  }
  if (value.omitSkillMd !== undefined) {
    skill.omitSkillMd = requireBoolean(
      value.omitSkillMd,
      `skills[${index}].omitSkillMd`,
      source,
    );
  }
  return skill;
}

function validateSeedRun(
  value: unknown,
  index: number,
  source: Source,
): SeedRun {
  if (!isRecord(value)) fail(source, `seedRuns[${index}] must be a mapping.`);
  rejectUnknownFields(value, SEED_RUN_FIELDS, "seedRun", source);
  const seed: SeedRun = {
    id: requireString(value.id, `seedRuns[${index}].id`, source),
    repo:
      value.repo === undefined
        ? "main"
        : requireString(value.repo, `seedRuns[${index}].repo`, source),
    thread: requireString(value.thread, `seedRuns[${index}].thread`, source),
    skill: requireString(value.skill, `seedRuns[${index}].skill`, source),
    harness: validateEnum(
      value.harness,
      ["claude", "codex"] as const,
      `seedRuns[${index}].harness`,
      source,
    ),
    classification: validateEnum(
      value.classification,
      ["active", "done", "blocked", "refused", "unknown"] as const,
      `seedRuns[${index}].classification`,
      source,
    ),
    sessionKind: validateEnum(
      value.sessionKind,
      ["pinned", "heuristic"] as const,
      `seedRuns[${index}].sessionKind`,
      source,
    ),
    sessionId:
      value.sessionId === undefined || value.sessionId === null
        ? null
        : requireString(
            value.sessionId,
            `seedRuns[${index}].sessionId`,
            source,
          ),
    handle:
      value.handle === undefined || value.handle === null
        ? null
        : requireString(value.handle, `seedRuns[${index}].handle`, source),
  };
  if (value.worker !== undefined) {
    if (!isRecord(value.worker))
      fail(source, `seedRuns[${index}].worker must be a mapping.`);
    rejectUnknownFields(
      value.worker,
      SEED_WORKER_FIELDS,
      "seedRun worker",
      source,
    );
    const state = validateEnum(
      value.worker.state,
      ["healthy", "degraded", "stale"] as const,
      `seedRuns[${index}].worker.state`,
      source,
    );
    const age = value.worker.heartbeatAgeMs;
    if (typeof age !== "number")
      fail(
        source,
        `seedRuns[${index}].worker.heartbeatAgeMs must be a number.`,
      );
    seed.worker = { state, heartbeatAgeMs: age };
  }
  return seed;
}

function validateBefore(
  value: unknown,
  where: string,
  source: Source,
): StepBefore {
  if (!isRecord(value)) fail(source, `${where} must be a mapping.`);
  rejectUnknownFields(value, BEFORE_FIELDS, "before", source);
  const before: StepBefore = {};
  if (value.control !== undefined) {
    if (!isRecord(value.control))
      fail(source, `${where}.control must be a mapping.`);
    before.control = value.control;
  }
  if (value.paneEnded !== undefined) {
    before.paneEnded = requireStringArray(
      value.paneEnded,
      `${where}.paneEnded`,
      source,
    );
  }
  if (value.ageWorkerHeartbeatsMs !== undefined) {
    if (typeof value.ageWorkerHeartbeatsMs !== "number") {
      fail(source, `${where}.ageWorkerHeartbeatsMs must be a number.`);
    }
    before.ageWorkerHeartbeatsMs = value.ageWorkerHeartbeatsMs;
  }
  return before;
}

function validateExpect(
  value: unknown,
  where: string,
  source: Source,
): StepExpect {
  if (!isRecord(value)) fail(source, `${where} must be a mapping.`);
  rejectUnknownFields(value, EXPECT_FIELDS, "expect", source);
  if (typeof value.exitCode !== "number")
    fail(source, `${where}.exitCode must be a number.`);
  const expect: StepExpect = { exitCode: value.exitCode };
  if (value.stdoutEquals !== undefined) {
    if (typeof value.stdoutEquals !== "string")
      fail(source, `${where}.stdoutEquals must be a string.`);
    expect.stdoutEquals = value.stdoutEquals;
  }
  if (value.stderrEquals !== undefined) {
    if (typeof value.stderrEquals !== "string")
      fail(source, `${where}.stderrEquals must be a string.`);
    expect.stderrEquals = value.stderrEquals;
  }
  if (value.stdoutContains !== undefined) {
    expect.stdoutContains = requireStringArray(
      value.stdoutContains,
      `${where}.stdoutContains`,
      source,
    );
  }
  if (value.stderrContains !== undefined) {
    expect.stderrContains = requireStringArray(
      value.stderrContains,
      `${where}.stderrContains`,
      source,
    );
  }
  if (value.stdoutNotContains !== undefined) {
    expect.stdoutNotContains = requireStringArray(
      value.stdoutNotContains,
      `${where}.stdoutNotContains`,
      source,
    );
  }
  if (value.stdoutEmpty !== undefined) {
    expect.stdoutEmpty = requireBoolean(
      value.stdoutEmpty,
      `${where}.stdoutEmpty`,
      source,
    );
  }
  return expect;
}

function validateStep(value: unknown, index: number, source: Source): CaseStep {
  if (!isRecord(value)) fail(source, `steps[${index}] must be a mapping.`);
  rejectUnknownFields(value, STEP_FIELDS, "step", source);
  if (!Array.isArray(value.argv) || value.argv.length === 0) {
    fail(source, `steps[${index}].argv must be a non-empty string array.`);
  }
  const argv = value.argv.map((item, argIndex) => {
    if (typeof item !== "string")
      fail(source, `steps[${index}].argv[${argIndex}] must be a string.`);
    return item;
  });
  const cwd =
    value.cwd === undefined
      ? "."
      : requireString(value.cwd, `steps[${index}].cwd`, source);
  const tty =
    value.tty === undefined
      ? false
      : requireBoolean(value.tty, `steps[${index}].tty`, source);
  const stdin =
    value.stdin === undefined
      ? []
      : requireStringArray(value.stdin, `steps[${index}].stdin`, source);
  if (stdin.length > 0 && !tty) {
    fail(source, `steps[${index}].stdin requires tty: true.`);
  }
  const step: CaseStep = {
    argv,
    cwd,
    tty,
    stdin,
    expect: validateExpect(value.expect, `steps[${index}].expect`, source),
  };
  if (value.before !== undefined) {
    step.before = validateBefore(
      value.before,
      `steps[${index}].before`,
      source,
    );
  }
  return step;
}

export function validateCaseManifest(
  value: unknown,
  source: Source,
): CaseManifest {
  if (!isRecord(value)) fail(source, "case manifest must be a mapping.");
  rejectUnknownFields(value, CASE_FIELDS, "case", source);
  const id = requireString(value.id, "id", source);
  if (!CASE_ID_PATTERN.test(id)) fail(source, `invalid case id ${id}`);

  if (!Array.isArray(value.covers) || value.covers.length === 0) {
    fail(source, `${id}.covers must be a non-empty string array.`);
  }
  const seenCovers = new Set<string>();
  const covers = value.covers.map((item, index) => {
    if (typeof item !== "string")
      fail(source, `${id}.covers[${index}] must be a string.`);
    if (!ACCEPTANCE_REF_PATTERN.test(item)) {
      fail(
        source,
        `${id}.covers[${index}] must be an acceptance criterion ref.`,
      );
    }
    if (seenCovers.has(item))
      fail(source, `${id}.covers contains duplicate ref ${item}`);
    seenCovers.add(item);
    return item;
  });

  const title = requireString(value.title, `${id}.title`, source);
  const description = requireString(
    value.description,
    `${id}.description`,
    source,
  );

  const repos =
    value.repos === undefined
      ? ["main"]
      : requireStringArray(value.repos, `${id}.repos`, source);
  if (!repos.includes("main")) fail(source, `${id}.repos must include "main".`);
  for (const repo of repos) {
    if (!REPO_NAME_PATTERN.test(repo))
      fail(source, `${id}.repos has invalid repo name ${repo}`);
  }

  const plainDirs =
    value.plainDirs === undefined
      ? []
      : requireStringArray(value.plainDirs, `${id}.plainDirs`, source).map(
          (dir) => {
            if (!REPO_NAME_PATTERN.test(dir))
              fail(source, `${id}.plainDirs has invalid name ${dir}`);
            return dir;
          },
        );

  const threads =
    value.threads === undefined
      ? []
      : requireStringArray(value.threads, `${id}.threads`, source).map((t) =>
          validateSafeRelPath(`${id}.threads`, t, source),
        );
  const archivedThreads =
    value.archivedThreads === undefined
      ? []
      : requireStringArray(
          value.archivedThreads,
          `${id}.archivedThreads`,
          source,
        ).map((t) => validateSafeRelPath(`${id}.archivedThreads`, t, source));

  const files =
    value.files === undefined
      ? []
      : (() => {
          if (!Array.isArray(value.files))
            fail(source, `${id}.files must be an array.`);
          return value.files.map((item, index) => {
            if (!isRecord(item))
              fail(source, `${id}.files[${index}] must be a mapping.`);
            rejectUnknownFields(
              item,
              new Set(["path", "content"]),
              "file",
              source,
            );
            return {
              path: validateSafeRelPath(
                `${id}.files[${index}].path`,
                item.path,
                source,
              ),
              content: typeof item.content === "string" ? item.content : "",
            };
          });
        })();

  const skills =
    value.skills === undefined
      ? []
      : (() => {
          if (!Array.isArray(value.skills))
            fail(source, `${id}.skills must be an array.`);
          return value.skills.map((item, index) =>
            validateSkill(item, index, source),
          );
        })();

  const control =
    value.control === undefined
      ? {}
      : ((): Record<string, unknown> => {
          if (!isRecord(value.control))
            fail(source, `${id}.control must be a mapping.`);
          return value.control;
        })();

  const seedRuns =
    value.seedRuns === undefined
      ? []
      : (() => {
          if (!Array.isArray(value.seedRuns))
            fail(source, `${id}.seedRuns must be an array.`);
          return value.seedRuns.map((item, index) =>
            validateSeedRun(item, index, source),
          );
        })();

  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    fail(source, `${id}.steps must be a non-empty array.`);
  }
  const steps = value.steps.map((item, index) =>
    validateStep(item, index, source),
  );

  const assertState =
    value.assertState === undefined
      ? []
      : (() => {
          if (!Array.isArray(value.assertState))
            fail(source, `${id}.assertState must be an array.`);
          return value.assertState.map((item, index) => {
            if (!isRecord(item))
              fail(source, `${id}.assertState[${index}] must be a mapping.`);
            return item;
          });
        })();

  const auditRepoWrites =
    value.auditRepoWrites === undefined
      ? true
      : requireBoolean(value.auditRepoWrites, `${id}.auditRepoWrites`, source);

  return {
    id,
    covers,
    title,
    description,
    repos,
    plainDirs,
    threads,
    archivedThreads,
    files,
    skills,
    control,
    seedRuns,
    steps,
    assertState,
    auditRepoWrites,
  };
}

async function findCaseFiles(root: string): Promise<string[]> {
  const casesDir = path.join(root, "test/e2e/cases");
  const entries = await readdir(casesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yml"))
    .map((entry) => path.join(casesDir, entry.name))
    .sort();
}

export async function loadCases(root: string): Promise<LoadedCase[]> {
  const files = await findCaseFiles(root);
  const loaded: LoadedCase[] = [];
  const seen = new Map<string, string>();
  for (const file of files) {
    const relativeFile = path.relative(root, file);
    const parsed = YAML.parse(await readFile(file, "utf8"));
    if (!Array.isArray(parsed)) {
      throw new Error(
        `${relativeFile}: case file must be a list of case manifests.`,
      );
    }
    for (const raw of parsed) {
      const manifest = validateCaseManifest(raw, { filePath: relativeFile });
      const previous = seen.get(manifest.id);
      if (previous !== undefined) {
        throw new Error(
          `duplicate case id ${manifest.id} (${previous} and ${relativeFile})`,
        );
      }
      seen.set(manifest.id, relativeFile);
      loaded.push({ manifest, filePath: relativeFile });
    }
  }
  return loaded;
}
