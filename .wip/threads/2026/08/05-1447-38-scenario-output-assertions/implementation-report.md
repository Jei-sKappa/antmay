# Implementation report

Source: `plan.md`

## Outcome

Complete. Every demo scenario invocation now declares the output that identifies
the rendering it exists to show, and the driver checks it alongside the exit code,
so a scenario reaching the wrong terminal state fails instead of passing on a
shared exit code. A whole-catalog runner reports the suite in one command. The
catalog grew from 32 to 42 scenarios: seven of the nine `src/execution/pause.ts`
builders no scenario reached now have one, as do both `detail` variants of
`refreshPromiseUnmet` and the two renderings tracked as issue #37.

Two of the nine builders — `prerequisiteUninspectable` and
`refreshPromiseUninspectable` — turned out to be unreachable end-to-end rather
than merely unreached, so they have no scenario and cannot have one. With that
correction, `cli/AGENTS.md`'s contract that every distinct terminal rendering has
a demo scenario holds for the pause family.

## Changes

**Color resolution.** `DisplayOptions` carries one resolved `color: boolean` in
place of `isTTY` and `noColor` recombined inside `createPainter`.
`resolveDisplayColor(env, isTTY)` in `src/program.ts` resolves it: any non-empty
`NO_COLOR` outranks everything, then `FORCE_COLOR` — any value but empty or `0` —
turns color on for a non-terminal stdout, and otherwise a terminal stdout decides.
The `run`, `resume`, and `list` dependency bags carry `color` and no longer read
`NO_COLOR` themselves. This is the only production behavior change in the thread.

**The marker vocabulary.** `scripts/demo/markers.mjs` defines what a required-output
marker is — a plain string, a `(ctx) => string`, or `{ text, atLeast: n }` —
validates a step's list where the step is constructed, and answers what an
invocation failed to show. Matching is substring containment with ANSI escapes
stripped; there is no regular-expression form and no negative form. `run()`,
`resume()`, and `list()` each reject an absent, empty, or malformed list.

**The driver.** `scripts/demo.mjs` pipes the child's stdout and stderr instead of
inheriting them, writing every chunk straight through as it arrives so the stream
stays live while a copy accumulates, and exports `FORCE_COLOR` into every child so
the rendering a developer reviews and the rendering the markers are matched
against are the same bytes. A step's verdict reports exit-code and marker failures
together, naming what was missing. `loadScenarios` refuses a catalog in which two
scenarios declare the same plain-string marker set. `scripts/demo/catalog.mjs`
states the catalog's reading order once, for the driver and the tracer.

**The whole-catalog runner.** `scripts/demo-all.mjs`, exposed as `npm run
demo:all`, builds the CLI once and runs every scenario serially through the
existing `--cli-binary` seam: one progress line each, the whole catalog before any
report, a failing scenario's captured transcript in full, a non-zero exit when any
failed, and its own wall clock. It passes no `--no-color`, so a batch run asserts
byte-identical output to a manual one. It does not join `npm run check`.

**Scenarios.** All 32 existing scenarios gained marker sets derived from their
confirmed output. Ten scenarios were added and the catalog renumbered so each sits
next to what it builds on: the two pre-attempt queue-gate pauses, the unverifiable
promise, a resume that restates a still-held queue, the three ways a pause holding
a saved `DONE` stays paused, a retried boundary refused again, the at-rest
interruption, and the display's `warning:` line. `demo/fixture.mjs` gained
`rejectCommitSubject` and `removeStaleLocks`; `demo/steps.mjs` gained
`signalOnOutput`, which fires a signal on the executor's own output because the
window an at-rest signal needs is too narrow for a timer measured from process
spawn; the driver's signal-number map gained SIGKILL.

**Documentation.** `cli/AGENTS.md`'s driver paragraph and the closing guidance of
"Scenarios are the executable UI contract" describe the posture the catalog now
has — a scenario asserts the rendering it reaches, how to pick a marker set that
pins one, and that unit tests keep exact terminal text and edge cases — and the
toolchain list names `npm run demo:all`. `cli/README.md` gained a `## Color`
section and the same two facts about the demo. A note at `prerequisite.ts`'s
inspection-failure branch records why no path reaches it, matching the note
`evidence.ts` already carried.

## Verification

- `npm run check` (typecheck, vitest, build) passes after every commit: 48 test
  files, 1153 tests, build success.
