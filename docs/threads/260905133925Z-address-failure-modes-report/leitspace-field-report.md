# Field report: Antmay on Leitspace, 2026-08-24 to 2026-09-05

This report is written for an agent working on the Antmay repository who has not seen the Leitspace project. It records how the Antmay method behaved when used to ideate, design, plan and partially implement a real application, which failure modes appeared, what worked, and a set of non-binding suggestions. Its purpose is to make the failure modes clear and inspectable. The suggestions are hypotheses for a discussion, not decisions.

Every claim below points at a file you can open. Two evidence mirrors sit next to this report:

- `temp/mirrors/leitspace/` — a copy of the Leitspace repository's `docs/threads/`, `AGENTS.md` and `FLUTTER.md` as of 2026-09-05. Gitignored workspaces (`.implementation-runs/`, `.pending-decisions/`, `.pending-reviews/`) are omitted. The Leitspace source code and design assets are not included; the report describes them where needed.
- `temp/mirrors/skills/` — a copy of `mattpocock/skills` (HEAD `3cca18b`, 2026-09-04), an independent and widely used skill set. It is used in section 4 as an outside comparison: a second opinion on the same problem, not a template to copy.

Paths written as `leitspace:…` are relative to `temp/mirrors/leitspace/`. Paths written as `skills:…` are relative to `temp/mirrors/skills/`. Paths without a prefix are relative to the Antmay repository root.

Abbreviations used throughout: `CB<N>` is a roadmap child brief; `DR<N>` is a thread-local decision record in that thread's `decisions.md`; `FBK<N>` is a record in a Roadmap thread's `roadmap-feedback.md`. "CB1 DR13" means decision 13 of the thread materialized from brief CB1. "Finished" in the table below means the work was delivered; whether `finish` was invoked is not recorded in the mirror.

---

## 1. Context

### 1.1 The project

Leitspace is a mobile learning app: an infinite vertical feed of flashcards (the "Home" feed) plus a personal library with a spaced-repetition practice queue. Flutter client, Supabase backend, a design-system package with a Widgetbook catalog. Solo developer. Closed alpha target.

### 1.2 How Antmay was used

Ten threads exist under `leitspace:docs/threads/`. In order:

| Thread | Recipe / origin | State on 2026-09-05 |
| --- | --- | --- |
| `260824084235Z-foundation` | Standard (discussion → spec) | Finished. 27 decisions, a 410-line spec. Not archived. |
| `260829203812Z-design-implementation-widgetbook` | Standard | Finished. Implemented the design system from design frames. Not archived. |
| `260830130109Z-implementation-roadmap` | Roadmap | Finished (children materialized). 11 decisions, 7 child briefs, 7 feedback records. Not archived. |
| `260830142633Z-01-data-model-backend-foundation` | Standard (child CB1) | Implemented. 31 decisions, 335-line spec, report. Not archived. |
| `260830142633Z-02-app-shell-auth` | Standard (child CB2) | Implemented. 25 decisions, 343-line spec, report. Not archived. |
| `260830142633Z-03-library-sets` | child CB3 | Seed only, plus a hand-written addendum (see 2.2). Active. |
| `260830142633Z-04…07` | children CB4–CB7 | Seed only, as materialized. |

Between the foundation thread and the roadmap thread, the author produced the visual design outside the thread system (in `assets/design/`, not mirrored). The design changed product scope relative to the foundation spec: it added in-app authoring and a profile/following surface the spec had deferred, removed concepts the spec had (a topic-proposal mechanism, "loose cards" in the library), and shipped private non-public sets the spec had deferred, with no draft state.

### 1.3 Timeline compression

Thirteen days from first thread to this report, across roughly 83 commits. Most of the drift described below appeared within two child threads, which is what makes it worth reporting: the method did not slowly decay, it went stale within one hop.

---

## 2. Failure modes

