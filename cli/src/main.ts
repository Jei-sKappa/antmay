// Minimal, side-effect-light bootstrap. The Node version is checked before any
// application or dependency module is imported, so the runtime guard genuinely
// precedes command-module and Sandcastle evaluation. The dynamic import of
// `./program.js` is what enforces that ordering — static imports would not.
//
// Nothing below the guard leaves this file as a throw. Every failure antmay
// supports is a structured refusal with its own renderer, so an escaped throw is
// a defect, and it is reported through `display/` like everything else the CLI
// prints. Its renderer is loaded the same lazy way, which is what keeps it
// behind the guard — and the reporting is best effort, because a module-load
// failure is one of the throws it exists to report.

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);

if (nodeMajor < 22) {
  process.stderr.write(
    `antmay requires Node.js >= 22 (found ${process.versions.node}).\n`,
  );
  process.exitCode = 1;
} else {
  try {
    const { runProgram } = await import("./program.js");
    process.exitCode = await runProgram(process.argv.slice(2));
  } catch (error) {
    // Settled before anything is rendered, so no failure in the reporting below
    // can change what the process returns.
    process.exitCode = 1;
    try {
      const { printCrash } = await import("./display/crash.js");
      printCrash(
        {
          stderr: process.stderr,
          env: process.env,
          isTTY: process.stdout.isTTY === true,
          argv: process.argv.slice(2),
          nodeVersion: process.versions.node,
        },
        error,
      );
    } catch {
      // The renderer could not be loaded or could not draw — most likely because
      // the throw being reported is a module-load failure this load repeats. The
      // last resort names the defect and hands the value over unrendered.
      try {
        process.stderr.write(
          "antmay stopped unexpectedly. This is a defect in antmay.\n" +
            `${
              error instanceof Error
                ? (error.stack ?? `${error.name}: ${error.message}`)
                : String(error)
            }\n`,
        );
      } catch {
        // stderr itself is unusable, so the exit code is the whole report.
      }
    }
  }
}
