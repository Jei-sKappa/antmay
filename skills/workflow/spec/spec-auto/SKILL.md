---
name: spec-auto
description: Turn a proposal, decision log, GitHub issue, or raw prompt into a handoff-grade v1 spec markdown file under the active V1 thread's `specs/` folder, end-to-end, with no clarifying questions. Use when you already have the upstream input in hand and want the spec forward-designed FROM it written down — not when you want to author the spec interactively together (use `spec-interactive`), and not when you want to reverse-engineer a spec FROM an existing codebase (use `take-snapshot`).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Spec Auto

Forward-design a handoff-grade spec artifact under the active V1 thread's `specs/` folder, end-to-end, from a single upstream input. This skill is the autonomous generator half of the V1 spec pair — it reads input, drafts the spec body covering the eight required semantic-contract elements, writes the artifact, and confirms its path. It does not ask clarifying questions, it does not interview the user element-by-element, and it does not commit. For the collaborative walk-through use the sibling skill `spec-interactive`. For reverse-engineering a spec FROM an existing codebase — the inverse direction — use `take-snapshot` instead; that skill is the established reverse-engineering tool and is not what `spec-auto` does.

## Inputs

`spec-auto` accepts ONE of the following four input forms. Detect which form was passed before drafting:

1. **A proposal artifact path** under `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md`. The proposal is the most common upstream input — it carries intent, context, and a rough shape that the spec elaborates into expected behavior, constraints, and acceptance guidance.
2. **A decision-log artifact path** under `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md`. The log carries one or more settled decisions with sequential `## D<N>: <Title>` headings. Each settled decision becomes a citation in the spec body, NOT a copy-paste into a separate spec section — see `## Semantic Contract` below and SPEC-05.
3. **A GitHub issue URL or identifier**. Accepted forms include a full URL (`https://github.com/<owner>/<repo>/issues/<NNN>`) or the short `owner/repo#NNN` form. The issue body becomes the upstream input; treat the issue title and labels as additional context.
4. **A raw user prompt**. When no artifact is referenced, the user's prompt is itself the input — the spec is forward-designed directly from it.

If the input is ambiguous — multiple plausible proposals share the same kebab description in the thread, multiple decision logs cover overlapping topics, the issue identifier is incomplete, the prompt references "the spec" with no clear referent — ASK the user which artifact is intended per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution"). There is no global "latest input" algorithm. Do not silently pick by recency.

## Semantic Contract

The emitted spec MUST cover all EIGHT of the following elements in its body, regardless of section names used. The handoff-grade requirement (D50) is that a downstream reader with no prior context can read the spec alone and know what to build:

1. **Intended outcome** — what this spec, when implemented, produces for the user.
2. **Context** — why this is being built; what came before; what triggered the spec.
3. **Scope / non-scope** — the boundary statement, INCLUDING what is explicitly out.
4. **Expected behavior** — the observable behaviors a future executor needs.
5. **Constraints** — tech, repo, harness, and safety constraints that bind the implementation.
6. **Explicit decisions** — settled trade-offs INLINED into the body where operative (in scope, in constraints, in expected behavior, in acceptance). When a settled decision comes from a referenced decision log, cite the SOURCE by absolute path + `D<N>` ID — e.g., `(per docs/threads/<thread>/discussions/<UTC>-<slug>-decision-log.md D3)` — rather than copying the decision text. This is the SPEC-05 obligation.
7. **Unresolved questions** — open issues that do NOT block emission. The spec is shipped with these flagged.
8. **Acceptance guidance** — how a reviewer will know the implementation is right.

The eight elements MAY be presented in the spec body as a copy-paste eight-section template, OR they MAY be interleaved into a freeform structure as appropriate to the input — section names and ordering are at the executor's discretion. What is NOT at the executor's discretion: every one of the eight must appear in the body so the spec reads as handoff-grade.

There is NO mandatory `## Decisions` section heading. Per D52, forcing a separate decisions section produces dead weight in the spec body — settled decisions belong INLINED into the elements they govern (scope notes, constraint statements, expected-behavior caveats, acceptance preconditions), with a citation back to the source decision log by path + `D<N>`. Do not introduce a `## Decisions` section just to satisfy an implicit template — inline decisions are the V1 form.

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp. If no thread exists, ASK where to create one OR auto-create when the input's slug is obvious.