- `npm run demo:all` reports 42/42 scenarios passing. Catalog wall clock 102.8s
  serial, over a 0.8s build. That is the measurement the deferred question about
  the check gate is to be settled from; the gate itself runs in about 90s.
- `npm run trace` over all 42 scenarios: no `src/execution/pause.ts` builder
  remains in the uncalled-function list except `prerequisiteUninspectable` and
  `refreshPromiseUninspectable`, and `interruptedAtRest` is gone from it.
- The net was proved to bite, both ways the plan asks for. A deliberately wrong
  marker made its scenario fail by name
  (`missing required output: "Fake refusal; no files whatsoever"`), and two
  scenarios given identical marker sets made the driver refuse before running
  anything, including under `--list`.
- Color resolution was checked against the built binary with stdout piped to a
  file: `FORCE_COLOR=1` emits ANSI, the default emits none, and `NO_COLOR`
  alongside `FORCE_COLOR` emits none. It is also unit-covered in
  `program.test.ts`.
- `37-interrupted-at-rest` was run three times consecutively for timing
  stability.

## Deviations and judgment calls

- **`FORCE_COLOR=0` falls through to the TTY rather than forcing color off.** DR2
  and plan step 1 describe `FORCE_COLOR` as an on switch and `NO_COLOR` as the off
  switch, so a `0` value is treated as no switch at all.
- **`resolveDisplayColor` lives in `program.ts` rather than `display/format.ts`.**
  `program.test.ts` pins the pre-dispatch static import graph to exactly three
  modules, and `display/` carries no environment knowledge; dispatch is the only
  module that reads the real process. A fourth static import would have loosened a
  guard the plan requires to end stricter.
- **Markers are validated by exact key set**, so a misspelled `atleast` is a
  load-time error rather than a marker that silently degrades to plain
  containment.
- **The catalog's reading order moved into `scripts/demo/catalog.mjs`.** The new
  runner would otherwise have been its third implementation, after `demo.mjs` and
  `trace.mjs`.
- **Two `color discipline` cases in `src/display/terminal.test.ts` became
  byte-identical under the single flag and are now one case**, and the now-inert
  `NO_COLOR: "1"` entries were dropped from command-test environment bags. This is
  forced by the type change, not the reduction of that file the plan puts out of
  scope; the file is otherwise unreduced.
- **`33-boundary-retry-refused` was added rather than consolidated away.** Its
  screen differs from `32-failed-commit`'s only in the reason's trailing full stop
  and the absent stage footer, so DR6's three-coincidence bar is met and
  consolidating is permitted. Merging the builders would fold away the
  pass-through of a recovery a resume must not re-derive, so the default
  resolution was taken instead.

## Remaining concerns

- **Two pause builders are unreachable, so the plan's expected count is one short
  in each direction.** Artifact inspection can only fail when the thread directory
  is untraversable, which also makes the queue scan fail, and the queue is checked
  first on both the stage-loop and resume paths. `prerequisiteUninspectable` and
  `refreshPromiseUninspectable` are therefore fail-closed guards that no
  end-to-end run reaches; neither was deleted, and both call sites now say so.
  Eight scenarios were delivered where the plan expected nine plus a variant.
- **A refused Git boundary's reason is worded by two builders differing only in a
  trailing full stop** (`attemptStopped` and `refreshBoundaryRefused`). Worth
  settling on one wording.
- **Node warns on stderr when `FORCE_COLOR` and `NO_COLOR` are both set**, which
  the driver's `--no-color` now produces, because DR2 has it export `FORCE_COLOR`
  unconditionally. It is cosmetic, appears only in `--no-color` transcripts —
  including every `npm run trace` transcript — and markers are positive-only, so
  nothing asserts against it.
- **The `warning:` line's second caller is not separately exercised.** A live
  agent session that could not be persisted renders the same line with a different
  message.
- The `warning:` lines in `commands/list.ts` and `commands/run.ts` are written
  straight to stderr rather than through the display seam, and have no scenario.
  They are outside issue #37's scope.

## Follow-ups

- Decide whether the scenario suite joins `npm run check`. Deliberately out of
  scope; the measurement it waits on is now available at 102.8s serial against a
  gate of about 90s, and the fixtures are already isolated per scenario, so
  concurrency remains available.
- Reduce `src/display/terminal.test.ts` now that the scenarios carry the UI
  contract rather than merely demonstrating it.
- Give the two command-level `warning:` lines a scenario, or route them through
  the display seam.
