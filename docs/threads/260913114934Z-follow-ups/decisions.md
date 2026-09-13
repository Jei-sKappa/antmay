# Decision log

## DR1: Retire the primitives group in favour of instruction files

Context: The suite holds four model-invoked primitives under `skills/primitives/` — `allocate-thread`, `emit-pending-decisions`, `emit-pending-review`, `update-implementation-report` — each a bounded building block that entry points invoke by name. `allocate-thread` has one caller (`open-thread`); the other three are read by several entry points (10, 3, and 3 respectively). None of them is useful outside the entry point that reaches it, so none fits the definition of a skill the model should be free to call at its own discretion.

Decision: The `skills/primitives/` group is deleted. Its content becomes instruction files: a new shared folder `shared/references/instructions/` holds `emit-pending-decisions.md`, `emit-pending-review.md`, and `write-implementation-report.md`, each declared in `shared/manifest.yaml` by the entry points that need it and synced into their `references/` like formats are. Each former caller replaces the `/skill-name` invocation with a pointer to its synced copy at the step where the invocation stood. `allocate-thread` becomes a skill-local reference of `open-thread` (`open-thread/references/allocate-thread.md`), since it has one reader. The four `agents/openai.yaml` files, the marketplace entries, the README `## Primitives` section, the four commit scopes in `.vscode/settings.json`, and every mention of the "primitive" role in `suite/AGENTS.md` and `suite/skill-authoring.md` go with the group. An instruction file carries only what the reading agent does at that step; the caller-precondition-and-refuse blocks the primitives opened with are dropped, because the author of the artifact is now the skill reading the file.

Rationale: A skill invocation buys isolation and a description-routed entry, and none of these four needs either — each is reached from exactly the step that would otherwise hold its text. Instruction files give the same progressive disclosure at lower cost and remove a category that carried a misleading name. `update-implementation-report` earns a shared instruction file rather than folding into the format because the three implement skills read it at one specific moment, the end of the run, which is the step-based disclosure DR2 establishes; its content is the authoring behaviour, not the artifact shape, which stays in `formats/implementation-report.md`.

## DR2: Skill bodies hold immediate instructions plus conditional and step-based pointers

Scope: `suite/skill-authoring.md` (`## Progressive disclosure`) and every skill body

Context: A `SKILL.md` body is loaded whole on every invocation, while a reference file is read on demand. The authoring guidance recognised one reason to move content into a reference — a conditional block most runs do not meet — and admitted a large main-path block only as a size-driven exception.

Decision: A skill body is structured as exactly three kinds of content: (1) instructions and information the agent needs immediately, inline; (2) conditional pointers — when situation X holds read file A, when Y read file B — so the agent reads only what its situation requires; (3) step-based pointers — content the agent will always need, but only when it reaches a given step, so the body says at that step to read the file then (for example, the instructions for writing the implementation report are read when the run finishes, not at invocation). Step-based pointers are a first-class convention, chosen by timing rather than by size: content that is consumed at one identifiable step moves behind a pointer at that step regardless of how large it is, unless it is short enough that the pointer would cost as much as the content. `## Progressive disclosure` in `suite/skill-authoring.md` is rewritten to state this three-part model in full. Every existing skill body is reviewed against it during this thread, and blocks that belong behind a step-based pointer are moved.

Rationale: Context spent at invocation on instructions that apply only later dilutes the instructions that apply now. Conditional disclosure already handles the "maybe" case; step-based disclosure handles the "certainly, but later" case, which the guidance previously covered only when the block was very large. Naming the three kinds gives future authors and reviewing agents one test for where a block belongs.

## DR3: Drop the continuation-run mode of the implement skills

Scope: `implement`, `implement-plan`, `implement-plan-with-subagents`, `formats/implementation-report.md`, `instructions/write-implementation-report.md`

Context: The three implement skills accept an invocation that explicitly asks to carry on the previous implementation; that invocation reuses the newest implementation folder, resumes its `.runs/progress.md`, and rewrites its `report.md`. It is the only path on which one implementation folder is written by two invocations and the only reason the report format carries a rule about being rewritten in place. Two other mechanisms already cover the situations it served: recovery within an invocation reads the folder's own `.runs/progress.md` and `git log` after an interruption, and a fresh run finds completed tasks already satisfied through the per-task no-op outcome and the per-task commits.

