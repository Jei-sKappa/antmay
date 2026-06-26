# V2 Thread Layout
**Realizes:** §3 (the thread folder set, lineage folders, nesting, path references); §4, §5 (the ledger's location at the thread root); §6 (the `seed/` genesis bucket)

This is the V2 successor to `v1/thread-layout.md`. The thread root is unchanged from
V1; inside it, V2 reorganizes around **lineage folders** (records attach to the spine
node they serve), adds a **thread-root lifecycle ledger** and a **`seed/` genesis
bucket**, and **removes the inbox**.

## Thread Root

Every V2 workflow thread lives under a single durable root:

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/
```

The leading `YYMMDDHHMMSSZ` is the 12-character UTC stamp captured when the thread was
opened; the trailing `<slug>` is a short kebab-case description of the subject. The
combination is a stable, sortable, reviewable directory holding every artifact for one
feature, bug, investigation, or decision. The thread root is the only path V2 skills
write workflow artifacts to.

## Folder Set

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/
├── ledger.md                              # thread root — append-only tier + disposition
├── seed/                                  # genesis bucket
│   ├── seed.md                            # exactly one — frozen genesis narrative (fixed name)
│   ├── <UTC>-<desc>-notes.md              # optional — genesis source material
│   └── discussions/                       # pre-artifact discussions target the seed
├── proposals/
│   └── NNN[-<desc>]/                      # lineage folder — the stable link target
│       ├── proposal.md
│       ├── discussions/
│       └── reviews/
├── specs/
│   └── NNN[-<desc>]/
│       ├── spec.md
│       ├── discussions/
│       └── reviews/
├── plans/
│   └── NNN[-<desc>]/
│       ├── plan.md
│       └── reviews/                       # machine adherence reviews
├── implementation/                        # flat, records-only spine node
│   ├── <UTC>-<desc>-implementation-report.md
│   ├── discussions/
│   └── reviews/                           # code reviews, verifications
└── .wip/                                  # gitignored, editable drafts — variant bake-offs live here
```

- **`ledger.md`** — the thread lifecycle ledger; see [`./lifecycle.md`](./lifecycle.md).
- **`seed/`** — the genesis bucket; see "The Seed Bucket" below.
- **`proposals/`, `specs/`, `plans/`** — each holds lineage folders, one per lineage.
- **`implementation/`** — a flat, records-only spine node (see below).
- **`.wip/`** — per-thread scratch and draft material; recursively gitignored via
  `docs/threads/**/.wip/`; never emitted as a reviewable artifact. Variant bake-offs
  live here.

## Lineage Folders

Inside `proposals/`, `specs/`, and `plans/`, artifacts live in **lineage folders**
named:

```text
NNN[-<desc>]/
```

- `NNN` is a **mandatory zero-padded 3-digit sequence** starting at `001`
  (`001`, `002`, …). It is the **stable identifier**, and numbered folders sort in
  creation order.
- `-<desc>` is an **optional kebab slug**, added **only** to distinguish one lineage
  from another (`specs/001-api/`, `specs/002-cli/`). Adding a slug to a later lineage
  **never renames an earlier one**, so links stay stable.
- The **full path is the unit of reference** — `proposal.md` / `spec.md` / `plan.md`
  are meaningless bare, by design: the path already carries the type (parent folder)
  and the subject (thread slug).
- There is **no type suffix on the folder, no mandatory descriptor, and no `v<N>`
  folder names.** `v1/` / `v2/` folders are rejected outright — "v" reads as *version*,
  and under V2 versions live in frontmatter; a second lineage is a different artifact,
  not a revision.

## Records Attach to the Spine Node They Serve

Records nest inside the **spine artifact they serve**, never inside other records:

- A review of the spec → the spec's `reviews/`.
- A discussion *of that review* → still the spec's `discussions/` (it serves the spec;
  its relationship to the review lives in its body and filename).

