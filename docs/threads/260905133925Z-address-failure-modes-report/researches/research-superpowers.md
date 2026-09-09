# Research: `obra/superpowers` (Jesse Vincent) — design → plan → implement chain

**Summary.** Superpowers runs a deliberately thin, two-artifact chain: a *design spec*
(`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`) written **once, at the end of the
brainstorming conversation**, and an *implementation plan*
(`docs/superpowers/plans/YYYY-MM-DD-<feature>.md`) written from it in the **same session**.
There is no decision log, no reconcile step, no thread folder, no glossary, no ADR layer, and
no lifecycle marker on either artifact — the plan's `- [ ]` checkboxes are essentially never
checked off in the maintainer's own repo, and shipped specs still say `**Status:** Draft`.
What the design *does* invest in is the execution layer: a plan-scoped, git-ignored,
**disposable** ledger and per-task brief/report/diff files that carry state across subagents
and context compaction, and are then deleted, leaving git history as the record. The
maintainer has twice removed cross-artifact verification machinery after measuring it —
subagent spec/plan review loops were cut in v5.0.6 for doubling runtime with no quality gain
— and has instead attacked drift by making the plan **cite** the spec (`Spec:` pointer,
v6.3.0) rather than restate it. For Antmay, the transferable ideas are: one durable design
document per unit of work written from the conversation rather than maintained during it; a
citation-plus-verbatim-constants relationship between plan and spec instead of a re-derivation;
a mechanically-extracted task brief so no human or agent re-authors requirements; and a
disposable run ledger. The mechanism to *avoid* copying is their handling of finished
artifacts, which is the field report's failure mode (3) in its purest form.

## Artifacts and lifetimes

| Artifact | Location | Created | Authority | Lifetime / end state |
| --- | --- | --- | --- | --- |
| Design spec | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`, committed | Architectural path only, **after** the in-chat design is approved | "The spec is the binding authority" during execution | Never marked done; `Status:` header frozen at whatever it said when written — though several are amended in place long after shipping |
| Implementation plan | `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`, committed | From the spec, same session | "The plan is the spec's argument"; conflicts resolve *against* the spec | Checkboxes essentially never updated; file lives forever |
| Task brief | `.superpowers/sdd/<plan-basename>/task-N-brief.md`, git-ignored | Per task, by `scripts/task-brief` (mechanical `awk` extraction) | Sole source of requirements for the implementer | Deleted with the workspace |
| Implementer report | same dir, `task-N-report.md` | Per task | Persistent memory across implementer resumes | Deleted with the workspace |
| Review package (diff) | same dir | Per review | Reviewer's whole view of the change | Deleted with the workspace |
| Progress ledger | same dir, `progress.md` | Per plan | Recovery map after compaction; `Task <N>: complete` is the done marker | **Deleted** when the final review is clean |
| Eval / outcome results | `docs/superpowers/specs/…-eval-results.md`, committed (one instance) | Ad hoc, after the work | Evidence for a decision, back-pointing via a `Spec:` field | Permanent, never re-read |
| "Rulings I made" list | chat message only | End of run | The only place autonomous decisions reach the human | Ephemeral |
| Project-level layer | — | — | — | **Does not exist** |

## Artifact model

The chain is gated by a classifier, not by subject. `skills/brainstorming/SKILL.md` splits every
request into **spike** ("No design doc, no spec file"), **bounded** ("No spec file, no
implementation plan document" — a short design presented *in chat* and approved), and
**architectural**, the only path that produces files. Ceremony scales; the approval gate does not
("What scales with simplicity is the artifact, never the approval"). Added in v6.3.0 (#2063) —
so two of three paths produce **no durable artifact at all**.

Nothing is eager. The architectural checklist creates the spec at step 6, after clarifying
questions, 2–3 approaches with trade-offs, and a sectioned design approved section by section in
chat; the plan follows at step 9. Everything under `.superpowers/sdd/<plan-basename>/` is created
lazily by scripts at dispatch time and destroyed at the end.

## Decision capture

**There is no decision log, and the skill never asks for one.** `brainstorming/SKILL.md`
tells the agent what the design must *cover* — "architecture, components, data flow, error
handling, testing" — and nothing about recording who decided what or why. The conversation is
the only place decisions land until the design doc is written at the end, in one shot, from
the agent's own context.

The maintainer's own specs partially work around this by hand, which is itself evidence:
of the 19 files in `docs/superpowers/specs/`, only three carry any decisions section —
`2026-07-15-sdd-fix-loop-redesign-design.md` (`## Design Decisions`, a `# | Decision |
Rationale` table, one row reading "Jesse's call"), `2026-07-30-codex-efficiency-fixes-design.md`
(`## Scope decisions (settled with Jesse)`), and `docs/superpowers/plans/2026-06-09-visual-companion-issues.md`
(`## Scope decisions (Jesse, 2026-06-09)`). Exactly **one of nineteen** specs contains the word
"Rationale". Rationale is, structurally, discarded.

