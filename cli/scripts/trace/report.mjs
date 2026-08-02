#!/usr/bin/env node

/**
 * Renders the JSONL a traced run emits into something readable: the call tree
 * each process produced, and the module-level summaries that answer "what talks
 * to what" without reading every frame.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { importEdges } from "./sources.mjs";

/** One process's frames, parented as they were actually called. */
function readProcess(file) {
  const frames = new Map();
  const roots = [];
  let header;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (line === "") continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      // The last line of a process killed mid-write can be truncated.
      continue;
    }
    if (event.e === "proc") {
      header ??= event;
      continue;
    }
    if (event.e === ">") {
      const frame = {
        id: event.id,
        module: event.m,
        name: event.n,
        enteredAt: event.t,
        children: [],
      };
      frames.set(event.id, frame);
      const parent = frames.get(event.p);
      if (parent === undefined) roots.push(frame);
      else parent.children.push(frame);
      continue;
    }
    const frame = frames.get(event.id);
    if (frame === undefined) continue;
    // A throw completes the frame too, abnormally; only a frame with neither
    // event is one the process never left.
    if (event.e === "!") {
      frame.threw = event.x;
      frame.exitedAt = event.t;
    } else if (event.e === "<") {
      frame.exitedAt = event.t;
      frame.suspended = event.a === 1;
    }
  }
  return { header, roots, total: frames.size };
}

/**
 * A structural fingerprint per frame, so a loop that calls the same thing
 * thirty times renders as one subtree with a count instead of thirty copies.
 * Fingerprints are interned to keep the strings bounded by fan-out.
 */
function fingerprint(roots) {
  const ids = new Map();
  const of = (frame) => {
    const key = `${frame.module}:${frame.name}(${frame.children.map(of).join(",")})`;
    let id = ids.get(key);
    if (id === undefined) {
      id = ids.size + 1;
      ids.set(key, id);
    }
    frame.shape = id;
    return id;
  };
  for (const root of roots) of(root);
}

function groupSiblings(frames) {
  const groups = [];
  for (const frame of frames) {
    const last = groups.at(-1);
    if (last !== undefined && last.frame.shape === frame.shape) {
      last.count += 1;
      continue;
    }
    groups.push({ frame, count: 1 });
  }
  return groups;
}

function renderTree(roots, { maxDepth }) {
  const lines = [];
  const walk = (frames, prefix, depth) => {
    const groups = groupSiblings(frames);
    groups.forEach((group, index) => {
      const last = index === groups.length - 1;
      const { frame, count } = group;
      const marks = [
        count > 1 ? `×${count}` : undefined,
        frame.threw !== undefined ? `throws ${frame.threw}` : undefined,
        frame.exitedAt === undefined ? "never returned" : undefined,
        frame.suspended === true ? "async" : undefined,
      ].filter((mark) => mark !== undefined);
      lines.push(
        `${prefix}${last ? "└─ " : "├─ "}${frame.module} · ${frame.name}${
          marks.length > 0 ? `  [${marks.join(", ")}]` : ""
        }`,
      );
      const childPrefix = `${prefix}${last ? "   " : "│  "}`;
      if (frame.children.length === 0) return;
      if (maxDepth !== undefined && depth + 1 >= maxDepth) {
        // Grouped frames share a fingerprint, so every one of them elides the
        // same subtree and the count is exact.
        const elided = (countSubtree(frame) - 1) * count;
        lines.push(`${childPrefix}└─ … ${elided} deeper calls`);
        return;
      }
      walk(frame.children, childPrefix, depth + 1);
    });
  };
  walk(roots, "", 0);
  return lines;
}

function countSubtree(frame) {
  return 1 + frame.children.reduce((sum, child) => sum + countSubtree(child), 0);
}

