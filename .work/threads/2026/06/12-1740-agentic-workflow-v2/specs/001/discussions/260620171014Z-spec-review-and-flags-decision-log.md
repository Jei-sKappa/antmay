# Decision log: resolving the V2 spec's lossless-mapping review and owner flags

Interactive discussion loop (deprecated `discussion-loop` format, the maintainer's
preferred format) between the maintainer and the agent, settling everything that
gates approval of the Workflow V2 build spec: the 3 lossless-mapping review gaps
and the 10 owner-review flags the spec surfaced.

- Target: `specs/001/spec.md` (Workflow V2 in-repo build contract; version 1, Draft)
- Disposes: `specs/001/reviews/260620162523Z-spec-lossless-mapping-review.md` (gaps LM-G1…LM-G3)
- Settles: the spec's §7 owner flags F-1…F-10
- Thread: `docs/threads/260612174045Z-agentic-workflow-v2/`
- On each decision the Draft spec is revised in place (P8: pre-approval Draft edits
  need no per-edit record beyond this log); when the loop closes, the spec is bumped
  to version 2 and the lossless review is disposed (`disposition: accepted`).

---

## P1: Doc-set scope — nine `docs/workflow/v2/` docs, or the proposal's literal two? (settles F-10a)

Point: The spec says deliverable A is nine reference docs under `docs/workflow/v2/`, but proposal §16 literally named only two ("a filename-grammar successor … and an immutability/lifecycle doc"). Decide whether to confirm the broader nine-doc set or hold closer to the literal two.

What you need to know: §16 item 2 says codify as `docs/workflow/v2/`, which "includes a filename-grammar successor … and an immutability/lifecycle doc" — "includes" (not "consists of") reads as non-exhaustive. The V1 reference set (`docs/workflow/v1/`) is itself a 4-doc set (README, thread-layout, filename-grammar, immutability), so the precedent is already multi-doc. V2 has more rules than V1 (tiers, tracker, spine, discussions, reviews, ledger, frontmatter contract); the spec's nine docs are README, thread-layout, filename-grammar, lifecycle, tiers, tracker-integration, spine, discussions, reviews. The spec already makes the decomposition a Degree of Freedom (§5 #2): the implementer may merge/split docs provided every rule has a home and every cross-reference resolves — so "nine" is a normative default, not a hard count. The lossless review confirmed this is a declared scope interpretation (flag F-10a), not smuggled.

Choice: A — confirm the nine-doc set.

Rationale: "Includes" is non-exhaustive language; the V1 precedent is already a multi-doc ruleset; folding the whole V2 ruleset into two docs would overload them and hurt readability/maintenance. Because decomposition is already a DoF, confirming nine does not lock the implementer — they can still merge/split as long as coverage holds. The literal-two reading (option B) optimizes for proposal wording at the cost of usability; a middle merge (C) is exactly the judgment better left to the DoF than pinned now.

---

## P2: Lifecycle-ledger filename — keep `lifecycle.md` or rename to `ledger.md`? (settles F-1)

Point: The spec pins the per-thread lifecycle ledger's filename as `lifecycle.md` at the thread root, but that basename collides with the V2 rules doc `docs/workflow/v2/lifecycle.md` (FR-D4). Decide whether to keep it or rename the per-thread ledger to `ledger.md`.

What you need to know: The per-thread ledger is the append-only tier/disposition event file at each thread root (this thread created one, currently `lifecycle.md`) — it is per-thread data. The rules doc `docs/workflow/v2/lifecycle.md` (FR-D4) is the documentation page defining lifecycle/immutability/the ledger. Under the current pin, "lifecycle.md" names both — a per-thread data file and a global rules doc — which is ambiguous in greps, search, and skill instructions. Skills hardcode the name (`finish` appends to it, `whats-next` reads it — FR-S13/S14), so it should be pinned now. The spec flagged this (F-1) and offered `ledger.md`. Rename cost is small: this thread's committed `lifecycle.md` → `ledger.md` plus a few spec references (AC-D4.18/19, FR-S13/S14), pre-approval.