2. **Resolve and read the input.** Detect which of the four `## Inputs` forms was passed. For a path input, read the file. For a GitHub issue, fetch the issue body and title (the user's invocation context is responsible for credentials). For a raw prompt, the prompt itself is the input. If multiple plausible inputs match the reference (two proposals with the same descriptor, two decision logs on the same topic), ASK which is intended. Do not pick by recency.

3. **Reference, do not copy, settled decisions from the upstream input.** When the input is a decision log, do not paste decision text into a freestanding spec section. Instead, cite the source by absolute path + `D<N>` at the inline location where each decision becomes operative — e.g., in the constraint statement, in the expected-behavior bullet, or in the acceptance criterion that depends on it. This is the SPEC-05 obligation. Cross-log references must include the full path of the source decision log.

4. **Derive the descriptor (usually omit).** First emission of a spec uses NO `<kebab-descriptor>` in the filename — the canonical first-version mainline is `<UTC>-v1-spec.md`. A descriptor is used only when this emission is one of several parallel candidates for the same target version (e.g., `<UTC>-v1-opus-spec.md`, `<UTC>-v1-sonnet-spec.md`) or when the executor has an explicit reason to mark this artifact as a variant. Default to NO descriptor.

5. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time per `docs/workflow/v1/filename-grammar.md`. Stamp once and reuse — never re-derive after writing.

6. **Draft the body covering all eight elements.** Inline settled decisions where operative; cite source decision logs by absolute path + `D<N>` IDs. Do not force a separate `## Decisions` section. Section names and ordering are at the executor's discretion provided the eight elements are all present. Keep the spec readable end-to-end by a stranger with no prior context.

7. **Write the artifact.** Create `docs/threads/<thread>/specs/<UTC>-v1-spec.md` (or `docs/threads/<thread>/specs/<UTC>-v1-<kebab-descriptor>-spec.md` if a descriptor is genuinely warranted — but the default for first emission is NO descriptor). The `spec` artifact-type suffix is MANDATORY per `docs/workflow/v1/filename-grammar.md`. The `specs/` folder is created on-demand per `docs/workflow/v1/thread-layout.md` ("On-Demand Creation") — do not pre-create it.

8. **Confirm.** Tell the user: `Spec written: <relative-path-to-the-file>`. Nothing else — no preamble, no summary, no closing remark.

## Filename and Folder

The spec artifact uses the V1 versioned-form filename grammar per `docs/workflow/v1/filename-grammar.md`:

```text
<YYMMDDHHMMSSZ>-v<N>[-<kebab-descriptor>]-spec.md
```

Rules from `docs/workflow/v1/filename-grammar.md`:

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

The file lands at `docs/threads/<thread>/specs/<filename>` per `docs/workflow/v1/thread-layout.md`. The `specs/` folder is created on-demand on the first spec written for the thread; do not pre-create empty folders.

## Immutability

Emitted spec artifacts are immutable per `docs/workflow/v1/immutability.md`. Once the file is written into `specs/`, it is part of the thread's reviewable history and is not edited. A typo discovered in an emitted v1 spec means emitting a new version (`v2`), not an in-place edit. The same rule applies to every subsequent version — `v2` is locked once written, and a revision to `v2` means emitting `v3`. Never edit a spec file in place after it lands in `specs/`.

Drafts under `docs/threads/<thread>/.wip/` are editable until emission. While `spec-auto` is composing the spec body in scratch space (or in memory), revisions are free. The lock applies the moment the file is written into `specs/` under the canonical filename grammar.

No source-relation YAML frontmatter is added to the spec body — lineage lives in filenames and the surrounding thread, not in metadata on the file. Per `docs/workflow/v1/immutability.md`, the accepted trade-off is that a filename cannot tell whether `v2` came directly from `v1`, from a `v2` candidate variant, or from a merge — that history is recovered from the thread itself, not from the file.

## Commit Policy

This skill NEVER auto-commits the spec artifact. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.
