# Thread Layout

## Thread Root

Every thread lives under a single durable root:

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/
```

The leading `YYMMDDHHMMSSZ` is the 12-character UTC stamp captured when the thread was opened; the trailing `<slug>` is a short kebab-case description of the thread's subject.

The thread root is the only path skills are permitted to write emitted artifacts to. Scratch and temporary work tied to the thread belongs in that thread's local `.wip/` folder — never in a repository-level WIP root.

## Folder Set

The exact folder set inside a thread root is:

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

- `proposals/` — emitted proposal artifacts.
- `specs/` — emitted spec artifacts.
- `plans/` — emitted plan artifacts.
- `discussions/` — emitted discussion and decision-log artifacts.
- `inbox/open/` — actionable findings still awaiting triage.
- `inbox/processed/` — inbox items moved here after they have been addressed.
- `inbox/dropped/` — inbox items intentionally discarded after triage; kept for audit.
- `.wip/` — per-thread scratch and draft material; gitignored and never emitted as a reviewable artifact.

## On-Demand Creation

Thread folders are NOT pre-created proactively. A folder appears only when a skill writes its first artifact there. An empty thread is just a thread root plus whatever folders prior skill runs have touched.

## Excluded Folder Names

The following folder names are explicitly not used:

- `reviews/` → review findings land in `inbox/open/`; interactive reviews also emit a decision log to `discussions/`.
- `verifications/` → verification is a review-implementation variant, not a separate phase; findings land in `inbox/open/`.
- `merges/` → the target artifact type's own folder (a merged spec lands in `specs/`, a merged plan in `plans/`, etc.).
- `adrs/` → architectural decisions are captured as decision-log entries inside the relevant discussion artifact in `discussions/`.

If a reader or skill appears to require one of these excluded folders, treat it as a sign that the routing convention above has been missed — do not introduce the folder.
