# Search for thread references

Find every place outside a thread that names that thread or one of its artifacts, so that nothing thread-local is read as a standing requirement. A thread path left in code, in a comment, in a test name, in a migration or in a project document outlives the thread that wrote it: what was a historical design note becomes something a later reader takes for a rule, and the only way it is caught is by looking for it while someone is still reading.

## The pattern

The pattern is fixed, and is never widened or narrowed by improvisation. It matches a thread identifier — `yyyy/mm/dd-hhmm-slug`, a thread's path relative to `.work/threads/` — written with a concrete date, time and slug:

- the identifier under its root, `.work/threads/` followed by an identifier, which catches a thread path however much of it is written after the identifier;
- the bare identifier of any thread, not only the one in hand, which catches a reference that names a thread without the root above it.

One expression covers both, because the rooted form contains the bare one. The identifier need not resolve to a folder that exists: a reference to a removed or mistyped thread is still a reference. A mention of the threads folder alone — `.work/threads/`, a glob over it, or the placeholder `.work/threads/yyyy/mm/dd-hhmm-slug/` — names no thread and is not a hit.

Nothing else is part of the pattern. A hit is a place to look at, not a verdict on its own.

## Over a repository

Run this one line from the repository root, over tracked files outside `.work/`:

```sh
git grep -n -E -e '[0-9]{4}/[0-9]{2}/[0-9]{2}-[0-9]{4}-[a-z0-9]' -- ':!.work'
```

## Over delivered work

Run the same pattern over the files a change touched — the diff, and the files the implementation report's `## Changes` names. Read the code itself, its comments, its test names and its migrations, not only the prose: a test named for the criterion it answers, a comment pointing at a design document and a migration named after a task are the usual hits. Report each one where the surrounding procedure reports its findings.

## Rules

- Every hit is reported, never silently accepted. A hit that turns out to be legitimate — commit provenance, or a thread naming its own artifacts from inside itself — is reported as such and left alone; the judgment belongs to whoever is reading, not to the search.
- The search writes nothing and changes no file. It reads, and it hands what it found to the procedure that called for it.
- A project that wants a hard gate wires this same one line into its own tooling. Nothing in the method enforces it; the search is run where the reading already happens.