Each entry has the same four parts: what was observed, where to see it, which Antmay rule or skill is implicated, and a root-cause hypothesis. The hypothesis is kept separate from the observation so it can be disagreed with without losing the observation.

### 2.1 The current truth has no home, so it leaked into four places

**Observed.** By the time the third child thread (CB3) opened, an agent needing to know "how does saving work in this product" had four candidate sources that disagreed:

1. The foundation spec (`leitspace:docs/threads/260824084235Z-foundation/spec.md`), 410 lines, whose scope section still says "v1 is deliberately single-author and consumption-only." Its supersession is a single sentence appended at line 410: *"Update 2026-08-29: I just finished the design, and it's possible that some decisions in this spec may differ. From now on, however, the source of truth is the design."*
2. The roadmap (`leitspace:docs/threads/260830130109Z-implementation-roadmap/roadmap.md`), whose CB3 brief (line 88 onward) describes "saved sets with progress plus loose cards" and a "loose-card→set promotion offer", a whole-set save concept CB1 briefly modelled as a `saved_sets` table (its DR8, DR12) before DR13 removed it.
3. The CB1 decision log (`leitspace:docs/threads/260830142633Z-01-data-model-backend-foundation/decisions.md`), whose DR13 removed the `saved_sets` table and the loose-card concept entirely, and whose DR14 reversed its own DR12.
4. Leitspace's `AGENTS.md` (`leitspace:AGENTS.md`), whose section 4 (lines 312–487) carries the backend's cascade conventions, FK stances, privilege model, the `SECURITY DEFINER` budget and storage path contracts.

**Where to see it.** Open the four files above. Compare roadmap.md lines 88–105 with CB1 decisions.md DR13 (line 99 onward).

**Implicated.** `docs/thread-model.md` § "Historical artifacts versus living documentation". It names a second container ("living project documentation") and makes updating it part of implementation, but the method ships no skill dedicated to it, no artifact shape for it, and no read-order rule pointing agents at it. Roadmap recipe § "The descendant feedback loop".

**Hypothesis.** Antmay has exactly one durable-truth container, the thread, and threads are by definition historical. When the truth changes, it has nowhere to go except into another thread (historical again) or into `AGENTS.md`, which is always-loaded agent memory and the wrong place for domain semantics. Leitspace's `AGENTS.md` grew to 498 lines because it was the only living document the method left available.

### 2.2 Roadmap briefs were wrong before the second child opened, and the feedback channel is write-only in practice

**Observed.** The roadmap materialized seven child briefs on 2026-08-30. CB1 alone produced six feedback records (FBK1–FBK6) and CB2 a seventh. FBK3 removes the loose-card concept, the loose-card→set promotion offer and any whole-set save state that the CB3 brief's Outcome and In-scope lines rest on; FBK4 adds four RPC and pagination contracts the brief does not mention; FBK7 changes a shared constraint (localization) every remaining child inherits. Nothing updated the briefs. When CB3 was about to open, the author wrote a 115-line "Addendum" into its `seed.md` restating the feedback and the CB1 decisions as "settled facts", then listing the open questions the brief could no longer answer.

**Where to see it.**
- `leitspace:docs/threads/260830130109Z-implementation-roadmap/roadmap-feedback.md`: FBK1–FBK7, each a prose patch against a brief that was never patched.
- `leitspace:docs/threads/260830142633Z-03-library-sets/seed.md`: line 3, *"Read the Addendum first. The brief below was written before CB1 landed the schema…"*; the addendum runs from line 17 to the end (131 lines total for a seed).
- Leitspace's git history (not in the mirror) also shows two later records, FBK8 and FBK9, added in commit `6b1435d` and retired in commit `aa85a65` three commits later. Both commits are CB2's own (`docs(02-app-shell-auth)`), so CB2 retired its own two records in its closing pass; the reason is not in the mirror. The append-only channel was edited in practice.

