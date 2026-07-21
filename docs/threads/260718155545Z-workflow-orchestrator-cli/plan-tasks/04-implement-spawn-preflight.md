### Task 4: Implement spawn preflight resolution

**Objective:** Resolve every spawn input and external prerequisite into one normalized launch request before pane creation, registration, or worker startup is possible.

**Input / context:** The catalog and state store from Tasks 2–3; `spec.md` §§3.4 and 4.1 plus FR-2 and FR-4; `decisions.md DR6`, `decisions.md DR10`, `decisions.md DR11`, `decisions.md DR14`, `decisions.md DR16`, `decisions.md DR20`, `decisions.md DR23`, and `decisions.md DR24`.

**Steps:**
1. Add an injectable process boundary for non-shell executable invocation and availability checks so production uses real programs while tests can substitute git, herdr, Claude Code, and Codex paths.
2. Resolve the canonical worktree with `git rev-parse --show-toplevel` from any nested cwd and reject cwd outside a git worktree with a precise diagnostic.
3. Resolve `--thread` only from the exact folder name, repo-relative thread-root path, or absolute thread-root path; canonicalize it and require a direct child directory of `<repository>/docs/threads`, rejecting file paths, partials, archived/external roots, ambiguity, and nonexistence.
4. Validate catalog membership, `required | optional | forbidden` request posture, the fixed `herdr` adapter value, and the selected harness executable before returning a normalized request.
5. Implement harness-specific skill availability with separately injectable root lists: Claude project/user `.claude/skills`, Codex project/user `.agents/skills`; validate readable matching `SKILL.md` frontmatter and require Codex `agents/openai.yaml`, with project scope winning.
6. Produce the exact install remediation on availability failure and ensure plugin caches, nonstandard roots, and roots belonging only to the other harness are ignored.
7. Query active records for the canonical repository and return an explicit guard result for the later interactive confirmation/non-interactive `--force` policy; terminal records and separate worktree folders must not trigger it.
8. Add tests that spy on every side-effect boundary and prove each failure returns before any adapter, registry-write, or worker-launch call.

**Files modified:**
- `packages/cli/src/process/process-runner.ts` (NEW)
- `packages/cli/src/preflight/repository.ts` (NEW)
- `packages/cli/src/preflight/thread.ts` (NEW)
- `packages/cli/src/preflight/skill-availability.ts` (NEW)
- `packages/cli/src/preflight/spawn.ts` (NEW)
- `packages/cli/test/repository-preflight.test.ts` (NEW)
- `packages/cli/test/thread-preflight.test.ts` (NEW)
- `packages/cli/test/skill-availability.test.ts` (NEW)
- `packages/cli/test/spawn-preflight.test.ts` (NEW)

**Verification:** `bun run test -- packages/cli/test/repository-preflight.test.ts packages/cli/test/thread-preflight.test.ts packages/cli/test/skill-availability.test.ts packages/cli/test/spawn-preflight.test.ts`, `bun run build`, `bun run typecheck`, and `bun run check` all exit 0.

**Acceptance criteria:**
- All three exact thread argument forms resolve to the same direct active-thread root from nested cwd.
- Every rejected thread form, missing input, request-posture error, unknown catalog entry, missing binary, or unavailable/malformed skill fails before side effects.
- Claude and Codex availability use only their ordered, harness-specific project/user roots and Codex requires `agents/openai.yaml`.
- Availability errors name the harness, searched roots, and exact `npx skills add Jei-sKappa/antmay --skill <name>` remediation.
- The active-run guard is repository-folder scoped and excludes terminal runs.

**Consumes:** `ANTMAY_SKILL_CATALOG`, request-validation helpers, and `FilesystemRegistryStore` from Tasks 2–3.

**Produces:** `ProcessRunner`, `preflightSpawn(input): Promise<NormalizedSpawnRequest>`, and injectable repository/thread/skill/executable resolvers with a side-effect-free failure contract.
