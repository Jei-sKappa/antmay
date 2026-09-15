# Spec: Follow-ups second pass — pointers, inputs, and the reference files

## Intended outcome

Every skill body and every shared reference file in `suite/` points at skill-local material in one unmistakable way, names the project's decision and glossary files as the inputs they are, lists its inputs in one uniform shape, ends its runs through the one terminal-outcome instruction at every exit, and reads the same on the page. A new text check holds the mechanical parts of that in place. The result is a suite the maintainer can reinstall and run without the ambiguities the second reading of the previous thread's work surfaced.

## Context

The previous thread (`.wip/threads/2026/09/13-1149-follow-ups/`) reorganised the suite into bodies, shared formats, shared instructions, and two model-invoked skills, then swept every body. Reading the result, the maintainer found seven things (`seed.md`): skill-relative paths are indistinguishable from project paths; `/consult-adrs` and `/consult-glossary` sit in the Inputs lists as if they were inputs, with a glossary line that misstates its intent, and bodies cite the conflict rule as text a skill "carries"; the Inputs items end in five spellings of an authoritative/material tag and do not say which inputs may be absent; `emit-terminal-outcome.md` is pointed at only from the `DONE` step while every `REFUSED` and `BLOCKED` exit spells the line inline; three format files open their fence indented; `log-line.md` lost its overview of the seven types; and bodies point at reference files with "do X per `path`", often beside a paraphrase of what the file says. The discussion in `decisions.md` (DR1–DR9) settled each. This thread's work is the sweep those decisions describe, plus the check that keeps it from regressing.

The CLI under `cli/` is deliberately untouched, as the root `AGENTS.md` states: it lags the suite and a separate `[contract]` thread realigns it.

## Scope

In scope, all under `suite/` plus the repository-level files named:

