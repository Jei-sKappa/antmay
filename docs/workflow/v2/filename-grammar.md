# V2 Filename Grammar
**Realizes:** §3 (the two filename forms, the token vocabulary, ambiguity); §16 (the V2 vocabulary replacing V1's token list)

This is the V2 successor to `v1/filename-grammar.md`. V2 has **two** filename forms —
a versioned form that drops V1's `v<N>` machinery entirely, and a record form
unchanged from V1 — plus two fixed-name files (the ledger and the seed). The deep change is that
versioned artifacts no longer encode a version in the filename: the lineage folder is
the stable link target, and the version lives in frontmatter.

## UTC Stamp

Every filename stamp and every frontmatter timestamp uses the 12-character UTC stamp
with the literal pattern `YYMMDDHHMMSSZ` — no separators, trailing `Z` denotes UTC.
The field pairs are `YY` (two-digit year), `MM` (month), `DD` (day), `HH` (hour, 24h),
`MM` (minute), `SS` (second), followed by `Z`.

Example: `260518200115Z` parses to `2026-05-18 20:01:15 UTC`.

**Every timestamp marks an *event*** — a record's creation is its filename stamp; a
latch is its frontmatter stamp. There are **no** extended-format dates and **no**
standalone creation-date fields anywhere in V2: a versioned artifact's creation *order*
is its `NNN` lineage number and its precise time is git.

## Versioned Form

Versioned artifacts — **proposal, spec, plan** — carry **NO stamp and NO `v<N>`** in
the filename. The file is simply `<type>.md` inside its lineage folder:

```text
proposals/001/proposal.md
specs/001/spec.md
specs/002-cli/spec.md
plans/001/plan.md
```

- The lineage folder `NNN[-<desc>]/` is the stable identifier and the unit of
  reference; `proposal.md` / `spec.md` / `plan.md` are meaningless bare, by design —
  the path already carries the type (parent folder) and the subject (thread slug). See
  [`./thread-layout.md`](./thread-layout.md) for lineage-folder naming.
- The **version lives in frontmatter** (`version`), not in the filename. Plans carry
  no `version` at all (see [`./lifecycle.md`](./lifecycle.md)).
- The entire V1 `v<N>[-descriptor]` filename machinery is **removed**. There are no
  `-v2-` files and no `-descriptor-` variant files in the emitted record; competing
  drafts live in `.wip/` and only the canonical artifact is emitted (see
  [`./thread-layout.md`](./thread-layout.md)).

## Record Form

Record artifacts — discussions, decision logs, reviews, implementation reports,
notes, postmortems — use the V1 record form, **unchanged**:

```text
<YYMMDDHHMMSSZ>-<kebab-desc>-<artifact-type>.md
```

```text
260518200115Z-agentic-workflow-design-discussion.md
^^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^ ^^^^^^^^^^
UTC stamp    kebab description        artifact type
```

The UTC stamp and the mandatory artifact-type suffix are both preserved. The type
token is MANDATORY — no record filename may omit it — because it is what keeps grep
useful once files nest under lineage and `seed/`, `reviews/`, `discussions/` folders.

More examples:

```text
260520120000Z-workflow-v2-consultation-handoff-discussion.md
260521120000Z-review-findings-decision-log.md
260521101212Z-spec-lossless-mapping-review.md
260612174045Z-handoff-brief-notes.md
260625120000Z-auth-cutover-implementation-report.md
```

## The Lifecycle Ledger

The lifecycle ledger is a **fixed-name, append-only** file named **`ledger.md`** at
the thread root (not a stamped record, not a versioned artifact — a single fixed file
per thread). Its line grammar is defined in [`./lifecycle.md`](./lifecycle.md) (the
`<event> @ <YYMMDDHHMMSSZ> — <justification>` form); this doc only fixes the name and
location.

## The Seed

The seed is a **fixed-name singleton** named **`seed.md`**, inside the thread's `seed/`
genesis bucket (`seed/seed.md`) — **no stamp, no slug, no `v<N>`**. There is **exactly
one seed per thread**, so — exactly like the versioned `<type>.md` files and like
`ledger.md` at the root — its containing folder is already a stable, unique identifier:
the path carries the type (`seed/`) and the subject (the thread slug). A stamp and a
copied slug would only duplicate the thread-root folder name and could drift from it on
a rename, so the seed drops both.

The seed remains an **immutable, frozen genesis record** (see
[`./lifecycle.md`](./lifecycle.md)); only its *filename* is fixed rather than stamped.
It carries no filename stamp: its event time is the thread-root UTC stamp and its
precise creation time is git. The `seed` type token is retained — it is the whole short
filename `seed.md`, the way `spec`/`plan`/`proposal` are.

## V2 Artifact-Type Token Vocabulary

Relative to V1's token list:

- **Keep:** `proposal`, `spec`, `plan` (now the whole short filename `<token>.md`),
  `discussion`, `decision-log`.
- **Add:** `seed` (now a whole short filename — the fixed-name `seed.md`, like
  `spec.md`, not a stamped record token), `review` (replacing V1's `review-finding`),
  `implementation-report`, `notes`.
- **Remove:** `inbox-item` (the inbox is gone — see [`./thread-layout.md`](./thread-layout.md))
  and `review-finding` (replaced by `review`).

The full V2 list of recognized tokens:

```text
proposal   spec   plan   discussion   decision-log
seed   review   implementation-report   notes
```

The list is **documented but not exhaustive**: a future skill may register an
additional token by declaring it in the skill body that owns it; the new token is
added back to this list when stabilized.

## Ambiguous-Reference Resolution (Shrunk)

This is the V1 D49 successor. V1's "ask the user; there is no 'latest' algorithm" rule
existed mostly to resolve *which version or variant is current*. **V2 structurally
removes that question:** there is exactly one alive `<type>.md` per lineage with its
version in frontmatter, and variants are `.wip/` drafts of which only the winner is
emitted — so "which version/variant is current" can no longer arise.

What **still** genuinely requires asking the user:

- **Multiple lineages of one type in a thread** — `specs/001-api/` vs `specs/002-cli/`
  makes a bare "the spec" ambiguous. Resolve by asking which lineage is meant; there is
  no "most recent `NNN`" or "highest number" fallback.
- **Cross-thread references** — when "the spec" could mean a spec in another thread,
  ask which thread.

As in V1, ambiguity here is often a real decision in disguise (which lineage won, which
thread is canonical); silently picking would hide that decision rather than surface it.

## Companion Docs

- [`./thread-layout.md`](./thread-layout.md) — the folder each token lands in, lineage
  folders, the `.wip/` variant bake-off, and the path-reference rule.
- [`./lifecycle.md`](./lifecycle.md) — the `version` frontmatter field, the ledger's
  line grammar, and immutability.