**Implicated.**
- `docs/thread-model.md` § "Seed": *"`seed.md` is written once, when the thread opens, by the thread-opening operation alone."* Violated deliberately, because it was the only place the next thread's agent would look.
- Roadmap recipe § "The descendant feedback loop", paragraph "Consuming feedback": *"Before a future child begins its work, its preflight reads … the relevant `roadmap-feedback.md` records."* No child-side skill implements this: `suite/skills/spec/spec/SKILL.md` and `suite/skills/capture-discussion/discussion/SKILL.md` contain no mention of a parent, of feedback, or of living documentation. The three `implement*` skills reference `roadmap-descendant-feedback.md` only for writing feedback. The one reader is `whats-next` (`suite/skills/finish-navigate/whats-next/SKILL.md` line 81), which lists unapplied records as a suggestion rather than applying them.
- Roadmap recipe § opening paragraph: the roadmap *"tracks no child status, aggregates no progress … and never becomes a coordinator."* This is philosophically clean and is exactly what leaves seven unapplied patches beside a frozen contract.

**Hypothesis.** A feedback record is a diff a reader must mentally rebase onto a document nobody updates. Agents handle that badly, and humans handle it by writing the rebased version by hand, which is what the CB3 addendum is. Writing all child briefs up front guarantees this: the briefs encode assumptions the first child will invalidate. When a method's user has to break two of its rules (write-once seed, append-only feedback) to make the next step work, the method is missing a concept, not a rule.

### 2.3 Agents cannot tell historical from authoritative, because nothing mechanical marks the difference

**Observed.** No Leitspace thread has ever been archived. All ten sit under `docs/threads/` as "active or unfinished" per the thread model, including the foundation spec whose supersession note is at its last line. Leitspace's `AGENTS.md` § 5 tries to compensate in prose: *"Only the active thread is authoritative. All other threads are historical documents."* That rule is false in practice: CB3 cannot proceed without CB1's DR13, DR16 and DR17, which live in a "historical" thread and are the truth about the shipped schema.

**Where to see it.** `leitspace:AGENTS.md` lines 488–498. `ls leitspace:docs/threads/` (no `archive/`). The cross-thread identifiers throughout `leitspace:docs/threads/260830142633Z-03-library-sets/seed.md` ("CB1 DR13", "FBK3", "CB2 DR12", and "the parent's `decisions.md`: DR2, DR7, DR9").

**Implicated.**
- `docs/thread-model.md` § "Archive lifecycle" makes archiving "the explicit act that ends a thread's active lifecycle"; `docs/recipes/roadmap.md` line 60 calls it "optional housekeeping" and `suite/skills/finish-navigate/finish/SKILL.md` line 71 offers it as "the normal optional next action". In practice optional means never.
- Antmay's own root `AGENTS.md` § "Document only durable, properly scoped information": *"Every thread numbers its decisions from `DR1`, so a bare `DR<N>` in code or in living documentation names nothing a future reader can resolve."* Leitspace's threads are full of exactly these references, because thread-local numbering is the only stable identifier the method provides for a decision.

**Hypothesis.** "Historical" is a vibe, not a property an agent can check. Agents follow path conventions and first-line banners; they do not infer authority from context. The method offers one mechanical marker (the archive path) and makes it optional, and offers no stable cross-thread identifier for a decision, so every reference to a past decision is either fragile or restated.

### 2.4 Artifacts restate each other, and the reconcile family exists to fight that

**Observed.** In CB1, the spec restates the decisions (its § "Constraints", line 186, lists DR2, DR9, DR11, DR13–DR17 at line 195), the plan restates the spec, and the roadmap restates nine parent decisions in its § "Shared constraints" while each of the seven briefs re-gists a subset in a one-line "Relevant shared constraints" list. When DR13 changed the save model, the same meaning had to change in the roadmap brief, the CB3 seed, the CB1 spec, and later the design frames. Only some of those were updated.

