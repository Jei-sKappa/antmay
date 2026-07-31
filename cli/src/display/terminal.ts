/**
 * One import point over the phase-specific terminal renderers, for a reader or
 * test that works across phases. Each renderer is defined in the module that
 * owns its phase — `list`, `preflight`, `startup`, `execution` — over the shared
 * primitives in `format`; nothing is declared here.
 */
export type { DisplayOptions } from "./format.js";
export { printRunList, type RunListSummary } from "./list.js";
export {
  printCompositionRefusal,
  printTemporaryWorkspaceRefusal,
  type CompositionRefusalInfo,
  type TemporaryWorkspaceRefusalInfo,
} from "./preflight.js";
export {
  printRunSummary,
  printScriptedModeStartup,
  printScriptedResolvedPrompt,
  printUnrestrictedWarning,
  type StageSummaryEntry,
} from "./startup.js";
export { createTerminalExecutionDisplay } from "./execution.js";
