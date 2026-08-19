# P2-WP-ENV-004 — Candid Contract Specification

**Project:** Gujarat Art & Craft ERP

**Phase:** P2 – Runtime Development

**Work Package:** P2-WP-ENV-004

**Document Type:** Enterprise Technical Specification

**Version:** 1.0

**Status:** Draft

---

# Purpose

This specification defines the enterprise-level Candid contract compatibility strategy required to safely migrate internal Motoko reserved-keyword fields while preserving API stability wherever possible.

This document resolves the enterprise review finding that the wire-level compatibility contract had not yet been formally defined.

This document defines architecture and design guidance for the current review cycle and does not authorize implementation.

No implementation is authorized.

## Repository Evidence Basis

This specification is limited to repository-backed statements. Verified repository evidence includes:

- `frontend/src/backend.ts` and `frontend/src/backend.d.ts` expose `BOMRequirement` fields including `unitConfig`, `qtyPerUnit`, `legacyUnit`, `qtyPerUnitBase`, and `schemaVersion`.
- `docs/architecture/P2-WP-ENV-004-Candid-Contract-Specification.md` states that current frontend implementations exchange `UnitConfig` data using the legacy field names.
- `backend/main.mo` defines the backend `UnitConfig` and `BOMRequirement` model that the frontend declarations mirror.

The specification therefore focuses on compatibility requirements that are directly supported by the current repository contract and the approved design package.

---

# Scope

Included:

- Candid interface strategy
- API compatibility
- Wire contract ownership
- Request compatibility
- Response compatibility
- Generated declaration lifecycle
- Frontend/backend compatibility
- Versioning principles
- Translation ownership
- Validation requirements

Excluded:

- Stable storage migration
- Backup translation
- Local storage migration
- Business logic
- Runtime implementation
- UI changes
- Deployment

---

# Objective

The migration shall isolate compiler-required internal field changes from the external API contract whenever technically possible.

Consumers of the backend should experience the minimum practical disruption.

---

# Existing API Contract

Repository evidence shows that the current frontend declaration surfaces carry BOM fields that include `unitConfig` and related unit metadata. The approved design package also states that current frontend implementations exchange `UnitConfig` data using the legacy field names.

The current repository therefore supports the following compatibility requirement:

- Any compatibility strategy must preserve the existing field names and payload semantics unless an explicit contract change is approved.

---

# Target Runtime Contract

The repository evidence does not define a finalized compiler-safe runtime field naming scheme. This specification therefore does not assume a new public contract shape. It only requires that any future internal field-name change be evaluated through a compatibility review before it becomes part of the public contract.

The supporting requirement is:

- Internal runtime representation must not become the public compatibility contract without explicit review.

---

# Compatibility Principle

Internal runtime models and external API contracts are independent architectural concerns.

Changing an internal field name does not automatically require exposing the same change through the public interface.

---

# Wire Contract Ownership

The backend owns the Candid contract.

Frontend applications consume the contract.

Generated declarations mirror the approved contract.

Translation responsibilities must be explicitly assigned and documented.

---

# Versioning Strategy

This specification defines architectural principles only.

The implementation phase shall determine whether compatibility is achieved through:

- Non-breaking interface evolution
- Versioned service methods
- Transitional compatibility layer
- Explicit API versioning

The selected strategy must be approved before implementation.

---

# Translation Boundary

If translation becomes necessary, it shall occur only at approved architectural boundaries.

Possible boundaries include:

- Backend request translation
- Backend response translation
- Dedicated compatibility layer

Translation ownership shall never be assumed.

---

# Breaking Change Policy

A field rename shall be considered a breaking API change unless an approved compatibility strategy prevents client impact.

No breaking changes may be introduced without explicit approval.

---

# Generated Declaration Strategy

Generated declarations are derived artifacts.

They shall only be regenerated after:

- Contract approval
- Compatibility approval
- Architecture approval

Manual edits to generated declarations are prohibited unless explicitly approved.

---

# Frontend Compatibility

Frontend compatibility shall be validated separately from stable migration.

Validation shall include:

- Existing request payloads
- Existing response handling
- Generated declaration usage
- Type compatibility
- Runtime compatibility

---

# Mixed Client Policy

During migration planning, coexistence of legacy and updated clients shall be evaluated.

The architecture shall explicitly define whether mixed-client support is:

- Required
- Transitional
- Unsupported

No assumptions shall be made.

---

# Compatibility Validation

Validation shall confirm the repository-backed contract surfaces that currently exist:

- Request compatibility for BOM payloads that include `unitConfig` and related unit fields.
- Response compatibility for the same `BOMRequirement`/`ProductItem` shapes used by the frontend declarations.
- Generated declaration consistency between `frontend/src/backend.ts` and `frontend/src/backend.d.ts`.
- Frontend type compatibility for the existing `UnitConfig` usage in inventory and consumption flows.
- Backend model compatibility for the `UnitConfig` and `BOMRequirement` definitions in `backend/main.mo`.

---

# Unsupported Assumptions

This specification does not assume:

- a new public field name without approval,
- a new generated declaration source beyond the current backend/frontend contract,
- an implementation strategy that bypasses the existing contract review process.

---

# Failure Handling

If compatibility validation fails:

Stop implementation.

Do not deploy.

Produce a compatibility report.

Resolve architecture before continuing.

---

# Relationship to Stable Migration

Stable migration and wire compatibility are separate architectural concerns.

Stable migration changes persistence.

Candid compatibility governs communication.

Neither substitutes for the other.

---

# Relationship to Backup Compatibility

Backup compatibility is defined independently.

No backup assumptions are made by this specification.

---

# Non-Goals

This specification does not define:

- Stable actor layout
- Migration execution
- JSON schema
- Backup format
- Rollback execution
- Local storage migration
- Deployment procedures

---

# Enterprise Constraints

The architecture must preserve:

- API consistency
- Type safety
- Deterministic behavior
- Upgrade readiness
- Auditability
- Compatibility review

---

# Acceptance Criteria

This specification is complete when:

- Wire contract ownership is defined.
- Compatibility principles are documented.
- Versioning strategy is identified.
- Translation ownership is defined.
- Breaking-change policy is documented.
- Generated declaration lifecycle is documented.
- Validation requirements are defined.
- Failure handling is documented.

Completion of this document does not authorize implementation.

---

# Related Documents

- Stable Migration Architecture
- Stable Migration Specification
- Dependency Map
- Implementation Plan
- Backup Restore Specification
- Rollback Specification
- Design Approval

---

# Approval Status

| Item                          | Status                                                        |
| ----------------------------- | ------------------------------------------------------------- |
| Candid Contract Specification | Draft                                                         |
| Technical Review              | Repository-backed review completed; enterprise review pending |
| Enterprise Review             | Pending                                                       |
| Implementation Authorization  | Not Authorized                                                |
