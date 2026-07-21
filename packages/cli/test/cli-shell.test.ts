import { describe, expect, it } from "vitest";
import { createProgram } from "../src/program";

const argv = (...args: string[]): string[] => ["node", "antmay", ...args];

describe("antmay cli shell", () => {
  it("identifies the executable as antmay", () => {
    expect(createProgram().name()).toBe("antmay");
  });

  it("registers exactly the spawn, status, and attach commands", () => {
    const names = createProgram().commands.map((command) => command.name());
    expect(names).toEqual(["spawn", "status", "attach"]);
  });

  it("does not expose a private worker command", () => {
    const names = createProgram().commands.map((command) => command.name());
    expect(names).not.toContain("worker");
    expect(names).not.toContain("__watch");
  });

  it("prints antmay and the three public commands in help", () => {
    const help = createProgram().helpInformation();
    expect(help).toContain("Usage: antmay");
    expect(help).toContain("spawn");
    expect(help).toContain("status");
    expect(help).toContain("attach");
    expect(help).not.toContain("worker");
  });

  it("fails each not-yet-implemented public command with a stable diagnostic", async () => {
    for (const command of ["status", "attach"]) {
      await expect(createProgram().parseAsync(argv(command))).rejects.toThrow(
        `antmay ${command} is not implemented yet.`,
      );
    }
  });

  it("lists exactly the spawn flags in its help", () => {
    const spawn = createProgram().commands.find(
      (command) => command.name() === "spawn",
    );
    const help = spawn?.helpInformation() ?? "";
    expect(help).toContain("--thread <thread>");
    expect(help).toContain("--skill <catalog-name>");
    expect(help).toContain("--harness <claude|codex>");
    expect(help).toContain("--adapter <herdr>");
    expect(help).toContain("--request <text>");
    expect(help).toContain("--attach");
    expect(help).toContain("--force");
    const flags = (spawn?.options ?? []).map((option) => option.long);
    expect(flags).toEqual([
      "--thread",
      "--skill",
      "--harness",
      "--adapter",
      "--request",
      "--attach",
      "--force",
    ]);
  });
});
