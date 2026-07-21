# `antmay` v0 implementation plan

Build the local interactive `antmay` CLI as a strict TypeScript/Bun workspace: a multiplexer-neutral core, a herdr-backed execution lane for Claude Code and Codex, durable per-user run state, transcript-authoritative observation, the `spawn`, `status`, and `attach` commands, and production-path verification. The tasks below are the authoritative execution order; each brief includes its own focused test cycle and explicit hand-off surface.

Source: spec.md

## Global Constraints

- The root is a Bun workspace with shared strict TypeScript configuration and repository-level `build`, `typecheck`, `test`, `test:cli:e2e`, `check`, and `format` scripts.
- Biome owns formatting/checking, Vitest owns tests, and Commander with typed definitions owns the public CLI.
- The built CLI targets Node.js 20 or newer and is packaged so `antmay` can be installed and run through the npm/`npx` ecosystem (per `decisions.md` DR5, DR12, DR13).
- `packages/core` owns the mode-agnostic domain: public run identity, the explicit skill catalog, registry semantics, outcome parsing and classification, pending-bundle attention semantics, and status projections.
- No core type or function may require a pane or multiplexer concept.
- `packages/cli` owns the `antmay` binary, Commander definitions, prompts, concrete filesystem and process integration, harness launch integration, the herdr adapter, and the private worker entry point (per `decisions.md` DR2, DR3, DR13, DR15).
- The worker is a private packaged module, not a public command and not present in `antmay --help`.
- Each successful detached spawn starts one independent Node.js worker for that run; there is no `antmay` service or daemon (per `decisions.md` DR15).
- All `antmay`-written files live beneath one per-user state root.
- `antmay` writes no repository file, `.gitignore`, thread artifact, harness configuration, hook, or breadcrumb.
- Concurrent worker and command updates must be atomic and idempotent; duplicate reconciliation must not regress a terminal classification or produce conflicting terminal records.
- v0 ships only the herdr adapter, while herdr remains an external runtime program rather than a linked library.
- Pane output and herdr-specific events, output-match support, or agent-state enrichment may report liveness, wake an earlier transcript read, and retain diagnostics, but they never classify a terminal outcome or own correctness (per `decisions.md` DR3, DR22).
- `antmay` does not impose a permission posture on the harness; the harness's configured permission behavior remains in effect (per `decisions.md` DR2).
- Every behavioral acceptance criterion below must be covered by at least one declarative end-to-end case unless it is explicitly marked as an architecture review.

## Tasks

1. **Scaffold the publishable Bun workspace** — establish the strict two-package build, CLI identity, public command shell, and standing repository gates. → `plan-tasks/01-scaffold-bun-workspace.md`
2. **Define core run, catalog, and status contracts** — encode the multiplexer-neutral domain and exact v0 catalog/JSON schema as tested public types. → `plan-tasks/02-define-core-contracts.md`
3. **Implement atomic per-user run state** — add state-root resolution and an idempotent filesystem registry behind core lifecycle semantics. → `plan-tasks/03-implement-run-state.md`
4. **Implement spawn preflight resolution** — resolve repositories, exact active threads, installed skills, binaries, and catalog request posture before side effects. → `plan-tasks/04-implement-spawn-preflight.md`
5. **Implement structured transcript detection** — parse Claude and Codex top-level final events into reliable terminal evidence while rejecting false positives. → `plan-tasks/05-implement-transcript-detection.md`
6. **Implement the herdr and harness execution boundaries** — provide thin external-process adapters, native invocation rendering, session binding, and common attachment. → `plan-tasks/06-implement-execution-boundaries.md`
7. **Implement reconciliation and the private observer worker** — monitor one run, preserve degraded active states, and finalize terminal records idempotently. → `plan-tasks/07-implement-observer-worker.md`
8. **Implement `antmay spawn`** — compose preflight, prompting, active-run guarding, pane launch, registration, worker startup, and immediate attachment. → `plan-tasks/08-implement-spawn-command.md`
9. **Implement `antmay status`** — reconcile scoped runs, restore observation, scan pending attention, and render exact human and JSON projections. → `plan-tasks/09-implement-status-command.md`
10. **Implement `antmay attach`** — select active or retained terminal runs and join their panes without mutating recorded state. → `plan-tasks/10-implement-attach-command.md`
11. **Build the real-CLI E2E harness and launch matrix** — exercise the built executable with scripted boundaries for workspace, preflight, spawn, guarding, and worker lifecycle. → `plan-tasks/11-build-e2e-launch-matrix.md`
12. **Complete runtime and architecture verification** — extend the production-path cases and structural checks through FR-10. → `plan-tasks/12-complete-release-verification.md`
13. **Document and verify release operations** — publish user and maintainer guidance, close FR-11 traceability, exercise the documented smoke path when available, and run the final release gates. → `plan-tasks/13-document-release-operations.md`
