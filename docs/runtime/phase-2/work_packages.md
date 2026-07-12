# Gujarat Art & Craft ERP
## Phase 2 — Work Package Backlog

This backlog outlines the scheduled implementation work packages (P2-WP-007A through P2-WP-015) for Phase 2, maintaining clean architecture boundaries, safe migration gates, and emergency security remediation priority.

---

## 1. Definition of Done (DoD) Requirements
Every work package listed in this backlog must satisfy the following criteria before it can be accepted as complete and merged:
- **TypeScript check passes:** Execution of `npm run typescript-check` exits with code 0 and zero errors.
- **Unit tests pass:** All new and existing unit tests pass cleanly using `npm run test`.
- **Production build passes:** Vite production build (`vite build`) completes successfully.
- **Relevant regression tests pass:** All manual test scripts mapped to affected workflows in the regression matrix are verified.
- **Runtime/browser integration is validated:** Real interaction testing inside the browser passes successfully.
- **Git diff is reviewed:** The pull request/git diff contains only relevant modifications with zero style or comment churn.
- **User approval is received:** Explicit verification and sign-off are provided by the user.

---

## 2. Work Packages Backlog

### P2-WP-007A: Password Recovery Emergency Hardening
* **Work Package ID:** P2-WP-007A
* **Objective:** Secure the anonymous password recovery endpoint to prevent account hijacking of privileged accounts.
* **Scope:** Refactor `resetPasswordWithVerification` in `main.mo`. Block password updates for `#Admin` and `#MasterAdmin` accounts via this public path, requiring manual console updates, or introduce multi-party cryptographic signature validation.
* **Out of Scope:** Modifying non-auth business logic.
* **Files Likely Affected:**
  - `backend/main.mo`
* **Dependencies:** None.
* **Risk Level:** **High** (Core security change)
* **Migration Requirements:** Canister code upgrade verification.
* **Testing Requirements:** Try to trigger resetPasswordWithVerification anonymously for the `"admin"` account; verify it is blocked.
* **Definition of Done:** Satisfies all standard DoD requirements.

---

### P2-WP-007B: Master Admin Deployment Configuration
* **Work Package ID:** P2-WP-007B
* **Objective:** Extract the bootstrap admin profile credentials from canister source code literals into stable storage configuration variables.
* **Scope:** Store Master Admin profile data (name, username) in canister stable storage variables set during initialization (`init` or configuration upgrades); clean out hardcoded string literals.
* **Out of Scope:** Restructuring permissions definitions.
* **Files Likely Affected:**
  - `backend/main.mo`
* **Dependencies:** `P2-WP-007A`
* **Risk Level:** **Medium**
* **Migration Requirements:** State initialization validation.
* **Testing Requirements:** Verify the system initializes `"admin"` details dynamically and blocks renaming queries.
* **Definition of Done:** Satisfies all standard DoD requirements.

---

### P2-WP-001: Automated Test Foundation
* **Work Package ID:** P2-WP-001
* **Status:** **Prematurely attempted during an unauthorized Phase 2.1 execution. These work packages are not accepted as complete and remain pending formal implementation review.**
* **Objective:** Establish the testing infrastructure to validate frontend calculations and backend logic.
* **Scope:** Configure Vitest runner in `frontend/package.json`. Write unit test suites for `calculations.ts` and `candidHelpers.ts`. Configure exit-code checking in pull request validation scripts.
* **Out of Scope:** Playwright E2E browser tests; backend Motoko tests.
* **Files Likely Affected:**
  - `frontend/package.json`
  - `frontend/vite.config.js`
  - `frontend/src/utils/calculations.test.ts`
* **Dependencies:** None.
* **Risk Level:** **Low**
* **Migration Requirements:** None.
* **Testing Requirements:** Vitest runs must pass type-checks with exit code 0.
* **Rollback Plan:** Revert dependency changes in `package.json`.
* **Definition of Done:** Satisfies all standard DoD requirements.

