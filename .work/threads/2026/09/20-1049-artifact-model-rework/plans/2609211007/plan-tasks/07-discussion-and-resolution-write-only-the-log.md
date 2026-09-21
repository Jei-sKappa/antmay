### Task 7: Discussion and resolution write only the log

**Objective:** Make `discussion` and `resolve-pending-decisions` write exactly one thing, lines appended to `log.md`, and align `open-thread` and `open-ticket` with the new thread layout.

**Input / context:** `spec.md` `## Skills whose roles change` (rows `discussion`, `resolve-pending-decisions`, `open-thread`/`open-ticket`), `### The change document` ("A point settled after the change document exists is appended to the log only; its record or delta lands through a change amendment"; "A term the discussion introduces, changes or retires is a `decision` log line stating the term and its meaning"), `## Inferences` (direct-request bypass kept: the user may ask for any delta document directly, and the change authoring drafts it). Thread glossary rows **change document**, **delta**, **decision test**. Current bodies of the four skills; `suite/authoring/interaction-posture.md` (dialogue-driven posture: no terminal outcome, no pending decision). Starts from tasks 5 and 6 (`/change` exists; formats declared).

**Steps:**

1. Rewrite `suite/skills/capture-discussion/discussion/SKILL.md` where its role changes: the description becomes "Interview the user to settle decisions into the thread's log."; the opening paragraph names one durable output, the one-line entries appended to `log.md`, and says the change document and every delta document are written afterwards from what the discussion settles. In `## Peer framing`, the last bullet stops at the log line carrying the rejected alternative (drop the ADR clause); replace "the thread's ADRs" with "the log". In `## Forks and inferences`, `spec.md` becomes `change.md`. In `## Inputs`, the thread-file items become: `seed.md`; `log.md` (read once at session start); `change.md`, when the file exists — the change document; `delta/`, when present — the thread's delta of the project layer as it stands, which inside the thread takes precedence over the project records. In `## Procedure`, step 3 classifies a conflict as `/consult-decisions` instructs; step 5 stays; step 6 becomes: when the settled point fixes a term — introduces, changes or retires one — the log line is a `decision` line stating the term and its meaning, and when the user asks for a delta document directly, the request is recorded as a `decision` line naming the document asked for, because drafting belongs to the change authoring; step 7 unchanged. Remove `## Binding test and drafts` entirely and replace it with a short `## What you write` paragraph: you write exactly one thing, lines appended to `log.md`; nothing else you touch is written — `change.md`, `delta/`, the project layer and the roadmap index are read here and never written. In `## Finish`, drop the step naming draft ADRs and glossary entries, and point the user at `log.md` alone.
2. Rewrite `suite/skills/capture-discussion/resolve-pending-decisions/SKILL.md` where its role changes: the opening paragraph says outcomes are written into the thread's memory, the log; `## Inputs` thread items become `change.md`, when the file exists, and `delta/`, when present (read so the framing knows what the design already pins), plus `seed.md`; in `## Writing a settled point`, keep the clarification rule and the "append the log line first" step, replace steps 2 and 3 with one paragraph: the log line is the whole write — a point that changes the design, fixes a term or earns a record reaches `change.md` and `delta/` through the change authoring's amendment pass, which the follow-through recommends; the write boundary sentence names exactly lines appended to `log.md` and the bundle files under `.pending-decisions/`, with `change.md`, `delta/` and the project layer read and never written. In `## Follow-through`, the recommended actions become: re-invoking `/change` so the amendment pass carries the settled points into the change document and its delta documents; re-invoking the producer the bundle named; running an implementation when the code must change; or nothing.
3. In `suite/skills/capture-discussion/open-thread/SKILL.md`, confirm the `## Inputs` block from task 3 stands, and in `## What you write` name the project layer as read and never written (`docs/adr/`, `docs/pdr/`, `docs/product/`, `docs/architecture/`, `docs/glossary.md`, the roadmap index); the seed and its composition are unchanged.
4. In `suite/skills/capture-discussion/open-ticket/SKILL.md`, update the third paragraph's read-only list to the same project-layer paths; nothing else changes.
5. In `suite/shared/manifest.yaml`: set `skills/capture-discussion/discussion` to `formats/discussion-point.md`, `formats/log-line.md`, `formats/roadmap-index.md`, `instructions/append-log-line.md`; set `skills/capture-discussion/resolve-pending-decisions` to `formats/discussion-point.md`, `formats/log-line.md`, `formats/pending-decision-bundle.md`, `instructions/append-log-line.md`, `instructions/emit-pending-decisions.md`.
6. Delete the orphaned copies by hand: `suite/skills/capture-discussion/discussion/references/formats/decision-record.md`, `.../discussion/references/formats/glossary.md`, `suite/skills/capture-discussion/resolve-pending-decisions/references/formats/decision-record.md`, `.../resolve-pending-decisions/references/formats/glossary.md`.
7. In `README.md`, update the `discussion` entry ("… leaves one log line per settled point.") and the `resolve-pending-decisions` entry ("… leaves each answer written into the thread's log, and leaves the exhausted bundle deleted.").
8. From `suite/`, run the sync script and both checks.

