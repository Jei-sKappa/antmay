# Make the durable execution vocabularies express only legal states

`cli/src/state/checkpoint/types.ts` describes two closed vocabularies in prose and then persists them as records that do not enforce them. `AttemptResult` names four dispositions — `executing`, `done`, `waiting`, `interrupted` — and `WaitingKind` names thirteen reasons a run pauses, but `AttemptRecord` and `WaitingReason` each carry the state-specific data for every one of those variants as optional fields on a single flat shape. Nothing correlates a field with the discriminant it belongs to, so the type checker accepts an `executing` attempt that already carries `endedAt` and `headAfterAttempt`, a `done` attempt that carries neither, and a `pending-queues` reason with no `pendingFiles`.

Validation does not close the gap. `cli/src/state/checkpoint/validate.ts` checks each optional field's own shape when the field is present — `endedAt` parses as an ISO-8601 UTC timestamp, `pendingFiles` is sorted and unique — and never asks whether the discriminant required it at all. An untrusted checkpoint holding a settled attempt without an ending timestamp, or a pending-queue pause with no pending files, is read back as valid.

What these invariants exist as instead is behavior spread across four places: the validator, the transitions that construct attempt and run state, pause assembly in `cli/src/execution/pause.ts`, and the equality logic beside it, where `reasonEquals` compares every optional field of every kind because the shape cannot say which ones a given kind has. Each new execution state has to be threaded through all four correctly, with nothing at the type level checking that it was.

The intended outcome is a durable execution model whose representations admit only legal states, so a contradictory attempt or waiting reason cannot be constructed and these invariants stop being upheld by convention across four sites. `WaitingRecovery`, in the same file, is already a discriminated union whose per-variant data is required exactly where it applies — the `attempt` reference the three recoveries that name one carry, the `pausedAtHead` only the two that may finalize a boundary across a pause carry. It is the shape the rest of the vocabulary lacks.

No incorrect behavior is reported in the states a run constructs today. The exposure is that nothing prevents one: extending the execution vocabulary can silently produce a checkpoint that contradicts itself, and both the type checker and the validator will accept it.

External: https://github.com/Jei-sKappa/antmay/issues/63
