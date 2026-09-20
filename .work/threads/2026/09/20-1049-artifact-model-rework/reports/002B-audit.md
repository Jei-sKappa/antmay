# Audit of the Antmay artifact model, with Leitspace as the reference case

Date: 2026-09-19. Read-only analysis; nothing in Leitspace or Antmay was changed.

Sources read: `temp/mirrors/antmay/` (README, docs/, AGENTS.md, all shared formats, the discussion, spec, close-thread, consult-adrs, plan-strict, implement*, review-* skills), all 46 files in `docs/adr/`, `docs/glossary.md`, `AGENTS.md`, `FLUTTER.md` headings, the five threads under `.work/threads/2026/08/`, the roadmap index, and today's git history of `docs/adr/` and of the code comments.

---

## 0. Two facts that reframe the whole audit

**The 46 ADRs are not what the method produced. They are what a human filter left after the method produced 96.** `docs/adr/` was created today in four commits: `d779ec6` landed 96 records plus 5 superseded, retrofitted from the threads' legacy `decisions.md` files (DR1…DRn); `6311316` rebuilt the set "against the binding test" down to 46; `37f76e5` cut their prose by 21.7% and corrected claims that no longer matched the repository. The 50 records that were cut are the failure mode in raw form: `resetlinksentscreen-is-renamed-resetcodesentscreen`, `passwords-require-eight-characters-enforced-by-the-server`, `username-is-3-30-characters…`, `new-account-defaults-for-the-seven-persisted-preferences`, `dark-theme-is-in-scope`, `follow-widgetbook-s-officially-documented-setup`, `supabase-repositories-use-one-total-delegating-catch-by-default`, `no-premise-validation-is-required-before-building`, `ci-and-crash-reporting-are-postponed…`, `home-explore-and-library-are-unstyled-placeholders…`. Renames, values, conventions, scope, process, UI status: all written as decisions because the method has one durable container.

**The FR/AC leak was real and has already been cleaned.** Commit `0f88d44` removed 515 lines carrying `FR-n`/`AC-n.m`/task-number citations from Dart and SQL comments and test names. Today the code has zero. Commits `9e228e6`/`e603d70` "repointed" comments at ADR stems instead: SQL now cites ADR stems 55 times. `5a3ae2f` then removed all `AGENTS.md §n` citations from code because "AGENTS.md is rewritten freely". So the project has already discovered, by hand, the three citation classes the method never distinguished: thread artifacts (never cite), rules (unstable anchors), ADRs (stable stems).

Both facts mean the method has no guard. Everything below is about building the guard into the method rather than repeating today's cleanup after every thread.

---

## 1. Diagnosis

### 1.1 The 46 ADRs, classified

Legend. **A** genuine decision: a real fork, a named rejected alternative, not readable off the code or design, costly to reverse. **P** product scope / roadmap statement. **F** forward requirement: a commitment for something not yet built (a spec in waiting). **D** design description: readable off the schema, the design frames, or the code. **C** convention / guideline for how agents or engineers work. **V** value, definition or micro-decision (glossary row, test, comment). Dominant kind first; a kernel in brackets is the part that would survive as an ADR.

