---
name: consult-adrs
description: Read the project's decision records before acting on any work that could rest on a project decision or contradict one — before reading a thread's artifacts, designing, specifying, planning, implementing, reviewing, or closing. Invoke it in any project that holds a `docs/adr/` folder, whether or not another skill is running.
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Consult ADRs

`docs/adr/` holds the project's decisions, one record per file, and it is the whole authoritative surface for them: what is recorded there binds the work until another record supersedes it. The file shape is in `<skill_path>/references/formats/adr.md`.

## Print the catalog

The folder carries no index. Print the stem, name, and description of every record:

```sh
for f in docs/adr/*.md; do awk -v stem="$(basename "$f" .md)" '/^---$/{n++; next} n==1 && /^name: /{sub(/^name: /,""); name=$0} n==1 && /^description: /{sub(/^description: /,""); desc=$0} n==2{print stem "\t" name "\t" desc; exit}' "$f"; done
```

An absent or empty `docs/adr/` prints nothing, which means the project has fixed no decisions yet.

## Open what bears on the work

From the catalog, open every record whose subject touches the work at hand, and read it in full. What you open is authoritative: it constrains the design you propose, the plan you write, the code you change, and the prose you produce.

## When the work contradicts a record

A contradiction between the material you are working on and a project ADR — or a term the project glossary fixes — is one of two things, and the thread's own delta is what tells them apart.

It is **intentional**, and raised with no one, when the thread's `adr/` holds a draft naming that ADR in its `supersedes` list, or the thread's `glossary.md` redefines the term. Writing that superseding draft is how the user's confirmation was recorded, so the draft governs and the work follows it.

Every other contradiction is an **unnoticed conflict**, and it is raised rather than settled: an interactive agent puts it to the user; a completion-oriented run queues it as a pending decision. Never resolve one by overriding the project record.