---

### P2-WP-002: Centralized Query Key Factory & Cache Cleanup
* **Work Package ID:** P2-WP-002
* **Status:** **Prematurely attempted during an unauthorized Phase 2.1 execution. These work packages are not accepted as complete and remain pending formal implementation review.**
* **Objective:** Centralize React Query key array templates to manage cache lifecycle and security.
* **Scope:** Create `queryKeys.ts`. Refactor query references in `useQueries.ts` and `useActor.ts` to call this factory. Add `queryClient.clear()` execution on logout in `AuthGuard.tsx`.
* **Out of Scope:** Refactoring individual query functions.
* **Files Likely Affected:**
  - `frontend/src/hooks/queryKeys.ts`
  - `frontend/src/hooks/useQueries.ts`
  - `frontend/src/components/AuthGuard.tsx`
* **Dependencies:** `P2-WP-001`
* **Risk Level:** **Low**
* **Migration Requirements:** None.
* **Testing Requirements:** Verify logout immediately empties cache queries.
* **Definition of Done:** Satisfies all standard DoD requirements.

---

### P2-WP-003: Candid/Domain Mapper Layer
* **Work Package ID:** P2-WP-003
* **Status:** **Prematurely attempted during an unauthorized Phase 2.1 execution. These work packages are not accepted as complete and remain pending formal implementation review.**
* **Objective:** Encapsulate candid-to-domain translations (handling bigints, lists, and dates) in a dedicated utility layer.
* **Scope:** Create `candidMappers.ts` to map Motoko optional values and list representations to TypeScript schemas.
* **Out of Scope:** Canister schema alterations.
* **Files Likely Affected:**
  - `frontend/src/utils/candidMappers.ts`
  - `frontend/src/utils/candidHelpers.ts`
* **Dependencies:** `P2-WP-001`
* **Risk Level:** **Low**
* **Migration Requirements:** None.
* **Testing Requirements:** Unit tests mapping optional arrays to primitives.
* **Definition of Done:** Satisfies all standard DoD requirements.

---

### P2-WP-004: Repository & Data Adapter Layer
* **Work Package ID:** P2-WP-004
* **Status:** **Prematurely attempted during an unauthorized Phase 2.1 execution. These work packages are not accepted as complete and remain pending formal implementation review.**
* **Objective:** Decouple React Query state queries from direct actor interface queries.
* **Scope:** Create repository classes (`InvoiceRepository`, `InventoryRepository`, `UserRepository`) representing the canister database, calling mappings under the hood.
* **Out of Scope:** Rewriting frontend component views.
* **Files Likely Affected:**
  - `frontend/src/repositories/invoiceRepository.ts`
  - `frontend/src/repositories/inventoryRepository.ts`
  - `frontend/src/hooks/useQueries.ts`
* **Dependencies:** `P2-WP-002`, `P2-WP-003`
* **Risk Level:** **Medium**
* **Migration Requirements:** None.
* **Testing Requirements:** Mock repositories to return test data seeds.
* **Definition of Done:** Satisfies all standard DoD requirements.

---

### P2-WP-005: Centralized Error Model
* **Work Package ID:** P2-WP-005
* **Status:** **Prematurely attempted during an unauthorized Phase 2.1 execution. These work packages are not accepted as complete and remain pending formal implementation review.**
* **Objective:** Standardize backend trap handling and convert them into readable UI alerts.
* **Scope:** Create an error handler class to intercept canister exceptions, log audit events, and map errors (e.g. `Access denied` or `User already exists`) to UI notifications.
* **Out of Scope:** Backend warning logs modifications.
* **Files Likely Affected:**
  - `frontend/src/utils/errors.ts`
  - `frontend/src/components/AuthGuard.tsx`
* **Dependencies:** `P2-WP-001`
* **Risk Level:** **Low**
* **Migration Requirements:** None.
* **Testing Requirements:** Trigger fake canister failures, verify the errors format nicely in UI toasts.
* **Definition of Done:** Satisfies all standard DoD requirements.

