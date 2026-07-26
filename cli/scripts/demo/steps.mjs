/**
 * The step vocabulary a scenario file composes its run out of. A scenario is an
 * ordered list of these; the driver executes them in order and knows nothing
 * about what any individual scenario is demonstrating.
 *
 * Two kinds exist. An *invocation* runs the built CLI and is checked against the
 * exit code it must produce. An *action* runs scenario-owned code against the
 * fixture between invocations, so the setup a single scenario needs — sabotaging
 * the repository, resolving a queued bundle, revoking a permission — lives in
 * that scenario's own file rather than in the shared driver.
 */

/**
 * Run `antmay afk run <pipeline> --thread <thread>` and require `expectExit`.
 *
 * `flags` are appended to the command line. `during` is an optional hook fired
 * once the child has been running for `afterMs`, receiving the fixture context
 * and the live child process — the seam a scenario uses to signal the run or to
 * change the world underneath it while an attempt is in flight.
 */
export function run({ expectExit, flags = [], during, afterMs = 400 } = {}) {
  assertExit(expectExit, "run");
  return {
    kind: "invoke",
    argv: (ctx) => ["afk", "run", ctx.pipeline, "--thread", ctx.threadName, ...flags],
    expectExit,
    during,
    afterMs,
  };
}

/**
 * Run `antmay afk resume <run-id>` against the run this scenario created, and
 * require `expectExit`.
 */
export function resume({ expectExit, during, afterMs = 400 } = {}) {
  assertExit(expectExit, "resume");
  return {
    kind: "invoke",
    argv: (ctx) => ["afk", "resume", ctx.runId()],
    expectExit,
    during,
    afterMs,
  };
}

/**
 * Run `antmay afk list` and require `expectExit`. Renders the run listing rather
 * than the run stream, so a scenario can show how its own final condition reads
 * in the listing.
 */
export function list({ expectExit = 0 } = {}) {
  assertExit(expectExit, "list");
  return { kind: "invoke", argv: () => ["afk", "list"], expectExit };
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
