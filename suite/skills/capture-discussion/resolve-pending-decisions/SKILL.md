---
name: resolve-pending-decisions
description: Settle the thread's queued pending decisions live with the user and write each outcome into the thread's log, its spec, and its ADR and glossary delta — use when a queue of pending-decision bundles is waiting for a human to work through their open questions.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Resolve Pending Decisions

Work through queued pending-decision bundles with the user, one bundle and one point at a time. A bundle is the transient queue of open human decisions an earlier run could not settle on its own; you are the interactive bridge that empties it, framing each point live and writing what the user settles into the thread's memory, its design truth, and its delta of the project layer. You settle only genuine human decisions a bundle already holds — you do not audit the repository, judge the quality of any artifact, or invent points a bundle does not hold.

## Inputs

Gather all of these before settling any point; the procedure below works from what you gather here.

- `docs/adr/` — the project ADR catalog, listed with the command in `references/formats/adr.md`; open the records relevant to the target. Authoritative.
- `docs/glossary.md` — the project's terms. Authoritative.
- **The queued bundles** under the active thread's `.pending-decisions/` — the primary input, in one of two accepted forms, each written per `references/formats/pending-decision-bundle.md`. When the invocation names a **bundle path**, that file is the form. Otherwise the form is the **folder's queue** of bundles. Material.
- The thread's `spec.md`, when the file exists — the thread's design truth, which a settled point amends. Authoritative.
- The thread's `adr/` and `glossary.md` — the thread's delta of the project layer as it stands. Authoritative within the thread.
- The thread's `seed.md` — why the thread exists. Authoritative for intent.

## Resolve the thread

Work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If several thread roots exist and which is active is ambiguous, ASK — never silently pick the most recent stamp.

## Select a bundle

- **With an explicit bundle path argument**, load only that bundle and go straight to the resolution loop.
- **Without a path**, list the files under the active thread's `.pending-decisions/` folder and read ONLY each file's routing header (`Producer`, `Target`, `Request`, `Created`, `Points`). Never open a bundle's point bodies just to build the queue.
  - If the folder is empty or absent, tell the user there are no pending decisions and stop.
  - If exactly one bundle exists, select it directly.
  - If several exist, present a compact queue — one row per bundle showing its title, producer, target, and point count — and let the user choose which to resolve. Add a recommended order only when a dependency between bundles or genuine urgency makes one order materially preferable; otherwise present the queue without steering.

Load a single selected bundle's full body only once it is chosen. Resolve one bundle per run; the user reinvokes you for the next.

## Resolution loop

For the selected bundle, work its points one at a time:

1. **Frame the next unsettled point live**, in chat, per `references/formats/discussion-point.md`. The point's blocker is the choice to state; its evidence and the surrounding facts are what the reader needs to know; and you build the fork yourself from them — lettered alternatives with a reasoned pick when the decision is genuinely open, or a single practical proposed solution when one path is the sensible default. A free-text suggestion the producer left is material for that framing, never the answer. Take one point per turn; do not batch.
2. **Let the user settle it**, then write the outcome per `## Writing a settled point`.
3. **Remove that settled point from the bundle file**, keeping its `Points:` count true, so the file always holds only unsettled points — the remaining body is the complete resumption state if the user pauses.
4. Repeat until no unsettled point remains, then delete the exhausted bundle file.

## Writing a settled point

An answer that merely repairs which input the producer meant is a clarification rather than new intent: it settles the point — the point is consumed from the queue like any other — and is written nowhere.

Every other answer is written the moment it settles, in this order:

1. **Append the log line first**, before acting on the answer in any other way. One line, one of the seven types, with the reason folded into the gist, per `references/formats/log-line.md`:

   ```sh
   printf '%s\n' '- (decision) exports go through the queue worker, because the request path cannot hold a multi-minute job' >> docs/threads/<thread>/log.md
   ```

   Use the shell append (`>>`) of a single line; never open `log.md` with a file-editing tool. The framing that produced the choice — the alternatives, the pick, the deliberation — is transient and never copied into the line.

2. **Amend `spec.md` when the answer changes the design** and the thread holds a spec. Amend each affected passage in place: keep the superseded text, mark it superseded, and annotate it with the date and the reason it changed. Leave every passage the answer does not touch exactly as it stands.

   When the answer is that the code and not the spec must change, the spec already states the intent: leave it as it stands and say in chat that running an implementation is the next step.

3. **Write the project-level record when the point passes the binding test** — a later thread could build against the settled point incorrectly if not told, and could not read it off the code. Show the user the `name`, the `description`, and the body text first; once they confirm or redirect it, write the draft at `adr/<yymmddhhmm>-<slug>.md` inside the thread, per `references/formats/adr.md`, creating `adr/` on demand. When the answer reverses a draft this thread already holds, edit that draft in place rather than adding a second record. A project term the answer introduces or changes is written to the thread's `glossary.md` the same way, with the same confirmation of the wording.

You write exactly these: lines appended to the thread's `log.md`, in-place amendments to the thread's `spec.md`, files under the thread's `adr/`, entries in the thread's `glossary.md`, and the bundle files under `.pending-decisions/`. Nothing else you touch is written — `docs/adr/` and `docs/glossary.md` are read here and never written.

## Follow-through

Once the bundle's last point is settled and its file deleted, recommend the next action that follows from what was just written: re-invoking the producer so it runs again against the amended design, running an implementation when the answer was that the code must change, or nothing further when the outcomes call for nothing.

State it as a recommendation, then WAIT for the user's choice — do not act first.

- **If the user accepts**, carry the action out the way it was recommended. When the recommended action belongs to a skill — the producer the bundle named, or the implementation skill when the code is what must change — invoke that skill as `/<skill-name>` and let it do the work against the amended design; never redo its work inline. Only an accepted action that no skill owns is carried out yourself, directly from the target and the outcomes just written. If the continuation uncovers genuinely new human judgment that only the user can settle, emit a new bundle via `/emit-pending-decisions` and stop.
- **If the user declines or defers**, stop cleanly; the outcomes are already written.

The continuation runs exactly once. Never open, discuss, or consume a newly emitted bundle in the same run — the user reinvokes you when they are ready for it.
