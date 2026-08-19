# P2-WP-ENV-004 — Rollback Specification

**Project:** Gujarat Art & Craft ERP

**Phase:** P2 – Runtime Development

**Work Package:** P2-WP-ENV-004

**Document Type:** Enterprise Technical Specification

**Version:** 1.0

**Status:** Draft

---

# Purpose

This specification defines the enterprise rollback architecture for the reserved-keyword migration.

Its purpose is to ensure that every migration failure can be handled safely without risking production data integrity.

This document defines rollback architecture for the current review cycle and does not authorize implementation.

No implementation is authorized.

## Repository Evidence Basis

This specification is grounded in the repository evidence currently present in the design package and source tree.

Verified repository evidence includes:

- `backend/main.mo` provides `exportDatabase()` and `importDatabase()` for backup and restore operations.
- `backend/main.mo` defines `DatabaseBackup`, `ProductItem`, `BOMRequirement`, and `UnitConfig`.
- The approved design package identifies backup and stable migration as separate concerns that require explicit validation and recovery controls.

The rollback specification therefore limits itself to recovery requirements that are directly supported by the repository evidence and the approved design package.

---

# Scope

Included

- Upgrade rollback
- Recovery strategy
- Backup restoration
- Migration failure handling
- Rollback ownership
- Validation requirements
- Recovery approval
- Production protection

Excluded

- Stable migration implementation
- Candid compatibility
- Backup implementation
- Business logic
- UI behaviour
- Deployment scripts
- Runtime implementation

---

# Objective

Every failed migration shall have a predefined recovery path.

Rollback architecture must prevent:

- Data loss
- Partial migration
- Partial activation
- Undefined runtime state
- Production corruption

---

# Rollback Philosophy

Rollback is a recovery process.

Rollback is NOT:

- Re-running migration
- Editing stable memory
- Manual data repair
- Partial recovery

Rollback restores a previously validated production state.

---

# Rollback Ownership

Rollback is owned by the backend deployment and recovery process.

Frontend applications shall never participate in rollback.

Generated declarations shall never participate in rollback.

---

# Rollback Preconditions

Rollback may begin only when the repository-backed recovery prerequisites are available:

- A verified backup produced through the existing `exportDatabase()` flow.
- A validated backup payload that contains the expected `DatabaseBackup` structure.
- Verified recovery procedure and authorization.
- Sufficient evidence that the current runtime state can be restored without introducing partial state.

Without these prerequisites, rollback shall not proceed.

---

# Rollback Scenarios

## Scenario A — Failure Before Migration Commit

Conceptual flow:

Upgrade

↓

Migration

↓

Validation Failure

↓

Abort Upgrade

↓

Existing Stable State Remains Active

No rollback restoration is required because the migrated state was never committed.

---

## Scenario B — Failure After Runtime Activation

Conceptual flow:

Upgrade Completed

↓

Runtime Validation Failure

↓

Production Recovery Required

↓

Reinstall Approved Runtime

↓

Restore Verified Backup

↓

Validation

↓

Runtime Activation

The previous binary alone must not be assumed capable of reading the upgraded stable layout.

---

## Scenario C — Backup Validation Failure

Conceptual flow:

Restore Requested

↓

Backup Validation Failure

↓

Abort Restore

↓

Retain Existing Runtime

↓

Generate Recovery Report

No production overwrite is permitted.

---

# Recovery Workflow

Conceptual sequence:

Production Issue

↓

Incident Declaration

↓

Recovery Approval

↓

Runtime Isolation

↓

Verified Backup Restore

↓

Validation

↓

Production Activation

Every stage must complete successfully before continuing.

---

# Migration Relationship

Rollback architecture is independent from migration execution.

Migration performs conversion.

Rollback performs recovery.

Neither replaces the other.

---

# Backup Relationship

Rollback depends on verified backups.

Backups remain the authoritative recovery source.

Rollback shall never assume stable memory can always be reused safely.

---

# Stable State Protection

Rollback shall preserve:

- Stable identifiers
- Product records
- BOM records
- Unit configuration
- Financial records
- Inventory records
- Audit records

No selective restoration is permitted.

---

# Partial Rollback Policy

Partial rollback is prohibited.

Either:

Entire recovery succeeds

OR

Recovery is aborted.

Mixed production states are prohibited.

---

# Validation Requirements

Recovery validation shall verify the repository-backed structures that are present in the current source tree:

- Product record counts and `productsList` integrity.
- BOM integrity for each `ProductItem` and its `BOMRequirement` entries.
- `unitConfig` presence and value preservation where BOM entries require it.
- Stable identifiers and relationships.
- Backup/restore compatibility through the `DatabaseBackup` structure.
- Backend availability after recovery.

Validation failure prevents production activation.

---

# Unsupported Assumptions

This specification does not assume:

- direct editing of stable memory as a recovery mechanism,
- partial recovery of a subset of records,
- recovery without a validated backup.

---

# Failure Handling

If rollback validation fails:

Stop recovery immediately.

Do not activate runtime.

Preserve diagnostic information.

Generate recovery report.

Escalate for investigation.

---

# Audit Requirements

Every rollback shall produce:

- Timestamp
- Recovery reason
- Backup version
- Validation result
- Recovery outcome
- Failure reason (if applicable)

Audit logging requirements are architectural only.

---

# Human Approval Gate

Rollback requires explicit human approval.

Automated rollback without authorization is prohibited unless separately approved by enterprise operational policy.

---

# Recovery Readiness

Recovery readiness requires:

- Verified backups
- Tested recovery procedure
- Approved rollback plan
- Documented validation
- Recovery ownership

---

# Non-Goals

This specification does not define:

- Stable migration logic
- API compatibility
- Backup serialization
- Frontend behaviour
- Deployment automation
- Runtime implementation

---

# Enterprise Constraints

Rollback architecture shall guarantee:

- Zero intentional data loss
- Deterministic recovery
- Complete validation
- Auditability
- Operational safety
- Production protection

---

# Acceptance Criteria

This specification is complete when:

- Rollback ownership is defined.
- Recovery scenarios are documented.
- Recovery workflow is documented.
- Stable-state protection is defined.
- Validation requirements are documented.
- Failure handling is defined.
- Human approval gate is documented.
- Enterprise constraints are identified.

Completion of this document does not authorize implementation.

---

# Related Documents

- Stable Migration Architecture
- Stable Migration Specification
- Candid Contract Specification
- Backup Restore Specification
- Dependency Map
- Design Approval

---

# Approval Status

| Item                         | Status                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| Rollback Specification       | Draft                                                         |
| Technical Review             | Repository-backed review completed; enterprise review pending |
| Enterprise Review            | Pending                                                       |
| Implementation Authorization | Not Authorized                                                |
