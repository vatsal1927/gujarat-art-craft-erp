# P2-WP-ENV-004 — Backup Restore Specification

**Project:** Gujarat Art & Craft ERP

**Phase:** P2 – Runtime Development

**Work Package:** P2-WP-ENV-004

**Document Type:** Enterprise Technical Specification

**Version:** 1.0

**Status:** Draft

---

# Purpose

This specification defines the enterprise-grade backup, restore, import, and export compatibility architecture required for the reserved-keyword migration.

Its purpose is to ensure that schema evolution never results in data loss and that backup compatibility remains controlled throughout the migration lifecycle.

This document is an architectural design specification for the current enterprise review cycle and does not authorize implementation.

No implementation is authorized.

## Repository Evidence Basis

This specification is grounded in the repository evidence currently present in the design package and source tree.

Verified repository evidence includes:

- `backend/main.mo` defines `DatabaseBackup`, `ProductItem`, `BOMRequirement`, and `UnitConfig`.
- `backend/main.mo` implements `exportDatabase()` and `importDatabase()`.
- The backup contract carries `productsList : [ProductItem]` and therefore includes persisted BOM data.
- The frontend uses `unitConfig` and `qtyPerUnitBase` in BOM entries through the declaration and UI layers.

The specification therefore limits itself to backup and restore requirements that are directly supported by the repository evidence.

---

# Scope

Included

- Database backup
- Database restore
- Import compatibility
- Export compatibility
- JSON schema compatibility
- Schema version identification
- Translation ownership
- Recovery procedures
- Validation
- Audit requirements

Excluded

- Stable migration implementation
- Candid compatibility
- Business logic
- UI behaviour
- Authentication
- Deployment
- Runtime implementation

---

# Objective

The migration shall preserve compatibility with existing backups wherever technically possible.

The architecture shall define a controlled translation process between legacy and future backup formats.

---

# Existing Backup Architecture

Current repository evidence shows that backup functionality is implemented through `exportDatabase()` and `importDatabase()` in `backend/main.mo` and that these functions operate on `DatabaseBackup`, which includes `productsList : [ProductItem]`.

This means the backup contract already covers persisted product BOM data, including any `BOMRequirement` entries that carry `unitConfig` values.

No undocumented backup fields are assumed in this specification.

---

# Backup Architecture Principles

The backup system shall guarantee:

- Complete data preservation
- Deterministic serialization
- Deterministic restoration
- Upgrade safety
- Recovery readiness
- Auditability

---

# Legacy Backup Format

The current production backup format represents Version 1.

Conceptually:

Version 1 Backup

↓

DatabaseBackup

↓

Legacy UnitConfig

↓

Legacy field names

No modification of legacy backup files shall occur.

---

# Target Backup Format

Future runtime may internally store compiler-safe field names.

Backup compatibility must remain explicitly defined.

Conceptually:

Runtime Model

↓

Translation

↓

Backup Representation

Internal runtime structures must not automatically become backup format.

---

# Version Identification

Every backup architecture shall define a version identifier.

Conceptual flow:

Backup File

↓

Version Detection

↓

Compatibility Decision

↓

Translation (if required)

↓

Import

Unknown versions shall never be imported automatically.

---

# Import Flow

Conceptual architecture:

Backup File

↓

Version Validation

↓

Schema Validation

↓

Translation

↓

Integrity Validation

↓

Import

Each stage must complete successfully before the next begins.

---

# Export Flow

Conceptual architecture:

Runtime State

↓

Validation

↓

Translation

↓

Serialization

↓

Export

Export shall never expose incomplete runtime data.

---

# Translation Ownership

Translation is owned exclusively by the backend import/export layer.

Frontend applications shall never translate backup files.

Generated declarations shall never own backup translation.

---

# Compatibility Rules

Import shall support only approved backup versions.

Export shall generate only approved backup versions.

Backward compatibility requirements must be explicitly documented.

Forward compatibility shall never be assumed.

---

# Partial Backup Handling

If a backup contains:

- Missing fields
- Unknown fields
- Corrupted sections
- Invalid schema
- Invalid versions

Import shall stop.

Partial restoration is prohibited.

---

# Corrupted Backup Handling

Corrupted backups shall:

- Fail validation
- Produce a validation report
- Preserve existing runtime data
- Never overwrite production state

---

# Local Storage Relationship

Local storage compatibility is an independent concern.

Ownership shall be documented separately.

No assumptions shall be made within this specification.

---

# Validation Requirements

Validation shall verify the repository-backed structures that are present in the current source tree:

- Backup version and backup payload shape.
- The presence of `productsList` and the `ProductItem`/`BOMRequirement` structures it contains.
- The presence of `unitConfig` data where BOM entries are present.
- Product and BOM counts remain consistent with the restored payload.
- Stable identifiers and relationships remain intact.
- Required and optional fields required by the current `DatabaseBackup` shape remain present.

---

# Unsupported Assumptions

This specification does not assume:

- a new backup table or separate `UnitConfig` store,
- a new serialization schema beyond the current `DatabaseBackup` contract,
- a recovery path that bypasses validation.

---

# Recovery Strategy

Recovery requires:

Verified Backup

↓

Validation

↓

Restore

↓

Validation

↓

Runtime Activation

No production activation shall occur until validation succeeds.

---

# Failure Handling

If any validation step fails:

Stop restoration immediately.

Do not partially restore data.

Generate a recovery report.

Preserve current runtime state.

---

# Audit Requirements

Every backup operation shall produce:

- Operation timestamp
- Backup version
- Validation result
- Import/export result
- Failure reason (if applicable)

Audit requirements are architectural only.

---

# Relationship to Stable Migration

Stable migration changes runtime persistence.

Backup compatibility governs serialized backup data.

These concerns remain independent.

---

# Relationship to Candid Contract

Backup compatibility does not define API compatibility.

Wire contract decisions are documented separately.

---

# Non-Goals

This specification does not define:

- Stable migration execution
- Candid API
- UI behaviour
- Deployment
- Runtime implementation
- Docker deployment
- ICP deployment

---

# Enterprise Constraints

Backup architecture shall guarantee:

- Zero data loss
- Deterministic recovery
- Validation before restore
- Version awareness
- Auditability
- Upgrade readiness

---

# Acceptance Criteria

This specification is complete when:

- Legacy backup architecture is identified.
- Target backup architecture is identified.
- Import flow is documented.
- Export flow is documented.
- Translation ownership is defined.
- Version identification is documented.
- Validation requirements are defined.
- Recovery strategy is documented.
- Failure handling is documented.

Completion of this document does not authorize implementation.

---

# Related Documents

- Stable Migration Architecture
- Stable Migration Specification
- Candid Contract Specification
- Rollback Specification
- Dependency Map
- Design Approval

---

# Approval Status

| Item                         | Status                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| Backup Restore Specification | Draft                                                         |
| Technical Review             | Repository-backed review completed; enterprise review pending |
| Enterprise Review            | Pending                                                       |
| Implementation Authorization | Not Authorized                                                |
