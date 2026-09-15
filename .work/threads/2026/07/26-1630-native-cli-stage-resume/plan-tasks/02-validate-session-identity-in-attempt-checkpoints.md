### Task 2: Validate session identity in attempt checkpoints

**Objective:** Give attempt records an optional, strictly validated ID-only provider session without changing the checkpoint version or compatibility policy.

**Input / context:** Implement `spec.md` FR-2's durable record shape according to `decisions.md` DR4 and DR22. The harness remains authoritative in `checkpoint.stages[attempt.stageIndex].profile.harness`, so the attempt stores only the opaque non-empty ID.

**Steps:**

1. Add `agentSession?: { id: string }` to `AttemptRecord` in `cli/src/state/checkpoint.ts`.
2. Extend `validateAttempt` so an absent `agentSession` is valid and a present value must be an object containing a non-empty string `id`.
3. Reject a present session that is `null`, a non-object, missing `id`, or carries an empty or non-string `id`; do not apply a provider-specific grammar and do not add a duplicated harness field.
4. Keep `RunCheckpoint.schemaVersion` fixed at `0` and add no migration, fallback, optional compatibility shim, or alternate record shape.
5. Add focused cases to `cli/src/state/checkpoint.test.ts` proving round-trip retention for a valid session, acceptance when the field is absent, and rejection of every invalid present shape.

**Files modified:**

- `cli/src/state/checkpoint.ts`
- `cli/src/state/checkpoint.test.ts`

**Verification:**

1. `npm --prefix cli run test -- src/state/checkpoint.test.ts`
2. `npm --prefix cli run check`

**Acceptance criteria:**

- A checkpoint attempt round-trips with `{ "agentSession": { "id": "S" } }`.
- An attempt with no `agentSession` remains valid.
- Missing, non-string, and empty IDs, plus non-object session values, fail validation with field-specific errors.
- The persisted shape contains no harness copy and applies no provider-specific ID validation.
- `schemaVersion` remains `0`, and no migration or compatibility code is introduced.

**Consumes:** none

**Produces:** `AttemptRecord.agentSession?: { id: string }` and checkpoint validation for that exact ID-only shape.
