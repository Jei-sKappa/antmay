# Task 3: Implement the deterministic scripted adapter

## Objective

Implement a provider-neutral scripted invoker and executable probe whose fixed cases exercise real runner boundaries without starting a provider process or interpreting executable scenario content.

## Input / context

Start from the outputs of Tasks 1 and 2. Use `spec.md` FR-3, FR-4, and FR-6, constrained by `decisions.md` DR1–DR4 and DR9. The implementation may choose the fixed placeholder plan/task bodies and reconciliation lines under the spec's Degrees of freedom, but the exact `spec-correct` bytes are fixed.

## Steps

1. Create `cli/src/harness/scripted/probe.ts` exporting a probe with the existing `probeHarnessExecutables` result contract: de-duplicate logical `HarnessId` inputs, return a fixed non-empty scripted version observation for each, and never call `execFile` or any provider API.
2. Create `cli/src/harness/scripted/invoker.ts` exporting `createScriptedInvoker(scenario)`, with case selection strictly from `scenario.stages[request.stage.id][request.stage.attemptNumber - 1]`; return a normalized `provider-error` for missing, incompatible, or exhausted entries.
3. Before any case effect, validate the positive attempt number, catalog compatibility, declarative target resolved against `threadRelPath`, and a prompt freshly rendered from logical harness, stage skill, resolved target, and profile prompt; use prompt equality only as an assertion, never as dispatch.
4. Add reusable path guards that resolve the workspace and selected thread, reject thread/artifact paths that escape lexically or through symlinks, require safe regular prerequisites for reconciliation, and validate every destination before a write.
5. Implement the three generic cases as no-change completions whose `finalText` ends in the corresponding `Outcome: DONE`, `BLOCKED`, or `REFUSED` line.
6. Implement `spec-correct` as an ordinary-file replacement with exactly `# Spec: Fake\n\nPlaceholder\n`; implement `reconcile-spec-correct` as one fixed newline-terminated append after validating a safe regular `spec.md`.
7. Implement `plan-strict-correct` with fixed non-empty `plan.md` and at least one fixed non-empty Markdown file under `plan-tasks/`, replacing only its owned fixed files and leaving unrelated files intact; implement `reconcile-plan-correct` by requiring a safe regular plan and at least one safe regular task, then appending one fixed line to the plan and every task in normalized lexical path order.
8. For every successful case, check an already-aborted request before effects, emit at least one deterministic existing `HarnessEvent` text event naming the case, append deterministic stage/attempt/case/effect/outcome details to the pre-existing log, and keep terminal `Outcome:` text only in `finalText`.
9. Catch validation, prerequisite, filesystem, event-callback, and log-append failures at the adapter boundary and return `kind: "failed"`, category `provider-error`, with an identifiable scripted error class and message; do not throw through the runner seam.
10. Add unit tests for the exact registry, attempt-index selection and exhaustion, all seven outcomes/effects, replacement and repeated append behavior, unrelated-file preservation, lexical task ordering, target/prompt/profile/stage mismatches, unsafe/symlink paths, pre-abort, deterministic events/logs, failure normalization, outcome parsing, and process-free de-duplicated probing.
11. Run the focused scripted adapter suites, then the complete CLI gate.

## Files modified

- `cli/src/harness/scripted/invoker.ts` (NEW)
- `cli/src/harness/scripted/invoker.test.ts` (NEW)
- `cli/src/harness/scripted/probe.ts` (NEW)
- `cli/src/harness/scripted/probe.test.ts` (NEW)

## Verification

Run `npm --prefix cli run test -- src/harness/scripted/invoker.test.ts src/harness/scripted/probe.test.ts` and confirm it exits `0`. Then run `npm --prefix cli run check` and confirm typecheck, all Vitest tests, and the production build exit `0`.

## Acceptance criteria

- The scripted probe returns one deterministic non-empty observation per distinct logical harness and starts no process.
- Dispatch uses only explicit stage ID plus durable attempt number and fails rather than repeating or wrapping an exhausted array.
- Every request independently validates stage compatibility, target resolution, logical-harness prompt, and optional profile suffix.
- The registry implements exactly the seven cases and the deterministic effects required by AC-4.2 through AC-4.6.
- All effect paths remain inside the current workspace and selected thread, with unsafe prerequisites and escaping symlinks rejected before writes.
- Successful cases emit normalized identifying text, append deterministic verbose details without truncating the log header, and expose terminal text only through `finalText`.
- Adapter failures are returned as identifiable provider-neutral `provider-error` outcomes and execute no scenario-supplied operation.
- The focused tests and `npm --prefix cli run check` pass.

**Consumes:** `AttemptRequest.stage` from Task 1 and validated `ScriptedScenario` plus case compatibility metadata from Task 2.

**Produces:** `createScriptedInvoker(scenario): HarnessInvoker` and a process-free scripted probe compatible with the existing probe dependency.
