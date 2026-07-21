// Named structural assertions for the architecture-review acceptance criteria of
// FR-9 (optionality) and FR-10 (extensible core and adapter architecture). These
// are proven by inspecting the source tree and the mode-agnostic core contracts
// rather than by a real-CLI declarative case; the traceability gate in
// `test/e2e/harness.test/requirements.test.ts` enforces that each of these
// criteria is named here (or in a sibling structural file) and never claimed by
// a case.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  type Adapter,
  ANTMAY_SKILL_CATALOG,
  type AttachmentHandle,
  applyTerminalOutcome,
  asAttachmentHandle,
  asRepositoryPath,
  asRunId,
  asThreadPath,
  projectStatusDocument,
  type RunRecord,
  reconcileEvidence,
  repositoryScope,
  transcriptTerminalOutcome,
} from "@antmay/core";
import { describe, expect, it } from "vitest";
import type {
  ExecutionAdapter,
  LivenessResult,
  ReadResult,
  SpawnedSession,
  SpawnSpec,
} from "../src/adapters/types";

const workspaceRoot = path.resolve(import.meta.dirname, "../../..");
const coreSrc = path.join(workspaceRoot, "packages/core/src");
const cliSrc = path.join(workspaceRoot, "packages/cli/src");
const skillsRoot = path.join(workspaceRoot, "skills");

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...tsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

// Strip block and line comments so a documentation mention of a forbidden concept
// does not masquerade as a type or identifier in the code itself.
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function firstSkillMd(dir: string): string | null {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === "SKILL.md") {
      return full;
    }
    if (entry.isDirectory()) {
      const found = firstSkillMd(full);
      if (found !== null) return found;
    }
  }
  return null;
}

function activeRecord(): RunRecord {
  return {
    id: asRunId("run-1"),
    repositoryPath: asRepositoryPath("/repo"),
    threadPath: asThreadPath("/repo/docs/threads/t"),
    skill: "propose",
    harness: "claude",
    adapter: "herdr",
    session: { kind: "pinned", id: "s-1" },
    attachment: { available: true, handle: asAttachmentHandle("w0:p0") },
    classification: "active",
    reason: null,
    workerHealth: { state: "healthy", detail: null },
  };
}

describe("architecture boundaries (FR-10)", () => {
  it("ANTMAY-FR-0010.AC-1001: core carries no pane/multiplexer type", () => {
    for (const file of tsFiles(coreSrc)) {
      const code = stripComments(readFileSync(file, "utf8"));
      expect(/\bpane\b/i.test(code), `${file} references pane`).toBe(false);
      expect(
        /\bmultiplexer\b/i.test(code),
        `${file} references multiplexer`,
      ).toBe(false);
      expect(/\btmux\b/i.test(code), `${file} references tmux`).toBe(false);
    }
  });

  it("ANTMAY-FR-0010.AC-1002: a second adapter needs only the ExecutionAdapter surface", () => {
    // A minimal in-memory adapter implementing exactly the six-operation surface
    // compiles and constructs without any core detection/classification type.
    class MemoryAdapter implements ExecutionAdapter {
      readonly name: Adapter = "herdr";
      private readonly log: string[] = [];
      spawn(spec: SpawnSpec): SpawnedSession {
        this.log.push(`spawn:${spec.cwd}`);
        return { handle: asAttachmentHandle("mem:0") };
      }
      send(handle: AttachmentHandle, input: string): void {
        this.log.push(`send:${handle}:${input}`);
      }
      read(handle: AttachmentHandle): ReadResult {
        return { output: `read:${handle}` };
      }
      liveness(handle: AttachmentHandle): LivenessResult {
        return { alive: this.log.length >= 0 && handle.length > 0 };
      }
      enumerate(): readonly AttachmentHandle[] {
        return [asAttachmentHandle("mem:0")];
      }
      attach(handle: AttachmentHandle): void {
        this.log.push(`attach:${handle}`);
      }
    }
    const adapter: ExecutionAdapter = new MemoryAdapter();
    expect(adapter.name).toBe("herdr");
    const session = adapter.spawn({
      command: "claude",
      args: [],
      cwd: "/repo",
      env: {},
      initialInput: "/propose",
    });
    expect(adapter.liveness(session.handle).alive).toBe(true);
    // Core files never import an adapter or pane surface.
    for (const file of tsFiles(coreSrc)) {
      const text = readFileSync(file, "utf8");
      expect(text.includes("adapters/types"), `${file}`).toBe(false);
      expect(text.includes("ExecutionAdapter"), `${file}`).toBe(false);
    }
  });

  it("ANTMAY-FR-0010.AC-1003: terminal transitions are idempotent, detector-neutral core records", () => {
    const outcome = transcriptTerminalOutcome("done", "finished the work");
    const first = applyTerminalOutcome(activeRecord(), outcome);
    expect(first.changed).toBe(true);
    expect(first.record.classification).toBe("done");
    const second = applyTerminalOutcome(first.record, outcome);
    expect(second.changed).toBe(false);
    expect(second.record.reason).toBe("finished the work");
    // The reconciliation decision reasons only over abstract signals — no pane or
    // multiplexer type reaches it — so any future provider can feed the signal.
    const decision = reconcileEvidence({
      transcript: { kind: "final", outcome },
      liveness: { kind: "alive" },
    });
    expect(decision.action).toBe("terminalize");
  });

  it("ANTMAY-FR-0010.AC-1004: new detection providers and remote wrap the existing contracts", () => {
    // A launch-output/unspawned-session provider only needs to produce the same
    // abstract transcript signal; positive endpoint end still yields unknown
    // without any pane concept.
    const decision = reconcileEvidence({
      transcript: { kind: "none" },
      liveness: { kind: "ended" },
    });
    expect(decision.action).toBe("terminalize");
    // The status document contract is self-contained (federation-ready) and
    // stable at schema version 1, so remote execution can wrap it unchanged.
    const document = projectStatusDocument({
      scope: repositoryScope("/repo"),
      runs: [],
      attention: [],
    });
    expect(document.schemaVersion).toBe(1);
    expect(document.scope.mode).toBe("repository");
  });
});

