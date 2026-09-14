# Shared references

A skill never reads another skill's `references/` folder. Reading one reaches
into another skill's internals and couples the reader to a folder layout it does
not own, so every skill that needs a piece of shared material ships its own
physical copy of it — and those copies are generated rather than authored twice.

## The canonical folder

Canonical shared files live once under `shared/references/`. A file earns a place
there when it is passive material that more than one skill must reproduce
identically. Three kinds live there.

**Formats** (`formats/`) describe one artifact each: what it is, where it lives,
and how it is shaped. Every format file follows one skeleton and holds nothing
outside it:

- a title of the form `# <Artifact> format`;
- one paragraph stating what the artifact is, where it lives, and its identifier
  when it has one;
- a `## Shape` section holding a fenced skeleton of the artifact with
  placeholders, or the folder tree when the artifact is a folder;
- a `## Rules` section, one rule per bullet, covering which parts are required,
  what each part carries, naming, ordering, and what never appears.

Vocabulary an artifact fixes — the log's seven entry types, say — is a rule with
its enumeration inline. A command, a procedure, or a policy is never a format
section: it belongs in an instruction or in a model-invoked skill. One skeleton
for every format makes each of them readable in the same way, and makes behaviour
that strays into a format file visible at once, because there is no section for
it to sit in.

**Instructions** (`instructions/`) each hold a self-contained procedure for one
act, written in the imperative to whoever performs it and naming no skill. A
format says what an artifact is; an instruction says how one act is done; the two
never mix. `body-structure.md` carries the test that decides whether a block of a
body is an act of this kind.

**Conventions the suite reads rather than defines** — the tracker material under
`trackers/` and `repository-conventions.md` — describe an environment the skills
work against.

A pointer inside a shared reference file — an instruction naming the format it
writes, say — carries the same `<skill_path>/` prefix a body uses and reads as the
same directive: the pointed file is followed, or conformed to, and the text around
the pointer never restates what that file holds. It is never cited with `per`;
`per` before a heading of the same body is fine, `per` before a file path is the
defect.

## The manifest

`shared/manifest.yaml` maps each declaring skill's path to the list of shared
files it needs, each named relative to `shared/references/`. It is a deliberately
restricted flat map — skill-path keys, string-list values, one list level, no
anchors, no nested keys — so a dependency-free parser suffices. A skill declares
every shared file it reads or writes through, and declares nothing it does not
use.

## The sync script

`scripts/sync-shared-references.mjs` mirrors each canonical file to the same
relative path under the declaring skill's `references/` folder. It owns exactly
the files the manifest names: on every run it deletes and rewrites precisely
those, so their content stays in lockstep with the canonical source, while
hand-authored skill-local references sitting alongside them are left untouched.
Its deletion authority reaches no further. Removing a manifest entry leaves the
copy it had generated behind, to delete by hand.

The generated copies are committed and flow into distribution unchanged, which is
what keeps an installed skill self-contained. Never hand-edit one: change the
canonical file under `shared/references/` and re-run the script.

Editing a shared file means checking every skill that declares it. An instruction
read by several skills is read at a different step in each of them, so a change
that reads naturally in one body can contradict another; walk the manifest's
declarers before the edit is done.
