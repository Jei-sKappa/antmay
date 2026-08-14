import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadExecutionProfile } from "./load.js";

const CODEX = { harness: "codex", model: "gpt-5.6-sol" };

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "antmay-profile-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function write(contents: string, filename = "profile.json"): string {
  const sourcePath = path.join(dir, filename);
  fs.writeFileSync(sourcePath, contents, "utf8");
  return sourcePath;
}

describe("loading an execution profile document", () => {
  it("reads the path it is given and keeps the declared name, not the filename", () => {
    const sourcePath = write(
      JSON.stringify({
        schemaVersion: 0,
        name: "maximum-quality",
        stages: { spec: { agent: CODEX } },
      }),
      "some-other-file.json",
    );
    expect(loadExecutionProfile(sourcePath)).toEqual({
      ok: true,
      profile: { name: "maximum-quality", stages: { spec: { agent: CODEX } } },
    });
  });

  it("reports a missing document against its exact path and searches nowhere else", () => {
    const sourcePath = path.join(dir, "profiles", "absent.json");
    const result = loadExecutionProfile(sourcePath);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      `No execution profile document exists at ${sourcePath}.`,
    ]);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it("reports a syntax error against the source path", () => {
    const sourcePath = write("{ not json");
    const result = loadExecutionProfile(sourcePath);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain(`${sourcePath} is not valid JSON`);
  });

  it("returns the validator's problems, naming no path of its own", () => {
    const sourcePath = write(
      JSON.stringify({ schemaVersion: 0, name: "p", stages: {} }),
    );
    expect(loadExecutionProfile(sourcePath)).toEqual({
      ok: false,
      errors: ["stages must bind at least one stage."],
    });
  });
});
