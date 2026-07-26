import type { WaitingInfo, WaitingReason } from "../state/checkpoint.js";

/**
 * A pause that stopped for its governing reason alone — the ordinary
 * single-reason shape, spelled once here so each case states only what it is
 * testing.
 */
export function governedBy(
  reason: WaitingReason,
  extra: Omit<Partial<WaitingInfo>, "reasons"> = {},
): WaitingInfo {
  return { ...extra, reasons: [reason] };
}
