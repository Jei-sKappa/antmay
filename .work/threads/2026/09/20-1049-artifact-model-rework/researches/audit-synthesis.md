# Synthesis of the Leitspace audits of the Antmay artifact model

Written 2026-09-20 from the five reports under `reports/` and from this repository at HEAD `7d3d60d`. "A" is `reports/002A-audit.md`, "B" is `reports/002B-audit.md`, "the request" is `reports/001-audit-request.md`, "the terms overview" is `reports/003-engineering_terms.md`. Every claim about the method cites the file at HEAD that carries it; every claim about Leitspace cites the audit that made it and, where checked, the Leitspace repository at `/Users/jacopo/Developer/projects/personal/apps/Leitspace`. This document synthesises; it recommends nothing and settles nothing.

## Agreements

Points both audits make, merged. Each carries the evidence the audits give and, where this repository was checked, what HEAD says.

1. **The binding test selects for durability, not for decision-kind.** A: it "tests whether information deserves to survive. It does not test whether it is an architectural decision"; before implementation almost every settled product behaviour passes because there is no code to read it off. B: the test "has no fork clause, no kind clause, and no reversibility clause. It is a necessary condition presented as sufficient." HEAD: `suite/skills/capture-discussion/discussion/SKILL.md` §Binding test and drafts, and the same wording in `resolve-pending-decisions` step 3; `docs/glossary.md` defines **binding test** identically.

2. **Requirements and current-state description have no durable home, so they are pressed into ADR shape.** A: "it lacks a durable home for requirements and current system contracts, so 'worth preserving' becomes 'must be an ADR'"; living documentation has "no prescribed ownership, discovery, lifecycle, or completeness check." B: the project layer "has exactly three containers: ADR, glossary, roadmap"; "living documentation exists as a term and nowhere else" (root cause 9). HEAD: `docs/glossary.md` **project layer** and **living documentation** rows; no format under `suite/shared/references/formats/` describes living documentation; `close-thread` lands only `adr/` and `glossary.md`.

3. **ADR bodies were carrying implementation status, and were edited to keep it current, against the format's immutability.** B: 29 of 46 carry status language, all 46 were rewritten on 2026-09-19. A: "Today's ADR bodies were recently tightened too"; "An accepted ADR must not be interpreted as proof that its design exists." Both want implementation state out of the ADR body. HEAD: `formats/adr.md` says the landed copy is "unaltered" and the thread copy "an immutable historical snapshot".

4. **An ADR needs a real fork, a consequence, and an explicit scope or applicability; a deferral needs a revisit condition rather than a version tag.** A's ten-item checklist (concrete architectural question, meaningful choice, real alternatives "do not invent alternatives to fill a template", consequences, scope and acceptance state explicit, "prefer present-tense decision text plus explicit applicability and a revisit trigger"). B's seven items (a fork existed, not readable off code or design, costly to reverse, present tense with no status words, named consequence, not another kind in disguise, revisit trigger is a condition never a version). Both keep the 1305 kernel as a genuine decision whose deferral half moves.

5. **"v1 is …" is a smell whose legitimate residue is applicability or deferral, not the version.** A: version scope is legitimate "when it defines applicability"; 1301 is "plainly a release brief"; 0859 must be split. B: "the version tag adds nothing"; the useful content is "the deferral with its sunset"; 1301 is deleted as pure scope; 0848, 0859, 1305, 1440 keep the stance and move the deferral. Same dispositions, different framing.

6. **Scope is not an ADR and must live in exactly one place.** A: release brief. B: the roadmap's Out-of-scope list. Both note the duplication between scope ADRs and the roadmap's Out-of-scope list (B: "Scope statements exist twice").

7. **The HTML-screen-map record is a governance or convention statement, not an architecture ADR, and its content is not worthless.** A: "a decision, but a poor architectural record"; destination "Design-source README and agent routing rule". B: "Repository convention: which file wins. Belongs in `assets/design/README.md`" plus one rule line in `AGENTS.md`.

8. **FR/AC identifiers must not survive outside the thread, and the implementation report is where traceability evidence belongs.** A: "The implementation report can map those checks to behavior-named tests; the tests should not depend on the thread to explain their purpose." B: "The implementation report is the only home of traceability", with a mandatory `## Acceptance` table. Both: tests are named for behaviour. HEAD: `formats/implementation-report.md` has no acceptance section; `implement*` bodies forbid citing `.runs/` paths and say nothing about spec identifiers; `spec/SKILL.md` demands "Traceability — each AC traces back to the requirement" without naming where traceability lives.

9. **The leak was real and has already been cleaned by hand, which shows the method has no guard.** A: commit `0f88d44` removed thread-local citations across 50 files; two comments still link historical thread artifacts. B: 515 lines removed; `9e228e6`/`e603d70` repointed comments at ADR stems; `5a3ae2f` removed `AGENTS.md §n` citations. Verified in Leitspace: all seven commits exist, dated 2026-09-19; `rg '\b(FR|AC)-[0-9]'` over `app packages supabase` returns 0 lines; ADR stem citations in code: 53 lines.

10. **The implement skills' write boundary should name thread identifiers as forbidden in code and tests.** A's citation table: production comments and test names carry "self-contained behavior; exceptional links to durable contracts or decisions", never "bare FR/AC/task numbers". B: add to every implement skill "No spec, plan or task identifier … and no thread path appears in code, comments, test names, migrations, or commit messages." (They differ on commit messages; see Disagreements 6.)

11. **Task and spec vocabulary enters git history through the commit body.** A: "Implementation progress facts also enter commit bodies … Task and spec vocabulary propagates directly into Git history." B: root cause 7 on traceability, and the same write-boundary fix. HEAD: `implement/SKILL.md` §Commit Policy "Commit message bodies MAY carry the task's factual progress block"; `implement-plan` and `implement-plan-with-subagents` make it "carry".

12. **`AGENTS.md` should be short, hold rules and routing, and distinguish rule from guideline from information, with the rationale beside the rule kept brief.** A: rule / guideline / reference / rationale, "A rule should state the obligation first and may carry a brief 'because'"; `AGENTS.md` becomes "Instruction entry point, immediate constraints, reading routes". B: rules only, "one imperative sentence each, an optional one-line because-clause, and a pointer"; information to architecture docs, guidelines to a handbook. HEAD: `docs/documentation-rules.md` last paragraph defines `AGENTS.md` as holding "non-obvious constraints, rationale, workflows, and rules" in one sentence; the root `AGENTS.md` update rule (lines 5–12) adds "significant changes", "a mistake", "a new rule".

13. **Leitspace's `AGENTS.md` duplicates ADR bodies.** A: it "contains major architecture choices — ViewData boundaries and package-local copy ownership — that are at least as architecturally significant as several retained ADRs"; placement "appears to depend partly on which operation recorded the information". B: §3.3 item 5 restates 1305, §4.7 restates 1432, §3.2 is the body of a deleted ADR; the thread-02 spec made amending `AGENTS.md` a deliverable "so the same decision was written twice, in two registers, by design".

14. **Change-completion obligations are not functional requirements.** A on "FR-14 — Living documents": "a change-completion obligation, not a functional requirement of Leitspace". B: the spec's "Living documents" practice "makes amending it a thread deliverable, so decisions get written there as well as in `adr/`". Both keep the obligation and move it out of the FR list.