Decision: The continuation-run mode is removed. Every invocation of an implement skill allocates its own implementation folder and is the only writer of that folder. The report is written once, at the run's terminal outcome, and describes that run. The three skills lose the conditional input naming the newest folder, the paragraph on reusing it, and the sentence on a continuation run appending to progress; the report format loses the rewrite rule; the instruction file describes writing the report from the run's outcome material, with no reference to any earlier report. Everything that stays is written as if the mode had never existed.

Rationale: The mode's benefit, skipping already-completed tasks after a halt, is already delivered by per-task no-op detection at the cost of a check per task, while its presence added a conditional input to every invocation and forced merge semantics on the report. Removing it makes the folder-to-run relationship one-to-one, which is simpler to state and to verify.

## DR4: Sweep the suite for instructions that only make sense against a removed design

Context: Both the root `AGENTS.md` (`## Describe the current state, never the diff`) and `suite/skill-authoring.md` (`## No legacy awareness`) already forbid negations and contrasts whose only referent is a design that has been removed — the agent reading the skill later has never met the removed concept, so the sentence teaches it a dead idea and lengthens the skill for nothing. Such sentences are still present in skill bodies, references, and documents.

Decision: This thread includes a full sweep of every skill body, shared reference, skill-local reference, and living document under `suite/` for negations and contrasts of that kind, removing each or replacing it with the positive instruction it was guarding. The test applied to every negative sentence kept or added: does it forbid something a reader with no memory of the old design would plausibly do anyway? `## No legacy awareness` in `suite/skill-authoring.md` is sharpened to state that test and the reason it matters. The sweep and the review for other defective instructions are run with subagents partitioned by skill group so each body gets a careful read.

Rationale: Each dead-concept sentence is pure cost — extra context on every invocation and a concept the agent must hold that has no current referent. The rule already exists; what has been missing is enforcement, and a one-time sweep plus a sharper statement of the test is the cheapest way to reset the baseline.

## DR5: Three skills write the thread log, through one shared instruction

Scope: `log.md` writers; `shared/references/instructions/append-log-line.md`; `formats/log-line.md`

Context: `log.md` is the thread's memory: the one-line entries `discussion` and `resolve-pending-decisions` append are what `spec` authors from, and `spec` appends one `event` line per authoring or amendment because its amendment pass reads only the entries after the last such line. The three implement skills also carried an instruction to append a `decision` line for a point settled with the user during the run, which cannot occur in a completion-oriented run, and `close-thread` appended a closing `event` line that the folder's move into the archive already records. The append mechanics — a single-line shell append, never a file-editing tool, one writer per session — were repeated inline in every writer and also stated in the format file.

Decision: Exactly three skills write `log.md`: `discussion`, `resolve-pending-decisions`, and `spec`. The implement skills and `close-thread` write no log line; `open-thread`'s thread-creation step still creates the header-only file. The append mechanics live once, in the shared instruction `shared/references/instructions/append-log-line.md`, declared by the three writers and pointed at from the step where each appends. `formats/log-line.md` describes the artifact only: the header, the one-line entry shape, the seven types, and the append-only property.

Rationale: The log earns its place as the record of what settled in conversation, which only the two interviewing skills and the spec's cursor line produce; every other write was either impossible or redundant. One shared instruction gives the three writers an identical procedure to read at the moment they need it and keeps the format file free of behaviour.

## DR6: No thread-resolution step in any skill

Context: Many skill bodies opened with a step to resolve the active thread — check whether the working directory sits inside a thread root, and ask when several threads could be meant. Every skill names in `## Inputs` the artifact it works on, and that artifact sits inside its thread folder.

Decision: The thread-resolution step is removed from every skill body. The thread a skill works in is the folder holding the artifact its invocation names; the skill's `## Inputs` section names that artifact and its accepted forms. An invocation that names no resolvable artifact is an ordinary input ambiguity, handled per the skill's interaction posture like any other unresolvable input, with no dedicated rule.

Rationale: The step solved a case the invocation convention rules out — a user always points the agent at a file or a thread — and its wording taught a procedure ("check the working directory, pick among threads") that is either trivial or wrong. Removing it shortens every body and leaves one mechanism, the input contract, for the same situation.

