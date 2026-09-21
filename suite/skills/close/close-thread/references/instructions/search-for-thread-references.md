# Search for thread references

Find every place outside a thread that names that thread or one of its artifacts, so that nothing thread-local is read as a standing requirement. A thread path left in code, in a comment, in a test name, in a migration or in a project document outlives the thread that wrote it: what was a historical design note becomes something a later reader takes for a rule, and the only way it is caught is by looking for it while someone is still reading.

## The pattern

The pattern is fixed, and is never widened or narrowed by improvisation:

- the literal path fragment `.work/threads/`, which catches a thread path however it is written;
- when a thread is in hand, that thread's identifier — `yyyy/mm/dd-hhmm-slug`, its path relative to `.work/threads/` — which catches a reference that names the thread without the root above it.

Nothing else is part of the pattern. A hit is a place to look at, not a verdict on its own.

## Over a repository

Run this one line from the repository root, over tracked files outside `.work/`:

```sh
git grep -n -e '.work/threads/' -- ':!.work'
```

When a thread is in hand, run it a second time with that thread's identifier added:

```sh
git grep -n -e '.work/threads/' -e '<thread identifier>' -- ':!.work'
```

## Over delivered work

Run the same pattern over the files a change touched — the diff, and the files the implementation report's `## Changes` names. Read the code itself, its comments, its test names and its migrations, not only the prose: a test named for the criterion it answers, a comment pointing at a design document and a migration named after a task are the usual hits. Report each one where the surrounding procedure reports its findings.

## Rules

- Every hit is reported, never silently accepted. A hit that turns out to be legitimate — commit provenance, or a thread naming its own artifacts from inside itself — is reported as such and left alone; the judgment belongs to whoever is reading, not to the search.
- The search writes nothing and changes no file. It reads, and it hands what it found to the procedure that called for it.
- A project that wants a hard gate wires this same one line into its own tooling. Nothing in the method enforces it; the search is run where the reading already happens.
