// Public entry point for the mode-agnostic `@antmay/core` domain: run identity
// and classification, terminal-transition semantics, the fixed skill catalog
// and request-posture validation, and the exact status document contract with
// its deterministic projections, and the storage-agnostic run-registry
// semantics that persistence layers compose over. No export here requires a
// pane or multiplexer concept; attachment data is only an opaque execution-lane
// binding.

export {
  ANTMAY_SKILL_CATALOG,
  type CatalogEntry,
  findCatalogEntry,
  isCatalogSkill,
  type RequestPosture,
  type RequestValidation,
  validateRequestPosture,
  validateSkillRequest,
} from "./catalog";
export { parseTerminalOutcome } from "./outcome";
export {
  emptyRegistry,
  findRunById,
  listRuns,
  listRunsForRepository,
  type RegistryUpdate,
  type RunRegistry,
  registerRun,
  registryFromRecords,
  terminalizeRun,
  updateWorkerHealth,
} from "./registry";
export {
  type Adapter,
  type AttachmentBinding,
  type AttachmentHandle,
  applyTerminalOutcome,
  asAttachmentHandle,
  asRepositoryPath,
  asRunId,
  asThreadPath,
  type EndpointEndEvidence,
  type Harness,
  isTerminalClassification,
  type RepositoryPath,
  type RunClassification,
  type RunId,
  type RunRecord,
  type SessionIdentity,
  type SessionKind,
  type TerminalClassification,
  type TerminalOutcome,
  type TerminalTransitionResult,
  type ThreadPath,
  type TranscriptTerminalKind,
  transcriptTerminalOutcome,
  unknownOutcome,
  type WorkerHealth,
  type WorkerHealthState,
} from "./run";
export {
  type AttentionInput,
  allScope,
  projectRun,
  projectStatusDocument,
  repositoryScope,
  type StatusAttention,
  type StatusDocumentV1,
  type StatusRun,
  type StatusScope,
} from "./status";
