---
name: spec-auto
description: Turn a proposal, decision log, GitHub issue, or raw prompt into a handoff-grade spec markdown file, end-to-end, with no clarifying questions. Use when you already have the upstream input in hand and want a complete spec forward-designed from it without interactive authoring.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.1
---

# Spec Auto

Forward-design a handoff-grade spec artifact from a single upstream input, end-to-end. Read the input, draft the spec body covering all eight required semantic-contract elements, write the artifact, and confirm its path. Do not ask clarifying questions; do not interview the user element-by-element; do not commit.

## Inputs

Accept ONE of the following four input forms. Detect which form was passed before drafting:

1. **A proposal artifact path** — a proposal document on disk. The proposal is the most common upstream input; it carries intent, context, and a rough shape that the spec elaborates into expected behavior, constraints, and acceptance guidance.
2. **A decision-log artifact path** — a document carrying one or more settled decisions with sequential `## D<N>: <Title>` headings. Each settled decision becomes a citation in the spec body, NOT a copy-paste into a separate spec section — see `## Semantic Contract` below.
3. **A GitHub issue URL or identifier** — accepted forms include a full URL (`https://github.com/<owner>/<repo>/issues/<NNN>`) or the short `owner/repo#NNN` form. The issue body becomes the upstream input; treat the issue title and labels as additional context.
4. **A raw user prompt** — when no artifact is referenced, the user's prompt is itself the input; the spec is forward-designed directly from it.

If the input is ambiguous — multiple plausible proposals share the same descriptor, multiple decision logs cover overlapping topics, the issue identifier is incomplete, or the prompt references "the spec" with no clear referent — **ask the user which artifact is intended**. There is no global "latest input" algorithm. Do not silently pick by recency.

## Semantic Contract

The emitted spec MUST cover all EIGHT of the following elements in its body, regardless of section names used. The handoff-grade requirement is that a downstream reader with no prior context can read the spec alone and know what to build:

1. **Intended outcome** — what this spec, when implemented, produces for the user.
2. **Context** — why this is being built; what came before; what triggered the spec.
3. **Scope / non-scope** — the boundary statement, INCLUDING what is explicitly out.
4. **Expected behavior** — the observable behaviors a future executor needs.
5. **Constraints** — tech, repo, harness, and safety constraints that bind the implementation.
6. **Explicit decisions** — settled trade-offs INLINED into the body where operative (in scope, in constraints, in expected behavior, in acceptance). When a settled decision comes from a referenced decision log, cite the SOURCE by absolute path + `D<N>` ID — e.g., `(per docs/threads/<thread>/discussions/<UTC>-<slug>-decision-log.md D3)` — rather than copying the decision text.
7. **Unresolved questions** — open issues that do NOT block emission. The spec is shipped with these flagged.
8. **Acceptance guidance** — how a reviewer will know the implementation is right.

The eight elements MAY be presented as a copy-paste eight-section template, OR they MAY be interleaved into a freeform structure appropriate to the input — section names and ordering are at the executor's discretion. What is NOT at the executor's discretion: every one of the eight must appear so the spec reads as handoff-grade.

There is NO mandatory `## Decisions` section heading. Forcing a separate decisions section produces dead weight — settled decisions belong INLINED into the elements they govern (scope notes, constraint statements, expected-behavior caveats, acceptance preconditions), with a citation back to the source decision log by path + `D<N>`. Do not introduce a `## Decisions` section just to satisfy an implicit template.

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ask the user — do not silently pick the most recent timestamp. If no thread exists, ask where to create one or auto-create when the input's slug is obvious.

2. **Resolve and read the input.** Detect which of the four `## Inputs` forms was passed. For a path input, read the file. For a GitHub issue, fetch the issue body and title. For a raw prompt, the prompt itself is the input. If multiple plausible inputs match the reference, ask which is intended. Do not pick by recency.