15. **Agents need a fixed, short read order across the project layer.** A: six-step reading order (instructions and routing → contracts and rules → architecture and ADRs → glossary → active thread → historical only for investigation). B: `AGENTS.md` → glossary → architecture for the module → product for the capability → ADR catalog → thread. HEAD: the read order exists only as the two fixed leading items of every `## Inputs` section (`suite/authoring/body-structure.md`).

16. **Mechanical checks should catch thread-local identifiers in durable surfaces.** A: six structural checks including "Thread-local identifiers or paths introduced into production comments and test descriptions". B: a ten-line `rg` recipe in the project gate. Both say checks catch structure, not significance.

17. **The thread's delta generalises beyond `adr/` and `glossary.md`.** A: "Generalize to typed project-document changes, with explicit destinations"; `close-thread` "should verify that all lasting requirements, rules, and explanations have landed". B: `adr/` becomes `delta/` mirroring the project layer; `close-thread` lands each kind. HEAD: `formats/thread.md` rule 4 fixes the delta as `adr/` and `glossary.md`.

18. **No numerical ADR cap.** A: "do not impose a numerical cap"; measure conflicts, duplication, stale claims, reading burden. B: "A per-thread ceiling that triggers review, not a limit"; a portfolio heuristic reported at close.

19. **Preserve, do not rewrite, the historical record.** A: reclassified records keep text and stem with a disposition; "Do not rewrite completed August specs". B: "Existing closed threads are untouched (historical)"; stems stay on retitled records. (B does delete three records; see Disagreements 8.)

20. **The August artifacts predate the current format, so the mirror explains the remaining pressures but did not produce every artifact.** A: three thread logs record migration on 2026-09-19; "The current mirror explains remaining structural pressures; it cannot establish exactly which older instruction produced every August artifact." B: the 46 "are what a human filter left after the method produced 96", retrofitted from legacy `decisions.md` files; specs cite `decisions.md DR11` "because no project-layer record existed at authoring time".

21. **A Leitspace-specific amplifier exists.** A: the foundation spec "required deferred features to become available later without schema changes", pushing future design into the earliest work. B: "In a greenfield project the discussion phase settles the whole product model. Every settled point that passes becomes a record."

## Disagreements

Where the audits differ, with the assumption or value judgment that splits them.

1. **Whether FR/AC ids belong in the spec at all.** A: "remove mandatory FR/AC numbering from thread specs"; keep acceptance checks, distinguish four kinds of criterion, allow optional thread-local check ids for large reviews. B: "FR/AC ids belong in the spec. The thread's plan, its report and its reviews need a checkable contract, and numeric ids are the cheapest one"; add a banner and confine the ids. **Split:** whether the leak is caused by the ids existing (A) or by traceability having no named home (B). Both agree on the second cause; only A also treats the first as causal.

2. **How kind and authority are made visible to an agent.** A: "Folders alone are insufficient. Antmay already puts authoritative roadmaps under `.work/`, beside historical threads"; add frontmatter metadata (kind, scope, lifecycle state, applicability, replacement) and a generated catalog. B: "Folder is kind. No frontmatter status, no kind field"; `docs/adr/` immutable, other `docs/` living, `.work/` historical, register "signalled by the file, not the sentence". **Split:** whether an agent reliably infers register from path (B) or needs an explicit field (A), and whether `.work/roadmaps/` sitting beside `.work/threads/` already breaks the path rule (A says yes; B does not address it).

3. **Whether an ADR may describe a future intention.** A: Nygard "explicitly distinguishes proposed, accepted, and superseded decisions"; "accepted does not imply implemented"; the shelf record 1432 is retained "as an unresolved proposal". B: an ADR is "stated as a stance in the present tense, with no status words"; "The moment an ADR needs the sentence 'not built yet', the content is a requirement and moves"; 1432 goes to `docs/product/profile.md` as an open item. **Split:** whether "decision" means "we chose" (A, so an unbuilt choice is still a decision) or "the current stance the system embodies" (B, so an unbuilt choice is a requirement until built). The request's premise 2 sits with B; A rejects it.

4. **Where release scope lives after the release.** A: `docs/product/releases/<release>.md`, "later retained as release history". B: the roadmap's Out-of-scope list is "the only place scope is written", and the index is deleted when the destination is reached. **Split:** whether release scope needs a durable record after the release ships (A) or whether code, ADRs and threads suffice (B and `formats/roadmap-index.md` rule 6).