**Where to see it.** `leitspace:docs/threads/260830130109Z-implementation-roadmap/roadmap.md` § "Shared constraints" (line 31) and each brief's "Relevant shared constraints". `leitspace:docs/threads/260830142633Z-01-data-model-backend-foundation/spec.md` line 195.

**Implicated.** `reconcile-spec`, `reconcile-plan`, `reconcile-roadmap`, `reconcile-proposal`. Each exists to bring a copy back in line with its source.

**Hypothesis.** The method produces N expressions of one meaning and then ships skills to keep them aligned. The reconcile skills also repair drift after a human edits the source, so they are not pure waste; but a spec that cited decisions instead of re-expressing them would leave them far less to do.

### 2.5 The design became a source of truth by footnote, with no artifact of its own

**Observed.** The visual design was produced between two threads, outside the method. It changed scope. Its authority was established by one sentence at the end of the foundation spec and later by roadmap DR1. Design divergences discovered during implementation were recorded per thread in `design-discrepancies.md` files (the design thread's is 1,739 lines; CB2's is 409), which are themselves historical and thread-local.

**Where to see it.** `leitspace:docs/threads/260824084235Z-foundation/spec.md` line 410. `leitspace:docs/threads/260830130109Z-implementation-roadmap/decisions.md` DR1. `leitspace:docs/threads/260829203812Z-design-implementation-widgetbook/design-discrepancies.md`.

**Implicated.** Nothing in the method, which is the point. The method has no place for a non-thread artifact that becomes authoritative, and no place for a project-level log of divergences from it.

**Hypothesis.** Same root cause as 2.1. Anything that outlives a thread has no home.

---

## 3. What worked and should survive any fix

An agent handed only the failures above will over-correct. These parts produced good outcomes and should be treated as constraints on the fix, not casualties of it.

- **`decisions.md` catching every settled decision.** CB1's log (`leitspace:docs/threads/260830142633Z-01-data-model-backend-foundation/decisions.md`) is 31 records with context, decision and rationale each. It is the best artifact in the project. It is thread-local; section 5 argues some of its records belong at project level. Compare section 4.2 below: the outside reference loses most decisions to the conversation, and its users call that their most substantive complaint.
- **Superseding records rather than rewrites.** DR14 reversing DR12, DR15 partially superseding DR5, all visible with rationale. The outside reference has no guidance for this case.
- **Seed → decisions → spec → strict plan → implementation report per thread.** CB1 and CB2 both delivered coherent, well-reasoned implementations from this chain.
- **Pending-decisions and pending-reviews.** The queue for irreducible human judgment, and the read-only review with a findings bundle. No equivalent exists in the outside reference.
- **Preflight refusals and the terminal-outcome protocol.**
- **The CLI's unattended path.** The outside reference has no unattended executor; its "AFK" is a ticket type worked by an agent inside a session.

Our reading is that the problem sits entirely at the cross-thread, cross-time layer, and that the fix is an addition of one concept and a redistribution of others, not a rebuild. The discussion may conclude otherwise.

---

## 4. Outside reference: how `mattpocock/skills` handles the same problem

`temp/mirrors/skills/` is a clone of a widely used, independently designed skill set. It is included because it answers the exact question in section 2 with a design decision Antmay did not make, and because its own docs pages are unusually honest about where that decision fails. Read it as a second opinion. Quotes below are from its `docs/` pages and skill files.

### 4.1 Its answer: two tiers, and the second tier is garbage by construction

| Tier | Artifacts | Lifetime | Location |
| --- | --- | --- | --- |
| Durable truth | `CONTEXT.md` (glossary), `docs/adr/` | Forever | The repository |
| Process residue | specs, tickets, wayfinder maps, research notes, handoffs | Until the work ships | The issue tracker or a `.scratch/` folder, not main-branch truth |

