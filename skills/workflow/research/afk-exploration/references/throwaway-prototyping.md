# Throwaway Prototyping

> Method reference for unattended construction of disposable prototypes that exercise a hypothesis in actual code. The prototyper subagent reads this file; the orchestrator does not.

Throwaway prototyping methodology for building an isolated, disposable codebase that teaches something a research note can't.

## Core principle

A prototype's value is what it teaches — not the code itself. The prototype is disposable; the lessons recorded in `findings.md` are the permanent artifact. Size the prototype to the hypothesis: no scaffolding, no boilerplate that doesn't reach the question, no production-quality polish — but also no artificial cap on real code that the hypothesis genuinely requires. A small question (an API ergonomics check) is well served by 50 lines; a bigger question (a multi-subsystem integration check) reasonably needs more. The constraint is on *unnecessary* code, not on *total* code.

## Process

The steps are strictly ordered. The first two exist to make the run survivable when something later fails or is interrupted.

1. Create the temp directory.
2. Create the angle folder and write `prototype-pointer.md`.
3. (Optional) Copy the user's codebase into the temp directory — only for incremental prototypes.
4. Build the minimal thing that exercises the hypothesis.
5. Run it; capture evidence.
6. Write `findings.md` and any auxiliary materials.

## Step 1 — Create the temp directory

Run:

```sh
mktemp -d /tmp/afkprt.<topic-slug>.XXXXXX
```

Substitute the topic slug from the brief. The trailing `XXXXXX` block is replaced by `mktemp` with random characters; this guarantees uniqueness across waves and runs without coordinating with the orchestrator. The portable form (explicit `/tmp/` prefix) works on macOS BSD `mktemp` and Linux GNU `mktemp` alike.

The command prints the created directory path. Capture it; every later step uses this absolute path.

`/tmp` is volatile — the system may wipe it on reboot or after a retention window. Plan accordingly (see *Materials alongside findings.md* below).

## Step 2 — Create the angle folder and write the pointer file (BEFORE any heavy work)

