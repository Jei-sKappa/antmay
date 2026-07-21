import { describe, expect, it } from "vitest";
import { createProgram } from "../src/program";

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

  it("exposes attach with only the optional [run-id] and no cleanup option", () => {
    const attach = createProgram().commands.find(
      (command) => command.name() === "attach",
    );
    const help = attach?.helpInformation() ?? "";
    expect(help).toContain("[run-id]");
    expect(attach?.options ?? []).toEqual([]);
    expect(help).not.toMatch(/clean/i);
    expect(help).not.toMatch(/expir/i);
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
