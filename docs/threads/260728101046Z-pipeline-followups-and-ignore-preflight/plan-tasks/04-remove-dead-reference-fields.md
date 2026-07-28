### Task 4: Remove dead reference fields

**Objective:** Reduce `DocumentReference` to the source information production behavior consumes.

**Input / context:** `spec.md` FR-7 AC-7.1; `decisions.md DR8` and `decisions.md DR14`; and the current reference resolver and its focused tests.

**Steps:**
1. Update `cli/src/config/references.test.ts` to assert the two-property result for name and path routing while retaining coverage that syntax alone selects the same source paths. Run the focused suite and observe the exact-shape expectations fail against the current four-property result.
2. Change `DocumentReference` in `cli/src/config/references.ts` to exactly `{ role, sourcePath }`, remove `raw` and `form` from both resolved-reference object literals, and rewrite the type comment to describe source provenance without claiming a diagnostic consumes removed fields.
3. Run the focused reference suite, typecheck, and the full CLI gate. Confirm that successful `DocumentReference` objects and their consumers contain neither field while unrelated uses of the words `raw` and `form` remain untouched.

**Files modified:**

- `cli/src/config/references.ts`
- `cli/src/config/references.test.ts`

**Verification:**

- `npm --prefix cli run test -- src/config/references.test.ts` exits `0`.
- `npm --prefix cli run typecheck` exits `0`.
- A property-scoped search of `DocumentReference`, its object literals, and its consumers finds neither `form` nor `raw`.
- `npm --prefix cli run check` exits `0`.

**Acceptance criteria:**

- Every successful `DocumentReference` contains only `role` and `sourcePath`, with routing and diagnostics unchanged.
- The type's doc comment names only source provenance the value actually carries.
- No unrelated use of `raw` or `form` under `cli/` is changed.
- No user-visible string, exit code, or rendering changes as a result of the field removal.

**Consumes:** none

**Produces:** `DocumentReference = { role, sourcePath }` and focused routing expectations over that exact shape.
