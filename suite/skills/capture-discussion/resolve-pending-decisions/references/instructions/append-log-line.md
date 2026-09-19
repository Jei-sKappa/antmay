# Append a log line

Append one entry to the thread's `log.md`. What an entry looks like and which seven types it may carry are fixed in `<skill_path>/references/formats/log-line.md`.

Append it as a single-line shell append:

```sh
printf '%s\n' '- (type) gist with the reason folded in' >> <thread root>/log.md
```

## Rules

- Use the shell append (`>>`); never open `log.md` with a file-editing tool.
- Read `log.md` once, at the start of the session, and never re-read it afterwards. The lines you append are the only change it takes.
- One writer per session: a session that fans out to subagents appends only from the orchestrator.
- The line's type is one of the seven the log-line format fixes; pick the one that matches what settled.
- The framing that produced the point — the options menu, the recommendation, the deliberation — is transient and is never copied into the line. The line carries what settled and its reason, in one sentence a fresh agent can act on.
- An alternative the exchange argued against is the one piece of that framing the line keeps. Carry it when settling the point required an argument against it — a reason it does not work, whichever side made that argument — and leave it out when it was merely presented, compared, or left unselected, whatever its provenance. This governs what a settled point's line carries and never whether a point has settled: an argument against an alternative is not by itself a settled point.
