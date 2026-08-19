# P2-WP-ENV-004 ADR — Backup and Restore Policy

**Status:** Proposed
**Version:** 1.0
**Date:** 2026-07-27
**Work Package:** P2-WP-ENV-004
**Project:** Gujarat Art & Craft ERP

---

## Context

The repository contains a backend backup and restore flow centered on the `DatabaseBackup` structure in [backend/main.mo](backend/main.mo). That backup contract carries persisted product and BOM data through `productsList`, which includes `ProductItem` and `BOMRequirement` entries that can carry `UnitConfig` values. The current architecture package also identifies migration, compatibility, and recovery concerns for the reserved-keyword transition.

This creates an architectural decision point: backup and restore policy must define how the repository’s existing persisted state is preserved, reviewed, and recovered across compatibility changes without relying on unsupported assumptions.

---

## Problem Statement

The repository evidence confirms that backup and restore are part of the persistence surface for product and BOM data, but the architecture package requires an explicit policy decision on how backup compatibility should be preserved during schema evolution.

The policy decision must address how existing backup content is treated when internal or contract-level changes are introduced, and how recovery remains trustworthy, reviewable, and safe.

---

## Current Repository State

The current repository evidence supports the following statements:

- [backend/main.mo](backend/main.mo) defines `DatabaseBackup`, `ProductItem`, `BOMRequirement`, and `UnitConfig`.
- The backup flow is implemented through `exportDatabase()` and `importDatabase()` in [backend/main.mo](backend/main.mo).
- The backup contract includes `productsList : [ProductItem]`, which means persisted BOM content is part of the backup surface.
- The frontend declaration and inventory surfaces consume BOM unit metadata, so backup compatibility is directly relevant to the existing product data flow.
- The repository architecture package identifies backup compatibility as a required review concern for the current migration work.

This ADR is limited to policy decisions and does not authorize implementation.

---

## Backup Lifecycle

The backup lifecycle is treated as an architectural concern that spans the full preservation and recovery path.

The policy establishes that backup handling should be reviewed across the following stages:

- creation of a backup from the current persisted state,
- retention of the backup as a reviewed artifact,
- validation of the backup structure and content,
- import and restore review,
- and recovery decision-making when compatibility or validation concerns arise.

The lifecycle is considered a controlled governance process rather than a series of ad hoc operations.

---

## Backup Version Compatibility

The repository evidence supports the principle that backup compatibility must be explicit and reviewable.

The policy decision is that:

- backup representations must be treated as versioned architectural artifacts,
- compatibility between versions must be evaluated before use,
- and unsupported or unknown versions must not be assumed to be safe for import or recovery.

This ADR does not define a specific serialization format or a new version number. It establishes that version compatibility is a required architectural decision and must be reviewed before a backup is accepted for restore.

---

## Validation Policy

Backup validation is a required design control.

The policy states that a backup must be validated before it is accepted as a recovery artifact. Validation should confirm that:

- the backup structure is recognizable and complete,
- the persisted product and BOM data expected by the repository model are present,
- the backup content remains consistent with the reviewed repository contract,
- and any compatibility translation or review boundary is explicitly understood.

Validation is required to preserve trust in backup content and to prevent unreviewed restoration decisions.

---

## Recovery Policy

Recovery policy is based on the principle that restore actions must be deliberate, validated, and reviewable.

The policy establishes that:

- recovery should only proceed when the backup has passed validation,
- the restore target is understood and compatible with the backup content,
- and the recovery path is treated as a governed decision rather than a routine operation.

The ADR does not authorize partial or manual restoration actions. It establishes that restore decisions must be evidence-based and aligned with the reviewed backup contract.

---

## Operational Considerations

Operationally, backup and restore policy must be treated as a governance concern that spans review, retention, and recovery readiness.

The architecture decision requires that:

- backup artifacts be retained long enough to support review and recovery decisions,
- restore review be performed before execution,
- and the backup/restore process remain aligned with the repository’s product, BOM, and contract model.

Operationally, the policy does not prescribe specific tooling, scripts, or deployment steps; it defines the architectural expectations for how the backup process should be governed.

---

## Risks

- If backup compatibility is not explicitly reviewed, restore actions may risk data misinterpretation.
- If validation is not performed, the recovery process may be based on unverified content.
- If version assumptions are not documented, future recovery could become ambiguous.
- If the backup contract and runtime contract diverge without review, business data may be exposed to compatibility risk.

---

## Consequences

### Positive consequences

- Backup and restore remain reviewable and controlled.
- Recovery decisions are less likely to rely on undocumented assumptions.
- The architecture remains aligned with the repository’s persisted product and BOM structures.
- The policy supports safer migration and compatibility review.

### Negative consequences

- The process requires explicit review discipline.
- Backup handling cannot be treated as a casual or implicit operation.
- Recovery decisions may be delayed if validation or compatibility review is incomplete.

---

## Validation Strategy

Validation must be repository-backed and evidence-based.

The validation strategy should include:

- confirming that backup content continues to align with the current repository contract for persisted product and BOM data,
- validating that backup artifacts are structurally recognizable and reviewable,
- confirming that compatibility decisions are made before restore execution,
- and ensuring that recovery decisions remain tied to the reviewed backup contract rather than assumptions.

This ADR does not define implementation testing procedures; it defines the required architectural validation expectation.

---

## Future Compatibility

This policy is intended to preserve future compatibility by making backup handling explicit and reviewable.

The approach supports:

- future backup version review,
- future restore planning during schema evolution,
- and clearer governance for migration-related compatibility changes.

The ADR does not assume that future backup formats can be imported without review.

---

## Approval Status

This ADR is a design decision record for review and approval.

### Approval Status

- Status: Proposed
- Technical Review: Required
- Enterprise Review: Required
- Implementation Authorization: Pending approval
