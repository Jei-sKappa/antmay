import type { HarnessId } from "../config/settings.js";
import type { WorkspaceExecution } from "../workspace/types.js";

/**
 * A normalized event from the harness's output stream, surfaced to the terminal
 * display. Provider-neutral: raw stream detail stays in the attempt log and
 * never reaches this seam.
 */
export type HarnessEvent =
  | { type: "text"; text: string }
  | { type: "tool-call"; name: string; args: string };

/**
 * One harness invocation for a single stage attempt. Everything the adapter
 * needs to drive the harness once, expressed entirely in Antmay-owned types.
 *
 * `logFilePath` is the exclusively created, header-initialized attempt log; the
 * adapter appends the harness's verbose stream to it. `onEvent` receives each
 * normalized stream event for live display. `signal` aborts the in-flight
 * attempt.
 */
export type AttemptRequest = {
  harness: HarnessId;
  model: string;
  prompt: string;
  idleTimeoutSeconds: number;
  dangerouslySkipPermissions: boolean;
  workspace: WorkspaceExecution;
  logFilePath: string;
  onEvent: (event: HarnessEvent) => void;
  signal: AbortSignal;
};

/**
 * The provider-neutral result of a single harness invocation.
 *
 * A `failed` outcome carries a normalized `category` alongside the original
 * error's class name and message, so callers classify without touching any
 * harness-specific error type.
 */
export type AttemptOutcome =
  | { kind: "completed"; finalText: string }
  | {
      kind: "failed";
      category: "idle-timeout" | "aborted" | "provider-error";
      errorClass: string;
      errorMessage: string;
    };

/**
 * The Antmay-owned boundary the runner drives and every runner test fakes. The
 * only coupling to a concrete harness lives behind an implementation of this
 * interface.
 */
export interface HarnessInvoker {
  invoke(request: AttemptRequest): Promise<AttemptOutcome>;
}
