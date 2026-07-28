# Plan: pipeline follow-ups and temporary-workspace preflight

This plan makes `antmay afk run` and `antmay afk resume` fail safely when a thread's temporary workspaces are not Git-safe, replaces internal artifact-state vocabulary with concrete file descriptions, removes the inherited dead fields and duplicated helpers, closes or records the specified verification gaps, and aligns the living documentation with the resulting CLI behavior. The tasks are ordered so each internal contract is established before its consumers are changed.

Source: spec.md

## Global Constraints

**One task, not two, for `describeContractSide`.** DR9 relocates it into
`cli/src/thread/artifacts.ts` and DR10 rewrites it there against the new
description table. They touch the same function, and splitting them across two
units of work lets the second undo the first's placement. They must land
together.

**The settings note must sit outside the fenced JSON block.**
`cli/src/pipeline/documentation.test.ts` writes that block verbatim to a resolved
config root and feeds it to the production settings loader, which accepts no
comments. A note inside the fence breaks the gate; a note immediately before or
after it does not.

**Vocabulary.** `docs/glossary.md` is the repository's naming authority and its
term for these three directories is **temporary workspace**. This thread's
artifacts call them operational workspaces informally; user-visible output and
published prose must not coin a competing canonical term for them. The refusal
message can name the three directories concretely and needs no collective noun
at all.

**The published stage-support reference.** `cli/README.md` carries the one table
of which skills run as CLI stages and what each supported stage requires; the
root `AGENTS.md` rule keeping it current governs the `review-spec` correction.
No table row's skill list or prerequisite changes here — only the Git-policy
prose beneath it — and `documentation.test.ts` continues to hold the rows to the
published skill list and to the catalog's own prerequisites.

**Pre-release licence, and its limit.** Per `cli/AGENTS.md`, the CLI has no users
and no backward-compatibility obligation: `gitCursor` loses a field with no
migration, no shim, and no `schemaVersion` bump, and whether a previously written
`state.json` still validates is not a design consideration. That licences
redesign, never disrepair — `npm run check` must pass on every change, with no
failing test, no type error, no half-migrated code, and no red scenario.

**Behavior preservation where the work is internal.** The consolidations (DR9)
and the field removals (DR8) change no message text, no classification order, no
exit code, and no rendering. The only intended user-visible changes in the CLI
are the new refusal, the plain-language artifact rows, and the prerequisite
pause's action line.

**Git access.** All Git goes through the package's single `execFile`-based
wrapper, which provides no stdin, which is why `git check-ignore` is invoked once
per workspace rather than batched through `--stdin` (per DR2). The trailing
slash, `--no-index`, and the `1`-versus-`128` distinction are each silently wrong
in a way a permissive fixture would not catch.

**Describe the current state.** Per the root `AGENTS.md`, every documentation and
skill-body edit here describes the corrected state as though it had always been
so, with no note of what the text previously said and no before/after contrast.

**Commit scoping.** Changes confined to the CLI use the `cli` scope; changes
spanning `cli/` and `docs/` or touching shared root files omit the scope.

*Risk note, no action implied:* the README's execution-profile example also names
concrete model strings, and DR11 places the caveat on the settings block only. A
reader who copies the profile example alone meets no warning.

## Tasks

1. **Implement the temporary-workspace Git-safety check** — add the single shared probe and exhaustive focused coverage for ignore rules, tracked content, aggregation, and Git failures. → `plan-tasks/01-implement-temporary-workspace-check.md`
2. **Gate run and resume** — place the shared check before both clean-worktree gates and prove the commands refuse before state, lock, checkpoint, or harness effects. → `plan-tasks/02-gate-run-and-resume.md`
3. **Exhibit the temporary-workspace refusal** — add the structured refusal scenario, keep the aggregate listing last, and record the scenario boundary. → `plan-tasks/03-exhibit-temporary-workspace-refusal.md`
4. **Remove dead reference fields** — reduce `DocumentReference` to the source information its consumers use. → `plan-tasks/04-remove-dead-reference-fields.md`
5. **Remove the dead Git-cursor field** — reduce `gitCursor` to its consumed shape across production, tests, and demo fixtures. → `plan-tasks/05-remove-dead-git-cursor-field.md`
6. **Consolidate plain-object validation** — establish one shared plain-object guard for all four JSON validators. → `plan-tasks/06-consolidate-plain-object-validation.md`
7. **Consolidate harness IDs** — establish one harness-ID collection for settings and checkpoint validation. → `plan-tasks/07-consolidate-harness-ids.md`
8. **Consolidate queue-reason helpers** — make classification own the queue reason text and precedence used by the runner and resume. → `plan-tasks/08-consolidate-queue-reason-helpers.md`
9. **Render artifact contracts in plain language** — add the exhaustive artifact description table, relocate and rewrite `describeContractSide`, and route both diagnostics and terminal rows through it. → `plan-tasks/09-render-artifact-contracts-plainly.md`
10. **Close and document the inherited verification gaps** — bind the runtime-prerequisite demo timing under the test gate and place the three deliberate-gap explanations beside their code. → `plan-tasks/10-record-verification-gap-evidence.md`
11. **Align the living documentation** — correct the glossary, Standard recipe, stage Git-policy prose, model caveat, and real-harness verification guidance. → `plan-tasks/11-align-living-documentation.md`