| # | Stem (abridged) | Kind | Note |
|---|---|---|---|
| 1 | 0842 revealed and hidden both first-class | A/V | Product principle plus two glossary terms. Kernel: "no lesser mode". |
| 2 | 0843 three surfaces, review loop confined to Library | A | Genuine. Carries status noise ("tabs are still placeholders"). |
| 3 | 0844 knowledge model and schedule separate | A | Strong. Rejected alternative, structural consequence. |
| 4 | 0845 wrong feed answer offers a save | A/F | Kernel (auto-save rejected) is a decision; the rest is behaviour of an unbuilt feed. |
| 5 | 0846 Explore is search not a second feed | D/P | Readable off the design frames. |
| 6 | 0847 four media types reserved; sourcing omits rights-encumbered | D+P | Enum fact (readable off schema) glued to a content strategy statement. |
| 7 | 0848 moderation deferred; provenance from v1 | P [A] | Deferral is scope; kernel "provenance columns from day one" is a decision. Carries a hazard note. |
| 8 | 0849 binary self-review; multiple choice excluded | A | Strong. Stem says "swipe", body says buttons: frozen stem, rewritten content. |
| 9 | 0850 interest declared, not inferred | A | Genuine product-architecture stance. |
| 10 | 0851 single recursive Topic entity | A/V | Strong. Half the body is glossary policy ("tag" survives only as interface word). |
| 11 | 0852 impression-normalised ranking, exploration budget | F | A ranking policy for a ranker that does not exist. Requirements, not a decision record. |
| 12 | 0853 live cards are fields, not a mode | D+F | Column inventory plus binding rules for a deferred runtime. |
| 13 | 0854 sets unit of authorship, cards of consumption | A | Strong. |
| 14 | 0855 schedulability vs passive viability | A | Genuine. |
| 15 | 0856 stable card id; author invalidation toggle | A+F | Kernel genuine; explicitly "unresolved" transition is a spec placeholder. |
| 16 | 0857 publishing is a client of set-creation API | A | Target architecture, unbuilt; still a real fork. |
| 17 | 0858 no official set; capability flags | A | Genuine. |
| 18 | 0859 v1 social layer creator-oriented; learning data private | P+A | Social scope is roadmap; "learning data structurally private" is a decision. |
| 19 | 0900 tombstoning | A | Strong. |
| 20 | 0901 account deletion anonymises in place | A+F | Genuine; carries a legal requirement (ToS clause) and three unbuilt parts. |
| 21 | 0902 hard purge distinct | A | Strong. |
| 22 | 0903 feed answers graded identically | A+F | Genuine; the guards it mandates for Home are requirements. |
| 23 | 292038 HTML screen map is design source of truth | C | Repository convention: which file wins. Belongs in `assets/design/README.md`. |
| 24 | 301301 v1 scope is the designed surface, closed alpha | P | Pure scope. Duplicates the roadmap's Destination and Out of scope. |
| 25 | 301302 Postgres-first, math in Dart, no Edge Functions | A | The most Nygard-like record in the set. |
| 26 | 301303 FSRS via official package; Again/Good mapping | A | Genuine. |
| 27 | 301304 testing is BLoC-centric, no coverage mandate | C | Testing policy. Handbook material. |
| 28 | 301305 online-required, optimistic grading, no local DB | A+F | Kernel genuine; optimistic grading half is unbuilt behaviour. |
| 29 | 301426 single answer field, no reserved columns | A | Small but genuine (the "why not reserve" is not readable off code). |
| 30 | 301427 knowledge model is a counters table | D [A] | Schema description; kernel "no estimator state stored" is a decision. |
| 31 | 301428 signals are counters only | D [A] | Same shape as 30. |
| 32 | 301429 pipeline card fields | D [A] | Column list plus a reconstructibility rule worth one paragraph. |
| 33 | 301430 lifecycle is deleted_at plus visibility enum | D [A] | Readable off schema; kernel "no draft state" is a decision. |
| 34 | 301431 library table is the sole save state | A | Strong. |
| 35 | 301432 profile shelf is a definer-gated aggregate | F | Unbuilt, with an unresolved conflict against the definer budget. A pending decision, not a record. |
| 36 | 301433 field placement follows readership | A/C | A genuine rule with rationale; reads as a convention. |
| 37 | 301434 privatization is retroactive | A | Strong. |
| 38 | 301435 no separate learning-data table | A | A rejected proposal, correctly recorded. |
| 39 | 301436 profile shells have no handle or route | A/D | Half decision, half description of the scrub. |
| 40 | 301437 learner count definition | V | A definition. Already a glossary row. |
| 41 | 301438 deletion leaves private_profile untouched | V | Micro-decision: one sentence in 0901, one pgTAP test. |
| 42 | 301439 six-digit codes, never links | A | Genuine. |
| 43 | 301440 federated sign-in deferred, "coming soon" | P+F | Scope plus a requirement on a future thread. |
| 44 | 301441 environments by entrypoint, values in code | C | Engineering convention. |
| 45 | 301442 rejection proving desired state is success | C | A BLoC pattern. Handbook material. |
| 46 | 301443 errors inline or error-toned toast | C/D | UX convention for the design system. |

**Tally by dominant kind**

| Kind | Count | Share |
|---|---|---|
| A: genuine decision | 25 | 54% |
| D: design description | 7 | 15% |
| C: convention / guideline | 5 | 11% |
| P: scope / roadmap | 5 | 11% |
| F: forward requirement | 3 | 7% |
| V: value / definition / micro | 1 | 2% |

Three cross-cutting measurements matter more than the tally:

- **29 of 46** contain status language: "not yet built", "decided, not built", "binds the thread that…", "does not exist yet", "left open", "unresolved". Immutable decision records are carrying a forward-requirements backlog and an implementation-status board.
- **34 of 46** name schema objects in backticks. The records double as the schema's design description because no such document exists.
- **27 of 46** name a rejected alternative. 19 do not, and nothing in the format required one.
- Every record was rewritten today (2 or 3 commits each) to track implementation state. The format says the landed copy is "unaltered" and immutable. In practice the records are living documents, because they are the only place the current design is described.