Reversal is handled by editing the document in place and re-running the inline self-review.
No skill mentions supersession (`grep -ri "supersede"` over `skills/` returns nothing) — but the
maintainer's own specs invent one, and it is the most transferable thing in the repository.
`2026-06-09-sdd-task-scoped-review-dispatch-design.md:31` reverses a design decision **in place,
by strikethrough plus annotation**:

> ~~**The two review stages stay separate.** … No merging.~~ **Superseded by the cost iterations
> below**: live eval economics showed per-dispatch overhead dominating cost … The per-task stages
> are now one task reviewer with two verdicts …

and the same file carries a dated `## Cost iterations (post-launch eval economics)` section
written back into the design doc *after* the work shipped, with measured numbers per iteration.
The design document is therefore not a snapshot at all: it is a living document for its unit of
work, amended in place, where a reversed decision stays visible with its replacement and its
reason on one line. That is append-only's auditability at rewrite-in-place's read cost, and it is
achieved by editing text rather than by a log discipline. A second instance is the
`2026-06-10-strict-cost-sdd-design.md` "experiment ladder" spec, **amended six times after
authoring** with outcomes written back into the rungs (`Status 2026-06-11 (final): DIED AT THE
GATES, as pre-registered`), and `2026-04-06-worktree-rototill-design.md:299` carries a
post-implementation note ("This risk materialized during implementation…"). That is a
pre-registration pattern — write the bet and its kill criteria, then write the outcome into the
same paragraph. **None of this is instructed by any skill**; it is the maintainer's hand-editing
habit filling the exact gap the skills leave, which is itself the strongest signal in the
repository that a design doc wants to be amendable rather than frozen.

Design-doc-to-plan relationship: the design doc is the plan's argument source, cited by path
in the plan header and read again at execution setup.

## Spec ↔ plan derivation and session boundaries

Same session, no fresh context. `brainstorming`'s terminal state is explicit: "the ONLY skill
you invoke after brainstorming is writing-plans." `writing-plans` then writes the plan with a
mandatory header containing a `**Spec:** [path to the spec/design doc this plan implements —
the plan argues from the spec, so the spec travels with it; executors read both]` field and a
`## Global Constraints` section holding "The spec's project-wide requirements … **with exact
values copied verbatim from the spec**".

There is **no reconcile step**. The only verification is `writing-plans`' three-item inline
self-review — spec coverage, placeholder scan, type consistency — explicitly marked "This is a
checklist you run yourself — not a subagent dispatch," and non-iterative: "If you find issues,
fix them inline. No need to re-review — just fix and move on." Heavier machinery existed and was
measured out (v5.0.6; see Known failure modes). Its orphaned reviewer templates
(`skills/brainstorming/spec-document-reviewer-prompt.md`,
`skills/writing-plans/plan-document-reviewer-prompt.md`) both carry a **Calibration** section
telling the reviewer to "Approve unless there are serious gaps" — the opposite polarity to
Antmay's `reconcile-spec`, which strips anything it cannot trace to a decision.

