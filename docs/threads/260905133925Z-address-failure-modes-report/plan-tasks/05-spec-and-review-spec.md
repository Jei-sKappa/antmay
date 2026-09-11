### Task 5: Rewrite `spec` and `review-spec`

**Objective:** Make `spec` author the thread's single design truth from the live conversation or the log with an audit pass, amend an authored spec in place on re-invocation, append the spec `event` line, and cite thread ADRs; give `review-spec` its `## Inputs` and keep it read-only.

**Input / context:** Starts from task 4. `spec.md` `### The spec as design truth` (inputs, audit pass, citing ADRs, amendment rules, no measuring against the log after authoring), `### The thread log` (spec reads the log as input when the conversation is absent, and entries after the last spec `event` in the amendment pass; appends one `event` per authoring or amendment), `### Reviews` (`review-spec` stays, optional and read-only), `### Planning…` (wrong ADR or spec decision found downstream is not this skill's concern); decisions.md DR2, DR6, DR15, DR17, DR22, DR23. Existing bodies: `suite/skills/spec/spec/SKILL.md` (keep `## Semantic contract`, `## Acceptance guidance and degrees of freedom`, `## Lossless authoring` in substance) and `suite/skills/review/review-spec/SKILL.md`. Synced references in `spec`: `references/formats/adr.md`, `references/formats/log-line.md`; in `review-spec`: `references/formats/adr.md`. Pending decisions are handed to `/emit-pending-decisions` with the fields fixed in `plan.md` `## Choices this plan fixes` and pinned by `references/formats/pending-decision-bundle.md` (task 2): producer, target, originating request, points each with what is blocked, why it could not be derived, evidence, optional suggestion. Task 6 makes the primitive accept exactly those fields; this task writes the caller side against the format.

**Steps:**

1. `spec` frontmatter: description says it authors `spec.md` from the discussion's live conversation or the thread log and amends an authored spec in place; bump the version.
2. Replace `## Inputs` with: the two fixed leading items; the live conversation when the same session ran the discussion (primary input), otherwise `log.md` (the thread's memory, complete enough to author from; material); `seed.md` (authoritative for intent); the thread's `adr/` and `glossary.md` (authoritative within the thread; the spec cites ADRs by stem where operative and does not restate them). These are the skill's only inputs: the audit pass measures every claim against the conversation or log, the seed, and the delta, so no other material feeds the spec. Keep the ambiguity refusal.
3. Keep `## Semantic contract`, `## Acceptance guidance and degrees of freedom`, and `## Lossless authoring`, replacing every `decisions.md` / `DR<N>` reference: settled decisions are inlined and, where a thread ADR carries them, cited by stem (`per adr/<stem>`); thread-local design that is not an ADR, including the thread's direction, is written in full. The "durable inputs" the lossless bar refers to are the conversation or log, the seed, and the delta.
4. Add `## Audit pass`: after drafting, walk the log (or the conversation) claim by claim and confirm each landed in the spec; anything the spec states that the log, conversation, seed, and delta do not support is labelled inline as an assumption or an open question, never deleted and never kept as settled; a spec is not complete while an open question remains, so an open question the skill cannot settle becomes a pending decision per `## Blocked`.
5. Add `## Amendment pass`: when `spec.md` already exists at the thread root, author nothing new; take the live conversation when present, otherwise the `log.md` entries after the last `event` line that states the spec was authored or amended; amend each affected passage in place, keeping the superseded text, marking it superseded, and annotating the date and the reason; leave every other passage untouched. State that this in-place rule is the only way the spec changes after authoring.
6. Rewrite `## Procedure`: preflight; gather inputs; authoring or amendment pass; audit pass (authoring only); write `spec.md` at the thread root with no frontmatter; append one `event` line to `log.md` with a single-line shell append (`>>`) per `references/formats/log-line.md` stating that the spec was authored or amended, never opening `log.md` with a file-editing tool; confirm with `Outcome: DONE — Spec written: spec.md` or `Outcome: DONE — Spec amended: spec.md`. State the write boundary: `spec.md` and one `log.md` line; never `adr/`, `docs/adr/`, or `docs/glossary.md`.
7. Rewrite `## Blocked` to hand the reshaped fields to `/emit-pending-decisions` with `spec.md` as target, and to still write the spec as complete as possible with each blocked specific marked inline. Any unnoticed conflict with a project ADR or glossary term (per the rule in `references/formats/adr.md`) is such a pending decision.
8. `review-spec`: add `## Inputs` (the two fixed leading items; `spec.md`, the reviewed target; `seed.md`; the thread's `adr/` and `glossary.md` as the constraint sources a spec must not contradict; all read-only) and make the procedure start from the gathered state. Replace the `decisions.md` mention. Keep its mandate: whether the spec stands alone for a fresh agent. Findings go through `/emit-pending-review` with `spec.md` as the target; it never edits the spec. Bump the version.
9. Update both `agents/openai.yaml` files if their `short_description` names decisions.
10. Run both standing gates from `suite/`.

**Files modified:** `suite/skills/spec/spec/SKILL.md`, `suite/skills/spec/spec/agents/openai.yaml`, `suite/skills/review/review-spec/SKILL.md`, `suite/skills/review/review-spec/agents/openai.yaml`

**Verification:**

```sh
S=suite/skills/spec/spec/SKILL.md; R=suite/skills/review/review-spec/SKILL.md
grep -c "decisions.md\|proposal\|DR<N>\|DR[0-9]" $S $R                # 0 for both
grep -n "^## Inputs" $S $R                                             # both
grep -n "log.md" $S | wc -l                                            # >= 3 (input, amendment pass, event append)
grep -in "audit" $S                                                    # present
grep -in "assumption\|open question" $S                                # present
grep -in "amendment pass" $S                                           # present
grep -in "superseded" $S                                               # present (kept, marked, dated)
grep -n "(event)" $S                                                   # present
grep -in "cites\|cite " $S                                             # ADRs cited, not restated
grep -n ">>" $S                                                        # present
grep -in "editing tool\|file-editing" $S                               # present
grep -in "referenced artifact\|user's prompt" $S                       # no output (not an input of spec)
grep -in "measure\|regenerat\|replace the spec\|replaces an authored" $S   # no output
grep -n "Outcome: DONE — Spec written: spec.md\|Outcome: DONE — Spec amended: spec.md" $S   # both
grep -n "Outcome: DONE\|Outcome: REFUSED" $R                           # review-spec keeps the protocol
```

**Acceptance criteria:**

- `spec`'s `## Inputs` names the live conversation or `log.md`, `seed.md`, the thread's `adr/` and `glossary.md`, and the project layer; its body has an audit step labelling unsupported claims as assumptions or open questions and forbidding their deletion (AC-3.1).
- `spec` states that it cites thread ADRs and does not restate them (AC-3.2).
- `spec` runs an amendment pass on an authored `spec.md` over the conversation or the log entries after the last spec `event`, states the in-place rule, appends an `event` line on authoring and on amendment, and appends with a shell append (AC-3.3, AC-2.5, AC-2.2).
- No sentence describes measuring the spec against the log after authoring or replacing an authored spec (AC-3.4).
- `review-spec` carries `## Inputs`, writes findings only, and never edits the spec (AC-12.1, AC-6.1).

**Consumes:** `references/formats/log-line.md` and `references/formats/adr.md` synced copies (task 2); the delta contract from task 4.

**Produces:** the in-place amendment rule, stated as: the superseded text is kept, marked superseded, annotated with the date and the reason, and one `log.md` line records the change; the spec `event` line form that the amendment pass keys on. Tasks 6, 9, and 10 restate the rule for the skills that amend the spec mid-run.
