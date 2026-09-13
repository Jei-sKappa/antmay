### Task 7: Document and verify pipeline authoring

**Objective:** Publish the complete current external-pipeline contract, stage support matrix, repository maintenance rule, and reproducible final verification surface.

**Input / context:** Document the implementation produced by Tasks 1–6 as the current CLI design. Follow `spec.md` section “User and maintainer documentation,” `FR-8`, and `FR-9`, with `decisions.md DR4`, `DR9`, `DR12`, `DR14`, `DR16`, and `DR17`. Use root `README.md` as the authoritative published skill catalog and root `AGENTS.md` as the sole home of the cross-module synchronization rule.

**Steps:**
1. Rewrite the CLI introduction and command examples around required external pipeline references, optional `--from`, and optional `--profile`; remove descriptions of a runnable built-in pipeline, `afk.defaults`, local prompts, and merged bindings.
2. Publish a complete Standard pipeline JSON document using the production schema, ready to save as `<config-root>/pipelines/standard.json`, plus examples for a full named run, suffix run, custom relative/absolute pipeline path, named profile, and explicit profile path.
3. Document the exact raw name grammar and syntax-directed name/path resolution, including invalid bare filenames and no fallback; document strict pipeline, settings, and execution-profile schemas; explain whole-binding profile precedence and intrinsic timing defaults.
4. Add one support/prerequisite matrix containing every skill published in root `README.md` exactly once. Mark exactly the nine catalog skills supported with their observable prerequisites; mark `propose`, `reconcile-proposal`, `roadmap`, `reconcile-roadmap`, and `review-roadmap` planned; and explain every other unsupported skill through its user-visible need for interaction, caller input, dynamic targets, or broader side effects.
5. Update the scripted demo catalog table for the external Standard document, resolved startup shapes, the new contract scenarios, and renumbered scenario IDs.
6. Rewrite the manual smoke checklist so a human can copy the documented Standard pipeline and canonical local bindings, run full and suffix executions through real Codex and Claude Code harnesses, inspect the resolved summary, deliberately trigger a contract pause, repair it, and resume. Keep paid/credentialed calls explicitly outside automation.
7. Update `cli/AGENTS.md` to describe the current external-document execution model, nine-stage catalog, local binding modules, artifact contracts, checkpoint provenance, runtime recovery, and revised demo setup. Do not place the cross-module synchronization rule there.
8. Add the single root `AGENTS.md` rule requiring the CLI README support/prerequisite matrix to change whenever suite skill invocation posture, accepted inputs, durable outputs, or side-effect boundaries affect eligibility/prerequisites, or whenever CLI catalog, target, artifact interpretation, or prerequisite behavior changes. Do not duplicate it in `cli/AGENTS.md` or `suite/AGENTS.md`.
9. Create an automated documentation test that extracts the copyable Standard pipeline block and validates it with the production loader; compares the README support matrix against the root published skill catalog; asserts all nine supported prerequisites, five planned entries, and user-visible reasons for every remaining skill; and verifies the synchronization rule exists only at the root.
10. Run the complete typecheck/test/build gate, list the demo catalog, and run the all-done and both contract-pause scenarios once more after documentation extraction tests are in place.

**Files modified:**

- `AGENTS.md`
- `cli/AGENTS.md`
- `cli/README.md`
- `cli/src/pipeline/documentation.test.ts` (NEW)

**Verification:**

1. Run `npm --prefix cli run test -- src/pipeline/documentation.test.ts`.
2. Run `npm --prefix cli run demo -- --list`.
3. Run `npm --prefix cli run demo -- --scenario 01-all-done --no-color`.
4. Run `npm --prefix cli run demo -- --scenario 07-runtime-prerequisite --no-color`.
5. Run `npm --prefix cli run demo -- --scenario 08-stage-contract-violation --no-color`.
6. Run `npm --prefix cli run check`.

**Acceptance criteria:**

- `cli/README.md` contains a complete Standard pipeline document that the production validator accepts unchanged.
- The README documents the exact run grammar, raw name grammar, name/path routing, schemas, profile/settings precedence, timing defaults, startup summary, and all required invocation examples.
- The support matrix contains every published skill exactly once, all nine supported stage prerequisites, exactly five planned proposal/Roadmap capabilities, and a user-visible reason for every other unsupported skill.
- Root `AGENTS.md` is the only agent-guidance file containing the cross-module matrix synchronization rule.
- `cli/AGENTS.md` describes the implemented external-pipeline architecture and demo conventions without duplicating the root rule.
- The manual smoke checklist covers full and suffix real-harness runs, resolved display, contract breakage, repair, and resume while remaining explicitly human-run.
- The documentation test, selected demos, and `npm --prefix cli run check` all exit `0`.

**Consumes:** the completed external pipeline, binding, composition, checkpoint, runtime recovery, display, and demo behavior from Tasks 1–6; the published skill list in root `README.md`.

**Produces:** none
