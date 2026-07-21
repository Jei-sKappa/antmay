### Task 1: Scaffold the publishable Bun workspace

**Objective:** Establish the strict TypeScript ESM Bun workspace, publishable `antmay` binary shell, and repository-wide quality gates that every later task uses.

**Input / context:** `spec.md` §3.1 and FR-1; `decisions.md DR12`, `decisions.md DR13`, and `decisions.md DR17`; mirror the applicable workspace, package, TypeScript, Biome, Vitest, and Commander conventions in `.library/sources/Jei-sKappa_jastr` while naming the reusable package `@antmay/core` and the executable package `antmay`.

**Steps:**
1. Create the root Bun workspace metadata, Node `>=20` engine declaration, strict shared TypeScript configuration, Biome configuration, Vitest configuration, and the required `build`, `typecheck`, `test`, `test:cli:e2e`, `check`, and `format` scripts.
2. Add `node_modules`, package build output, coverage output, and other generated JavaScript artifacts to `.gitignore` without changing existing workflow-artifact ignores.
3. Create `packages/core` as a private workspace library with ESM exports, declaration generation, a Node-targeted build, and an initial public `src/index.ts`.
4. Create `packages/cli` as the npm/`npx`-runnable package with `bin.antmay = ./dist/index.js`, Node `>=20`, Commander plus `@commander-js/extra-typings`, a Node-targeted shebang build, and a dependency on `@antmay/core`.
5. Add a typed `createProgram()` that identifies the executable as `antmay` and registers only `spawn`, `status`, and `attach`; initially make each command fail with a stable not-yet-implemented diagnostic while keeping the private worker absent from help.
6. Add package-contract and CLI-shell tests covering ESM metadata, Node engines, the binary mapping, exact public command names, and the absence of a worker command.
7. Run `bun install` to create the checked-in lockfile, then run every standing gate introduced by this task.

**Files modified:**
- `.gitignore`
- `package.json` (NEW)
- `bun.lock` (NEW)
- `tsconfig.base.json` (NEW)
- `tsconfig.json` (NEW)
- `biome.json` (NEW)
- `vitest.config.ts` (NEW)
- `packages/core/package.json` (NEW)
- `packages/core/tsconfig.json` (NEW)
- `packages/core/tsconfig.build.json` (NEW)
- `packages/core/src/index.ts` (NEW)
- `packages/core/test/package-contract.test.ts` (NEW)
- `packages/cli/package.json` (NEW)
- `packages/cli/tsconfig.json` (NEW)
- `packages/cli/src/index.ts` (NEW)
- `packages/cli/src/program.ts` (NEW)
- `packages/cli/test/cli-shell.test.ts` (NEW)

**Verification:** `bun install --frozen-lockfile`, `bun run build`, `bun run typecheck`, `bun run test`, and `bun run check` all exit 0; `node packages/cli/dist/index.js --help` prints `antmay` and exactly the `spawn`, `status`, and `attach` commands; `node -e 'const p=require("./packages/cli/package.json"); if(p.bin.antmay!=="./dist/index.js"||p.engines.node!==">=20") process.exit(1)'` exits 0.

**Acceptance criteria:**
- The repository is a Bun workspace containing `packages/core` and `packages/cli` with strict shared TypeScript ESM settings.
- All six required root scripts exist and execute successfully.
- The built Node 20+ package exposes the `antmay` binary and only the three public commands.
- The worker is not exposed as a public command.
- Generated dependencies and build products remain untracked.

**Consumes:** none

**Produces:** root Bun workspace gates; `@antmay/core` package shell; `antmay` executable shell and typed `createProgram()`.
