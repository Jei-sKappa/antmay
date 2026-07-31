import type { WaitingInfo, WaitingReason } from "../state/checkpoint.js";

/**
 * A pause that stopped for one reason alone and expects nothing of an earlier
 * attempt — the ordinary single-reason shape, spelled once here so each case
 * states only what it is testing. `extra` overrides the recovery for a case that
 * is about one of the attempt-referencing variants.
 */
export function governedBy(
  reason: WaitingReason,
  extra: Omit<Partial<WaitingInfo>, "reasons"> = {},
): WaitingInfo {
  return { recovery: { kind: "retry-stage" }, ...extra, reasons: [reason] };
}
