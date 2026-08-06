import { appendFile, lstat, mkdir, readdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

import { formatTerminalOutcome } from "../../runner/outcome.js";
import type { ScriptedCaseName } from "./scenario.js";

/** Exact bytes written by `spec-correct` and `spec-correct-delayed`. */
export const SPEC_CORRECT_CONTENT = "# Spec: Fake\n\nPlaceholder\n";

/**
 * How long `spec-correct-delayed` keeps its attempt in flight after writing the
 * spec. The wait performs no work of its own; it exists so the world can be
 * changed underneath a live attempt at a moment the caller chooses, which is
 * what makes drift between preflight and a later stage reproducible without
 * letting a scenario supply code of its own.
 */
export const SPEC_CORRECT_DELAY_MS = 3_000;

/** Fixed newline-terminated append for `reconcile-spec-correct`. */
export const RECONCILE_SPEC_APPEND_LINE =
  "<!-- scripted reconcile-spec append -->\n";

/**
 * Thread-relative path of the queued decision file written by
 * `reconcile-spec-pending-decision`. A direct file of the queue directory, which
 * is what a pending-queue scan counts.
 */
export const RECONCILE_SPEC_PENDING_DECISION_PATH =
  ".pending-decisions/reconcile-spec-fake-decision.md";

/** Exact bytes of that queued decision file. */
export const RECONCILE_SPEC_PENDING_DECISION_CONTENT =
  "# Pending decision: Fake\n\nPlaceholder decision awaiting a human.\n";

/**
 * Thread-relative path of the queued decision file written by
 * `outcome-blocked-pending-decision`, distinct from the reconcile-spec one so a
 * scenario can use both without either overwriting the other.
 */
export const BLOCKED_PENDING_DECISION_PATH =
  ".pending-decisions/blocked-fake-decision.md";

/**
 * Thread-relative paths of the queued files written by
 * `outcome-blocked-long-detail`, spanning both queues with deliberately long
 * names so the rendered pending list is wide enough to expose wrapping.
 */
export const LONG_DETAIL_PENDING_PATHS: readonly string[] = [
  ".pending-decisions/whether-to-normalize-thread-relative-paths-before-comparison.md",
  ".pending-decisions/which-harness-owns-the-retry-budget-when-a-stage-reruns.md",
  ".pending-reviews/boundary-engine-selector-resolution-findings-severity-ordered.md",
];

/** Exact bytes of every file `outcome-blocked-long-detail` queues. */
export const LONG_DETAIL_PENDING_CONTENT =
  "# Pending: Fake\n\nPlaceholder awaiting a human.\n";

/**
 * The deliberately long reason `outcome-blocked-long-detail` reports, sized to
 * overflow one terminal line so the closing block's alignment column and
 * wrapping are visible.
 */
export const LONG_DETAIL_TEXT =
  "The stage cannot proceed because the thread's spec contradicts the roadmap " +
  "it descends from: the roadmap allocates this thread the read path only, " +
  "while the spec as written also claims the write path, and nothing in either " +
  "artifact records which of the two the human intended.";

/** The final line `outcome-malformed` ends on: prose that parses to no token. */
export const MALFORMED_FINAL_TEXT =
  "I think that covers it — let me know if you want anything adjusted.";

/** Fixed `plan.md` body for `plan-strict-correct`. */
export const PLAN_STRICT_PLAN_CONTENT = "# Plan: Fake\n\nPlaceholder plan.\n";

/** Owned task files for `plan-strict-correct`, keyed by thread-relative path. */
export const PLAN_STRICT_OWNED_TASKS: Readonly<Record<string, string>> = {
  "plan-tasks/01-fake-task.md": "# Task 01\n\nPlaceholder task.\n",
};

/** Fixed newline-terminated append for `reconcile-plan-correct`. */
export const RECONCILE_PLAN_APPEND_LINE =
  "<!-- scripted reconcile-plan append -->\n";

/** Exact bytes written by `implement-plan-with-subagents-correct`. */
export const IMPLEMENT_REPORT_CONTENT =
  "# Implementation Report: Fake\n\nPlaceholder report.\n";

/**
 * One line of a case's progress: prose the agent narrated, or a tool call it
 * made. A tool line names the operation the case genuinely performed and the
 * arguments it performed it with, so the rendered call describes real work.
 * Narration comes before the call it announces, the order a real agent produces.
 */
export type TranscriptLine = string | { tool: string; args: string };

/**
 * How a case ends once its transcript is out: ordinarily, on the final message
 * carrying the terminal outcome line; on a harness failure the provider returned
 * instead of a result; or on a wait that only an abort ends.
 */
export type ScriptedCaseEnding =
  | { kind: "ordinary"; finalText: string }
  | {
      kind: "failed";
      category: "idle-timeout" | "provider-error";
      errorMessage: string;
    }
  | { kind: "await-abort" };

/**
 * What a case leaves the adapter once its deterministic effects are applied: the
 * transcript to stream and log, and how the case ended. A refused effect reports
 * the reason instead, for the adapter to normalize.
 */
export type ScriptedCaseExecution =
  | {
      ok: true;
      transcript: readonly TranscriptLine[];
      ending: ScriptedCaseEnding;
    }
  | { ok: false; error: string };

/** Where a case may apply its effects: the one selected thread, both ways named. */
export type ScriptedCaseContext = {
  readonly threadRelPath: string;
  readonly threadAbsRoot: string;
};

/**
 * A successful case reports the progress lines it produced while doing its work
 * and how it ended: the final message carrying the terminal outcome line, or an
 * ending that produced no result at all. Every progress line describes an
 * operation the case genuinely performed, so the transcript never claims work
 * that did not happen.
 */
type CaseHandlerResult =
  | { ok: true; progress: readonly TranscriptLine[]; finalText: string }
  | {
      ok: true;
      progress: readonly TranscriptLine[];
      ending: Exclude<ScriptedCaseEnding, { kind: "ordinary" }>;
    }
  | { ok: false; error: string };

type CaseHandler = (context: ScriptedCaseContext) => Promise<CaseHandlerResult>;

type OwnedFileWrite = {
  threadRelativePath: string;
  absPath: string;
  parentAbs: string;
  content: string;
};

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

/**
 * Resolve the absolute root the case's effects are confined to, refusing any
 * thread path that is not a real directory inside the attempt's workspace.
 */
export async function resolveScriptedThreadRoot(
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

async function prepareOwnedFileWrite(
  threadRelPath: string,
  threadAbsRoot: string,
  threadRelativePath: string,
  content: string,
): Promise<
  { ok: true; write: OwnedFileWrite } | { ok: false; error: string }
> {
  if (!isThreadRelativePathWithin(threadRelPath, threadRelativePath)) {
    return { ok: false, error: "thread-relative path escapes the selected thread." };
  }
  const absPath = joinThreadAbs(threadAbsRoot, threadRelativePath);
  const lexicalDest = await assertLexicalWriteDestination(absPath);
  if (!lexicalDest.ok) {
    return lexicalDest;
  }
  const parentSegments = threadRelativePath.split("/").slice(0, -1);
  let currentParent = threadAbsRoot;
  for (const segment of parentSegments) {
    currentParent = path.join(currentParent, segment);
    let stat;
    try {
      stat = await lstat(currentParent);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        break;
      }
      return { ok: false, error: "destination parent is not accessible." };
    }
    if (stat.isSymbolicLink()) {
      return { ok: false, error: "destination parent must not be a symlink." };
    }
    if (!stat.isDirectory()) {
      return { ok: false, error: "destination parent must be a directory." };
    }
    const contained = await assertPathContainedInThread(
      threadAbsRoot,
      currentParent,
    );
    if (!contained.ok) {
      return contained;
    }
  }

  return {
    ok: true,
    write: {
      threadRelativePath,
      absPath,
      parentAbs: path.dirname(absPath),
      content,
    },
  };
}

async function applyOwnedFileWrite(
  write: OwnedFileWrite,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await mkdir(write.parentAbs, { recursive: true });
    await writeFile(write.absPath, write.content, "utf8");
  } catch (error) {
    return {
      ok: false,
      error: `failed to write ${write.threadRelativePath}: ${(error as Error).message}`,
    };
  }
  return { ok: true };
}

