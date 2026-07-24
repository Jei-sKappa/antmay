import { appendFile, lstat, mkdir, readdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

import { renderStagePrompt } from "../prompt.js";
import type {
  AttemptOutcome,
  AttemptRequest,
  HarnessEvent,
  HarnessInvoker,
} from "../types.js";
import { resolveStageTarget } from "../../recipe/targets.js";
import type { ScriptedCaseName, ScriptedScenario } from "./scenario.js";
import { isCaseCompatibleWithStage } from "./scenario.js";

/** Error class name surfaced on scripted adapter failures. */
export const SCRIPTED_HARNESS_ERROR_CLASS = "ScriptedHarnessError";

/** Exact bytes written by `spec-correct`. */
export const SPEC_CORRECT_CONTENT = "# Spec: Fake\n\nPlaceholder\n";

/** Fixed newline-terminated append for `reconcile-spec-correct`. */
export const RECONCILE_SPEC_APPEND_LINE =
  "<!-- scripted reconcile-spec append -->\n";

/** Fixed `plan.md` body for `plan-strict-correct`. */
export const PLAN_STRICT_PLAN_CONTENT = "# Plan: Fake\n\nPlaceholder plan.\n";

/** Owned task files for `plan-strict-correct`, keyed by thread-relative path. */
export const PLAN_STRICT_OWNED_TASKS: Readonly<Record<string, string>> = {
  "plan-tasks/01-fake-task.md": "# Task 01\n\nPlaceholder task.\n",
};

/** Fixed newline-terminated append for `reconcile-plan-correct`. */
export const RECONCILE_PLAN_APPEND_LINE =
  "<!-- scripted reconcile-plan append -->\n";

const ABORTED_OUTCOME: AttemptOutcome = {
  kind: "failed",
  category: "aborted",
  errorClass: "AbortError",
  errorMessage: "The attempt was aborted by a signal.",
};

type CaseHandlerResult =
  | { ok: true; finalText: string; effectSummary: string }
  | { ok: false; error: string };

type CaseHandler = (ctx: CaseContext) => Promise<CaseHandlerResult>;

type CaseContext = {
  request: AttemptRequest;
  caseName: ScriptedCaseName;
  threadRelPath: string;
  threadAbsRoot: string;
};

function scriptedProviderError(message: string): AttemptOutcome {
  return {
    kind: "failed",
    category: "provider-error",
    errorClass: SCRIPTED_HARNESS_ERROR_CLASS,
    errorMessage: message,
  };
}

function threadPosixBase(threadRelPath: string): string {
  return path.posix.normalize(`${threadRelPath.replace(/\/+$/, "")}/`);
}

function isThreadRelativePathWithin(
  threadRelPath: string,
  threadRelativePath: string,
): boolean {
  if (threadRelativePath.length === 0) {
    return false;
  }
  if (path.posix.isAbsolute(threadRelativePath)) {
    return false;
  }
  if (threadRelativePath.split("/").some((segment) => segment === "..")) {
    return false;
  }
  const joined = path.posix.join(threadRelPath, threadRelativePath);
  return isPosixWithinThread(threadRelPath, joined);
}

function isPosixWithinThread(
  threadRelPath: string,
  repoRelativePath: string,
): boolean {
  const base = threadPosixBase(threadRelPath);
  const normalized = path.posix.normalize(repoRelativePath);
  if (normalized === base.slice(0, -1)) {
    return true;
  }
  return normalized.startsWith(base);
}

function joinThreadAbs(threadAbsRoot: string, threadRelativePath: string): string {
  return path.join(threadAbsRoot, ...threadRelativePath.split("/"));
}

async function resolveThreadAbsRoot(
  workspaceCwd: string,
  threadRelPath: string,
): Promise<{ ok: true; absPath: string } | { ok: false; error: string }> {
  if (threadRelPath.length === 0) {
    return { ok: false, error: "threadRelPath must not be empty." };
  }
  if (path.posix.isAbsolute(threadRelPath)) {
    return { ok: false, error: "threadRelPath must be a relative POSIX path." };
  }
  if (threadRelPath.split("/").some((segment) => segment === "..")) {
    return { ok: false, error: "threadRelPath must not contain .. segments." };
  }

  const workspaceAbs = path.resolve(workspaceCwd);
  const threadJoined = path.resolve(workspaceAbs, threadRelPath);

  let workspaceReal: string;
  try {
    workspaceReal = await realpath(workspaceAbs);
  } catch {
    return { ok: false, error: "workspace cwd is not accessible." };
  }

  const workspacePrefix = `${workspaceReal}${path.sep}`;
  if (
    threadJoined !== workspaceReal &&
    !threadJoined.startsWith(workspacePrefix)
  ) {
    return { ok: false, error: "threadRelPath escapes the workspace." };
  }

  let threadReal: string;
  try {
    threadReal = await realpath(threadJoined);
  } catch {
    return { ok: false, error: "selected thread directory does not exist." };
  }

  if (
    threadReal !== workspaceReal &&
    !threadReal.startsWith(workspacePrefix)
  ) {
    return { ok: false, error: "selected thread escapes the workspace." };
  }

  return { ok: true, absPath: threadReal };
}

async function assertPathContainedInThread(
  threadAbsRoot: string,
  candidateAbs: string,
): Promise<{ ok: true; resolvedAbs: string } | { ok: false; error: string }> {
  const threadPrefix = `${threadAbsRoot}${path.sep}`;
  let resolved: string;

  try {
    resolved = await realpath(candidateAbs);
  } catch {
    const parentAbs = path.dirname(candidateAbs);
    let parentReal: string;
    try {
      parentReal = await realpath(parentAbs);
    } catch {
      return { ok: false, error: "destination parent is not accessible." };
    }
    resolved = path.join(parentReal, path.basename(candidateAbs));
  }

  if (resolved !== threadAbsRoot && !resolved.startsWith(threadPrefix)) {
    return { ok: false, error: "path escapes the selected thread." };
  }

  return { ok: true, resolvedAbs: resolved };
}

async function assertLexicalPrerequisiteFile(
  absPath: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let stat;
  try {
    stat = await lstat(absPath);
  } catch {
    return { ok: false, error: `required file is missing: ${absPath}` };
  }
  if (stat.isSymbolicLink()) {
    return { ok: false, error: "required file must not be a symlink." };
  }
  if (!stat.isFile()) {
    return { ok: false, error: "required path is not a regular file." };
  }
  return { ok: true };
}

async function assertLexicalWriteDestination(
  absPath: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let stat;
  try {
    stat = await lstat(absPath);
  } catch {
    return { ok: true };
  }
  if (stat.isSymbolicLink()) {
    return { ok: false, error: "destination must not be a symlink." };
  }
  if (!stat.isFile()) {
    return { ok: false, error: "destination path is not a regular file." };
  }
  return { ok: true };
}

async function writeOwnedFile(
  threadRelPath: string,
  threadAbsRoot: string,
  threadRelativePath: string,
  content: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isThreadRelativePathWithin(threadRelPath, threadRelativePath)) {
    return { ok: false, error: "thread-relative path escapes the selected thread." };
  }
  const absPath = joinThreadAbs(threadAbsRoot, threadRelativePath);
  const lexicalDest = await assertLexicalWriteDestination(absPath);
  if (!lexicalDest.ok) {
    return lexicalDest;
  }
  const contained = await assertPathContainedInThread(threadAbsRoot, absPath);
  if (!contained.ok) {
    return contained;
  }

  const parentAbs = path.dirname(contained.resolvedAbs);
  const parentContained = await assertPathContainedInThread(
    threadAbsRoot,
    parentAbs,
  );
  if (!parentContained.ok) {
    return parentContained;
  }

  try {
    await mkdir(parentAbs, { recursive: true });
    await writeFile(contained.resolvedAbs, content, "utf8");
  } catch (error) {
    return {
      ok: false,
      error: `failed to write ${threadRelativePath}: ${(error as Error).message}`,
    };
  }
  return { ok: true };
}

