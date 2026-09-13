# Decompose the CLI command procedures

Refactor `runCommand` and `resumeCommand` into explicit command-owned sequences over typed, effect-bounded collaborators while preserving every observable and durable behavior. The tasks establish the dependency boundary, extract each command's read-only preparation, isolate allocation and resume lock ownership, and finally make the topology fail closed in architecture tests.

Source: spec.md

## Global Constraints

- This is a zero-behavior-change refactor. Existing command tests are the behavioral oracle and must keep their behavioral expectations (per `decisions.md` DR4).
- Preserve all current signal observation points and their before/after-allocation or before/after-lock consequences. Do not add, remove, or reorder signal checkpoints as part of the decomposition.
- Preserve the temporary-workspace-before-clean-worktree ordering in `run`; a dirty temporary workspace must continue to receive the dedicated safety refusal rather than advice to commit or revert it.
- Preserve the under-lock pending-queue rescan on every run allocation candidate, including after an identifier collision.
- Preserve the resume rule that temporary-workspace safety is checked before lock acquisition and every checkpoint mutation.
- Preserve the exact `allocated` versus `resume` entry passed to the engine, one engine call per successful command entry, existing version-map semantics, and all engine-result mappings.
- Preserve lock-release behavior on refusals, collisions, signals, engine results, and thrown engine failures.
- Keep catalog entries plain data and keep the terminal-outcome protocol unchanged.
- Keep architecture guards at least as strict. A failing guard indicates a boundary violation to fix, not a test to relax.
- Update `cli/AGENTS.md` so its durable module map and command-architecture description match the delivered structure. Do not add implementation inventories or maintenance commentary that belongs only in code or tests.
- Do not update `cli/README.md`'s stage-support table: neither supported stages nor their artifact requirements change.

## Tasks

1. **Establish shared command dependencies and early run preparation** — move the shared dependency contract out of `run.ts` and extract root, document, thread, and artifact preparation as typed run-specific steps. → `plan-tasks/01-establish-command-dependencies-and-early-run-preflight.md`
2. **Extract run selection and runtime preparation** — make composition, immutable stage snapshotting, and harness-runtime resolution visible as ordered calls in `run.ts`. → `plan-tasks/02-extract-run-selection-and-runtime.md`
3. **Extract run safety preflight** — make temporary-workspace safety, clean-worktree validation, queues, and unfinished-run detection separate ordered gates. → `plan-tasks/03-extract-run-safety-preflight.md`
4. **Isolate the new-run allocation transaction** — move candidate generation through initial checkpoint persistence into `commands/run/allocate.ts` with explicit ownership transfer and failure cleanup. → `plan-tasks/04-isolate-run-allocation-transaction.md`
5. **Extract resume lookup and durable identity validation** — make state-root resolution, exact run lookup, checkpoint validation, completion refusal, and thread revalidation explicit read-only steps. → `plan-tasks/05-extract-resume-lookup-and-identity.md`
6. **Extract resume runtime and workspace safety** — complete read-only preparation with ordered runtime, canonical-workspace, and temporary-workspace steps. → `plan-tasks/06-extract-resume-runtime-and-workspace-safety.md`
7. **Isolate resume lock acquisition and handoff** — give acquisition of the recorded workspace lock its own collaborator while leaving signal, engine, and cleanup ownership in `resume.ts`. → `plan-tasks/07-isolate-resume-lock-acquisition.md`
8. **Enforce the command topology and close verification** — add exhaustive import-graph guards, update the durable CLI architecture description, and run the complete check and demo gates. → `plan-tasks/08-enforce-command-topology-and-verify.md`