- `skills:docs/engineering/to-spec.md`, § "Do I keep the spec frozen…": *"Nothing keeps it in sync, so in practice it is a snapshot of what you knew at that moment, and it goes stale the first time implementation teaches you something. Treat it as throwaway once the work ships. The artifacts meant to outlive it are your `CONTEXT.md` and your ADRs."*
- `skills:docs/engineering/research.md` line 41, quoting a user: *"ADRs yes. Everything else archive or delete after done. It otherwise becomes cruft of work and can poison future repo reads if you've drifted away from the spec/research."*
- `skills:docs/engineering/wayfinder.md`, § "Do I have to use GitHub Issues?": local markdown *"puts the artifacts in your repo, which is not recommended: storing this material in the repo tends to lead to accidental persistence."* That sentence describes `docs/threads/` in Leitspace.

Three further design points map directly onto section 2:

- **Fog of war** (`skills:skills/engineering/wayfinder/SKILL.md` § "Fog of war"). The planning skill refuses to chart what it cannot yet see. Later work stays as a coarse "Not yet specified" note and graduates into a ticket only when the frontier reaches it. Their docs record the failure this prevents, from a user: *"I charted 27 tickets, and by the time I got to the thirteenth, the rest no longer made sense."* This is failure mode 2.2. Their mitigation: scope a map to one bounded epic, never "implement V1", and prototype aggressively.
- **The map is an index, not a store** (same file, § "The Map"): *"a decision lives in exactly one place, its ticket, so the map never restates it, only gists it and links."* This is the inverse of failure mode 2.4.
- **`AGENTS.md` is for navigation pointers** (`skills:skills/in-progress/retro/SKILL.md` § "Files"): *"used incredibly sparingly, usually only for navigation pointers to other files."* Compare failure mode 2.1, item 4.
- **Setup writes a read-order rule.** `skills:skills/engineering/setup-matt-pocock-skills/domain.md` tells every downstream skill to read `CONTEXT.md` and the relevant ADRs before exploring, and to flag ADR conflicts explicitly. Antmay has no equivalent instruction anywhere in `suite/`.

### 4.2 Where it is weaker, and Antmay is right

Its own pages admit these. They argue against adopting it wholesale.

- **Decisions evaporate.** The ADR gate is three simultaneous conditions (hard to reverse, surprising without context, real trade-off), so *"most sessions produce none."* `skills:docs/engineering/grill-with-docs.md`, § "Where did all my other decisions go?": *"Into the conversation only. This is the most substantive open complaint about the skill."* Antmay's `decisions.md` does not have this problem.
- **Reversing a closed decision has no guidance.** `skills:docs/engineering/wayfinder.md`, § "A decision I already closed turned out to be wrong": *"There is no official guidance, and the agent's instinct is unhelpful: it tends to design around the bad decision rather than challenge it."* Antmay's superseding-record rule is a real answer they lack.
- **ADRs are edited in place.** Their own `skills:.agents/adr/0002-ship-as-a-claude-code-plugin.md` has an "Update, 2026-08-05" section appended. That works for two ADRs; it does not scale to a log an agent must trust.
- **No queue for irreducible human judgment, no read-only review bundle, no unattended executor.** `skills:skills/engineering/implement/SKILL.md` has a five-sentence body and trusts the session.
- **Agents write code mid-planning.** `skills:docs/engineering/wayfinder.md`, § "My agent started writing production code…": *"The most-reported failure with this skill, and there is a real hole behind it."* Antmay's write-authority rules prevent this.

### 4.3 One critique its writing guide would make of Antmay

`skills:skills/productivity/writing-for-agents/SKILL.md` § "Pruning": *"Keep each meaning in a single source of truth: one authoritative place, so changing the behaviour is a one-place edit. Duplication … costs maintenance and tokens."* Applied to Antmay: the entire `reconcile-*` family exists to fight duplication the method itself creates (failure mode 2.4).

---

## 5. Suggestions

Non-binding. Each names the failure modes it addresses so that one addressing none can be dropped without argument. They are ordered by how much of section 2 each one covers.