**Files modified:** `suite/skills/capture-discussion/discussion/SKILL.md`, `suite/skills/capture-discussion/discussion/agents/openai.yaml` (only if the short description names records), `suite/skills/capture-discussion/discussion/references/formats/decision-record.md` (DELETED), `suite/skills/capture-discussion/discussion/references/formats/glossary.md` (DELETED), `suite/skills/capture-discussion/resolve-pending-decisions/SKILL.md`, `suite/skills/capture-discussion/resolve-pending-decisions/references/formats/decision-record.md` (DELETED), `suite/skills/capture-discussion/resolve-pending-decisions/references/formats/glossary.md` (DELETED), `suite/skills/capture-discussion/open-thread/SKILL.md`, `suite/skills/capture-discussion/open-ticket/SKILL.md`, `suite/shared/manifest.yaml`, `README.md`.

**Verification:**

```sh
grep -q 'exactly one thing' suite/skills/capture-discussion/discussion/SKILL.md && grep -q -i 'term and its meaning\|the term and its meaning\|stating the term' suite/skills/capture-discussion/discussion/SKILL.md
! grep -n -E 'binding test|`adr/`|thread.s `glossary.md`|spec\.md|draft ADR|Binding test' suite/skills/capture-discussion/discussion/SKILL.md
! grep -n -E 'Amend `spec.md`|spec\.md|`adr/`|thread.s `glossary.md`|binding test' suite/skills/capture-discussion/resolve-pending-decisions/SKILL.md
grep -q '/change' suite/skills/capture-discussion/resolve-pending-decisions/SKILL.md
! grep -n -E 'Outcome:|DONE|BLOCKED|REFUSED' suite/skills/capture-discussion/discussion/SKILL.md
! test -e suite/skills/capture-discussion/discussion/references/formats/decision-record.md && ! test -e suite/skills/capture-discussion/discussion/references/formats/glossary.md && ! test -e suite/skills/capture-discussion/resolve-pending-decisions/references/formats/decision-record.md && ! test -e suite/skills/capture-discussion/resolve-pending-decisions/references/formats/glossary.md
grep -q 'docs/pdr/' suite/skills/capture-discussion/open-thread/SKILL.md && grep -q 'docs/pdr/' suite/skills/capture-discussion/open-ticket/SKILL.md
(cd suite && node scripts/sync-shared-references.mjs && node scripts/check-marketplace-skills.mjs && node scripts/check-skill-text.mjs)
git diff --quiet fe83a4f -- cli/ && git diff --quiet fe83a4f -- docs/glossary.md
```

Read the four bodies once against the dead-concept test: no sentence's only referent is the removed drafting behaviour.

**Acceptance criteria:**

- `discussion` and `resolve-pending-decisions` each list `log.md` as their only written thread file; neither creates `delta/`, a record or a glossary entry, and neither declares the decision-record or glossary format.
- `discussion` states that a settled term is recorded as a `decision` log line naming term and meaning, and that a directly requested delta document is recorded as a `decision` line for the change authoring to draft.
- `resolve-pending-decisions` recommends re-invoking `/change` for a point that changes the design.
- `open-thread` and `open-ticket` carry the read order from task 3 and name the whole project layer as read and never written.
- The sync script and both suite checks exit 0; nothing under `cli/` or in `docs/glossary.md` differs from the baseline.

**Consumes:** `/change` (task 5); the `## Inputs` opening block (task 3); the closing-event and `event` example in `formats/log-line.md` (task 4).

**Produces:** none