Conclusion on the ADRs: the human filter got the count from 96 to 46; a strict decision bar leaves roughly 20 to 25, and about 8 of those need their status and inventory sentences moved out. The problem is not the authors. Every "non-decision" in the table is durable, non-obvious information a later thread needs; it simply had nowhere else to land.

### 1.2 `AGENTS.md`

4,268 words. Counted on the whole file: 67 sentences carry MUST/never/no/do-not; 12 carry prefer/should/may; 9 carry an explicit because-clause. But the counts hide the real mix. Section 3.3 item 5 (the transport deviation) is about 600 words containing, in one paragraph run: a rule ("No `dio` dependency"), an observed fact about SDK behaviour ("`postgrest` and `storage_client` do not wrap a connection failure, so `http.ClientException` arrives raw"), a rationale ("the app is online-required, which makes offline an outcome of every repository call"), a citation of an ADR stem, and an implementation detail ("its arm is ordered first because that type extends `ClientException`"). Section 3.3 item 7 is a bug post-mortem written as a rule. Section 4.4 through 4.8 are a description of the schema's cascade, privilege and storage model: information, with rules embedded.

Duplication with ADRs is direct: §3.3 item 5's NetworkException paragraph restates 301305; §4.7's definer budget restates the conflict 301432 records; §3.2 "Copy ownership" is the body of a since-deleted ADR (`leitspace-ui-owns-and-localizes-its-fixed-design-copy…`). The spec for thread 02 made "`AGENTS.md` §3.1 and §3.2 are amended per decisions.md DR12" a deliverable, so the same decision was written twice, in two registers, by design.

### 1.3 The specs

Sizes: foundation 44 KB (95 FR/AC lines), data-model 68 KB (65), app-shell 57 KB (68). Each is well-formed by the spec skill's contract: seven elements, FR/AC block, degrees of freedom, inferences. The shape problems:

- **FR headers cite historical artifacts across threads.** Data-model FR-2: "(decisions.md DR11; foundation FR-7)". App-shell FR-7: "(decisions.md DR7, DR10, DR19, DR20; CB1 DR18, DR24, DR25)". The method forbids exactly this, but at authoring time no ADR existed (they were retrofitted today), so the spec cited the only record that did.
- **The spec is where the product's durable behaviour was written.** The foundation spec is a 44 KB product requirements document. It is declared historical the moment its thread closes. The 29 "decided, not built" ADRs are the pieces of it someone knew a later thread would need and had to rescue.
- **The AC block is the thread's test plan** (AC-7.2 names the debounce, the stale-response guard, the submit gate, and the mocked repository). That is legitimate, and it is why the ids ended up in test names: the tests were written from it.

### 1.4 Where the boundaries blur today

| Kind of content | Where it actually lives today | Where the method says it lives |
|---|---|---|
| Architecture decision | `docs/adr/` (25 of 46) | `docs/adr/` |
| Product model / behaviour rules | `docs/adr/` (as A+F), old `spec.md`s (historical) | nowhere durable |
| Scope for a release | `docs/adr/` 301301, 0848, 0859, 1440 and the roadmap's Out-of-scope list (duplicated) | roadmap index |
| Current design description | `docs/adr/` bodies (34 name schema), `AGENTS.md` §4.4–4.8, code comments | "living documentation" (a glossary term with no folder and no skill writing it) |
| Rules for agents | `AGENTS.md`, `FLUTTER.md`, and 5 ADRs | `AGENTS.md` |
| Rationale | scattered: ADRs, `AGENTS.md` because-clauses, code comments citing stems | ADR body |
| Implementation status | ADR bodies ("not built yet"), roadmap closing lines | roadmap closing lines |
| Definitions | `docs/glossary.md` (88 rows) plus 2 ADRs | glossary |

---

## 2. Root cause in the method

The records are not the authors' failure. Nine prescriptions in Antmay push toward them.

1. **The project layer has exactly three containers: ADR, glossary, roadmap.** Antmay glossary, "project layer": "`docs/adr/`, `docs/glossary.md`, and the roadmap indexes". Anything durable that is neither a term nor a roadmap entry must become an ADR or die with the thread. Requirements, design descriptions and conventions are pressed into ADR shape by construction.

2. **The binding test selects for "durable and non-obvious", not for "decision".** Discussion skill: "A settled point passes the binding test when a later thread could build against it incorrectly if not told, and could not read it off the code." A password rule, a default, a rename, a testing policy and a scope statement all pass. The test has no fork clause (was there a real alternative?), no kind clause (is this a decision, or a rule, requirement, definition?), and no reversibility clause. It is a necessary condition presented as sufficient.