Before any dependency install, codebase copy, or code generation, `mkdir -p` the angle folder (it doesn't exist yet) and write `prototype-pointer.md` inside it. This is the single durable record of where the volatile temp directory lives.

Minimal content:

```markdown
# Prototype pointer

**Temp directory:** /tmp/afkprt.<topic-slug>.abc123

**Hypothesis:** <one-sentence question from the brief>

**Status:** in-progress  <!-- updated to "complete" or "aborted" once findings.md is written -->

**How to run:** <updated in Step 6 once the prototype is buildable>

Safe to delete the temp directory and this pointer when you're done. `/tmp` may already have wiped the directory; if so, this pointer is the only remaining record of the attempt.
```

Writing this file early means a run interrupted between Step 1 and Step 6 still leaves a record the user can find on return.

## Step 3 — Copying the user's codebase (incremental prototypes only)

Skip this step for from-scratch prototypes — for those, the temp directory starts empty and you build into it.

For incremental prototypes (the experiment is a modification of the user's existing project), you need a working copy inside the temp directory so changes don't touch the original. The brief's *Codebase context* field gives the path to copy from.

Pick whichever copy method fits:

- **`rsync` with build-artifact exclusions** — language-agnostic, no git history, smaller:

  ```sh
  rsync -a \
    --exclude=node_modules --exclude=.git --exclude=dist --exclude=build \
    --exclude=target --exclude=.venv --exclude=__pycache__ \
    <user-project>/ <prototype-dir>/
  ```

  Add language-specific exclusions as needed (`.next`, `out`, `*.egg-info`, etc.).

- **`git clone --no-hardlinks file://<user-project> <prototype-dir>`** — when "diff against the original" matters; preserves git, lets you run `git diff` later for a clean summary of what the prototype changed. Costs more disk; uses no hard links so the original is fully isolated.

After either approach, run the project's bootstrap (`npm install`, `pip install -r requirements.txt`, etc.) inside the temp directory to repopulate the dependencies that were excluded. Treat install failure as a finding, not an abort (see *Handling common situations* below).

## Step 4 — Build the load-bearing thing

Write the code that's load-bearing for the hypothesis — no more, no less. Resist scaffolding, error handling, configuration layers, or anything that isn't part of exercising the question, but don't artificially shrink the prototype either (see *Core principle*). A prototype that mocks the boring parts and uses the real version of the part under test teaches more than a prototype that builds everything from scratch.

Some heuristics:

- If the hypothesis is library ergonomics, use the real library and mock everything else.
- If the hypothesis is performance, run against realistic data shapes and sizes (not the toy example from the library's README).
- If the hypothesis is integration, use the real external service when possible; fall back to a recorded fixture when credentials aren't available.
- If the hypothesis is genuinely large (multiple modules, several subsystems), reach for as much code as needed — see *Core principle*.

## Step 5 — Run and capture evidence

Run the prototype as a one-shot (`node app.js`, `python script.py`, `cargo run`). If the prototype is a server, start it, hit it with `curl`, capture the output, then stop it before the step ends. **Never leave a background process running past the subagent's session** — the orchestrator cannot see it and won't clean it up.

Capture the evidence the next step needs to write `findings.md`:

- The actual output (log lines, response bodies, benchmark numbers).
- Any error messages encountered and how they were resolved (or weren't).
- Specific file:line references inside the prototype for snippets that matter.

## Step 6 — Write `findings.md` and auxiliary materials

Write `findings.md` at the path the brief provided. Suggested shape:

```markdown
## Question

<the hypothesis, restated>

## What I built

<2–4 sentences describing the prototype's structure>

## How to reproduce

<commands to install and run inside the temp dir>

## What I learned

<concrete findings, grounded in evidence; cite file:line into the prototype>

## Surprises and dead ends

<the non-obvious stuff: things that didn't work, paths that turned out to be wrong>

## What I couldn't test

<explicit gaps: mocks used in place of real services, credentials unavailable, scale not exercised, OS-specific behavior untested>

## Open questions

<what still needs investigation>
```

After writing `findings.md`, update `prototype-pointer.md`: set *Status* to `complete` and fill in the *How to run* section with the real reproducer.

## Materials alongside findings.md

`/tmp` is volatile. Anything load-bearing for understanding the findings must outlive the temp directory.

- **Load-bearing snippets** — the 10-line core of the prototype, the config that drives the finding, the actual benchmark output — go **inline in `findings.md`** as fenced code blocks. This is the primary durability mechanism.
- **Auxiliary material** that's too bulky for inline but still worth keeping — a full schema dump, a `git diff` of the changes to a copied codebase, a longer benchmark CSV, a saved log file — can go as additional files in the angle folder. No required naming scheme; pick descriptive names and reference them from `findings.md`.

The synthesiser does **not** read auxiliary files. It reads `findings.md` and the three critiques. Auxiliary materials are for the human reader drilling deeper.

## Hard constraints

- **Writes confined to**: the temp directory, the two named files in the angle folder (`findings.md`, `prototype-pointer.md`), and any auxiliary materials in the angle folder. Nothing else.
- **The user's actual project is read-only.** It can be read for context (e.g. understanding existing patterns) and copied from in Step 3, but never modified, never run inside, never `cd`-ed into for command execution.
- **No `sudo`.** Ever.
- **No global package installs.** Use the local project's package manager (`npm install`, `pip install` in a venv, `uv pip install`, `cargo` inside the temp dir, etc.).
- **No modifications to the user's PATH, shell config, or other persistent user state.**
- **No long-running background processes.** One-shot runs, or start-curl-kill for server prototypes. Anything that would outlive the subagent's session is forbidden.
- **No `rm -rf` outside the temp directory.**
- **Network is allowed** for package downloads and for the prototype's own legitimate behavior (e.g. talking to a real OAuth provider if that's the hypothesis). Not for anything else.
- **Credentials**: never commit, never log, never persist outside the temp directory. If the prototype needs credentials and none are available, record the gap in `findings.md` under *What I couldn't test* and proceed with mocks.

## Handling common situations

- **Dependency installation fails.** This is a finding, not an abort. Record what was attempted, what error came back, and what the failure implies about the library's setup story. Write `findings.md` anyway, even if the prototype never ran.
- **Credentials needed but unavailable.** Use mocks or recorded fixtures. Record the gap explicitly under *What I couldn't test*.
- **External service needs to be exercised.** Make the calls; capture and verify the responses; tear down anything you created (test users, sample resources) if the service supports it.
- **The prototype reveals the hypothesis is wrong.** That's a valid finding — don't try to rescue it. A "we built it, it doesn't fit, here's why" prototype is just as valuable as a "we built it, it fits beautifully" one.
- **The prototype is bigger than expected.** Two questions: (a) is every part load-bearing for the hypothesis, or have I added scaffolding the question doesn't need? (b) is the hypothesis itself genuinely big? If (a), trim. If (b), keep going — see *Core principle*.

## Return contract

Write everything to disk: `findings.md`, `prototype-pointer.md`, the prototype code in `/tmp`, any auxiliary materials in the angle folder. Reply to the orchestrator with **only**:

- A 2–3 sentence summary of what the prototype showed.
- The absolute path of `findings.md`.
- The absolute path of the temp directory.

Do **not** paste findings, pointer content, or prototype code back. The orchestrator never loads these into its own context.
