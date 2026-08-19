# P2-WP-ENV-004 Dependency Map

**Status:** Verified from repository evidence

## Purpose

This document records the repository-verified dependency surface for the `UnitConfig` type used by the product BOM workflow.

No source code was modified while completing this review. The update is limited to this documentation file.

---

## Summary

Repository evidence confirms that `UnitConfig` is a real backend and frontend data shape used for BOM unit metadata. The current repository shows:

- a backend definition in `backend/main.mo`
- a frontend TypeScript interface in `frontend/src/types/inventoryUnits.ts`
- BOM-oriented validation, creation, and migration helpers in `frontend/src/utils/unitConfig.ts` and `frontend/src/utils/bomMigrations.ts`
- persisted product BOM data flowing through product storage, backup export/import, and local-storage migration logic

The dependency map is therefore complete for the repository surfaces that currently reference `UnitConfig`.

---

## Source Type

`UnitConfig`

Verified fields from repository evidence:

- `label`
- `type`
- `symbol`
- `conversionToBase`

Verified definitions:

- Backend definition: `backend/main.mo`
- Frontend definition: `frontend/src/types/inventoryUnits.ts`

---

## Files Reviewed

- `backend/main.mo`
- `backend/migration.mo`
- `frontend/src/backend.ts`
- `frontend/src/backend.d.ts`
- `frontend/src/types/inventoryUnits.ts`
- `frontend/src/utils/unitConfig.ts`
- `frontend/src/utils/bomMigrations.ts`
- `frontend/src/pages/Inventory.tsx`
- `frontend/src/components/inventory/BOMUnitRow.tsx`
- `frontend/src/components/inventory/CompactBOMCard.tsx`
- `frontend/src/pages/ConsumptionLogs.tsx`
- `docs/architecture/P2-WP-ENV-004-Candid-Contract-Specification.md`
- `docs/architecture/P2-WP-ENV-004-Backup-Restore-Specification.md`
- `docs/architecture/P2-WP-ENV-004-Final-Design-Review.md`
- `docs/architecture/P2-WP-ENV-004-Implementation-Plan.md`

---

## Dependencies Verified

