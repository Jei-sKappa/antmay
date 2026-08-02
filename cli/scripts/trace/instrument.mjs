#!/usr/bin/env node

/**
 * Builds a call-traced copy of the CLI.
 *
 * A top-level `function` declaration's binding is writable, so instrumentation
 * needs no rewriting of any function body: for each module the transform
 * appends one line per declared function that replaces the binding with a
 * wrapper. Declarations hoist, so the block is injected directly after the
 * imports and every later reference — a cross-module call, an internal call, a
 * recursive call, a callback handed to a collaborator — reaches the wrapper.
 *
 * The instrumented tree is written to `.trace/src/` and bundled to
 * `dist-trace/main.js`, which behaves exactly like `dist/main.js` unless
 * `ANTMAY_TRACE_DIR` is set in the environment.
 */

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { CLI_ROOT, SRC_ROOT, productionModules, scanFunctions } from "./sources.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TRACE_ROOT = path.join(CLI_ROOT, ".trace");
const TRACE_SRC = path.join(TRACE_ROOT, "src");
const OUT_DIR = path.join(CLI_ROOT, "dist-trace");
const RUNTIME_BASENAME = "__antmay-trace";

/** Whether evaluating the statement runs code, rather than only declaring types. */
function executes(statement) {
  return !(
    ts.isImportDeclaration(statement) ||
    ts.isExportDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isFunctionDeclaration(statement)
  );
}

/**
 * The offset just past the last import statement — where the wrapper block can
 * sit and still precede all executable top-level code.
 *
 * Code placed before that point would run against unwrapped bindings and vanish
 * from the trace with no sign, so a module that interleaves an import with
 * executable code is refused rather than half-instrumented.
 */
function insertionPoint(module) {
  let insertAt = 0;
  let firstExecuting;
  for (const statement of module.sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (firstExecuting !== undefined) {
        const line =
          module.sourceFile.getLineAndCharacterOfPosition(firstExecuting).line + 1;
        throw new Error(
          `${module.relative} runs code at line ${line}, before its last import. ` +
            "Move every import above it: the wrapper block cannot precede that " +
            "code, so anything it calls would go untraced.",
        );
      }
      insertAt = statement.end;
      continue;
    }
    if (firstExecuting === undefined && executes(statement)) {
      firstExecuting = statement.getStart(module.sourceFile);
    }
  }
  return insertAt;
}

function instrument(module, names) {
  if (names.length === 0) return module.text;

  const runtimeSpecifier = toSpecifier(
    path.relative(
      path.dirname(module.absolute),
      path.join(SRC_ROOT, `${RUNTIME_BASENAME}.js`),
    ),
  );
  const moduleId = JSON.stringify(module.relative);
  const block = [
    "",
    "",
    `import { __traceWrap } from ${JSON.stringify(runtimeSpecifier)};`,
    ...names.map(
      (name) => `${name} = __traceWrap(${moduleId}, ${JSON.stringify(name)}, ${name});`,
    ),
    "",
  ].join("\n");

  const insertAt = insertionPoint(module);
  return `${module.text.slice(0, insertAt)}${block}${module.text.slice(insertAt)}`;
}

/** A relative path as an ESM specifier: POSIX separators, explicitly relative. */
function toSpecifier(relativePath) {
  const posix = relativePath.split(path.sep).join("/");
  return posix.startsWith(".") ? posix : `./${posix}`;
}

function writeInstrumentedTree() {
  rmSync(TRACE_ROOT, { recursive: true, force: true });
  const { perModule } = scanFunctions();
  const modules = productionModules();
  let wrapped = 0;
  for (const module of modules) {
    const names = perModule.get(module.relative) ?? [];
    const destination = path.join(TRACE_SRC, module.relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, instrument(module, names));
    wrapped += names.length;
  }
  cpSync(
    path.join(SCRIPT_DIR, "runtime.ts"),
    path.join(TRACE_SRC, `${RUNTIME_BASENAME}.ts`),
  );
  return { modules: modules.length, wrapped };
}

export function buildTracedCli({ quiet = false } = {}) {
  const { modules, wrapped } = writeInstrumentedTree();
  const build = spawnSync(
    "npx",
    [
      "tsup",
      path.relative(CLI_ROOT, path.join(TRACE_SRC, "main.ts")),
      "--config",
      "false",
      "--format",
      "esm",
      "--target",
      "node22",
      "--out-dir",
      path.relative(CLI_ROOT, OUT_DIR),
      "--clean",
      "--silent",
    ],
    { cwd: CLI_ROOT, encoding: "utf8", stdio: quiet ? "pipe" : "inherit" },
  );
  if (build.status !== 0) {
    throw new Error(
      `Instrumented build failed (exit ${build.status}).${
        build.stderr ? `\n${build.stderr}` : ""
      }`,
    );
  }
  return { modules, wrapped, binary: path.join(OUT_DIR, "main.js") };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { modules, wrapped, binary } = buildTracedCli();
    console.log(`Instrumented ${wrapped} functions across ${modules} modules.`);
    console.log(`Traced binary: ${binary}`);
  } catch (error) {
    console.error(error.message ?? error);
    process.exitCode = 1;
  }
}
