import { describe, expect, it } from "vitest";

import { EXIT_FAILURE, EXIT_OK } from "./cli/exit-codes.js";
import { VERSION_LINE } from "./cli/help.js";
import { runMain } from "./program.js";

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