- Every `SKILL.md` under `suite/skills/` (18 bodies), including the two model-invoked ones where a rule applies to them.
- Every canonical file under `suite/shared/references/` and, through the sync script, every generated copy under a skill's `references/`.
- Every hand-authored skill-local reference cited from a body (`worked-example.md`, `reviewer-policy.md`, `code-quality-reviewer.md`, `plan-compliance-reviewer.md`, `supplied-ticket.md`, `open-ticket`'s `repository-conventions.md` copy), for the pointer prefix only.
- `suite/authoring/body-structure.md`, `suite/authoring/shared-references.md`, and `suite/authoring/interaction-posture.md`, where they state the rules this thread changes.
- A new script `suite/scripts/check-skill-text.mjs`, its CI step in `.github/workflows/ci.yml`, and its mention in `CONTRIBUTING.md` and `suite/AGENTS.md`.

Out of scope:

- Anything under `cli/`.
- Any change to a skill's substantive procedure. This is a wording and structure sweep: what a skill does, in which order, with which write boundary, does not change.
- The 107 same-body section pointers written "per `## <Section>`" (per `decisions.md` DR9). They stay.
- The format skeleton in `shared-references.md` (title, intro, `## Shape`, `## Rules`). It is not relaxed; DR6 works inside it.
- The `Outcome:` line's vocabulary, shape, and its documentation in `README.md`. Unchanged.
- The log's type vocabulary. It stays closed at seven (per `decisions.md` DR6); no `note` type.
- Reinstalling the maintainer's local skill copies.
- A glossary delta or ADR drafts for this thread: the decisions here are authoring conventions whose durable home is `suite/authoring/`, and no term is added or changed. `docs/adr/` and `docs/glossary.md` are not written.

## Expected behaviour

### The `<skill_path>` prefix (`decisions.md` DR1)

Every pointer to a file inside the skill's own folder is written with the literal prefix `<skill_path>/`, in bodies and inside every shared reference file alike: `<skill_path>/references/formats/adr.md`, `<skill_path>/references/instructions/append-log-line.md`, `<skill_path>/references/worked-example.md`. Project paths (`docs/adr/`, `docs/glossary.md`, `.wip/roadmaps/`, thread files) stay bare. The instruction files' own pointers to format files (`append-log-line.md` → `log-line.md`, `create-thread.md` → `thread.md`, `emit-pending-decisions.md` → `pending-decision-bundle.md`, `write-implementation-report.md` → `implementation-report.md`) carry the prefix too.

`body-structure.md` replaces its sentence "Every pointer cites the reference file's full skill-relative path, as in `references/formats/adr.md`" with the prefixed form and states that the placeholder resolves to the skill's base directory as the harness reports it. `shared-references.md` states that pointers inside a shared reference file use the same prefix.

### Project-layer inputs (`decisions.md` DR2)

The two opening items of every `## Inputs` section become, with the target clause adapted to the skill:

```markdown
- `docs/adr/`, read via `/consult-adrs` — the project decisions bearing on <the target>.
- `docs/glossary.md`, read via `/consult-glossary` — the project's fixed terms, to be used in everything you write.
```

The wording "write the project's fixed terms" disappears from the suite. `body-structure.md`'s "The list opens with the same two items" block is rewritten to these two lines.

Where a body invokes the conflict rule, it phrases the skill as a procedure — "classify it as `/consult-adrs` instructs" — and never as a document that carries text. The current phrasings to replace are of the form "the conflict rule `/consult-adrs` carries" (discussion, spec, the review skills, and wherever else the sweep finds one). The rule itself stays in `consult-adrs`; no new instruction file is created for it. The folder is `docs/adr/` everywhere; `docs/adrs` appears nowhere.

### One shape for Inputs items (`decisions.md` DR3)

Every item in every `## Inputs` section (16 bodies) has the shape:

```markdown
- <path or source><, presence clause when it may be absent> — <what it is and what it is for>.
```

The trailing tags — `; authoritative.`, `. Authoritative.`, `. Material.`, `. Material: …`, `Authoritative for intent.`, `Authoritative within the thread.` — are removed from every item. What a tag meant is folded into the clause where it carries information ("they take precedence over the project records inside the thread") and dropped where it was decoration.

The presence clause is one of: `when present`, `when the seed carries one`, `when the file exists`. An item without one is always present or is the primary input. A primary input keeps its accepted-forms text inside its clause, as today.

Where a procedure ranks its sources (the three review skills' authority-anchor sections; `spec`'s "these are the whole of what the spec rests on"), the ranking is stated once in the prose that uses it, not per item. Existing prose of that kind stays; nothing is added to compensate for a removed tag unless the body would otherwise lose the ranking.

A body normally invoked early in a thread's life says so in one sentence above its list. `discussion` carries: "A freshly opened thread holds only `seed.md` and a header-only `log.md`; everything else below appears only once later work has produced it." Whether another body meets the same condition is the implementer's judgment (see `## Degrees of freedom`).

`body-structure.md` replaces "Each item is a path or a source with one clause saying what it is for and whether it is authoritative or material" with this shape, the fixed presence clauses, and the early-life sentence rule.

### Reference pointers as directives (`decisions.md` DR4)

A pointer to a reference file reads as a directive to open the file and act on it. The default wording is `follow` for an instruction — the pointer is the step: "Follow `<skill_path>/references/instructions/append-log-line.md`." — and `following` (or "in the shape `…` defines" for a read) for a format. Other wording is allowed where it reads better, provided the intent stays plain.

Two rules are strict:

1. **No leak.** A body never restates what the pointed file holds. Text around a pointer is limited to the skill-specific parameters the file leaves open: the producer name, what the line states, which folder, the token. A sentence that can be deleted because the reference carries it is deleted. Anything the body needs for its own judgment at that step is written as the skill's own rule, not as a paraphrase with a citation. The discussion body's step 5 is the canonical case: "Append the log line … per `append-log-line.md`. One line, one of the seven types, with the reason folded into the gist, per `log-line.md`." becomes one pointer to the instruction plus the judgment sentence; the format pointer leaves, since the instruction already points at the format.
2. **No `per` before a path.** The word `per` never directly precedes a `<skill_path>/` pointer, in bodies or in reference files. `per` before a same-body heading stays.

The 45 current "per `references/…`" pointers in bodies and the three "per `references/formats/…`" pointers in instruction files are rewritten to this shape. `body-structure.md` and `shared-references.md` state the directive intent, the two strict rules, and the DR9 distinction in one sentence ("`per` before a heading of the same body is fine; `per` before a file path is the defect").

### Every exit points at the terminal-outcome instruction (`decisions.md` DR5)

`emit-terminal-outcome.md` is kept, singular, as the only place the outcome vocabulary and line rules are written. It gains one sentence stating that it is followed at whichever exit the run reaches — refusal, block, or completion.

Every exit in every completion-oriented body (the 12 declarers of the instruction in `shared/manifest.yaml`) is a DR4-shaped pointer to it with the token and the reason as parameters, for example: "follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the dirty paths and how to re-invoke" or "… with `DONE` and `Spec written: spec.md`". The literal `Outcome:` line — currently spelled 53 times across 12 bodies — appears in no `SKILL.md`. A body may name a token as the parameter at an exit; it does not enumerate the three tokens as a vocabulary.

`interaction-posture.md`'s sentence "which each emitting skill declares and points at from the step where the run ends" becomes "from every exit the run can reach".

### `log-line.md` regains the types overview (`decisions.md` DR6)

`shared/references/formats/log-line.md`'s `## Shape` section holds, in order: the fenced header-and-entry skeleton as today; then a `### Types` subheading with one bullet per type. Each bullet carries the type name in backticks, an em-dash, its one-line definition, and an indented continuation line that starts with the literal word `Example:` followed by one example entry. The standalone "One example line per type" block leaves. The `## Rules` bullet that currently inlines all seven definitions shrinks to "Every line uses one of the seven types listed under `### Types`." A Rules bullet is added stating that a thought fitting none of the seven is not a log entry. No other section is added; the authoring skeleton is unchanged. The sync script propagates the file to `discussion`, `resolve-pending-decisions`, and `spec`.

### Flush-left fences (`decisions.md` DR7)

The `## Shape` fence in `implementation-report.md`, `roadmap-index.md`, and `pending-decision-bundle.md` starts at column one. After re-sync, no `.md` under `suite/skills/` or `suite/shared/references/` has a fence line with leading whitespace.

### The text check (`decisions.md` DR8)

A new dependency-free Node script `suite/scripts/check-skill-text.mjs`, in the style of `check-marketplace-skills.mjs` (header comment explaining why it is a gate, `node:` built-ins only, exit codes 0 clean / 1 on any hit), walks every `.md` file under `suite/skills/` and `suite/shared/references/` and reports every hit as `path:line: rule`, failing on:

1. **bare-reference** — any occurrence of the substring `references/` not immediately preceded by `<skill_path>/`.
2. **per-before-path** — the sequence ``per `<skill_path>``.
3. **indented-fence** — a line whose first non-whitespace characters are three backticks and which has leading whitespace.

`suite/authoring/` is excluded, because those documents quote forbidden forms as negative examples. `.github/workflows/ci.yml` runs `node scripts/check-skill-text.mjs` as a step directly after the marketplace check, under the same `suite` working directory. `CONTRIBUTING.md`'s "Its one mechanical gate guards the distribution manifest" block becomes two gates, listing both commands. `suite/AGENTS.md`'s `scripts/` tree and its "Before anything else" list name the new script and when to run it (after editing any body or shared reference).

### Same-body section pointers (`decisions.md` DR9)

Untouched. The check's second rule matches only ``per `<skill_path>``, so these never trip it.

### The sweep itself

The order of work: fix the canonical shared files (formats, instructions), run the sync, then sweep every body, then update the authoring documents and the contributor documents, then write and wire the check and run it to zero hits. Every generated copy under a skill's `references/` is produced by `node scripts/sync-shared-references.mjs`, never edited by hand. `node scripts/check-marketplace-skills.mjs` still passes, since no skill is added, removed, or renamed.

## Constraints

- No skill's substantive procedure changes: posture, inputs, write boundary, order of acts, and the judgment between them stay as they are. A reviewer comparing a body before and after should find only the wording and structure this spec names.
- The format skeleton in `shared-references.md` is not relaxed (per `decisions.md` DR6): third-level headings under `## Shape` are the only structural addition, and only in `log-line.md`.
- Generated copies under a skill's `references/` are never hand-edited; the canonical source changes and the sync script runs.
- The new script uses only `node:` built-ins and runs from `suite/`, like the two existing scripts.
- `cli/` is not touched, and its documentation check is not expected to pass until its own follow-up thread.
- Commits follow Conventional Commits; a change spanning modules omits the scope. Nothing is committed unless the maintainer asks.
- The root `AGENTS.md` rule on the CLI stage-support table is not triggered: no skill's invocation posture, accepted inputs, durable outputs, or side-effect boundaries move.

## Acceptance guidance

Machine-checkable where a design decision is involved; each criterion names the decision it enforces.

**FR-1 — Skill-relative pointers carry the prefix (DR1).**
- AC-1.1: `grep -rn 'references/' suite/skills suite/shared/references --include='*.md' | grep -v '<skill_path>/references/'` returns no lines.
- AC-1.2: Every pointer inside `suite/shared/references/instructions/*.md` to a format file reads `<skill_path>/references/formats/<name>.md`.
- AC-1.3: `suite/authoring/body-structure.md` states the `<skill_path>/` prefix and what it resolves to; `shared-references.md` states that reference files use it too.
- AC-1.4: No project path (`docs/adr/`, `docs/glossary.md`, `.wip/…`) carries the prefix anywhere in the suite.

**FR-2 — Project-layer inputs name the file, read via the consult skill (DR2).**
- AC-2.1: Every `## Inputs` section opens with an item beginning `` - `docs/adr/`, read via `/consult-adrs` — `` followed by an item beginning `` - `docs/glossary.md`, read via `/consult-glossary` — ``.
- AC-2.2: The string "write the project's fixed terms" appears nowhere under `suite/`.
- AC-2.3: No body contains the phrase "`/consult-adrs` carries" or otherwise names the skill as a document; each invocation of the conflict rule reads as a procedure ("as `/consult-adrs` instructs" or equivalent).
- AC-2.4: `docs/adrs` appears nowhere in the repository's documents or suite.
- AC-2.5: No new file exists under `suite/shared/references/instructions/` for the conflict rule; `consult-adrs/SKILL.md` still holds it.

**FR-3 — Inputs items have one shape (DR3).**
- AC-3.1: `grep -rnE '(; authoritative\.|\. Authoritative\.|\. Material\.|\. Material:|Authoritative for intent\.|Authoritative within the thread\.)' suite/skills` returns no lines.
- AC-3.2: Every item in every `## Inputs` list matches `- <source>[, <presence clause>] — <clause>.` with the presence clause, when present, one of `when present`, `when the seed carries one`, `when the file exists`.
- AC-3.3: `discussion/SKILL.md` carries the early-life sentence above its Inputs list, naming `seed.md` and a header-only `log.md`.
- AC-3.4: The three review bodies still carry their authority-anchor ranking in prose; `spec` still carries its "whole of what the spec rests on" sentence.
- AC-3.5: `body-structure.md` no longer says "whether it is authoritative or material" and states the item shape, the presence clauses, and the early-life rule.

**FR-4 — Pointers are directives; no leak; no `per` before a path (DR4, DR9).**
- AC-4.1: ``grep -rn 'per `<skill_path>' suite/skills suite/shared/references`` returns no lines.
- AC-4.2: Same-body section pointers written "per `## …`" are unchanged in count and text relative to the pre-thread commit, allowing only edits incidental to a sentence rewritten for another rule.
- AC-4.3: The discussion body's step that appends the log line carries exactly one reference pointer (the instruction) and no restatement of the line shape or the seven types.
- AC-4.4: For every pointer to an instruction file in every body, a reviewer reading the sentence and the surrounding paragraph finds no content the pointed instruction also carries, beyond skill-specific parameters (producer, what the line states, folder, token).
- AC-4.5: `body-structure.md` and `shared-references.md` state the directive intent, the two strict rules, and the DR9 sentence distinguishing heading pointers from path pointers.

**FR-5 — Every exit goes through the terminal-outcome instruction (DR5).**
- AC-5.1: `grep -rn 'Outcome:' suite/skills` returns no lines.
- AC-5.2: In each of the 12 declaring bodies, every refusal, block, and completion exit points at `<skill_path>/references/instructions/emit-terminal-outcome.md` and names its token as the parameter.
- AC-5.3: No body lists `DONE`, `BLOCKED`, and `REFUSED` together as a vocabulary.
- AC-5.4: `emit-terminal-outcome.md` contains one sentence stating it is followed at whichever exit the run reaches, and otherwise its vocabulary, shape, and rules are unchanged.
- AC-5.5: `interaction-posture.md` says the instruction is pointed at from every exit the run can reach.
- AC-5.6: `README.md`'s terminal-outcome documentation is byte-identical to before.

**FR-6 — `log-line.md` lists the seven types under `### Types` (DR6).**
- AC-6.1: `shared/references/formats/log-line.md` has, under `## Shape`, a `### Types` subheading with exactly seven bullets, one per type, each with a definition and an indented continuation line beginning `Example:` holding one example entry.
- AC-6.2: The file has no second-level heading other than `## Shape` and `## Rules`, and no standalone example block outside `### Types`.
- AC-6.3: `## Rules` contains a bullet limiting lines to the seven types under `### Types`, and a bullet stating that a thought fitting none of them is not a log entry; no rule inlines the seven definitions.
- AC-6.4: The three synced copies (`discussion`, `resolve-pending-decisions`, `spec`) are byte-identical to the canonical file.
- AC-6.5: `shared-references.md`'s format skeleton text is unchanged.

**FR-7 — Fences are flush left (DR7).**
- AC-7.1: `grep -rnE '^[[:space:]]+```' suite/skills suite/shared/references` returns no lines.

**FR-8 — The text check exists and is wired (DR8).**
- AC-8.1: `suite/scripts/check-skill-text.mjs` exists, imports only `node:` modules, and running `node scripts/check-skill-text.mjs` from `suite/` exits 0 on the finished tree.
- AC-8.2: Introducing a bare `references/formats/x.md` into any body, a ``per `<skill_path>/…`` into any body, or a two-space-indented fence into any shared format file makes the script exit 1 and print a `path:line: rule` line for each hit; reverting restores exit 0.
- AC-8.3: The script does not walk `suite/authoring/`.
- AC-8.4: `.github/workflows/ci.yml` runs the script as a step after `check-marketplace-skills.mjs` with `working-directory: suite`.
- AC-8.5: `CONTRIBUTING.md` and `suite/AGENTS.md` name the script and the command to run it.
- AC-8.6: `node scripts/check-marketplace-skills.mjs` and `node scripts/sync-shared-references.mjs` still exit 0, and the sync leaves the tree unchanged when run a second time.

**FR-9 — Nothing else moved.**
- AC-9.1: `cli/` has no diff.
- AC-9.2: Every body's `## Procedure` step count, write-boundary statement, and posture-defining sections are unchanged in substance; the diff of each body consists of the rewrites this spec names.
- AC-9.3: The `skills/` tree, `.claude-plugin/marketplace.json`, and `shared/manifest.yaml` have no diff.

## Degrees of freedom

Granted to the implementer; every admissible choice satisfies the criteria above unchanged:

- The exact wording of each rewritten pointer sentence, within DR4's intent (default `follow` / `following`, other verbs where they read better).
- The exact wording of each Inputs clause once its tag is folded in, provided the shape and presence-clause vocabulary hold.
- Which bodies other than `discussion` carry an early-life sentence above their Inputs list, judged by whether the body is normally invoked when the thread holds only its seed and log.
- The one sentence added to `emit-terminal-outcome.md` and the one added to `interaction-posture.md`.
- The exact one-line definitions and example lines in `### Types`, so long as the seven types and their meanings are those already in the file.
- The check script's internal structure, its regexes, its rule names in the output, and whether rule 1 is evaluated per line or per backtick span, provided AC-8.1 through AC-8.3 hold.
- The order in which bodies are swept, and whether the sweep is one commit or several, subject to Conventional Commits and to committing only when asked.
- The wording of the new entries in `CONTRIBUTING.md` and `suite/AGENTS.md`.

Not free: adding a `note` or free-form log type; relaxing the format skeleton; creating an instruction file for the conflict rule; deleting or splitting `emit-terminal-outcome.md`; touching `cli/`; changing any skill's procedure.
