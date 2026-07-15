---
name: take-snapshot
description: Derive a comprehensive, stack-agnostic snapshot document of an existing codebase when the user wants a hybrid SRS and PRD for a 1:1 rebuild, rewrite, port, or documentation pass without migration or target-stack guidance.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.2.2
---

# Take Snapshot

Given an existing codebase, produce a single Markdown snapshot that a separate team could rebuild from — in the same stack or a different one — without consulting the original code. The document is a hybrid **Software Requirements Specification** (loosely IEEE 830 / ISO/IEC/IEEE 29148:2018) and **Product Requirements Document**: product framing on top, functional and non-functional requirements with stable IDs in the middle, technical architecture and business rules at the bottom, open questions consolidated at the end.

The document is a **frozen snapshot** of the application at the moment the skill runs. It describes what currently exists; it does not track what was, what's planned, or what was deprecated. A later run on the same codebase produces a fresh, independent snapshot.

The skill's value is **coverage and traceability**, not stylistic polish. Bugs of omission in the snapshot become bugs in the rebuild. Bias toward completeness over speed; this skill is expected to be slow.

## What this skill is — and isn't

- **Do**: read the source, infer what the app currently does, write the snapshot, flag what cannot be determined from code as Open Questions.
- **Don't**: write any code, edit any file outside the snapshot output path, refactor "while we're here", or run anything destructive. This skill is **read-only with respect to the source codebase**.
- **Stack-agnostic on both sides**: never mention or assume the source technology (framework, language, build system) or any target rebuild technology. The document describes *what the app does*, not *how to port it*.
- **No migration content**: never include sections titled "Migration Notes", "Implementation Hints", "Rebuild Considerations", "Source → Target Mapping", or any equivalent. That ground is explicitly out of scope. A source→target mapping would lock the document to one rebuild target and shorten its useful life — let the rebuild project produce its own mapping doc separately.
- **No history, no deprecation**: the snapshot describes only what exists now. No "previously did X" notes, no `[DEPRECATED]` markers, no change logs versus a prior run. If a feature isn't in the code right now, it isn't in the snapshot.
- **Single file**: always one Markdown file. No master index, no per-area splits, no companion files.
- **Honest about fidelity**: a "1:1 rebuild" is bounded by what's observable in the code plus what humans answer in the Open Questions section. Say so in the methodology preamble; never paper over it.

## Orchestrator role

The agent receiving the request becomes the **orchestrator**. The orchestrator plans angles, dispatches exploration subagents in parallel, then writes the snapshot from their notes.

The orchestrator does **no** first-hand reading of the source codebase. Every search, listing, file read, or `grep` against the source goes through a subagent — without exception, including trivial repo-root listings and top-level manifest files. The orchestrator's tools touch only its own scratch outputs (the run folder's `.metadata.json` and the notes files written by subagents) and the final snapshot output path. This is what keeps the orchestrator's context window clean enough to maintain global consistency across the whole document (IDs, cross-references, holistic phrasing).

Subagents never feed information back through their reply. They write to disk and acknowledge; the orchestrator reads the file on disk. The reply is treated as a no-op signal — useful only to know the subagent has returned, never as content. If a notes file is missing after a subagent reports success, the orchestrator re-spawns the subagent with the same brief and waits for the file to appear on disk. The reply is never trusted as a source of truth; the file on disk is the only signal that work is complete.

The writer is the orchestrator itself. Document writing is **serialized**, never parallelized, because FR/NFR IDs must remain globally unique within the document.

## Output structure

The primary artifact:

```
<cwd>/APP_SPECIFICATION.md      # default; overridable via prompt
```

Exploration notes (durable evidence trail; useful for human verification and audit):

```
<cwd>/docs/take-snapshot/
└── YYYY-MM-DD_NN/              # one folder per run; date + per-day index separated by `_`
    ├── .metadata.json          # started_at, source_root, output_path, scope_filter, skill_version
    ├── 00-survey.md            # high-level overview produced in Step 2
    ├── 01-<angle>/             # one folder per exploration angle
    │   └── notes.md            # findings, evidence, draft requirements
    ├── 02-<angle>/
    │   └── notes.md
    └── ...
```

If a snapshot already exists at the output path from a previous run, treat it as historical: the new run **overwrites** it. The notes folder uses a date-stamped subfolder so prior evidence trails are preserved alongside their (now overwritten) document, in case the user wants to compare manually. Mention the overwrite in the final message.

