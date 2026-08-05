/**
 * The step vocabulary a scenario file composes its run out of. A scenario is an
 * ordered list of these; the driver executes them in order and knows nothing
 * about what any individual scenario is demonstrating.
 *
 * Two kinds exist. An *invocation* runs the built CLI and is checked against the
 * exit code it must produce and the output it must show. An *action* runs
 * scenario-owned code against the fixture between invocations, so the setup a
 * single scenario needs — sabotaging the repository, resolving a queued bundle,
 * revoking a permission — lives in that scenario's own file rather than in the
 * shared driver.
 *
 * Every invocation declares both halves: `expectExit` and a non-empty `markers`
 * list, which `demo/markers.mjs` defines and checks. Neither is optional, and a
 * step missing or malforming either one throws where it is constructed.
 */

import { assertMarkers, stripAnsi } from "./markers.mjs";

/**
 * Run `antmay afk run <pipeline> --thread <thread>` and require `expectExit`
 * together with every marker in `markers`.
 *
 * The pipeline reference is the declared name of the document the driver wrote
 * into the isolated config root, so the run resolves it exactly as a user's
 * would. A scenario adds `--from` or `--profile` through `flags`.
 *
 * `flags` are appended to the command line. `during` is an optional hook fired
 * once the child has been running for `afterMs`, receiving the fixture context
 * and the live child process — the seam a scenario uses to signal the run or to
 * change the world underneath it while an attempt is in flight.
 */
export function run({ expectExit, markers, flags = [], during, afterMs = 400 } = {}) {
  assertExit(expectExit, "run");
  assertMarkers(markers, "run");
  return {
    kind: "invoke",
    argv: (ctx) => ["afk", "run", ctx.pipeline, "--thread", ctx.threadName, ...flags],
    expectExit,
    markers,
    during,
    afterMs,
  };
}

/**
 * Run `antmay afk resume <run-id>` against the run this scenario created, and
 * require `expectExit` together with every marker in `markers`.
 */
export function resume({ expectExit, markers, during, afterMs = 400 } = {}) {
  assertExit(expectExit, "resume");
  assertMarkers(markers, "resume");
  return {
    kind: "invoke",
    argv: (ctx) => ["afk", "resume", ctx.runId()],
    expectExit,
    markers,
    during,
    afterMs,
  };
}

/**
 * Run `antmay afk list` and require `expectExit` together with every marker in
 * `markers`. Renders the run listing rather than the run stream, so a scenario
 * can show how its own final condition reads in the listing.
 */
export function list({ expectExit = 0, markers } = {}) {
  assertExit(expectExit, "list");
  assertMarkers(markers, "list");
  return { kind: "invoke", argv: () => ["afk", "list"], expectExit, markers };
}

/**
 * Send `signal` the first time the child's own output contains `text`, for use
 * from inside a `during` hook.
 *
 * A window that opens between two of the executor's own steps can be far too
 * narrow to hit with a timer measured from process spawn — the run at rest
 * between two stages is microseconds wide. A scenario that needs such a window
 * waits for the last thing the executor prints before it instead, which is
 * deterministic. The hook that installs this listener should fire early enough
 * that it is attached before that output arrives.
 */
export function signalOnOutput(child, { text, signal }) {
  let seen = "";
  let fired = false;
  const watch = (chunk) => {
    if (fired) return;
    seen += stripAnsi(chunk);
    if (!seen.includes(text)) return;
    fired = true;
    child.kill(signal);
  };
  child.stdout?.on("data", watch);
  child.stderr?.on("data", watch);
}

/**
 * Run scenario-owned code against the fixture. `describe` is printed so the
 * transcript says what changed between two invocations, and `perform` receives
 * the fixture context.
 */
export function action(describe, perform) {
  if (typeof describe !== "string" || describe.length === 0) {
    throw new TypeError("action() requires a non-empty description.");
  }
  if (typeof perform !== "function") {
    throw new TypeError(`action(${describe}) requires a function to perform.`);
  }
  return { kind: "action", describe, perform };
}

function assertExit(expectExit, stepName) {
  if (!Number.isInteger(expectExit)) {
    throw new TypeError(`${stepName}() requires an integer expectExit.`);
  }
}
