#!/usr/bin/env node
// Scripted Codex executable, pointed at by `ANTMAY_CODEX_BIN`. herdr's scripted
// `pane run` launches it exactly as real herdr launches the real harness. Codex
// pins no session id, so this program writes a discoverable rollout under
// `<ANTMAY_CODEX_SESSION_ROOT>/rollout-<ts>.jsonl` recording the canonical cwd
// (matching the run's recorded repository) and a start timestamp; its terminal
// content is controlled by `control.json` (`codexOutcome`).
//
//   codexOutcome: pending | done | blocked | refused   (default pending)

import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const sessionRoot = process.env.ANTMAY_CODEX_SESSION_ROOT;
const shimDir = process.env.ANTMAY_SHIM_DIR;

function control() {
  if (shimDir === undefined) return {};
  const file = join(shimDir, "control.json");
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

if (sessionRoot !== undefined) {
  mkdirSync(sessionRoot, { recursive: true });
  const cwd = realpathSync.native(process.cwd());
  const now = new Date().toISOString();
  const outcome = control().codexOutcome ?? "pending";
  const lines = [
    {
      type: "session_meta",
      timestamp: now,
      payload: { cwd, id: "scripted-codex-session" },
    },
    {
      type: "turn_context",
      timestamp: now,
      payload: { cwd },
    },
  ];
  if (outcome !== "pending") {
    const label = outcome.toUpperCase();
    lines.push({
      type: "event_msg",
      timestamp: now,
      payload: {
        type: "task_complete",
        last_agent_message: `Outcome: ${label} — scripted ${label} outcome`,
      },
    });
  }
  writeFileSync(
    join(sessionRoot, `rollout-${Date.now()}.jsonl`),
    `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`,
    "utf8",
  );
}

process.exit(0);