async function writeOwnedFile(
  threadRelPath: string,
  threadAbsRoot: string,
  threadRelativePath: string,
  content: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const prepared = await prepareOwnedFileWrite(
    threadRelPath,
    threadAbsRoot,
    threadRelativePath,
    content,
  );
  if (!prepared.ok) {
    return prepared;
  }
  return applyOwnedFileWrite(prepared.write);
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

/** One argument value a rendered tool call can carry. */
type ToolArgValue = string | number | boolean;

/**
 * The tool line for one operation, with its arguments rendered as compact JSON
 * in the order given. Every case builds its tool lines through this, so no
 * handler hand-writes the argument string and no path escapes rendering.
 */
function toolLine(
  tool: string,
  args: Readonly<Record<string, ToolArgValue>>,
): TranscriptLine {
  return { tool, args: JSON.stringify(args) };
}

/** The tool line describing a file read the case performed. */
function readFileToolLine(threadRelativePath: string): TranscriptLine {
  return toolLine("read_file", { path: threadRelativePath });
}

/** The tool line describing a directory listing the case performed. */
function listDirToolLine(threadRelativePath: string): TranscriptLine {
  return toolLine("list_dir", { path: threadRelativePath });
}

/**
 * The tool line describing a whole-file write the case performed. A case that
 * genuinely passed further arguments supplies them in `extraArgs`, appended
 * after the shared ones.
 */
function writeFileToolLine(
  threadRelativePath: string,
  content: string,
  extraArgs: Readonly<Record<string, ToolArgValue>> = {},
): TranscriptLine {
  return toolLine("write_file", {
    path: threadRelativePath,
    bytes: content.length,
    encoding: "utf8",
    ...extraArgs,
  });
}

/** The tool line describing an append the case performed. */
function appendFileToolLine(
  threadRelativePath: string,
  content: string,
): TranscriptLine {
  return toolLine("append_file", {
    path: threadRelativePath,
    bytes: content.length,
    encoding: "utf8",
  });
}

/**
 * Check the thread's `spec.md` and append the fixed reconcile note to it,
 * reporting the progress lines for the work performed.
 */
async function appendFakeSpecNote(
  threadRelPath: string,
  threadAbsRoot: string,
): Promise<
  | { ok: true; progress: readonly TranscriptLine[] }
  | { ok: false; error: string }
> {
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
    progress: [
      "Checking spec.md.",
      readFileToolLine("spec.md"),
      "Appending a fake note to spec.md.",
      appendFileToolLine("spec.md", RECONCILE_SPEC_APPEND_LINE),
    ],
  };
}

