import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

// Strip block and line comments so the concept scan inspects code, not the
// prose that explains which concepts core deliberately excludes.
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function sourceFiles(): Array<{ name: string; content: string; code: string }> {
  return readdirSync(srcDir)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => {
      const content = readFileSync(join(srcDir, name), "utf8");
      return { name, content, code: stripComments(content) };
    });
}

describe("core has no pane/multiplexer/herdr dependency", () => {
  const files = sourceFiles();

  it("has core sources to inspect", () => {
    expect(files.map((file) => file.name).sort()).toEqual([
      "catalog.ts",
      "index.ts",
      "outcome.ts",
      "reconcile.ts",
      "registry.ts",
      "run.ts",
      "status.ts",
    ]);
  });

  it("imports only from sibling core modules, never a runtime dependency", () => {
    for (const file of files) {
      const specifiers = [
        ...file.code.matchAll(/from\s+["']([^"']+)["']/g),
      ].map((match) => match[1] ?? "");
      for (const specifier of specifiers) {
        expect(
          specifier.startsWith("./") || specifier.startsWith("../"),
          `${file.name} imports non-relative module "${specifier}"`,
        ).toBe(true);
      }
    }
  });

  it("declares no pane, multiplexer, or tmux concept", () => {
    for (const file of files) {
      expect(file.code).not.toMatch(/\bpane\b/i);
      expect(file.code).not.toMatch(/multiplexer/i);
      expect(file.code).not.toMatch(/\btmux\b/i);
      expect(file.code).not.toMatch(/\bprocess\b/i);
      expect(file.code).not.toMatch(/transcript-path/i);
    }
  });

  it("mentions herdr only as the fixed adapter string literal", () => {
    for (const file of files) {
      const withoutAdapterLiteral = file.code.replaceAll('"herdr"', '""');
      expect(
        withoutAdapterLiteral,
        `${file.name} references herdr outside the adapter literal`,
      ).not.toMatch(/herdr/i);
    }
  });
});
