# Plan — User-composable AFK pipelines

Implement external, user-selected AFK pipeline documents over a trusted nine-stage catalog, with optional suffix entry and local execution profiles, deterministic checkpoint snapshots, bounded artifact-state composition, runtime contract enforcement, and complete user/developer documentation. The work preserves the CLI's non-interactive safety boundaries while replacing the runnable built-in pipeline and catch-all local defaults with explicit, strictly validated documents and per-stage bindings.

Source: spec.md

## Global Constraints

- The CLI remains a strict non-interactive TypeScript/ESM application on Node
  `>=22`, with the repository's documented macOS v0 support.
- Pipeline, profile, settings, stage, artifact-state, and checkpoint data used
  for deterministic resume must remain serializable. Catalog definitions may
  not depend on executable callbacks stored in checkpoints (per
  `decisions.md` DR5).
- JSON documents are strict: schema failures and all discoverable field errors
  are reported clearly; no environment interpolation or credential storage is
  introduced.
- Explicit filesystem references are resolved predictably and must not escape
  established thread-relative target and Git-selector safety.
- The CLI is pre-release at `schemaVersion: 0`; this work redesigns current
  settings and checkpoint shapes directly and adds no migrations, compatibility
  shims, or deprecated aliases.
- Existing command dispatch remains lazy so help, version, and grammar errors
  perform no configuration, state, Git, or harness I/O.
- Existing exit-code meanings, workspace-lock ownership, per-stage Git
  boundaries, append-only implementation commits, pending-queue semantics, and
  terminal-outcome protocol are preserved.
- The suite skill names and terminal outcomes are part of the suite/CLI
  contract. This work adapts the nine named skills without editing their
  published behavior.
- User-facing prose uses the repository vocabulary: recipes have steps;
  pipelines have stages; a run has a terminal outcome and condition rather than
  a status.
- Every distinct new terminal rendering has a scripted demo scenario or an
  extension to an existing scenario. Scripted-harness validation operates on
  the selected stage IDs and exercises the same resolved checkpoint data as a
  real run.
- `npm --prefix cli run check` remains the full automated gate and must pass.
- Documentation describes the resulting system as its current design, with
  historical rationale confined to this thread artifact's context.

## Tasks

1. **Establish the trusted catalog and artifact-state engine** — define the nine immutable stage adapters and the bounded filesystem state they consume and promise. → `plan-tasks/01-establish-catalog-and-artifact-state.md`
2. **Add strict document references and local execution bindings** — resolve pipeline/profile references predictably and validate settings and profile bindings without catch-all or field merging. → `plan-tasks/02-add-document-references-and-execution-bindings.md`
3. **Load and compose external pipeline documents** — validate the canonical pipeline schema, select an optional suffix, simulate artifact transitions, and resolve concrete targets. → `plan-tasks/03-load-and-compose-external-pipelines.md`
4. **Wire external pipelines into new-run preflight and checkpoints** — replace built-in pipeline selection with the resolved external execution and snapshot every value resume needs. → `plan-tasks/04-wire-external-pipeline-run-preflight.md`
5. **Enforce artifact contracts and deterministic recovery at runtime** — recheck prerequisites before attempts, verify promised outputs after `DONE`, and implement every resume branch. → `plan-tasks/05-enforce-runtime-artifact-contracts.md`
6. **Render and demo the fully resolved execution** — show pipeline/profile provenance and per-stage bindings before launch and cover each new terminal shape in the scripted demo. → `plan-tasks/06-render-and-demo-resolved-execution.md`
7. **Document and verify pipeline authoring** — publish the copyable Standard document, support matrix, maintenance rule, smoke procedure, and final automated documentation checks. → `plan-tasks/07-document-and-verify-pipeline-authoring.md`