5. **Whether product decisions get a container of their own.** A: `docs/product/decisions/`, "created only when needed", for "significant product trade-offs whose reasoning merits an independent record" (initially binary answering and the social/privacy direction). B: one decision container; 0849 and 0850 remain ADRs as "genuine product-architecture stance". **Split:** whether "architectural" is a kind boundary (A) or whether ADR is the one decision container with a hard bar regardless of subject (B; also the 05-1339 thread's DR9, which accepted that "the 'architecture' in ADR is a misnomer for product rules").

6. **Historical references in commit messages.** A: "I would relax the absolute ban on historical references in commits. A commit is historical too, and a fully qualified link can be useful provenance. The stronger rule is that neither the message nor the code requires that link to understand the change." B: no spec, plan or task identifier and no thread path "in code, comments, test names, migrations, or commit messages". **Split:** whether a commit message is a historical artifact (A) or a durable surface agents read as current (B).

7. **How a thread stages changes to living documents.** A: "ordinary branch edits to canonical documents plus a small target list. If Antmay retains staged copies, it needs explicit destinations and baseline checks; it must not create two competing authoritative versions." B: `delta/product/`, `delta/architecture/`, `delta/rules.md` inside the thread, merged at close "exactly as the glossary merge already works". **Split:** whether the thread-local staging that works for one-file-per-record ADRs scales to prose documents another thread or an implementation may edit meanwhile.

8. **How much of the portfolio is excess, and whether the count is evidence.** A: "46 is not itself evidence of excess"; classification 27 architectural / 15 product / 3 convention / 1 metric; 21 retained plus one proposal plus five folds, "not a target quota". B: 25 genuine / 7 description / 5 convention / 5 scope / 3 forward requirement / 1 value; "a strict decision bar leaves roughly 20 to 25"; result 23 after merges; three records deleted outright (292038, 1301, 1437). **Split:** the request's premise 3 (see Premises challenged) and whether a duplicate of a glossary row or roadmap list is deleted (B) or preserved with a disposition (A).

9. **Sentence-level normative strength.** A: "each normative statement has an explicit strength" (rule / guideline / reference / rationale). B: "An agent does not need RFC 2119 keywords to know how to treat a line" once the file fixes the register. Same split as 2.

10. **The consult skills.** B: merge `consult-adrs` and `consult-glossary` into one `consult-project-layer` printing the fixed read order. A: a "small project-context catalog" generated from metadata that routes to contracts, rules and decisions. **Split:** one routing skill (B) versus generated routing data plus the existing per-skill inputs (A); neither addresses that the current design deliberately has no method-level skill (05-1339 DR26).

11. **Volume signals.** B: flag more than three draft ADRs per thread at closure; report current ADRs against closed roadmap entries in `close-thread`. A: "Measure unresolved conflicts, duplicated requirements, stale current-state claims, and reading burden — not records per roadmap entry." **Split:** whether a count-based heuristic helps (B) or misleads (A).

12. **The spec's shape.** A: "Change specification/RFC: baseline, intended delta, constraints, acceptance checks, freedoms, assumptions" describing "a proposed change to those maintained artifacts". B: the spec keeps its role and FR/AC block; product behaviour that outlives the thread is written into `docs/product/` "as part of the spec's delta". **Split:** whether the spec stays the thread's "single design truth" (HEAD, B) or becomes a diff against the maintained documents (A).

13. **Size targets.** B: root `AGENTS.md` under 1,500 words, under 800 per module section. A: none.

## Premises challenged

Where an audit contradicts the request, and whether the evidence supports the audit.

1. **Premise: the HTML-screen-map record is "worthless as an ADR".** A disagrees: "It selects an authority when two design sources disagree and explains why. That is useful governance information. I agree it does not deserve a standalone architecture ADR; I disagree that its content is worthless." B agrees it is a convention but gives it a destination and a rule line. **Evidence:** supports the audits. The record settles which source wins on conflict, which is a rule later work needs; the request's own symptom 5 says rules need a home.

2. **Premise: "a decision record describes what currently exists in the system", so "v1 is like this" should be "it is like this".** A rejects the premise: "An ADR is not a description of what currently exists. It records an architectural choice and its rationale. An accepted choice can precede implementation." B accepts half: the version tag adds nothing, but the request is "slightly wrong about why" because the record carries a deferral with a sunset that has no slot in the format. **Evidence:** the method's own definition supports the audits. `formats/adr.md` requires "the context …, the decision in full, and the reason", never the current state; `consult-adrs/SKILL.md` says a record "binds the work until another record supersedes it"; `docs/glossary.md` calls an ADR "one project decision". Nothing in HEAD says an ADR describes what exists. The request's mental model is not the method's.

3. **Premise: 46 ADRs at roadmap entry 2 is itself "a signal".** A rejects the count as evidence: the records "cover product foundation, the design system, backend schema, and authentication — not merely two small features. The better evidence is their subject mix, fragmentation, unresolved applicability, and duplicated authority." B accepts it and strengthens it: 96 raw records before a manual cut. **Evidence:** the Leitspace history B cites is real (commits `d779ec6`, `6311316`, `37f76e5` on 2026-09-19; 46 files in `docs/adr/` today). The count is evidence of the method's behaviour before the filter (96), and the mix is evidence of what the filter left. Both readings hold; A's caution that the count alone proves nothing is fair, since 21 to 25 records for a greenfield product whose whole model was designed up front is defensible by both audits' own bars.

4. **Premise: the ids leak "because `spec.md` carries Functional Requirements and Acceptance Criteria with ids", and agents treat them as authoritative.** Both accept that the leak happened and reframe the cause: B "the method's failure is that it demanded traceability without saying where traceability lives"; A adds that the ids "acquire the appearance of permanent requirements" and that labelling manual walkthroughs "machine-checkable obscures what was actually proven". Both note the leak has been cleaned. **Evidence:** supports the reframing. `spec/SKILL.md` demands coverage and traceability; no implement skill names a home for it; `formats/implementation-report.md` has no acceptance section. The premise's mechanism (ids are treated as authoritative) is consistent with B's observation that "the tests were written from" the AC block, so both causes are live.

5. **Premise (implicit in the Context): "Threads are declared historical: only the code, the project layer and `AGENTS.md` are sources of truth", and thread-local material "must never be cited outside its thread".** A: the shipped spec skill "explicitly describes how to format cross-thread references", contradicting the maintainer rule. B: "Antmay already puts authoritative roadmaps under `.work/`, beside historical threads" (A makes the same point). **Evidence:** supports both. `spec/SKILL.md` step 5, `plan-brief/SKILL.md` §Plan shape and `plan-strict/SKILL.md` §Index and §Invariants each give a repo-relative form for "cross-thread" references to `.work/threads/<other>/…`; `docs/documentation-rules.md` forbids exactly that citation. `.work/roadmaps/` is authoritative and lives under the dot-folder searches skip (`docs/working-with-threads.md`).

6. **Premise: "the method has a failure mode: it mixes artifact kinds that should be distinct".** A narrows it to a missing home ("Tightening ADR prose alone will not fix that"); B widens it to nine prescriptions that push toward the outcome. **Evidence:** both lists check out against HEAD (see Blind spots (a)). The premise is confirmed and located, not contradicted.

7. **Premise (in "What I want"): "which existing Antmay artifacts should be dropped or merged".** A drops none and merges none; B merges two skills and renames one folder. Neither audit found an artifact whose removal the evidence demands.

8. **Premise: the code is the source of truth.** A refines: "Code establishes observed behavior; requirements establish intended behavior. A disagreement can mean a bug, outdated documentation, or an authorized change." **Evidence:** `docs/documentation-rules.md` says "Code is the source of truth for behavior and structure that are immediately apparent from reading it", which already limits the claim to what is apparent; A's refinement is compatible and sharper.

## Single-source points

Proposals only one audit raised.

**A only**

- A proposed → accepted → superseded lifecycle for ADRs, with acceptance evidence carried in the artifact ("A draft becomes authoritative when written … the artifact itself does not carry the acceptance evidence").
- `docs/product/decisions/` for significant product trade-offs, created only when needed.
- Release briefs at `docs/product/releases/<release>.md`, retained as history.
- Design-source documentation as a named artifact kind with explicit ownership.
- A project-context catalog generated from artifact metadata that routes an agent without duplicating content.
- The conflict rule refined beyond "source of truth wins": bug, outdated documentation, or authorised change, to be identified rather than assumed.
- Relaxing the ban on historical references in commits; never rewriting history to remove references.
- A reclassification or archive mechanism distinct from supersession: "Do not call something 'superseded' if only its document category changed."
- Stable requirement identities assigned in the living contract (`REQ-auth-email-verification`) when persistent ids are useful; "Do not reuse thread-local `FR-1` as a global identifier."
- Verification method and evidence recorded per criterion; the label "machine-checkable" is misleading for manual walkthroughs.
- Change-completion obligations as a distinct criterion kind.
- "Make zero new ADRs a normal result of completing a thread."
- Health measures instead of counts: unresolved conflicts, duplicated requirements, stale current-state claims, reading burden.
- A check for "Unresolved changes to a contract modified since the thread began" (a baseline check).
- `close-thread` reviews code and maintained documentation together and verifies all lasting requirements, rules and explanations landed.
- The three documentation kinds in `docs/documentation-rules.md` "classify audiences and distribution. They do not classify authority or purpose."
- Diátaxis "does not provide an acceptance or authority model; Antmay must add that itself"; Rust's RFC template as the shape for a substantial proposal; the thread spec can play that role.
- Applying the ADR bar to architecture buried in `AGENTS.md` "may identify an additional record worth writing".
- The plan folder "Optional execution decomposition; avoid restating whole contracts".

**B only**

- The 96 → 46 history with the ten cut titles as "the failure mode in raw form".
- The three measurements: 29 of 46 carry status language, 34 name schema objects, 27 name a rejected alternative.
- `formats/roadmap-index.md` rule "Constraints that bind the threads opened from these entries are ADRs" as "the direct origin of the 29 'binds the thread that builds it' records"; rewrite to "product requirements or ADRs, by kind".
- The ADR format's optional Options and Consequences as a cause (Nygard requires Consequences, MADR requires Options); make both mandatory.
- Remove the discussion's bypass "The user may also ask for a record directly, without the test"; the user may ask for any delta kind and the agent sorts it.
- Kind sort before the bar; a per-thread flag above three drafts; a portfolio heuristic in the close report.
- The thread's `adr/` becomes `delta/` with `adr/`, `product/`, `architecture/`, `rules.md`, `glossary.md`.
- Merge `consult-adrs` and `consult-glossary` into `consult-project-layer`.
- A concrete lint line for the project gate.
- "Folder is kind": three lifecycles stated in one sentence of `AGENTS.md`.
- A mandatory `## Acceptance` table in the implementation report; a banner on the spec's FR/AC block; spec headers cite the project layer only.
- The test for `AGENTS.md` content: "a sentence an agent cannot violate is not a rule"; "If violating it is sometimes right, it is a guideline."
- Word budgets for `AGENTS.md`; a handbook file per module; project-agnostic guidelines into `FLUTTER.md`.
- Citing a stem for "what the system does" rots because contents change while stems stay; citing it for "why this looks odd" does not.
- Deleting 292038, 1301 and 1437 because their content already exists elsewhere.
- The duplication analysis of Leitspace `AGENTS.md` §3.3 item 5 (a rule, an SDK fact, a rationale, an ADR citation and an implementation detail in one paragraph) and item 7 (a post-mortem written as a rule).

## Terms

How the vocabulary of the terms overview maps onto the artifact kinds the audits propose, where the mapping is ambiguous, and where it conflicts with `docs/glossary.md`.

### Mapping

| Terms-overview term | Antmay at HEAD | A's kind | B's kind | Ambiguity or conflict |
| --- | --- | --- | --- | --- |
| Vision, Strategy, Initiative | Roadmap index `## Destination` | Release brief (partly) | Roadmap index | The Destination is "how it will be recognised", closer to a definition of done for a direction than a vision. |
| Roadmap | **roadmap index** | Not addressed; release brief overlaps | Roadmap index, absorbs scope ADRs | B makes the index the sole home of scope, while `formats/roadmap-index.md` deletes the index when the destination is reached. |
| PRD, Product Spec, Functional Spec | None durable; the thread **spec** carries it for one change | `docs/product/<capability>.md` "product contract" | `docs/product/<capability>.md` "product requirements" | The overview says PRD, Product Spec and Functional Spec have "no universal distinction". A's name collides with the glossary's reserved word **contract** (see below). |
| Requirement, FR, NFR | Spec `FR-<id>` and prose constraints, thread-local | Living contract: "functional requirements, quality requirements, business rules" | Product doc, present tense, "not yet built" marked | Both audits move FR from a thread artifact to a living one; the glossary has no term for a requirement above the thread. NFR has no home in HEAD, A's "quality requirements" or B's product doc would hold it. |
| Scope, Out of Scope | Spec element 3; roadmap `## Out of scope` | Release brief | Roadmap Out-of-scope only | Disagreement 4. |
| Constraint | **log entry type** `constraint`; spec element 5 | Engineering rules; architectural constraints in the spec | `AGENTS.md` rule or spec | The overview's Constraint is requirements-level; the glossary fixes `constraint` as a thread-log type. Same word, two levels. |
| Assumption | **assumption** (log entry type; also spec `## Inferences` is the nearest) | Spec "assumptions" element | Not addressed | The overview's Assumption is a planning assumption; the glossary fixes **assumption** as "something the user and the agent take as true without confirmation" in the log. Compatible meaning, different container. |
| Epic, Feature, User Story, Task | **entry**, **unit of work**, plan task | Not renamed | Not renamed | A roadmap **entry** is closest to an epic; a thread is the unit; a plan task is a task. No conflict. |
| Spike | None | None | None | A discussion-only thread or a research file under `researches/` (this thread's own practice) is the nearest. Not a glossary term. |
| AC | Spec `AC-<id>.<n>`, thread-local | Acceptance checks with method and evidence; optional scoped ids | Spec AC block plus report `## Acceptance` table | The overview ties AC to "a specific feature/story", which matches thread-local. A drops mandatory ids; B keeps them. |
| DoD | Standing gates (`implement*` §Commit Policy baseline gate); "Living documents" spec practice | Change-completion obligations | Delta list in the spec's Living documents section | Neither audit names it DoD. No glossary term. |
| Design Doc, Tech Spec | Thread **spec** | "Change specification/RFC" | Spec unchanged | The overview says a Tech Spec explains how engineering will implement; Antmay's spec pins what, not how (**degree of freedom**). |
| RFC | None; **discussion** is the pre-decision act | The thread spec "can perform this role" | None | Conflict: the overview says an RFC precedes the decision and an ADR follows it; Antmay's spec is written after the discussion settles, so it is post-decision. A's mapping treats the spec as an RFC toward the maintained documents, which changes when the decision is made. |
| ADR | **ADR**, "one project decision" | Architectural decisions only; proposed → accepted lifecycle | Decisions passing the seven-item bar, any subject | The overview's ADR is "an important technical decision". The glossary's is any project decision; 05-1339 DR9 accepted the misnomer. A narrows to the overview's sense; B keeps the glossary's. |
| Architecture overview, C4, diagrams | **living documentation** (term only) | `docs/architecture/overview.md` and focused references | `docs/architecture/<module>.md` | The glossary already lists "architecture references" under living documentation. Both audits give it a path; DR4 said "the method does not define a living-spec format". |
| API Contract, Schema, Interface | None method-owned | "Current system contracts" in architecture references | Architecture doc | The glossary's reserved word **contract** is "generic on its own" and must be qualified as **suite/CLI contract** or **output contract**. A's "product contract", "living contracts", "system contracts" add three unqualified senses. |
| Test Plan, Test Case | Spec AC block (B: "the AC block is the thread's test plan"); plan `## Verification` | Verification method per criterion | Report `## Acceptance` table | No glossary term. |
| PR, Commit, Changelog | **closing report commit**, commit policy | Commit description "self-contained change explanation; optional historical provenance" | Commit message carries no thread ids | Disagreement 6. |
| Migration Plan, Rollout, Rollback | None | Leitspace migration sketch | Migration sketch | Out of the method's vocabulary. |
| Runbook, Playbook, SOP | **living documentation** ("runbooks") | Engineering handbook / development guide | `docs/handbook/<module>.md` | A's "handbook" and B's "handbook" agree; not a glossary term. |
| Incident Report, Postmortem, RCA | None | Not addressed | Leitspace `AGENTS.md` §3.3 item 7 "a bug post-mortem written as a rule" moves to architecture and handbook | No home in either proposal for a post-mortem as a kind. |
| SLA, SLO, SLI | None | Quality requirements in the product contract | Not addressed | NFR home only under A. |

### Terms the proposals would add

- **product contract** (A) or **product requirements document** (B), per capability. A's name conflicts with the reserved word **contract**.
- **release brief** (A).
- **architecture overview** / **architecture description** / **architecture reference** (A, B), per module or overview.
- **engineering handbook** / **handbook** / **module guide** (A, B).
- **rule**, **guideline**, **reference**, **rationale** as normative registers (A explicit, B rule / information / guideline).
- **product decision record** (A).
- **design-source documentation** / **design baseline** (A).
- **project-context catalog** (A).
- **artifact kind**, **lifecycle state**, **applicability**, **replacement relationship** as metadata (A).
- **revisit trigger** / **revisit condition** (A, B).
- **reclassification** as a disposition distinct from supersession (A).
- **typed delta** and the `delta/` folder (B); A's "typed project-document changes".
- **acceptance table** in the implementation report (B).
- **change-completion obligation** (A).
- **consult-project-layer** as a skill name (B).
- **citation rule** / **authority versus provenance** (A).
- **kind sort** (B).

### Current glossary terms the proposals would change

- **project layer** — gains living kinds beside `docs/adr/`, `docs/glossary.md` and roadmap indexes (both).
- **delta** — no longer "the thread's own `adr/` and `glossary.md`" (both).
- **ADR** — A narrows to architectural choices and adds a lifecycle; B keeps the subject open but adds mandatory sections and forbids status words; both change the sentence "one project decision".
- **superseded ADR** — A adds a reclassified disposition that is not supersession; "Location is the status" is contradicted by A's lifecycle state.
- **binding test** — replaced by both (A's two questions and checklist; B's kind sort and seven items). The term as defined would be dropped.
- **living documentation** — from a description "in whatever shape the project chooses" (DR4) to a method-owned kind with a path (both).
- **spec** — A: from "single design truth" to a change specification against maintained documents; B: unchanged in role, its FR/AC block confined by a banner.
- **thread artifact** — unchanged in meaning; A's citation table adds what may and may not cite one.
- **closing** — lands more delta categories and, under A, verifies maintained-document updates.
- **rejected alternative** — B makes `## Options considered` mandatory in the ADR, moving the rejection from the log line's optional clause to a required section.
- **write boundary** — the implement skills gain a negative clause on thread identifiers (both); under B the discussion writes `delta/product/` and `delta/architecture/`.
- **log entry type** `constraint` and `assumption` — unchanged, but the terms overview uses both words at requirements level, so any product-requirements format must avoid the glossary's senses or qualify them.
- **entry** / **roadmap index** — B makes the Out-of-scope list the only home of scope and rewrites rule 5 of the format.
- **decision** (reserved word) — A adds a third level, the product decision record, to the two the glossary qualifies (ADR, log entry of type `decision`, pending decision).
- **contract** (reserved word) — A's usage requires either a fourth qualified sense or a different name.
- **model-invoked skill** — the two examples (`consult-adrs`, `consult-glossary`) become one under B.
- **closing report commit** and the commit-body rule — A relaxes, B tightens what a commit may carry.

### Current glossary terms the proposals would drop

- **binding test** (both).
- Under B, `consult-adrs` and `consult-glossary` as names, replaced by `consult-project-layer`; the glossary names them in **model-invoked skill** and **ADR**.
- Nothing else is dropped; both audits add rather than remove.

## Blind spots

### (a) The mirror the audits read

The invocation names the mirror as `temp/mirrors/Leitspace/temp/mirrors/antmay/`. That path does not exist in this repository: `temp/mirrors/Leitspace/` is a checkout of Leitspace at its commit `5a3ae2f` and carries no `temp/` folder. The mirror the audits read is the one named in `reports/000-readme.md`, inside the Leitspace repository at `/Users/jacopo/Developer/projects/personal/apps/Leitspace/temp/mirrors/antmay/`.

| Fact | Value |
| --- | --- |
| Mirror HEAD | `7d3d60d7286d111e017644c2dc2b5d49e6bd5331`, 2026-09-19 11:30:37 +0200 |
| Mirror working tree | clean (`git status --porcelain` empty) |
| This repository's HEAD | `7d3d60d7286d111e017644c2dc2b5d49e6bd5331` |
| Working-tree diff mirror → HEAD | none in tracked files; only untracked local files here (`.DS_Store`, `.config`, `.worktreeinclude`, `antmay.code-workspace`) |

The audits read the exact commit this repository is at. **No prescription they cite has changed since.** For the record, each cited prescription and where it stands at HEAD:

| Prescription cited | Cited by | At HEAD |
| --- | --- | --- |
| Binding test wording | A, B | `discussion/SKILL.md` §Binding test and drafts; `resolve-pending-decisions/SKILL.md` step 3; `docs/glossary.md`. Unchanged. |
| "The user may also ask for a record directly, without the test" | B | `discussion/SKILL.md` §Binding test and drafts. Unchanged. |
| "Constraints that bind the threads opened from these entries are ADRs" | B | `formats/roadmap-index.md` rule 5; `roadmap/SKILL.md` §Inputs. Unchanged. |
| ADR body "A single paragraph satisfies that"; further sections optional | B | `formats/adr.md` rules 6–7. Unchanged. |
| Location encodes current/superseded; no status key | A, B | `formats/adr.md` paragraph 1 and rule 3. Unchanged. |
| Spec is "the thread's single design truth" | B | `spec/SKILL.md` line 13. Unchanged. |
| "Traceability — each AC traces back to the requirement" | B | `spec/SKILL.md` §Acceptance guidance obligation 1. Unchanged. |
| Spec describes cross-thread reference formatting | A | `spec/SKILL.md` step 5; also `plan-brief` and `plan-strict`. Unchanged. |
| `.runs/` never cited; nothing said about FR/AC ids | B | `implement*/SKILL.md` §Run workspace. Unchanged. |
| Progress block in commit bodies | A, B | `implement*/SKILL.md` §Commit Policy. Unchanged. |
| Discoveries become "a proposed ADR or a proposed roadmap entry" | A | `implement*/SKILL.md` §Discoveries. Unchanged. |
| `close-thread` lands ADRs and glossary only | A | `close-thread/SKILL.md` §Writes. Unchanged. |
| Thread-local material never cited outside its thread; ADR by stem | A, B | `docs/documentation-rules.md`. Unchanged. |
| `AGENTS.md` as "durable working memory … constraints, rationale, workflows, and rules" | A, B | `docs/documentation-rules.md` last paragraph. Unchanged. |
| Root `AGENTS.md` update rule (changes, mistakes, new rules) | A | `AGENTS.md` §Update rule. Unchanged. |
| Three documentation kinds classify audience | A | `docs/documentation-rules.md` §Three kinds. Unchanged. |
| "living documentation" as a glossary term with no path | B | `docs/glossary.md`. Unchanged. |
| Project layer = `docs/adr/`, `docs/glossary.md`, roadmap indexes | B | `docs/glossary.md`; `README.md` §Threads and the project layer. Unchanged. |
| Spec's acceptance criteria "are the contract the delivered work answers to" | B | `review-implementation/SKILL.md` §Inputs. Unchanged. |
| Plan-compliance reviewer's SATISFIED / MISSING / PARTIAL | B | `implement-plan-with-subagents/references/plan-compliance-reviewer.md`. Unchanged. |
| `AGENTS.md` may be cited by section (`§n`) | B (Leitspace practice) | No suite text permits or forbids it; the citation rule names ADR stems only. |

Two caveats the audits themselves make and this synthesis confirms: the August Leitspace artifacts were produced under the previous method (`decisions.md`, `DR<N>`, `docs/threads/`) and retrofitted on 2026-09-19, so the current mirror is evidence of the pressures that remain, not the cause of every record; and the Leitspace mirror in this repository (`temp/mirrors/Leitspace/`) carries the 46 records after `5a3ae2f`, so it can be used to check the audits' classifications but not the 96-record state, which lives only in Leitspace's git history at `d779ec6`.

### (b) Antmay has no `docs/adr/`

This repository is the method's reference project and runs on the suite it ships (`docs/working-with-threads.md`). It has:

| Fact | Value |
| --- | --- |
| `docs/adr/` | absent |
| Threads under `.work/threads/2026/09/` | 14 before this one |
| Threads carrying an `adr/` folder | 0 |
| Threads carrying a `glossary.md` delta | 7 |
| Closing events in thread logs | 4, all `ADRs: none`; 2 `glossary: merged`, 2 `glossary: none` |
| Threads with no closing event | 10 of 14 |
| Hand edits to `docs/glossary.md` outside a merge | at least one (`1550c51`, "repair the project glossary by hand for the closed September threads") |

What that says about the method's own practice:

- **The binding test has never produced an ADR here.** Fourteen threads settled points a later thread could build against incorrectly (the log's seven types, the seed's frontmatter shape, the ADR's absence of a status key, the closing event's form), and every one of them was recorded as a rule in a skill body, a format, or a maintainer document, with the rationale left in the thread log. The second clause of the test, "could not read it off the code", is why: in a documentation-as-code project the skill bodies are the code, so a settled rule is readable off them. Antmay therefore embodies A's stance that "a rationale belongs beside the rule it explains unless its significance earns a decision record", and B's "register signalled by the file", without ever having written the file kinds the audits propose. It also means the reference project has never exercised `close-thread`'s ADR landing path, the `supersedes` move, or `/consult-adrs`.
- **The method's own decisions are recorded in three places, none of them the project layer.** The redesign that produced the current suite is recorded in `.work/threads/2026/09/05-1339-address-failure-modes-report/decisions.md` as 28 `DR<N>` records in the legacy shape, which the current method says is never cited outside its thread and which `docs/documentation-rules.md` says a reader outside cannot resolve. Later decisions are one-line `decision` entries in thread logs. The rules themselves live in `suite/authoring/*.md`, `docs/documentation-rules.md`, the formats, and `AGENTS.md`. The rationale for a current rule is therefore reachable only by reading history, which is the situation the audits describe for Leitspace's product behaviour.
- **The glossary is the only project-layer artifact actually exercised, and it needed a hand repair.** Root `AGENTS.md` says "do not edit the project glossary by hand outside that merge"; commit `1550c51` did exactly that after three closes. This is direct evidence for A's warning about semantic merges and for DR4's reason to reject structural merging of living documents.
- **Closing is optional and mostly not done.** Ten of fourteen threads carry no closing event. DR5 records that a forcing function was proposed and "the user rejected it as ugly". Any proposal that lands living documents through `close-thread` inherits this.

What the 05-1339 thread settled about the project layer, and what of it never shipped or was later dropped (evidence only):

- **DR4** fixed three containers, "a project decision log …, a glossary …, and a short authority index that enumerates what is currently authoritative, including the project's own living documentation by path", and explicitly rejected method-owned living specs per capability with a structural merge, citing OpenSpec's parser data-loss bugs. B's `docs/product/<capability>.md` merged at close "as the glossary merge already works" re-proposes the rejected design; A's "ordinary branch edits … plus a small target list" is the DR4 stance.
- **DR9** dissolved the authority index into "the project's `AGENTS.md` method section", human-written, carrying "the read order for agents, the listing command, the pointers to `docs/adr/` and the glossary, and the list of the project's authoritative living documents by path". DR26 kept that section. The implementation report (`87c6562`) records writing it into this repository's root `AGENTS.md` as `## Method`. **It never shipped as method guidance to users**: `README.md` mentions `AGENTS.md` zero times, no format or skill describes the section, and this repository's own `AGENTS.md` no longer carries it after `6261e85` split the documents by audience (the catalog command now lives only inside `consult-adrs`; the "documents that govern the work" table is the nearest survivor). B's root cause 9 ("living documentation exists as a term and nowhere else") and the field report's suggestion 7 ("the method does not yet tell projects to") describe this gap; both audits propose re-creating, in a stronger form, what DR9 decided and the shipped method dropped.
- **DR9 accepted the trade-off** "the 'architecture' in ADR is a misnomer for product rules". The request's premise and A's narrowing of ADR to architecture reopen a trade-off that was taken knowingly. Neither audit mentions it because neither read this thread.
- **DR5** made the close a four-move consumption including archive; archive was dropped on 2026-09-17 (`17-1026-thread-closure-detectable`, "the folder stays where it is"). A's observation that `.work/` mixes authoritative roadmaps with historical threads is a consequence of that later change combined with `f9b3d09` (roadmaps moved from `docs/roadmaps/` to `.work/roadmaps/`).
- **DR13** put the method's common rules and read order in a model-invocable method skill; **DR26** superseded it because the copied design "reports partial loading as its most common failure". B's `consult-project-layer` with a fixed read order is DR13's shape again; the reason DR26 gave for retiring it applies unless answered.
- **Spec constraint "Conventions are the enforcement"**: "No hook, script, or permission mechanism is introduced." B's gate lint and A's structural checks cross that line; the 05-1339 spec also forbade "shipping a log-append script" (DR3) and "a listing script or index file" (DR9). Only the catalog command survived, inside a skill.

### (c) Which skills' roles change, per proposal

| Proposal | Skills whose role changes | How |
| --- | --- | --- |
| Typed living documents (product, architecture, handbook) with a method-owned home | `discussion`, `resolve-pending-decisions` | Sort each settled point by kind (B) or answer "which artifact owns it" (A) before the ADR bar; write into new delta kinds (B) or name targets (A). The dialogue-driven skills gain a filing step per point. |
| | `spec` | Cite product and architecture headings instead of restating; "Living documents" becomes the delta or target list; under A, the spec becomes a baseline-plus-delta change specification. |
| | `close-thread` | Land or merge more kinds (B), or verify that every declared maintained-document update landed on the branch (A); handle reclassification moves (A). Its currency check and landing preflight widen. |
| | `implement`, `implement-plan`, `implement-plan-with-subagents` | Already write living documentation; under A the report confirms maintained-document updates; under B they write nothing under `docs/product/` directly because the delta is staged in the thread. The two proposals give the implement skills opposite write boundaries for the same files. |
| | `consult-adrs`, `consult-glossary` | Read the new kinds (A: via a generated catalog; B: merged into `consult-project-layer`). Under B every skill's `## Inputs` opening pair changes, which touches all 18 bodies and `suite/authoring/body-structure.md`. |
| | `review-spec` | Check that citations resolve outside the thread and that requirement-kind content is not restated. |
| | `review-implementation` | Add maintained-document updates to what it audits. |
| | `roadmap` | Out-of-scope list becomes the sole home of scope (B); the rule "constraints … are ADRs" is rewritten. |
| | `open-thread`, `open-ticket` | Inputs list only; no role change. |
| Raise the ADR admission bar | `discussion`, `resolve-pending-decisions` | Apply the checklist; remove the direct-request bypass (B); propose the record with mandatory sections. |
| | `close-thread` | Landing preflight checks the mandatory sections (B); flags more than three drafts (B); reports a portfolio heuristic (B). |
| | `formats/adr.md` | Mandatory `## Options considered` and `## Consequences` (B); lifecycle and applicability metadata (A). Not a skill, but synced into every skill declaring it. |
| Confine FR/AC ids and give traceability a home | `spec` | Remove mandatory numbering (A) or add the banner and keep numbering (B); distinguish criterion kinds (A). |
| | `plan-strict`, `check-plan` | Per-task acceptance criteria and coverage checks currently map onto spec ACs; without ids (A) they map onto headings or prose. |
| | `implement*` | Write boundary gains the identifier clause; report gains `## Acceptance` (B). |
| | `implement-plan-with-subagents` | The plan-compliance reviewer lane and its SATISFIED / MISSING / PARTIAL vocabulary read the acceptance table or the prose criteria. |
| | `review-implementation` | The `acceptance` category reads the report's table (B). |
| | `formats/implementation-report.md` | New section (B). |
| `AGENTS.md` rules-only with pointers | none writes it | No skill writes `AGENTS.md`; the change lands in `docs/documentation-rules.md` (maintainer rule) and, if the method is to tell projects, in `README.md` or a new format. The implement skills' "living documentation within scope" would include `AGENTS.md` edits under both audits. |
| Merge the consult skills into a read order | `consult-adrs`, `consult-glossary` | Become one skill (B). Every other skill's `## Inputs` opening changes. `suite/authoring/body-structure.md` and `skill-roles.md` (the `model-invoked/` group and its naming rule) change. |

### (d) Pre-mortem

Run as `/the-fool` in pre-mortem mode on the merged recommendation (typed living documents beside `docs/adr/` and `docs/glossary.md`; a kind-sort plus checklist replacing the binding test with mandatory options and consequences; a typed delta landed by `close-thread`; FR/AC ids confined to the thread with an acceptance table and a lint; `AGENTS.md` rules-only; a merged consult skill with a fixed read order). The mode was fixed by the invocation, so no mode selection was asked. Timeframe: two roadmap entries after adoption on Leitspace, or four threads after adoption here.

**Steelmanned thesis.** Everything durable Antmay produces today is forced through one decision-shaped container, so requirements, descriptions, conventions and scope are written as ADRs and then edited to track reality. Giving each kind its own home, with its own lifecycle and citation rule, lets the ADR bar be raised without losing information, lets specs cite stable headings instead of dying with the thread, and lets an agent know how to treat a sentence from where it sits. The thread already stages a delta and lands it at close; extending that machinery is the smallest change that removes the pressure at its source.

**Failure narratives, ranked.**

1. **The dumping ground moves.** Likelihood high, impact high. Two roadmap entries later, Leitspace's `docs/product/` holds twelve capability documents, each with a growing "not yet built" section. The discussion phase still settles the whole product model before anything is built, so every settled behaviour lands as a present-tense requirement marked unbuilt; the product documents become a shadow roadmap and a shadow spec. The ADR count is down to 20 and the request's symptom is declared fixed, while the same 96 sentences live one folder over, now with no fork, no rationale, and no supersession trail, because the living kind has neither. Root assumption proven wrong: that kind-typing controls volume. Volume came from settling a greenfield product model up front (A and B both name this amplifier), and the new kind absorbs it without any admission bar of its own. Chain: requirements restated in three product documents → an implementation follows the stale one → the currency check at close cannot tell which was current → the human edits by hand, as with the glossary in `1550c51`.

2. **The merge loses content.** Likelihood medium, impact high. DR4 rejected a structural merge of living specs because OpenSpec's parser "shipped repeated data-loss bugs". The typed delta replaces the parser with an agent merging `delta/product/feed.md` into `docs/product/feed.md` semantically. On the third close a paragraph another thread added two weeks earlier is dropped because the delta was drafted from an older baseline; nobody notices because `close-thread` does not diff against the baseline the thread started from. The glossary already needed a hand repair after three closes. A's baseline check ("unresolved changes to a contract modified since the thread began") is the mitigation and is in neither audit's issue text.

3. **Two authoritative versions during an open thread.** Likelihood medium, impact medium. The implement skills write living documentation directly on the branch today. Under a thread-staged delta, an implementation updates `docs/architecture/supabase.md` while the discussion's draft sits in `delta/architecture/supabase.md`; the spec cites the delta, the code follows the canonical file, and the reviewer reads whichever the anchor names. A warned of "two competing authoritative versions"; the proposals give the implement skills opposite write boundaries for the same files (see (c)).

4. **Kind sort turns the discussion into filing.** Likelihood medium, impact medium. Every settled point now has a six-way kind question and a confirmation before it is written. The peer-framed interview becomes a clerk asking where each sentence goes; the user starts settling points in chat without invoking `discussion`; points go unlogged. The field report's §4.2 warned that gating every decision reproduces the outside reference's "decisions evaporate" failure, "the most substantive open complaint" about that skill set. The log's one-line entry per settled point is the part that worked (field report §3) and it is the part most exposed to friction.

5. **The read-order skill is partially loaded.** Likelihood medium, impact medium. `consult-project-layer` prints a catalog of ADRs, product headings and architecture headings; in a project with thirty documents the printout is long, the agent skims it, and the ADR it needed is the one it did not open. DR26 retired the method skill for exactly this reason. Today's design puts the two reads as the first two items of each skill's own `## Inputs` list so they cannot drop out over edits; one routing skill reintroduces the single point of failure.

6. **The rewrite is the size of the last one, and the reference project cannot exercise it.** Likelihood high, impact medium. Touching every `## Inputs` section, two formats, the thread layout, `close-thread`, `spec`, the implement skills and the reviews is a change comparable to the 05-1339 thread's sixteen tasks. This repository has no product behaviour, no architecture description beyond `suite/authoring/`, and has never drafted an ADR, so the new machinery ships without having been run once by the project that runs the method on itself. The CLI, already on hold, drifts further from a stage catalog that now names artifacts it has never seen.

7. **Rules-only `AGENTS.md` moves the reason away from the rule that needs it most.** Likelihood low, impact medium. Leitspace's transport rule ("No `dio` dependency") loses its paragraph to `docs/architecture/flutter-app.md`; an agent that reads only `AGENTS.md` obeys the rule but re-creates the exception ordering the paragraph explained. Both audits keep a one-line "because", which mitigates this; the failure is the pointer that is never followed.

**Early warning signs.**

| Signal | Predicts |
| --- | --- |
| A product document gains a "not yet built" section longer than its built section | 1 |
| A close report says "merged" for a living kind without listing removed or rewritten paragraphs | 2 |
| Two files share a heading, one under a thread's `delta/`, one under `docs/`, with different text | 3 |
| Threads with settled points and no `discussion` log lines | 4 |
| A skill body that names `consult-project-layer` and nothing about what to open | 5 |
| This repository closes a thread with every living-kind category `none` for the fourth time in a row | 6 |
| A rule in `AGENTS.md` whose pointer target does not exist | 7 |

**Mitigations the audits already contain or omit.**

| Failure | Mitigation | Source |
| --- | --- | --- |
| 1 | Give the living kinds an admission and pruning rule of their own, not only the ADR; make "planned versus implemented" a structural split rather than a marker | A ("explicitly distinguishes planned and implemented behavior"); neither audit gives the product kind a bar |
| 2 | Baseline check at close; land living changes as branch edits rather than staged copies | A; DR4 |
| 3 | One writer per living file per thread, stated in the write boundaries | Neither audit; `suite/authoring/side-effects.md` is where it would go |
| 4 | Sort by kind only at the moment a point would earn a durable record, not for every log line; keep the log line unconditional | B's "kind sort before the bar" can be read this way; neither says so |
| 5 | Keep the per-skill `## Inputs` opening pair; add kinds as items rather than a routing skill | DR26 |
| 6 | Pilot on Leitspace's existing 46 before touching the suite; A's disposition table and B's migration are that pilot | Both, as migration sketches |
| 7 | One-line because-clause plus pointer | Both |

**Inversion check.** What would guarantee failure: (1) a living kind with no admission bar and no pruning step; (2) a semantic merge at close without a baseline; (3) an optional close that is not run. Do any exist now? Yes: (3) exists in this repository today (ten of fourteen threads unclosed, and DR5 records the rejection of a forcing function); (1) is the shape of both audits' product kind as written; (2) is B's proposal as written and is what DR4 rejected.

## Fork checklist

Candidate decision forks for the discussion, phrased as questions with the options the audits give. No recommendation; this list is a coverage check for the discussion's closure and nothing more.

1. **Which artifact kinds get a method-owned durable home beyond ADRs, glossary and roadmap index?** A: product contracts per capability, release briefs, architecture overview and focused references, engineering handbook or module guides, design-source documentation, product decision records. B: product requirements per capability, architecture description per module, rules (`AGENTS.md`), handbook. Status quo (DR4): living documentation stays project-owned and the method defines no format.

2. **Does the method fix paths and formats for the living kinds, or define roles that projects map onto existing documents?** A: "roles and suggested locations; Antmay should allow projects to map them onto existing documentation." B: fixed paths `docs/product/`, `docs/architecture/`, `docs/handbook/`. DR9 precedent: fixed paths, no setup step.

3. **How does a thread carry changes to living documents?** B: a `delta/` folder mirroring the project layer, merged at close. A: direct edits to the canonical documents on the branch plus a target list the close verifies. Status quo: implement skills edit living documentation directly and nothing verifies.

4. **What replaces the binding test?** A: two questions ("needs a maintained home?", "which artifact owns it, and does it warrant a decision record?") plus a ten-item ADR checklist. B: a six-kind sort first, then a seven-item all-must-hold checklist. Alternative neither raised: keep the test and add a kind clause.

5. **Are Options considered and Consequences mandatory ADR sections?** B: yes, both. A: real alternatives and consequences are checklist items, "do not invent alternatives to fill a template"; "a concise record can satisfy all of it". Status quo: optional.

6. **Does an ADR carry lifecycle and applicability state?** A: proposed → accepted → superseded, acceptance evidence in the artifact, "accepted does not imply implemented", applicability where conditional. B and status quo: location is the only state; no status words in the body.

7. **May an ADR record a product decision?** B: yes, one decision container with a hard bar. A: architectural choices only, plus `docs/product/decisions/` created when needed. DR9: accepted the misnomer knowingly.

8. **How is a version-scoped statement handled?** A: present-tense decision plus explicit applicability and a revisit trigger, kept in the ADR; do not rename stems. B: never a version in name, stem or body; the revisit condition goes in Consequences; the deferral goes to the roadmap's Out-of-scope list.

9. **Where does release scope live, and does it survive the release?** A: a release brief, retained as history. B: the roadmap's Out-of-scope list, deleted with the index when the destination is reached.

10. **Do FR/AC identifiers stay in the spec?** A: remove mandatory numbering; keep acceptance checks distinguished by kind; optional scoped check ids for large reviews. B: keep FR/AC, add a banner declaring the ids thread-local.

11. **Where does traceability live?** B: a mandatory `## Acceptance` table in the implementation report, one row per criterion with evidence. A: the report "can map those checks"; verification method and evidence recorded per criterion, no fixed table.

12. **What may a commit message cite?** A: a fully qualified historical link as optional provenance, provided the message is self-contained. B: no spec, plan or task identifier and no thread path. Status quo: the factual progress block, with task identity, rides in the commit body.

13. **Does the method ship mechanical checks?** B: a lint recipe for the project gate. A: six structural checks (kinds, lifecycle metadata, broken references, thread-local identifiers in code, normative references to historical artifacts, missing declared document updates, stale baselines). 05-1339 constraint: "Conventions are the enforcement."

14. **How is normative strength marked in agent-facing documents?** A: each statement carries an explicit strength (rule, guideline, reference, rationale). B: the file fixes the register; no per-sentence keywords; word budgets for `AGENTS.md`.

15. **Does the method tell projects what their `AGENTS.md` holds?** Both audits: yes, rules and routing. Status quo: `docs/documentation-rules.md` governs this repository only; `README.md` says nothing to projects; DR9's project `AGENTS.md` method section never shipped as guidance.

16. **Do the consult skills merge?** B: one `consult-project-layer` with a fixed read order. A: a generated project-context catalog; the two skills unchanged. DR26: no method-level skill; the read order lives in each skill's `## Inputs`.

17. **Does the discussion keep the direct-request bypass for an ADR?** B: remove it; the user may request any delta kind and the agent sorts it. A: silent. Status quo: kept.

18. **What signals ADR volume?** B: more than three drafts in a thread flagged at closure; current ADRs against closed entries in the close report. A: no count; measure unresolved conflicts, duplicated requirements, stale current-state claims, reading burden.

19. **What happens to a record whose category changes?** A: a reclassification disposition, text and stem preserved, distinct from supersession. B: move the content and delete the record where its content already exists elsewhere (292038, 1301, 1437). Status quo: only supersession exists.

20. **What is the spec?** B and status quo: the thread's single design truth, citing the project layer. A: a change specification against maintained documents: baseline, intended delta, constraints, acceptance checks, freedoms, assumptions.

21. **How is kind made mechanically visible?** A: frontmatter metadata (kind, scope, lifecycle state, applicability, replacement) and a generated catalog. B: folder is kind, three lifecycles stated in one sentence.

22. **Who writes the living kinds?** B: the discussion drafts them in `delta/`, `close-thread` lands them. A: whoever changes the behaviour edits the canonical document within the thread's branch, `close-thread` verifies. Status quo: the implement skills, within implementation scope. DR5: the project layer has `close-thread` as its only writer.

23. **Does the roadmap-index rule change?** B: "Constraints that bind the threads opened from these entries are product requirements or ADRs, by kind." A: not addressed. Status quo: "are ADRs".

24. **What is the product kind called?** A: "product contract", colliding with the glossary's reserved word **contract**. B: "product requirements". The terms overview: PRD, Product Spec or Functional Spec, with "no universal distinction".

25. **Does the product kind get an admission or pruning rule of its own?** Neither audit gives one; the pre-mortem's first failure turns on it. Options the audits imply: A's "planned versus implemented" split; B's "not yet built" marker; none.

26. **Does the reference project change its own practice?** Neither audit addresses it. Options: this repository adopts the living kinds for its own rules and rationale (its settled points currently live in skill bodies, formats and maintainer documents, with rationale only in thread logs and one legacy `decisions.md`); or it stays as it is and the new machinery is exercised only by consuming projects.
