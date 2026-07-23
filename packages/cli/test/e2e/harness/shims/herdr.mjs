#!/usr/bin/env node
// Scripted herdr executable. This is NOT an in-product fake mode: it is a
// standalone Node program pointed at by `ANTMAY_HERDR_BIN`, exercising the exact
// external process boundary the real herdr adapter drives. It emulates the real
// herdr CLI verbs the adapter calls (`pane split`, `pane rename`, `pane run`,
// `wait agent-status`, `pane get`, `pane list`, `terminal attach`), persists
// controllable pane state on disk under `ANTMAY_SHIM_DIR`, keeps pane and
// terminal identifiers distinct like real herdr, and actually launches the
// harness command submitted through `pane run` so the scripted Claude/Codex
// shims write their transcripts.
//
// All state lives under `ANTMAY_SHIM_DIR`:
//   control.json         optional case-authored control knobs
//   counter              monotonic pane-id counter
//   panes/<id>.json      one record per created pane
//   events.jsonl         append-only log of every verb the adapter invoked
//
// Control knobs (control.json, all optional):
//   paneAlive    boolean liveness of freshly split panes (default true)
//   failOn       string  force one verb to fail: split|launch|submit|wait|
//                        get|attach|list|rename
//   paneIdPrefix string  pane-id prefix (default "w0:p")

import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const shimDir = process.env.ANTMAY_SHIM_DIR;
if (shimDir === undefined || shimDir.length === 0) {
  process.stderr.write("herdr shim: ANTMAY_SHIM_DIR is not set.\n");
  process.exit(2);
}

const panesDir = join(shimDir, "panes");
const eventsFile = join(shimDir, "events.jsonl");
const counterFile = join(shimDir, "counter");

function readControl() {
  const file = join(shimDir, "control.json");
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function recordEvent(op, args) {
  appendFileSync(
    eventsFile,
    `${JSON.stringify({ op, args, at: Date.now() })}\n`,
    "utf8",
  );
}

function nextPaneId(prefix) {
  let n = 0;
  if (existsSync(counterFile)) {
    n = Number.parseInt(readFileSync(counterFile, "utf8"), 10) || 0;
  }
  writeFileSync(counterFile, String(n + 1), "utf8");
  return `${prefix}${n}`;
}

function paneFile(id) {
  return join(panesDir, `${encodeURIComponent(id)}.json`);
}

function loadPane(id) {
  const file = paneFile(id);
  if (!existsSync(file)) return undefined;
  return JSON.parse(readFileSync(file, "utf8"));
}

function savePane(pane) {
  writeFileSync(paneFile(pane.id), JSON.stringify(pane, null, 2), "utf8");
}

function paneForTerminal(id) {
  if (!existsSync(panesDir)) return undefined;
  for (const name of readdirSync(panesDir)) {
    if (!name.endsWith(".json")) continue;
    const pane = JSON.parse(readFileSync(join(panesDir, name), "utf8"));
    if (pane.terminalId === id) return pane;
  }
  return undefined;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function isExecutableFile(token) {
  try {
    return statSync(token).isFile();
  } catch {
    return false;
  }
}

function valueOfFlag(rest, flag) {
  const index = rest.indexOf(flag);
  return index >= 0 ? rest[index + 1] : undefined;
}

function collectEnv(rest) {
  const env = {};
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === "--env" && rest[i + 1] !== undefined) {
      const eq = rest[i + 1].indexOf("=");
      if (eq > 0) env[rest[i + 1].slice(0, eq)] = rest[i + 1].slice(eq + 1);
    }
  }
  return env;
}

function listAlivePanes() {
  if (!existsSync(panesDir)) return [];
  const out = [];
  for (const name of readdirSync(panesDir)) {
    if (!name.endsWith(".json")) continue;
    const pane = JSON.parse(readFileSync(join(panesDir, name), "utf8"));
    if (pane.alive === true) out.push({ pane_id: pane.id });
  }
  return out;
}

