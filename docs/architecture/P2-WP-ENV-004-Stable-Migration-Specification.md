# P2-WP-ENV-004 Stable Migration Specification

Status = Draft

Version = 1.0

# P2-WP-ENV-004 — Stable Migration Specification

**Project:** Gujarat Art & Craft ERP

**Phase:** P2 – Runtime Development

**Work Package:** P2-WP-ENV-004

**Document Type:** Enterprise Technical Specification

**Version:** 1.0

**Status:** Draft

---

# Purpose

This specification defines the enterprise-grade stable-state migration architecture required to safely resolve reserved keyword conflicts while preserving all existing production data.

This document supplements the existing architecture package by defining the migration design under review during the current enterprise review cycle.

This document is a technical design specification only and does not authorize implementation.

It authorizes no code changes.

## Repository Evidence Basis

This specification is grounded in the repository evidence currently present in the design package and source tree.

Verified repository evidence includes:

- `backend/main.mo` defines `UnitConfig`, `BOMRequirement`, `ProductItem`, and `DatabaseBackup`.
- `backend/main.mo` persists products through `productsList` and exports/imports them through `exportDatabase()` and `importDatabase()`.
- `frontend/src/types/inventoryUnits.ts` defines the frontend `UnitConfig` and `BOMEntryV2` shapes.
- `frontend/src/utils/unitConfig.ts` creates, validates, and applies `UnitConfig` values.
- `frontend/src/utils/bomMigrations.ts` migrates BOM entries to a V2 shape using `unitConfig` and local-storage migration state.

This specification therefore limits itself to statements that are supported by the repository evidence and the approved design package.

---

# Scope

This specification applies only to persistent backend data affected by the UnitConfig reserved keyword migration.

Included:

- Stable state
- Product BOM data
- UnitConfig persistence
- Stable upgrade process
- Stable migration lifecycle
- Migration validation
- Failure handling
- Rollback preconditions

Excluded:

- Business logic
- GST calculations
- Inventory calculations
- Production workflows
- Finance logic
- UI behaviour
- Authentication
- Authorization
- Reporting
- Performance optimisation

---

# Migration Objective

The migration shall replace internal Motoko reserved-keyword field names without changing functional behaviour.

The migration must preserve:

- Product data
- BOM data
- Unit configuration
- Quantities
- Conversion values
- Optional fields
- Stable identifiers
- Existing relationships

No business information may be lost.

---

# Legacy Stable Layout

Repository evidence confirms that the current backend schema contains the fields `label`, `type`, `symbol`, and `conversionToBase` in `backend/main.mo` and that these values are carried by BOM entries inside persisted product data.

The current repository therefore supports the following pre-upgrade facts:

- `UnitConfig` exists as a backend model.
- `BOMRequirement` contains `unitConfig : ?UnitConfig`.
- `ProductItem` contains `bom : [BOMRequirement]`.
- `DatabaseBackup` includes `productsList : [ProductItem]`.

No additional stable-layout assumptions are made beyond those supported by the repository evidence.

---

# Target Stable Layout

The repository evidence does not define the final compiler-safe internal field names for a future implementation. This specification therefore does not invent a target field layout beyond the requirement that the migration must preserve the existing data values and relationships while changing the internal representation in a manner approved by the compiler and the design package.

The specification only requires that:

- the persisted data values remain semantically intact,
- the migration preserves BOM relationships,
- backup and contract compatibility are handled through their own approved specifications.

---

# Stable Migration Ownership

Stable migration is owned exclusively by the backend migration layer.

Frontend components shall never perform stable-state migration.

Generated declarations shall never perform stable-state migration.

Import/export translation is defined separately.

---

# Migration Lifecycle

Migration occurs only during the approved upgrade process.

Conceptual lifecycle:

Existing Stable State

↓

Migration Runtime

↓

Validation

↓

Runtime Activation

No user requests may modify migrated state until validation completes.

---

# Migration Execution Rules

Migration executes once for each upgrade.

