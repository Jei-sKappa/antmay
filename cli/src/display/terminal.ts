/**
 * One import point over the phase-specific terminal renderers, for a reader or
 * test that works across phases. Each renderer is defined in the module that
 * owns its phase — `list`, `preflight`, `startup`, `execution`, `crash` — over
 * the shared primitives in `format`; nothing is declared here.
 */
export { resolveDisplayColor, type DisplayOptions } from "./format.js";
export { printCrash, type CrashProcess } from "./crash.js";
export { printRunList, type RunListSummary } from "./list.js";
export {
  printCompositionRefusal,
  printHarnessRuntimeRefusal,
  printTemporaryWorkspaceRefusal,
  type CompositionRefusalInfo,
  type TemporaryWorkspaceRefusalInfo,
} from "./preflight.js";
export {
  printRunSummary,
  printSimulatedModeStartup,
  printSimulatedResolvedPrompt,
  printUnrestrictedWarning,
  type StageSummaryEntry,
} from "./startup.js";
export { createTerminalExecutionDisplay } from "./execution.js";