// Launch the harness command submitted through `pane run`, exactly as real herdr
// runs the typed command in the pane. The first whitespace token is the harness
// executable; a real file is executed (so the Claude/Codex shim writes its
// transcript), while a non-file first token (the `/skill` prompt turn) is only
// recorded.
function launchHarness(text, pane) {
  const tokens = text.split(/\s+/).filter((t) => t.length > 0);
  const [program, ...args] = tokens;
  if (program === undefined || !isExecutableFile(program)) return;
  spawnSync(process.execPath, [program, ...args], {
    stdio: "ignore",
    env: { ...process.env, ...(pane.env ?? {}) },
  });
}

function main() {
  mkdirSync(panesDir, { recursive: true });
  const control = readControl();
  const argv = process.argv.slice(2);
  const [group, verb, ...rest] = argv;

  if (group === "pane" && verb === "split") {
    recordEvent("split", rest);
    if (control.failOn === "split") fail("herdr: pane split refused by shim.");
    const id = nextPaneId(control.paneIdPrefix ?? "w0:p");
    const terminalId = `term_${id.replace(/[^a-zA-Z0-9]/g, "_")}`;
    savePane({
      id,
      terminalId,
      alive: control.paneAlive !== false,
      cwd: valueOfFlag(rest, "--cwd") ?? null,
      env: collectEnv(rest),
      launchCount: 0,
      runs: [],
    });
    process.stdout.write(
      `${JSON.stringify({ result: { pane: { pane_id: id, terminal_id: terminalId } } })}\n`,
    );
    return;
  }

  if (group === "pane" && verb === "rename") {
    const [id, label] = rest;
    recordEvent("rename", { id, label });
    if (control.failOn === "rename") fail("herdr: pane rename refused by shim.");
    const pane = loadPane(id);
    if (pane === undefined) fail(`herdr: no pane ${id}.`);
    pane.label = label;
    savePane(pane);
    return;
  }

  if (group === "pane" && verb === "run") {
    const [id, text] = rest;
    const pane = loadPane(id);
    if (pane === undefined) fail(`herdr: no pane ${id}.`);
    pane.launchCount += 1;
    pane.runs.push(text);
    savePane(pane);
    const isLaunch = pane.launchCount === 1;
    recordEvent(isLaunch ? "launch" : "submit", { id, text });
    if (isLaunch && control.failOn === "launch") {
      fail(`herdr: harness launch refused by shim in pane ${id}.`);
    }
    if (!isLaunch && control.failOn === "submit") {
      fail(`herdr: initial submit refused by shim in pane ${id}.`);
    }
    if (isLaunch) launchHarness(text, pane);
    return;
  }

  if (group === "wait" && verb === "agent-status") {
    const [id] = rest;
    recordEvent("wait", rest);
    if (control.failOn === "wait") fail(`herdr: pane ${id} never reached idle.`);
    return;
  }

  if (group === "pane" && verb === "get") {
    const [id] = rest;
    recordEvent("get", { id });
    if (control.failOn === "get") fail("herdr: pane get refused by shim.");
    const pane = loadPane(id);
    if (pane === undefined || pane.alive !== true) {
      fail(`herdr: pane ${id} is not alive.`);
    }
    process.stdout.write(
      `${JSON.stringify({ result: { pane: { pane_id: id, terminal_id: pane.terminalId } } })}\n`,
    );
    return;
  }

  if (group === "pane" && verb === "list") {
    recordEvent("list", {});
    if (control.failOn === "list") fail("herdr: pane list refused by shim.");
    process.stdout.write(
      `${JSON.stringify({ result: { panes: listAlivePanes() } })}\n`,
    );
    return;
  }

  if (group === "terminal" && verb === "attach") {
    const [id] = rest;
    if (control.failOn === "attach") fail("herdr: attach refused by shim.");
    const pane = paneForTerminal(id);
    if (pane === undefined || pane.alive !== true) {
      fail(`herdr: terminal ${id} is not attachable.`);
    }
    recordEvent("attach", { id, paneId: pane.id });
    return;
  }

  fail(`herdr shim: unsupported invocation ${argv.join(" ")}`);
}

main();
