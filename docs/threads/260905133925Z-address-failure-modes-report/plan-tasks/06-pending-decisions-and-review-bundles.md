### Task 6: Rewrite the pending-decision skills and `emit-pending-review`

**Objective:** Make `emit-pending-decisions` write the reshaped bundle and nothing more, make `resolve-pending-decisions` settle each point live into a log line, a spec amendment or a code-must-change note, and a draft ADR or glossary entry, and make `emit-pending-review` name the implementation folder a review targets.

**Input / context:** Starts from task 5. `spec.md` `### Pending decisions and their resolution`, `### The thread's ADR and glossary delta`, `### The spec as design truth` (in-place amendment rule, produced by task 5), `### Skill inventory` (`emit-pending-review` names the implementation folder it targets); decisions.md DR15, DR16, DR27, DR6, DR3. Existing bodies: `suite/skills/primitives/emit-pending-decisions/SKILL.md`, `suite/skills/capture-discussion/resolve-pending-decisions/SKILL.md`, `suite/skills/primitives/emit-pending-review/SKILL.md`. Synced references: `emit-pending-decisions` has `references/formats/pending-decision-bundle.md`; `resolve-pending-decisions` has `references/formats/discussion-point.md`, `references/formats/adr.md`, `references/formats/log-line.md`, `references/formats/pending-decision-bundle.md`. Implementation folders are `implementations/<yymmddhhmm>[-<slug>]/` (spec `### Thread layout`).

**Steps:**

1. `emit-pending-decisions`: the precondition block is Producer, Target, Originating request, and Points, each point carrying what is blocked, why the producer could not derive the answer, the evidence weighed, and an optional free-text suggestion. Keep the refusals (no points, a point that is not a genuine human decision, a missing field). Replace `## Bundle shape` with a pointer: write the file per `references/formats/pending-decision-bundle.md`, normalizing the caller's material into its header and point fields without changing which decision is asked or adding material. Keep `## Bundle allocation` and `## Bundle invariant` (one producer, one target per bundle). The description keeps its bounded precondition. Bump the version.
2. `resolve-pending-decisions`: add `## Inputs` (the two fixed leading items; the bundles under `.pending-decisions/`, read by header to select and in full once selected, material; `spec.md` when present, the design truth the settled point amends; the thread's `adr/` and `glossary.md`; `seed.md`). Keep `## Select a bundle`, reading only the header fields `Producer`, `Target`, `Request`, `Created`, `Points`.
3. Rewrite `## Resolution loop`: for each point, frame it live as a discussion would per `references/formats/discussion-point.md`, building the options or proposal from the point's blocker and evidence; let the user settle it; then write the outcome per `## Writing a settled point`; remove the point from the bundle; delete the bundle when no point remains.
4. Add `## Writing a settled point`: (a) append one `log.md` line with a shell append per `references/formats/log-line.md`; (b) when the answer changes the design and `spec.md` exists, amend the affected passage in place, keeping the superseded text, marking it superseded, and annotating the date and the reason; when the answer is that the code and not the spec must change, leave `spec.md` as it stands and say in chat that an implementation is the next step; (c) when the point is project-level (passes the binding test: a later thread could build against it incorrectly if not told and could not read it off the code), write or edit in place a draft ADR in `adr/` per `references/formats/adr.md`, and write a changed term to the thread's `glossary.md`, each with the user's confirmation of the text; (d) a mere clarification of which input was meant settles the point without any write. State the write boundary: `log.md` lines, `spec.md` amendments, `adr/`, `glossary.md`, and the bundle files; never `docs/adr/` or `docs/glossary.md`.
5. Rewrite `## Follow-through`: after the bundle is deleted, recommend the next action from the outcomes (re-invoke the producer, run an implementation, or nothing) and wait for the user's choice; keep the run-once rule for an accepted continuation and the rule that a newly emitted bundle is never consumed in the same run.
6. `emit-pending-review`: in `## Precondition and refusal` and `## Bundle shape`, the `Target:` line names the reviewed target as the implementation folder `implementations/<yymmddhhmm>[-<slug>]/` when the review assessed an implementation, and the thread-relative artifact path otherwise. Everything else stays. Bump the version.
7. Update the three `agents/openai.yaml` `short_description` lines if they name decision records.
8. Run both standing gates from `suite/`.

**Files modified:** `suite/skills/primitives/emit-pending-decisions/SKILL.md`, `suite/skills/primitives/emit-pending-decisions/agents/openai.yaml`, `suite/skills/capture-discussion/resolve-pending-decisions/SKILL.md`, `suite/skills/capture-discussion/resolve-pending-decisions/agents/openai.yaml`, `suite/skills/primitives/emit-pending-review/SKILL.md`, `suite/skills/primitives/emit-pending-review/agents/openai.yaml`

**Verification:**

```sh
E=suite/skills/primitives/emit-pending-decisions/SKILL.md; R=suite/skills/capture-discussion/resolve-pending-decisions/SKILL.md; V=suite/skills/primitives/emit-pending-review/SKILL.md
grep -c "decisions.md\|DR<N>\|DR[0-9]\|Suggested action\|Summary:" $E $R      # 0 for both
grep -n "references/formats/pending-decision-bundle.md" $E $R                  # both
grep -in "option\|recommendation\|discussion-point" $E                          # no output
grep -n "^## Inputs" $R                                                        # 1
grep -n ">>" $R; grep -in "editing tool\|file-editing" $R                      # present
grep -in "superseded" $R                                                       # present
grep -in "code and not the spec\|code must change\|code, not the spec" $R     # present
grep -n "adr/" $R; grep -n "glossary.md" $R                                    # present
grep -n "implementations/" $V                                                  # present
```

**Acceptance criteria:**

- `emit-pending-decisions` takes producer, target, originating request, and points (blocker, reason, evidence, optional suggestion) and writes the bundle per the format reference and nothing else (AC-10.2, AC-10.1).
- `resolve-pending-decisions` frames each point live, appends a log line, amends `spec.md` in place or leaves it when the code must change, writes or edits a draft ADR when project-level, writes glossary entries, and writes no `DR<N>` record (AC-10.3, AC-4.3, AC-2.2).
- `emit-pending-review` names the implementation folder it targets (spec `### Skill inventory`).

**Consumes:** `references/formats/pending-decision-bundle.md`, `references/formats/log-line.md`, `references/formats/adr.md` (task 2); the in-place amendment rule from task 5.

**Produces:** the `/emit-pending-decisions` caller contract every completion-oriented skill uses from here on: Producer `/<skill-name>`, Target (thread-relative path or folder), Originating request, Points each with Blocked / Why undecidable / Evidence / optional Suggestion; the `/emit-pending-review` `Target:` value `implementations/<yymmddhhmm>[-<slug>]/` for implementation reviews.
