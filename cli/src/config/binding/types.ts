/**
 * The local execution-binding vocabulary: what a stage binding is as a local
 * document writes it, what one resolves to, and the outcome of validating or
 * loading either document that carries them.
 *
 * It declares and does nothing — only `import type` statements and exported
 * declarations — so the durable checkpoint can name a resolved binding without
 * reaching a module that reads a file. The intrinsic timing defaults are
 * deliberately not here: an omitted timing field falls back to one, but the
 * fallback is resolution, so both values live beside it in `resolve.ts`.
 */

import type { HarnessId } from "../../harness/id.js";
import type { CatalogStageId } from "../../pipeline/stage-id.js";

/**
 * The external agent a stage runs on. Harness and model are one indivisible
 * pair: they are chosen together, validated together, and replaced together, so
 * a model can never be paired with a harness the author did not intend.
 */
export type AgentBinding = {
  harness: HarnessId;
  model: string;
};

/**
 * One stage's local execution binding exactly as a settings or execution-profile
 * document writes it. Timing fields are optional and fall back to the intrinsic
 * defaults; the binding carries no prompt or instructions, which stay with the
 * catalog and the portable pipeline document.
 */
export type StageBinding = {
  agent: AgentBinding;
  idleTimeoutSeconds?: number;
  heartbeatSeconds?: number;
};

/**
 * Stage bindings keyed by catalog stage ID. Both local document types use this
 * container, and both may bind stages a given pipeline never selects so one
 * document can serve several pipelines.
 */
export type StageBindingMap = Partial<Record<CatalogStageId, StageBinding>>;

/**
 * A validated execution-profile document: its declared display identity and its
 * non-empty stage bindings. The declared name is independent of the filename the
 * document was read from.
 */
export type ExecutionProfile = {
  name: string;
  stages: StageBindingMap;
};

/**
 * One selected stage's complete local execution binding, with every timing field
 * settled. It comes from exactly one source document — a profile entry or a
 * settings entry — never from a combination of the two.
 */
export type ResolvedStageBinding = {
  agent: AgentBinding;
  idleTimeoutSeconds: number;
  heartbeatSeconds: number;
};

/**
 * The outcome of validating a stage-binding container: the bindings it holds, or
 * every problem the container has. Both local documents reach this through the
 * one shared schema, which is what keeps their diagnostics from drifting apart.
 */
export type StageMapValidation =
  | { ok: true; stages: StageBindingMap }
  | { ok: false; errors: string[] };

/**
 * The outcome of validating an already-parsed settings document. Its failure
 * names no path, because a validator is handed a parsed root and only the loader
 * knows which file it came from.
 */
export type SettingsValidation =
  | { ok: true; stages: StageBindingMap }
  | { ok: false; errors: string[] };

/**
 * The result of loading the optional `<config-root>/settings.json`. A missing
 * file succeeds with an empty stage map; a present file that fails the strict
 * schema reports every discoverable problem at once against its resolved path,
 * which the loader is the only party to know.
 */
export type StageSettingsResult =
  | { ok: true; stages: StageBindingMap }
  | { ok: false; sourcePath: string; errors: string[] };

/**
 * The outcome of validating or loading one execution-profile document. Loading
 * adds no path to it: the caller resolved the path it passed in and uses that
 * same value in its own refusal.
 */
export type ExecutionProfileResult =
  | { ok: true; profile: ExecutionProfile }
  | { ok: false; errors: string[] };

/**
 * The result of binding every selected stage. On success the bindings are
 * index-aligned with the selected stage IDs; on failure every unbound selected
 * stage is named.
 */
export type StageBindingsResult =
  | { ok: true; bindings: ResolvedStageBinding[] }
  | { ok: false; errors: string[] };
