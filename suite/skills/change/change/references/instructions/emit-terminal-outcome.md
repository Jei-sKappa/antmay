# Emit the terminal outcome

End the run's final chat message with exactly one line:

```text
Outcome: <TOKEN> — <one-line reason or pointer>
```

Follow this at whichever exit the run reaches — a refusal, a block, or a completion — and at that one exit only.

The vocabulary is closed to three tokens:

- `DONE` — the requested job completed, non-blocking concerns included.
- `BLOCKED` — substantive execution started and then stopped, on queued pending decisions or on an operational defect the run cannot repair.
- `REFUSED` — preflight prevented the run from starting.

## Rules

- The line is the last line of the message; nothing follows it.
- It is added to the summary the run's own instructions call for, never a replacement for that summary.
- The reason part is the confirmation text those instructions give — for example `Outcome: DONE — Spec written: spec.md`, `Outcome: BLOCKED — pending decisions at <bundle path>`, or `Outcome: REFUSED — <the reason and how to re-invoke>`.
- Emit exactly one such line per run, carrying one of the three tokens and no other.