## DR7: Instructions — the rule for isolating acts out of skill bodies

Scope: `suite/skill-authoring.md`, `shared/references/instructions/`, every skill body

Context: Skill bodies carry, inline, procedures that are not specific to the skill they sit in: creating a thread, appending a log line, queuing pending decisions, emitting the terminal outcome. Each is repeated or near-repeated across skills, and each lengthens the body an agent reads at invocation. The shared reference folder already isolates artifact shapes (`formats/`) and tracker-specific material (`trackers/`); it has no home for a reusable procedure.

Decision: A new kind of shared reference, the **instruction**, lives under `shared/references/instructions/`, synced through the manifest like formats. An instruction is a self-contained procedure for one act, written in the imperative to whoever performs it, naming no skill; a format says what an artifact is, an instruction says how one act is done, and the two never mix. One criterion decides what becomes an instruction, applied from two sides:

- At design time, name each step of the procedure as an act with a verb-noun phrase that carries no skill name ("create a thread", "append a log line"). An act that can be named that way and has a defined result is written as an instruction, and the body points at it at that step. An act whose only honest name is "the part of this skill where …" is body content.
- At review time, remove the surrounding skill's name and purpose from a block and read it. A block that still reads correctly is an instruction that was inlined; one that collapses belongs to the body.

Anything that only makes sense knowing which skill is running stays inline. Size is not a criterion: a two-line act is still an instruction. Readership is not a criterion either: an act with one reader is still an instruction when it passes the test. What stays inline is what makes the skill that skill — its posture, its inputs, its write boundary, the order of acts, and the judgment between them — so a body reads as a composition of acts. The pointer to an instruction sits where DR2 places it: inline, conditional, or at the step. `suite/skill-authoring.md` states this rule in full, and this thread applies it to every existing skill; the terminal-outcome emission text repeated across completion-oriented skills becomes `emit-terminal-outcome.md` under the same rule.

Rationale: Isolated acts are easier to review, revise, and reuse than the same text embedded in several bodies, and pointing at them at the step they apply to shortens what an agent reads at invocation. The bet accepts two costs: one more file read per pointer, and the discipline that editing a multi-reader instruction means checking every skill that declares it in the manifest. The bet is reviewed once after the refactor lands, on one full thread run, judged on whether the extra reads hurt the agent's execution.

## DR8: Model-invoked skills, the `model-invoked/` group, and a format-only ADR file

Scope: `skills/model-invoked/`, `formats/adr.md`, every `## Inputs` section, `suite/method.md`, root `AGENTS.md`, `README.md`, the thread's `glossary.md`

Context: The ADR format file carried, beside the format, the catalog-printing command and the rule for contradictions between thread material and a project record, and every skill's `## Inputs` section pointed at that file for the command. Those behaviours are useful to any agent working in the repository whether or not an entry point is running, which is the property that distinguishes a skill the model may invoke on its own from an instruction read inside an entry point's step (DR7). The role is declared by omitting `disable-model-invocation`, and the suite documents already call it model-invoked.

Decision: Skills the model may invoke at its own discretion are **model-invoked skills**, and they live in one group folder, `skills/model-invoked/`, named after the role because the role is the only thing its members are guaranteed to share. The category is defined in `suite/skill-authoring.md` as: skills useful to an agent in any situation, whether or not an entry point is running, which entry points may also point the agent at. Two skills open it:

- `consult-adrs` — prints the catalog of `docs/adr/` (stem, name, description), opens the records relevant to the work at hand, and carries the conflict rule: a contradiction between the work's material and a project ADR or glossary term is intentional when the thread's `adr/` holds a draft naming that ADR in `supersedes` or the thread's `glossary.md` redefines the term; every other contradiction is put to the user by an interactive agent or queued as a pending decision by a completion-oriented one, and is never resolved by overriding the project record.
- `consult-glossary` — reads `docs/glossary.md`, writes the fixed term rather than a synonym, and treats the thread's own `glossary.md` as authoritative inside that thread.

