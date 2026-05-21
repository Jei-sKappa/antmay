# V1 Immutability and Reference Resolution
**Codifies:** D39, D40, D41, D44, D49

## Emitted Artifacts Are Immutable

Once a versioned artifact (`-v<N>-...-<artifact-type>.md`) or a record artifact (`-<kebab-desc>-<artifact-type>.md`) has been written to its target folder under `docs/threads/<thread>/<folder>/`, it is NEVER edited [D39, D40, D41]. Emitted artifacts are part of the project's reviewable history, not mutable state. To change content, produce a new version (next mainline integer, or a new descriptor variant for the same target version per [`./filename-grammar.md`](./filename-grammar.md)) or a new record artifact.

This rule applies uniformly to both buckets: versioned artifacts (`proposal`, `spec`, `plan`) evolve only by emitting a new version or variant; record artifacts (`discussion`, `decision-log`, `inbox-item`, `review-finding`) do not evolve after emission at all — a follow-up is a new record.

## Drafts Are Editable

The exception is in-session draft material under the thread's `.wip/` folder. While a skill is actively authoring an artifact, the draft inside `.wip/` is EDITABLE [D40]. Once the skill chooses to emit — copy or move the draft into the target type's folder under the canonical filename grammar — the artifact is locked. The `.wip/` folder is recursively gitignored (`docs/threads/**/.wip/`); nothing inside it is reviewable workflow output.

In practice: a `spec-*` skill may rewrite the draft spec body any number of times inside `.wip/` during a session, but the moment it writes the file into `specs/` under the canonical filename, no further edits are allowed.

## No Source-Relation Frontmatter

V1 artifacts do NOT carry YAML frontmatter fields like `Supersedes:`, `Alternative to:`, `Forked from:`, or any other source-relation / lineage metadata [D44]. These fields are explicitly forbidden — they must not appear in artifact bodies as frontmatter, as inline commented-out hints, or as "optional" extensions.

Lineage lives in filenames only: the shared kebab description groups related artifacts together, and the version number orders mainline versions. The accepted trade-off is that a filename cannot tell whether a `v2` came directly from `v1`, from a `v2` variant, or from a merge of several inputs — that history is recovered from the surrounding thread, not from metadata on the file.

## Ambiguous Reference Resolution

When a downstream skill needs to resolve a reference like "the spec" or "the latest plan" and multiple candidates exist in the thread, the skill MUST ASK THE USER which artifact is intended [D49]. There is NO global "latest artifact" algorithm. There is no fallback to "most recent UTC stamp" or "highest version number". There is no implicit promotion of an unrelated variant to mainline just because it sorted first.

Ambiguity at this layer is often a real decision in disguise — which variant won, which alternative survived review, which merge produced the canonical version — and silently picking would hide that decision rather than surface it.

## What This Means In Practice

- A typo discovered in an emitted spec means a new version (`v2`), not an in-place edit.
- A `spec-*` skill referencing "the proposal" when multiple proposal versions exist asks the user which one.
- A `merge-artifacts-*` skill produces the next mainline integer version of the target type — it does not rewrite predecessors.
- Skill bodies MUST NOT instruct agents to add lineage frontmatter even as a comment or "optional" field.
- Reference docs in `docs/workflow/v1/` are themselves immutable by convention — a V2 ruleset lives at `docs/workflow/v2/`, not as in-place edits here.
- A `review-*` skill encountering "the implementation" when several implementation commits look candidate-shaped asks the user which one is being reviewed rather than picking by recency.

## Related

- [`./thread-layout.md`](./thread-layout.md) — defines the per-thread `.wip/` folder and the target-type folders artifacts are emitted into.
- [`./filename-grammar.md`](./filename-grammar.md) — defines the version-number grammar that "produce a new version" depends on.
