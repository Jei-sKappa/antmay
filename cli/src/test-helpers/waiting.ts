import { expect } from "vitest";

import type {
  WaitingInfo,
  WaitingKind,
  WaitingReason,
  WaitingReasonOf,
  WaitingReasons,
} from "../state/checkpoint/types.js";

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

/**
 * The same pause with several reasons in the given order, for a case whose whole
 * point is that the order is presentation: what the run does about the pause comes
 * from its recovery alone.
 */
export function reordered(waiting: WaitingInfo): WaitingInfo {
  const reversed = [...waiting.reasons].reverse() as WaitingReasons;
  return { ...waiting, reasons: reversed };
}

/**
 * One recorded reason as its own kind, so a case can read the evidence that kind
 * carries. Asserting the kind is what earns the narrow, so a case that names the
 * wrong one fails on the kind rather than on a missing field.
 */
export function reasonOf<K extends WaitingKind>(
  reason: WaitingReason | undefined,
  kind: K,
): WaitingReasonOf<K> {
  expect(reason?.kind).toBe(kind);
  return reason as WaitingReasonOf<K>;
}
