# V1 Workflow Reference

This directory is the single source of truth for the V1 modular agentic workflow's thread storage contract. Every V1 spine skill cites these docs rather than re-defining the rules in its own body. The set is versioned at `v1` so a future `v2/` set can coexist here without disturbing V1 readers.

The docs in this directory describe how V1 threads are laid out on disk, how artifact filenames are constructed, and how artifacts are treated once they have been emitted. Together they form the contract that a V1 skill author or reviewer can rely on.

## Docs

Read in this order; each doc is short and self-contained.

- [`thread-layout.md`](./thread-layout.md) — V1 thread root path and folder set (`proposals/`, `specs/`, `plans/`, `discussions/`, `inbox/{open,processed,dropped}/`, `.wip/`). Created by Plan 01.
- [`filename-grammar.md`](./filename-grammar.md) — Record-form and versioned-form filename grammars, UTC stamp pattern, mandatory artifact-type suffix. Created by Plan 02.
- [`immutability.md`](./immutability.md) — Emitted-artifact immutability rule, no source-relation frontmatter, ambiguous reference resolution by asking. Created by Plan 02.

The links to `filename-grammar.md` and `immutability.md` are intentional forward references; Plan 02 of Phase 1 creates those files.

## Entry Points

Agents looking for V1 workflow rules should start here. Downstream V1 skill bodies inline a one-sentence summary of any rule they invoke and link to the canonical doc above (per the V1 Skill Rule Reuse Convention recorded in `.planning/phases/01-foundations/01-CONTEXT.md`). This preserves the existing self-contained-skill pattern while keeping the source of truth singular.

## Versioning

This set is V1. A future V2 ruleset lives at `docs/workflow/v2/` and does not replace V1 in place. Immutability applies to the rules docs themselves as well — by convention, not by enforcement — so a V1 reader running against an older skill bundle can always cite a stable rule.
