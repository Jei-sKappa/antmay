### Task 11: Build the real-CLI E2E harness and launch matrix

**Objective:** Prove the built production CLI's workspace, preflight, spawn, active-run, and worker contracts through declarative cases and scripted external executables.

**Input / context:** The complete production command path from Tasks 1–10; `spec.md` §5, FR-1 through FR-5, and AC-11.1–AC-11.3; `decisions.md DR13`, `decisions.md DR14`, `decisions.md DR15`, `decisions.md DR20`, `decisions.md DR23`, and `decisions.md DR24`. Follow the manifest/runner/requirements/traceability shape in `.library/sources/Jei-sKappa_jastr/packages/cli/test/e2e` while adapting it to isolated git repositories, state roots, skill roots, transcript roots, and long-lived subprocesses.

**Steps:**
1. Define strict YAML requirement loaders for FR-1 through FR-5 and strict case-manifest loaders with stable case IDs, `covers` references, cwd/argv/env/setup, TTY interaction scripts, process-lifecycle expectations, exact stdout/stderr, state assertions, and repository write audits.
2. Implement a per-case runner that creates isolated temporary git repositories, state/transcript/session/skill roots, builds or locates the production `dist/index.js`, invokes it as a subprocess, and always reaps case-owned workers/panes without touching developer processes.
3. Add checked-in Node executable shims for herdr, Claude Code, and Codex that exercise the real injected process boundaries, persist controllable pane/session state, survive the parent when requested, and never add an in-product fake mode.
4. Add harness self-tests for schema rejection, safe temp paths, exact-output assertions, TTY scripts, process cleanup, repository write auditing, and traceability rejection of missing/unknown/architecture-only coverage.
5. Author declarative cases covering help/packaging/platform metadata, prompt and non-prompt spawn input, every request posture, exact catalog membership, both harness-specific skill-root searches, all accepted/rejected thread forms, catalog/binary/preflight rejection, exact launch argv, session identity, registration, detach survival, immediate attach delegation, partial failures, and the active-run guard/force/worktree behavior.
6. Add worker cases covering private packaging, parent survival, one-run observation, concurrent idempotence, stale/degraded recovery initiation, and the absence of daemons/hooks/public worker commands.
7. Wire `bun run test:cli:e2e` to build the CLI first and run the case tree plus harness/traceability tests deterministically on macOS and Linux.

**Files modified:**
- `packages/cli/requirements/functional/01-workspace.yml` (NEW)
- `packages/cli/requirements/functional/02-spawn-preflight.yml` (NEW)
- `packages/cli/requirements/functional/03-spawn-launch.yml` (NEW)
- `packages/cli/requirements/functional/04-active-run-guard.yml` (NEW)
- `packages/cli/requirements/functional/05-worker-lifecycle.yml` (NEW)
- `packages/cli/test/e2e/harness/case-manifest.ts` (NEW)
- `packages/cli/test/e2e/harness/case-runner.ts` (NEW)
- `packages/cli/test/e2e/harness/requirements.ts` (NEW)
- `packages/cli/test/e2e/harness/traceability.ts` (NEW)
- `packages/cli/test/e2e/harness/shims/herdr.mjs` (NEW)
- `packages/cli/test/e2e/harness/shims/claude.mjs` (NEW)
- `packages/cli/test/e2e/harness/shims/codex.mjs` (NEW)
- `packages/cli/test/e2e/harness.test/case-manifest.test.ts` (NEW)
- `packages/cli/test/e2e/harness.test/case-runner.test.ts` (NEW)
- `packages/cli/test/e2e/harness.test/traceability.test.ts` (NEW)
- `packages/cli/test/e2e/cases/01-workspace.yml` (NEW)
- `packages/cli/test/e2e/cases/02-spawn-preflight.yml` (NEW)
- `packages/cli/test/e2e/cases/03-spawn-launch.yml` (NEW)
- `packages/cli/test/e2e/cases/04-active-run-guard.yml` (NEW)
- `packages/cli/test/e2e/cases/05-worker-lifecycle.yml` (NEW)
- `packages/cli/test/e2e/e2e.test.ts` (NEW)
- `package.json`
- `packages/cli/package.json`
- `vitest.config.ts`

**Verification:** `bun run test:cli:e2e`, `bun run test`, `bun run build`, `bun run typecheck`, and `bun run check` all exit 0; the traceability test reports complete behavioral coverage for FR-1 through FR-5; after the suite, a process check maintained by the runner reports no case-owned worker or shim process and every repository audit reports no tool write.

**Acceptance criteria:**
- Declarative cases invoke the built production CLI rather than imported command functions or a dry-run path.
- External herdr/harness behavior is replaced only at injectable process/filesystem boundaries.
- Every behavioral AC in FR-1 through FR-5 has a valid case reference and every architecture-review AC has a separate structural assertion.
- Cases assert exit code, exact stdout/stderr where contracted, registry effects, process lifetime, and repository write boundaries.
- The suite deterministically covers all specified launch/preflight/guard/worker success and failure paths on macOS and Linux.

**Consumes:** built `antmay`, all production commands, injectable process/state/transcript/skill-root boundaries, and standing workspace gates from Tasks 1–10.

**Produces:** production-path E2E harness, scripted herdr/Claude/Codex executables, FR-1–FR-5 requirements and case manifests, and a working `bun run test:cli:e2e` gate.