3. **Reference, do not copy, settled decisions from the upstream input.** When the input is a decision log, do not paste decision text into a freestanding spec section. Instead, cite the source by absolute path + `D<N>` at the inline location where each decision becomes operative — in the constraint statement, in the expected-behavior bullet, or in the acceptance criterion that depends on it. Cross-log references must include the full path of the source decision log.

4. **Derive the descriptor (usually omit).** First emission of a spec uses NO `<kebab-descriptor>` in the filename — the canonical first-version mainline is `<UTC>-v1-spec.md`. A descriptor is used only when this emission is one of several parallel candidates for the same target version (e.g., `<UTC>-v1-opus-spec.md`, `<UTC>-v1-sonnet-spec.md`) or when there is an explicit reason to mark this artifact as a variant. Default to NO descriptor.

5. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing.

6. **Draft the body covering all eight elements.** Inline settled decisions where operative; cite source decision logs by absolute path + `D<N>` IDs. Do not force a separate `## Decisions` section. Section names and ordering are at the executor's discretion provided all eight elements are present. Keep the spec readable end-to-end by a stranger with no prior context.

7. **Write the artifact.** Create `docs/threads/<thread>/specs/<UTC>-v1-spec.md` (or `docs/threads/<thread>/specs/<UTC>-v1-<kebab-descriptor>-spec.md` if a descriptor is genuinely warranted — but the default for first emission is NO descriptor). The `spec` artifact-type suffix is MANDATORY. The `specs/` folder is created on-demand the first time a spec is written for the thread; do not pre-create empty folders.

8. **Confirm.** Tell the user: `Spec written: <relative-path-to-the-file>`. Nothing else — no preamble, no summary, no closing remark.

## Filename and Folder

The spec artifact uses this versioned-form filename grammar:

```text
<YYMMDDHHMMSSZ>-v<N>[-<kebab-descriptor>]-spec.md
```

Rules:

- The 12-character UTC stamp `YYMMDDHHMMSSZ` comes first, captured at write time and never re-derived afterward.
- `N` starts at `1`, not `0`. First emission is `v1`. There is no `v0`.
- First emission defaults to NO `<kebab-descriptor>` — the mainline integer-only file is `<UTC>-v1-spec.md`.
- A `<kebab-descriptor>` marks the file as a candidate or variant for mainline `v<N>` (e.g., parallel drafts as `v1-opus-spec.md`, `v1-sonnet-spec.md`, with the promoted file becoming `v1-spec.md`).
- The `spec` artifact-type token is MANDATORY in every spec filename.
- The `v<N>` segment names the TARGET version this artifact represents — not a predecessor it derives from.

Canonical first-emission example:

```text
260521120000Z-v1-spec.md
```

Example with descriptor (parallel candidate for the same target version):

```text
260521120000Z-v1-onboarding-spec.md
```

The file lands at `docs/threads/<thread>/specs/<filename>`. The `specs/` folder is created on-demand on the first spec written for the thread; do not pre-create empty folders.

## Immutability

Once a spec file is written into `specs/`, it is part of the thread's reviewable history and is not edited in place. A typo discovered in an emitted v1 spec means emitting a new version (`v2`), not an in-place edit. The same rule applies to every subsequent version — `v2` is locked once written, and a revision to `v2` means emitting `v3`. Never edit a spec file in place after it lands in `specs/`.

Drafts in a `.wip/` scratch space are editable until emission. The lock applies the moment the file is written under the canonical filename grammar.

No source-relation YAML frontmatter is added to the spec body — lineage lives in filenames and the surrounding thread, not in metadata on the file. The accepted trade-off is that a filename alone cannot tell whether `v2` came directly from `v1`, from a candidate variant, or from a merge — that history is recovered from the thread itself.

## Commit Policy

This skill NEVER auto-commits the spec artifact. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator, or a separate commit helper. Do not stage, do not commit, do not push, do not branch.
