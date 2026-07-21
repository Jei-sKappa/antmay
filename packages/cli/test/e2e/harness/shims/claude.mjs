#!/usr/bin/env node
// Scripted Claude Code executable, pointed at by `ANTMAY_CLAUDE_BIN`. herdr's
// scripted `pane run` launches it exactly as real herdr launches the real
// harness, so this program exercises the real launch boundary rather than an
// in-product fake. It reads the pinned `--session-id`, then writes a Claude
// transcript at `<ANTMAY_CLAUDE_TRANSCRIPT_ROOT>/<session-id>.jsonl` whose
// terminal content is controlled by `control.json` (`claudeOutcome`), so
// downstream observation reads a genuine on-disk transcript.
//
//   claudeOutcome: pending | done | blocked | refused   (default pending)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const sessionIndex = argv.indexOf("--session-id");
const sessionId = sessionIndex >= 0 ? argv[sessionIndex + 1] : undefined;
const transcriptRoot = process.env.ANTMAY_CLAUDE_TRANSCRIPT_ROOT;
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

if (sessionId !== undefined && transcriptRoot !== undefined) {
  mkdirSync(transcriptRoot, { recursive: true });
  const outcome = control().claudeOutcome ?? "pending";
  const lines = [
    {
      type: "user",
      sessionId,
      uuid: "u1",
      message: { role: "user", content: "begin the skill run" },
    },
    {
      type: "assistant",
      sessionId,
      uuid: "a1",
      parentUuid: "u1",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "Starting the requested work." }],
      },
    },
  ];
  if (outcome !== "pending") {
    const label = outcome.toUpperCase();
    lines.push({
      type: "assistant",
      sessionId,
      uuid: "a2",
      parentUuid: "a1",
      message: {
        role: "assistant",
        content: [
          {
            type: "text",
            text: `Work complete.\nOutcome: ${label} — scripted ${label} outcome`,
          },
        ],
      },
    });
  }
  writeFileSync(
    join(transcriptRoot, `${sessionId}.jsonl`),
    `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`,
    "utf8",
  );
}

process.exit(0);
