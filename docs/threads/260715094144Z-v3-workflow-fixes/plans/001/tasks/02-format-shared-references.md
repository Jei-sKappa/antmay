# Task 2: Create the format shared references and dissolve the discussion-point primitive

**Objective:** Move the discussion-point structure and the decision-record shape into canonical shared references, rewire their three consumers, and remove the `discussion-point` primitive.

**Input / context:** Settled decisions per `seed/discussions/260715102305Z-v3-skill-review-notes-decision-log.md` P1 (bundle gains originating request; resolution-time routing), P5 (as revised), P7 (formats as shared references; primitive dissolved), P10 (format amendments). Read `skills/workflow/primitives/discussion-point/SKILL.md`, `skills/workflow/capture-discussion/discussion/SKILL.md`, `skills/workflow/capture-discussion/resolve-pending-decisions/SKILL.md`, and `skills/workflow/primitives/emit-pending-decisions/SKILL.md` before editing. The removal of the primitive folder is explicitly user-decided (P7) — it is not an agent-initiated deletion.

**Steps:**

1. Create `shared/references/formats/discussion-point.md`: the canonical discussion-point structure, derived from the current primitive's "Point structure" and "Discipline" sections, with the P10 amendments baked in:
   - Creative options are lettered (A/B/C…), phrased in the soft style: "present concrete lettered options, each with real pros and cons" — no shouted MUST.
   - Recommendation is creative-mode-only: the reasoned pick among the lettered options with its principal trade-off, keeping the "if no option is genuinely preferable, say so" clause.
   - Practical mode explicitly has no Recommendation element: the Proposed solution is stated once with its reasoning inline; state this in the format so authors don't re-add it out of template instinct.
   - Keep the facts-vs-decisions discipline and the one-point-at-a-time framing as format discipline; drop the primitive's caller-refusal machinery (it belonged to the skill, not the format).
2. Create `shared/references/formats/decision-record.md`: the canonical `D<N>` record, taken from the full variant in `discussion` (record template + the 5-bullet Field rules), including as part of the format definition: sequential numbering (scan `decisions.md` for the highest existing `D<N>`, use the next integer), append-only records, supersession by appending a new record naming the superseded one, and the "create `decisions.md` with a short heading if somehow absent" edge.
3. Add to `shared/manifest.yaml`: `skills/workflow/capture-discussion/discussion` → both format files; `skills/workflow/capture-discussion/resolve-pending-decisions` → both format files; `skills/workflow/primitives/emit-pending-decisions` → `formats/discussion-point.md` only. Keep the map strictly flat.
4. Run `node scripts/sync-shared-references.mjs` and confirm the three `references/shared/` folders were generated.
5. Rewire `discussion/SKILL.md`: replace the inline "Recording decisions" format block and Field rules with a naturally-worded pointer to `references/shared/formats/decision-record.md`; replace any inline point-structure duplication with a pointer to `references/shared/formats/discussion-point.md`. Domain judgment (what was decided, decision-grade, supersession calls) stays in the skill body.
6. Rewire `resolve-pending-decisions/SKILL.md`: same two pointer replacements; additionally add the P1 resolution-time routing — a resolved answer that settles genuine new intent is recorded as a `D<N>` record per the format reference; an answer that merely repairs the originating request is not recorded as a decision. Its queue-consumption behavior (remove settled points, delete the exhausted bundle) stays exactly as is (P14's sole exception).
7. Rewire `emit-pending-decisions/SKILL.md`: replace the `/discussion-point` invocation ("using `/discussion-point`'s emission mode") with writing each point per `references/shared/formats/discussion-point.md`; add the originating user request to the bundle's routing header fields per P1 so a clarification is answerable from the file alone.
8. Remove `skills/workflow/primitives/discussion-point/` entirely (user-decided per P7).
9. Update the registries: remove `./skills/workflow/primitives/discussion-point` from the `JeisKappa-primitives` plugin in `.claude-plugin/marketplace.json`; remove the `discussion-point` section/link from `README.md`; remove `discussion-point` from `conventionalCommits.scopes` in `.vscode/settings.json`.

**Files modified:** `shared/references/formats/discussion-point.md` (NEW), `shared/references/formats/decision-record.md` (NEW), `shared/manifest.yaml`, `skills/workflow/capture-discussion/discussion/SKILL.md`, `skills/workflow/capture-discussion/discussion/references/shared/` (GENERATED), `skills/workflow/capture-discussion/resolve-pending-decisions/SKILL.md`, `skills/workflow/capture-discussion/resolve-pending-decisions/references/shared/` (GENERATED), `skills/workflow/primitives/emit-pending-decisions/SKILL.md`, `skills/workflow/primitives/emit-pending-decisions/references/shared/` (GENERATED), `skills/workflow/primitives/discussion-point/` (DELETED), `.claude-plugin/marketplace.json`, `README.md`, `.vscode/settings.json`

**Verification:** `test ! -d skills/workflow/primitives/discussion-point` succeeds; `grep -rn "discussion-point" .claude-plugin/marketplace.json README.md .vscode/settings.json` returns nothing; `grep -rln "/discussion-point" skills/workflow --include=SKILL.md` returns nothing; `test -f skills/workflow/primitives/emit-pending-decisions/references/shared/formats/discussion-point.md` succeeds; `grep -n "pros and cons" shared/references/formats/discussion-point.md` matches; `grep -c "Field rules" skills/workflow/capture-discussion/discussion/SKILL.md` returns 0.

**Acceptance criteria:**
- Both canonical format files exist under `shared/references/formats/` and carry the P10 amendments (lettered options with pros/cons, creative-only Recommendation, no practical-mode Recommendation).
- The three consumer skills reference the generated copies and carry no inline duplicate of either format.
- `emit-pending-decisions`'s bundle header includes the originating user request.
- `resolve-pending-decisions` routes clarification vs decision at resolution time.
- The `discussion-point` primitive no longer exists anywhere: folder, marketplace, README, commit scopes, prose invocations.

**Consumes:** the format-vs-discipline razor and unified-protocol text written by Task 1 (`docs/project/v3/skill-authoring.md`).

**Produces:** `shared/references/formats/discussion-point.md` and `shared/references/formats/decision-record.md` (canonical), plus generated `references/shared/formats/` copies inside `discussion`, `resolve-pending-decisions`, and `emit-pending-decisions`.
