# Task 1: Add explicit stage-attempt context to the harness boundary

## Objective

Give each provider-neutral harness invocation enough independently supplied stage metadata to select and validate a scripted case without parsing the rendered prompt.

## Input / context

Use `spec.md` FR-3 and FR-6, constrained by `decisions.md` DR1 and DR3. The existing `AttemptRequest` contains logical harness/model, prompt, workspace, logging, display, and abort data; `executeRun` already owns the snapshotted stage and computes the durable `attemptNumber` before it persists the matching `AttemptRecord`.

## Steps

1. Add a required `stage` object to `AttemptRequest` in `cli/src/harness/types.ts` with the exact fields `id: string`, `skill: string`, `target: StageTarget`, `resolvedTarget: string`, `threadRelPath: string`, `profilePrompt: string`, and `attemptNumber: number`; document that these are Antmay-owned validation inputs and that the attempt number is positive and durable.
2. Populate every `stage` field in `executeRun` from the current `SnapshottedStage`, checkpoint thread path, resolved profile prompt, and the same `attemptNumber` already written to the executing `AttemptRecord`.
3. Extend runner tests to assert that the invoker receives the current stage ID, skill, declarative target, resolved target, thread path, profile prompt, and exact persisted per-stage attempt number, including a later attempt of the same stage.
4. Update the Sandcastle request fixture to supply the new required object and retain an assertion that Sandcastle run-option construction and invocation ignore it, preserving the adapter's current logical harness/model/prompt behavior.
5. Run the focused runner and Sandcastle suites, then the complete CLI gate.

## Files modified

- `cli/src/harness/types.ts`
- `cli/src/harness/sandcastle.test.ts`
- `cli/src/runner/runner.ts`
- `cli/src/runner/runner.test.ts`

## Verification

Run `npm --prefix cli run test -- src/runner/runner.test.ts src/harness/sandcastle.test.ts` and confirm it exits `0`. Then run `npm --prefix cli run check` and confirm typecheck, all Vitest tests, and the production build exit `0`.

## Acceptance criteria

- `AttemptRequest.stage` exposes the seven specified Antmay-owned fields without adding a provider ID or provider-specific type.
- Every runner invocation carries values from the current immutable stage snapshot and the durable attempt number stored for that same invocation.
- Repeated attempts of one stage receive increasing positive attempt numbers derived from checkpoint history.
- Sandcastle behavior and its generated run options are unchanged by the additional metadata.
- The focused tests and `npm --prefix cli run check` pass.

**Consumes:** none

**Produces:** `AttemptRequest.stage` with `{ id, skill, target, resolvedTarget, threadRelPath, profilePrompt, attemptNumber }`, populated by `executeRun` for every harness invocation.
