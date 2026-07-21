// The single attachment operation shared by immediate `spawn --attach` and the
// later public `attach` command. It joins a run's pane strictly by delegating to
// the recorded adapter and opaque handle. It takes no registry store and reads
// no classification, so by construction it cannot mutate run state: a failed
// attach propagates the adapter's error and leaves the recorded classification,
// attach handle, and every other run field untouched. Attaching never restarts
// the skill, changes its outcome, resolves pending bundles, or creates a run.

import type { AttachmentHandle } from "@antmay/core";
import type { ExecutionAdapter } from "../adapters/types";

/**
 * Attach to a run's pane through its recorded adapter and handle. Throws the
 * adapter's error unchanged when the pane is unavailable; performs no state
 * mutation on any path.
 */
export function attachRun(
  adapter: ExecutionAdapter,
  handle: AttachmentHandle,
): void {
  adapter.attach(handle);
}
