# P2-WP-ENV-004 ADR — Rollback Policy

**Status:** Proposed
**Version:** 1.0
**Date:** 2026-07-27
**Work Package:** P2-WP-ENV-004
**Project:** Gujarat Art & Craft ERP

---

## Context

The repository architecture package identifies rollback and recovery as required concerns for the reserved-keyword migration work. The repository evidence also shows that backup and restore are already part of the persisted data surface through [backend/main.mo](backend/main.mo), where `exportDatabase()` and `importDatabase()` operate on `DatabaseBackup`, `ProductItem`, `BOMRequirement`, and `UnitConfig`.

This creates an architectural decision point: rollback policy must define how recovery is governed when migration or compatibility validation fails, while remaining consistent with the repository’s documented backup and restore surface.

---

## Problem Statement

The repository evidence confirms that migration and persistence changes are connected to backup and restore behavior, but the architecture package requires an explicit policy decision on rollback authority and recovery handling. The policy must ensure that recovery is controlled, reviewable, and tied to verified backup content rather than improvised runtime action.

The decision required is how rollback should be authorized, executed, and validated without introducing unsupported implementation behavior.

---

## Current Repository State

The current repository evidence supports the following statements:

- [backend/main.mo](backend/main.mo) defines the persisted data model for `DatabaseBackup`, `ProductItem`, `BOMRequirement`, and `UnitConfig`.
- The repository includes backup and restore functions through `exportDatabase()` and `importDatabase()` in [backend/main.mo](backend/main.mo).
- The design package identifies backup compatibility, stable migration, and rollback readiness as review concerns for the current migration work.
- No implementation or deployment authorization is included in this ADR; the document is limited to architecture decision-making.

---

## Rollback Authority

Rollback authority is treated as an architectural governance concern rather than a runtime implementation detail.

The policy decision is that rollback should only be initiated through an approved recovery path that is aligned with the reviewed backup and restore contract. The frontend, generated declarations, and migration logic are not designated as rollback authorities in this ADR.

The decision is intentionally limited to policy: rollback is a recovery decision that must be authorized through the established review and recovery process.

---

## Rollback Workflow

The rollback workflow is defined as a controlled recovery process that proceeds only when the required preconditions are understood and reviewed.

The expected workflow is:

1. Detect that recovery is required.
2. Preserve the current situation and prevent unreviewed action.
3. Confirm that a reviewed backup artifact exists.
4. Validate the backup and recovery path.
5. Approve the recovery decision through the designated review process.
6. Restore the previously validated state through the approved backup and restore boundary.
7. Revalidate the restored state before considering recovery complete.

This ADR does not prescribe implementation steps, deployment actions, or runtime behavior.

---

## Rollback Validation Gates

Rollback must pass explicit validation gates before it is accepted as a recovery action.

The policy requires that the following gates be satisfied:

- recovery is necessary and clearly understood,
- a reviewed backup artifact exists and is recognized,
- the backup content is compatible with the reviewed repository contract,
- the recovery path remains aligned with the documented backup/restore surface,
- and the restored state can be reviewed before recovery is considered complete.

If a gate fails, rollback must not proceed.

---

## Backup Dependency

Rollback depends on the repository’s backup and restore architecture.

The policy decision is that rollback must not be treated as a standalone recovery mechanism. It depends on the existence of a validated backup artifact and the reviewed backup contract represented in [backend/main.mo](backend/main.mo). The ADR therefore treats backup as the authoritative recovery dependency and does not assume any alternative recovery path.

---

## Recovery Checkpoints

Recovery checkpoints are the review points at which the recovery path is verified before progression.

The required checkpoints are:

- checkpoint before recovery is authorized,
- checkpoint after recovery content is validated,
- and checkpoint after the restored state is reviewed for consistency with the repository-backed contract.

These checkpoints provide architectural control and preserve reviewability, but they do not authorize implementation or deployment.

---

## Risks

- Recovery may be delayed if backup validation is incomplete.
- Unsupported assumptions about the backup format could undermine rollback confidence.
- If rollback authority is not clearly defined, recovery actions may become inconsistent.
- If the recovery path is not reviewed, the restored state may not match the intended repository contract.

---

## Consequences

### Positive consequences

- Recovery becomes more controlled and reviewable.
- Rollback decisions are tied to backup evidence rather than improvisation.
- The architecture remains aligned with the repository’s persistence and backup surface.
- Migration-related recovery is easier to govern during review.

### Negative consequences

- Recovery requires explicit discipline and review.
- Rollback cannot be treated as an automatic or informal action.
- Some recovery decisions may be delayed until validation and review are complete.

---

## Validation Strategy

Validation must remain evidence-based and repository-backed.

The validation strategy should include:

- confirming that the rollback policy is aligned with the repository’s backup/restore contract,
- confirming that recovery checkpoints are tied to reviewed backup content,
- confirming that rollback authority is governed by review rather than ad hoc action,
- and ensuring that any recovery decision remains consistent with the approved architecture package.

This ADR does not define implementation tests or deployment procedures; it defines the architectural validation expectation.

---

## Future Compatibility

This policy is designed to support future compatibility by making rollback explicit and reviewable.

The approach supports:

- future recovery review as the repository contract evolves,
- future backup compatibility review without assuming automatic recoverability,
- and future migration resilience through explicit recovery governance.

The ADR does not assume that rollback will succeed without validation or review.

---

## Approval Status

This ADR is a design decision record for review and approval.

### Approval Status

- Status: Proposed
- Technical Review: Required
- Enterprise Review: Required
- Implementation Authorization: Pending approval
