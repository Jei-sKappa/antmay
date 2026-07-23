# Task 2: Config/state roots and settings validation

**Objective:** Resolve the config and state roots with the documented precedence and load `<config-root>/settings.json` as strict, exhaustively validated JSON, including the copyable settings example the missing-settings diagnostic points at.

**Input / context:** `spec.md` §"Configuration and state roots", §"Settings file and validation"; `decisions.md DR42` (root precedence, absolute-path rule, no expansion, lazy state creation, read-only settings), `DR32` (strict JSON, schema rules, aggregate error reporting), `DR14` (never create settings; point to a copyable example). Validation of stage keys needs the set of stage IDs known to installed built-in recipes — accept it as a parameter so this module stays recipe-agnostic (the caller passes the `standard` stage IDs from Task 3's recipe).

**Steps:**

1. Create `cli/src/config/roots.ts` exporting `resolveRoots(env: NodeJS.ProcessEnv, homedir: string | undefined): RootsResult` where `RootsResult` is `{ ok: true; configRoot: string; stateRoot: string } | { ok: false; message: string }`. Precedence: config root `ANTMAY_CONFIG_HOME`, else `$XDG_CONFIG_HOME/antmay`, else `<home>/.config/antmay`; state root `ANTMAY_STATE_HOME`, else `$XDG_STATE_HOME/antmay`, else `<home>/.local/state/antmay`. Empty values count as unset; a selected env value that is not an absolute path (this includes literal `~…` and `$VAR…` values) is an error naming the variable; no tilde/variable/shell expansion; normalize with `path.normalize` without case changes; a missing home when needed fails clearly. Never create any directory here.
2. Create `cli/src/config/settings.ts` exporting `type HarnessId = "codex" | "claude-code"`, `type ProfileFields = { harness?: HarnessId; model?: string; prompt?: string; idleTimeoutSeconds?: number }`, `type AfkSettings = { defaults: ProfileFields; stages: Record<string, ProfileFields> }`, and `loadSettings(configRoot: string, knownStageIds: ReadonlySet<string>): SettingsResult` with `SettingsResult = { ok: true; settings: AfkSettings } | { ok: false; expectedPath: string; missing: boolean; errors: string[] }`.
3. Implement loading: only `<config-root>/settings.json` is read; a missing file sets `missing: true` and an errors entry that names the fully resolved expected path and points to the copyable example in `cli/README.md`; a JSON syntax error names the file and the parser's position.
4. Implement the manual typed validator (no schema library): document root and `afk` must be objects; `afk.defaults`/`afk.stages` may be omitted or empty (normalize to empty objects); profiles allow only `harness`, `model`, `prompt`, `idleTimeoutSeconds`; `harness` ∈ {`codex`, `claude-code`}; `model` non-empty string; `prompt` string; `idleTimeoutSeconds` positive finite integer; unknown fields at every level are errors; stage keys not in `knownStageIds` are errors. Collect *all* schema errors with JSON property paths (e.g. `afk.stages.spec.model`) and report them together. No environment interpolation.
5. Create `cli/README.md` opening with a short package description and a "Settings" section containing a complete, copyable `settings.json` example (root `afk` object, `defaults` with `harness`/`model`, one stage override showing `prompt` and `idleTimeoutSeconds`) and the resolved default path `~/.config/antmay/settings.json`. Leave a placeholder-free document — the manual smoke checklist section is appended by Task 16.
6. Add `cli/src/config/roots.test.ts` and `cli/src/config/settings.test.ts` covering: each precedence rung for both roots; empty-value-as-unset; relative/`~`/`$VAR` env values rejected; missing home failure; missing file diagnostics carrying the exact expected path; syntax-error location; every schema rule above, including aggregate multi-error reporting and unknown-stage-key rejection via an injected stage-ID set.

**Files modified:** `cli/src/config/roots.ts` (NEW), `cli/src/config/settings.ts` (NEW), `cli/README.md` (NEW), `cli/src/config/roots.test.ts` (NEW), `cli/src/config/settings.test.ts` (NEW)

**Verification:** `npm --prefix cli run check` exits 0; `npm --prefix cli run test -- src/config` exits 0. `grep -q '"afk"' cli/README.md` succeeds (the example is present and complete JSON — paste it through `node -e 'JSON.parse(...)'` in a test or manually).

**Acceptance criteria:**

- AC-2.1/AC-2.2 behaviors hold in tests (precedence, empty-as-unset, relative rejection, no expansion).
- AC-3.1/AC-3.2 behaviors hold in tests (single accepted path, syntax location, every rejection rule, aggregate property-path reporting).
- Missing-settings result carries the fully resolved expected path and a pointer to the `cli/README.md` example (AC-2.3, AC-3.3 diagnostic content).
- Neither module creates files or directories.

**Consumes:** the `cli/` package scaffold and test setup from Task 1.

**Produces:** `resolveRoots(env, homedir): RootsResult` from `cli/src/config/roots.ts`; `loadSettings(configRoot, knownStageIds): SettingsResult`, `HarnessId`, `ProfileFields`, `AfkSettings` from `cli/src/config/settings.ts`; the copyable settings example in `cli/README.md`.