async function appendOwnedFile(
  threadRelPath: string,
  threadAbsRoot: string,
  threadRelativePath: string,
  line: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isThreadRelativePathWithin(threadRelPath, threadRelativePath)) {
    return { ok: false, error: "thread-relative path escapes the selected thread." };
  }
  const absPath = joinThreadAbs(threadAbsRoot, threadRelativePath);
  const prerequisite = await assertLexicalPrerequisiteFile(absPath);
  if (!prerequisite.ok) {
    return prerequisite;
  }
  const contained = await assertPathContainedInThread(threadAbsRoot, absPath);
  if (!contained.ok) {
    return contained;
  }
  try {
    await appendFile(contained.resolvedAbs, line, "utf8");
  } catch (error) {
    return {
      ok: false,
      error: `failed to append to ${threadRelativePath}: ${(error as Error).message}`,
    };
  }
  return { ok: true };
}

async function listSafeRegularMarkdownTasks(
  threadAbsRoot: string,
  planTasksRelDir: string,
): Promise<
  { ok: true; paths: string[] } | { ok: false; error: string }
> {
  const dirAbs = joinThreadAbs(threadAbsRoot, planTasksRelDir);
  const contained = await assertPathContainedInThread(threadAbsRoot, dirAbs);
  if (!contained.ok) {
    return contained;
  }

  let entries: string[];
  try {
    entries = await readdir(contained.resolvedAbs);
  } catch {
    return { ok: false, error: "plan-tasks directory is missing." };
  }

  const markdownFiles: string[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) {
      continue;
    }
    const relPath = path.posix.join(planTasksRelDir, entry);
    const fileAbs = joinThreadAbs(threadAbsRoot, relPath);
    const safe = await assertLexicalPrerequisiteFile(fileAbs);
    if (!safe.ok) {
      return safe;
    }
    const fileContained = await assertPathContainedInThread(
      threadAbsRoot,
      fileAbs,
    );
    if (!fileContained.ok) {
      return fileContained;
    }
    markdownFiles.push(relPath);
  }

  markdownFiles.sort((left, right) => left.localeCompare(right, "en"));
  if (markdownFiles.length === 0) {
    return { ok: false, error: "plan-tasks must contain at least one task file." };
  }
  return { ok: true, paths: markdownFiles };
}

