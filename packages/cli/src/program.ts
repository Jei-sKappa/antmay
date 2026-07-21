import { Command } from "@commander-js/extra-typings";
import packageJson from "../package.json" with { type: "json" };
import { registerAttachCommand } from "./commands/attach";
import { registerSpawnCommand } from "./commands/spawn";
import { registerStatusCommand } from "./commands/status";

/**
 * Build the typed `antmay` program. It identifies the executable as `antmay`
 * and registers only the public `spawn`, `status`, and `attach` commands. The
 * private per-run worker is a package-internal module, never a command here, so
 * it never appears in `antmay --help`.
 */
export function createProgram(): Command {
  const program = new Command()
    .name("antmay")
    .description("Orchestrate Modular Agentic Workflow skill runs")
    .version(packageJson.version)
    .configureOutput({ outputError: () => {} })
    .exitOverride();

  registerSpawnCommand(program);
  registerStatusCommand(program);
  registerAttachCommand(program);

  return program;
}
