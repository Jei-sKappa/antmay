### Task 3: Reshape the skill tree and its registrations

**Objective:** Leave `suite/skills/` with exactly the eight groups the spec names — adding `model-invoked/` with `consult-adrs` and `consult-glossary`, removing `primitives/`, `finish`, `whats-next`, and the recipes, renaming `finish-navigate/` to `close/` — with every registration (manifest, marketplace, commit scopes) aligned and every skill at `version: 0.0.0`.

**Input / context:** `spec.md` § "Skill groups and registrations", § "Versions", and AC-2.4, AC-3.1, AC-3.2, AC-3.4, AC-7.1 … AC-7.5. Settled decisions: `decisions.md DR1` (delete the primitives group), `DR8` (model-invoked skills, the `model-invoked/` group, the two members and their content), `DR14` (delete recipes, `whats-next`, `finish`; rename the group `close/`; every version `0.0.0`), `DR16` (a model-invoked skill's description is precise and complete about when to invoke it). Starts from task 2's manifest. The catalog command and the conflict rule below are pinned because task 1 removed them from `adr.md` and they must not drift. The instruction-block rules for `agents/openai.yaml` are in `suite/AGENTS.md` § "Invocation roles" (still on disk in this task).

**Steps:**

1. Create `suite/skills/model-invoked/consult-adrs/SKILL.md` (NEW). Frontmatter: `name: consult-adrs`; a `description` that states precisely and completely when to invoke it — before acting on any work that could rest on or contradict a project decision: reading a thread's artifacts, designing, planning, implementing, reviewing, or closing, in any project that holds `docs/adr/`, whether or not another skill is running; no `disable-model-invocation` key; `metadata.author: https://github.com/Jei-sKappa`, `metadata.version: 0.0.0`. Body: (a) `docs/adr/` is the whole authoritative surface for project decisions and carries no index — print the catalog of stems, names, and descriptions with this command, pinned verbatim:

   ```sh
   for f in docs/adr/*.md; do awk -v stem="$(basename "$f" .md)" '/^---$/{n++; next} n==1 && /^name: /{sub(/^name: /,""); name=$0} n==1 && /^description: /{sub(/^description: /,""); desc=$0} n==2{print stem "\t" name "\t" desc; exit}' "$f"; done
   ```

   (an absent or empty `docs/adr/` means the project has no decisions yet, and the command prints nothing); (b) open the records relevant to the work at hand and treat them as authoritative; (c) the conflict rule, both halves: a contradiction between the work's material and a project ADR or glossary term is **intentional**, and raised by no one, when the thread's `adr/` holds a draft naming that ADR in `supersedes` or the thread's `glossary.md` redefines the term — writing that superseding draft is how the user's confirmation is recorded; every other contradiction is an **unnoticed conflict**: an interactive agent puts it to the user, a completion-oriented run queues it as a pending decision, and no one resolves it by overriding the project record. Cite the ADR file shape as `references/formats/adr.md`.
2. Create `suite/skills/model-invoked/consult-adrs/agents/openai.yaml` (NEW) with the `interface:` block only — `display_name: Consult ADRs`, a fresh 4–7-word `short_description` — and no `policy` block.
3. Create `suite/skills/model-invoked/consult-glossary/SKILL.md` (NEW). Frontmatter as above with `name: consult-glossary` and a description stating when to invoke it — before writing any prose, name, or identifier in a project that holds `docs/glossary.md`, and whenever a term's meaning is in doubt, whether or not another skill is running. Body: read `docs/glossary.md` (the table shape is in `references/formats/glossary.md`); write the fixed term rather than a synonym; when working inside a thread, that thread's own `glossary.md` is authoritative for the terms it defines and takes precedence over the project glossary inside that thread; an absent glossary means the project has fixed no terms yet.
4. Create `suite/skills/model-invoked/consult-glossary/agents/openai.yaml` (NEW), interface block only, `display_name: Consult Glossary`.
5. Remove the primitives and the two unused skills with Git so history records the deletion: `git rm -r suite/skills/primitives suite/skills/finish-navigate/finish suite/skills/finish-navigate/whats-next`.
6. Rename the group: `mkdir -p suite/skills/close && git mv suite/skills/finish-navigate/close-thread suite/skills/close/close-thread`, then confirm `suite/skills/finish-navigate` no longer exists (remove the empty directory if Git left it).
7. Remove the recipes: `git rm -r suite/shared/references/recipes`.
8. Edit `suite/shared/manifest.yaml`: delete the keys `skills/finish-navigate/finish`, `skills/finish-navigate/whats-next`, `skills/primitives/allocate-thread`, `skills/primitives/emit-pending-decisions`, `skills/primitives/update-implementation-report`; rename the key `skills/finish-navigate/close-thread` to `skills/close/close-thread`; add `formats/thread.md` under `skills/capture-discussion/open-thread` and `skills/close/close-thread`; add `formats/glossary.md` under `skills/capture-discussion/discussion`, `skills/capture-discussion/resolve-pending-decisions`, and `skills/close/close-thread`; add new keys `skills/model-invoked/consult-adrs` declaring `formats/adr.md` and `skills/model-invoked/consult-glossary` declaring `formats/glossary.md`; remove `formats/log-line.md` from the three `skills/implement/*` keys (they no longer write the log, per DR5) and delete those three orphan copies by hand (`git rm suite/skills/implement/*/references/formats/log-line.md`).
9. Set every remaining `SKILL.md` frontmatter to `version: 0.0.0` (all skills, including the two new ones): `grep -l 'version:' suite/skills/*/*/SKILL.md | xargs sed -i '' -E 's/^(  version: ).*/\10.0.0/'`. Change nothing else in the frontmatter in this task.
10. Edit `.claude-plugin/marketplace.json`: the `skills` array lists exactly the twenty folders that now exist, one `./skills/<group>/<skill>` per line, sorted — `capture-discussion/{discussion,open-thread,open-ticket,resolve-pending-decisions}`, `close/close-thread`, `implement/{implement,implement-plan,implement-plan-with-subagents}`, `model-invoked/{consult-adrs,consult-glossary}`, `plan/{check-plan,plan-brief,plan-strict}`, `review/{review-code,review-implementation,review-spec}`, `roadmap/roadmap`, `spec/spec`.
11. Edit `.vscode/settings.json` `conventionalCommits.scopes`: remove `allocate-thread`, `emit-pending-decisions`, `emit-pending-review`, `update-implementation-report`, `whats-next`, `finish`; add `consult-adrs`, `consult-glossary`; keep `cli`; keep the array sorted alphabetically.
12. Run `cd suite && node scripts/sync-shared-references.mjs && node scripts/check-marketplace-skills.mjs && cd ..`.
13. Confirm no skill's `references/` holds a generated file the manifest no longer declares: for each skill, list `references/formats/*` and `references/instructions/*` and compare with its manifest entries; remove any orphan with `git rm`. Hand-authored references (`open-thread/references/supplied-ticket.md`, `implement-plan-with-subagents/references/{code-quality-reviewer,plan-compliance-reviewer,reviewer-policy}.md`, `plan-strict/references/worked-example.md`) stay.

**Files modified:** `suite/skills/model-invoked/consult-adrs/SKILL.md` (NEW), `suite/skills/model-invoked/consult-adrs/agents/openai.yaml` (NEW), `suite/skills/model-invoked/consult-glossary/SKILL.md` (NEW), `suite/skills/model-invoked/consult-glossary/agents/openai.yaml` (NEW), `suite/skills/model-invoked/*/references/formats/*.md` (NEW, generated), `suite/skills/primitives/` (DELETED, whole tree), `suite/skills/finish-navigate/finish/` (DELETED), `suite/skills/finish-navigate/whats-next/` (DELETED), `suite/skills/finish-navigate/close-thread/` → `suite/skills/close/close-thread/` (moved), `suite/shared/references/recipes/` (DELETED), `suite/skills/implement/*/references/formats/log-line.md` (DELETED, three files), `suite/shared/manifest.yaml`, every `suite/skills/*/*/SKILL.md` (version line), `.claude-plugin/marketplace.json`, `.vscode/settings.json`, generated `references/formats/thread.md` and `references/formats/glossary.md` copies under the declaring skills.

**Verification:**

```sh
ls suite/skills | sort | tr '\n' ' '; echo
# expect: capture-discussion close implement model-invoked plan review roadmap spec
test ! -e suite/skills/primitives && test ! -e suite/skills/finish-navigate && test ! -e suite/shared/references/recipes
(cd suite && node scripts/check-marketplace-skills.mjs)
grep -h 'version:' suite/skills/*/*/SKILL.md | sort -u          # exactly one line: "  version: 0.0.0"
# AC-3.1 / AC-3.4
grep -L 'disable-model-invocation: true' suite/skills/*/*/SKILL.md   # exactly the two model-invoked skills
grep -l 'disable-model-invocation' suite/skills/model-invoked/*/SKILL.md   # nothing
grep -l 'policy' suite/skills/model-invoked/*/agents/openai.yaml           # nothing
grep -L 'allow_implicit_invocation: false' suite/skills/*/*/agents/openai.yaml   # exactly the two model-invoked skills
# AC-3.2
grep -c 'awk -v stem' suite/skills/model-invoked/consult-adrs/SKILL.md       # 1
grep -c 'supersedes' suite/skills/model-invoked/consult-adrs/SKILL.md        # >= 1
grep -ci 'unnoticed\|every other contradiction' suite/skills/model-invoked/consult-adrs/SKILL.md   # >= 1
grep -ci 'synonym' suite/skills/model-invoked/consult-glossary/SKILL.md      # >= 1
grep -ci "thread's own \`glossary.md\`\|authoritative inside" suite/skills/model-invoked/consult-glossary/SKILL.md   # >= 1
# AC-7.3 scopes == leaf names
diff <( (ls -d suite/skills/*/* | xargs -n1 basename; echo cli) | sort) <(python3 -c 'import json;print("\n".join(json.load(open(".vscode/settings.json"))["conventionalCommits.scopes"]))' | sort)   # nothing
# AC-7.5 orphans
(cd suite && node scripts/sync-shared-references.mjs) >/dev/null
awk '/^[^ #]/{k=$1; sub(/:$/,"",k)} /^  - /{print k"\t"$2}' suite/shared/manifest.yaml | while IFS=$'\t' read k src; do cmp -s "suite/shared/references/$src" "suite/$k/references/$src" || echo "OUT OF SYNC $k $src"; done   # nothing
for s in suite/skills/*/*; do for f in $(find $s/references -path '*/formats/*' -o -path '*/instructions/*' 2>/dev/null); do rel=${f#$s/references/}; key=${s#suite/}; awk -v k="$key:" -v r="  - $rel" '$0==k{in_k=1;next} /^[^ ]/{in_k=0} in_k && $0==r{found=1} END{exit !found}' suite/shared/manifest.yaml || echo "ORPHAN $f"; done; done
```

The `diff` prints nothing (sort both sides if the ordering differs); the orphan loop prints nothing; every `# nothing` line prints nothing; the `grep -L` lines print exactly `consult-adrs` and `consult-glossary` paths.

**Acceptance criteria:**

- `suite/skills/` holds exactly `capture-discussion/`, `close/`, `implement/`, `model-invoked/`, `plan/`, `review/`, `roadmap/`, `spec/`; twenty skill folders in total.
- `consult-adrs` and `consult-glossary` exist with the contents in steps 1–4: no `disable-model-invocation`, interface-only `agents/openai.yaml`, the pinned catalog command, both halves of the conflict rule, the fixed-term rule, and thread-glossary precedence.
- Every other skill carries `disable-model-invocation: true` and `policy.allow_implicit_invocation: false`.
- Every `SKILL.md` reads `version: 0.0.0`.
- `node scripts/check-marketplace-skills.mjs` passes; `.vscode/settings.json` scopes equal the skill leaf names plus `cli`.
- The manifest declares no deleted skill, declares `formats/thread.md` and `formats/glossary.md` for the skills in step 8, and no skill's `references/` holds an undeclared generated file.

**Consumes:** `formats/thread.md` and `formats/glossary.md` from task 1; the manifest with instruction entries from task 2.

**Produces:** the skill paths every later task edits — `suite/skills/close/close-thread/`, `suite/skills/model-invoked/consult-adrs/`, `suite/skills/model-invoked/consult-glossary/`; the invocation names `/consult-adrs` and `/consult-glossary` that tasks 4–7 write into every `## Inputs` section; `.claude-plugin/marketplace.json` and `.vscode/settings.json` in their final state.
