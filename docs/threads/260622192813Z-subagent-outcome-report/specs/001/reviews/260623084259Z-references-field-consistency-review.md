---
status:
  disposed: 260623084259Z
  disposition: accepted
---

# Spec Review — AC-2.1 / AC-2.4 `References`-field consistency

## References

- Spec under review: `specs/001/spec.md` (approved `260622214418Z`, version 1 at review time).
- Source decision log: `seed/discussions/260622200031Z-outcome-report-design-decision-log.md` — `DL P3` (field set) and `DL P11` (template).
- Finding origin: surfaced as an Open Question in the implementation review `implementation/reviews/260623082236Z-outcome-report-wiring-implementation-review.md`, routed here as a spec-fault candidate.

## Verdict

**Accept-and-revise.** One internal-consistency finding, contract-preserving (no change to what the implementation must produce). The spec is revised in place to reconcile it; this review is the backing record for that amendment, and the revision (version 2) is its disposition.

## Findings

### 1. `issue` — AC-2.1 reads as an exhaustive content list but omits the `References` element that AC-2.4 mandates

- **What is wrong:** AC-2.1 states "the outcome file contains the core fields `Status`, `Summary`, `Assumptions`, `Blockers & open questions`, and the optional fields `Validation` and `Known risks`." Phrased as a complete enumeration of the file's contents, it omits `References` — which AC-2.4's pinned template lists in the fixed section order. A reader of AC-2.1 alone concludes `References` is not part of the file; a reader of AC-2.4 concludes it is. The two criteria are not self-consistent.
- **Root cause (not a wrong decision):** both criteria are individually faithful to their decision-log points. `DL P3` settled the *epistemic field set* — the fields that carry diff-blind state — and `References` is not one (it is a navigational pointer to the plan task, "for human orientation," settled in `DL P11`'s template). AC-2.1 inherited P3's field set verbatim and so reads as if it enumerates everything in the file, when it enumerates only the epistemic fields.
- **Why it matters:** the inconsistency is harmless to the already-shipped implementation (which correctly followed the more specific AC-2.4) but is a latent trap for any future re-implementation or for a deterministic checker reading AC-2.1 as the field contract.
- **Resolution direction:** reconcile toward AC-2.4 / `DL P11` (keep `References` in the file) — never toward dropping it, which would contradict P11 and break the shipped template. AC-2.1 is amended to name `References` explicitly as a *navigational* element distinct from P3's epistemic field set, leaving P3's field buckets unchanged.

## Evidence

- Spec `specs/001/spec.md` FR-2: **AC-2.1** (the enumeration, `DL P3`) vs **AC-2.4** (the pinned template's section order including `References`, `DL P11`).
- Decision log: `DL P3` field-set table (core/optional buckets, no `References`); `DL P11` template block, baked-in rule "`References` points only at the plan task for human orientation."

## Next Actions

- Amend AC-2.1 in place to acknowledge `References` as a navigational pointer (per the template / `DL P11`), distinct from P3's epistemic field set; bump the spec `version` 1 → 2. (Done as part of disposing this review — the revision is the record.)
- No re-implementation needed: the shipped outcome-file template already carries `References`, so the amendment closes the spec-internal gap without changing the contract the implementation satisfies.