| Area                             | Exact file(s)                                                                                                                         | Exact model / type                                                                                              | How `UnitConfig` is used                                                                                                                                                                                                                                       | Migration impact |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Backend data model               | `backend/main.mo`                                                                                                                     | `public type UnitConfig`, `public type BOMRequirement`, `public type ProductItem`, `public type DatabaseBackup` | `UnitConfig` is declared with `label`, `type`, `symbol`, and `conversionToBase`; `BOMRequirement` contains `unitConfig : ?UnitConfig`; `ProductItem` stores `bom : [BOMRequirement]`; `DatabaseBackup` includes `productsList : [ProductItem]`.                | High             |
| Backend migration module         | `backend/migration.mo`                                                                                                                | `ProductItem_Old`, `ProductItem_New`, `BOMRequirement`                                                          | The migration module exists for stable-state upgrade shape changes, but the repository evidence shows no `UnitConfig`-specific type or translation logic in this file. Product migration currently creates new product records without a `UnitConfig` payload. | Medium           |
| Frontend type contract           | `frontend/src/types/inventoryUnits.ts`                                                                                                | `interface UnitConfig`, `interface BOMEntryV2`                                                                  | The frontend defines the TypeScript shape used by BOM entries and UI components. `BOMEntryV2` carries `qtyPerUnit`, `unitConfig`, `legacyUnit`, `qtyPerUnitBase`, and `schemaVersion`.                                                                         | Low              |
| Unit-config utilities            | `frontend/src/utils/unitConfig.ts`                                                                                                    | `createUnitConfig`, `validateUnitConfig`, `applyUnitToBOM`                                                      | These helpers create default unit configs from legacy values, validate compatibility against the raw material base type, and convert BOM rows into a V2 shape using `unitConfig` and `qtyPerUnitBase`.                                                         | Low              |
| Inventory page persistence       | `frontend/src/pages/Inventory.tsx`                                                                                                    | `BOMRow`, `ProductItem`                                                                                         | The inventory page constructs BOM rows with `unitConfig`, validates them before save, and applies the unit config into BOM entries for product persistence.                                                                                                    | Medium           |
| BOM row editor                   | `frontend/src/components/inventory/BOMUnitRow.tsx`                                                                                    | React component                                                                                                 | The row editor renders and edits `label`, `type`, `symbol`, `qtyPerUnit`, and the `unitConfig` object for each BOM entry.                                                                                                                                      | Low              |
| BOM summary card                 | `frontend/src/components/inventory/CompactBOMCard.tsx`                                                                                | React component                                                                                                 | The card reads `schemaVersion`, `qtyPerUnit`, `unitConfig`, and `conversionToBase` to calculate required quantities and display units.                                                                                                                         | Low              |
| Consumption logging              | `frontend/src/pages/ConsumptionLogs.tsx`                                                                                              | runtime rendering logic                                                                                         | Consumption logs use `req.unitConfig.conversionToBase` and `req.unitConfig.symbol` when `schemaVersion === 2`.                                                                                                                                                 | Low              |
| Generated API declarations       | `frontend/src/backend.ts`, `frontend/src/backend.d.ts`                                                                                | `BOMRequirement`, `ProductItem`                                                                                 | These generated declaration surfaces expose `qtyPerUnit`, `unitConfig`, `legacyUnit`, `qtyPerUnitBase`, and `schemaVersion` on `BOMRequirement`, so the frontend contract carries the same unit-config fields.                                                 | Medium           |
| Backup and restore               | `backend/main.mo` (`exportDatabase`, `importDatabase`)                                                                                | `DatabaseBackup`, `ProductItem`, `BOMRequirement`                                                               | The backup flow serializes and restores `productsList` through `DatabaseBackup`, so any persisted BOM entry containing `UnitConfig` is part of the backup contract.                                                                                            | High             |
| Import / export compatibility    | `docs/architecture/P2-WP-ENV-004-Backup-Restore-Specification.md`, `docs/architecture/P2-WP-ENV-004-Candid-Contract-Specification.md` | design specifications                                                                                           | The repository design docs explicitly state that backup and Candid compatibility must preserve existing data and contract behavior while translating between legacy and future representations.                                                                | High             |
| Local storage / client migration | `frontend/src/utils/bomMigrations.ts`, `frontend/src/mockBackend.ts`                                                                  | `mock_products`, `mock_inventory_schema_version`                                                                | The repository contains an explicit local-storage migration path that migrates BOM entries to a V2 shape using `unitConfig` and stores `mock_inventory_schema_version = "2"`.                                                                                  | Medium           |
| Stable persisted state           | `backend/main.mo`                                                                                                                     | `productsList`, `productCount`                                                                                  | The backend persists `productsList` as an array of `ProductItem` in `DatabaseBackup` and rehydrates it via `importDatabase`. There is no separate stable variable named `UnitConfig` in the repository source.                                                 | High             |

---

## Stable Variables

Verified from repository evidence:

| Stable variable / persisted store        | Uses `UnitConfig` | Verified repository finding                                                                                                                                     |
| ---------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `productsList`                           | Yes               | `backend/main.mo` stores `productsList : [ProductItem]` and `ProductItem` contains `bom : [BOMRequirement]`, which in turn contains `unitConfig : ?UnitConfig`. |
| `mock_products` (frontend local storage) | Yes               | `frontend/src/utils/bomMigrations.ts` and `frontend/src/pages/Inventory.tsx` operate on `mock_products` and migrate BOM entries to a V2 `unitConfig` shape.     |
| `mock_inventory_schema_version`          | Yes               | `frontend/src/utils/bomMigrations.ts` uses this key to mark BOM unit migration completion.                                                                      |

---

## Product Models

Verified from repository evidence:

| Model            | Exact file                                                                | Verified usage of `UnitConfig`                                                                                            |
| ---------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `BOMRequirement` | `backend/main.mo`, `frontend/src/backend.ts`, `frontend/src/backend.d.ts` | Contains `unitConfig : ?UnitConfig` in the backend and optional `unitConfig` fields in the frontend declaration surfaces. |
| `ProductItem`    | `backend/main.mo`, `frontend/src/backend.ts`, `frontend/src/backend.d.ts` | Contains `bom : [BOMRequirement]`, so any product record can carry `UnitConfig`-backed BOM entries.                       |
| `BOMEntryV2`     | `frontend/src/types/inventoryUnits.ts`                                    | Frontend-specific model for V2 BOM entries that includes `unitConfig` and `qtyPerUnitBase`.                               |

