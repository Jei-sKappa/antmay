# Task 4: Overhaul the spec skill's contract

**Objective:** Make the spec skill emit fully-settled specs: seven semantic-contract elements, a guarded degrees-of-freedom section, and the unified blocked protocol with fullest-derivable emission.

**Input / context:** Settled decisions per `seed/discussions/260715102305Z-v3-skill-review-notes-decision-log.md` P1 (unified protocol), P3 (degrees-of-freedom bar), P4 (remove Unresolved questions; fullest-derivable emission on block), P5/P7 (remove "Recording elicited decisions"), P18 (input-resolution rule), P19 (terminal outcome). The single file to edit is `skills/workflow/spec/spec/SKILL.md`. Read it fully first; the sections touched are the eight-element list, `## Acceptance guidance and degrees of freedom`, `## Lossless authoring`, the operation steps, `## Blocked under an AFK invocation`, and `## Recording elicited decisions`.

**Steps:**

1. In the semantic-contract element list, delete element 7 "Unresolved questions" and renumber: the spec has seven elements. Update every count reference in the body ("eight semantic-contract elements", "all eight elements", the operation step "Cover all eight…").
2. In `## Acceptance guidance and degrees of freedom`, add the P3 eligibility bar to the Degrees-of-freedom obligation: a listed freedom must be an implementation-level *how* where (a) every admissible choice satisfies all acceptance criteria unchanged, (b) no choice produces a user-visible behavioral difference the user would plausibly want to weigh in on, and (c) the choice is reversible later without revising the spec. Include the shorthand: if the choice would change what a reviewer checks or what the user experiences, it is not a degree of freedom — it is an unsettled decision routed per the blocked protocol.
3. In `## Lossless authoring`, replace the two legal moves with the P4 pair: (1) mark the specific a degree of freedom if it passes the eligibility bar; (2) otherwise emit a pending-decisions bundle per the blocked protocol and report the run blocked. Delete the "leave the gap as an `## Unresolved question`" leg. Add: context worth flagging that is neither intent nor freedom lives in the spec body as a stated constraint or risk note — information, not a question.
4. Replace `## Blocked under an AFK invocation` with a `## Blocked` section implementing P1: no attended/AFK detection; when a human decision is genuinely indispensable, finish everything safely derivable, hand the open decision(s) to `/emit-pending-decisions` (producer `/spec`, target `spec.md`, gathered context as evidence, the originating user request, suggested follow-up: settle the decisions, then re-invoke the spec), then stop with a concise notification whose final line is `Outcome: BLOCKED — pending decisions at <bundle path>`. Per P4: the blocked run still writes `spec.md` as complete as the settled inputs allow — every section fully elaborated, each blocked specific marked inline at its exact location pointing at the bundle. Do NOT use the word "partial"; the only permitted gaps are the marked ones tied to queued decisions.
5. Delete `## Recording elicited decisions` and every reference to it. The spec skill no longer elicits or records decisions.
6. Apply the P18 input-resolution rule to the operation steps' ask-language: a chat refusal — ending `Outcome: REFUSED — <reason>`, nothing written — only where a bundle is physically impossible (no thread exists, or which-thread is ambiguous); ambiguity about which artifact or lineage inside the resolved thread, or a garbled input, routes to the `## Blocked` section as a clarification bundle. Remove remaining "ASK the user" phrasing accordingly.
7. Apply P19 to the confirm step: the run's final line becomes `Outcome: DONE — Spec written: spec.md` (keeping the no-preamble rule; the confirmation is the reason part). With steps 4 and 6 this gives the skill exactly three terminal paths, each ending in its standard `Outcome:` line.
8. Re-read the whole file checking internal consistency: no reference to unresolved questions, eight elements, attended runs, or decision recording survives anywhere (including the drafting step and any closing checklist), and every terminal path ends with its `Outcome:` line.

**Files modified:** `skills/workflow/spec/spec/SKILL.md`

**Verification:** `grep -n -i "unresolved question\|eight\|Recording elicited\|attended\|explicitly AFK\|ASK the user" skills/workflow/spec/spec/SKILL.md` returns nothing; `grep -n "degree of freedom" skills/workflow/spec/spec/SKILL.md` shows the eligibility bar; `grep -n "## Blocked" skills/workflow/spec/spec/SKILL.md` matches; `grep -n "Outcome:" skills/workflow/spec/spec/SKILL.md` shows all three tokens (DONE, BLOCKED, REFUSED).

**Acceptance criteria:**
- The spec contract lists seven elements and no unresolved-questions concept anywhere.
- The Degrees-of-freedom section carries the three-part bar plus the reviewer/user shorthand.
- The `## Blocked` section implements bundle + fullest-derivable emission with inline gap markers, without the word "partial".
- No decision-recording section or attended-ask language remains.
- The skill has exactly three terminal paths (DONE / BLOCKED / REFUSED), each ending with the standard `Outcome:` line; refusal happens only where a bundle is physically impossible.

**Consumes:** the unified-protocol canonical text from Task 1; `/emit-pending-decisions` bundle shape (with originating request) from Task 2.

**Produces:** the blocked-protocol transformation pattern applied to `spec`, which Task 5 mirrors; the rewritten `skills/workflow/spec/spec/SKILL.md` body in the file set Task 7 sweeps.
