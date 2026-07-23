# Task 3: Recipe model, standard recipe, profiles, prompt rendering

**Objective:** Define the serializable recipe/stage-descriptor model, the built-in `standard` recipe with its declared targets, Git policies, and queue-resolution behaviors, plus target resolution, execution-profile resolution, and per-harness prompt rendering.

**Input / context:** `spec.md` §"Recipe model and the built-in `standard` recipe", §"Execution-profile resolution", §"Prompt rendering", and the Git-policy table in §"Git boundaries and executor commits"; `decisions.md DR4` (one generic runner, recipe as data), `DR31` (descriptor fields, target resolution, prompt shape), `DR50` (declarative three-part Git policy, exact commit subjects), `DR53` (queue-resolution `advance`/`rerun`), `DR12`/`DR13`/`DR20`/`DR32` (profile resolution rules), `DR5` (snapshotting requires descriptors to be plain serializable data). Consumes `HarnessId`, `ProfileFields`, `AfkSettings` from Task 2. Everything here is pure data and pure functions — no I/O.

**Steps:**

1. Create `cli/src/recipe/types.ts` exporting plain-JSON-serializable types (no functions in descriptors, so the checkpoint snapshot can persist them verbatim):
   - `type StageTarget = { kind: "thread-root" } | { kind: "thread-file"; path: string }` (thread-relative path);
   - `type PathSelector = { kind: "exact-file" | "subtree"; threadRelativePath: string }`;
   - `type GitPolicy = { headMayChange: boolean; allowedChanges: PathSelector[]; changeRequired: boolean; commitSubjectTemplate: string | null }` — empty `allowedChanges` means the post-DONE boundary must be clean; the template contains the literal placeholder `<thread-folder>`; `null` means no executor commit;
   - `type QueueResolution = "advance" | "rerun"`;
   - `type StageDescriptor = { id: string; skill: string; target: StageTarget; gitPolicy: GitPolicy; queueResolution: QueueResolution }`;
   - `type Recipe = { name: string; stages: StageDescriptor[] }`;
   - `type StageProfile = { harness: HarnessId; model: string; prompt: string; idleTimeoutSeconds: number }`.