---

## Database Backup

Verified from repository evidence:

- `backend/main.mo` defines `DatabaseBackup` with `productsList : [ProductItem]`.
- `exportDatabase()` serializes `productsList` into the backup payload.
- `importDatabase()` restores the same `productsList` array back into runtime state.
- Because `ProductItem.bom` contains `BOMRequirement` and that structure carries `unitConfig`, backup compatibility is directly relevant to `UnitConfig`.

Migration impact: High.

---

## Import / Export

Verified from repository evidence:

- `exportDatabase()` and `importDatabase()` are implemented in `backend/main.mo`.
- The backup contract includes product and BOM data, not a separate `UnitConfig` table.
- The repository design documents explicitly require backup compatibility and translation review for this migration path.

Migration impact: High.

---

## Candid Interface

Verified from repository evidence:

- The repository design document `docs/architecture/P2-WP-ENV-004-Candid-Contract-Specification.md` states that current frontend implementations exchange `UnitConfig` data using legacy field names.
- `frontend/src/backend.ts` and `frontend/src/backend.d.ts` expose `BOMRequirement` fields that include `unitConfig`, `qtyPerUnit`, `legacyUnit`, `qtyPerUnitBase`, and `schemaVersion`.
- The repository therefore confirms that the Candid-facing declaration surface is part of the dependency map even though no runtime Candid implementation change was made during this review.

Migration impact: High.

---

## Frontend

Verified from repository evidence:

- `frontend/src/types/inventoryUnits.ts` defines the shared frontend `UnitConfig` model.
- `frontend/src/utils/unitConfig.ts` creates, validates, and applies unit-config data.
- `frontend/src/pages/Inventory.tsx` uses the helpers while editing and saving BOM rows.
- `frontend/src/components/inventory/BOMUnitRow.tsx` and `frontend/src/components/inventory/CompactBOMCard.tsx` render and consume the data.
- `frontend/src/pages/ConsumptionLogs.tsx` uses the V2 conversion fields for display logic.

Migration impact: Low to Medium depending on the specific surface, with the inventory-save path ranked Medium because it persists BOM data.

---

## Local Storage

Verified from repository evidence:

- `frontend/src/utils/bomMigrations.ts` uses `localStorage` keys such as `mock_products` and `mock_inventory_schema_version` to migrate BOM entries to a V2 structure.
- `frontend/src/pages/Inventory.tsx` also reads and writes product data through local storage-backed mock data layers.
- This is the repository’s explicit client-side persistence migration path for BOM unit data.

Migration impact: Medium.

---

## API Layer

Verified from repository evidence:

- The backend exposes `getProducts()` and `saveProduct()` in `backend/main.mo`.
- The frontend declaration files `frontend/src/backend.ts` and `frontend/src/backend.d.ts` expose the `BOMRequirement`/`ProductItem` contract used by the UI.
- This API layer is therefore part of the dependency surface because it carries BOM data with `UnitConfig` fields.

Migration impact: Medium.

---

## Tests

Verified from repository evidence:

- No repository source files under `backend/`, `frontend/src/`, or `docs/architecture/` were found to contain UnitConfig-specific automated tests.
- The current repository evidence therefore does not show dedicated test coverage for this dependency surface.

Migration impact: None.

---

## Remaining Considerations

No unresolved dependency items remain for the repository surfaces that currently reference `UnitConfig`.

The remaining uncertainty in the repository is architectural rather than evidentiary: the design documents discuss future migration and compatibility decisions, but the source tree already confirms the current dependency locations, shapes, and persistence paths.

---

## Documentation Updated

This document was updated to replace all placeholder and pending wording with repository-verified findings.

The update includes:

- verified file-level dependency mapping
- verified model/type identification
- verified usage descriptions for `UnitConfig`
- verified migration-impact classification for each dependency area
- a consistent final status based on repository evidence

---

## Overall Status

Verified from repository evidence.