## Document template

The snapshot has these sections in this order. Skip a section if it would be genuinely empty; don't pad.

### 1. Methodology preamble

A short block at the very top, before any other section. It records:

- Skill name and version that produced the run.
- Date of generation.
- Source root inspected (absolute or repo-relative path).
- Scope filter applied, if any (subdirectory limit).
- A one-line statement that the document is a frozen snapshot of the application at the time of generation, bounded by what's observable in code plus answers to Open Questions, and is **not** stack-specific guidance.
- A bulleted list of *what was inspected* (the angles that ran) and *what was not* (anything the orchestrator deliberately did not look at — e.g. backend code in a frontend-only run, generated files, vendored dependencies).

The preamble exists so reviewers can calibrate confidence without reading every requirement.

### 2. Product overview

Non-technical framing. What the application is, who uses it, what problems it solves, the high-level user journeys. Inferred from screens, routes, copy, README content, and feature folders.

If the source is silent on intent (no README, no in-app copy, no obvious user-facing naming), state that explicitly and ask for product framing in Open Questions — do not invent positioning.

### 3. Feature inventory

A flat list of every user-facing feature the orchestrator could identify, grouped by area. One short paragraph per feature: what it does from the user's perspective. No requirements yet, no IDs yet — this section is the bridge between product framing and the formal FR list. PMs should be able to read this and confirm the feature map before engineers consume the FRs.

### 4. Functional requirements

Numbered list with stable IDs scoped to this document. Format per item:

```
#### FR-0042 — <short title>

**Statement.** <One paragraph stating what the system must do. Active voice. Testable.>

**Acceptance.** <Bulleted conditions a tester or downstream implementer could verify against.>

**Trace.** <Source files, route paths, function names, or other evidence pointers. Multiple entries allowed.>

**Notes.** <Optional. Edge cases, related FRs, dependencies.>
```

- **IDs are zero-padded to 4 digits** (`FR-0001`, `FR-0002`, …), assigned sequentially in document order during writing.
- IDs are **unique within this document**. They do not need to match any IDs from a prior run on the same codebase — the prior document is a separate snapshot.
- Group requirements by feature area with `###` subheadings. The grouping is presentation only; IDs are global and unique across the whole document.
- Every FR must have at least one entry under **Trace**, or it must explicitly say `Trace: derived from <screen/route/observable behavior>, no single source file owns it`. Untraceable FRs are red flags — surface them in Open Questions if you suspect you're guessing.

### 5. Non-functional requirements

Same shape as FRs but `NFR-XXXX`. Cover only what is observable or strongly implied by code:

- Performance budgets visible in code (timeouts, debounces, cache TTLs).
- Security postures (auth scheme, password rules, session handling, transport).
- Accessibility commitments visible in markup/semantics (ARIA roles, focus management, contrast tokens).
- Internationalization (locales supported, translation pipeline, RTL handling).
- Observability (logging levels, telemetry endpoints, error boundaries).
- Offline / connectivity behavior (caching layers, retry policies, queueing).
- Compatibility (minimum platform versions declared in manifests or build config).

Do **not** invent NFRs the code is silent on ("the rebuild should be performant" is filler). If an NFR feels obviously required but isn't expressed anywhere in the source, put it in Open Questions, not in this section.

### 6. Technical architecture

A description of the *logical* architecture — components, modules, data flow, persistence boundaries, external integrations — **without naming the source stack**. Write as if explaining to a senior engineer who will pick the rebuild stack themselves: "a layer that owns user session state and persists it across app restarts", not "a Zustand store with persist middleware".

Sub-sections to include when relevant:

- **Components and responsibilities** — logical building blocks.
- **Data model** — entities, relationships, key fields, identifiers. Use stack-neutral notation (a simple table or ER-style prose).
- **External integrations** — APIs consumed, endpoints, payload shapes, authentication mode, webhooks, third-party SDKs (named by what they *do* where possible: "a transactional email provider" rather than "SendGrid", unless the provider identity is itself a requirement).
- **Configuration surface** — environment variables, feature flags, runtime config keys. List names and what each controls. Never list secret values.
- **Permissions and manifests** — device/platform permissions requested, declared capabilities, deep link / universal link routes, push notification channels.
- **Build and deployment surface** — what gets built, what gets deployed where. Describe outputs, not toolchain.

