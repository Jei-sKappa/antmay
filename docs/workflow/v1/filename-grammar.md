# V1 Filename Grammar
**Codifies:** D11, D12, D42, D43, D46, D47

## UTC Stamp

Every V1 artifact filename begins with a 12-character UTC stamp using the literal pattern `YYMMDDHHMMSSZ` — no separators, trailing `Z` denotes UTC [D11]. The four field pairs are `YY` (two-digit year), `MM` (month), `DD` (day), `HH` (hour, 24h), `MM` (minute), `SS` (second), followed by `Z`.

Example: `260518200115Z` parses to `2026-05-18 20:01:15 UTC` — the timestamp on this thread's seed discussion log under `docs/threads/260520095223Z-agentic-workflow/discussions/`.

The stamp is captured at artifact creation time and never edited afterward. It is the first 12 characters of every record-form and versioned-form filename described below.

## Record Form

Record artifacts (discussions, decision logs, inbox items, review findings — any artifact type without version numbers) use:

```text
<YYMMDDHHMMSSZ>-<kebab-desc>-<artifact-type>.md
```

```text
260518200115Z-agentic-workflow-design-discussion.md
^^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^ ^^^^^^^^^^
UTC stamp    kebab description        artifact type
```

The artifact-type suffix is MANDATORY — no V1 artifact filename may omit it [D12, D43]. The filename must remain understandable when copied or grepped out of its containing folder, so the type token is what tells a downstream reader whether the file is a discussion, an inbox item, or something else.

More realistic examples:

```text
260520120000Z-auth-flow-proposal.md
260521094500Z-onboarding-inbox-item.md
260521101212Z-spec-review-findings-review-finding.md
260518200115Z-agentic-workflow-design-discussion.md
```

## Versioned Form

Versioned artifacts (proposals, specs, plans — any artifact type that admits mainline integer versions and candidate variants) use:

```text
<YYMMDDHHMMSSZ>-v<N>[-<kebab-descriptor>]-<artifact-type>.md
```

```text
260520120000Z-v1-auth-spec.md                 (mainline v1)
260520120000Z-v2-auth-spec.md                 (mainline v2)
260520120000Z-v2-no-oauth-auth-spec.md        (v2 variant with descriptor)
```

Rules:

- `N` starts at `1`, NOT `0` [D47].
- Absence of `<kebab-descriptor>` means the file is the mainline integer-only file at version `v<N>`.
- Presence of `<kebab-descriptor>` marks the file as a candidate or variant for mainline `v<N>` — for example three parallel drafts may live as `v1-opus-spec.md`, `v1-sonnet-spec.md`, `v1-codex-spec.md` while the promoted or merged file becomes `v1-spec.md` [D42, D46].
- The `<artifact-type>` token is MANDATORY in the versioned form as well [D42].

## Target-Version Semantics

The `v<N>` segment names the TARGET version this artifact represents — the version the author is producing — NOT a predecessor it derives from [D46, D47]. A file named `260520120000Z-v2-no-oauth-auth-spec.md` is a candidate or variant FOR mainline `v2`; it is not an alternative carved out of an already-existing `v2`.

There is no lineage encoded in the filename beyond the version number. The relationship between versions and variants lives in the shared kebab description and the shared artifact type, not in metadata. Source-relation frontmatter such as `Supersedes:`, `Alternative to:`, or `Forked from:` is forbidden — see [`./immutability.md`](./immutability.md) for the rule and rationale [D44].

## Recognized V1 Artifact-Type Tokens

V1 ships with this list of recognized artifact-type tokens:

- `proposal`
- `spec`
- `plan`
- `discussion`
- `decision-log`
- `inbox-item`
- `review-finding`

The list is documented but not exhaustive. Future V1 skills may register additional tokens — they should declare the new token in the skill body that owns it, and the new token will be added back to this list when stabilized.

## Examples

Per the V1 thread folder set defined in [`./thread-layout.md`](./thread-layout.md), each artifact-type token lands in a specific folder. The canonical thread `docs/threads/260520095223Z-agentic-workflow/` is used for context where applicable.

| Artifact type    | Folder                                                     | Example filename                                          |
| ---------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| `proposal`       | `proposals/`                                               | `260520120000Z-v1-auth-flow-proposal.md`                  |
| `spec`           | `specs/`                                                   | `260520120000Z-v1-auth-spec.md`                           |
| `plan`           | `plans/`                                                   | `260521094500Z-v1-auth-rollout-plan.md`                   |
| `discussion`     | `discussions/`                                             | `260518200115Z-agentic-workflow-design-discussion.md`     |
| `decision-log`   | `discussions/`                                             | `260521120000Z-review-decision-log.md`                    |
| `inbox-item`     | `inbox/open/` (later moved to `processed/` or `dropped/`)  | `260521094500Z-onboarding-friction-inbox-item.md`         |
| `review-finding` | `inbox/open/`                                              | `260521101212Z-spec-review-findings-review-finding.md`    |

Folder routing is the thread layout doc's concern; the filename grammar's only requirement is that the artifact-type token in the filename match the conventions an authoring skill commits to.
