1. High — validated checkpoints can finalize a non-DONE attempt

[`WaitingReason`](/Users/jacopo/Developer/projects/personal/tools/antmay.refactor-architecture-and-code-quality-improvements/cli/src/state/checkpoint.ts:79) is one optional-field bag, and array position zero controls recovery via [`governingReason`](/Users/jacopo/Developer/projects/personal/tools/antmay.refactor-architecture-and-code-quality-improvements/cli/src/state/checkpoint.ts:125). Validation never requires a `stage-contract-violation`, `git-policy-violation`, or `commit-error` pause to reference a current-stage attempt whose terminal token is `DONE`.

The existing [checkpoint test](/Users/jacopo/Developer/projects/personal/tools/antmay.refactor-architecture-and-code-quality-improvements/cli/src/state/checkpoint.test.ts:647) demonstrates this accidentally: it accepts a contract-violation pause while the fixture’s attempt remains `BLOCKED`.

Resume then:

- Takes the final attempt as an optional “preserved DONE.”
- Changes its result to `done` without checking its token.
- Advances even when no attempt exists.

See [`finalizeSavedDone`](/Users/jacopo/Developer/projects/personal/tools/antmay.refactor-architecture-and-code-quality-improvements/cli/src/commands/resume.ts:505) and the rewrite/advance at [line 585](/Users/jacopo/Developer/projects/personal/tools/antmay.refactor-architecture-and-code-quality-improvements/cli/src/commands/resume.ts:585). This can persist `result: "done"` with a `BLOCKED` token—state the validator rejects on its next read—or skip the stage entirely.

Replace reason-order-driven recovery with an explicit discriminated recovery state referencing a required DONE attempt. Remove the `preserved !== undefined` and missing-HEAD fallbacks; those states should be unrepresentable and rejected.

2. High — there are two workflow engines

[`executeRun`](/Users/jacopo/Developer/projects/personal/tools/antmay.refactor-architecture-and-code-quality-improvements/cli/src/runner/runner.ts:204) is a 710-line function with 55 branch constructs. [`resumeCommand`](/Users/jacopo/Developer/projects/personal/tools/antmay.refactor-architecture-and-code-quality-improvements/cli/src/commands/resume.ts:111) is 772 lines with 80.

Resume independently implements:

- Checkpoint stamping/persistence
- Pause rendering
- Stage advancement/completion
- Queue gating
- Boundary evaluation/finalization
- Attempt mutation
- Dispatch back into `executeRun`

This is workflow policy leaking into a command adapter. The duplicated `persist`, `renderPause`, `replaceLast`, advancement, and boundary paths can drift—and finding 1 is evidence that they already rely on underspecified shared invariants.

Create one execution engine that owns every durable transition, including resume recovery. `run` and `resume` should perform command-specific preflight/lock acquisition, then enter that engine with a typed start or recovery state.

3. Medium — the developer harness is eagerly loaded in production

Both handlers import the real Sandcastle adapter and scripted adapter together before knowing which mode is selected: [`program.ts`](/Users/jacopo/Developer/projects/personal/tools/antmay.refactor-architecture-and-code-quality-improvements/cli/src/program.ts:51). Additionally, [`run.ts`](/Users/jacopo/Developer/projects/personal/tools/antmay.refactor-architecture-and-code-quality-improvements/cli/src/commands/run.ts:28) uses a runtime import solely for a `typeof` dependency type.

Consequently every ordinary run/resume loads the 1,189-line scripted implementation and its large stage-specific [`CASE_HANDLERS`](/Users/jacopo/Developer/projects/personal/tools/antmay.refactor-architecture-and-code-quality-improvements/cli/src/harness/scripted/invoker.ts:779). The build confirms that adapter contributes a separate 26.6 KB chunk loaded alongside the selected command.

Select the runtime first, then dynamically import exactly one adapter. Pass lazy loaders rather than both implementations through `RunDeps`, and make type-only imports actual `import type` declarations. The scripted case catalog should also be separated from its small provider adapter.

4. Medium — `terminal.ts` is a UI god module

[`terminal.ts`](/Users/jacopo/Developer/projects/personal/tools/antmay.refactor-architecture-and-code-quality-improvements/cli/src/display/terminal.ts:320) is 1,198 lines and owns unrelated screens: run listing, workspace refusal, composition refusal, developer diagnostics, startup summary, live attempt output, and every closing state. Its test is another 1,030 lines.

These views share painting primitives, not lifecycle ownership. Split them into focused renderers—shared primitives, list, preflight refusals, startup, and run lifecycle—with a small barrel retaining the current public imports.

Scope note: this branch is clean and identical to `main`, so there is no PR delta or file-crossing-1k regression to evaluate. This was a whole-`cli` audit.

Verification: `npm run check` passes—39 test files, 840 tests, typecheck, and build. No source files were changed.