### 7. Business rules and edge cases

The "if X then Y" rules the application encodes — validation rules, calculation formulas, state machines, eligibility checks, throttling and quota logic, retry behavior, conflict resolution. Each rule gets its own item; cross-reference the FRs it supports.

This section often surfaces the highest-leverage gaps for a rebuild, because business rules are the most expensive to lose. Be exhaustive.

### 8. Glossary

Domain terms used in the document with one-line definitions. Helps PMs and engineers stay aligned. Skip if the domain language is trivially common.

### 9. Open Questions

Everything the code cannot answer, consolidated. One item per question. Each item should:

- Pose the question precisely.
- State why the code cannot answer it (server-side rule, design decision in Figma/Jira, A/B experiment config, push-notification payload semantics decided on the server, etc.).
- Identify who is likely to know (backend team, PM, designer, etc.) when that's inferable.
- Cross-reference the FRs/NFRs/rules that depend on the answer.

This section is **never empty in practice**. If it appears empty, the orchestrator probably guessed somewhere — re-check.

## ID assignment

Inside a single document run:

- Assign IDs sequentially in document order: the first FR written gets `FR-0001`, the second `FR-0002`, and so on. Same for NFRs.
- IDs are global across the document. Grouping FRs by feature area with `###` subheadings is a presentation choice; the numbering does not reset per area.
- Once assigned, an ID must remain stable through the rest of the same writing pass so the **Notes** cross-references and the **Open Questions** back-references resolve correctly.

There is no cross-run ID stability requirement. A re-run produces a fresh snapshot with fresh IDs.

## Exploration Plan

The orchestrator dispatches one subagent per applicable angle. The catalog below is the **starting set** — pick the angles that actually apply to this codebase. A frontend-only repo doesn't need a database-schema angle; a backend repo doesn't need a screen-inventory angle. Add fresh angles when the codebase has surfaces this list doesn't cover (e.g. ML model registry, hardware integrations, payment flows complex enough to warrant their own angle).

Default catalog:

1. **Navigation & screens** — route map, screen inventory, navigation graph, deep links, modals, layouts.
2. **State & domain logic** — state containers, reducers, business logic modules, computed values, derivations.
3. **Data model & persistence** — entities, relationships, local storage layers, caches, sync mechanisms.
4. **External integrations** — API clients, endpoints consumed, request/response shapes, third-party SDKs, webhooks.
5. **Authentication & authorization** — login flows, session handling, token storage, role/permission checks, gated routes.
6. **Configuration surface** — environment variables, runtime config, feature flags, A/B experiment toggles visible in code.
7. **Platform & manifests** — declared permissions, capabilities, push notifications, background tasks, OS-level integrations.
8. **Localization & accessibility** — i18n catalogs, locale switching, RTL handling, ARIA semantics, focus management.
9. **Cross-cutting UX** — theming, design tokens, error boundaries, loading and empty states, toast/notification patterns.
10. **Build, CI, and deployment surface** — what artifacts are produced, what targets are built, CI pipeline stages (without naming the toolchain in the snapshot — describe outputs).
11. **Non-functional signals** — timeouts, debounces, retry policies, cache TTLs, logging levels, telemetry endpoints, performance hints baked into the code.
12. **Business rules** — validation, calculation formulas, state machines, eligibility rules, quota and throttling logic.

Each angle's notes feed sections of the document; the same finding may inform multiple sections (e.g. an API client integration shows up in both External integrations and FRs about features consuming it). The orchestrator handles cross-referencing during writing.

## Workflow

Run the process as numbered steps. Steps run in order; **inside a step**, subagents run in parallel and the orchestrator waits for them all to return before advancing.

### Step 1 — Bootstrap