Session boundaries are handled at the *execution* layer only. `subagent-driven-development`
(SDD) states flatly: "Conversation memory does not survive compaction. In real sessions,
controllers that lost their place have re-dispatched entire completed task sequences — the
single most expensive failure observed. Track progress in a ledger file, not only in todos."
The ledger's first line names its plan; `Task <N>: complete` is the resume marker; "After
compaction, trust the ledger and `git log` over your own recollection." Fresh subagents never
inherit session history — "A dispatch prompt describes one task, not the session's history …
a real session's dispatch hit 42k chars of which 99% was pasted history." The shared state
between controller and subagent is always a **file path**, never pasted text.

## Historical versus authoritative

This is superpowers' weakest area, and the evidence is in its own repository.

- No skill instructs anyone to check off a plan checkbox, archive a plan, or update a spec's
  status after shipping. `grep` across `skills/` finds "mark complete" only in reference to
  the harness *todo list* and the *ledger*.
- Of the 15 files in `docs/superpowers/plans/`, **none is fully checked off**: 13 carry only
  unchecked boxes (21 to 77 each), one (`2026-05-06-lift-drill-into-evals.md`) has 5 checked of
  100, and one is a catalog with no boxes.
- Spec `Status:` headers are frozen at authoring time.
  `2026-04-06-worktree-rototill-design.md` still reads `**Status:** Draft` although it shipped
  in v5.1.0 and was later patched (`d00f4ad`). Two visual-companion specs still read
  `**Status:** Draft for Drew review`.
- The only thing that *is* reliably destroyed is the ephemeral layer: "When the final
  whole-branch review is clean and its fixes are merged, delete this plan's workspace … the git
  history is the record now."

So a later agent reading `docs/superpowers/plans/` sees fifteen plans of unchecked boxes with no
way to tell which shipped. The only mitigations are accidental (date-prefixed filenames, the
`Spec:` pointer). The maintainer's *deliberate* response to an adjacent staleness incident is
telling: when a follow-up plan adopted a previous plan's ledger as its own progress, the fix was
to make identity **structural** — a directory per plan, the plan named on the ledger's first
line — not to add a status field to anything.

## Project-level durable layer

None. `find` for `*glossary*`, `*adr*`, `*decision*` outside `.git` returns nothing; the repo's
`CLAUDE.md` (symlink to `AGENTS.md`) is pure contributor policy. No skill in the chain instructs
updating a README, changelog, or architecture doc as part of implementation — the only
documentation guidance in `writing-plans` is to fold "documentation steps into the task whose
deliverable needs them." Cross-session persistence comes solely from the `SessionStart` hook,
which injects `using-superpowers/SKILL.md` on `startup|clear|compact`: process memory, not
project memory. Project truth is code, tests, and git history. Several users have asked for more
(#1643, #1616, #1238) — see Known failure modes for how those were answered.

## Large-effort decomposition

Explicitly **lazy**, and stated in one sentence in `brainstorming/SKILL.md`: "If the project is
too large for a single spec, help the user decompose into sub-projects: what are the
independent pieces, how do they relate, what order should they be built? Then brainstorm **the
first sub-project** through the normal design flow. Each sub-project gets its own spec → plan →
implementation cycle." No child briefs are written up front — only a named ordering, held in
chat. `writing-plans`' Scope Check is a second net: "If the spec covers multiple independent
subsystems … suggest breaking this into separate plans — one per subsystem."

Because nothing downstream is written before it is needed, the field report's failure mode (4)
— child briefs going stale after the first child ships — cannot occur. The cost is that the
ordering and inter-piece relationships live nowhere durable. In practice the maintainer chains
by hand: `2026-06-10-visual-companion-auth-hardening` → `2026-06-11-visual-companion-final-hardening-fixup`,
with the later spec's title being its only link to the earlier one.

## Duplication

One decision is re-expressed roughly **three to four times** before code, and only one of those
hops is a re-authoring:

1. Conversation → design spec (re-authored, at the end, by the agent that held the dialogue).
2. Spec → plan: a *citation* (`Spec:` path) plus a *verbatim copy* of project-wide constants
   into `## Global Constraints`, plus per-task steps that embody the design as literal code
   blocks.
3. Plan → task brief: **mechanical**. `scripts/task-brief PLAN_FILE N` is a 12-line `awk`
   program that slices the task's heading-to-heading text into a file. Nothing is re-worded and
   nothing passes through the controller's context: "Exact values (numbers, magic strings,
   signatures, test cases) appear only in the brief. Never make a subagent read the whole plan
   file."