3. **The test is applied per settled point, at discussion time, before anything exists.** In a greenfield project the discussion phase settles the whole product model. Every settled point that passes becomes a record. Nothing ties ADR volume to built architecture, and the discussion skill adds a bypass: "The user may also ask for a record directly, without the test."

4. **The roadmap format prescribes ADRs as the cross-thread requirements carrier.** `roadmap-index.md`, Rules: "Constraints that bind the threads opened from these entries are ADRs." That sentence is the direct origin of the 29 "binds the thread that builds it" records.

5. **The ADR format makes the proof of a fork optional.** `adr.md`: "A single paragraph satisfies that. Further sections — considered options, consequences, and scope … appear only when they carry something the required content does not." Nygard requires Consequences; MADR requires Considered Options. Antmay made both optional, so 19 of 46 records name no alternative.

6. **The spec is declared the "single design truth" and then declared historical.** Spec skill: "the thread's single design truth". Documentation rules: "Thread-local material stays in its thread … never cited outside." Both are right individually; together they mean the product's behavioural truth has a lifetime of one thread. Authors compensate by writing "decided, not built" ADRs and by citing `decisions.md DR8` from the next spec.

7. **Traceability is demanded without a designated home.** Spec skill: "Traceability — each AC traces back to the requirement … so a reviewer can follow each check to its origin." Review-implementation: the spec's "acceptance criteria are the contract the delivered work answers to." Plan-compliance reviewer: "Each criterion: SATISFIED / MISSING / PARTIAL." The implement skills say where run-state paths must not be cited (`.runs/`) and say nothing about FR/AC ids. An agent asked to prove traceability writes the id into the nearest durable surface: the test name. The report, the correct home, is not named as the only home.

8. **`AGENTS.md` is defined as a mixed register.** Antmay documentation rules: "`AGENTS.md` files are durable working memory for agents … preserve non-obvious constraints, rationale, workflows, and rules." Four kinds in one sentence, no register distinction, no size ceiling, and the spec skill's "Living documents" practice makes amending it a thread deliverable, so decisions get written there as well as in `adr/`.

9. **"Living documentation" exists as a term and nowhere else.** Antmay glossary: "Documentation describing the system as it currently exists — READMEs, architecture references, runbooks, conventions. It changes within implementation scope." No path, no format, no skill writes it, `close-thread` does not land it, `consult-*` does not read it. So the current-state description leaked into ADR bodies, which then had to be edited to stay true, which breaks their immutability.

One more, smaller: documentation rules say "An ADR may be cited by its stem … from code, tests, commit messages" without saying *for what*. Stems are stable, contents are not (all 46 changed today). Citing a stem for "what the system does" rots; citing it for "why this looks odd" does not.

---

## 3. Proposed artifact model

### 3.1 Options

**Option 1: keep the three containers, raise the ADR bar, push the rest into `AGENTS.md`.** Smallest change: a checklist in the discussion skill and the ADR format. Trade-off: `AGENTS.md` (already 4,268 words) becomes the dumping ground instead; requirements for unbuilt behaviour still have no home; the roadmap rule still points at ADRs. Rejected: it moves the problem.

**Option 2: one living design document per module (RFC style) plus ADRs.** Each module gets a `DESIGN.md` holding requirements, description and rationale together; ADRs record the forks. Trade-off: fewer files, but requirements and description are mixed again in one register, and the RFC grows without bound exactly as the ADR folder did. Rejected for the same reason the current state fails: one container, several kinds.

**Option 3 (recommended): a typed project layer, one folder per kind, Diátaxis-style, with the thread's delta mirroring it.** Six kinds, each with its own lifecycle, citation rule and reader:

| Kind | Path | Lifecycle | Cited by | Agent reads it when |
|---|---|---|---|---|
| Rules for agents | `AGENTS.md` (root + module) | living, rules only, imperative, small | never from code (unstable anchors) | always, first |
| Glossary | `docs/glossary.md` | living | by term | always |
| Architecture description | `docs/architecture/<module>.md` | living, changes within implementation scope | path + heading | before touching that module |
| Product requirements | `docs/product/<capability>.md` | living, present tense, marks "not yet built" explicitly | path + heading (stable slugs), never numeric ids | before specifying or building that capability |
| Decisions | `docs/adr/` | immutable after close; superseded by a new record | stem, for rationale only | when the catalog says a record touches the work |
| Roadmap | `.work/roadmaps/` | living, deleted when reached | never | when opening or closing a thread |

What is new: **`docs/architecture/`** (the "living documentation" the glossary already names, given a home) and **`docs/product/`** (the durable home for behaviour that outlives a thread, including behaviour decided before it is built). What changes: **ADR** gets a hard bar and a mandatory Options and Consequences section. **`AGENTS.md`** becomes rules only. **Roadmap** absorbs the scope ADRs and stops pointing at ADRs for constraints.