function validateRequestShape(
  request: AttemptRequest,
): { ok: true } | { ok: false; error: string } {
  if (!Number.isInteger(request.stage.attemptNumber)) {
    return { ok: false, error: "attemptNumber must be a positive integer." };
  }
  if (request.stage.attemptNumber < 1) {
    return { ok: false, error: "attemptNumber must be at least 1." };
  }

  const expectedTarget = resolveStageTarget(
    request.stage.target,
    request.stage.threadRelPath,
  );
  if (!expectedTarget.ok) {
    return { ok: false, error: expectedTarget.error };
  }
  if (request.stage.resolvedTarget !== expectedTarget.path) {
    return {
      ok: false,
      error: "resolvedTarget does not match the stage target for the thread.",
    };
  }

  const expectedPrompt = renderStagePrompt(
    request.harness,
    request.stage.skill,
    request.stage.resolvedTarget,
    request.stage.profilePrompt,
  );
  if (request.prompt !== expectedPrompt) {
    return { ok: false, error: "prompt does not match the expected stage prompt." };
  }

  return { ok: true };
}

function selectCase(
  scenario: ScriptedScenario,
  request: AttemptRequest,
):
  | { ok: true; caseName: ScriptedCaseName }
  | { ok: false; error: string } {
  const stageCases = scenario.stages[request.stage.id];
  if (stageCases === undefined) {
    return {
      ok: false,
      error: `no scripted cases configured for stage ${request.stage.id}.`,
    };
  }

  const index = request.stage.attemptNumber - 1;
  if (index >= stageCases.length) {
    return {
      ok: false,
      error: `scripted cases exhausted for stage ${request.stage.id} at attempt ${request.stage.attemptNumber}.`,
    };
  }

  const caseName = stageCases[index]!;
  if (!isCaseCompatibleWithStage(caseName, request.stage.id)) {
    return {
      ok: false,
      error: `case ${caseName} is not compatible with stage ${request.stage.id}.`,
    };
  }

  return { ok: true, caseName };
}

