# Implementation report

Source: plan.md

## Outcome

Every task in the plan completed. All eight are implemented and committed, one commit per task:

1. **Canonical formats** (`2e6e079`) — `log-line.md` lists its seven types under `### Types`; the three indented format fences start at column one.
2. **Canonical instructions** (`03ca32f`) — the four instruction→format pointers carry the prefix and read as directives; `emit-terminal-outcome.md` gained the every-exit sentence.
3. **`capture-discussion` and model-invoked bodies** (`935c697`) — `discussion`, `open-thread`, `open-ticket`, `resolve-pending-decisions`, `consult-adrs`, `consult-glossary`, and `supplied-ticket.md`.
4. **`spec`, `plan`, and `roadmap` bodies** (`b07cafc`) — `spec`, `plan-brief`, `plan-strict`, `check-plan`, `roadmap`.
5. **`implement` bodies** (`db64b82`) — the three implement bodies plus the three hand-authored reviewer references.
6. **`review` and `close` bodies** (`792677a`) — `review-spec`, `review-implementation`, `review-code`, `close-thread`.
7. **Authoring documents** (`936224e`) — `body-structure.md`, `shared-references.md`, `interaction-posture.md`.
8. **The text check and its wiring** (`71b3463`) — `suite/scripts/check-skill-text.mjs`, its CI step, and its mention in `CONTRIBUTING.md` and `suite/AGENTS.md`.

Nothing was left partial or blocked. The check script found the tree left by tasks 1–7 clean on its first run, so no residual sweep violation had to be repaired in the final task.

## Changes

**The `<skill_path>/` prefix.** Every pointer to a file inside a skill's own folder, in all 18 bodies and in every shared and hand-authored reference file, is written `<skill_path>/references/…`. Project paths (`docs/adr/`, `docs/glossary.md`, `.wip/…`) stay bare.

**Project-layer inputs.** All 16 `## Inputs` sections open with `docs/adr/`, read via `/consult-adrs`, followed by `docs/glossary.md`, read via `/consult-glossary`. The phrase "write the project's fixed terms" is gone from the suite, and every invocation of the conflict rule now reads as a procedure ("as `/consult-adrs` instructs") rather than naming the skill as a document that carries text.

**One Inputs shape.** Every item is `<source>[, <presence clause>] — <clause>.` with no trailing authoritative/material tag; presence clauses are drawn from the three fixed forms. `discussion` carries the early-life sentence. The three review bodies keep their authority-anchor rankings and `spec` keeps its "whole of what the spec rests on" sentence, in prose.

**Directive pointers.** Reference pointers read as directives (`follow` / `following`), carry no restatement of what the pointed file holds, and `per` never directly precedes a path. Same-body `per `## Section`` pointers are untouched in count and text.

**Every exit through one instruction.** All 53 literal `Outcome:` lines are gone from the bodies; each of the 12 declaring skills' exits is a pointer to `<skill_path>/references/instructions/emit-terminal-outcome.md` with the token and reason as parameters. No body enumerates the three tokens as a vocabulary.

**Formats.** `log-line.md`'s `## Shape` holds the fenced skeleton then a `### Types` subheading with seven definition-plus-example bullets; `## Rules` points at that list rather than inlining the definitions and adds the "fits none of the seven" rule. The `## Shape` blocks of `pending-decision-bundle.md`, `implementation-report.md`, and `roadmap-index.md` are de-indented. All generated copies were produced by `sync-shared-references.mjs`; none was hand-edited.

**Authoring documents.** `body-structure.md` states the prefix and what it resolves to, the item shape with its presence clauses, the early-life rule, the directive intent, and the two strict rules. `shared-references.md` states the same for pointers inside reference files, with its format skeleton untouched. `interaction-posture.md` says the instruction is pointed at from every exit the run can reach.

**The check.** `suite/scripts/check-skill-text.mjs` walks the 109 `.md` files under `skills/` and `shared/references/`, excludes `suite/authoring/`, uses `node:` built-ins only, reports `path:line: rule`, and exits 0 clean / 1 on any hit. CI runs it after the marketplace check under the same `suite` working directory; `CONTRIBUTING.md` and `suite/AGENTS.md` name it.

`cli/` was not touched.

## Verification