Every `## Inputs` section opens by pointing at these two skills in place of the catalog command and the glossary path. `formats/adr.md` describes the artifact only: file naming and identifier, location as status, frontmatter, and body. The method-level statement of the conflict rule joins `suite/method.md` where the project layer and supersession are described. The root `AGENTS.md` Method section points at `/consult-adrs` instead of carrying the catalog command. `README.md` replaces its primitives section with one for model-invoked skills. The thread's `glossary.md` retires `primitive`, `caller`, and `caller-authorization block`, and adds `instruction` (per DR7) and `model-invoked skill`.

Rationale: The catalog command and the conflict rule were behaviour lodged in a format file because no other home existed; a model-invoked skill is that home, and it also serves an agent working without any entry point. Naming the group by role rather than by the two current members keeps the folder honest as the category grows, at the accepted cost of being the one group not named for a capability.

## DR9: Delete `method.md`; the thread and the glossary become formats; skills state what they expect

Scope: `suite/method.md`, `formats/thread.md`, `formats/glossary.md`, `README.md`, root `AGENTS.md`

Context: `suite/method.md` described the thread layout, the project layer, the lifecycle (the sequence of skills a thread passes through), and the three recipes, and served both the skills and this repository's own documentation. The lifecycle and recipe prose drifts every time a skill changes, and each skill's `## Inputs` section already states what it expects. The thread folder and the glossary were the only artifacts without a format file.

Decision: `suite/method.md` is deleted and no document describes a lifecycle or a sequence of skills. The thread as an artifact — its folder layout, the files it holds, where drafts sit, the archive — is described in `formats/thread.md`; the glossary table, shared by the project glossary and a thread's own, in `formats/glossary.md`; both are shipped references declared by the skills that create, archive, merge, or write them. What a skill expects and leaves behind is stated in that skill's own body and, for users, in one short prose line per skill in the `README.md` skill index. `README.md` also describes the thread folder and the project layer at overview level, without restating any format's rules. The root `AGENTS.md` authoritative-documents table drops `method.md`.

Rationale: A lifecycle document is the description of the skills' composition written a second time, and it was the most frequently stale text in the repository. Formats change only when an artifact changes, and a skill's input contract lives with the skill, so nothing is left that describes the method as a whole and can drift from it.

## DR10: Threads and roadmaps move out of `docs/` into `.wip/`

Scope: every path naming `docs/threads/` or `docs/roadmaps/` in the suite, `README.md`, the `AGENTS.md` files, and the thread's `glossary.md`

Context: `docs/` held both the project's durable layer (`adr/`, `glossary.md`) and its working artifacts (`threads/`, `roadmaps/`). Threads are kept indefinitely, so a project accumulates many that are irrelevant to any given later task, and a search across `docs/` returns them alongside the current decisions. Ripgrep, which the agent harnesses use for search, skips dot-folders by default. The CLI hard-codes `docs/threads/` in its thread resolver and workspace code.

Decision: Threads live under `.wip/threads/` and roadmap indexes under `.wip/roadmaps/`, at the repository root; `docs/` holds the project layer only. Placing the folder behind a dot is intentional: working artifacts are read when a task points at them, and a search across them is a deliberate act that passes the flag to include hidden folders, so an agent working on unrelated code does not see them by default. Every suite path, format, and document is rewritten to the new location; the thread's `glossary.md` records the new paths for `thread`, `thread root`, and the roadmap index. The CLI follows in its own thread and cannot run against a moved thread until it does; this thread does not touch it.

Rationale: The separation makes the durable layer the only thing a reader finds under `docs/`, and the default invisibility of `.wip/` matches how its contents are used: on purpose, never incidentally. The cost is that any agent searching thread content must ask for hidden folders explicitly, accepted because the suite's skills always address a thread by path rather than by search.

## DR11: Three document kinds, distinguished by audience

Scope: `README.md`, root `AGENTS.md`, `suite/AGENTS.md`, `docs/documentation-rules.md`, `docs/working-with-threads.md`, `suite/skill-authoring.md`, `CONTRIBUTING.md`

Context: Maintainer-facing content was spread across the `AGENTS.md` files (writing rules, layout, method notes, commit rules), `suite/skill-authoring.md`, and `CONTRIBUTING.md`, and one shipped file also served as this repository's documentation. The seed asks for both `AGENTS.md` files to be reduced to pointers plus essentials, which requires a named home for what they carry.

