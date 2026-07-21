import { CommanderError } from "@commander-js/extra-typings";
import { createProgram } from "./program";

const program = createProgram();

try {
  await program.parseAsync(process.argv);
} catch (error) {
  if (error instanceof CommanderError) {
    if (
      error.code === "commander.helpDisplayed" ||
      error.code === "commander.help" ||
      error.code === "commander.version"
    ) {
      process.exitCode = 0;
    } else {
      process.stderr.write(`Error: ${error.message.replace(/^error: /, "")}\n`);
      process.exitCode = 1;
    }
  } else if (error instanceof Error && error.message.trim() !== "") {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
  } else {
    process.stderr.write("Error: Unexpected failure.\n");
    process.exitCode = 1;
  }
}
