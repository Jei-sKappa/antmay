/**
 * Harness identity: which harnesses exist, and the one narrowing that turns an
 * untrusted value into one of them.
 *
 * A settings parser and a checkpoint validator both need to know which ids exist
 * without depending on `harness/provider.ts`, the declaration of what a harness
 * *is*, so the vocabulary stands on its own and the face imports it. It knows
 * nothing of configuration, providers, adapters, or durable state.
 */

/**
 * A supported agentic harness the executor can drive.
 */
export type HarnessId = "codex" | "claude-code";

/**
 * Every harness id the executor recognizes, in the order user-facing diagnostics
 * list them. This is the one such collection: the diagnostic that names the
 * supported ids reads it, and the predicate below is the one membership test over
 * it.
 */
export const HARNESS_IDS: readonly HarnessId[] = ["codex", "claude-code"];

/**
 * Whether an untrusted value names a supported harness. Every narrowing site
 * asks here — the agent binding a settings or profile document declares, a
 * checkpoint's recorded binding, and the keys of its observed harness versions —
 * which is what lets the collection above be typed by its own members rather
 * than widened for a caller to test a raw value against.
 *
 * The sites share the question and not the sentence: one narrows an object key
 * and the others a field, so each keeps its own diagnostic.
 */
export function isHarnessId(value: unknown): value is HarnessId {
  return HARNESS_IDS.some((id) => id === value);
}
