# P2-WP-ENV-004 — Reserved Keyword Migration Implementation Plan

**Project:** Gujarat Art & Craft ERP  
**Phase:** 2 – Runtime Development  
**Work Package:** P2-WP-ENV-004  
**Status:** Approved  
**Version:** 1.0

---

This plan is a design-planning artifact for the current review cycle. Implementation remains blocked until Design Approval is complete and Final Enterprise Review passes.

# Current Compile Blocker

Motoko 0.16.3 rejects the `label` field declaration in `UnitConfig` in `backend/main.mo` because `label` is a reserved keyword. The affected current backend schema is:

```motoko
public type UnitConfig = {
  label : Text;
  type : Text;
  symbol : Text;
  conversionToBase : ?Float;
};
```

The backend cannot compile until the schema is redesigned and migrated safely.

---

# Reserved Keywords Found

| Identifier | Current use                                            | Status                                                    |
| ---------- | ------------------------------------------------------ | --------------------------------------------------------- |
| `label`    | `UnitConfig` field and frontend unit-display property  | Confirmed Motoko compile blocker                          |
| `type`     | `UnitConfig` field and frontend unit-category property | Requires reserved-word verification before implementation |

The implementation work package must validate the complete reserved-keyword list against the target Motoko compiler version before selecting final field names.

---

# Affected Files

The following files are confirmed or expected to participate in the migration:

| File                                                   | Relationship to `UnitConfig`                                                    | Planned action                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `backend/main.mo`                                      | Defines `UnitConfig`, `BOMRequirement`, and persisted product/BOM data          | Schema and compatibility work                           |
| `backend/migration.mo`                                 | Existing stable-state migration module; no `UnitConfig` model currently present | Extend only if upgrade migration requires it            |
| `frontend/src/backend.ts`                              | Generated/consumed backend API type containing unit configuration               | Regenerate or update after Candid contract is finalized |
| `frontend/src/backend.d.ts`                            | Backend declaration containing unit configuration                               | Regenerate or update after Candid contract is finalized |
| `frontend/src/declarations/backend.did.d.ts`           | Declared frontend Candid type surface                                           | Regenerate or update after Candid contract is finalized |
| `frontend/src/types/inventoryUnits.ts`                 | Frontend `UnitConfig` interface                                                 | Add compatibility mapping, if required                  |
| `frontend/src/utils/unitConfig.ts`                     | Creates, validates, and applies unit configurations                             | Add boundary translation, if required                   |
| `frontend/src/utils/bomMigrations.ts`                  | Creates version-2 BOM unit configurations                                       | Preserve old-format input support                       |
| `frontend/src/components/inventory/BOMUnitRow.tsx`     | Edits unit configuration fields                                                 | Keep frontend behavior and payload compatibility        |
| `frontend/src/components/inventory/CompactBOMCard.tsx` | Displays unit configuration fields                                              | Keep display compatibility                              |
| `frontend/src/pages/Inventory.tsx`                     | Creates, validates, displays, and persists BOM unit configurations              | Keep saved-data compatibility                           |
| `frontend/src/pages/ConsumptionLogs.tsx`               | Reads unit configuration for consumption records                                | Verify read compatibility                               |

`backend/storage.mo` is listed in the dependency map as a verification target but was not found in the current repository audit. It must not be assumed to exist or be changed without confirmation.

---

# Rename Strategy — Proposal Only

Internal Motoko fields should use non-reserved names, subject to compiler confirmation:

| Existing external name | Proposed internal Motoko name |
| ---------------------- | ----------------------------- |
| `label`                | `unitLabel`                   |
| `type`                 | `unitType`                    |
| `symbol`               | `symbol`                      |
| `conversionToBase`     | `conversionToBase`            |

This is not a finalized schema change for the current review package. The design must keep translation at explicit boundaries so legacy JSON and frontend payloads using `label` and `type` can continue to be accepted where required.

---

# Stable Migration Strategy

1. Record a representative stable-state fixture and backup before deployment.
2. Define explicit legacy stable types that retain the old record layout.
3. Define new runtime types using non-reserved internal field names.
4. During upgrade only, translate every persisted `UnitConfig` instance within product BOM data from the legacy type to the new type.
5. Preserve absent optional values, array ordering, product identifiers, and BOM quantities exactly.
6. Perform conversion fully before exposing the upgraded runtime state.
7. Verify the migrated state against the pre-upgrade fixture, then retain the fixture for rollback validation.

The migration must be atomic: a failed conversion must prevent deployment rather than leave a partially converted stable state.

---

# Rollback Strategy

- Do not deploy until compilation, upgrade simulation, backup-import, and frontend compatibility checks pass.
- Retain the previous canister version and a verified pre-upgrade backup.
- If validation fails before cutover, abort deployment and preserve the existing stable state.
- If a post-deployment rollback is necessary, restore the prior canister only with a compatibility-reviewed stable schema or restore from the verified backup; do not assume a new stable layout can be read by the prior runtime.
- Do not perform manual or partial stable-memory edits.

---

# Validation Checklist

- [ ] Confirm target Motoko reserved keywords, including `label` and `type`.
- [ ] Complete the `UnitConfig` dependency audit in backend, frontend, generated declarations, backups, imports, exports, and local storage.
- [ ] Compile the backend with the target Motoko version.
- [ ] Compile the migration module.
- [ ] Generate and inspect Candid and frontend declarations.
- [ ] Test an upgrade from a fixture containing legacy `UnitConfig` data.
- [ ] Verify products, BOM entries, optional values, and quantities after upgrade.
- [ ] Import an existing backup and export it again without data loss.
- [ ] Test legacy JSON/import payloads at the compatibility boundary.
- [ ] Test the existing frontend create, edit, display, and consumption flows.
- [ ] Run Docker, ICP, type, and deployment validation.
- [ ] Verify the rollback procedure using the preserved fixture and backup.

---

# Files That Will Be Modified

No files will be modified by this design work package.

For a later implementation phase, if and when authorization is granted following Final Enterprise Review and Design Approval, the final modification set will be selected from the affected-files table only after the dependency audit and Candid compatibility design are complete.

---

# Files That Will Not Be Modified

During this design work package, no runtime, frontend, deployment, backup, import/export, generated-type, or stable-storage file is modified.

The implementation package must also avoid unrelated business logic, production deployment configuration, and generated artifacts unless regeneration is required by a Candid contract change that is itself reviewed and approved.

---

# Approval Status

| Item                       | Status                    |
| -------------------------- | ------------------------- |
| Compile blocker identified | Confirmed                 |
| Reserved-keyword audit     | In progress               |
| Dependency map             | In progress               |
| Rename strategy            | Proposal pending approval |
| Stable migration strategy  | Proposal pending approval |
| Rollback strategy          | Proposal pending approval |
| Implementation             | Not started               |