What is dropped or merged in Antmay:

- The thread's `adr/` folder becomes **`delta/`**, mirroring the project layer: `delta/adr/`, `delta/product/`, `delta/architecture/`, `delta/rules.md`, `delta/glossary.md`. `close-thread` lands each kind into its folder (copy for ADRs; merge for the living kinds, exactly as the glossary merge already works).
- The spec's "Living documents" section is kept but retargeted: it lists the delta the thread will land, by kind.
- The legacy `decisions.md` / `support/decisions.md` disappear (already migrated).
- The `consult-adrs` and `consult-glossary` skills become one **`consult-project-layer`** that prints the ADR catalog, and opens the architecture and product documents whose headings touch the work.
- The roadmap rule "Constraints that bind the threads opened from these entries are ADRs" becomes "are product requirements or ADRs, by kind".

Why product requirements are a living document and not the spec: a spec is one thread's cut of the work; a requirement is the product's standing behaviour. Writing requirements once in `docs/product/feed.md` under a stable heading ("Grading a saved card in the feed") lets three threads build against the same sentence and lets a fourth amend it. The FR/AC block in the spec then becomes what it already is in practice: the thread's checkable slice of those requirements, plus the thread's test plan.

### 3.2 Making the difference mechanically obvious to an agent

- **Folder is kind.** No frontmatter status, no kind field: `docs/adr/` is immutable, everything else under `docs/` is living, everything under `.work/` is historical. One sentence in `AGENTS.md` states the three lifecycles.
- **Citation rule is per kind, and linted.** ADR stems may be cited from code for rationale; `docs/` paths may be cited from other docs; nothing under `.work/` and no `AGENTS.md` section number may be cited from anywhere durable. A ten-line script in the gate (`rg -n '\b(FR|AC)-[0-9]|DR[0-9]+\b|AGENTS\.md §|\.work/threads' app packages supabase docs`) turns today's manual cleanup into a failing check.
- **Read order is fixed and short.** `AGENTS.md` → glossary → `docs/architecture/<module>` for the touched module → `docs/product/<capability>` for the touched capability → ADR catalog, open what touches the work → the thread. `consult-project-layer` prints exactly that.
- **Register is signalled by the file, not the sentence.** A sentence in `AGENTS.md` is a rule; a sentence in `docs/architecture/` is a fact; a sentence in `docs/product/` is a requirement; an ADR body explains a choice. An agent does not need RFC 2119 keywords to know how to treat a line.

---

## 4. Each symptom, addressed

### 4.1 What qualifies as an ADR

A settled point becomes an ADR only if **all** of these hold:

1. **A fork existed.** At least one alternative a competent engineer would plausibly have chosen is named, with why it lost. If no alternative can be named, it is a fact or a rule, not a decision.
2. **Not readable off the code or the design.** The choice, or the exclusion it makes, cannot be recovered by reading the schema, the frames or the source. A column list fails; "why there is no estimator column" passes.
3. **Costly to reverse or cross-cutting.** Reversing it touches more than one module or thread, or needs a migration, backfill or data loss. A value (8 characters, 3 to 30) fails.
4. **Stated as a stance in the present tense, with no status words.** No "not yet built", "binds the thread that", "so far only". Status lives in the roadmap; the current design lives in `docs/architecture/`.
5. **Has a named consequence someone lives with.** A cost, a constraint on later work, or a hazard.
6. **Is not another kind in disguise.** Not a definition (glossary), not a scope statement (roadmap), not a rule for agents (`AGENTS.md`), not a description of what exists (architecture), not behaviour of a feature (product requirements).
7. **If it defers something, the revisit trigger is a condition, never a version.** "Offline support is not built; revisit when the alpha cohort exceeds N or a user reports loss of a graded review" passes. "v1 is online-required" fails.

The ADR format gains two mandatory sections, `## Options considered` (one line per rejected option with the reason) and `## Consequences`, so the format itself enforces items 1 and 5. The discussion skill's bypass ("the user may ask for a record directly, without the test") is removed; the user may ask for any *delta* kind directly, and the agent sorts it by the checklist.

### 4.2 Version-scoped statements

You are right that "v1 is X" is a smell, and slightly wrong about why. A decision record describes the current stance, so the version tag adds nothing: when v2 changes the stance the record is superseded regardless of what its title said. That part of your model holds.

What you are missing is that some of those records carry a legitimate content that is not the version but the **deferral with its sunset**. 301305's real decision is "no local database, no sync layer; the SDK session is the only on-device state", and the useful extra is "here is what would make us revisit: a cohort with offline expectations, or a lost graded review". That is a decision with a revisit condition, not a version-scoped decision. Nygard puts it under Consequences; MADR under Confirmation. Antmay has no slot for it, so authors reached for "v1".