Targets form a **graph, not a tree** — forcing deeper nesting would mean
re-litigating "which parent" forever, so **nesting is capped at this one level by
rule.**

## The Ledger Lives at the Thread Root

The lifecycle ledger (`ledger.md`) lives at the **thread root**, **not** in `seed/`.
The seed answers "why does this thread exist" (frozen narrative); the ledger answers
"where is it now" (evolving). Different questions, different physics — splitting them
keeps the seed a clean immutable record and gives tooling a predictable parse target at
the thread root. See [`./lifecycle.md`](./lifecycle.md).

## The Seed Bucket

`seed/` is the **genesis bucket** and may hold **exactly three kinds of thing**:

1. **The seed** — `seed.md`, **exactly one** (a fixed-name singleton — no stamp, no
   slug; see [`./filename-grammar.md`](./filename-grammar.md)).
2. **Genesis source material** — immutable records carrying the raw inputs /
   provenance the thread was born from (copied notes, an external doc, a handoff
   brief), under the record grammar with the appropriate token (`notes`, `discussion`,
   …). This exists because a discussion cannot start from nothing.
3. **`discussions/`** — genesis discussions targeting the seed.

There is **no `reviews/` under `seed/`** — the seed is a few-line genesis record, not a
reviewed artifact. (The seed's format is defined in [`./spine.md`](./spine.md).)

## The Inbox Is Removed

V1's `inbox/` and all three subfolders (`open/`, `processed/`, `dropped/`) are
**removed in V2** — **no skill writes them.** Status-by-folder broke links; V2 derives
status instead (see [`./lifecycle.md`](./lifecycle.md)). The inbox's residual job —
capturing tangential items mid-work — is served by the implementation report and by
seeds of future threads (or tickets in the tracker).

## Multiple Lineages Are Not Variants

Keep the two apart:

- **Multiple lineages** — different subjects you intend to **keep** (an API spec *and*
  a CLI spec). They get sibling `NNN[-<desc>]/` folders.
- **Variants / candidates** — competing drafts of **one** subject meant to collapse to
  a single winner (the multi-model bake-off: opus vs sonnet vs codex drafting the same
  spec). They are pre-emission draft work and live in **`.wip/`** (gitignored,
  editable), never as emitted siblings.

The invariant: **one subject = one lineage folder = exactly one canonical artifact.**
Spin up candidates in `.wip/`, compare, and emit only the chosen-or-merged result once
as `specs/NNN/spec.md`; the losing drafts vanish from the reviewable record by design,
and a **decision log records why the winner won.**

## Path References

- **Within-thread references are thread-relative** — written relative to the thread
  root (`proposals/001/discussions/…`), never from the repo root and never absolute, so
  a thread can be moved or archived without breaking its internal links.
- **Cross-thread and external references are repo-relative** —
  (`docs/threads/<other>/…`, `docs/workflow/v1/…`).
- **Never absolute.**

## On-Demand Creation

V2 thread folders are **not pre-created**. A folder appears only when a skill writes
its first artifact there; there are no empty placeholder folders. A thread that only
ever held a seed and a genesis discussion contains `ledger.md` and `seed/` and nothing
else until a proposal, spec, plan, or implementation actually lands.

## `implementation/` Is Flat

`implementation/` holds its records **directly inside** (no lineage folders): the
implementation report and its `discussions/` and `reviews/`. This is the pinned
default; the documented revisit condition is **"if implementations multiply per
thread"** — only then would lineage folders for `implementation/` be reconsidered.

## Companion Docs

- [`./filename-grammar.md`](./filename-grammar.md) — the two filename forms, the UTC
  stamp, the artifact-type token vocabulary, and ambiguous-reference resolution.
- [`./lifecycle.md`](./lifecycle.md) — the ledger spec, immutability, the freeze model,
  and the frontmatter status contract.
- [`./spine.md`](./spine.md) — the seed format and the stages that write into each
  folder.
