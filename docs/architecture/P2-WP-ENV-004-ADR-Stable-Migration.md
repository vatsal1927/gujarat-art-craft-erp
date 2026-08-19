# P2-WP-ENV-004 ADR — Stable Migration Strategy

**Status:** Proposed
**Version:** 1.0
**Date:** 2026-07-27
**Work Package:** P2-WP-ENV-004
**Project:** Gujarat Art & Craft ERP

---

## Context

The repository contains a current backend model for `UnitConfig` in [backend/main.mo](backend/main.mo) that includes the fields `label`, `type`, `symbol`, and `conversionToBase`. That model is carried through persisted product BOM data via `BOMRequirement` and `ProductItem`, and it is also part of the backup/restore contract through `DatabaseBackup`.

The repository also shows a frontend contract surface in [frontend/src/types/inventoryUnits.ts](frontend/src/types/inventoryUnits.ts), [frontend/src/backend.ts](frontend/src/backend.ts), and [frontend/src/backend.d.ts](frontend/src/backend.d.ts) that uses `unitConfig`-based BOM data for inventory workflows. The current design package identifies a reserved-keyword migration need for the backend schema, while the repository evidence confirms that the data must remain compatible across persisted state, backup/restore flows, and frontend-facing declarations.

This creates an architectural decision point: the migration must preserve the meaning and integrity of the existing data while addressing the compiler constraint in a way that is safe for upgrade, rollback, and compatibility review.

---

## Problem Statement

The current backend schema uses identifiers that are incompatible with the target Motoko compiler constraints. At the same time, the repository evidence shows that the affected data is not isolated: it is carried in persisted product BOM structures, propagated through backup/export-import operations, and consumed by the current frontend declaration surfaces.

The architectural question is therefore not only how to rename the internal fields, but how to do so in a way that:

- preserves business data and relationships,
- avoids partial or unsafe migration states,
- preserves compatibility with existing backup and declaration surfaces,
- and remains reviewable and reversible.

---

## Options Considered

### Option 1 — Direct schema replacement without explicit compatibility boundaries

This option would replace the current model directly with a new internal representation and rely on the runtime and surrounding layers to adapt.

Advantages:

- Conceptually simple.

Disadvantages:

- High risk of breaking persisted data interpretation.
- Increases the chance of incompatibility across backup, restore, and declaration surfaces.
- Weakens rollback confidence because the upgrade path is not explicitly validated.

### Option 2 — Explicit translation-based stable migration with compatibility review

This option uses an explicit migration boundary for persisted data, preserving the existing semantics while translating the internal representation in a controlled way during the upgrade path.

Advantages:

- Aligns with the repository evidence and the approved design package.
- Keeps the migration tied to persisted product/BOM data and backup/restore structures.
- Supports validation before runtime exposure and rollback planning.
- Avoids treating the migration as a simple direct replacement.

Disadvantages:

- Requires more explicit design discipline and review.
- Depends on clear validation and compatibility acceptance criteria.

### Option 3 — No migration strategy change; defer the decision

This option would leave the migration as an open design issue until later.

Advantages:

- No immediate architectural commitment.

Disadvantages:

- Leaves the compiler blocker unresolved.
- Does not address the repository-backed compatibility risk for persisted BOM data.
- Increases uncertainty for backup, rollback, and declaration review.

---

## Recommended Option

The recommended architectural approach is Option 2: an explicit translation-based stable migration strategy that preserves the existing data semantics and uses controlled compatibility boundaries for persisted BOM data, backup/restore flows, and contract surfaces.

This option is recommended because it matches the repository evidence and the approved design package more closely than a direct replacement or an unresolved approach. It also preserves the principle that the migration should be reviewable, reversible, and validated before the upgraded state becomes active.

---

## Decision Rationale

This decision is based on repository evidence rather than assumed implementation details.

The rationale is:

- The current backend model is already embedded in persisted product data and backup structures.
- The current frontend and declaration layers already consume that data through BOM-based contracts.
- The design package explicitly identifies stable-state migration, backup compatibility, rollback readiness, and validation as required concerns.
- A translation-based approach provides a clearer boundary for compatibility review than a direct replacement.

This ADR therefore favors a migration approach that makes the compatibility boundary explicit rather than implicit.

---

## Risks

- The final internal field names remain subject to compiler verification and approval; this ADR does not assume a specific final naming scheme.
- The backup and declaration surfaces must remain compatible during the transition.
- Validation must prove that data values, ordering, identifiers, and BOM relationships remain intact.
- If validation is incomplete, the migration risk increases even if the design is otherwise correct.

---

## Consequences

### Positive consequences

- The migration becomes more reviewable and easier to validate.
- The persistence and compatibility boundary is explicit.
- Backup and rollback planning can be aligned with the same evidence base.
- The approach is consistent with the repository’s existing product/BOM and backup structure.

### Negative consequences

- The design requires stronger review and validation discipline.
- The migration cannot be treated as a simple schema rename.
- Compatibility decisions must be approved explicitly rather than assumed.

---

## Validation Strategy

Validation must be evidence-based and tied to the repository surfaces that already exist.

The validation strategy should include:

- verifying that persisted product/BOM data remains intact through the migration path,
- verifying backup export/import compatibility for the existing `DatabaseBackup` shape,
- verifying that declaration and frontend-facing BOM contract surfaces remain consistent,
- and verifying that rollback readiness is preserved through a reviewed backup and validation path.

This ADR does not prescribe a specific implementation tool or code path; it defines the architectural expectation that validation must be completed before the migration is accepted.

---

## Future Compatibility

This decision is intended to preserve future compatibility by making the migration boundary explicit.

The approach supports:

- future compiler-safe internal naming changes,
- future contract review without implicit data loss,
- future backup and restore validation,
- and future rollback review with explicit evidence.

The ADR does not assume that the public contract must change merely because the internal representation changes.

---

## Approval Section

This ADR is a design decision record for review and approval.

Required approval inputs:

- repository-backed review of the current `UnitConfig` persistence path,
- review of the backup and restore contract,
- review of the frontend declaration and BOM contract surfaces,
- and final enterprise approval of the migration approach before implementation.

### Approval Status

- Status: Proposed
- Technical Review: Required
- Enterprise Review: Required
- Implementation Authorization: Pending approval