Disposition:

- A record whose whole content is scope (301301) is not a decision: delete, the roadmap's Destination and Out-of-scope list already hold it.
- A record that mixes a deferral with a stance (0848, 0859, 1305, 1440): keep the stance as the ADR in the present tense, move the deferral to the roadmap's Out-of-scope list, and put the revisit condition in the ADR's Consequences.
- Never write a version in a title, a stem, or a body. Write the condition.

### 4.3 FR/AC ids and the spec

Disagreement with the premise first: FR/AC ids belong in the spec. The thread's plan, its report and its reviews need a checkable contract, and numeric ids are the cheapest one. What does not belong is the id in anything that outlives the thread, and the method's failure is that it demanded traceability without saying where traceability lives.

Fixes, in order of leverage:

1. **The implementation report is the only home of traceability.** The report gets a mandatory `## Acceptance` table: one row per AC, the evidence (test name, file, manual check). `review-implementation` reads that table. Tests are named for the behaviour they prove, never for the criterion number.
2. **Write boundary in every implement skill:** "No spec, plan or task identifier (`FR-`, `AC-`, `DR`, task numbers) and no thread path appears in code, comments, test names, migrations, or commit messages. State the rule in prose, or cite an ADR stem for the reason." Today the skills say this only for `.runs/`.
3. **A lint in the project gate** (the `rg` line in 3.2) so the rule fails a build rather than relying on the agent's memory.
4. **Spec headers cite the project layer, never other threads.** "(decisions.md DR11; foundation FR-7)" becomes "(`docs/product/topics.md#one-vocabulary`; ADR 2608240851)". The spec skill's Inputs already read the project layer; the rule is that a citation resolves outside the thread or is not written.
5. **Behaviour that outlives the thread is written into `docs/product/` as part of the spec's delta**, in present tense, marked "not yet built" where it is a commitment. The spec's ACs then trace to a stable heading, not to a paragraph that dies at close.

### 4.4 Splitting `AGENTS.md`

Three registers, three homes:

- **Rules** stay in `AGENTS.md`. One imperative sentence each, an optional one-line because-clause, and a pointer (ADR stem or architecture heading) where the reason is longer. Target: under 1,500 words at the root, under 800 per module section. A rule that a gate can enforce (lint, pgTAP invariant, dependency check) says which gate enforces it.
- **Information** ("how the transport maps exceptions", "the user-state cascade", "the definer inventory") moves to `docs/architecture/flutter-app.md` and `docs/architecture/supabase.md`, and changes within implementation scope as Antmay's own glossary already says living documentation should.
- **Guidelines and patterns** ("rejection proving desired state is success", "test what scrolling cannot reveal", "event transformers are the BLoC's guarantee") move to a handbook file per module (`docs/handbook/flutter-app.md`), or, where they are project-agnostic, into `FLUTTER.md`. They are advice with a reason; agents read them when writing that kind of code, not on every turn.

Mechanically: `AGENTS.md` carries only sentences an agent could violate. If a sentence cannot be violated, it is information and goes to architecture. If violating it is sometimes right, it is a guideline and goes to the handbook.

### 4.5 Keeping ADR volume proportionate

- **Kind sort before the bar.** Every settled point is first sorted into one of the six kinds; only the ones sorted "decision" reach the checklist. Most of the 96 would never have reached it.
- **A per-thread ceiling that triggers review, not a limit.** More than three draft ADRs in one thread is a signal the delta is mis-sorted; the discussion skill says so at closure.
- **A portfolio heuristic in `close-thread`'s report:** count of current ADRs against count of closed roadmap entries. For Leitspace, 20 to 25 records at entry 2 is defensible for a greenfield product whose whole model was designed up front; 46 is high; 96 was the method talking.
- **No status in ADRs.** The moment an ADR needs the sentence "not built yet", the content is a requirement and moves. This single rule removes 29 of the current records' reasons to be edited.

---

## 5. Migration sketch for Leitspace

Not to be executed now. It is what the fixed method would produce from today's 46.

### 5.1 Records that stay as ADRs (rewritten: present tense, Options considered, Consequences, no status, no schema inventory)

