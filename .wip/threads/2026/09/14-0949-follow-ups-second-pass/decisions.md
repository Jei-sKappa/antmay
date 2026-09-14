# Decisions

## DR1: Skill-relative pointers carry the `<skill_path>` prefix

Context: Skill bodies and the shared reference files cite skill-local material as bare relative paths (`references/formats/adr.md`), while project material is cited by its project-relative path (`docs/adr/`, `docs/glossary.md`). Nothing distinguishes the two kinds of path, and an agent whose working directory is the project root can read a bare `references/...` as a project path. Instruction files under `shared/references/instructions/` point at format files the same bare way.

Decision: Every pointer to a file inside the skill's own folder is written with the literal placeholder prefix `<skill_path>/`, e.g. `<skill_path>/references/formats/adr.md`. This applies in `SKILL.md` bodies and inside every shared reference file (instruction → format pointers included). Project paths stay bare. `suite/authoring/body-structure.md` and `suite/authoring/shared-references.md` state the rule, and a check (in the sync script or alongside it) flags any `references/` path not preceded by `<skill_path>/`.

Rationale: The agent runtimes in use (Claude Code, Codex) inject the skill's base directory at invocation, so the placeholder is resolvable, and it makes skill-local versus project-level paths distinguishable at a glance. Applying it inside the reference files matters because they are synced copies read from inside the skill folder by an agent working at the project root — the same ambiguity the prefix removes. Trade-off: one more token per pointer and a sweep of every body and reference file.

## DR2: Project-layer inputs name the file, with the consult skill as the way to read it

Context: Every `## Inputs` section opens with `/consult-adrs` and `/consult-glossary` as if they were inputs, and the glossary line reads "write the project's fixed terms", which misstates the intent. Elsewhere bodies cite the conflict rule as something `/consult-adrs` "carries", treating a skill as a document. `suite/authoring/body-structure.md` mandates the current two opening items. The consult skills are assumed installed alongside the rest of the suite.

Decision: The two opening input items name the project files, with the skill as the reading method:

- `docs/adr/`, read via `/consult-adrs` — the project decisions bearing on <the target>; authoritative.
- `docs/glossary.md`, read via `/consult-glossary` — the project's fixed terms, to be used in everything you write; authoritative.

The conflict rule stays in `consult-adrs`; no new instruction file. Where a body invokes that rule it phrases the skill as a procedure ("classify it as `/consult-adrs` instructs"), never as a document that carries text. The project folder is `docs/adr/` (singular) everywhere. `body-structure.md` is updated to state this shape.

Rationale: The input is the file; the skill is how it is read, so the line should say so in that order. Keeping the rule in one skill avoids twelve synced copies; this is acceptable because the suite is installed whole, so the consult skills are always present. The "read via" phrasing was chosen over a parenthetical for readability. Trade-off: bodies depend on the consult skills being installed, which is accepted.

## DR3: One shape for every Inputs item, with presence stated and no trailing tag

Context: `## Inputs` items end in a trailing tag — "; authoritative.", ". Authoritative.", ". Material.", ". Authoritative within the thread.", ". Material: …" — in four or five spellings, because `suite/authoring/body-structure.md` asks each item to say "whether it is authoritative or material". Neither word is a glossary term, and the ranking only matters in the three review skills, which already state it in prose under their authority-anchor section. Several inputs are absent early in a thread's life (a fresh thread holds only `seed.md` and a header-only `log.md`), and the lists do not say which.

Decision: The trailing tag is removed everywhere. Every Inputs item has the shape `- <path or source><, presence clause when it may be absent> — <what it is and what it is for>.` The presence clause comes from a small fixed set (`when present`, `when the seed carries one`, `when the file exists`); an item without one is always present or is the primary input. Where a procedure ranks its sources, the ranking is stated once in prose in the section that uses it, never as a per-item tag. A body that is normally invoked early in a thread's life says so in one sentence above the list (discussion: a fresh thread holds only `seed.md` and a header-only `log.md`; everything else appears once later work produces it). `body-structure.md` states this shape in place of the authoritative/material clause.