Decision: Every document in the repository is exactly one of three kinds, each with one audience and one register; the same fact may appear in two kinds when both audiences need it, and never twice within one kind.

1. **Shipped content** — `suite/skills/` and `suite/shared/references/` (formats, instructions, trackers). Written for the invoked agent in any project. Never cited as this repository's own documentation.
2. **`README.md`** — for an external user of antmay: what it is, the skills with what each expects and leaves behind, the thread folder and project layer at overview level, install and CLI pointers, and a link to the contributor documents.
3. **Maintainer documentation** — for anyone working on this repository, referenced from the `AGENTS.md` files: `CONTRIBUTING.md` (issues, effort bands, commits, pull requests); `docs/documentation-rules.md` (this three-kind rule, "describe the current state, never the diff", "document only durable, properly scoped information"); `docs/working-with-threads.md` (how this repository runs on the method it ships: where threads and roadmaps live, the project layer, consulting ADRs and the glossary, which skills to reach for); `suite/skill-authoring.md` (the suite's authoring conventions); the CLI's own documents, untouched by this thread.

Each `AGENTS.md` holds: what the repository or module is, in a paragraph; the layout tree; the pointers to the maintainer documents; and only the rules that must be obeyed before reading anything else. Everything else moves to the document it belongs to.

Rationale: A document written for two audiences serves neither: the invoked agent needs imperative, project-free text, the external user needs orientation, and the maintainer needs rules and rationale. Naming the kind of every file makes the register obvious to whoever edits it, and pointer-style `AGENTS.md` files stay short enough to be read whole at the start of every session.

## DR12: No archive; a closed thread stays where it is

Scope: `close-thread`, `formats/thread.md`, `formats/roadmap-index.md`, `open-thread`, `README.md`, the thread's `glossary.md`

Context: Closing a thread moved its folder into an archive subfolder, and that location was how a reader told a closed thread from an open one. With working artifacts separated from the project layer by DR10, the distinction the archive drew is already made by the folder that holds them.

Decision: There is no archive. `close-thread` lands the thread's draft ADRs into `docs/adr/`, merges its glossary terms into `docs/glossary.md`, writes the closing line under the roadmap entry the seed names, and leaves the thread folder in place, unmoved and unrenamed. A closed thread is recognisable by what it no longer holds: its `adr/` drafts have moved to the project layer and its glossary terms have merged. Nothing else marks closure, and no skill distinguishes open from closed threads by location. The roadmap index's closing line names the thread by its path relative to `.wip/threads/`, and the term `archive` leaves the vocabulary.

Rationale: The archive was one more concept, one more move, and one more path shape for every skill to know, and its only job is now done by `.wip/` itself. Removing it keeps the suite to what it needs today; a way to set closed threads apart can be added later if it is ever missed.

## DR13: Thread folders are laid out as `.wip/threads/yyyy/mm/dd-hhmm-slug/`

Scope: `formats/thread.md`, `open-thread`'s thread-creation instruction, `formats/roadmap-index.md`, every path in the suite and documents naming a thread, the thread's `glossary.md`

Context: Thread folders sat in one flat folder named `<YYMMDDHHMMSSZ-slug>`, and that name was the thread's identifier, used by the roadmap index's closing line and by a child thread's seed to name its parent. The folder grows without bound because threads are never removed (DR12).

Decision: A thread folder lives at `.wip/threads/yyyy/mm/dd-hhmm-slug/`: a year folder, a month folder, and a leaf named by the day, the creation time in UTC at minute resolution, and a short kebab-case slug. The thread's identifier is that path relative to `.wip/threads/`, and every reference to a thread — the roadmap index's closing line, a child seed's parent reference, prose in any document — uses it. Two threads created in the same minute must differ in slug. `formats/thread.md` defines this layout; the thread-creation instruction `open-thread` reads implements it.

Rationale: A month folder lists as a timeline with the day visible in each leaf, no level of the tree exists only to hold one child, and the tree can deepen later if a day ever needs its own folder. Minute resolution matches every other stamp in the suite.

## DR14: Delete the recipes, `whats-next`, and `finish`; every skill at version 0.0.0; the CLI is untouched

Scope: `shared/references/recipes/`, `skills/finish-navigate/`, `README.md`, `.claude-plugin/marketplace.json`, `.vscode/settings.json`, `shared/manifest.yaml`, `docs/glossary.md` via the thread's `glossary.md`, `roadmap`, `open-thread`, every `SKILL.md` frontmatter

Context: The suite shipped three recipes (Quick, Standard, Roadmap) as documented paths through the skills, referenced from the README, the glossary, the root `AGENTS.md`, `open-thread`, and the CLI documents. `whats-next` oriented a user among the recipes and `finish` handled branch disposal; neither is used. Every skill carried a semver `version` bumped on meaningful change, while the skills change often enough that the numbers carry no information. The CLI hard-codes the thread location, names `whats-next` and `finish` in its stage-support table, and its documentation check holds that table to the published skill list.

Decision: The `recipes/` reference folder and every mention of a recipe are deleted: the README section, the glossary terms `recipe`, `Quick / Standard / Roadmap`, `step`, `process shape`, and the `recipe vs pipeline` distinction, the `open-thread` line about persisting no recipe name, and the root `AGENTS.md` mention. The `roadmap` skill and `formats/roadmap-index.md` stay: only the recipe named Roadmap retires, not the capability. `whats-next` and `finish` are deleted with their manifest entries, marketplace entries, README sections, and commit scopes; the `roadmap` skill's mention of them goes; the group `finish-navigate/` is renamed `close/` and holds `close-thread`. Every skill's frontmatter reads `version: 0.0.0`, new skills start there, and the rule to bump versions leaves the suite's authoring documents. Nothing under `cli/` is edited in this thread: its stage-support table, its hard-coded thread paths, and its check are left as they are, and a `[contract]` follow-up thread realigns the CLI with the suite once the suite settles, including the table rows that name `reconcile-*` and `archive-thread` skills the suite does not ship.

Rationale: The recipes described sequences the skills already imply and drifted with every skill change; the two skills had no user; version numbers on content that changes weekly were noise. The CLI was designed before the suite reached its current shape and is deliberately left behind until the suite stops moving, so that it is realigned once rather than after every suite change.

## DR15: Every format file follows one skeleton

Scope: `shared/references/formats/*.md`, `suite/skill-authoring.md`

Context: The six format files used differing section names for the same two things — the artifact's shape and its rules — and some carried behaviour beside the format. Formats are shipped references read by an agent about to write or read the artifact, and instructions (DR7) and model-invoked skills (DR8) now hold the behaviour.

Decision: Every format file has exactly this structure and nothing outside it: a title `# <Artifact> format`; one paragraph stating what the artifact is, where it lives, and its identifier when it has one; a `## Shape` section holding a fenced skeleton of the artifact with placeholders, or the folder tree when the artifact is a folder; and a `## Rules` section, one rule per bullet, covering which parts are required, what each part carries, naming, ordering, and what never appears. Vocabulary an artifact fixes, such as the log's seven entry types, is a rule with its enumeration inline. A command, a procedure, or a policy is never a format section: it belongs in an instruction or a model-invoked skill. `suite/skill-authoring.md` states this skeleton as the requirement for a format file.

Rationale: One skeleton makes every format readable in the same way and makes any behaviour that strays into a format file visible at once, because it has no section to sit in.

## DR16: The body sweep's defect classes, and the description rule per role

Scope: every skill body and skill-local reference; `suite/skill-authoring.md`

Context: Skill bodies carry instructions that are impossible under the skill's posture (a completion-oriented run told what to do when a decision is settled with the user), sentences that only make sense against a removed design, restatements of what a format or the harness already guarantees, and routing prose. Several decisions in this thread (DR1, DR5, DR6, DR7, DR14) also remove text from every body. A user-invoked skill's frontmatter description never reaches the model, because the harness withholds a skill marked `disable-model-invocation` from it, so the description is only the line a person sees in the picker; a model-invoked skill's description is what the model routes on.

Decision: After the structural decisions land, one sweep reads every skill body and skill-local reference in full, partitioned by skill group across subagents, and reports each hit with file, line, and class before any edit. The classes:

1. **Posture mismatch** — an instruction presuming the other posture: a completion-oriented skill asking, confirming, or settling anything with the user mid-run; an interactive skill emitting a terminal outcome or queuing a pending decision.
2. **Dead-concept negation** — a sentence whose only referent is a removed design (the DR4 test).
3. **Restated guarantee** — telling the agent something the format, the harness, or another instruction already fixes, or something the agent cannot do anyway.
4. **Skill-independent block inline** — a block that passes the DR7 review-time test and belongs in an instruction.
5. **Routing prose in the body** — any "when to use this skill" text; the body has none.
6. **Repository leakage** — decision IDs, phase names, internal labels, or explanations of how this repository is organised.

A hit is removed or replaced with the positive instruction it guarded, and nothing beyond the hit is rewritten. The description rule, by role: a **model-invoked** skill's description is precise and complete enough that an agent knows exactly when to invoke it, at whatever length that takes; a **user-invoked** skill's description is as short as possible, one plain phrase saying what the skill does, because it serves only the human picker. `suite/skill-authoring.md` states both.

Rationale: Each class is a kind of text that costs context on every invocation and gives the agent nothing it can act on. Tying description length to who reads it removes the pressure to write "concrete triggers" into descriptions no model will ever see, and puts that effort where routing actually happens.

## DR17: `skill-authoring.md` becomes the `suite/authoring/` folder, one file per concern

Scope: `suite/skill-authoring.md`, `suite/authoring/`, `suite/AGENTS.md`

Context: `suite/skill-authoring.md` held sixteen sections in one file, and the decisions of this thread rewrite or remove several of them: the primitive-extraction section goes (DR1), invocation-role metadata becomes the model-invoked rule (DR8), progressive disclosure becomes the three-part body and the instruction rule (DR2, DR7), shared references gain the format skeleton and the instruction kind (DR15, DR7), and the description-per-role rule and the sweep classes join (DR16). The document is maintainer documentation (DR11), consulted one concern at a time.

Decision: The single file is replaced by the folder `suite/authoring/`, one file per concern, with this starting cut: `skill-roles.md` (user-invoked and model-invoked skills, the metadata in both harnesses, the description rule per role, when a capability earns a skill, naming); `interaction-posture.md` (the postures, the terminal outcome, local return contracts); `body-structure.md` (section headings, the three-part body, the instruction rule, no legacy awareness, the sweep's defect classes, what a review may do); `shared-references.md` (the format skeleton, instructions, the manifest and sync contract); `side-effects.md` (write authority, filesystem deletion, temporary workspaces). Every file is written in the same maintainer register, each rule has exactly one home, and `suite/AGENTS.md` points at the folder with one line per file. The spec fixes the final boundaries where a rule spans two concerns.

Rationale: One concern per file is the isolation DR7 applies to skill content, applied at the grain where each file is a coherent read, so a maintainer opens the one file for the concern at hand instead of scrolling a document that had already drifted in register between its sections.

## DR18: Every existing thread migrates to the new location and layout

Scope: `docs/threads/`, `docs/roadmaps/`, `.wip/`

Context: The repository holds its own threads under `docs/threads/<YYMMDDHHMMSSZ-slug>/` and its roadmap indexes under `docs/roadmaps/`, in the layout DR10 and DR13 replace. Roadmap indexes and descendant seeds name threads by the old folder name.

Decision: Every existing thread folder, this one included, moves in this thread to `.wip/threads/yyyy/mm/dd-hhmm-slug/`, its new leaf name derived from the old stamp (year, month, day, hour, and minute, seconds dropped) and its slug kept. Every roadmap index moves to `.wip/roadmaps/`. Every reference to a thread by its old folder name — closing lines in roadmap indexes, parent references in seeds, paths in any document outside a thread — is rewritten to the new path relative to `.wip/threads/`. Thread-internal text is otherwise left as it was written: a thread is a record of its moment, and only the pointers that must resolve are touched. `docs/threads/` and `docs/roadmaps/` cease to exist. The move lands as one commit of its own.

Rationale: One layout for every thread is the point of the move; keeping the history in a second location would leave two places to look and a folder under `docs/` the separation was meant to empty. Deriving the new name from the old stamp keeps every thread's identity recoverable.