function emitCaseEvent(
  request: AttemptRequest,
  caseName: ScriptedCaseName,
): { ok: true } | { ok: false; error: string } {
  const event: HarnessEvent = {
    type: "text",
    text: `[scripted-harness] case=${caseName}`,
  };
  try {
    request.onEvent(event);
  } catch (error) {
    return {
      ok: false,
      error: `event callback failed: ${(error as Error).message}`,
    };
  }
  return { ok: true };
}

async function appendVerboseLog(
  request: AttemptRequest,
  caseName: ScriptedCaseName,
  effectSummary: string,
  outcomeLine: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const details = [
    "scripted-harness verbose",
    `stage=${request.stage.id}`,
    `attempt=${request.stage.attemptNumber}`,
    `case=${caseName}`,
    `effect=${effectSummary}`,
    `outcome=${outcomeLine}`,
  ].join(" ");
  try {
    await appendFile(request.logFilePath, `${details}\n`, "utf8");
  } catch (error) {
    return {
      ok: false,
      error: `failed to append attempt log: ${(error as Error).message}`,
    };
  }
  return { ok: true };
}

const CASE_HANDLERS: Record<ScriptedCaseName, CaseHandler> = {
  "outcome-done": async () => ({
    ok: true,
    finalText: "Scripted completion.\nOutcome: DONE",
    effectSummary: "no-change",
  }),
  "outcome-blocked": async () => ({
    ok: true,
    finalText: "Scripted pause.\nOutcome: BLOCKED",
    effectSummary: "no-change",
  }),
  "outcome-refused": async () => ({
    ok: true,
    finalText: "Scripted refusal.\nOutcome: REFUSED",
    effectSummary: "no-change",
  }),
  "spec-correct": async ({ threadRelPath, threadAbsRoot }) => {
    const result = await writeOwnedFile(
      threadRelPath,
      threadAbsRoot,
      "spec.md",
      SPEC_CORRECT_CONTENT,
    );
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      finalText: "Scripted spec write.\nOutcome: DONE",
      effectSummary: "write spec.md",
    };
  },
  "reconcile-spec-correct": async ({ threadRelPath, threadAbsRoot }) => {
    const specAbs = joinThreadAbs(threadAbsRoot, "spec.md");
    const prerequisite = await assertLexicalPrerequisiteFile(specAbs);
    if (!prerequisite.ok) {
      return prerequisite;
    }
    const contained = await assertPathContainedInThread(threadAbsRoot, specAbs);
    if (!contained.ok) {
      return contained;
    }
    const append = await appendOwnedFile(
      threadRelPath,
      threadAbsRoot,
      "spec.md",
      RECONCILE_SPEC_APPEND_LINE,
    );
    if (!append.ok) {
      return append;
    }
    return {
      ok: true,
      finalText: "Scripted spec reconcile.\nOutcome: DONE",
      effectSummary: "append spec.md",
    };
  },
  "plan-strict-correct": async ({ threadRelPath, threadAbsRoot }) => {
    const planWrite = await writeOwnedFile(
      threadRelPath,
      threadAbsRoot,
      "plan.md",
      PLAN_STRICT_PLAN_CONTENT,
    );
    if (!planWrite.ok) {
      return planWrite;
    }
    for (const [relPath, content] of Object.entries(PLAN_STRICT_OWNED_TASKS)) {
      const taskWrite = await writeOwnedFile(
        threadRelPath,
        threadAbsRoot,
        relPath,
        content,
      );
      if (!taskWrite.ok) {
        return taskWrite;
      }
    }
    return {
      ok: true,
      finalText: "Scripted plan write.\nOutcome: DONE",
      effectSummary: "write plan.md and owned plan-tasks files",
    };
  },
  "reconcile-plan-correct": async ({ threadRelPath, threadAbsRoot }) => {
    const planAbs = joinThreadAbs(threadAbsRoot, "plan.md");
    const planPrerequisite = await assertLexicalPrerequisiteFile(planAbs);
    if (!planPrerequisite.ok) {
      return planPrerequisite;
    }
    const planContained = await assertPathContainedInThread(
      threadAbsRoot,
      planAbs,
    );
    if (!planContained.ok) {
      return planContained;
    }

    const tasks = await listSafeRegularMarkdownTasks(
      threadAbsRoot,
      "plan-tasks",
    );
    if (!tasks.ok) {
      return tasks;
    }

    const planAppend = await appendOwnedFile(
      threadRelPath,
      threadAbsRoot,
      "plan.md",
      RECONCILE_PLAN_APPEND_LINE,
    );
    if (!planAppend.ok) {
      return planAppend;
    }

    for (const taskRelPath of tasks.paths) {
      const taskAppend = await appendOwnedFile(
        threadRelPath,
        threadAbsRoot,
        taskRelPath,
        RECONCILE_PLAN_APPEND_LINE,
      );
      if (!taskAppend.ok) {
        return taskAppend;
      }
    }

    return {
      ok: true,
      finalText: "Scripted plan reconcile.\nOutcome: DONE",
      effectSummary: `append plan.md and ${tasks.paths.length} task file(s)`,
    };
  },
};