Rationale: One shape reads the same in every skill and removes a vocabulary that was never fixed. Folding the meaning into the clause keeps the information where it matters and drops it where it was decoration. Marking presence stops an agent from treating a missing optional file as a preflight failure. Trade-off: the review skills lose a per-item marker, but their anchor section already carries the ranking.

## DR4: A reference pointer is a clear directive to read the file, never a citation beside a restated act

Context: Skill bodies point at reference files 45 times, always as "do X per `references/...`", and often with the pointed file's own content paraphrased around the pointer (the discussion body states the log line's shape and then cites `log-line.md`). Read that way the pointer is a citation the agent may skip, not a file it must open. The other "per" uses point at sections of the same body, which is already loaded, and are not at issue. The instruction files point at format files with the same "per" wording.

Decision: A pointer to a reference file is written as a directive whose intent is unmistakable: an instruction file is something to follow, as the step itself ("Follow `<skill_path>/references/instructions/append-log-line.md`"), and a format file is something a write or read conforms to ("write the draft at `adr/<stamp>-<slug>.md` following `<skill_path>/references/formats/adr.md>`", "in the shape `…/thread.md` defines"). Those verbs are the default wording, not a fixed vocabulary: the author may choose other words where they read better in a given sentence, provided the intent — open this file and do what it says, or conform to it — stays plain. Two rules are strict: (1) no-leak — a body never restates what the pointed file holds; text around a pointer is limited to the skill-specific parameters the file leaves open (producer name, what the line states, which folder), and anything the body needs for its own judgment at that step is written as the skill's rule, not as a paraphrase with a citation; (2) `per` is never used before a reference path, in bodies or in reference files; a check greps for ``per `<skill_path>`` and fails on a hit. Same-body section pointers keep `per`. The rule goes into `suite/authoring/body-structure.md` and `suite/authoring/shared-references.md`, and the instruction → format pointers get the same treatment.

Rationale: The reference is only useful if it is read; a pointer that reads as a citation beside a paraphrase invites skipping it, and the paraphrase drifts from the file. Fixing the intent rather than the exact verb keeps bodies readable where "follow" would be awkward, while the two strict rules catch the actual failure mode. Trade-off: the intent rule is judged by the author rather than checked mechanically; only the `per` ban is greppable.

## DR5: `emit-terminal-outcome.md` stays as the one home of the outcome contract, pointed at from every exit

Context: `shared/references/instructions/emit-terminal-outcome.md` holds the closed three-token vocabulary (`DONE`, `BLOCKED`, `REFUSED`), the `Outcome:` line shape, and the one-line-last-line rule. That vocabulary is a published contract: `README.md` documents it and the CLI classifies runs on it. Ten bodies point at the file, but only at their `DONE` step; every `REFUSED` and `BLOCKED` exit spells the literal `Outcome:` line inline instead. The seed asked whether to delete the file or split it into three.

Decision: The file is kept, singular, and remains the only place the outcome vocabulary and line rules are written. Every exit in every completion-oriented body — refusal, block, and completion — is a pointer to it in the DR4 shape, with the token and the reason as the skill-specific parameters (e.g. "follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the dirty paths and how to re-invoke"). No body spells the `Outcome:` line or enumerates the tokens itself. The file gains one sentence stating that it is followed at whichever exit the run reaches.

Rationale: The contract has a CLI dependency, so it must live in exactly one place; deleting the file would copy it into about fourteen bodies, and splitting it into three would leave the binding rule with no single home. The observed inconsistency was bodies leaking the file's content at two exits, which is the DR4 defect, not a defect of the file. Trade-off: the exit sentence is slightly longer than the inline literal it replaces.

## DR6: The log's seven types are listed under a `### Types` subheading in `log-line.md`, definition and example together

Scope: `shared/references/formats/log-line.md`

Context: The format skeleton (title, intro, `## Shape`, `## Rules`, no other second-level heading) dropped the former `## The seven types` section, leaving the type definitions as one dense bullet under Rules and the example lines under Shape, so an agent reads two places to learn one thing. The skeleton does not forbid third-level headings.