---

### P2-WP-006: Service-Layer Extraction
* **Work Package ID:** P2-WP-006
* **Objective:** Extract calculations and formatting logic out of React component views into a stateless service layer.
* **Scope:** Migrate subtotal, tax, rounding, and delay checks out of page files (`CreateInvoice.tsx`, `JobWork.tsx`) into independent utility services.
* **Out of Scope:** Changing financial rounding formulas.
* **Files Likely Affected:**
  - `frontend/src/services/calculationService.ts`
  - `frontend/src/pages/CreateInvoice.tsx`
  - `frontend/src/pages/JobWork.tsx`
* **Dependencies:** `P2-WP-001`, `P2-WP-004`
* **Risk Level:** **Medium**
* **Migration Requirements:** None.
* **Testing Requirements:** Run unit tests comparing service totals with component results.
* **Definition of Done:** Satisfies all standard DoD requirements.

---

### P2-WP-008: Vendor Metadata Canister Migration
* **Work Package ID:** P2-WP-008
* **Objective:** Migrate master vendor accounts from browser `localStorage` to canister stable memory.
* **Scope:** Declare the `Vendor` stable map in `main.mo`. Implement CRUD endpoints on the canister. Write a migration helper to backup browser listings and sync them to the canister.
* **Out of Scope:** Deleting legacy local storage files before verification.
* **Files Likely Affected:**
  - `backend/main.mo`
  - `frontend/src/hooks/useQueries.ts`
  - `frontend/src/utils/masterData.ts`
* **Dependencies:** `P2-WP-007B`
* **Risk Level:** **High**
* **Migration Requirements:** Export vendors to JSON; run sync script; verify counts.
* **Rollback Plan:** Revert canister code and write back JSON backup to local storage.
* **Definition of Done:** Satisfies all standard DoD requirements.

---

### P2-WP-009: Raw Material Metadata Canister Migration
* **Work Package ID:** P2-WP-009
* **Objective:** Migrate raw material operational details (warehouse location, rack indices, alert thresholds) to canister stable maps.
* **Scope:** Upgrade `RawMaterial` record structure in `main.mo`. Add migration sync script reading browser settings and dual-writing them to canister properties.
* **Out of Scope:** Inventory quantity recalculations.
* **Files Likely Affected:**
  - `backend/main.mo`
  - `frontend/src/hooks/useQueries.ts`
  - `frontend/src/utils/masterData.ts`
* **Dependencies:** `P2-WP-007B`
* **Risk Level:** **High**
* **Migration Requirements:** Backup raw material metadata; run canister migration; verify fields.
* **Definition of Done:** Satisfies all standard DoD requirements.

---

### P2-WP-010: Legacy taxId Compatibility Layer
* **Work Package ID:** P2-WP-010
* **Objective:** Create a dual-read parser to handle both structured fields and historical pipe-delimited `taxId` strings.
* **Scope:** Create `taxIdAdapter.ts`. Upgrade GST and invoice history pages to use this adapter, parsing older records transparently while reading structured fields from new records.
* **Out of Scope:** Deleting the `taxId` field on old records.
* **Files Likely Affected:**
  - `frontend/src/utils/taxIdAdapter.ts`
  - `frontend/src/pages/GstReports.tsx`
  - `frontend/src/pages/InvoiceHistory.tsx`
  - `frontend/src/pages/ViewInvoice.tsx`
* **Dependencies:** `P2-WP-006`
* **Risk Level:** **Medium**
* **Migration Requirements:** None.
* **Testing Requirements:** Feed legacy formatted strings into the adapter and check if output matches expected properties.
* **Definition of Done:** Satisfies all standard DoD requirements.

---

