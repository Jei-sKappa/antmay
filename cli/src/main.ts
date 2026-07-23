// Minimal, side-effect-light bootstrap. The Node version is checked before any
// application or dependency module is imported, so the runtime guard genuinely
// precedes command-module and Sandcastle evaluation. The dynamic import of
// `./program.js` is what enforces that ordering — static imports would not.

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);

if (nodeMajor < 22) {
  process.stderr.write(
    `antmay requires Node.js >= 22 (found ${process.versions.node}).\n`,
  );
  process.exitCode = 1;
} else {
  const { runProgram } = await import("./program.js");
  process.exitCode = await runProgram(process.argv.slice(2));
}
