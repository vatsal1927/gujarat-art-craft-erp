# P2-WP-ENV-004 ADR — Candid Compatibility Strategy

**Status:** Proposed
**Version:** 1.0
**Date:** 2026-07-27
**Work Package:** P2-WP-ENV-004
**Project:** Gujarat Art & Craft ERP

---

## Context

The repository shows a current Candid-facing contract surface for BOM and product data that is consumed by the frontend and reflected in generated declaration files. The backend model in [backend/main.mo](backend/main.mo) defines the `UnitConfig`, `BOMRequirement`, `ProductItem`, and `DatabaseBackup` shapes, while the frontend declaration surfaces in [frontend/src/backend.ts](frontend/src/backend.ts) and [frontend/src/backend.d.ts](frontend/src/backend.d.ts) expose related BOM fields such as `unitConfig`, `qtyPerUnit`, `legacyUnit`, `qtyPerUnitBase`, and `schemaVersion`.

The approved design package also identifies a reserved-keyword migration concern for the backend schema. That creates an architectural decision point: the repository evidence shows an existing contract surface and a need to preserve compatibility while any internal representation changes are considered.

---

## Problem Statement

The repository does not support an unqualified assumption that internal Motoko field-name changes should automatically become public Candid contract changes. At the same time, the current frontend declaration surfaces and the architecture package indicate that existing BOM payloads and related field names are part of the current contract understanding.

The decision required is how to preserve compatibility when the internal schema changes, without introducing avoidable contract disruption or relying on unsupported assumptions.

---

## Current Repository State

The current repository evidence supports the following statements:

- [backend/main.mo](backend/main.mo) defines the backend models for `UnitConfig` and BOM-related product data.
- [frontend/src/backend.ts](frontend/src/backend.ts) and [frontend/src/backend.d.ts](frontend/src/backend.d.ts) expose the current frontend-facing declaration surface for BOM requirements and products.
- The current declaration surface includes `unitConfig` and related unit metadata fields used by the inventory and consumption flows.
- The architecture package states that current frontend implementations exchange `UnitConfig` data using the existing field names and payload semantics.
- No implementation change is authorized by this ADR; this document is limited to architecture decision-making.

---

## Options Considered

### Option 1 — Preserve the existing Candid field names and semantics

This option keeps the public contract aligned with the current frontend-facing declaration surface and treats internal field renames as an internal concern.

Advantages:

- Preserves the current contract understanding.
- Minimizes client disruption.
- Aligns with the repository evidence and the current approval package.

Disadvantages:

- Requires explicit translation at an approved boundary if internal names change.
- Requires disciplined validation of generated declarations and contract surfaces.

### Option 2 — Expose new internal names directly through the public Candid contract

This option would make the new internal names part of the public contract immediately.

Advantages:

- Keeps the public contract closely aligned with the internal schema.

Disadvantages:

- Creates a higher risk of breaking existing clients.
- Is not supported by the current repository evidence as the existing contract baseline.
- Requires explicit approval before introduction.

### Option 3 — Defer the compatibility decision

This option leaves the contract strategy unresolved until a later phase.

Advantages:

- Avoids immediate architectural commitment.

Disadvantages:

- Leaves contract compatibility undefined.
- Increases review risk for generated declarations and frontend integration.
- Does not align with the need for enterprise review readiness.

---

## Recommended Strategy

The recommended strategy is Option 1: preserve the existing Candid-facing field names and payload semantics for the current contract surface, and treat internal schema changes as implementation details that must be translated at an explicit compatibility boundary if required.

This decision is architecture-only and does not authorize implementation. It establishes that the public Candid contract should remain stable unless a separate approval process explicitly changes it.

---

## Decision Rationale

This decision is grounded in the repository evidence rather than assumed implementation patterns.

The rationale is:

- The current frontend declaration files already define the contract surface that the UI consumes.
- The design package identifies compatibility as a required concern for the migration.
- The repository evidence shows that existing BOM payload handling depends on the current field set and semantics.
- A non-breaking contract approach is the lowest-risk option for preserving reviewability and minimizing client impact.

The ADR therefore favors preserving the current public contract shape until a separate approval explicitly requires a change.

---

## Backward Compatibility

Backward compatibility is a required design principle for this decision.

The strategy requires that:

- existing request and response field names remain supported unless an explicit contract change is approved,
- the current BOM-related payload semantics remain intact across the reviewed declaration surfaces,
- any translation between internal and external representations occurs at an explicit boundary rather than through implicit contract drift,
- and generated declaration files remain consistent with the approved contract shape.

This ADR does not assume that legacy clients are unsupported; it instead establishes that compatibility must be preserved unless a formal change decision is made.

---

## Future Compatibility

This decision is intended to support future compatibility by separating internal representation changes from public contract changes.

The approach supports:

- future compiler-safe internal field naming changes,
- future review of generated declarations without forcing immediate public contract changes,
- and future evolution of the contract only through explicit architectural approval.

The ADR does not assume that changes to the internal schema must also change the public Candid contract automatically.

---

## Risks

- If translation responsibilities are not clearly assigned, the contract could drift between backend and frontend expectations.
- If generated declarations are updated without contract review, the declaration surface could become inconsistent with the intended compatibility boundary.
- If future clients rely on different naming assumptions, review will be needed before any contract change is approved.
- The repository evidence does not define a finalized replacement public contract shape, so this ADR avoids assuming one.

---

## Validation Strategy

Validation must remain evidence-based and repository-backed.

The validation strategy should include:

- confirming that the current backend and frontend declaration surfaces remain aligned,
- confirming that request and response payload fields used by the UI remain consistent with the approved contract,
- reviewing generated declaration consistency between [frontend/src/backend.ts](frontend/src/backend.ts) and [frontend/src/backend.d.ts](frontend/src/backend.d.ts),
- and verifying that any proposed contract change is explicitly reviewed before acceptance.

This ADR does not define implementation-level testing procedures; it defines the required architectural validation expectation.

---

## Approval Status

This ADR is a design decision record for review and approval.

### Approval Status

- Status: Proposed
- Technical Review: Required
- Enterprise Review: Required
- Implementation Authorization: Pending approval