Choice: A — rename the per-thread ledger to `ledger.md`; the rules doc keeps `lifecycle.md`.

Rationale: The shared basename is a permanent clarity hazard — a global rules doc and a per-thread data file under the same name bites every future reader and every skill that references "the ledger file." "ledger" is precise and accurate; the rename is trivial and pre-approval; and it frees `lifecycle.md` to mean exactly one thing. Keeping `lifecycle.md` (B) only avoids touching the file we just made, not worth a lasting ambiguity. Applies at loop close: rename this thread's `lifecycle.md` → `ledger.md` and update the spec references.

---

## P3: Skill version-bump level — MAJOR cutover or honest per-skill semver? (settles F-9)

Point: Every skill whose body changes under V2 gets its `metadata.version` bumped. The spec pins a MINOR floor (AC-S0.2) but flags (F-9) that MAJOR is defensible. Choose a bump policy.

What you need to know: Semver — MAJOR = breaking, MINOR = additive, PATCH = fix. These skills are installed individually (`npx skills add … --skill <name>`); "breaking" for a skill = its output/behavior contract changes such that an installer of the old one is surprised, which V2 does across the spine (new lineage-folder output paths, frontmatter latches, inbox removed, derived status, plan output changes). Skills are versioned independently — no suite-wide version; most baselines are `1.x`; a MAJOR cutover is `2.0.0`. A skill whose body does not change is not bumped (AC-S0.2). Options weighed: A per-skill honest semver (MAJOR for contract changes, MINOR additive, none if unchanged); B blanket `2.0.0` for everything V2 touches; C MINOR floor for all (the spec's pin).

Choice: A — per-skill honest semver.

Rationale: It is what semver is for and respects that the skills are installed independently — a user pulling just one skill should see its version reflect its own change. In practice A lands most spine skills at `2.0.0` anyway (their contracts genuinely break), giving the generational signal where it is true without B's imprecision of stamping `2.0.0` on a barely-changed skill; C undersells a real breaking cutover. The implementer applies the rule per-skill rather than hand-assigning each number.

---

## P4: The new lossless-mapping review skill — name + interactive variant? (settles F-4)

Point: The spec creates the lossless-mapping review as a new skill, pinned as a pair (`review-lossless-mapping-auto` + `review-lossless-mapping-interactive`); the proposal said "the lossless-mapping review" (singular). Decide the name and whether it is a pair or auto-only.

What you need to know: The check (§10/P9) is a verification that produces a two-list report — (a) decisions/assumptions in the doc not accepted in the sources, (b) source decisions the doc dropped. The whole `review/` family ships `-auto`/`-interactive` pairs. But this review was just run as a one-shot (the fresh-session prompt = effectively `-auto`) and worked cleanly, with its findings flowing into a separate discussion loop. Name candidates: `review-lossless-mapping` (matches `review-<dimension>`) vs vaguer `review-fidelity`/`review-mapping`. Variant options: A keep the pair (family consistency; interactive could resolve "decision vs prose" ambiguity live); B auto-only (the check is a one-shot report; discussion of findings is a separate loop, so an interactive variant largely duplicates that loop).

Choice: name `review-lossless-mapping`; variant B — auto-only.

Rationale: The lossless-mapping review is fundamentally a produce-the-report verification (proven as a one-shot `-auto`); the human-judgment part lands naturally in the follow-on discussion loop, so an interactive variant would mostly re-implement the loop. Auto-only is leaner (one fewer SKILL.md). The cost is a visible exception to the "every review has a pair" pattern — accepted, since not every operation needs both modes. The name matches the review-dimension family. This also seeds the broader direction recorded in P5.

---

## P5: Variant rationalization recorded as a postponed future direction (new — maintainer-raised)

Point: The maintainer observes that `-interactive` variants are largely equivalent to discussion-loop → auto (their actual workflow: never `spec-interactive`/`plan-interactive`; instead a discussion loop to clarify a proposal, then `*-auto` from the proposal + decision log), and the future skillrouter tool (CLI, flag-differentiated single skills) will unify variants. They want this recorded and postponed — not acted on now — with current work kept aligned.

What you need to know: Same family as the already-deferred skillrouter unification (spec §6), but with a sharper insight: interactive variants may be conceptually redundant with discussion-loop + auto, not merely collapsible behind a flag. P6 already kept all variants for this release; the current spec keeps them as independent skills with minimal investment, and future unification is additive tooling over them, so nothing built now blocks it. P4-B already moved toward the direction (new review skill is auto-only).

Choice: Adopt, with the stronger alignment guardrail. (1) No variant changes now. (2) Record the direction as a postponed, future-release item in spec §6, naming both the "interactive ≈ discussion-loop + auto" redundancy and the skillrouter flag-unification, with the maintainer's discussion-loop-first workflow as motivating evidence. (3) Stronger guardrail: NEW skills default to auto-only unless an interactive mode is genuinely distinct from discussion-loop + auto.

Rationale: Matches the maintainer's real workflow and prevents further investment in the interactive/auto split while keeping variants for this release. The stronger guardrail (chosen over a soft note) makes new skills default to the leaner shape the maintainer actually uses; both current new skills (`review-lossless-mapping` auto-only, `seed-capture` single) already satisfy it, so there is no current conflict — only the guardrail to record. Applies at loop close: extend spec §6 + add the guardrail (FR-S0 / the relevant skill-authoring rule).

---

## P6: The `capture-inbox` replacement — decomposition into two skills, and their names (settles F-5; expands proposal §14)

Point: This began as a naming question — proposal §14 named one replacement skill, "seed-capture"; the agent had suggested "capture-seed" — and grew, over a long sub-conversation, into a decomposition question: how many skills should replace `capture-inbox`, what should each do, and what are they called? The maintainer's instinct was that a single "capture" skill conflated several genuinely-different operations.

What you need to know:

**The capability being replaced.** `capture-inbox` (V1) wrote inbox items. V2 deleted the inbox (§5/P2); its residual job — capturing tangential items mid-work so they are not lost — was reassigned to "seeds of future threads (or tickets in the real tracker)." Proposal §14 expressed the replacement as one skill ("seed-capture") that "writes a seed for a new/future thread, or a tracker ticket." The spec realized that as FR-S15 (a single `seed-capture` skill).

**The concept space the maintainer surfaced.** An idea-becoming-work seemed to involve several operations: (i) open a local thread from a brand-new idea (write the thread folder + seed + ledger); (ii) open a local thread from an idea that already exists as a ticket (write the thread, linked to the ticket); (iii) create a remote tracker ticket from a brand-new idea; and a hypothesized (iv) save an idea locally as a lightweight "local ticket" without opening a thread. These overlap heavily, which made both the count and the naming hard. The maintainer proposed three separate skills now (to be unified later by the skillrouter flag tool, per P5/P6-plan-family), and wondered whether it was really four, or whether the whole thing was being overcomplicated. An external expert opinion was solicited in parallel (a consult-the-expert message); this decision was taken without waiting for it.

**The clarifications that collapsed the space (the crux — keep these):**

- **Opening a thread IS recording the idea locally.** Writing the seed is not "create an idea, then open a thread" as two steps — the seed simultaneously IS the recorded idea AND the thread's genesis, one act. A brand-new thread containing only a seed simply *is* "a saved idea not yet worked." So operation (i) thread-from-new-idea and the hypothesized (iv) save-idea-locally are the **same operation**.
- **The hypothesized 4th is the deleted inbox.** A local "saved idea that is not a thread" is exactly what the inbox was; V2 removed it (§5/P2) and made a future thread's seed the local representation of an idea. Reintroducing a separate local-idea store would resurrect the inbox — so there is no 4th.
- **(i) thread-from-idea and (ii) thread-from-ticket are the same OUTPUT operation** (both produce a local thread + seed); they differ only in the seed's *input* — where the trigger and `External:` come from (the maintainer's idea, vs an existing ticket whose title/body seed the trigger and whose URL becomes `External:`). That is an input *mode*, not a separate skill. Precedent: the existing `plan-*` and `spec-*` skills already accept "a raw idea OR a GitHub-issue URL" as input forms within one skill — so splitting by input form here would make this skill more granular than the rest of the suite, for no benefit.
- **The one genuinely-separate operation is (iii) creating a REMOTE ticket:** its output lives in a different system (the tracker), with a different dependency (the tracker's CLI/API — so the prerequisite-preflight rule LM-G1 applies: check the tool exists, fail cleanly if not), and it brushes §8's "the workflow stays out of the tracker" (one-time creation is not the ongoing *sync* §8 forbids, and §14 sanctions "writes a tracker ticket", so it is allowed — but it is the only skill that touches the tracker).

Choice: **TWO skills replace `capture-inbox`.**

1. **`open-thread`** — opens a local thread (writes the thread folder + seed + ledger). Input is either a brand-new idea (`External: none` or user-supplied) OR an existing ticket (the ticket seeds the trigger; its URL becomes `External:`). This single skill subsumes thread-from-idea, thread-from-ticket, and the hypothesized save-idea-locally.
2. **`open-ticket`** — creates a remote tracker ticket from a brand-new idea. The genuinely-separate operation (remote output, tracker dependency + preflight, the only tracker-touching skill).

No third skill, no fourth. Both are single auto-style skills (no `-interactive` variants), consistent with the P5 guardrail. (This supersedes P5's "`seed-capture` single" reference: the replacement is now two skills, both still single/auto-only, so P5's guardrail point still holds.)

Rationale:

**Why two — and not four, three, or one:**

- *Not four:* the 4th (save a local idea that is not a thread) is the deleted inbox (§5/P2); the seed already is the lightweight local record.
- *Not three:* the three-skill cut split `open-thread` by input form (idea vs ticket) into two near-twin skills producing the identical artifact — granularity the rest of the suite does not have (plan/spec take idea-or-issue-URL within one skill), so it earns nothing now and the skillrouter would just merge it back.
- *Not one:* bundling local thread-creation and remote ticket-creation into one skill conflates a filesystem write with a tracker-API write — different dependencies, the §8 boundary, the preflight requirement on only the ticket path. Two skills keep each concern and dependency clean.

**Why these names:**

- `open-thread` + `open-ticket` is a clean parallel pair — the two things you can "open" for a new piece of work: local (a thread) or remote (a ticket). Outcome-named and input-agnostic.
- **Discarded name candidates:** "seed-capture" (the proposal's informal §14 phrasing, not a naming decree); "capture-seed" (carries the inbox "capture" heritage and mirrors `capture-inbox`, but "capture a seed" is elliptical — you capture an idea, not a seed — and it leans toward park-for-later); "plant-seed" (evocative seed→grow→thread metaphor, neutral on now/later, the agent's lead for a while — but it reads awkwardly once the skill ALSO takes a ticket as input: "plant a seed from a ticket" is strained, while "open a thread from a ticket" reads fine); "new-thread" (adjective-first, off the suite's verb-first imperative pattern). **Decisive factor:** once `open-thread` handles BOTH the new-idea and the existing-ticket inputs, an outcome-name (thread) beats an artifact/metaphor name (seed), because the seed-metaphor only fits the fresh-idea half.

**How the two compose in practice (recorded so the workflow is clear later):**

- Solo / no ticket: `open-thread` alone (`External: none`).
- Backlog now, work later: `open-ticket` now → `open-thread` from that ticket later (separated in time).
- Ticket already exists: `open-thread` from it.
- Ticket required AND starting now: `open-ticket`, then `open-thread` from the just-created ticket — two invocations, by design (two genuinely-different writes, remote then local).
- The clean ordering is **ticket-first** (or pre-existing), because the thread's seed bakes its `External:` link in at creation and the seed is a frozen record; opening a thread first and bolting a ticket on later would mean amending a frozen seed (the messy direction). The two-skill design nudges toward the clean order.

**Rejected sub-options:**

- *Bundling ticket-creation into `open-thread`* (so "ticket + thread in one shot" is one skill): re-merges the concern just separated and drags the tracker dependency + preflight into the otherwise-purely-local thread skill. Rejected — if "ticket + thread at once" proves frequent, fuse it later via a skillrouter flag, not by bloating the local skill now.
- *Deferring `open-ticket` entirely* (ship only `open-thread`; create tickets via the tracker's own tooling like `gh issue create`): a defensible minimal version, most faithful to "the workflow stays out of the tracker." Kept `open-ticket` instead because §14 sanctions it and it completes the team capture flow; recorded as the fallback if tracker-touching is later judged out of place.

**Future-tool alignment (skillrouter):** the two skills map cleanly onto a later single `open` skill with `--local`/`--remote` (thread vs ticket) and `--from-ticket` (the input mode) flags; two-now → one-later is the natural collapse, and nothing here boxes that in.

**Spec revisions required (at loop close):**

- FR-S15 (the single `seed-capture` skill) is **replaced by TWO skills**: `open-thread` (local; idea-or-ticket input; writes seed + ledger) and `open-ticket` (remote; creates a tracker ticket; preflight per LM-G1). `capture-inbox` still moves to `skills/deprecated/`.
- Repo upkeep (FR-R) updates for two new skill names instead of one: README entries, `.claude-plugin/marketplace.json` (capture-discussion group), `.vscode/settings.json` scopes.
- Record as a **conscious expansion of proposal §14** (one skill → two, plus the thread-from-ticket input mode and the create-ticket-as-its-own-skill split) — the same kind of spec-level structural decision as the nine-doc scope (P1); it realizes and extends §14's capability without contradicting the frozen proposal, with the thread-from-ticket input mode operationalizing §8's ticket↔thread bridge.
- Settles **F-5** (the original seed-capture naming flag) — superseded by this decomposition.

Note: the external expert opinion (consult-the-expert) had not arrived when this was decided; the spec is Draft, so if the expert surfaces something material the decision can be revisited in place.

---

## P7: Add a "V2 Workflow Conventions" pointer to `AGENTS.md`? (settles F-10b)

Point: The spec's FR-R4 offers an optional `AGENTS.md` addition — a "V2 Workflow Conventions" section pointing to `docs/workflow/v2/`, mirroring the existing V1 pointer. The proposal does not mandate it. Decide whether to add it.

What you need to know: `AGENTS.md` today has a "V1 Workflow Conventions" section that points to `docs/workflow/v1/` (a pointer, not a duplication of the rules) and says to read it before writing any workflow artifact. With V2, the active convention for new threads becomes `docs/workflow/v2/`, while V1 threads are grandfathered (§16/P21). So the clean update is not "a V2 section equal-and-alongside V1" but an active-ruleset switch: V2 governs new work; V1 stays as the grandfathered reference. It is a pointer (no rule duplication), low-stakes, and an implementation-phase action (added once `docs/workflow/v2/` exists).

Choice: Add it — a "V2 Workflow Conventions" pointer to `docs/workflow/v2/` marking V2 the active ruleset for new threads, with one line noting V1 remains the grandfathered reference for pre-V2 threads. FR-R4 becomes a required edit, not optional.

Rationale: Mirrors the existing V1 pointer pattern (pointer, not duplication); makes V2 discoverable as the current convention; the only downside of skipping it is an `AGENTS.md` that keeps pointing only at V1 after V2 ships, which would mislead an agent about which ruleset governs a new thread.

---

## P8: The three lossless-mapping gaps — fixes and placement (disposes LM-G1, LM-G2, LM-G3)

Point: The lossless-mapping review found three in-scope source decisions the spec failed to capture. These are losslessness fixes to apply, not open decisions; only the placement of each needs confirming.

What you need to know + fix:
- **LM-G1 — prerequisite-preflight rule (§13):** a skill needing a binary or sibling skill checks availability first and fails cleanly. Fix: a cross-cutting skill rule (FR-S0) + documented as a §13 practice in `tiers.md` (FR-D5). `open-ticket` (P6) is its first concrete application (needs the tracker CLI).
- **LM-G2 — tracker backlink + commit/PR reference (§8):** §8's tracker bridge also includes the ticket getting one permalink comment back to the thread, and commits/PRs referencing the ticket; AC-D6.3 dropped both. Fix: extend `tracker-integration.md` (FR-D6) with ACs for both, and have the backlink posted by `open-thread` (when it links a ticket) and/or `finish`.
- **LM-G3 — deferred spec-creation-UX-orchestration (§13):** an explicitly deferred §13 item missing from the spec's §6 out-of-scope. Fix: one line in spec §6.

Choice: Apply all three with the placements above.

Rationale: Pure losslessness restoration against the proposal — no design change. Placements are minor and confirmed: LM-G1 connects to the now-concrete `open-ticket` dependency; LM-G2 lands in the tracker doc + the linking skills; LM-G3 is a one-line out-of-scope addition. Folded into the spec revision at loop close.

---

## P9: The five sensible-default flags — confirmed, with F-8 refined (settles F-2, F-3, F-6, F-7, F-8)

Point: The spec's remaining five flags — pinned defaults and clarifications. Four are clean confirmations; F-8 took a substantive refinement.

What you need to know + Choice:

- **F-3 — re-`deferred` permitted.** A deferred thread may take another `deferred` line (reason update) without a `resumed` first; pinned to what the §4 guard already allows. *Confirmed.*
- **F-6 — `whats-next` gains the derived-status-reader behavior now; the standalone CLI/materialized projection is deferred** (§5 "buys nothing today"). *Confirmed.*
- **F-7 — clarification, no action.** The decision-log P5 reference to "update past logs on explicit request (v1.3.0)" describes the *deprecated* `discussion-loop` (v1.5.0), not the active `discussion` (v1.0.2); the spec encodes the *rule* (records immutable-by-default + marked owner correction) in the active `discussion`/`seeded-discussion`; the deprecated skill stays out of scope. *Acknowledged.*
- **F-2 — defer the freeze-guard *tooling* (eyes-open).** The spec documents the guard's rules (FR-D4.13–15); building the pre-commit-hook/CI tooling is out of scope for this build (it is neither a doc nor a skill, §16 items 2–3). *Consequence recorded:* until the guard is built, V2's immutability/freeze is **convention-enforced only** — nothing mechanically stops a confused agent editing a frozen artifact. Consistent with the "build the mechanism when the pain is real" posture (P10 deferred the PR-CI gate the same way); the rules are fully specified so the guard is buildable anytime. *Confirmed, deferred.*
- **F-8 — frontmatter status model: a `status:` map, not a single value (REFINED).** The maintainer questioned the flat latch fields (`approved`/`rejected`/`implemented`/`disposed`), thinking them mutually exclusive. Correction established: they are **event latches** (the P7 event-sourcing model), not competing states — a spec carries *both* `approved` (stamp X) and `implemented` (stamp Y) on completion, by design, with the current condition **derived by precedence** (`implemented` > `approved` > open-review > draft, AC-D4.4); and `disposed`/`rejected` are artifact-type-scoped (review / proposal), so cross-type mixing cannot occur. So there was no real ambiguity, and `whats-next` is never confused (it applies the precedence rule). **Two fixes weighed:** a single `status` *value* (rejected — it loses the intermediate timestamps, e.g. *when* a spec was approved once it's implemented, and it materializes the derived condition, violating P7's derive-don't-store); a `status` *map* of event→timestamp (**chosen**). The frontmatter contract becomes a tidy two keys — `version` (identity) + `status:` (the lifecycle event map, e.g. `status: { approved: <stamp>, implemented: <stamp> }`; review `status: { disposed: <stamp>, disposition: accepted }`; proposal one terminal of `approved`|`rejected`). The condition is always derived from `status`, never stored flat. This refines AC-D4.11 (latches move from loose top-level keys into a `status:` map) and keeps AC-D4.4's derivation as the single source of "current condition." Exact YAML shape stays the §15 field-syntax DoF.

Rationale: F-2/F-3/F-6/F-7 are sensible defaults consistent with prior decisions (the P10 defer posture, the §4 guard, the §5 deferral, P5/P7). F-8's map model preserves event-sourcing and the audit timestamps while serving least-astonishment (a `status` block visibly reads as a set of events, not a contradictory multi-state) — beating both the single-value form (lossy, materializes derived state) and the loose top-level keys (less clearly grouped, and what prompted the maintainer's confusion).

---

## Loop complete

P1–P9 settle every spec owner-flag and the three lossless-mapping gaps:

- F-1 → P2 (ledger filename → `ledger.md`); F-10a → P1 (nine-doc scope); F-9 → P3 (per-skill honest semver); F-4 → P4 (`review-lossless-mapping`, auto-only); F-5 → P6 (decomposition supersedes the naming); F-10b → P7 (AGENTS.md V2 pointer); F-2/F-3/F-6/F-7/F-8 → P9. Plus the maintainer-raised P5 (variant rationalization, postponed + auto-only guardrail) and P8 (LM-G1/G2/G3 gap-fixes).

Next, to reach an approved spec: revise the Draft spec in place per this log → bump to `version: 2` → rename this thread's `lifecycle.md` → `ledger.md` (P2) → dispose this thread's lossless review (`status: { disposed: <stamp>, disposition: accepted, rationale: <this log> }`, dogfooding the F-8 map form) → the owner sets the spec's `approved` latch → implementation.

Pending: the external expert opinion (consult-the-expert, sent during P6) had not arrived; the spec is Draft, so anything material it surfaces can be reconciled in place before approval.

---

## SR-P10 — Post-approval amendment: FR-R5 (README/AGENTS V2-ification) + the GSD-removal chore

Recorded after the loop closed and the spec was Approved (and Phases 1–2 + Phase-3's FR-R landed). This is the **first real use of the post-approval amendment mechanism** (§9 outcome-3 + §4) — dogfooded.

**The gap (surfaced at Phase-3 verification).** FR-R1–R4 covered the skill-index *mechanics* (README entries, marketplace, scopes, the V2 pointer) but **under-scoped the repo docs' workflow-overview prose**. After Phase 3, the repo was still V1-stale in four places: the `README.md` opener ("anchored by the Modular Agentic Workflow **V1**"), the "Toolbox Model" + "Layered Workflow Map" (still listing an **inbox** module / `capture-inbox` / `inbox/{open,processed,dropped}/`), the ~11 propose/spec/plan/implement README entries (still "the active **V1** thread's `proposals/`", "**v1** spec/plan"), the `AGENTS.md` **Layout block** (still `capture-inbox` under `capture-discussion`, missing the three new skills), and the `the-fool`/`verify` README notes (citing retired V1 `D…` IDs). A V2 release cannot ship a README whose first line says "Workflow V1" and which describes the deleted inbox.

**Decision (owner-approved).** This is the §9 outcome-3 case — the build surfaced spec incompleteness, which fixes the **spec**. Per §4, the Approved-not-Implemented spec is amended via an owner-approved, record-backed amendment (this entry is the record):

- Added **FR-R5** (AC-R5.1–R5.4) covering the README overview prose, the per-entry V1/v1 references, the AGENTS Layout block, and the `the-fool`/`verify` notes; added the §2.3 coverage row.
- The spec **stays Approved** (an amendment does not un-approve it). **Version stays 2** — an amendment is not a new review→revise cycle; it is recorded here and in FR-R5's parenthetical.
- FR-R5 is implemented in a follow-on cleanup handoff, verified against its ACs (then `version` is unaffected; finish later sets `implemented`).

**Separate chore — NOT a V2 deliverable, recorded for traceability.** The maintainer also directed removal of the retired GSD apparatus (no longer used): the GSD-generated `AGENTS.md` sections (`## Project` → EOF — Project, Constraints, Technology Stack, Conventions, Architecture, Project Skills, GSD Workflow Enforcement, Developer Profile) and `git rm -r .planning/` (74 tracked files). This is repo cleanup, **not** part of the V2 spec — it has no FR/AC. It is done alongside the FR-R5 cleanup in the same handoff (both touch `AGENTS.md`) but committed separately as a `chore:`.