Migration must:

- Read legacy stable representation
- Translate each affected UnitConfig instance
- Preserve all unrelated data
- Validate conversion
- Publish upgraded runtime state

Migration must never partially publish converted data.

---

# Stable Variable Preservation

Migration shall preserve:

- Product identifiers
- Product ordering
- BOM ordering
- Quantities
- Optional values
- Null values
- Stable references
- Existing relationships

No implicit recalculation is permitted.

---

# Commit Semantics

Migration follows an all-or-nothing approach.

Conceptual flow:

Legacy State

↓

Translate

↓

Validate

↓

Commit

If validation fails:

Abort

No partially migrated stable state may become active.

---

# Atomic Migration Requirement

Migration is atomic.

Either:

Entire migration succeeds

OR

Entire migration fails.

Intermediate runtime states are prohibited.

---

# Validation Sequence

Migration validation shall confirm the repository-backed invariants that are directly observable in the source tree:

- The product count in the persisted product store remains unchanged.
- The BOM entry count for each product remains unchanged.
- Each `BOMRequirement` retains its `unitConfig` information where present.
- Existing `ProductItem` and `BOMRequirement` relationships remain intact.
- Existing identifiers and ordering remain intact.
- The backup payload remains compatible with the existing `DatabaseBackup` structure.

Validation failure prevents activation.

---

# Unsupported Assumptions

This specification does not assume:

- a new stable variable name outside the existing `productsList` model,
- a new backup schema beyond the existing `DatabaseBackup` shape,
- a new frontend contract shape beyond the current repository declarations.

---

# Failure Handling

If migration fails:

Stop migration immediately.

Do not continue runtime activation.

Do not expose partially migrated state.

Produce a migration failure report.

---

# Upgrade Flow

Conceptual upgrade flow:

Legacy Stable State

↓

Load

↓

Translate

↓

Validate

↓

Commit

↓

Activate Runtime

Each phase must complete successfully before the next begins.

---

# Rollback Preconditions

Rollback procedures are defined separately.

This specification defines only the conditions required before rollback may occur.

Rollback requires:

- Verified pre-upgrade backup
- Verified migration logs
- Validation results
- Approved recovery procedure

No rollback assumptions are permitted.

---

# Interaction with Backup System

Backup compatibility is specified separately.

This specification assumes:

Stable migration

≠

Backup translation

These are independent architectural concerns.

---

# Interaction with Candid Contract

Stable migration operates independently from wire compatibility.

Candid compatibility is defined in:

P2-WP-ENV-004-Candid-Contract-Specification.md

No wire-level assumptions are made here.

---

# Non-Goals

This specification does not define:

- API versioning
- Frontend translation
- Backup schema
- JSON compatibility
- Local storage migration
- Deployment automation

These are addressed by dedicated specifications.

---

# Enterprise Constraints

Migration must satisfy:

- Zero data loss
- Deterministic execution
- Repeatable behaviour
- Upgrade safety
- Rollback readiness
- Stable compatibility
- Auditability

---

# Acceptance Criteria

This specification is considered complete when:

- Stable migration ownership is defined.
- Migration lifecycle is documented.
- Legacy and target layouts are identified.
- Atomic migration rules are documented.
- Validation sequence is defined.
- Failure handling is defined.
- Upgrade flow is documented.
- Rollback preconditions are documented.
- Scope and non-goals are identified.

Completion of this document does not authorize implementation.

---

# Related Documents

- Stable Migration Architecture
- Dependency Map
- Implementation Plan
- Design Amendments
- Candid Contract Specification
- Backup Restore Specification
- Rollback Specification
- Design Approval

---

# Approval Status

| Item                           | Status                                                        |
| ------------------------------ | ------------------------------------------------------------- |
| Stable Migration Specification | Draft                                                         |
| Technical Review               | Repository-backed review completed; enterprise review pending |
| Enterprise Review              | Pending                                                       |
| Implementation Authorization   | Not Authorized                                                |