| Keep | Absorbs | Note |
|---|---|---|
| 0843 three surfaces, review loop confined to Library | 0846 | Home is the only feed; Explore is search. |
| 0844 knowledge model and schedule are separate | | |
| 0849 binary self-review, multiple choice excluded | | Retitle to drop "swipe"; stem stays. |
| 0850 interest declared, not inferred | | |
| 0851 single Topic entity | | Glossary policy sentences move to the glossary. |
| 0854 sets author, cards consume | | |
| 0855 schedulability vs passive viability | | |
| 0856 stable card id; author invalidation toggle | | The unresolved transition moves to `docs/product/authoring.md` as an open item. |
| 0858 no official content; capability flags | 0857, provenance kernel of 0848 | One "publishing and provenance model" record. |
| 0859 → retitled "individual learning data is structurally private" | privacy half of 1433 | Social scope moves to roadmap. |
| 0900 tombstoning | | |
| 0901 account deletion anonymises in place | 1436, 1438 | One deletion record; ToS clause becomes a requirement in `docs/product/accounts.md`. |
| 0902 hard purge is distinct | | |
| 0903 feed answers graded identically | 0845 | One "answering in the feed" record; Home guards move to product requirements. |
| 1302 Postgres-first, math in Dart, no Edge Functions | | |
| 1303 FSRS via official package | | |
| 1305 → retitled "no local database or sync layer" | | Optimistic grading moves to `docs/product/study.md`; revisit condition in Consequences. |
| 1426 single answer field | | |
| 1427 → retitled "learning state is the review log plus counters; no second durable schedule" | 1428, 1435 | One record for the three counters/log decisions. |
| 1431 library table is the sole save state | | |
| 1433 field placement follows readership | | |
| 1434 privatization is retroactive | | |
| 1439 six-digit codes, never links | | |

Result: **23 ADRs.**

### 5.2 Records that move

| Record | Destination |
|---|---|
| 0842 revealed/hidden peers | Glossary rows (already there) plus a principle paragraph in `docs/product/cards.md`. |
| 0847 media types and sourcing | Enum to `docs/architecture/supabase.md`; sourcing to roadmap Out-of-scope. |
| 0848 moderation deferral | Roadmap Out-of-scope (already there); hazard note to `docs/product/feed.md`. |
| 0852 ranking policy | `docs/product/feed.md#ranking`, marked not yet built. |
| 0853 live cards | Columns to architecture; behaviour to `docs/product/live-cards.md`, not yet built. |
| 292038 HTML screen map wins | `assets/design/README.md` plus one rule line in `AGENTS.md` §3.2. Delete. |
| 1301 v1 scope | Roadmap Destination and Out-of-scope already carry it. Delete. |
| 1304 testing policy | `docs/handbook/flutter-app.md`; the one enforceable line ("pgTAP for every policy and RPC") is already an `AGENTS.md` rule. |
| 1429 pipeline card fields | Columns to architecture; the reconstructibility rule to `docs/product/cards.md`. |
| 1430 lifecycle and visibility | Architecture; "no draft state" as one sentence in `docs/product/authoring.md`. |
| 1432 profile shelf | `docs/product/profile.md`, not yet built, with the definer-budget conflict as an open item for the thread that builds it. |
| 1437 learner count | Glossary already has it. Delete. |
| 1440 federated sign-in | Roadmap Out-of-scope; the handle-step requirement to `docs/product/accounts.md`. |
| 1441 environments by entrypoint | `AGENTS.md` §3.3 rule with a because-clause. |
| 1442 rejection-as-success pattern | `docs/handbook/flutter-app.md`. |
| 1443 error surface | `docs/product/design-system.md` or the design README; one rule line in `AGENTS.md` §3.2. |

### 5.3 What `AGENTS.md` becomes

Roughly a third of its current size. §1 layout and cross-module rule stay. §2 principles move to the handbook. §3.1 dependency table stays (a rule a gate could enforce). §3.2 keeps four rules: placement, ViewData boundary, copy ownership, Widgetbook use case per state; the paragraphs explaining slang generation and the compile-time behaviour of missing keys move to architecture. §3.3 keeps items 1, 2, 4 and the one-line form of 5, 6 and 8; the transport exposition, the `NetworkException` mechanics and item 7's post-mortem move to architecture and handbook. §4 keeps 4.1, 4.2, the pgTAP obligation, the privilege rules of 4.6 and 4.7 as rules, and the gate order; the cascade and storage descriptions of 4.4, 4.5 and 4.8 move to `docs/architecture/supabase.md`. §5 shrinks to the read order and the three lifecycles.

### 5.4 What changes in `.work/threads/`

- `adr/` becomes `delta/` with `adr/`, `product/`, `architecture/`, `rules.md`, `glossary.md`. Existing closed threads are untouched (historical).
- `spec.md` keeps its FR/AC block and gains a one-line banner at the top of that block: "Ids are thread-local; they appear in the plan, the report and the reviews of this thread, and nowhere else."
- `implementations/*/report.md` gains the mandatory `## Acceptance` table.
- `support/decisions.md` stops being produced (already legacy).
- The roadmap's Out-of-scope list is the only place scope is written.