1. **Add a project-level durable layer the method owns, and make threads deltas against it.** (2.1, 2.3, 2.5) Two artifacts: a glossary (`CONTEXT.md` or equivalent) and a global ADR log (`docs/adr/` or equivalent) with stable global numbers, a status, and supersedes/superseded-by links. Living docs by domain area where a project has them. A thread's spec cites this layer and adds only what is new to the change.

2. **Two decision kinds, decided at recording time.** (2.1, 2.3) Keep `decisions.md` catching everything, as now. When a decision passes the three-gate test (hard to reverse, surprising without context, a real trade-off), the skill that records it also writes it as a global ADR and makes the thread record a one-line pointer to it. Cross-thread references then cite stable ADR numbers instead of `CB1 DR13`. Supersession stays append-only at the ADR level. Roughly half of Leitspace's CB1 decisions would qualify (the cascade convention DR7, library-first saving DR13, retroactive privatization DR16, the definer-gated profile shelf DR14, `anon` reads nothing DR25); the rest are thread-local and stay so.

3. **Roadmap becomes an index that stays open, with lazy children.** (2.2, 2.4) Destination, notes, decisions-so-far as one-line pointers, not-yet-specified, out-of-scope. No full child briefs up front: a one-paragraph sketch per child at most. A child thread is opened when the frontier reaches it, seeded fresh against the durable layer as it stands then. The CB3 addendum is what this looks like when done by hand. This changes the recipe's stance that a Roadmap thread finishes at materialization.

4. **Consider retiring `roadmap-feedback.md` once suggestion 1 exists.** (2.2) A parent-level discovery becomes an ADR that supersedes or amends an earlier one, plus a one-line update to the roadmap index. It has a stable address and a status. Nothing has to be mentally rebased. The `append-roadmap-feedback` primitive and the `roadmap-descendant-feedback.md` shared reference go with it.

5. **Make historical versus authoritative mechanical.** (2.3) Three cheap moves: `finish` archives by default rather than optionally; `finish` stamps a status banner at the top of every finished artifact pointing at the ADRs and living docs that replaced it; every reading skill (`spec`, `discussion`, `plan-*`, `implement*`, `review-*`) carries an explicit read order: durable layer first, active thread second, other threads only when cited.

6. **Specs and roadmaps point, they do not restate.** (2.4) A spec cites the ADRs and glossary terms it rests on. A roadmap brief cites the shared constraints by ADR number instead of copying the list. This removes most of what `reconcile-spec` and `reconcile-roadmap` exist to do; whether those skills survive in reduced form is a question for the discussion.

7. **`AGENTS.md` guidance: rules and pointers only.** (2.1) The method's documentation should say explicitly that project domain semantics belong in the durable layer, and that a project's `AGENTS.md` gives the read order and points at it. Antmay's own root `AGENTS.md` already follows this for itself; the method does not yet tell projects to.

Two suggestions considered and not made: moving thread artifacts out of the repository into an issue tracker (the outside reference's stance) would break Antmay's PR-reviewability and the CLI's file-based pipeline; and gating every decision on the three-gate test (also the outside reference's stance) would reproduce their "decisions evaporate" failure.

---

## 6. Open questions for the discussion

1. Where does the durable layer live, and who owns its shape: the method (fixed paths every skill knows) or the project (a setup step records the paths, as the outside reference does)?
2. Does the roadmap thread stay open until its destination is reached, or does it stay "done at materialization" with the index maintained by whoever opens the next child?
3. Which of `reconcile-spec` / `reconcile-roadmap` survive once artifacts cite rather than restate?
4. Is the three-gate ADR test the right promotion criterion, or should promotion be a human call at `finish`?
5. How does the CLI's pipeline interact with a durable layer that a stage may write to (an ADR during `spec`, for example), given its per-stage Git boundaries?
6. Does a non-thread authoritative artifact (a design, a data model diagram) get a place in the durable layer, or does it register through an ADR that names it?
