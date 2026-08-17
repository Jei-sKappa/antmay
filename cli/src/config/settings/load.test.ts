import fs from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { loadStageSettings } from "./load.js";
import { tempDirSync } from "../../test-helpers/temp-root.js";

let dir: string;

beforeEach(() => {
  dir = tempDirSync("antmay-settings-");
});

function write(contents: string): string {
  const sourcePath = path.join(dir, "settings.json");
  fs.writeFileSync(sourcePath, contents, "utf8");
  return sourcePath;
}

describe("loading the settings document", () => {
  it("treats a missing file as an empty stage map and creates nothing", () => {
    expect(loadStageSettings(dir)).toEqual({ ok: true, stages: {} });
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it("reads the one path under the config root and returns its bindings", () => {
    write(
      JSON.stringify({
        afk: { stages: { spec: { agent: { harness: "codex", model: "m" } } } },
      }),
    );
    expect(loadStageSettings(dir)).toEqual({
      ok: true,
      stages: { spec: { agent: { harness: "codex", model: "m" } } },
    });
  });

  it("interpolates nothing in a value it reads", () => {
    write(
      JSON.stringify({
        afk: { stages: { spec: { agent: { harness: "codex", model: "${HOME}" } } } },
      }),
    );
    const result = loadStageSettings(dir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stages.spec?.agent.model).toBe("${HOME}");
  });

  it("reports a syntax error against the resolved path", () => {
    const sourcePath = write("{ not json");
    const result = loadStageSettings(dir);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.sourcePath).toBe(sourcePath);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain(`${sourcePath} is not valid JSON`);
  });

  it("attaches the resolved path to every problem a present document has", () => {
    const sourcePath = write(
      JSON.stringify({ afk: { stages: { spec: {} } }, extra: 1 }),
    );
    expect(loadStageSettings(dir)).toEqual({
      ok: false,
      sourcePath,
      errors: [
        'extra is not a recognized top-level field; the only root field is "afk".',
        "afk.stages.spec.agent is required.",
      ],
    });
  });
});
