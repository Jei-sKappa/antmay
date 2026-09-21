---
name: consult-descriptions
description: Open the product behavior and the architecture description for what the work touches — `docs/product/` and `docs/architecture/` — before designing, planning, implementing, reviewing, or closing, and whenever you need to know what the system already does or how it is already structured. Do not invoke it when neither folder holds a `.md` file, it would be pointless.
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Consult Descriptions

`docs/product/` and `docs/architecture/` hold the project's descriptions of itself as it stands now. A product behavior document covers one capability and states what the product does today, in the shape `<skill_path>/references/formats/product-behavior.md` fixes; an architecture description covers one module and states how the system is structured today, in the shape `<skill_path>/references/formats/architecture-description.md` fixes. Both are living: they describe the present, and they change only when a thread's delta documents land.

## List what exists

Neither folder carries an index. Print every document's path with its headings, without loading a single body:

```sh
find docs/product docs/architecture -maxdepth 1 -name '*.md' 2>/dev/null | sort | while read -r f; do printf '%s\n' "$f"; grep -n '^#\{1,2\} ' "$f" | sed 's/^/  /'; done
```

A folder that does not exist yet prints nothing: the project layer is created lazily, and an absent folder means nothing of that kind has been described.

## Open what the work touches

From the listing, open the product behavior of every capability the work touches and the architecture description of every module it touches, and read each in full. A description is admitted only where the code does not already make the point obvious, so what you find there is what reading the code would not have told you.

## How a description is cited and read

A description is cited by path and heading.

Every statement in one is built-only and in the present tense: it describes what exists now, never what is intended, planned, or partly done. Behavior that is settled but not built is therefore never here — it lives in the roadmap entry that will build it, and that entry is the only place to look for it.

When a description and the code disagree, the disagreement is information, not noise. Identify which of three it is — a bug in the code, a stale description, or a change that was authorised and has landed on only one of the two sides — and never assume that the code is right or that the prose is right. Raise what you find rather than quietly following either side.

A description changes only through the delta documents a thread drafts and `/close-thread` lands. Nothing you do in the middle of other work edits one.
