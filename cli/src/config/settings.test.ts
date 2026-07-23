import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadSettings } from "./settings.js";

const KNOWN_STAGES: ReadonlySet<string> = new Set([
  "propose",
  "spec",
  "plan",
  "implement",
  "review",
  "finish",
]);

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "antmay-settings-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function write(contents: string): void {
  fs.writeFileSync(path.join(dir, "settings.json"), contents, "utf8");
}

describe("missing file", () => {
  it("reports missing with the exact resolved path and a README pointer", () => {
    const result = loadSettings(dir, KNOWN_STAGES);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toBe(true);
    expect(result.expectedPath).toBe(path.join(dir, "settings.json"));
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain(path.join(dir, "settings.json"));
    expect(result.errors[0]).toContain("cli/README.md");
    // The executor never creates the file.
    expect(fs.existsSync(path.join(dir, "settings.json"))).toBe(false);
  });
});

describe("syntax error", () => {
  it("names the file and carries parser position detail", () => {
    write("{ not json");
    const result = loadSettings(dir, KNOWN_STAGES);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain(path.join(dir, "settings.json"));
    expect(result.errors[0]).toContain("not valid JSON");
  });
});

describe("accepted documents", () => {
  it("accepts an empty afk object, normalizing defaults and stages", () => {
    write(JSON.stringify({ afk: {} }));
    const result = loadSettings(dir, KNOWN_STAGES);
    expect(result).toEqual({ ok: true, settings: { defaults: {}, stages: {} } });
  });

  it("accepts a full valid document", () => {
    write(
      JSON.stringify({
        afk: {
          defaults: { harness: "codex", model: "gpt-5-codex" },
          stages: {
            implement: { prompt: "hi", idleTimeoutSeconds: 3600 },
          },
        },
      }),
    );
    const result = loadSettings(dir, KNOWN_STAGES);
    expect(result).toEqual({
      ok: true,
      settings: {
        defaults: { harness: "codex", model: "gpt-5-codex" },
        stages: { implement: { prompt: "hi", idleTimeoutSeconds: 3600 } },
      },
    });
  });

  it("accepts an empty prompt string", () => {
    write(JSON.stringify({ afk: { defaults: { prompt: "" } } }));
    const result = loadSettings(dir, KNOWN_STAGES);
    expect(result.ok).toBe(true);
  });
});

describe("schema rejections", () => {
  function errorsFor(doc: unknown): string[] {
    write(JSON.stringify(doc));
    const result = loadSettings(dir, KNOWN_STAGES);
    expect(result.ok).toBe(false);
    if (result.ok) return [];
    return result.errors;
  }

  it("rejects a non-object root", () => {
    write("42");
    const result = loadSettings(dir, KNOWN_STAGES);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain("root");
  });

  it("rejects a missing afk key", () => {
    const errors = errorsFor({});
    expect(errors.some((e) => e.includes("afk"))).toBe(true);
  });

  it("rejects a non-object afk", () => {
    const errors = errorsFor({ afk: 5 });
    expect(errors.some((e) => e === "afk must be an object.")).toBe(true);
  });

  it("rejects an unknown top-level field", () => {
    const errors = errorsFor({ afk: {}, extra: 1 });
    expect(errors.some((e) => e.includes("extra"))).toBe(true);
  });

  it("rejects an unknown afk-level field", () => {
    const errors = errorsFor({ afk: { bogus: 1 } });
    expect(errors.some((e) => e.includes("afk.bogus"))).toBe(true);
  });

  it("rejects an unknown profile field with a property path", () => {
    const errors = errorsFor({ afk: { defaults: { nope: 1 } } });
    expect(errors.some((e) => e.includes("afk.defaults.nope"))).toBe(true);
  });

  it("rejects an unsupported harness", () => {
    const errors = errorsFor({ afk: { defaults: { harness: "gemini" } } });
    expect(errors.some((e) => e.includes("afk.defaults.harness"))).toBe(true);
  });

  it("rejects an empty model", () => {
    const errors = errorsFor({ afk: { defaults: { model: "" } } });
    expect(errors.some((e) => e.includes("afk.defaults.model"))).toBe(true);
  });

  it("rejects a non-string prompt", () => {
    const errors = errorsFor({ afk: { stages: { spec: { prompt: 3 } } } });
    expect(errors.some((e) => e.includes("afk.stages.spec.prompt"))).toBe(true);
  });

  it("rejects a non-positive idleTimeoutSeconds", () => {
    const errors = errorsFor({ afk: { defaults: { idleTimeoutSeconds: 0 } } });
    expect(
      errors.some((e) => e.includes("afk.defaults.idleTimeoutSeconds")),
    ).toBe(true);
  });

  it("rejects a non-integer idleTimeoutSeconds", () => {
    const errors = errorsFor({ afk: { defaults: { idleTimeoutSeconds: 1.5 } } });
    expect(
      errors.some((e) => e.includes("afk.defaults.idleTimeoutSeconds")),
    ).toBe(true);
  });

  it("rejects a stage key absent from the injected known set", () => {
    const errors = errorsFor({ afk: { stages: { unknownstage: {} } } });
    expect(
      errors.some((e) => e.includes("afk.stages.unknownstage")),
    ).toBe(true);
  });

  it("reports every schema error together (aggregate)", () => {
    const errors = errorsFor({
      afk: {
        defaults: { harness: "gemini", model: "" },
        stages: { unknownstage: { prompt: 5 } },
      },
    });
    expect(errors.length).toBeGreaterThanOrEqual(4);
    expect(errors.some((e) => e.includes("afk.defaults.harness"))).toBe(true);
    expect(errors.some((e) => e.includes("afk.defaults.model"))).toBe(true);
    expect(errors.some((e) => e.includes("afk.stages.unknownstage"))).toBe(true);
    expect(
      errors.some((e) => e.includes("afk.stages.unknownstage.prompt")),
    ).toBe(true);
  });
});
