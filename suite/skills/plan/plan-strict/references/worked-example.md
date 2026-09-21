# Worked Example

A complete task file, then a short index excerpt. Note: only sequential numbered tasks — no wave numbers, no `depends_on` array, no bracketed wave prefixes, no fork/join syntax anywhere.

A task file `plan-tasks/01-add-jwt-helper.md`:

```markdown
### Task 1: Add JWT verification helper

**Objective:** Provide a reusable verification function that the auth middleware will call.

**Input / context:** Settled by the decision record `2609051230-use-jose-for-jwt`, drafted in this thread as `delta/docs/adr/2609051230-use-jose-for-jwt.md` — use the `jose` library, not `jsonwebtoken`.

**Steps:**
1. Add `jose` to `package.json` dependencies and run install.
2. Create `src/lib/jwt.ts` exporting `verifyToken(token: string): Promise<UserClaims | null>`.
3. Implement: import `jwtVerify` from `jose`, read `JWT_SECRET` from env, return the verified payload typed as `UserClaims`, return `null` on any failure.
4. Add unit tests at `src/lib/jwt.test.ts` covering a valid token, an expired token, a malformed token.

**Files modified:** `package.json`, `src/lib/jwt.ts` (NEW), `src/lib/jwt.test.ts` (NEW)

**Verification:** `npm test src/lib/jwt.test.ts` exits 0; `grep -q "jose" package.json` returns success.

**Acceptance criteria:**
- A request carrying an expired token is rejected rather than served.
- `verifyToken` exported from `src/lib/jwt.ts` with the signature above.
- Three unit tests pass: valid token, expired token, malformed token.
- `package.json` declares `jose` as a runtime dependency.

**Consumes:** none

**Produces:** `verifyToken(token: string): Promise<UserClaims | null>` exported from `src/lib/jwt.ts`.
```

The matching index excerpt in `plan.md`:

```markdown
Source: change.md

## Global Constraints

- Use the `jose` library for all JWT work; `jsonwebtoken` is banned.
- All new code ships with unit tests.

## Tasks

1. **Add JWT verification helper** — provide the reusable `verifyToken` the middleware will call. → `plan-tasks/01-add-jwt-helper.md`
2. **Wire the auth middleware** — call `verifyToken` on every protected route. → `plan-tasks/02-wire-auth-middleware.md`
```

The first acceptance line is a criterion of the change document carried across word for word — no identifier, no number, no rewording — and the three lines under it are the task's own observable post-conditions. That is what a strict plan looks like: an index carrying the `Source:` line, the verbatim Global Constraints block, and the ordered task list; and one task file per task with eight labeled elements — prescriptive substeps, mechanical verification, observable acceptance, and the `Consumes:`/`Produces:` hand-off. An agent-leaning implementer handed a single task file can execute it without inferring anything beyond what is written. The absence of any wave number, `depends_on` array, or fork/join construct is observable throughout — the plan is sequential.