Decision: `## Shape` in `log-line.md` gains a `### Types` subheading holding one bullet per type. Each bullet carries the type's definition, followed on an indented continuation line by one example entry explicitly labelled as such (e.g. `Example: - (decision) exports go through the queue worker, because …`). Shape keeps the header and entry skeleton above it; the standalone example block under Shape is removed; the Rules bullet shrinks to "every line uses one of the seven types listed under `### Types`". The vocabulary stays closed at the seven types: no `note` or free-form type is added, and a Rules bullet states that a thought fitting none of the seven is not a log entry. The authoring skeleton in `suite/authoring/shared-references.md` is unchanged.

Rationale: A subheading inside Shape restores the quick overview without reopening the skeleton decision, and putting definition and example on the same bullet removes the split the previous layout created. Labelling the example line avoids it being read as a second definition or a literal template. The vocabulary stays closed because `spec` reads `event` lines mechanically and because a catch-all type would become the default and make the log unscannable; adding a named eighth type later is cheaper than removing a `note` type.

## DR7: Fenced blocks in reference files are never indented

Scope: `shared/references/formats/*.md`

Context: Three canonical format files — `implementation-report.md`, `roadmap-index.md`, `pending-decision-bundle.md` — open their `## Shape` fence as `  ```markdown` with two leading spaces, and the sync script mirrors that into 23 skill-local copies. Every other fence in the suite is flush left.

Decision: Every fence in a shared reference file and in a skill body starts at column one; the three files are fixed at the source and re-synced. The check that DR1 and DR4 add also fails on a fence line with leading whitespace, so the drift cannot return.

Rationale: An indented fence renders as an indented code block only when the surrounding list context allows it, and otherwise as literal backticks; uniform flush-left fences remove the ambiguity and make the format files read identically. Trade-off: none of substance.

## DR8: The new text checks live in one new script, `suite/scripts/check-skill-text.mjs`

Scope: `suite/scripts/`, `.github/workflows/ci.yml`, `CONTRIBUTING.md`, `suite/AGENTS.md`

Context: DR1, DR4 and DR7 each introduce a mechanical rule over the suite's Markdown. The two existing scripts each have one job — `check-marketplace-skills.mjs` guards marketplace discovery, and `sync-shared-references.mjs` validates the manifest and mirrors the shared references — and neither is a natural home for a prose lint.

Decision: A new dependency-free script `suite/scripts/check-skill-text.mjs` walks every `.md` under `suite/skills/` and `suite/shared/references/` and fails on: (1) a `references/` path not preceded by `<skill_path>/`; (2) the sequence ``per `<skill_path>``; (3) a fence line with leading whitespace. `suite/authoring/` is excluded because the authoring documents quote the forbidden forms as negative examples. Each hit prints as `path:line: rule`; exit 0 when clean, 1 on any hit. It runs beside the marketplace check in `.github/workflows/ci.yml` and is named where that check is named in `CONTRIBUTING.md` and `suite/AGENTS.md`.

Rationale: One script per job keeps the existing scripts' contracts intact, and a single text-lint script is the one place to add later rules of the same kind. Trade-off: a third script to remember, mitigated by wiring it into CI and the contributor documentation.

## DR9: Same-body section pointers keep `per`

Context: Skill bodies point at sections of the same body 107 times as "per `## <Section>`", mostly in the three implement skills. DR4 bans `per` before a reference path because such a pointer reads as a skippable citation.

Decision: Same-body section pointers are left as they are and keep `per`. `suite/authoring/body-structure.md` states the distinction in one sentence: `per` before a heading of the same body is fine, `per` before a file path is the defect DR4 removes. The DR8 check matches only ``per `<skill_path>``.

Rationale: A same-body section is already loaded, so the skip-the-file failure cannot occur, and keeping `per` for headings is what makes the path check unambiguous. Sweeping 107 cosmetic edits would carry no behavioural gain. Trade-off: two meanings of `per` coexist in a body, which the authoring rule makes explicit.