Every task's own verification block was run from `suite/`, and the whole-tree acceptance run was performed at task 8 and independently re-confirmed afterwards. `$BASE` throughout is `ae58002`, the commit the run started from.

- **FR-1**: no `references/` occurrence lacks the `<skill_path>/` prefix; all four instruction→format pointers carry it; no project path acquired it.
- **FR-2**: every `## Inputs` section opens with the two prescribed items; "write the project's fixed terms" and "`/consult-adrs` carries" appear nowhere; `docs/adrs` appears nowhere; no new instruction file was created for the conflict rule.
- **FR-3**: the trailing-tag grep returns nothing; presence clauses are confined to the three fixed forms; the review bodies' and `spec`'s rankings survive in prose.
- **FR-4**: no `per` precedes a path; same-body `per`, heading-set, and numbered-step counts are byte-equal to `$BASE` in every swept body.
- **FR-5**: no `SKILL.md` contains an `Outcome:` line; exit counts per body are spec 4, plan-brief 5, plan-strict 4, check-plan 4, roadmap 4, implement 6, implement-plan 7, implement-plan-with-subagents 10, review-spec 2, review-implementation 3, review-code 3, close-thread 4; `README.md` has no diff.
- **FR-6**: `log-line.md` has exactly two second-level headings, seven type bullets each with an `Example:` continuation, and no example block outside `### Types`; the three synced copies are byte-identical to the canonical file; `shared-references.md`'s skeleton text is unchanged.
- **FR-7**: no `.md` under `skills/` or `shared/references/` has a fence line with leading whitespace.
- **FR-8**: `node scripts/check-skill-text.mjs` exits 0 on 109 files; each of the three rules was proved by introducing a violation, observing a `path:line: rule` hit and exit 1, and reverting to exit 0; the script does not walk `suite/authoring/`; the CI step and both documentation mentions are in place; `check-marketplace-skills.mjs` exits 0 (18 skills) and a second `sync-shared-references.mjs` run is a no-op.
- **FR-9**: `cli/`, `.claude-plugin/marketplace.json`, and `suite/shared/manifest.yaml` have no diff against `$BASE`.

Two prescribed checks could not pass as literally written, and both were resolved by reading them against the acceptance criterion they enforce rather than by changing the tree:

- The whole-tree `grep -rn 'Outcome:' skills` returns 24 hits, all in the 12 synced `emit-terminal-outcome.md` copies — the file that *defines* the line, and which AC-5.4 requires to keep it. Scoped as AC-5.1 itself scopes it (`--include=SKILL.md`), it returns nothing.
- A pattern `'seven types\|log-line.md'` over `discussion`'s log step matches the `append-log-line.md` pointer by substring. Its intent holds: `seven types` → 0, `formats/log-line.md` → 0, one pointer on the step.

The AC-4.2 comparison loops must be run under `bash`; under `zsh` the `$BASE:suite/$f` substitution fails and the loop passes vacuously. Every such loop was re-run under `bash`.

No check was skipped.

## Deviations and judgment calls

- **`check-plan` Inputs closing paragraph** — the pre-existing clause "name what is missing and how to supply it," was deleted rather than left standing beside the brief's prescribed parameter text, which would have repeated it word for word inside one sentence. `spec`, `plan-brief`, and `plan-strict` keep their earlier clauses, where the wording differs; the three bodies are therefore divided on how the collision was resolved.
- **Presence vocabulary in the two plan bodies** — "`spec.md` is the form whenever the thread holds one" became "when the file exists", the nearest of the three fixed clauses. Same meaning; the accepted-forms sentence and the ranking clause both survive.
- **The `## Implementation report` sentence in the three implement bodies** — the plan's literal text ("a deviation is what `## Deviations` defines") drops the same-body pointer ``per `## Deviations```, which would trip the plan's own AC-4.2 count check and its own rule on heading pointers. The sentence ends "…, and the deviations per `## Deviations`." instead.
- **The three reviewer references' folder mention** — "in this same `references/` folder" was prefixed, though the brief scoped those files to pointers only. The spec's check rule 1 forbids any `references/` occurrence not preceded by `<skill_path>/`, so the bare mention would have failed the new check under either evaluation mode.
- **`close-thread`'s glossary merge** — the brief names "Procedure step 2 of `## Closing`", but the body has no `## Closing` heading; the merge is step 2 of `## Writes`, and that is where the edit was applied.
- **Early-life sentences** — only `discussion` carries one, as the plan settled. No other body is normally invoked while the thread holds only `seed.md` and a header-only `log.md`, so none was added. This is the departure the plan asked to have recorded here.

