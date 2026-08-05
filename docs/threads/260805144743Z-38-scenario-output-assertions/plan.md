# Plan: Required-output assertions for the demo scenario catalog

Source: `seed.md`, `decisions.md` (DR1–DR8)

## Outcome

Every demo scenario invocation declares the output that identifies the rendering it exists to show, and the driver checks it alongside the exit code, so a scenario that reaches the wrong terminal state fails instead of passing on a shared exit code. A whole-catalog runner reports the suite in one command. Every rendering `cli/src/execution/pause.ts` can produce, and the two renderings tracked as issue #37, are reached by a scenario, so `cli/AGENTS.md`'s contract that every distinct terminal rendering has a demo scenario becomes true.

## Steps

1. **Color resolution.** Teach the CLI to emit color when stdout is not a terminal: `FORCE_COLOR` non-empty and not `0` turns color on, `NO_COLOR` still wins when both are set. This replaces the raw `process.stdout.isTTY` that `src/program.ts` currently hands to each command as the color input, and lands as one resolved value rather than two flags recombined in `src/display/format.ts`. Cover it in the unit suite and document the variable in `cli/README.md`.

2. **Marker vocabulary.** In `scripts/demo/steps.mjs`, give `run()`, `resume()` and `list()` a required marker list, rejecting an absent or empty one the way `assertExit` already rejects a bad `expectExit`. A marker is a plain string, a `(ctx) => string`, or `{ text, atLeast: n }`.

3. **Driver capture and assertion.** In `scripts/demo.mjs`, replace `stdio: "inherit"` with piped stdout and stderr, writing each chunk to the driver's own stdout as it arrives so the stream stays live, and accumulating a copy. Export `FORCE_COLOR` into the child environment. After the child closes, strip ANSI from the accumulated text and require every marker by substring containment, honoring `atLeast`; a step fails on an exit-code mismatch or any missing marker, and the driver names what was missing. Match only the child's captured output — never the driver's own printed labels, one of which is already the literal resume command. Add the catalog check in `loadScenarios`: collect each scenario's plain-string markers as one set and fail when two scenarios' sets are identical.

4. **Backfill the 32.** Give every existing scenario a marker set whose conjunction pins its rendering — the banner plus the line that separates it from its neighbours, since `BLOCKED` alone appears in 24 transcripts. Derive each set from the scenario's actual output; the per-scenario transcripts under `cli/temp/mytraces/` are a usable starting point, but confirm the wording rather than trusting it.

5. **Whole-catalog runner.** Add a sibling script under `scripts/` (with its npm script) that builds the CLI once, runs every scenario serially through the existing `--cli-binary` seam, prints one progress line each, prints a failing scenario's captured transcript in full, runs the whole catalog before reporting, exits non-zero if any failed, and prints its own wall clock.

6. **Reconcile `cli/AGENTS.md`.** The paragraph placing `npm run demo` outside the assertion surface, and the surrounding "Scenarios are the executable UI contract" guidance, must describe the posture the catalog now has: scenarios assert the renderings they reach, unit tests keep exact behavior and edge cases. Say nothing about the suite joining `npm run check`.

7. **Reach the unreached pause renderings.** Add a scenario for each of the nine builders in `src/execution/pause.ts` that no scenario reaches, plus the second `detail` variant inside `refreshPromiseUnmet`. Five are refresh renderings reachable only through a resume, so each needs a pause, a change to the world, then a resume. Apply DR6's three-coincidence bar before consolidating any rendering instead of reaching it.

8. **Close #37.** Add scenarios for the at-rest interrupted run summary and the `warning:` line.

## Verification

`npm --prefix cli run check` passes. The new whole-catalog runner reports every scenario passing and prints its wall clock — that number is what the deferred question about the check gate will be settled from. A re-run of `npm run trace` lists no builder from `src/execution/pause.ts` among the uncalled functions, and reaches #37's two renderings. Finally, prove the net bites: a deliberately wrong marker makes its scenario fail, and two scenarios given identical marker sets make the driver refuse to run at all.

## Notes

Steps 1–6 are the first delivery and 7–8 follow it, per DR5; the mechanism cannot wait on the nine per-rendering judgments.

Nine is a floor rather than a count. An uncalled-function list cannot see an unexercised branch inside a function that is called, which is how `refreshPromiseUnmet`'s worktree-cleanliness variant hides.

Step 1 is the only production behavior change. Keep the terminal-outcome tokens and the `Outcome: ` prefix exactly as they are, keep catalog entries in `src/pipeline/catalog.ts` plain JSON, and if a guard in `src/architecture.test.ts` fails, argue the boundary rather than relaxing it — these guards end stricter, never looser. The pre-release licence applies: no migrations, no compatibility shims.

Out of scope: whether the suite joins `npm run check`, and any reduction of `src/display/terminal.test.ts`.
