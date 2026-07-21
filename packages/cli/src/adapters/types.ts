// The CLI-owned execution-adapter surface. An adapter is the ONLY boundary that
// knows about panes or a concrete multiplexer; it exposes exactly six
// operations — spawn, send, read, liveness, enumerate, and attach — over opaque
// handles. It deliberately owns no outcome classifier and mutates no registry
// record: transcript location, parsing, terminal classification, registry
// mutation, worker recovery, and pending-bundle semantics all live outside the
// adapter. Optional observation enrichments (pane agent-state, diagnostics) may
// ride along a result, but they are advisory signals only and never classify a
// terminal outcome.

import type { Adapter, AttachmentHandle } from "@antmay/core";

/**
 * Non-authoritative signals an adapter may attach to any observation result.
 * These can report liveness, wake an earlier transcript read, or retain a
 * diagnostic, but they never classify a run and no correctness path depends on
 * them.
 */
export type ObservationEnrichments = {
  /** Advisory harness/agent state reported by the multiplexer, if any. */
  readonly agentState?: string;
  /** Free-form diagnostic detail, if any. */
  readonly detail?: string;
};

/** A request to create a durable interactive pane running a command. */
export type SpawnSpec = {
  /** The resolved executable to launch inside the pane. */
  readonly command: string;
  /** The executable's arguments, passed literally. */
  readonly args: readonly string[];
  /** The canonical repository folder the pane starts in. */
  readonly cwd: string;
  /** Extra environment entries set for the launched pane only. */
  readonly env: Readonly<Record<string, string>>;
  /**
   * The initial input submitted to the launched harness once it is ready. It is
   * delivered as one literal turn, never interpreted as a shell fragment.
   */
  readonly initialInput: string;
  /** Optional display label stamped on the pane; no correctness depends on it. */
  readonly label?: string;
};

/** The result of a successful spawn: an opaque handle plus optional signals. */
export type SpawnedSession = {
  readonly handle: AttachmentHandle;
  readonly enrichments?: ObservationEnrichments;
};

/** Options for reading recent pane output. */
export type ReadOptions = {
  readonly source?: "visible" | "recent" | "recent-unwrapped" | "detection";
  readonly lines?: number;
};

/** The result of reading pane output. */
export type ReadResult = {
  readonly output: string;
  readonly enrichments?: ObservationEnrichments;
};

/** The result of a liveness probe. `alive` is a pane-existence signal only. */
export type LivenessResult = {
  readonly alive: boolean;
  readonly enrichments?: ObservationEnrichments;
};

/**
 * The execution-adapter surface. Every method operates on opaque handles; none
 * classifies an outcome or touches the registry.
 */
export interface ExecutionAdapter {
  /** The adapter's registry-recorded name. */
  readonly name: Adapter;
  /** Create a pane, launch the command, and submit the initial input. */
  spawn(spec: SpawnSpec): SpawnedSession;
  /** Submit a literal input turn to an existing pane. */
  send(handle: AttachmentHandle, input: string): void;
  /** Read recent pane output. Advisory only; never authoritative evidence. */
  read(handle: AttachmentHandle, options?: ReadOptions): ReadResult;
  /** Probe whether the pane still exists. */
  liveness(handle: AttachmentHandle): LivenessResult;
  /** List every handle the adapter can currently see. */
  enumerate(): readonly AttachmentHandle[];
  /** Join the pane interactively. Throws when the pane is unavailable. */
  attach(handle: AttachmentHandle): void;
}
