# P2-WP-ENV-004 — Stable Compatibility Design

**Project:** Gujarat Art & Craft ERP  
**Phase:** 2 – Runtime Development  
**Work Package:** P2-WP-ENV-004  
**Document Type:** Stable Compatibility Design  
**Status:** Approved  
**Version:** 1.0

---

# Purpose

This document defines the stable-state compatibility strategy for the reserved-keyword migration of `UnitConfig`.

Its purpose is to ensure that future implementation preserves upgrade safety, stable-state integrity, rollback capability, and zero business-data loss.

This document is design documentation for the current enterprise review cycle and is not an implementation authorization.

No implementation is authorized by this document.

---

# Scope

This document covers only:

- Stable state compatibility
- Stable storage transition
- Runtime migration concept
- Upgrade validation
- Rollback planning

This document does NOT define:

- Business logic
- Inventory logic
- Production logic
- Finance logic
- UI behaviour
- API implementation
- Candid implementation
- Frontend implementation

Those are handled by separate design documents.

---

# Background

Current runtime contains a `UnitConfig` structure that includes fields using identifiers which may conflict with reserved keywords in the target Motoko compiler.

Example:

```motoko
public type UnitConfig = {
    label : Text;
    type : Text;
    symbol : Text;
    conversionToBase : ?Float;
};
```

The compiler no longer accepts this layout.

Therefore an upgrade-safe compatibility design is required.

---

# Design Objectives

The migration must satisfy the following goals.

- Preserve all existing business data.
- Preserve all BOM structures.
- Preserve all ProductItem records.
- Preserve upgrade safety.
- Prevent partial migrations.
- Support validation before runtime exposure.
- Allow rollback planning.
- Avoid business logic modifications.

---

# Legacy Stable Layout

Conceptually the existing runtime stores `UnitConfig` with the following structure.

| Field            | Description      |
| ---------------- | ---------------- |
| label            | Display label    |
| type             | Unit category    |
| symbol           | Unit symbol      |
| conversionToBase | Conversion ratio |

This represents the legacy stable layout.

No changes are performed by this document.

---

# Proposed Runtime Layout

The future runtime is expected to use internal identifiers that avoid reserved keywords.

Conceptually:

| Legacy Field     | Proposed Internal Field |
| ---------------- | ----------------------- |
| label            | unitLabel               |
| type             | unitType                |
| symbol           | symbol                  |
| conversionToBase | conversionToBase        |

These names are proposals only.

Final naming depends on implementation approval.

---

# Stable Compatibility Principle

Stable storage compatibility must be maintained through explicit translation.

The migration process must never directly reinterpret legacy data as the new runtime structure.

Instead:

Legacy Stable Data

↓

Migration Layer

↓

Validated Runtime Data

↓

Runtime Activation

---

# Stable Migration Model

Conceptual migration flow:

```
Legacy Stable Layout

↓

Read Legacy Data

↓

Translate Fields

↓

Validate Records

↓

Build New Runtime Objects

↓

Activate Runtime
```

The migration must complete successfully before the upgraded runtime becomes active.

---

# Translation Rules

Every legacy UnitConfig instance shall be translated individually.

Conceptually:

Legacy Record

↓

Field Mapping

↓

Runtime Record

No business values may change.

Only identifier names change.

The following properties must remain identical:

- display values
- quantities
- conversion ratios
- ordering
- references
- identifiers

---

# Product Compatibility

Every ProductItem containing BOM information must preserve:

- Product ID
- Product Name
- BOM order
- Material references
- Quantities
- Unit configuration values

No product calculations may change.

---

# BOM Compatibility

Every BOM entry must preserve:

- material references
- quantity
- unit meaning
- conversion values
- ordering

Migration must not alter production calculations.

---

# Stable Validation

Before runtime activation the implementation must verify:

- Record count matches.
- Product count matches.
- BOM count matches.
- No missing UnitConfig records.
- No duplicated records.
- No missing optional fields.
- No invalid conversion values.

Failure of any validation must stop the migration.

---

# Atomic Migration Requirement

Migration must be atomic.

Conceptually:

```
Read

↓

Translate

↓

Validate

↓

Commit
```

If validation fails:

```
Abort Upgrade

↓

Do Not Commit

↓

Preserve Existing Stable State
```

Partial migrations are not permitted.

---

# Upgrade Flow

Target upgrade sequence:

```
Existing Stable State

↓

Migration Begins

↓

Translation

↓

Validation

↓

Runtime Activation

↓

Normal Execution
```

Runtime activation must occur only after successful validation.

---

# Failure Handling

If translation fails:

- Runtime activation must not occur.
- Stable state must remain unchanged.
- Upgrade must terminate safely.
- Validation results should be available for investigation.

No partial runtime state is acceptable.

---

# Rollback Strategy

Rollback planning requires:

- Verified pre-upgrade backup
- Verified stable fixture
- Previous deployment package
- Compatibility review

Rollback must never assume that an older runtime can automatically interpret a newer stable layout.

Any rollback procedure must first validate storage compatibility.

---

# Stable Integrity Rules

Migration must preserve:

- Record identity
- Product identity
- BOM identity
- Material identity
- Array ordering
- Optional values
- Numeric precision
- Conversion values

Business behaviour must remain unchanged.

---

# Out of Scope

This document intentionally excludes:

- Candid compatibility
- Frontend compatibility
- Import/export compatibility
- JSON compatibility
- Local storage migration
- Generated declarations
- UI behaviour
- Backend business logic

Those subjects are covered by dedicated design documents.

---

# Risks

The following risks remain until additional design documents are completed:

- Candid compatibility
- Frontend payload compatibility
- Backup compatibility
- Import/export compatibility
- Local storage compatibility
- Production deployment validation

These risks are tracked separately.

---

# Dependencies

This document depends on:

- P2-WP-ENV-004 Architecture
- Dependency Map
- Implementation Plan
- Final Design Review
- Design Amendments

It also provides input for:

- Candid Compatibility Design
- Backup Compatibility Design
- Implementation Package

---

# Acceptance Criteria

Stable compatibility design shall be considered complete when:

- Stable transition strategy is documented.
- Legacy and proposed layouts are identified.
- Translation concept is defined.
- Validation strategy is documented.
- Atomic migration behaviour is documented.
- Rollback strategy is documented.
- Outstanding risks are identified.
- No implementation-specific logic is introduced.

---

# Implementation Status

| Item                    | Status      |
| ----------------------- | ----------- |
| Stable Layout Analysis  | Complete    |
| Proposed Runtime Layout | Complete    |
| Translation Concept     | Complete    |
| Validation Strategy     | Complete    |
| Atomic Migration Design | Complete    |
| Rollback Design         | Complete    |
| Code Changes            | Not Started |

---

# Approval Status

This document is part of the design package only.

Implementation is not authorized by this document.

Implementation authorization remains pending until Final Enterprise Review PASS and Design Approval.

- Overall Design Package approval
