import { Command } from "@commander-js/extra-typings";
import packageJson from "../package.json" with { type: "json" };

/**
 * Thrown when a public command shell is invoked before its behavior lands. The
 * message is stable so callers and tests can assert on it.
 */
function notYetImplemented(command: string): never {
  throw new Error(`antmay ${command} is not implemented yet.`);
}

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

  program
    .command("spawn")
    .description("Launch a supported Antmay skill run in a herdr pane")
    .action(() => notYetImplemented("spawn"));

  program
    .command("status")
    .description("Reconcile and report Antmay runs")
    .action(() => notYetImplemented("status"));

  program
    .command("attach")
    .description("Attach to an active or retained Antmay run pane")
    .action(() => notYetImplemented("attach"));

  return program;
}
