import { promises as fs } from "node:fs";

import { describe, expect, it } from "vitest";

import { EXIT_FAILURE, EXIT_OK } from "./cli/exit-codes.js";
import { VERSION_LINE } from "./cli/help.js";
import { resolveDisplayColor, runMain } from "./program.js";

describe("runMain dispatch (AC-1.1, FR-8)", () => {
  it("handles help and version without invoking command handlers", async () => {
    let handlersCalled = 0;
    const handlers = {
      run: async () => {
        handlersCalled += 1;
        return EXIT_FAILURE;
      },
      resume: async () => {
        handlersCalled += 1;
        return EXIT_FAILURE;
      },
      list: async () => {
        handlersCalled += 1;
        return EXIT_FAILURE;
      },
    };

    expect(await runMain(["--help"], handlers)).toBe(EXIT_OK);
    expect(await runMain(["--version"], handlers)).toBe(EXIT_OK);
    expect(handlersCalled).toBe(0);
  });

  it("returns usage errors without invoking command handlers", async () => {
    let handlersCalled = 0;
    const handlers = {
      run: async () => {
        handlersCalled += 1;
        return EXIT_FAILURE;
      },
      resume: async () => {
        handlersCalled += 1;
        return EXIT_FAILURE;
      },
      list: async () => {
        handlersCalled += 1;
        return EXIT_FAILURE;
      },
    };

    const code = await runMain(["afk", "nope"], handlers);
    expect(code).toBe(EXIT_FAILURE);
    expect(handlersCalled).toBe(0);
  });

  it("hands the run handler the pipeline reference, entry point, and profile", async () => {
    const received: Array<Record<string, unknown>> = [];
    const code = await runMain(
      [
        "afk",
        "run",
        "./mine.json",
        "--thread",
        "docs/threads/x",
        "--from",
        "plan-strict",
        "--profile",
        "maximum-quality",
      ],
      {
        run: async (command) => {
          received.push({ ...command });
          return EXIT_OK;
        },
        resume: async () => EXIT_FAILURE,
        list: async () => EXIT_FAILURE,
      },
    );

    expect(code).toBe(EXIT_OK);
    expect(received).toEqual([
      {
        kind: "run",
        pipeline: "./mine.json",
        thread: "docs/threads/x",
        from: "plan-strict",
        profile: "maximum-quality",
        dangerouslySkipPermissions: false,
      },
    ]);
  });

  it("prints the version line for --version", async () => {
    const chunks: string[] = [];
    const original = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(chunk.toString());
      return true;
    }) as typeof process.stdout.write;
    try {
      await runMain(["--version"], {
        run: async () => EXIT_FAILURE,
        resume: async () => EXIT_FAILURE,
        list: async () => EXIT_FAILURE,
      });
    } finally {
      process.stdout.write = original;
    }
    expect(chunks.join("")).toBe(`${VERSION_LINE}\n`);
  });
});

describe("resolveDisplayColor", () => {
  it("lets a terminal stdout decide when neither variable is set", () => {
    expect(resolveDisplayColor({}, true)).toBe(true);
    expect(resolveDisplayColor({}, false)).toBe(false);
  });

  it("turns color on for a non-terminal stdout under FORCE_COLOR", () => {
    for (const value of ["1", "true", "3", " "]) {
      expect(resolveDisplayColor({ FORCE_COLOR: value }, false), value).toBe(true);
    }
  });

  it("treats an empty or zero FORCE_COLOR as no switch at all", () => {
    for (const value of ["", "0"]) {
      expect(resolveDisplayColor({ FORCE_COLOR: value }, false), value).toBe(false);
      expect(resolveDisplayColor({ FORCE_COLOR: value }, true), value).toBe(true);
    }
  });

  it("keeps color off under NO_COLOR, including against FORCE_COLOR", () => {
    expect(resolveDisplayColor({ NO_COLOR: "1" }, true)).toBe(false);
    expect(resolveDisplayColor({ NO_COLOR: "1", FORCE_COLOR: "1" }, false)).toBe(
      false,
    );
    // Empty is unset, so it decides nothing on its own.
    expect(resolveDisplayColor({ NO_COLOR: "" }, true)).toBe(true);
  });
});

describe("dispatch import boundaries (AC-5.5, FR-8)", () => {
  const readProgramSource = (): Promise<string> =>
    fs.readFile(new URL("./program.ts", import.meta.url), "utf8");

  it("statically imports only the argument grammar, help text, and exit codes", async () => {
    const source = await readProgramSource();
    const specifiers = [...source.matchAll(/\bfrom\s+"([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect([...new Set(specifiers)].sort()).toEqual([
      "./cli/exit-codes.js",
      "./cli/help.js",
      "./cli/parse.js",
    ]);
  });

  it("defers every command, runtime, and platform module to a selected handler", async () => {
    const source = await readProgramSource();
    const deferred = [...source.matchAll(/\bimport\("([^"]+)"\)/g)].map(
      (match) => match[1],
    );
    expect([...new Set(deferred)].sort()).toEqual([
      "./commands/list.js",
      "./commands/resume.js",
      "./commands/run.js",
      "./harness/runtime.js",
      "node:os",
    ]);
  });

  it("names no concrete harness adapter family", async () => {
    const source = await readProgramSource();
    expect(source).not.toMatch(/harness\/(?:backends|scripted)/);
  });
});