describe("optionality and absence (FR-9)", () => {
  it("ANTMAY-FR-0009.AC-0903: no hook, daemon, completion, or install lifecycle is required", () => {
    for (const rel of [
      "package.json",
      "packages/cli/package.json",
      "packages/core/package.json",
    ]) {
      const pkg = JSON.parse(
        readFileSync(path.join(workspaceRoot, rel), "utf8"),
      ) as { scripts?: Record<string, string>; bin?: Record<string, string> };
      for (const lifecycle of [
        "postinstall",
        "preinstall",
        "install",
        "prepare",
        "prepublish",
      ]) {
        expect(pkg.scripts?.[lifecycle], `${rel} ${lifecycle}`).toBeUndefined();
      }
    }
    const cliPkg = JSON.parse(
      readFileSync(
        path.join(workspaceRoot, "packages/cli/package.json"),
        "utf8",
      ),
    ) as { bin?: Record<string, string> };
    expect(Object.keys(cliPkg.bin ?? {})).toEqual(["antmay"]);
    // No source path installs a harness/git hook or a shell completion.
    for (const file of tsFiles(cliSrc)) {
      const text = readFileSync(file, "utf8");
      for (const marker of [
        ".git/hooks",
        "installHook",
        "shell-completion",
        "tabtab",
      ]) {
        expect(text.includes(marker), `${file} contains ${marker}`).toBe(false);
      }
    }
  });

  it("ANTMAY-FR-0009.AC-0904: workflow skills stay plain and usable with no antmay coupling", () => {
    expect(existsSync(skillsRoot)).toBe(true);
    const skillMd = firstSkillMd(skillsRoot);
    expect(skillMd).not.toBeNull();
    const raw = readFileSync(skillMd ?? "", "utf8");
    const match = /^---\n([\s\S]*?)\n---/.exec(raw);
    expect(match, "SKILL.md has YAML frontmatter").not.toBeNull();
    const frontmatter = match?.[1] ?? "";
    expect(/^name:/m.test(frontmatter)).toBe(true);
    expect(/^description:/m.test(frontmatter)).toBe(true);
    expect(/^antmay/im.test(frontmatter), "no antmay-specific metadata").toBe(
      false,
    );
    // The catalog binds skills by name/identity/posture only — it stores no file
    // path or mutation, so removing antmay changes nothing on disk.
    for (const entry of ANTMAY_SKILL_CATALOG) {
      expect(Object.keys(entry).sort()).toEqual([
        "claudeIdentity",
        "codexIdentity",
        "name",
        "requestPosture",
      ]);
    }
  });
});
