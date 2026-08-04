/**
 * What the production source tree says, read once.
 *
 * The instrumenter, the renderer, and the trace driver each need an answer
 * about `src/`: which functions have a replaceable binding, which hold a
 * function but do not, and which module imports which. One TypeScript pass
 * answers all three, so no consumer rediscovers the tree with a matcher of its
 * own that can drift from this one.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const CLI_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
export const SRC_ROOT = path.join(CLI_ROOT, "src");

/** Production modules only: the harness fakes and test files never ship. */
function collect(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__snapshots__" || entry.name === "test-helpers") continue;
      collect(absolute, found);
      continue;
    }
    if (!entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts")) continue;
    found.push(absolute);
  }
  return found;
}

let modules;

/**
 * Every production module, parsed. `relative` is the POSIX module id the trace
 * records a call under, so a name here and a name in a trace compare directly.
 */
export function productionModules() {
  modules ??= collect(SRC_ROOT)
    .sort((left, right) => left.localeCompare(right))
    .map((absolute) => {
      const text = readFileSync(absolute, "utf8");
      return {
        absolute,
        relative: path.relative(SRC_ROOT, absolute).split(path.sep).join("/"),
        text,
        sourceFile: ts.createSourceFile(
          absolute,
          text,
          ts.ScriptTarget.ES2022,
          true,
          ts.ScriptKind.TS,
        ),
      };
    });
  return modules;
}

/** The property name a member is written under, without its quotes. */
function memberName(name) {
  if (name === undefined) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  if (ts.isPrivateIdentifier(name)) return name.text;
  return null;
}

/** Whether the node holds a function value rather than describing one. */
function holdsFunction(node) {
  return node !== undefined && (ts.isArrowFunction(node) || ts.isFunctionExpression(node));
}

/**
 * Every function a statement makes reachable by name without declaring it, as
 * `owner.member` for a member and a bare name for a `const`.
 *
 * A constructor is omitted: `new X(…)` records nothing either way, and the name
 * a reader would look for in a trace is the class, not `X.constructor`.
 */
function unreachableBindings(statement) {
  if (ts.isClassDeclaration(statement)) {
    const owner = statement.name?.text;
    if (owner === undefined) return [];
    return statement.members
      .filter(
        (member) =>
          ts.isMethodDeclaration(member) ||
          ts.isGetAccessor(member) ||
          ts.isSetAccessor(member),
      )
      .flatMap((member) => {
        const name = memberName(member.name);
        return name === null ? [] : [`${owner}.${name}`];
      });
  }
  if (!ts.isVariableStatement(statement)) return [];
  const found = [];
  for (const declaration of statement.declarationList.declarations) {
    if (!ts.isIdentifier(declaration.name)) continue;
    const owner = declaration.name.text;
    const initializer = declaration.initializer;
    if (holdsFunction(initializer)) {
      found.push(owner);
      continue;
    }
    if (initializer === undefined || !ts.isObjectLiteralExpression(initializer)) {
      continue;
    }
    for (const property of initializer.properties) {
      const holds =
        ts.isMethodDeclaration(property) ||
        (ts.isPropertyAssignment(property) && holdsFunction(property.initializer));
      if (!holds) continue;
      const name = memberName(property.name);
      if (name !== null) found.push(`${owner}.${name}`);
    }
  }
  return found;
}

/**
 * The functions a trace can see and the functions it cannot.
 *
 * A top-level function declaration has a writable binding, so replacing it wraps
 * every later reference. Every other way a module makes a function reachable —
 * a `const` holding one, a class method or accessor, a method on a module-scope
 * object literal — has no binding to replace, so it is reported rather than
 * silently absent. A function nested inside another is invisible for the same
 * reason and is not reported, having no module-level name to be looked for
 * under.
 */
export function scanFunctions() {
  const perModule = new Map();
  const declared = [];
  const uninstrumented = [];

  for (const module of productionModules()) {
    const names = [];
    for (const statement of module.sourceFile.statements) {
      if (ts.isFunctionDeclaration(statement) && statement.body && statement.name) {
        names.push(statement.name.text);
        continue;
      }
      for (const name of unreachableBindings(statement)) {
        uninstrumented.push(`${module.relative} · ${name}`);
      }
    }
    perModule.set(module.relative, names);
    for (const name of names) declared.push(`${module.relative} · ${name}`);
  }

  const byName = (left, right) => left.localeCompare(right);
  return {
    perModule,
    declared: declared.sort(byName),
    uninstrumented: uninstrumented.sort(byName),
  };
}

let edges;

/**
 * Every import between two production modules, as `caller → callee`.
 *
 * This is what the source declares, against which a recorded call can be read:
 * a call crossing a pair that is absent here was made through a value the
 * callee's module was handed, not through a dependency it took.
 */
export function importEdges() {
  edges ??= (() => {
    const found = new Set();
    for (const module of productionModules()) {
      for (const specifier of runtimeSpecifiers(module.sourceFile)) {
        const target = resolveTarget(module.relative, specifier);
        if (target !== null) found.add(`${module.relative} → ${target}`);
      }
    }
    return found;
  })();
  return edges;
}

/**
 * Every specifier the module loads at runtime. `verbatimModuleSyntax` keeps an
 * import statement that survives type erasure, so only an explicitly type-only
 * form loads nothing and is skipped.
 */
function runtimeSpecifiers(sourceFile) {
  const specifiers = [];
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (statement.importClause?.isTypeOnly === true) continue;
      specifiers.push(statement.moduleSpecifier);
      continue;
    }
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined) {
      if (statement.isTypeOnly) continue;
      specifiers.push(statement.moduleSpecifier);
    }
  }

  // A dynamic import can sit anywhere, and the executor's lazy dispatch is
  // built out of them, so the whole tree is walked for those.
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0
    ) {
      specifiers.push(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return specifiers.filter(ts.isStringLiteralLike).map((node) => node.text);
}

/** The module a relative specifier names, or `null` for a package or builtin. */
function resolveTarget(from, specifier) {
  if (!specifier.startsWith(".")) return null;
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(from), specifier),
  );
  return resolved.replace(/\.js$/, ".ts");
}