async function invokeScripted(
  scenario: ScriptedScenario,
  request: AttemptRequest,
): Promise<AttemptOutcome> {
  const shape = validateRequestShape(request);
  if (!shape.ok) {
    return scriptedProviderError(shape.error);
  }

  const selected = selectCase(scenario, request);
  if (!selected.ok) {
    return scriptedProviderError(selected.error);
  }

  const threadRoot = await resolveThreadAbsRoot(
    request.workspace.cwd,
    request.stage.threadRelPath,
  );
  if (!threadRoot.ok) {
    return scriptedProviderError(threadRoot.error);
  }

  if (request.signal.aborted) {
    return ABORTED_OUTCOME;
  }

  const handler = CASE_HANDLERS[selected.caseName];
  const effect = await handler({
    request,
    caseName: selected.caseName,
    threadRelPath: request.stage.threadRelPath,
    threadAbsRoot: threadRoot.absPath,
  });
  if (!effect.ok) {
    return scriptedProviderError(effect.error);
  }

  const event = emitCaseEvent(request, selected.caseName);
  if (!event.ok) {
    return scriptedProviderError(event.error);
  }

  const outcomeLine = effect.finalText.split("\n").at(-1) ?? "Outcome: DONE";
  const log = await appendVerboseLog(
    request,
    selected.caseName,
    effect.effectSummary,
    outcomeLine,
  );
  if (!log.ok) {
    return scriptedProviderError(log.error);
  }

  return { kind: "completed", finalText: effect.finalText };
}

/**
 * Create a provider-neutral scripted harness invoker bound to a validated
 * scenario. Case selection uses explicit stage ID and durable attempt number
 * only; failures normalize to provider-error outcomes at the adapter boundary.
 */
export function createScriptedInvoker(scenario: ScriptedScenario): HarnessInvoker {
  return {
    invoke(request: AttemptRequest): Promise<AttemptOutcome> {
      return invokeScripted(scenario, request);
    },
  };
}