## Remaining concerns

- **The authoring document now contradicts the format it describes.** `suite/authoring/shared-references.md:26` still reads "Vocabulary an artifact fixes — the log's seven entry types, say — is a rule with its enumeration inline", which stopped being true of `log-line.md` at task 1. The same passage's skeleton bullets say a format file "holds nothing outside" title, intro, `## Shape`, and `## Rules`; the decision record reasons that this does not forbid third-level headings, but the authoring document nowhere states that reading, so a future author has no written sanction for `### Types`. AC-6.5 freezes that passage, so the plan could not fix what it created. One added clause would settle both.
- **AC-5.1 is unsatisfiable as written and contradicts AC-5.4.** Its wording needs scoping to `SKILL.md`; the tree needs no change.
- **`body-structure.md` states rules its own prose breaks.** Line 123 uses `per` directly before a file path, 28 lines after the document introduces the rule forbidding exactly that; line 170 names a bare `references/`. Both are pre-existing and outside every task's steps, and no gate catches them because `suite/authoring/` is excluded from the check.
- **The removed-tag guidance is incompletely stated.** `body-structure.md` tells an author to delete the trailing tag and says rankings live in prose, but omits the spec's companion rule that a tag's meaning is folded into the clause where it carries information. Seven Inputs items across `discussion`, `resolve-pending-decisions`, `roadmap`, and the three review bodies rely on exactly that, and the document as written could be read as forbidding them.
- **`shared-references.md:46-48`** says "`per` before a heading of the same body is fine" inside a paragraph about pointers in a reference file, which is not a body. The phrase is grepped for verbatim by the verification, so it could not be reworded in place; "the same file" is what it means.
- **The check's rule 2 matches a bare substring**, so it would over-fire on any word ending in "per" before a prefixed path and misses a sentence-initial "Per". No such occurrence exists in the tree today.
- **`roadmap`'s "required authoritative input" prose lost its antecedent.** Lines 12 and 26 used to point at the `Authoritative` tags on the `seed.md` and `spec.md` items; with the tags removed, nothing marks which inputs are the required authoritative ones, so the preflight rule no longer names a testable set. The rule forbidding compensation prose is why it was left alone.
- **Two plan-mandated wording seams**, carried into the shipped text: the preflight sentence in `spec`, `plan-brief`, `plan-strict`, and `check-plan` now has two successive em-dash clauses leaving a trailing imperative fragment; and `plan-brief`/`plan-strict` state the refusal parameter twice, five words apart. `close-thread:73` is the suite's only exit passing a token with no reason parameter.
- **Rendering of `log-line.md`'s examples** — each `Example:` line is a two-space lazy continuation with no hard break, so a Markdown renderer joins it to the definition as one paragraph. The raw-text read, which is how an invoked agent consumes the file, is unaffected.

## Follow-ups

- Settle the `shared-references.md` skeleton passage: state that the skeleton does not forbid third-level headings, and correct the "enumeration inline" sentence.
- Scope AC-5.1 to `SKILL.md`, and fix the two verification patterns this run found unsatisfiable (`'seven types\|log-line.md'`, and the zsh-hostile `$BASE:suite/$f` loops).
- Fix `body-structure.md:123` and `:170`, and add the folded-tag guidance to its Inputs paragraph.
- Give the check's rule 2 a word boundary; deduplicate multi-hit output lines; rename the CI job now that it runs two gates.
- Decide whether `discussion`'s gather-time read-once rule and `append-log-line.md`'s append-time rule are genuinely two rules.
- Align the two reviewer lane files' `plan-tasks/NN-<slug>.md` with the bodies' `NN-<kebab-slug>.md` (pre-existing, and outside any thread that owns those files' method content).
- Revisit the three bodies' divided resolution of the duplicated refusal parameter, and the fenced content of the three de-indented format files now that flush-left `##` lines inside their fences could confuse a naive line-based parser.
