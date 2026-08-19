# P2-WP-ENV-004 — Backup Compatibility Design

**Project:** Gujarat Art & Craft ERP  
**Phase:** 2 – Runtime Development  
**Work Package:** P2-WP-ENV-004  
**Document Type:** Backup Compatibility Design  
**Status:** Approved  
**Version:** 1.0

---

# Purpose

This document defines the backup compatibility strategy for the reserved-keyword migration of `UnitConfig`.

Its objective is to ensure that existing database backups, import/export operations, JSON structures, and recovery procedures remain compatible throughout the migration lifecycle.

This document is architecture and design documentation for the current enterprise review cycle and is not an implementation authorization.

No implementation is authorized by this document.

---

# Scope

This document covers:

- Database backup compatibility
- Import compatibility
- Export compatibility
- JSON compatibility
- Backup translation planning
- Recovery planning
- Validation fixtures

This document does NOT cover:

- Stable storage migration
- Candid compatibility
- Business logic
- Inventory calculations
- Production logic
- Finance calculations
- UI implementation

These subjects are documented separately.

---

# Background

The ERP currently supports complete database backup through:

- exportDatabase()
- importDatabase()

The exported backup contains ProductItem records which include BOMRequirement structures containing UnitConfig data.

Future runtime changes to UnitConfig must not invalidate existing backups.

---

# Design Objectives

The backup compatibility strategy shall:

- Preserve existing backups.
- Preserve import functionality.
- Preserve export functionality.
- Prevent data loss.
- Support future schema evolution.
- Provide recovery capability.
- Maintain deterministic behaviour.

---

# Existing Backup Architecture

Conceptually:

```
Runtime State

↓

exportDatabase()

↓

DatabaseBackup

↓

JSON

↓

Backup File
```

The backup currently represents runtime state.

---

# Future Backup Architecture

Future runtime changes must preserve backup usability.

Conceptually:

```
Runtime

↓

Compatibility Layer

↓

DatabaseBackup

↓

JSON

↓

Backup
```

Backup consumers should not require knowledge of runtime implementation details.

---

# Legacy Backup Format

Legacy backups conceptually contain:

- Products
- BOM Requirements
- Unit Configuration
- Customers
- Raw Materials
- Collections
- Employees
- Purchases
- Expenses
- Activity Logs

No assumptions shall be made regarding future field names.

---

# Proposed Compatibility Principle

Backup compatibility shall be maintained through explicit translation.

Conceptually:

```
Legacy Backup

↓

Validation

↓

Translation

↓

Runtime

↓

Translation

↓

Export
```

The runtime model and backup model should remain logically independent.

---

# Import Compatibility

Import processing shall conceptually follow:

```
Backup File

↓

Read

↓

Schema Detection

↓

Validation

↓

Translation

↓

Runtime Objects
```

Invalid backups must not modify runtime state.

---

# Export Compatibility

Export processing shall conceptually follow:

```
Runtime

↓

Translation

↓

DatabaseBackup

↓

Serialization

↓

Export File
```

Exports must remain internally consistent.

---

# JSON Translation Strategy

JSON translation shall preserve:

- identifiers
- ordering
- optional values
- numeric precision
- object hierarchy

Translation shall only affect structural compatibility where required.

Business values shall remain unchanged.

---

# Schema Version Detection

The compatibility layer shall support explicit schema identification.

Conceptually:

```
Incoming Backup

↓

Detect Version

↓

Select Translation Strategy

↓

Validation

↓

Runtime
```

The version detection mechanism shall be finalized during implementation.

---

# Legacy Translation Rules

Legacy backup records shall be translated individually.

Conceptually:

```
Legacy Record

↓

Validation

↓

Field Translation

↓

Runtime Record
```

Translation shall never modify business values.

---

# New Backup Generation

New runtime objects shall be translated before export.

Conceptually:

```
Runtime

↓

Translation

↓

Export Structure

↓

JSON
```

Generated backups shall remain deterministic.

---

# Partial Backup Handling

If required information is missing:

- validation shall fail;
- import shall terminate safely;
- runtime shall remain unchanged.

Partial imports are not permitted.

---

# Corrupted Backup Handling

If backup integrity cannot be verified:

- import shall abort;
- no runtime mutation shall occur;
- validation errors shall be reported.

Recovery shall rely on a verified backup.

---

# Local Storage Ownership

The browser may contain cached application state.

This document does not define local storage migration.

Local storage compatibility shall be documented independently.

Ownership of browser migration shall be explicitly assigned during implementation planning.

---

# Validation Fixtures

Validation should include representative fixtures covering:

- legacy backup
- proposed backup
- minimal backup
- maximum-size backup
- optional-field scenarios
- missing optional values
- invalid structures
- corrupted files

Fixtures shall be preserved for regression testing.

---

# Recovery Strategy

Recovery planning shall include:

- verified pre-upgrade backup
- validated export
- validated import
- deployment package
- recovery documentation

Recovery procedures shall always begin with backup validation.

---

# Data Integrity Rules

Backup compatibility shall preserve:

- Product identity
- Customer identity
- Raw Material identity
- BOM ordering
- Unit meaning
- Numeric values
- Optional values
- Collection history
- Employee history

Business calculations shall remain unchanged.

---

# Risks

The following risks remain:

- legacy schema assumptions
- future schema evolution
- malformed backups
- partial exports
- manual backup modification
- deployment sequencing

These risks shall be addressed during implementation.

---

# Dependencies

This document depends on:

- Stable Compatibility Design
- Candid Compatibility Design
- Dependency Map
- Implementation Plan
- Final Design Review
- Design Amendments

This document provides input for:

- Implementation Package
- Validation Package
- Deployment Planning

---

# Out of Scope

This document intentionally excludes:

- Stable migration implementation
- API implementation
- Frontend implementation
- Business rules
- Inventory calculations
- Production calculations
- Financial calculations

---

# Acceptance Criteria

Backup compatibility design shall be considered complete when:

- backup architecture is documented;
- import compatibility is documented;
- export compatibility is documented;
- JSON translation strategy is documented;
- schema detection concept is documented;
- recovery strategy is documented;
- validation fixtures are identified;
- outstanding risks are documented.

---

# Implementation Status

| Item                        | Status      |
| --------------------------- | ----------- |
| Backup Architecture         | Complete    |
| Import Compatibility        | Complete    |
| Export Compatibility        | Complete    |
| JSON Translation Strategy   | Complete    |
| Schema Detection Design     | Complete    |
| Recovery Planning           | Complete    |
| Validation Fixture Planning | Complete    |
| Code Changes                | Not Started |

---

# Approval Status

This document forms part of the enterprise design package.

Implementation is not authorized by this document.

Implementation authorization remains pending until Final Enterprise Review PASS and Design Approval.

- Overall Design Package approval
