# P2-WP-ENV-004 — Candid Compatibility Design

**Project:** Gujarat Art & Craft ERP  
**Phase:** 2 – Runtime Development  
**Work Package:** P2-WP-ENV-004  
**Document Type:** Candid Compatibility Design  
**Status:** Approved  
**Version:** 1.0

---

# Purpose

This document defines the Candid compatibility strategy for the reserved-keyword migration of `UnitConfig`.

Its purpose is to ensure that backend API changes, generated declarations, frontend communication, and deployment remain compatible throughout the migration process.

This document contains architecture and compatibility design for the current enterprise review cycle and is not an implementation authorization.

No implementation is authorized by this document.

---

# Scope

This document covers only:

- Candid interface compatibility
- API contract compatibility
- Generated declaration compatibility
- Backend ↔ Frontend communication
- Translation boundary design
- API version planning

This document does NOT cover:

- Stable migration
- Business logic
- Inventory logic
- Finance logic
- Production logic
- UI implementation
- Import/export compatibility
- Local storage compatibility

Those subjects are documented separately.

---

# Background

The existing frontend communicates with the backend using Candid-generated interfaces.

Current payloads conceptually use:

```
label
type
symbol
conversionToBase
```

The proposed runtime intends to use internal identifiers such as:

```
unitLabel
unitType
symbol
conversionToBase
```

Changing field names directly changes the Candid interface.

Without a compatibility strategy, legacy clients would no longer communicate successfully with the upgraded backend.

---

# Design Objectives

The compatibility design must satisfy the following objectives:

- Prevent breaking existing clients unexpectedly.
- Preserve API consistency.
- Support controlled migration.
- Allow future schema evolution.
- Keep implementation isolated from business logic.
- Avoid undocumented contract changes.

---

# Existing Contract

Current communication is conceptually:

```
Frontend

↓

Generated Candid

↓

Backend

↓

Runtime
```

The frontend expects the existing contract.

---

# Proposed Runtime Contract

Future runtime may internally use non-reserved identifiers.

However, internal runtime representation must not automatically define the external API contract.

Internal models and external contracts should be treated independently.

---

# Compatibility Principle

The API contract must be explicitly designed.

Internal runtime naming alone must never determine external compatibility.

Conceptually:

```
Frontend

↓

Compatibility Layer

↓

Runtime Model
```

This boundary is responsible for translation.

---

# Compatibility Layer

The compatibility layer acts as the translation boundary between external requests and internal runtime objects.

Conceptual flow:

```
Legacy Request

↓

Validation

↓

Translation

↓

Runtime Model

↓

Business Logic

↓

Translation

↓

Legacy Response
```

No business logic belongs inside this layer.

---

# Request Translation

Incoming payloads shall be validated before translation.

Conceptually:

```
Incoming Request

↓

Validate

↓

Translate Fields

↓

Runtime Object
```

The translation process must preserve:

- values
- ordering
- optional fields
- numeric precision

Only identifier names may differ.

---

# Response Translation

Outgoing runtime objects shall pass through the compatibility boundary before being returned.

Conceptually:

```
Runtime Object

↓

Translate

↓

API Response
```

Internal implementation details must not leak through the API contract.

---

# Generated Declaration Strategy

Generated declaration files depend on the finalized Candid contract.

Therefore:

- No generated declaration shall be modified manually.
- No regeneration shall occur until the API contract is finalized.
- Generated artifacts shall always match the approved interface.

Examples include:

- backend.ts
- backend.d.ts
- backend.did
- backend.did.d.ts

---

# API Version Strategy

The migration must define a controlled API evolution strategy.

Possible approaches include:

- versioned interfaces
- compatibility endpoints
- transitional contracts

The final approach shall be selected during implementation approval.

This document does not mandate a specific implementation.

---

# Frontend Compatibility

Existing frontend behaviour must be preserved throughout migration.

Compatibility planning must ensure:

- create operations remain functional
- update operations remain functional
- display behaviour remains unchanged
- validation behaviour remains unchanged

Frontend modifications, if required, shall occur only after the API contract is finalized.

---

# Validation Requirements

Before deployment the following must be verified:

- Generated declarations match the approved contract.
- Legacy request payloads are handled correctly.
- Runtime translation succeeds.
- Responses remain valid.
- Optional fields remain intact.
- Existing screens continue to function.
- No unexpected contract changes exist.

---

# Error Handling

If a request cannot be translated successfully:

- Validation shall fail.
- Business logic shall not execute.
- Partial processing shall not occur.
- A controlled error shall be returned.

Unexpected runtime failures must not expose internal implementation details.

---

# Risks

The following risks remain until implementation:

- API evolution decisions
- Generated declaration synchronization
- Legacy client compatibility
- Mixed-version client support
- Deployment sequencing

These risks must be addressed before production deployment.

---

# Dependencies

This document depends on:

- Stable Compatibility Design
- Dependency Map
- Implementation Plan
- Final Design Review
- Design Amendments

This document provides input for:

- Backup Compatibility Design
- Implementation Package

---

# Out of Scope

This document intentionally excludes:

- Stable migration implementation
- Backup migration
- Import/export translation
- Local storage migration
- Runtime calculations
- Business rules
- Production logic
- Financial calculations

---

# Acceptance Criteria

Candid compatibility design shall be considered complete when:

- API boundary is documented.
- Compatibility layer is defined.
- Request translation is documented.
- Response translation is documented.
- Generated declaration strategy is documented.
- API version planning is documented.
- Validation requirements are documented.
- Outstanding risks are identified.

---

# Implementation Status

| Item                           | Status      |
| ------------------------------ | ----------- |
| Existing Contract Analysis     | Complete    |
| Proposed Runtime Contract      | Complete    |
| Compatibility Layer Design     | Complete    |
| Request Translation Design     | Complete    |
| Response Translation Design    | Complete    |
| Generated Declaration Strategy | Complete    |
| API Version Planning           | Complete    |
| Code Changes                   | Not Started |

---

# Approval Status

This document is part of the enterprise design package only.

Implementation is not authorized by this document.

Implementation authorization remains pending until Final Enterprise Review PASS and Design Approval.

- Overall Design Package approval