function summarize(roots) {
  const perFunction = new Map();
  const edges = new Map();
  const moduleOrder = [];
  const seenModules = new Set();

  const walk = (frame, callerModule) => {
    if (!seenModules.has(frame.module)) {
      seenModules.add(frame.module);
      moduleOrder.push(frame.module);
    }
    const key = `${frame.module} · ${frame.name}`;
    perFunction.set(key, (perFunction.get(key) ?? 0) + 1);
    if (callerModule !== undefined && callerModule !== frame.module) {
      const edge = `${callerModule} → ${frame.module}`;
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
    for (const child of frame.children) walk(child, frame.module);
  };
  for (const root of roots) walk(root, undefined);

  return { perFunction, edges, moduleOrder };
}

function section(title) {
  return [`\n${title}`, "─".repeat(title.length)];
}

/**
 * What the edge table is, said where it is read. A recorded edge names the two
 * modules a call crossed, which is not the same question as what a module
 * depends on: only a top-level function declaration carries a wrapper, so a
 * closure a module hands to a collaborator is invisible and the calls it makes
 * are recorded against the collaborator that invoked it.
 */
export const EDGE_PREAMBLE = [
  "Call sites, not dependencies: a callback runs under whoever invoked it.",
  "⤴ marks an edge the calling module does not import.",
];

/** Edge counts, heaviest first, with every non-imported edge marked. */
export function edgeLines(counts, countWidth) {
  const imports = importEdges();
  const entries = [...counts].sort((a, b) => b[1] - a[1]);
  const width = Math.max(0, ...entries.map(([edge]) => edge.length));
  return entries.map(([edge, count]) => {
    const line = `${String(count).padStart(countWidth)}  ${edge}`;
    if (imports.has(edge)) return line;
    return `${line.padEnd(countWidth + 2 + width)}  ⤴`;
  });
}

function renderProcess(file, options) {
  const { header, roots, total } = readProcess(file);
  fingerprint(roots);
  const { perFunction, edges, moduleOrder } = summarize(roots);
  const lines = [];

  lines.push("=".repeat(78));
  lines.push(
    `PROCESS ${path.basename(file)}${
      header === undefined ? "" : `  ·  antmay ${header.argv.join(" ")}`
    }`,
  );
  lines.push(`${total} calls · ${perFunction.size} distinct functions · ${moduleOrder.length} modules`);
  lines.push("=".repeat(78));

  lines.push(...section("CALL TREE"));
  lines.push(...renderTree(roots, options));

  lines.push(...section("MODULES, IN ORDER OF FIRST CALL"));
  moduleOrder.forEach((module, index) => {
    lines.push(`${String(index + 1).padStart(3)}. ${module}`);
  });

  lines.push(...section("CROSS-MODULE CALLS"));
  lines.push(...EDGE_PREAMBLE, "");
  lines.push(...edgeLines(edges, 5));

  lines.push(...section("CALLS PER FUNCTION"));
  for (const [name, count] of [...perFunction].sort((a, b) => b[1] - a[1])) {
    lines.push(`${String(count).padStart(5)}  ${name}`);
  }

  return { lines, total, functions: perFunction, modules: moduleOrder, edges };
}

export function renderTraceDirectory(directory, options = {}) {
  const files = readdirSync(directory)
    .filter((name) => name.startsWith("trace-") && name.endsWith(".jsonl"))
    .map((name) => path.join(directory, name))
    .sort((left, right) => statTime(left) - statTime(right));
  const rendered = files.map((file) => renderProcess(file, options));
  return {
    text: rendered.flatMap((entry) => entry.lines).join("\n"),
    processes: rendered.length,
    calls: rendered.reduce((sum, entry) => sum + entry.total, 0),
    functions: mergeCounts(rendered.map((entry) => entry.functions)),
    edges: mergeCounts(rendered.map((entry) => entry.edges)),
  };
}

function mergeCounts(maps) {
  const merged = new Map();
  for (const map of maps) {
    for (const [key, count] of map) merged.set(key, (merged.get(key) ?? 0) + count);
  }
  return merged;
}

// A file is created by its process's first flush. The demo invokes the CLI one
// process at a time, so that order is the order the scenario ran them in.
function statTime(file) {
  return statSync(file).birthtimeMs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2];
  if (directory === undefined) {
    console.error("Usage: node scripts/trace/report.mjs <trace-dir> [--depth <n>]");
    process.exitCode = 1;
  } else {
    const depthIndex = process.argv.indexOf("--depth");
    const maxDepth =
      depthIndex === -1 ? undefined : Number.parseInt(process.argv[depthIndex + 1], 10);
    console.log(renderTraceDirectory(directory, { maxDepth }).text);
  }
}