### P2-WP-011: Authoritative Backend Financial Validation
* **Work Package ID:** P2-WP-011
* **Objective:** Enforce server-side calculation and validation of previous dues, advances, and invoice totals.
* **Scope:** Refactor `saveInvoice` on the canister to recalculate previous dues and advance balances dynamically from history, rather than accepting client-submitted snapshot arguments.
* **Out of Scope:** Changing tax calculation formulas.
* **Files Likely Affected:**
  - `backend/main.mo`
  - `frontend/src/pages/CreateInvoice.tsx`
* **Dependencies:** `P2-WP-007A`, `P2-WP-010`
* **Risk Level:** **High** (Modifies invoice save endpoint)
* **Migration Requirements:** None.
* **Testing Requirements:** Submit an invoice with wrong totals from a mock client; verify canister traps the request.
* **Definition of Done:** Satisfies all standard DoD requirements.

---

### P2-WP-012: Inventory & Production Posting Verification
* **Work Package ID:** P2-WP-012
* **Objective:** Enforce transactional verification on stock level adjustments during Karigar collections.
* **Scope:** Audit stock movement registers inside `main.mo` and ensure that stock additions/reductions are verified against Job Work allocations, blocking unallocated changes.
* **Out of Scope:** Modifying raw material purchase orders.
* **Files Likely Affected:**
  - `backend/main.mo`
  - `frontend/src/pages/Collections.tsx`
* **Dependencies:** `P2-WP-011`
* **Risk Level:** **Medium**
* **Migration Requirements:** None.
* **Testing Requirements:** Submit a collection that exceeds the assigned Job Work quantity; verify it is blocked.
* **Definition of Done:** Satisfies all standard DoD requirements.

---

### P2-WP-013: Reporting Consistency Hardening
* **Work Package ID:** P2-WP-013
* **Objective:** Ensure date filters and ledger totals are consistent across UI views, CSV exports, and printable sheets.
* **Scope:** Align parameters in `Ledger.tsx` and `ProfitLoss.tsx`. Update the CSV exporter to apply formula-safe escaping (preventing spreadsheet injection by escaping `=` characters).
* **Out of Scope:** PDF rendering styles redesign.
* **Files Likely Affected:**
  - `frontend/src/utils/masterData.ts`
  - `frontend/src/pages/Ledger.tsx`
  - `frontend/src/pages/ProfitLoss.tsx`
* **Dependencies:** `P2-WP-006`
* **Risk Level:** **Medium**
* **Migration Requirements:** None.
* **Testing Requirements:** Export ledger containing sample formulas; check if CSV has safe escape prefixes.
* **Definition of Done:** Satisfies all standard DoD requirements.

---

### P2-WP-014: Performance Measurement & Optimization
* **Work Package ID:** P2-WP-014
* **Objective:** Address heap memory consumption by capping logs and paginating large canister queries.
* **Scope:** Replace activity log linked lists with a bounded map or circular buffer. Add limit/offset parameters to `getInvoices` and `getStockMovementHistory` endpoints.
* **Out of Scope:** Virtualizing UI tables.
* **Files Likely Affected:**
  - `backend/main.mo`
  - `frontend/src/hooks/useQueries.ts`
* **Dependencies:** `P2-WP-007A`
* **Risk Level:** **Medium**
* **Migration Requirements:** None.
* **Testing Requirements:** Verify canister heap usage bounds under benchmark queries.
* **Definition of Done:** Satisfies all standard DoD requirements.

---

### P2-WP-015: Production Readiness Audit
* **Work Package ID:** P2-WP-015
* **Objective:** Final verification gate before releasing Phase 2 build packages.
* **Scope:** Execute full staging upgrades dry-runs. Compare Candid signature diffs. Review linting compliance.
* **Out of Scope:** Development of new features.
* **Files Likely Affected:** None.
* **Dependencies:** All prior work packages.
* **Risk Level:** **Low**
* **Migration Requirements:** Final check.
* **Testing Requirements:** Full regression matrix check.
* **Definition of Done:** Satisfies all standard DoD requirements.