const CASE_HANDLERS: Record<ScriptedCaseName, CaseHandler> = {
  "outcome-done": async () => ({
    ok: true,
    progress: ["Making no changes."],
    finalText: formatTerminalOutcome("DONE", "Fake completion; no files changed"),
  }),
  "outcome-blocked": async () => ({
    ok: true,
    progress: ["Making no changes."],
    finalText: formatTerminalOutcome("BLOCKED", "Fake pause; no files changed"),
  }),
  "outcome-refused": async () => ({
    ok: true,
    progress: ["Making no changes."],
    finalText: formatTerminalOutcome("REFUSED", "Fake refusal; no files changed"),
  }),
  "outcome-malformed": async () => ({
    ok: true,
    progress: ["Making no changes."],
    finalText: MALFORMED_FINAL_TEXT,
  }),
  "outcome-blocked-pending-decision": async ({
    threadRelPath,
    threadAbsRoot,
  }) => {
    const queued = await writeOwnedFile(
      threadRelPath,
      threadAbsRoot,
      BLOCKED_PENDING_DECISION_PATH,
      RECONCILE_SPEC_PENDING_DECISION_CONTENT,
    );
    if (!queued.ok) {
      return queued;
    }
    return {
      ok: true,
      progress: [`Writing ${BLOCKED_PENDING_DECISION_PATH}.`],
      finalText: formatTerminalOutcome(
        "BLOCKED",
        `Fake pause; one fake decision queued: ${BLOCKED_PENDING_DECISION_PATH}`,
      ),
    };
  },
  "outcome-blocked-long-detail": async ({ threadRelPath, threadAbsRoot }) => {
    const progress: TranscriptLine[] = [];
    for (const queuePath of LONG_DETAIL_PENDING_PATHS) {
      const queued = await writeOwnedFile(
        threadRelPath,
        threadAbsRoot,
        queuePath,
        LONG_DETAIL_PENDING_CONTENT,
      );
      if (!queued.ok) {
        return queued;
      }
      progress.push(`Writing ${queuePath}.`);
      progress.push(
        writeFileToolLine(queuePath, LONG_DETAIL_PENDING_CONTENT, {
          create_parents: true,
          overwrite: true,
          reason:
            "queue the pending bundle this stage cannot settle on its own",
        }),
      );
    }
    return {
      ok: true,
      progress,
      finalText: formatTerminalOutcome("BLOCKED", LONG_DETAIL_TEXT),
    };
  },
  "harness-provider-error": async () => ({
    ok: true,
    progress: ["Making no changes."],
    ending: {
      kind: "failed",
      category: "provider-error",
      errorMessage:
        "the provider closed the stream before the agent returned a result",
    },
  }),
  "harness-idle-timeout": async () => ({
    ok: true,
    progress: ["Making no changes."],
    ending: {
      kind: "failed",
      category: "idle-timeout",
      errorMessage: "the agent produced no output within the idle timeout",
    },
  }),
  "harness-hang": async () => ({
    ok: true,
    progress: ["Making no changes."],
    ending: { kind: "await-abort" },
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
      progress: ["Writing spec.md.", writeFileToolLine("spec.md", SPEC_CORRECT_CONTENT)],
      finalText: formatTerminalOutcome("DONE", "Fake spec written: spec.md"),
    };
  },
  "spec-correct-delayed": async ({ threadRelPath, threadAbsRoot }) => {
    const result = await writeOwnedFile(
      threadRelPath,
      threadAbsRoot,
      "spec.md",
      SPEC_CORRECT_CONTENT,
    );
    if (!result.ok) {
      return result;
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, SPEC_CORRECT_DELAY_MS);
    });
    return {
      ok: true,
      progress: [
        "Writing spec.md.",
        writeFileToolLine("spec.md", SPEC_CORRECT_CONTENT),
        `Waiting ${SPEC_CORRECT_DELAY_MS / 1000}s before finishing.`,
      ],
      finalText: formatTerminalOutcome("DONE", "Fake spec written: spec.md"),
    };
  },
  "reconcile-spec-correct": async ({ threadRelPath, threadAbsRoot }) => {
    const append = await appendFakeSpecNote(threadRelPath, threadAbsRoot);
    if (!append.ok) {
      return append;
    }
    return {
      ok: true,
      progress: [...append.progress],
      finalText: formatTerminalOutcome("DONE", "Fake reconciliation appended: spec.md"),
    };
  },
  "reconcile-spec-pending-decision": async ({
    threadRelPath,
    threadAbsRoot,
  }) => {
    const append = await appendFakeSpecNote(threadRelPath, threadAbsRoot);
    if (!append.ok) {
      return append;
    }
    const queued = await writeOwnedFile(
      threadRelPath,
      threadAbsRoot,
      RECONCILE_SPEC_PENDING_DECISION_PATH,
      RECONCILE_SPEC_PENDING_DECISION_CONTENT,
    );
    if (!queued.ok) {
      return queued;
    }
    return {
      ok: true,
      progress: [
        ...append.progress,
        `Writing ${RECONCILE_SPEC_PENDING_DECISION_PATH}.`,
        writeFileToolLine(
          RECONCILE_SPEC_PENDING_DECISION_PATH,
          RECONCILE_SPEC_PENDING_DECISION_CONTENT,
        ),
      ],
      finalText: formatTerminalOutcome(
        "DONE",
        `Fake reconciliation appended: spec.md; one fake decision queued: ${RECONCILE_SPEC_PENDING_DECISION_PATH}`,
      ),
    };
  },
  "plan-strict-correct": async ({ threadRelPath, threadAbsRoot }) => {
    const ownedWrites = [
      ["plan.md", PLAN_STRICT_PLAN_CONTENT],
      ...Object.entries(PLAN_STRICT_OWNED_TASKS),
    ] as const;
    const preparedWrites: OwnedFileWrite[] = [];
    for (const [relPath, content] of ownedWrites) {
      const prepared = await prepareOwnedFileWrite(
        threadRelPath,
        threadAbsRoot,
        relPath,
        content,
      );
      if (!prepared.ok) {
        return prepared;
      }
      preparedWrites.push(prepared.write);
    }
    const progress: TranscriptLine[] = [];
    for (const write of preparedWrites) {
      const applied = await applyOwnedFileWrite(write);
      if (!applied.ok) {
        return applied;
      }
      progress.push(`Writing ${write.threadRelativePath}.`);
      progress.push(writeFileToolLine(write.threadRelativePath, write.content));
    }
    return {
      ok: true,
      progress,
      finalText: formatTerminalOutcome("DONE", "Fake plan written: plan.md"),
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

    const progress: TranscriptLine[] = [
      "Checking plan.md.",
      readFileToolLine("plan.md"),
      "Listing plan-tasks/.",
      listDirToolLine("plan-tasks"),
    ];

    const planAppend = await appendOwnedFile(
      threadRelPath,
      threadAbsRoot,
      "plan.md",
      RECONCILE_PLAN_APPEND_LINE,
    );
    if (!planAppend.ok) {
      return planAppend;
    }
    progress.push("Appending a fake note to plan.md.");
    progress.push(appendFileToolLine("plan.md", RECONCILE_PLAN_APPEND_LINE));

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
      progress.push(`Appending a fake note to ${taskRelPath}.`);
      progress.push(appendFileToolLine(taskRelPath, RECONCILE_PLAN_APPEND_LINE));
    }

    return {
      ok: true,
      progress,
      finalText: formatTerminalOutcome("DONE", "Fake reconciliation appended: plan.md"),
    };
  },

  "implement-plan-with-subagents-correct": async ({
    threadRelPath,
    threadAbsRoot,
  }) => {
    const result = await writeOwnedFile(
      threadRelPath,
      threadAbsRoot,
      "implementation-report.md",
      IMPLEMENT_REPORT_CONTENT,
    );
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      progress: [
        "Writing implementation-report.md.",
        writeFileToolLine("implementation-report.md", IMPLEMENT_REPORT_CONTENT),
      ],
      finalText: formatTerminalOutcome(
        "DONE",
        "Fake implementation report written: implementation-report.md",
      ),
    };
  },
};

/**
 * The case names this catalog implements, exposed so a test can hold the
 * handlers to exactly the names the scenario validator accepts.
 */
export const SCRIPTED_CASE_HANDLER_NAMES: readonly ScriptedCaseName[] =
  Object.freeze(Object.keys(CASE_HANDLERS) as ScriptedCaseName[]);

/**
 * Apply one already-validated case's deterministic effects inside the selected
 * thread and report the transcript and ending the adapter surfaces. A case that
 * ends ordinarily streams its final message as the last transcript line; one
 * that fails or waits streams only the work it did.
 */
export async function executeScriptedCase(
  caseName: ScriptedCaseName,
  context: ScriptedCaseContext,
): Promise<ScriptedCaseExecution> {
  const result = await CASE_HANDLERS[caseName](context);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  if ("finalText" in result) {
    return {
      ok: true,
      transcript: [...result.progress, result.finalText],
      ending: { kind: "ordinary", finalText: result.finalText },
    };
  }
  return {
    ok: true,
    transcript: [...result.progress],
    ending: result.ending,
  };
}
