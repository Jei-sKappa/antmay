### Task 8: Enforce the command topology and close verification

**Objective:** Make the new command-step topology fail closed, document its durable rules, and prove the zero-behavior-change refactor through complete CLI and demo gates.

**Input / context:** Tasks 1–7 outputs; `spec.md`; `decisions.md DR1`, `decisions.md DR2`, `decisions.md DR3`, and `decisions.md DR4`; source-graph helpers and execution guards in `architecture.test.ts`; documentation/gates in `cli/AGENTS.md`.

**Steps:**

1. Add an explicit caller registry covering every production module under both command preflight trees plus `commands/run/allocate.ts` and `commands/resume/acquire-lock.ts`, with the owning orchestrator as exact caller.
2. Compare registry preflight entries to files discovered on disk so any undeclared, removed, skipped, or duplicate step fails.
3. Assert every step has exactly one declared driver; no preflight step imports another step or either orchestrator; allocation and resume acquisition remain separate single-called collaborators.
4. Assert preflight steps import no exit-code owner, concrete renderer, signal handler, or engine and declare no selected exit or executable renderer callback.
5. Guard leaf ownership: reject direct orchestrator imports of collaborators assigned to extracted steps while permitting command-owned types, refusal/startup presentation, signals, engine, result mapping, and successful-lock cleanup.
6. Preserve all execution-phase, checkpoint, transition, Git, display, outcome, and adapter guards at current force.
7. Update `cli/AGENTS.md` command architecture and module map to describe current state: neutral dependencies, explicit orchestrators, command-specific preflight trees, run allocation, resume acquisition, structured refusals, and safety ordering/ownership. Avoid routine file inventory and history wording.
8. Confirm `cli/README.md` is untouched; inspect for accidental terminal, exit, schema, catalog, pipeline, suite-contract, or scenario changes.
9. Run architecture, full check, and all demos; fix defects rather than relaxing guards or output assertions.

**Files modified:**

- `cli/src/architecture.test.ts`
- `cli/AGENTS.md`

**Verification:** `npm --prefix cli run test -- src/architecture.test.ts` exits 0; `npm --prefix cli run check` exits 0; `npm --prefix cli run demo:all` exits 0; `git diff --exit-code -- cli/README.md` exits 0; `git diff --check` exits 0.

**Acceptance criteria:**

- The registry exactly equals discovered preflight files and names every step's sole caller.
- Guards reject a second caller, step-to-step invocation, orchestrator reachback, undeclared step, and orchestrator leakage of step-owned leaves.
- Only command-owned lifecycle/presentation imports remain permitted, and existing execution guards retain force.
- `cli/AGENTS.md` accurately describes current command ownership and safety ordering.
- `cli/README.md`, public behavior, durable formats, catalog/pipeline semantics, and terminal protocol are unchanged.
- Focused architecture, full check, and every demo scenario pass.

**Consumes:** all task 1–7 preflight, allocation, acquisition, and orchestrator modules.

**Produces:** exhaustive command topology guards; durable CLI architecture documentation; complete check and demo evidence.
