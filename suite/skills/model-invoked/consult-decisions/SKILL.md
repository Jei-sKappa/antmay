---
name: consult-decisions
description: Read the project's decision records in `docs/adr/` and `docs/pdr/` before acting on any work that could rest on a project decision or contradict one — before reading a thread's artifacts, designing, planning, implementing, reviewing, or closing. Do not invoke it when neither folder holds a `.md` file, it would be pointless.
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Consult Decisions

`docs/adr/` and `docs/pdr/` hold the project's decisions, one record per file, and together they are the whole authoritative surface for them: an ADR records how the system is structured or built, a PDR records what the product does or for whom, and what either folder holds binds the work until another record supersedes it. Both share the file shape in `<skill_path>/references/formats/decision-record.md`.

## Print the catalog

Neither folder carries an index. Print the folder, stem, name, and description of every record in both, without loading a single body:

```sh
find docs/adr docs/pdr -maxdepth 1 -name '*.md' 2>/dev/null | sort | while read -r f; do awk -v dir="$(dirname "$f")" -v stem="$(basename "$f" .md)" '/^---$/{n++; next} n==1 && /^name: /{sub(/^name: /,""); name=$0} n==1 && /^description: /{sub(/^description: /,""); desc=$0} n==2{print dir "\t" stem "\t" name "\t" desc; exit}' "$f"; done
```

A folder that does not exist yet prints nothing: the project layer is created lazily, and an absent folder means no record of that kind has been landed.

## Open what bears on the work

From the catalog, open every record whose subject touches the work at hand, and read it in full. What you open is authoritative: it constrains the design you propose, the plan you write, the code you change, and the prose you produce.

## How a record is cited and binds

A record is cited by its stem, and only for the reason behind a choice. What the system does now is never cited from a record: that is read from the code, from the product behavior in `docs/product/`, and from the architecture description in `docs/architecture/`.

A record binds from the moment it lands and keeps binding until a later record naming it under `supersedes` lands and moves it into its folder's `superseded/`. Nothing inside a record says whether it is current — the folder it sits in does.

## When the work contradicts a record

A contradiction between the material you are working on and a project record — or a term the project glossary fixes — is one of two things, and the thread's own delta is what tells them apart.

It is **intentional**, and raised with no one, when the thread's `delta/` holds a `create` delta document naming that record under `supersedes`, an `edit` or `delete` delta document targeting it, or an `edit` delta document for `docs/glossary.md` that redefines the term. Writing that delta document is how the user's confirmation was recorded, so the delta governs and the work follows it.

Every other contradiction is an **unnoticed conflict**, and it is raised rather than settled: an interactive agent puts it to the user; a completion-oriented run queues it as a pending decision. Never resolve one by overriding the project record.
