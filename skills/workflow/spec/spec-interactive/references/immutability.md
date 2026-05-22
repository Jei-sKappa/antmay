# Immutability and Reference Resolution

## Emitted Artifacts Are Immutable

Once a versioned artifact (`-v<N>-...-<artifact-type>.md`) or a record artifact (`-<kebab-desc>-<artifact-type>.md`) has been written to its target folder under `docs/threads/<thread>/<folder>/`, it is NEVER edited. Emitted artifacts are part of the project's reviewable history, not mutable state. To change content, produce a new version (next mainline integer, or a new descriptor variant for the same target version) or a new record artifact.

This rule applies uniformly to both buckets: versioned artifacts (`proposal`, `spec`, `plan`) evolve only by emitting a new version or variant; record artifacts (`discussion`, `decision-log`, `inbox-item`, `review-finding`) do not evolve after emission at all — a follow-up is a new record.

## Drafts Are Editable

The exception is in-session draft material under the thread's `.wip/` folder. While a skill is actively authoring an artifact, the draft inside `.wip/` is EDITABLE. Once the skill chooses to emit — write the draft into the target type's folder under the canonical filename grammar — the artifact is locked. The `.wip/` folder is recursively gitignored; nothing inside it is reviewable workflow output.

## No Source-Relation Frontmatter

Artifacts do NOT carry YAML frontmatter fields like `Supersedes:`, `Alternative to:`, `Forked from:`, or any other source-relation / lineage metadata. These fields are explicitly forbidden.

Lineage lives in filenames only: the shared kebab description groups related artifacts together, and the version number orders mainline versions. The accepted trade-off is that a filename cannot tell whether a `v2` came directly from `v1`, from a `v2` variant, or from a merge of several inputs — that history is recovered from the surrounding thread, not from metadata on the file.

## Ambiguous Reference Resolution

When a skill needs to resolve a reference like "the spec" or "the latest plan" and multiple candidates exist in the thread, the skill MUST ASK THE USER which artifact is intended. There is NO global "latest artifact" algorithm. There is no fallback to "most recent UTC stamp" or "highest version number". There is no implicit promotion of an unrelated variant to mainline just because it sorted first.

Ambiguity at this layer is often a real decision in disguise — which variant won, which alternative survived review, which merge produced the canonical version — and silently picking would hide that decision rather than surface it.

## What This Means In Practice

- A typo discovered in an emitted spec means a new version (`v2`), not an in-place edit.
- A skill referencing "the proposal" when multiple proposal versions exist asks the user which one.
- A skill producing a merge emits the next mainline integer version of the target type — it does not rewrite predecessors.
- Skill bodies MUST NOT instruct agents to add lineage frontmatter even as a comment or "optional" field.
