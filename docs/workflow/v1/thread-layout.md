# V1 Thread Layout
**Codifies:** D7, D107

## Thread Root

Every V1 workflow thread lives under a single durable root:

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/
```

The leading `YYMMDDHHMMSSZ` is the 12-character UTC stamp captured when the thread was opened; the trailing `<slug>` is a short kebab-case description of the thread's subject. The combination yields a stable, sortable, reviewable directory that holds every artifact produced for one feature, bug, investigation, or decision [D7].

Example (from this repo):

```text
docs/threads/260520095223Z-agentic-workflow/
```

The thread root is the only path V1 skills are permitted to write workflow artifacts to. Scratch and temporary work tied to the thread belongs in that thread's local `.wip/` folder — never in a repository-level WIP root [D7].

## Folder Set

The exact V1 folder set inside a thread root is:

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/
|-- proposals/
|-- specs/
|-- plans/
|-- discussions/
|-- inbox/
|   |-- open/
|   |-- processed/
|   `-- dropped/
`-- .wip/
```

- `proposals/` — emitted proposal artifacts written by the `propose-*` skills.
- `specs/` — emitted spec artifacts written by the `spec-*` skills.
- `plans/` — emitted plan artifacts written by the `plan-*` skills.
- `discussions/` — emitted discussion / decision-log artifacts written by the `discussion`, `seeded-discussion`, and interactive `review-*` skills.
- `inbox/open/` — actionable findings still awaiting triage; populated by `review-*-auto` and by `capture-inbox` in user-active flows.
- `inbox/processed/` — inbox items moved here after they have been addressed; status is reflected by folder, not by frontmatter.
- `inbox/dropped/` — inbox items intentionally discarded after triage; kept for audit, not for action.
- `.wip/` — per-thread scratch and draft material; gitignored via the recursive `docs/threads/**/.wip/` rule and never emitted as a reviewable artifact [D107].

## On-Demand Creation

V1 thread folders are NOT pre-created proactively. A folder appears only when a skill writes its first artifact there. Folders are created on-demand when an artifact lands; an empty thread is just a thread root + whatever folders the workflow has touched. A thread that only ever held a discussion (such as `docs/threads/260520095223Z-agentic-workflow/`) will contain `discussions/` and nothing else until a spec, plan, or review actually lands.

## Excluded Folder Names

D107 explicitly rejects the following folder names. No V1 skill writes into them; existing material that would once have been routed to these names is rerouted as shown:

- `reviews/` → `inbox/open/` (review findings land as inbox items; interactive reviews also emit a decision log to `discussions/`).
- `verifications/` → `inbox/open/` (verification is a `review-implementation-*` variant, not a separate phase).
- `merges/` → the target artifact type's folder (a merged spec lands in `specs/`, a merged plan in `plans/`, etc.).
- `adrs/` → `discussions/` (architectural decisions are captured as decision-log entries inside the relevant discussion artifact).

If a skill or reader appears to require one of these excluded folders, treat it as a sign that the routing convention above has been missed — do not introduce the folder.

## Companion Docs

- [`./filename-grammar.md`](./filename-grammar.md) — Record and versioned artifact filename grammars, UTC stamp pattern, and the mandatory artifact-type suffix.
- [`./immutability.md`](./immutability.md) — Emitted-artifact immutability, draft editability inside `.wip/`, no source-relation frontmatter, and how ambiguous artifact references are resolved.
