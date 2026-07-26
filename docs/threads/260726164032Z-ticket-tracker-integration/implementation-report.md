# Implementation report

Source: `seed.md` plus `decisions.md` (DR1–DR10)

## Outcome

Completed. The ticket tracker integration is implemented in full across five commits: the shared tracker reference, the new `open-ticket` entry point, ticket reading and a duplicate-thread guard in `open-thread`, the disposition-aware ticket step in `finish`, and the method documentation for the tracker boundary and vocabulary. Nothing was left partially completed, nothing was blocked, and no part of the work was found already satisfied.

Per DR6 no sweep or listing skill was built, which is a decided exclusion rather than unfinished work.

## Changes

**Shared tracker reference** (`466b078`). Added `suite/shared/references/trackers/github.md` as the single canonical source of GitHub specifics: the availability check (`gh --version`, `gh auth status`), repository and default-branch resolution, the canonical ticket reference form and the rule that references are compared by owner, repository, and number rather than by string equality, the read, create, and close commands, `--body-file` guidance so Markdown bodies survive intact, the label existence check and label creation, the marker label's meaning, closing-keyword semantics including that GitHub auto-closes only on merge into the repository's default branch, and the non-closing `Related to` mention.

**`open-ticket`** (`f2d0607`). New user-invoked entry point at `suite/skills/capture-discussion/open-ticket/`, with `SKILL.md` at version `0.1.0` carrying `disable-model-invocation: true` and an `agents/openai.yaml` carrying the interface block plus `policy.allow_implicit_invocation: false`. It composes a prose title and a body written as a genesis narrative that explicitly carries no acceptance criteria, task breakdown, design, or estimate; resolves the tracker from the git remote's host; confirms title, body, and label in one pass, naming marker-label creation when the label is absent; applies the `antmay` label by default with an opt-out; writes nothing to disk; and reports only the filed ticket's URL, proposing no next action. Registered in `.claude-plugin/marketplace.json`, the root `README.md` skill index, the `.vscode/settings.json` commit scopes, and the suite `AGENTS.md` layout, and declared in `shared/manifest.yaml` with the tracker reference mirrored in.

**`open-thread`** (`1a34827`, refined in `f7f9d0b`, version `0.2.1`). Reads a supplied ticket through the host-resolved tracker reference, accepting any ticket without inspecting labels and without a ticket-specific mode, while retaining the paste fallback for an unreachable tracker and continuing to perform no tracker writes. Gained a duplicate-thread check that searches active and archived thread seeds for an `External:` value denoting the same ticket, compares references by meaning, names any match, and asks whether to continue without blocking. Slug guidance now keeps the ticket number out of the folder name. The former "External references are passive" section was folded into the ticket-input material, so the no-tracker-writes rule is stated once rather than twice.

Both ticket-conditional blocks live in the hand-authored skill-local reference `references/supplied-ticket.md`, and the body carries a one-line pointer naming the condition. An invocation with no ticket never reads them. The generator leaves that file alone because only `trackers/github.md` is declared in the manifest for this skill.

**`finish`** (`e3de2ee`, version `0.2.0`). The passive-tracker section is replaced by a ticket step gated on an `External:` value plus a reachable tracker — silent when either is missing, and skipped when the ticket is already closed. The step branches on the chosen disposition: create PR offers a closing keyword settled before the PR body is drafted, warns when the base is not the default branch that the keyword links but never closes and offers a non-closing mention instead, and never closes the ticket while the PR is unmerged; a direct merge offers an explicit close commented with the merge commit; leave-as-is offers nothing. Every branch is an offer, and writes beyond the accepted offer remain forbidden. The closing report now names what happened to the ticket.

**Method documentation** (`3fa3ce0`). `docs/thread-model.md`'s external-references section now states that passivity governs what *authorizes* a tracker mutation rather than banning one, names the deliberate user-invoked confirming operation as the sanctioned path, and names the two expected mutations. `docs/glossary.md` gains a "Trackers and tickets" section defining tracker, ticket, ticket reference, marker label, and tracker mutation, plus a reserved-words entry for `issue`. `docs/README.md`'s capability catalog lists filing a tracker ticket.

## Verification

- `node scripts/check-marketplace-skills.mjs` from `suite/`, run before every commit. Final result: OK at 30 skills, all declared in the manifest.
- `node scripts/sync-shared-references.mjs` after every manifest change. Final result: 14 files mirrored across 10 skills, deterministic and clean.
- `grep` across skill bodies confirming no stale auto-closing prohibition or passive-tracker heading survived the `finish` rewrite.
- `grep` across `suite/skills`, `docs/recipes`, `docs/README.md`, `docs/skill-authoring.md`, and `cli/src` for uses of "issue" before wording the glossary entry.

Skill content has no test suite. The marketplace check is the repository's only mechanical gate, and validation otherwise consists of reading the markdown for coherence — so no automated check confirms the three tracker paths behave as described.

## Deviations and judgment calls

- `open-ticket`'s creation and its four registration points were combined into one commit rather than split across tasks. A commit adding the skill folder without registering it would have failed the standing marketplace gate, so splitting them would have landed a state the repository's own gate rejects.
- `node` was absent from the non-interactive shell's PATH because nvm was not loaded. Rather than treating this as a preflight tooling failure, the binary was located and invoked directly as `/opt/homebrew/bin/node` (v26.5.0). Anyone re-running the suite scripts in a non-interactive shell needs the same absolute path or a loaded nvm.
- A first draft of the glossary's `issue` entry mandated writing "ticket" everywhere. That would have implicated the unrelated review-severity token `issue` (`blocker`, `issue`, `nit`) and implied renaming the "a GitHub issue" input descriptions in six skills — a rename this thread never decided. The entry was narrowed to cover both live senses, so it describes the repository as it actually stands.

## Remaining concerns

- None of this behavior is mechanically tested, and the three tracker paths — filing a ticket, reading one into a thread, and linking or closing one at delivery — were not exercised against a live repository during implementation. Correctness currently rests on reading the skill bodies.
- Because DR6 deliberately built no sweep skill, a ticket whose thread ships outside `finish` stays open until someone closes it by hand. This includes the by-design case where a PR carrying a closing keyword merges into a non-default branch: the ticket is linked but never auto-closed.

## Follow-ups

- `plan-brief`, `plan-strict`, `spec`, `implement`, `implement-plan`, `implement-plan-with-subagents`, and `docs/recipes/quick.md` describe their accepted input as "a GitHub issue". The narrowed glossary entry permits this wording, so nothing is inconsistent today, but harmonizing those descriptions on the reserved term "ticket" was outside this thread's decisions and remains open.