2. Create `cli/src/recipe/standard.ts` exporting `standardRecipe: Recipe` with exactly the six stages, in order, per `spec.md`: `spec` (skill `spec`, thread-root target, HEAD fixed, allowed `spec.md` exact-file, change required, template `docs(<thread-folder>): spec`, `advance`); `reconcile-spec` (target `spec.md`, HEAD fixed, allowed `spec.md`, change optional, template `docs(<thread-folder>): reconcile spec`, `rerun`); `review-spec` (target `spec.md`, HEAD fixed, clean boundary, no commit, `rerun`); `plan-strict` (target `spec.md`, HEAD fixed, allowed `plan.md` exact-file + `plan-tasks/` subtree, change required, template `docs(<thread-folder>): plan`, `advance`); `reconcile-plan` (target `plan.md`, same selectors, change optional, template `docs(<thread-folder>): reconcile plan`, `rerun`); `implement-plan-with-subagents` (target `plan.md`, HEAD may change, clean final boundary, no commit, `rerun`). Also export `builtInRecipes: Record<string, Recipe>` containing only `standard`, and `knownStageIds(recipes): ReadonlySet<string>` for the settings validator.
3. Create `cli/src/recipe/targets.ts` exporting `resolveStageTarget(target: StageTarget, threadRelPath: string): TargetResult` returning the normalized repository-relative path — the thread root with a trailing slash, or `<threadRelPath>/<path>` — and rejecting (typed error) any `thread-file` path that lexically escapes the thread (absolute paths, `..` segments, empty). Also export `resolveSelector(selector: PathSelector, threadRelPath: string)` producing the repo-relative exact-file path or subtree prefix for the boundary engine.
4. Create `cli/src/recipe/profiles.ts` exporting `resolveStageProfiles(recipe: Recipe, settings: AfkSettings): ProfilesResult` where `ProfilesResult` is `{ ok: true; profiles: StageProfile[] } | { ok: false; errors: string[] }` (index-aligned with `recipe.stages`). Resolution per stage: start from built-in `{ prompt: "", idleTimeoutSeconds: 86400 }`, shallow-merge `settings.defaults`, then `settings.stages[stage.id]`; every field is plain replacement (an omitted field inherits, a supplied one replaces — no concatenation); after merging, a missing/unsupported `harness` or missing/empty `model` is an error naming the stage; report all stage errors together.
5. Create `cli/src/harness/prompt.ts` exporting `renderStagePrompt(harness: HarnessId, skill: string, resolvedTarget: string, profilePrompt: string): string` producing exactly `` $<skill> `<resolvedTarget>`. `` for `codex` and `` /<skill> `<resolvedTarget>`. `` for `claude-code`, appending a single space plus `profilePrompt` only when it is non-empty. The trigger is the first prompt content; nothing else is added.
6. Add tests `cli/src/recipe/standard.test.ts` (six stages, order, targets, policies incl. exact commit-subject templates, queue behaviors — AC-6.1), `cli/src/recipe/targets.test.ts` (trailing slash on root, repo-relative join, escape rejection), `cli/src/recipe/profiles.test.ts` (default seeds, merge precedence, plain replacement, omitted-defaults-with-complete-stages OK, aggregate errors — AC-4.1), `cli/src/harness/prompt.test.ts` (byte-exact rendering for both harnesses, with and without profile prompt — AC-4.3, AC-6.2). Include a synthetic non-`standard` recipe in targets/profiles tests to keep the functions recipe-agnostic.

**Files modified:** `cli/src/recipe/types.ts` (NEW), `cli/src/recipe/standard.ts` (NEW), `cli/src/recipe/targets.ts` (NEW), `cli/src/recipe/profiles.ts` (NEW), `cli/src/harness/prompt.ts` (NEW), `cli/src/recipe/standard.test.ts` (NEW), `cli/src/recipe/targets.test.ts` (NEW), `cli/src/recipe/profiles.test.ts` (NEW), `cli/src/harness/prompt.test.ts` (NEW)

**Verification:** `npm --prefix cli run check` exits 0; `npm --prefix cli run test -- src/recipe src/harness` exits 0. `grep -rn "docs(<thread-folder>)" cli/src/recipe/standard.ts` shows all four commit-subject templates.

**Acceptance criteria:**

- `standardRecipe` matches the spec's stage table exactly: IDs, order, skills, targets, three-part Git policies, commit-subject templates, queue-resolution behaviors (AC-6.1, AC-12.3 subjects).
- `resolveStageTarget` output is repository-relative, thread-root targets end with `/`, escapes are rejected (AC-6.1).
- Profile resolution implements seed → defaults → stage override with plain replacement and aggregate failure (AC-4.1).
- Rendered prompts are byte-exact per AC-6.2, profile prompt appended once after a single space only when non-empty (AC-4.3).
- All descriptor types round-trip through `JSON.parse(JSON.stringify(...))` unchanged.

**Consumes:** `HarnessId`, `ProfileFields`, `AfkSettings` from `cli/src/config/settings.ts` (Task 2).

**Produces:** all types from `cli/src/recipe/types.ts`; `standardRecipe`, `builtInRecipes`, `knownStageIds(recipes)` from `cli/src/recipe/standard.ts`; `resolveStageTarget(target, threadRelPath)` and `resolveSelector(selector, threadRelPath)` from `cli/src/recipe/targets.ts`; `resolveStageProfiles(recipe, settings)` from `cli/src/recipe/profiles.ts`; `renderStagePrompt(harness, skill, resolvedTarget, profilePrompt)` from `cli/src/harness/prompt.ts`.
