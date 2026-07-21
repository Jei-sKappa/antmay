// Harness launch integration. This composes the fixed catalog identity, the
// canonical repository cwd, and the harness-specific session binding into a
// single launch through an execution adapter. Claude pins a generated session
// UUID; Codex records a heuristic cwd/spawn-time identity. Both start in the
// repository cwd with their configured permission behavior unchanged, and both
// keep their transcript/session observation roots injectable so Task 5's readers
// can locate the run later. The adapter — not this module — owns pane mechanics.

import type {
  AttachmentHandle,
  CatalogEntry,
  Harness,
  SessionIdentity,
} from "@antmay/core";
import type {
  ExecutionAdapter,
  ObservationEnrichments,
  SpawnSpec,
} from "../adapters/types";
import { planClaudeLaunch } from "./claude";
import { planCodexLaunch } from "./codex";
import { renderSkillInvocation } from "./invocation";

export { planClaudeLaunch } from "./claude";
export { planCodexLaunch } from "./codex";
export type { RenderInvocationInput } from "./invocation";
export { renderSkillInvocation } from "./invocation";

/** Injectable observation roots kept available for later transcript reading. */
export type HarnessObservationEnv = {
  readonly ANTMAY_CLAUDE_TRANSCRIPT_ROOT?: string | undefined;
  readonly ANTMAY_CODEX_SESSION_ROOT?: string | undefined;
};

/** The launch fields a harness planner consumes. */
export type HarnessLaunchInput = {
  /** The resolved executable to launch. */
  readonly harnessExecutable: string;
  /** The canonical repository folder the pane starts in. */
  readonly repositoryPath: string;
  /** The already-rendered initial harness invocation. */
  readonly invocation: string;
  /** Injectable observation roots. */
  readonly env?: HarnessObservationEnv | undefined;
  /** Deterministic session id source for Claude (tests inject this). */
  readonly generateSessionId?: (() => string) | undefined;
  /** Deterministic spawn-time source for Codex (tests inject this). */
  readonly now?: (() => number) | undefined;
};

/**
 * The harness-specific observation binding. Claude carries the pinned session id
 * and its injectable transcript root; Codex carries its injectable session root
 * and the recorded spawn time with no deterministic session id.
 */
export type ObservationBinding =
  | {
      readonly kind: "claude";
      readonly sessionId: string;
      readonly transcriptRoot: string | null;
    }
  | {
      readonly kind: "codex";
      readonly sessionRoot: string | null;
      readonly spawnedAtMs: number;
    };

/** A planned launch: the spawn spec, session identity, and observation binding. */
export type HarnessLaunchPlan = {
  readonly spec: SpawnSpec;
  readonly session: SessionIdentity;
  readonly observation: ObservationBinding;
};

/** The launch request: the resolved catalog/thread/harness fields plus options. */
export type LaunchRequest = {
  readonly skill: CatalogEntry;
  readonly harness: Harness;
  readonly repositoryPath: string;
  readonly threadPath: string;
  readonly request: string | null;
  readonly harnessExecutable: string;
  readonly env?: HarnessObservationEnv | undefined;
  readonly generateSessionId?: (() => string) | undefined;
  readonly now?: (() => number) | undefined;
};

/** The completed launch: the opaque handle plus the binding to record. */
export type HarnessLaunch = {
  readonly handle: AttachmentHandle;
  readonly harness: Harness;
  readonly session: SessionIdentity;
  readonly observation: ObservationBinding;
  readonly invocation: string;
  readonly enrichments?: ObservationEnrichments | undefined;
};

/** Build the harness-specific launch plan from a launch request. */
export function planHarnessLaunch(request: LaunchRequest): HarnessLaunchPlan {
  const invocation = renderSkillInvocation({
    skill: request.skill,
    harness: request.harness,
    threadPath: request.threadPath,
    request: request.request,
  });
  const input: HarnessLaunchInput = {
    harnessExecutable: request.harnessExecutable,
    repositoryPath: request.repositoryPath,
    invocation,
    env: request.env,
    generateSessionId: request.generateSessionId,
    now: request.now,
  };
  return request.harness === "claude"
    ? planClaudeLaunch(input)
    : planCodexLaunch(input);
}

/**
 * Launch a harness through the given adapter. Renders the invocation, plans the
 * harness-specific session binding, and spawns the pane. Any adapter failure
 * propagates unchanged so its retained-pane diagnostic survives.
 */
export function launchHarness(
  adapter: ExecutionAdapter,
  request: LaunchRequest,
): HarnessLaunch {
  const plan = planHarnessLaunch(request);
  const spawned = adapter.spawn(plan.spec);
  return {
    handle: spawned.handle,
    harness: request.harness,
    session: plan.session,
    observation: plan.observation,
    invocation: plan.spec.initialInput,
    enrichments: spawned.enrichments,
  };
}