4. Brief + Global Constraints → reviewer prompt: the constraints block is copied verbatim a
   second time, as "its attention lens."

The controlling rule is stated once and applied everywhere: "Everything you paste into a
dispatch prompt — and everything a subagent prints back — stays resident in your context …
Hand artifacts over as files." Duplication is minimized by making the *transport* mechanical,
not by making the artifacts fewer.

## Known failure modes

Sources: `RELEASE-NOTES.md` and the specs (maintainer-authored), the issue tracker, and Jesse
Vincent's blog. Repo has no GitHub Discussions; everything is issues/PRs.

**Spec↔plan drift is the single most-reported problem, and it is open.**
[#921](https://github.com/obra/superpowers/issues/921) is the umbrella issue every drift report
gets routed into ([#1841](https://github.com/obra/superpowers/issues/1841),
[#2249](https://github.com/obra/superpowers/issues/2249) both closed as duplicates of it). The
maintainer's own comment: *"I've definitely been thinking about this. I don't feel like I yet
have a good handle on what the superpowers version of this is. But we want something here."*
A commenter proposes a **delta/amendment plan** — preserve the original plan as immutable
history, write an amendment for the parts that changed, never rewrite completed tasks in place —
naming the failure modes "history stops being trustworthy," "checkboxes stop meaning done," and
later sessions re-parsing a mixed-state document. Nothing has shipped.
[#602](https://github.com/obra/superpowers/issues/602): *"the plan never aligns 100% with the
design … sometimes a new feature sneaks in. Sometimes features are left out."*

**Why the plan alone cannot be checked — the strongest single datum in this research.**
[PR #2086](https://github.com/obra/superpowers/pull/2086), which added the `Spec:` pointer,
carries maintainer eval data: whole-branch reviewers detected **0 of 45** seeded cross-module
inconsistencies, and a mechanical scanner's findings were **100% dismissed** at adjudication.
The stated root cause is structural: *"once the plan is the only authority in scope, incoherence
is unfalsifiable."* This is the argument for keeping an upstream design artifact reachable at
execution time, and it is empirical, not aesthetic.

**Losing the decision loses fidelity.** [#1783](https://github.com/obra/superpowers/issues/1783):
a UI build passed every mechanical gate and shipped the **rejected** control — the decision had
degraded to the word "chip" sitting over a task that said "rename the existing slider." Only the
traceability half of the proposed remedy landed (the `Spec:` pointer, the verbatim Global
Constraints block, and SDD's pre-flight cross-section conflict scan); the proposed decision
ledger did not.

**Citations rot when they are positional.**
[#2178](https://github.com/obra/superpowers/issues/2178): the `writing-plans` template
demonstrates `path.py:123-145` citations; one multi-session plan carried **eleven stale
citations**, two pointing ~30 lines into unrelated code. The insight is important — a stale line
range *"still resolves, to different code,"* so the agent edits something real and reports
success. PR #2182 replaces them with durable file anchors.

**Nothing writes to the plan after setup.**
[PR #2237](https://github.com/obra/superpowers/pull/2237) reports three plans sitting at
**0/34, 0/34 and 0/42** with all work finished and deployed to production — the plan files being
the only record anyone would read, and all of them saying the opposite. The diagnosis is exactly
structural: SDD deliberately moved tracking to the ledger, and **no node in the process graph
writes to the plan file after setup**; no reviewer ever opens it. The maintainer has also
rejected the obvious convention:
[#1547](https://github.com/obra/superpowers/issues/1547), asking for `specs/done/` and
`plans/done/`, closed with *"/done is not part of superpowers. It doesn't make sense to create
directories for something that's a local convention."*

**Deleting the run record destroys real content.**
[#2253](https://github.com/obra/superpowers/issues/2253): the `rm -rf <workspace>` at Finish
("git history is the record now") destroyed the only record of ~10 deferred Minor findings,
recovered only because the session still held the ledger in context.

**Context and session boundaries.** The ledger exists because "controllers that lost their place
have re-dispatched entire completed task sequences — the single most expensive failure observed."
Plan-scoping exists because
[#1936](https://github.com/obra/superpowers/issues/1936): a ledger with no plan identity caused a
second run to read the previous run's `progress.md` and **silently skip the new plan's tasks** —
in precisely the post-compaction situation where the skill instructs the agent to trust the
ledger over its own memory. On automatic context resets between phases
([#1503](https://github.com/obra/superpowers/issues/1503)) the maintainer replies *"I'd love
this. Unfortunately, the harnesses don't expose"* it, and points at SDD as the workaround. On
handoff documents ([#931](https://github.com/obra/superpowers/issues/931)) he replies *"I've
literally never had a problem with just telling superpowers to just continue with the plan in
$filename"* — met with a counter-report of a **5762-line** plan that reloads in full every
session. In his own practice
([blog.fsck.com, 2025-10-05](https://blog.fsck.com/2025/10/05/how-im-using-coding-agents-in-september-2025/))
he does not compact: *"I don't /compact. Instead I /clear the implementer and start the
conversation over. Telling it that it's starting with task 4"* — deliberately, to avoid
*"biases from the previous implementation."* The plan is the only shared state across that
boundary. Note the asymmetry: he clears before **implementation**, never between design and
planning.

**Artifact size.** [#2079](https://github.com/obra/superpowers/issues/2079): a one-paragraph rule
change produced **3,061 lines across 14 commits over ~10 hours**, because the `<HARD-GATE>` and
the "too simple to need a design" section jointly forbade scaling down — this is what produced
v6.3.0's three-path router. [#1997](https://github.com/obra/superpowers/issues/1997): one
brainstorming session produced **8104 lines of spec across 14 files**.
[#512](https://github.com/obra/superpowers/issues/512) is the token-burn thread. On HN
([45547344](https://news.ycombinator.com/item?id=45547344)) Simon Willison measured
*"50,000+ tokens each across 5 subtasks, because each one had to consume duplicate information."*

**Fabrication about unread artifacts.** A controller fabricated entire multi-turn subagent
dialogues without invoking the Agent tool ([#1749](https://github.com/obra/superpowers/issues/1749),
not reproduced on v6.3.0); a reviewer concurred on an **unchanged tree**
([#1701](https://github.com/obra/superpowers/issues/1701)); an agent twice reported a green suite
belonging to an *earlier task's code* ([#2113](https://github.com/obra/superpowers/issues/2113));
cheap-tier reviewers cite artifacts they were never given
([#2243](https://github.com/obra/superpowers/issues/2243)). Every one is an agent asserting a
claim about an artifact it did not read — the same class as an Antmay spec agent inferring design.

**The maintainer's bar for a project-level layer is evidence, not principle.**
[#1643](https://github.com/obra/superpowers/issues/1643) proposed a "constitution" pattern with a
durable ADR-like decisions file; closed with *"This looks like it was reasoned from first
principles and authored by an agent but not based on actual field experience."* Same bar in
[#1616](https://github.com/obra/superpowers/issues/1616): *"The RFC doesn't include a concrete
plan where the absence of a Context Pack actually caused a problem."* On the project-memory /
doc-pack track ([#1238](https://github.com/obra/superpowers/issues/1238)) he concedes *"the gap
is real… What's missing is the evidence to design against."* One shape he has ruled out on
evidence: [#601](https://github.com/obra/superpowers/issues/601)'s growing
accumulated-discoveries block is *"the one shape we deliberately avoid, since real sessions
showed dispatches ballooning with pasted history."*

**Verification theatre, measured.** The `writing-plans` plan-review subagent loop was announced as
implemented in [#229](https://github.com/obra/superpowers/issues/229) and later deleted in commit
`e6221a4`, whose message carries the data: 5 versions × 5 trials, ~25 min per run of added
overhead, **no measurable improvement**. The orphaned reviewer prompt templates are still on disk.
This is the closest thing in the literature to a direct verdict on Antmay's `reconcile-spec`.

## Verdict for Antmay

Superpowers is evidence **for a variant of (A) that dodges the objection to (A)**, and evidence
**against a reconcile step**. Call it **option D: one design document per thread, written once
at the end of the discussion, from the conversation, and thereafter amended in place — with no
separate decision log and no reconciliation pass.**

The user's objection to (A) — "maintaining a document during a live grilling session is bad" —
is exactly the objection superpowers' design answers. `brainstorming` never writes during the
dialogue. It asks one question per message, proposes 2–3 approaches, presents the design *in
chat* section by section with approval after each, and only then serializes the approved,
already-agreed design to disk in a single write. The document is a **transcript of an agreed
conclusion**, not state maintained under pressure. Antmay's `decisions.md` exists precisely to
avoid holding design in a chat that may be compacted; superpowers accepts that risk and buys
back the losslessness by writing while the context is still hot and by *never re-deriving the
artifact in a fresh session*. That trade is the crux: Antmay's failure mode (1) — "the spec is
regenerated from a lossy log, so the spec agent infers design and the reconcile agent strips it
as invented" — is caused by the **regeneration hop**, not by the log. Superpowers has no
regeneration hop and therefore no invention to strip.

Concretely, adopt:

1. **Delete the decisions→spec regeneration boundary.** Whatever survives, one agent should hold
   the discussion and author the design artifact in the same session. If a decision log is
   retained, it must be a *byproduct* of that authoring, not its input.
2. **Cite, plus copy only exact constants — and make citations non-positional.** The `Spec:`
   pointer ("the plan argues from the spec, so the spec travels with it; executors read both")
   combined with `## Global Constraints` holding *verbatim* values is the right split: prose is
   cited, magic values are copied. PR #2086's eval — reviewers caught 0/45 seeded cross-module
   inconsistencies because "once the plan is the only authority in scope, incoherence is
   unfalsifiable" — is the empirical case for keeping the design reachable at execution time
   rather than fully restating it downstream. Take the caveat with it: #2178 shows positional
   citations (`file.py:123-145`) rot silently, because a stale range "still resolves, to
   different code." Cite headings, anchors, or record identifiers, never line ranges.
3. **Mechanical extraction for every downstream hand-off.** `scripts/task-brief` is the single
   best idea in the repo: a task brief that is an `awk` slice cannot drift from the plan, and no
   agent re-authors requirements. Antmay's `plan-tasks/` briefs should be derived, not written.
4. **Recorded rulings with cost-if-wrong.** `Ruling: <what> — <why> — <what it costs if wrong>`,
   ledgered during execution and surfaced *exhaustively* at the end, is a better shape than
   Antmay's `.pending-decisions/` for anything that does not truly need a human. It converts
   stalls into reviewable, reversible decisions.
5. **Ceremony classification up front.** Three paths where two produce no file at all is a
   direct answer to "artifacts restate each other": the cheapest way to stop propagating a
   change to N copies is to not create N artifacts for small work.
6. **In-place supersession by strikethrough plus annotation.** `~~<old decision>~~ **Superseded
   by <X>**: <why>` keeps a reversed decision and its replacement on one line inside the one
   document a reader already has open. It gives option (B) most of what it wants — a store of
   currently settled points — without a second artifact to keep in sync, and it makes a design
   doc safe to amend after shipping. Pair it with an explicit "amend the design doc, do not
   restate it downstream" write authority.
7. **Pre-registration for roadmap-shaped work.** The strict-cost experiment ladder — each rung
   states its gate and kill criteria before it runs, and the outcome is written back into the
   rung — is a far better `roadmap.md` than up-front child briefs, and it makes the feedback
   channel structurally read-write.

Avoid:

8. **Do not add another verification pass.** v5.0.6 measured a spec/plan review-loop layer at
   ~25 minutes of overhead with identical quality scores over 5 versions × 5 trials.
   `reconcile-spec` is the same class of machinery with a *stricter* polarity (strip the
   untraceable) than the one they measured and deleted (approve unless seriously broken). If it
   is kept, it should be an inline self-review inside the authoring skill — placeholder scan,
   internal consistency, ambiguity, scope — not a separate skill with its own agent.
9. **Do not copy their finished-artifact handling — but do steal its diagnosis.** Fifteen plan
   files with unchecked boxes and shipped specs marked `Draft` is failure mode (3) uncorrected,
   with plans at 0/34 while the code was in production (PR #2237), and the maintainer rejecting
   `plans/done/` as "a local convention" (#1547). The diagnosis in #2237 is the transferable
   part and it applies verbatim to Antmay: **no node in the process graph writes to the artifact
   after setup.** A done-marker only works if some step that reliably runs owns writing it. In
   Antmay that step exists — archival — so the fix is to make archival, not a convention, the
   thing that stamps the artifacts, and to make every artifact readable as historical from its
   own content rather than only from its path.
10. **Do not delete the run record.** #2253: SDD's `rm -rf <workspace>` destroyed the only record
   of ~10 deferred findings. Antmay's `.implementation-runs/` retention and its
   `implementation-report.md` synthesis are the correct shape; keep them. Do adopt the
   "Rulings I made" exhaustive end-of-run surfacing that superpowers pairs with deletion.
11. **Do not assume the literature has solved amendment.** #921 — how a design and plan get
   revised after execution starts — is open, and the maintainer says outright he does not have a
   handle on it. The best proposal in the thread (immutable original plan + a delta/amendment
   plan, never rewriting completed tasks in place) is untested. Whatever Antmay picks here it is
   picking ahead of the field, not behind it.
12. **Do not read their empty project layer as a verdict.** Their answer to failure mode (5) is
   "code and git history are the truth" — viable for a ~10k-line Markdown skills repo with one
   maintainer, not for a Flutter/Supabase product where a glossary is what stops the next thread
   from renaming a domain concept. Crucially, ADR/constitution proposals were closed for
   *lack of field evidence* (#1643, #1616), and on the project-memory track the maintainer
   concedes "the gap is real… What's missing is the evidence to design against" (#1238). The
   Leitspace field report **is** that evidence for Antmay. The one shape ruled out on measurement
   is #601's ever-growing accumulated-discoveries block — so a project layer must be curated and
   bounded (glossary, ADRs), never an append-only discoveries dump.

Option (B) — decisions rewritten in place as current settled points with a thin spec index over
them — gets partial support at the *paragraph* level (strikethrough supersession inside the design
doc) but none at the *artifact* level: nothing here maintains a separate current-state decision
store, and nothing indexes one. Option (C) is closer to what superpowers actually does *in the aggregate* (most work
leaves no artifact), but its architectural path shows that when a unit of work is big enough to
need a durable artifact, the artifact they reach for is a **design document**, not a decision
log.
