# Plan: Give harness identity, the outcome vocabulary and the checkpoint module a single owner

Centralize the CLI's terminal-outcome and harness-id vocabularies, then split the checkpoint schema, validator, and reader into purpose-specific modules without changing protocol bytes, checkpoint behavior, or terminal renderings. The settled design lives in `decisions.md`; `seed.md` supplies the genesis context and project-wide constraints.

Source: seed.md

## Global Constraints

- Throughout: `npm run check` must pass on every change — typecheck, vitest and build, with no half-migrated code and no scenario left red.
- When an architecture guard fails, the boundary moved: argue the direction rather than relaxing the guard, so the guards end up stricter, never looser.
- The terminal-outcome protocol keeps its exact `DONE`/`BLOCKED`/`REFUSED` values and the `Outcome: ` prefix, because root `AGENTS.md` names it as load-bearing coupling between the skill suite and the CLI — changing who declares the vocabulary must never change what it is.
- Catalog entries in `src/pipeline/catalog.ts` stay plain JSON with no methods, because a checkpoint snapshots `SnapshottedStage` verbatim and resume reads only the checkpoint.
- The pre-release licence applies: rename and remove freely, write no migrations or compatibility shims, and say plainly in the commit message when a change makes existing run directories unreadable.
- A named `HarnessBackend` interface with `createInvoker` and `probe`, demoting Sandcastle from the real family to one backend among several, is explicitly out of scope and belongs to issue #21.

## Tasks

1. **Centralize and guard terminal outcomes** — make `runner/outcome.ts` the import-free owner of the complete terminal-outcome vocabulary and derive every production rendering and runtime consumer from it. — `plan-tasks/01-centralize-terminal-outcomes.md`
2. **Move harness identity into the harness domain** — create the dedicated harness-id owner, share its narrowing predicate, and retarget every consumer away from configuration. — `plan-tasks/02-move-harness-identity.md`
3. **Pin aggregate checkpoint validation** — add a regression test proving one validation call reports several independent document faults together. — `plan-tasks/03-pin-aggregate-checkpoint-validation.md`
4. **Extract checkpoint declarations** — move the complete checkpoint type family into a declarations-only module and narrow all type consumers to it. — `plan-tasks/04-extract-checkpoint-declarations.md`
5. **Extract checkpoint validation** — move untrusted-input validation into its own module and retarget the validation callers and architecture exemption. — `plan-tasks/05-extract-checkpoint-validation.md`
6. **Extract checkpoint reading and retire the legacy module** — give filesystem loading its own module, delete `state/checkpoint.ts`, narrow all readers, and document the final module layout. — `plan-tasks/06-extract-checkpoint-reading.md`
