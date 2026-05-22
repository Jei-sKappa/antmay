# Filename Grammar

## UTC Stamp

Every artifact filename begins with a 12-character UTC stamp using the literal pattern `YYMMDDHHMMSSZ` — no separators, trailing `Z` denotes UTC. The four field pairs are `YY` (two-digit year), `MM` (month), `DD` (day), `HH` (hour, 24h), `MM` (minute), `SS` (second), followed by `Z`.

Example: `260518200115Z` parses to `2026-05-18 20:01:15 UTC`.

The stamp is captured at artifact creation time and never edited afterward.

## Record Form

Record artifacts (discussions, decision logs, inbox items — any artifact type without version numbers) use:

```text
<YYMMDDHHMMSSZ>-<kebab-desc>-<artifact-type>.md
```

The artifact-type suffix is MANDATORY — no artifact filename may omit it. The filename must remain understandable when copied or grepped out of its containing folder.

Examples:

```text
260520120000Z-auth-flow-proposal.md
260521094500Z-onboarding-inbox-item.md
260518200115Z-agentic-workflow-design-discussion.md
```

## Versioned Form

Versioned artifacts (proposals, specs, plans — any artifact type that admits mainline integer versions and candidate variants) use:

```text
<YYMMDDHHMMSSZ>-v<N>[-<kebab-descriptor>]-<artifact-type>.md
```

Rules:

- `N` starts at `1`, NOT `0`.
- Absence of `<kebab-descriptor>` means the file is the mainline integer-only file at version `v<N>`.
- Presence of `<kebab-descriptor>` marks the file as a candidate or variant for mainline `v<N>` — for example three parallel drafts may live as `v1-opus-spec.md`, `v1-sonnet-spec.md`, `v1-codex-spec.md` while the promoted or merged file becomes `v1-spec.md`.
- The `<artifact-type>` token is MANDATORY in the versioned form as well.

## Target-Version Semantics

The `v<N>` segment names the TARGET version this artifact represents — the version the author is producing — NOT a predecessor it derives from. A file named `260520120000Z-v2-no-oauth-auth-spec.md` is a candidate or variant FOR mainline `v2`; it is not an alternative carved out of an already-existing `v2`.

There is no lineage encoded in the filename beyond the version number. Source-relation frontmatter such as `Supersedes:`, `Alternative to:`, or `Forked from:` is forbidden — see `references/immutability.md` for the rule and rationale.

## Recognized Artifact-Type Tokens

- `proposal`
- `spec`
- `plan`
- `discussion`
- `decision-log`
- `inbox-item`
- `review-finding`

## Artifact Folder Routing

| Artifact type    | Folder                                                    | Example filename                                         |
| ---------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| `proposal`       | `proposals/`                                              | `260520120000Z-v1-auth-flow-proposal.md`                 |
| `spec`           | `specs/`                                                  | `260520120000Z-v1-auth-spec.md`                          |
| `plan`           | `plans/`                                                  | `260521094500Z-v1-auth-rollout-plan.md`                  |
| `discussion`     | `discussions/`                                            | `260518200115Z-agentic-workflow-design-discussion.md`    |
| `decision-log`   | `discussions/`                                            | `260521120000Z-review-decision-log.md`                   |
| `inbox-item`     | `inbox/open/`                                             | `260521094500Z-onboarding-friction-inbox-item.md`        |
| `review-finding` | `inbox/open/`                                             | `260521101212Z-spec-review-findings-review-finding.md`   |
