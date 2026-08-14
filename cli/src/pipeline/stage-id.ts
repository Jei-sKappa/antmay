/**
 * Catalog-stage identity: the ordered closed set, its derived type, and the one
 * narrowing for untrusted strings. This leaf imports nothing, so document
 * validation can recognize a stage without reaching the catalog's artifact
 * contracts or any filesystem dependency behind them.
 */

/** Every catalog stage ID, in catalog order. */
export const CATALOG_STAGE_IDS = [
  "spec",
  "reconcile-spec",
  "review-spec",
  "plan-brief",
  "plan-strict",
  "reconcile-plan",
  "implement",
  "implement-plan",
  "implement-plan-with-subagents",
] as const;

/** The identifier of one trusted catalog stage. */
export type CatalogStageId = (typeof CATALOG_STAGE_IDS)[number];

/** Whether `value` names a catalog stage. */
export function isCatalogStageId(value: string): value is CatalogStageId {
  return CATALOG_STAGE_IDS.some((stageId) => stageId === value);
}