1. **Parse arguments** (any of these may be in the user's prompt; defaults shown):
   - `output_path`: default `<cwd>/APP_SPECIFICATION.md`.
   - `source_root`: default `<cwd>`. May be a subdirectory if the user wants a scoped snapshot.
   - `scope_filter`: optional path glob(s) restricting which files exploration may inspect.

2. **Resolve the run folder**: `<cwd>/docs/take-snapshot/YYYY-MM-DD_NN`. List existing same-date runs and pick the next zero-padded 2-digit index (`01` if none, otherwise `02`, …). Separate date and index with `_`. `mkdir -p` the folder.

3. **Write `.metadata.json`**:
   ```json
   {
     "started_at": <epoch seconds>,
     "skill_version": "<from this skill's frontmatter>",
     "source_root": "<absolute path>",
     "output_path": "<absolute path>",
     "scope_filter": "<glob or null>"
   }
   ```

4. **If a file already exists at `output_path`**, note that it will be overwritten — do not read it for ID continuity. Each run is independent.

### Step 2 — Survey

The orchestrator dispatches a **survey subagent** — always, regardless of repo size, because the orchestrator never reads the source directly. The subagent performs a quick high-level pass (repo root listing, top-level manifest/config files, project shape, top-level folders) and writes `<run-folder>/00-survey.md` capturing:

- Project shape and top-level layout.
- Candidate feature areas (folder names, route prefixes, package names).
- Which angles from the catalog apply, which don't, and any fresh angles to add.

After the subagent returns, the orchestrator **verifies `00-survey.md` exists on disk**. If it doesn't, re-spawn the survey subagent with the same brief. Re-spawn as many times as needed until the file is on disk.

The orchestrator then reads `00-survey.md` from disk to extract the planned angles, and appends them to `.metadata.json` under a `planned_angles` field so the run is auditable later.

### Step 3 — Parallel exploration

Dispatch one subagent per planned angle in a single tool call. Each subagent writes to `<run-folder>/NN-<angle-slug>/notes.md`.

After every subagent in a batch has returned, the orchestrator **verifies each expected `notes.md` exists on disk** under its angle folder. If any file is missing — for any reason, including a subagent that reported success — re-spawn that subagent with the same brief. Re-spawn as many times as needed until every expected file is on disk. The subagent's reply is never trusted; the file is the only completion signal.

If the number of angles is too large to dispatch in one parallel batch reliably, split into smaller batches — but never collapse Step 3 into Step 4. All exploration finishes before any writing starts.

Do **not** read the notes files during Step 3. Reading is deferred to Step 4 so it can be done sequentially in a single, predictable order.

### Step 4 — Writing

The orchestrator (writer is the orchestrator itself; **never delegated to a subagent**, because global ID consistency depends on a single writer) composes the document from the notes:

1. **Read the notes files one at a time, in numerical order** of the angle folder prefix — `00-survey.md` first, then `01-<angle>/notes.md`, then `02-<angle>/notes.md`, and so on. Use a separate Read call per file; do not batch reads in parallel. This sequential intake gives the orchestrator a predictable, ordered build-up of context.
2. Once **all** notes are read, write the methodology preamble first, then product overview, feature inventory, FRs, NFRs, technical architecture, business rules, glossary, open questions — assigning `FR-XXXX` / `NFR-XXXX` IDs sequentially as requirements are written.
3. Cross-reference: every Trace pointer should be a real file path or route, ideally with a line number when it sharpens the reference. Every Open Question should cross-reference the FRs/NFRs/rules that depend on it.
4. Write the final document in one pass to the `output_path`, overwriting any prior file there.

### Step 5 — Final message

A short message to the user, under 10 lines:

- Output path written (and a note if it overwrote an existing file).
- Run folder path (so the user can audit the notes that fed the snapshot).
- Summary: number of FRs, NFRs, business rules, open questions.
- One sentence reminding the user that Open Questions is the next thing to triage with PMs/backend engineers, and that visual flows / screenshots must be attached by a human (the skill cannot produce them from code).
- Skill version that produced this run.

## Subagent briefs

The orchestrator never inherits a subagent's session and never loads a subagent's notes back into its own context (it reads the notes from disk in Step 4).

### Survey subagent (Step 2)

Dispatched on every run, regardless of repo size — the orchestrator never reads the source directly, so the survey subagent is the only way the orchestrator gets a view of the repo's shape.

- **Source root** — absolute path.
- **Scope filter** — glob if any, otherwise none.
- **Output path** — `<run-folder>/00-survey.md`.
- **Output shape** — markdown with `## Project shape`, `## Top-level layout`, `## Candidate feature areas`, `## Recommended angles`, `## Notes` (anything surprising — e.g. apparent dead code, multiple apps in one repo, signs of an in-progress feature that's only partially wired up).
- **Hard constraints** — read-only on the source. Read directories and config files at the top two levels only; do **not** descend deeply. No code edits, no destructive commands.
- **Return contract** — write the file and reply with a single short acknowledgment (e.g. `done`). Do **not** include a summary, the file path, or any content from the survey. The orchestrator does not parse the reply — it reads the file from disk during Step 2's verification step.

### Exploration subagent (Step 3, one per angle)

- **Angle** — single angle name and a one-sentence framing of what the angle covers.
- **Source root** and **scope filter** — same as Step 2.
- **Output path** — `<run-folder>/NN-<angle-slug>/notes.md`. The subagent `mkdir -p`s the angle folder.
- **Output shape** — markdown with these sections:
  - `## Findings` — what this angle reveals about the application. Bulleted, concrete, observable.
  - `## Evidence` — file paths (with line numbers when useful) backing each finding.
  - `## Draft requirements` — proposed FR/NFR items in the format defined above, **without** final IDs (use `ID: TBD` as a placeholder). The writer will assign IDs in Step 4.
  - `## Open questions` — anything this angle surfaces that code cannot answer. The writer will consolidate.
  - `## Cross-references` — pointers to other angles whose findings this likely overlaps with, so the writer can merge cleanly.
- **Discipline** —
  - Read the code thoroughly within the angle's scope. Multi-pass is fine; this skill is not optimizing for latency.
  - Never invent behavior. If a finding can't be traced to a file, omit it or move it to Open Questions.
  - Never name source-stack or target-stack technologies in the body of draft requirements. Describe behavior, not implementation. ("Persists session across app restarts" — yes. "Uses Redux Persist with localStorage" — no.)
  - Never include code snippets in draft requirements. Evidence can cite snippets; requirements must be stack-neutral prose.
- **Hard constraints** — read-only on the source codebase. No writes outside the angle folder. No code edits anywhere.
- **Return contract** — write the file and reply with a single short acknowledgment (e.g. `done`). Do **not** include a summary, the file path, or any content from the notes. The orchestrator does not parse the reply — it reads the file from disk in Step 4.

The orchestrator dispatches one of these per planned angle, in parallel.

## Discipline (for the orchestrator)

- **No inline reads of the source.** Every read, listing, search, or `grep` of the source codebase goes through a subagent — without exception. The orchestrator's tools touch only its own scratch outputs (the run folder) and the snapshot output path. Even a single inline `ls` or `cat` of a source file is a discipline violation: it bypasses the file-on-disk handoff that keeps the context clean.
- **Trust the file, not the reply.** A subagent's reply is acknowledgment only. If the expected file is missing on disk, re-spawn the subagent with the same brief, however many times it takes. Never "stitch" a missing report from memory or from anything the reply said.
- **Read-only on the source even via subagents.** Subagents never edit, refactor, or "clean up" source files. The snapshot is the only output.
- **Stack-neutral language in the document.** Source-stack and target-stack names belong nowhere in the body. They may appear in the methodology preamble's *what was inspected* list only when the artifact name is itself load-bearing context for understanding the inspection (e.g. "iOS Info.plist parsed for declared capabilities") — and even then, lean toward describing the artifact, not the technology.
- **No invented requirements.** Every FR/NFR/rule must trace to code or to an explicit Open Question. If you're tempted to add an NFR because "every app needs this", route it to Open Questions instead.
- **No migration content.** No "Implementation Hints", no "Rebuild Considerations", no source→target mapping under any name. This is non-negotiable.
- **No history.** The snapshot describes the present. No "previously did X", no `[DEPRECATED]` markers, no change logs.
- **Honesty about gaps.** Open Questions is the single place gaps live. Don't sprinkle `TODO`s through the snapshot.
- **No screenshots, no visual flows.** The skill cannot render them. Reference where they belong (e.g. "see attached screen flow for FR-0042 — to be added by author") and mention this in the final message.

## When the codebase is too thin

If the source is so sparse that meaningful angles can't run (empty repo, scaffolding only, mostly generated code), still produce a snapshot — but make it honest:

- A short methodology preamble.
- A `## Product overview` that says the source does not yet express enough to infer product framing.
- A populated `## Open Questions` listing what the author/team must answer for the snapshot to be filled in.
- Empty FR/NFR sections explicitly marked as such, not omitted, so the reader knows the exploration ran and found nothing rather than that those sections were forgotten.

Better to return a 200-line honest skeleton than a 2000-line fabrication.