---

## 6. Draft issue for the Antmay repository

**Title:** The project layer has one durable container, so everything durable becomes an ADR

**Problem**

Antmay's project layer holds three artifact kinds: ADRs, the glossary and roadmap indexes. Every settled point that a later thread needs and that is not a term or a roadmap entry must therefore become an ADR, whatever kind of thing it is. The binding test ("a later thread could build against it incorrectly if not told, and could not read it off the code") selects for durable and non-obvious, not for decision; it has no fork, kind or reversibility clause. The ADR format makes Options and Consequences optional. The roadmap format says "Constraints that bind the threads opened from these entries are ADRs". The spec is the "single design truth" and is historical at close, so behaviour that outlives a thread has no home. The spec demands FR/AC traceability without naming the report as its only home, and the implement skills forbid citing `.runs/` paths but not spec ids. "Living documentation" is a glossary term with no path, no format and no skill. `AGENTS.md` is defined as holding "constraints, rationale, workflows, and rules" in one register.

**Evidence from Leitspace (a greenfield product, two roadmap entries closed)**

- The method produced 96 ADRs plus 5 superseded from five threads. A manual pass against the binding test cut them to 46; a strict decision bar leaves about 23. Cut records included a screen rename, a password length, a preferences default list, "dark theme is in scope", "follow Widgetbook's documented setup" and "no premise validation is required before building".
- Of the 46 that remain, 29 carry status language ("not yet built", "binds the thread that…"), 34 list schema objects, 19 name no rejected alternative, and all 46 were rewritten in the same day to track implementation state, against the format's immutability.
- Scope statements exist twice: as ADRs (`v1-scope-is-…`, `v1-is-online-required-…`, `moderation-is-deferred-…`) and as the roadmap's Out-of-scope list.
- Specs cite historical artifacts across threads in their FR headers ("decisions.md DR11; foundation FR-7") because no project-layer record existed at authoring time.
- 515 lines of `FR-`/`AC-`/task-number citations had to be removed from Dart and SQL comments and test names in one cleanup commit; a second commit removed every `AGENTS.md §n` citation because the file is rewritten freely; SQL now cites ADR stems 55 times.
- `AGENTS.md` is 4,268 words mixing rules, SDK behaviour observations, rationale and a bug post-mortem; three of its sections restate ADR bodies.

**Proposed changes**

1. **Type the project layer.** Add `docs/architecture/<module>.md` (living description; the home of "living documentation") and `docs/product/<capability>.md` (living requirements, present tense, "not yet built" marked). Define one lifecycle and one citation rule per kind: `docs/adr/` immutable, cited by stem for rationale only; other `docs/` living, cited by path and heading; `.work/` historical, never cited; `AGENTS.md` never cited by section.
2. **Replace the thread's `adr/` with `delta/`** mirroring the project layer (`adr/`, `product/`, `architecture/`, `rules.md`, `glossary.md`). `close-thread` copies ADRs and merges the living kinds the way it merges the glossary today.
3. **Raise the ADR bar.** In the discussion skill, sort each settled point by kind first; only "decision" reaches the test. Replace the binding test with a seven-item checklist: a named rejected alternative; not readable off code or design; costly to reverse or cross-cutting; present tense with no status words; a named consequence; not another kind in disguise; deferrals carry a revisit condition, never a version. Remove the "record directly, without the test" bypass. Flag more than three drafts per thread at closure.
4. **Make Options considered and Consequences mandatory in the ADR format.** Forbid status language and version tags in name, stem and body.
5. **Fix the roadmap rule** to "Constraints that bind the threads opened from these entries are product requirements or ADRs, by kind", and make the Out-of-scope list the only place scope is written.
6. **Give traceability a home.** Add a mandatory `## Acceptance` table to the implementation report (AC → evidence). Add to every implement skill's write boundary: no spec, plan or task identifier and no thread path in code, comments, test names, migrations or commit messages. Add a lint recipe for the project gate. Require spec citations to resolve outside the thread (project layer) or not be written.
7. **Redefine `AGENTS.md`** in the documentation rules as rules only: one imperative sentence each, optional one-line reason, pointer for the long rationale; information goes to `docs/architecture/`, guidelines to a handbook. State the test: a sentence an agent cannot violate is not a rule.
8. **Merge `consult-adrs` and `consult-glossary` into `consult-project-layer`** with a fixed read order: `AGENTS.md`, glossary, architecture for the touched module, product for the touched capability, ADR catalog, then the thread.

**Out of scope for this issue:** the CLI (on hold), migrating any existing project's records.
