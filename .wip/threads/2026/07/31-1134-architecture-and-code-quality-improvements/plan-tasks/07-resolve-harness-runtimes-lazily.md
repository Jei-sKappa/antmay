# Task 7: Resolve harness runtimes lazily

**Objective:** Give run and resume one immutable runtime-selection and probing seam that dynamically loads only the selected real or scripted adapter family.

**Input / context:** Required checkpoint runtime identity from Task 2, focused startup/preflight renderers from Task 5, and the separated scripted adapter/catalog from Task 6; `spec.md` section 5 and FR-5; `decisions.md DR5`, `DR6`, and `DR12` require fail-closed resume, live scripted scenario validation, paired invoker/probe loading, and one new actionable refusal.

**Steps:**
1. Create `cli/src/harness/runtime.ts` with discriminated new-run and resume requests, a single injectable `HarnessRuntimeLoader` seam, structured resolution failures, normalized version results, runtime metadata, the selected `HarnessInvoker`, and an observational scripted-prompt callback.
2. For new runs, interpret the developer toggle exactly once: unset/empty selects real, exact `1` selects scripted, and every other non-empty value fails before adapter loading or allocation.
3. For resume, enforce the checkpoint's runtime in both directions before probing or locking: scripted requires exact `1` plus a live scenario validated against the complete stage snapshot; real refuses exact `1` and instructs the developer to resume with scripted mode disabled.
4. Keep scripted scenarios external to checkpoints and reload them on every scripted resume. Dynamically import only Sandcastle plus its real probe for real mode, or the scripted invoker plus scripted probe for scripted mode, and preserve pair identity through resolution.
5. Move aggregate probe interpretation and non-empty version normalization into the resolver as structured data; render multiline failures in the focused preflight display rather than assembling prose in the resolver.
6. Replace concrete invoker/probe/scripted dependencies in the command dependency bags with one lazy runtime-loader dependency. Update production dispatch so selecting run or resume imports that command and the small runtime resolver, never both concrete adapter families.
7. Add the real-runtime/scripted-toggle refusal to `cli/src/display/preflight.ts` and its terminal tests, with the immutable mismatch, refusal to switch provider, actionable real-mode correction, exit `1`, and color-independent text.
8. Add resolver tests with lazy-loader/evaluation spies for real selection, scripted selection, invalid toggles, checkpoint mismatch in both directions, live scenario reload, exact selected-stage validation, paired probes, aggregate failures, and missing normalized versions. Extend program tests to preserve help/version/grammar/list import boundaries.
9. Run the focused runtime, program, command, and display tests, then run the complete CLI gate.

**Files modified:**
- `cli/src/harness/runtime.ts` (NEW)
- `cli/src/harness/runtime.test.ts` (NEW)
- `cli/src/program.ts`
- `cli/src/program.test.ts`
- `cli/src/commands/run.ts`
- `cli/src/commands/run.test.ts`
- `cli/src/commands/resume.ts`
- `cli/src/commands/resume.test.ts`
- `cli/src/display/preflight.ts`
- `cli/src/display/terminal.test.ts`
- `cli/src/display/__snapshots__/terminal.test.ts.snap`

**Verification:**
- `npm --prefix cli run test -- src/harness/runtime.test.ts src/program.test.ts src/commands/run.test.ts src/commands/resume.test.ts src/display/terminal.test.ts`
- `! rg -n "harness/(sandcastle|probe)|harness/scripted/(invoker|probe)" cli/src/program.ts cli/src/commands/run.ts cli/src/commands/resume.ts`
- `npm --prefix cli run check`

**Acceptance criteria:**
- FR-5 / AC-5.1: new-run toggle cases select and persist the exact runtime or fail before allocation/loading.
- FR-5 / AC-5.2: scripted and real resume mismatches fail before probe, lock, invocation, or checkpoint mutation.
- FR-5 / AC-5.3: scripted resume reloads and revalidates the live scenario against the complete snapshotted stage set without persisting it.
- FR-5 / AC-5.4: lazy-loader spies prove exactly one paired adapter/probe family is evaluated for each runtime.
- FR-5 / AC-5.5: help, version, grammar errors, and list preserve their lightweight import and side-effect boundaries.
- FR-5 / AC-5.6: missing versions and aggregate probe failures are structured by the resolver and rendered by display.
- FR-5 / AC-5.7: the separated scripted adapter and case catalog retain all behavior under the command path.

**Consumes:** `HarnessRuntimeIdentity`, the focused preflight/startup renderers, and the small scripted adapter plus case catalog.

**Produces:** `resolveHarnessRuntime(request, loader): Promise<HarnessRuntimeResolution>` and the production lazy adapter loaders.
