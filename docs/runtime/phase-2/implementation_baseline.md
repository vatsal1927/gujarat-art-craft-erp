# Gujarat Art & Craft ERP
## Phase 2.0 — Implementation Baseline and Safety Gate Audit

This document establishes the runtime baseline, toolchain status, endpoint authorization inventory, query key structures, and high-risk migration register for the enterprise system before beginning Phase 2 runtime coding.

---

## 1. Runtime Baseline Audit

The following table summarizes the findings identified during the Phase 2.0 audit of the Motoko backend and React/TypeScript frontend.

| Finding ID | Severity | Affected Files | Business Impact | Security/Data Impact | Recommended Work Package |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **P2-FIND-001** | **High** | [main.mo](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/backend/main.mo) (L764, L1008, L1144, L1421-1426) | Modifying user names or usernames of the bootstrap admin breaks system integrity or triggers auto-demotion. | Hardcoded Master Admin name (`"Vatsal Dholariya"`) and username (`"admin"`) prevent dynamic ownership transfer or configuration updates. | `P2-WP-007B` (Master Admin Deployment Configuration) |
| **P2-FIND-002** | **Critical** | [main.mo](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/backend/main.mo) (L1691-1740) | Critical Security Risk — Independently Verified Code Path; Practical Exploit Reproduction Pending. | `resetPasswordWithVerification` allows *any* anonymous caller to override user credentials if username, email, and mobile values are known. | `P2-WP-007A` (Password Recovery Emergency Hardening) |
| **P2-FIND-003** | **High** | [masterData.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/utils/masterData.ts)<br>[useQueries.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/hooks/useQueries.ts) (L1800-1833) | Clearing browser cache permanently deletes all vendor listings, bank details, and payment histories. | Vendor profiles exist only on the client side in `localStorage`. Gaps in multi-user sync occur between devices. | `P2-WP-008` (Vendor Metadata Migration) |
| **P2-FIND-004** | **High** | [masterData.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/utils/masterData.ts)<br>[useRawMaterialForm.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/hooks/useRawMaterialForm.ts) | Clearing browser cache deletes rack locations, warehouses, and stock alert levels. | Raw material operational parameters are stored in `localStorage` under `mock_raw_materials_metadata` and merged on the fly. | `P2-WP-009` (Raw Material Metadata Migration) |
| **P2-FIND-005** | **Medium** | [calculations.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/utils/calculations.ts) (L55-137)<br>[CreateInvoice.tsx](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/pages/CreateInvoice.tsx) | Potential ledger discrepancies if client calculations filter incomplete local query datasets. | Outstanding dues and advance balances are derived client-side and saved into the canister without backend validation. | `P2-WP-011` (Authoritative Backend Financial Validation) |
| **P2-FIND-006** | **Medium** | [calculations.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/utils/calculations.ts)<br>[CreateInvoice.tsx](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/pages/CreateInvoice.tsx) | Delimiter collisions or formatting changes instantly break outstanding balance calculations and reports. | Multi-attribute metadata is serialized as a pipe-delimited string in the customer's `taxId` property. | `P2-WP-010` (Legacy taxId Compatibility Layer) |
| **P2-FIND-007** | **Medium** | [AuthGuard.tsx](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/components/AuthGuard.tsx) (L1013-1029) | Page reloads after a delay; queries could remain in memory and be accessed if JS execution is hijacked. | Logout relies on a page reload to dump memory cache, without calling `queryClient.clear()` explicitly. | `P2-WP-002` (Query Key Factory & Cache Cleanup) |

---

### Detailed Findings Audit

#### P2-FIND-001: Hardcoded Master Admin Identity in Canister
* **Finding ID:** P2-FIND-001
* **Severity:** High
* **Evidence:** `main.mo` hardcodes `"admin"` and `"Vatsal Dholariya"` in functions `verifyMasterAdminIntegrity()` (L764), `enforceSingleMasterAdminPolicyCanister()` (L1008), `registerOrGetSelf()` (L1144), and `editUser()` (L1421, L1424).
* **Current Behavior:** Single admin enforcement logic automatically demotes any other `#Admin` user if their username is not `"admin"`. Re-naming is blocked by trapping (`Cannot rename Master Admin`).
* **Business Impact:** Admin profile details cannot be modified via standard UI settings without deploying canister code updates.
* **Security/Data Impact:** Identity validation relies on code literals rather than stable storage configuration variables.
* **Recommended Work Package:** `P2-WP-007B` (Master Admin Deployment Configuration)
* **Prerequisites:** Stable configuration mapping layer in the canister.
* **Rollback Consideration:** Code rollback to the baseline commit.
* **Acceptance Criteria:** Master Admin identity is stored in canister stable state and set during bootstrap initialization; no hardcoded strings remain in the code checks.

#### P2-FIND-002: Critical Security Risk — Independently Verified Code Path; Practical Exploit Reproduction Pending
* **Finding ID:** P2-FIND-002
* **Severity:** Critical
* **Evidence:** 
  - **Endpoint Signature:** `public shared(msg) func resetPasswordWithVerification(username : Text, email : Text, mobile : Text, newPasswordHash : Text, newPrincipalId : Text) : async { success : Bool; message : Text }` in [main.mo](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/backend/main.mo) (L1691-1740).
  - **Anonymous Caller Path:** No caller identity authentication or caller signature validation is checked against `msg.caller` within this endpoint, allowing any anonymous client to invoke it.
  - **Verification Fields Required:** The endpoint validates possession of username, email, and mobile values but, based on the audited function, does not demonstrate an OTP, signed recovery token, authenticated caller requirement, or separate privileged-role recovery control. The practical exploitability and exposure of these fields MUST be independently validated before remediation implementation.
  - **Mutation Behavior:** The function deletes the original user mapping from the canister state using the old principal key and inserts a new mapping with the updated `newPasswordHash` and `newPrincipalId`.
  - **Affected Role Scope:** All user roles, including the Master Admin (`"admin"`) and `#Admin` security privileges, are susceptible to takeover.
* **Current Behavior:** Anonymous callers can bypass authorization checks to overwrite the credentials and associate the Master Admin or other admin accounts with a new caller principal ID.
* **Business Impact:** High risk of complete administrative takeover, system lockout, and data deletion.
* **Security/Data Impact:** Remote code execution bypass of credential security. Critical vulnerability.
* **Recommended Work Package:** `P2-WP-007A` (Password Recovery Emergency Hardening)
* **Prerequisites:** Cryptographic challenge or administrative sign-off flow.
* **Rollback Consideration:** Wipe state and restore canister database from secure backup.
* **Acceptance Criteria:** The anonymous recovery path is disabled for privileged roles (`#Admin`, `#MasterAdmin`), requiring administrative confirmation.

#### P2-FIND-003: LocalStorage Storage of Master Vendor Profiles
* **Finding ID:** P2-FIND-003
* **Severity:** High
* **Evidence:** [masterData.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/utils/masterData.ts) (L18-72) uses `localStorage.getItem('mock_vendors')` as the primary source of truth. Query hooks `useVendors`, `useSaveVendor`, and `useDeleteVendor` (L1800-1833) interact solely with local storage.
* **Current Behavior:** Master vendor records (including bank accounts, rating, PAN) are saved client-side in the browser.
* **Business Impact:** Clearing browser history wipes vendor accounts, separating them from canister ledger transaction logs.
* **Security/Data Impact:** Local vendor data can be modified or injected by browser extensions or local scripts.
* **Recommended Work Package:** `P2-WP-008` (Vendor Metadata Canister Migration)
* **Prerequisites:** Candid interface schema modifications to declare Vendor data structures.
* **Rollback Consideration:** Export local browser storage files to CSV before canister migration.
* **Acceptance Criteria:** Frontend queries and writes vendor records to canister stable storage.

#### P2-FIND-004: LocalStorage Storage of Raw Material Metadata
* **Finding ID:** P2-FIND-004
* **Severity:** High
* **Evidence:** [masterData.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/utils/masterData.ts) (L76-171) reads `mock_raw_materials_metadata` from local storage and merges it with the raw materials list returned by the canister in `useRawMaterials` (L649-661).
* **Current Behavior:** Raw material quantities are stored on the canister, but metadata (warehouse, rack, max stock, status, notes) is stored in the browser local storage.
* **Business Impact:** Multi-user sync gaps. Clearing browser cache deletes inventory locations and stock limits.
* **Security/Data Impact:** Operations settings are vulnerable to client-side data tampering.
* **Recommended Work Package:** `P2-WP-009` (Raw Material Metadata Migration)
* **Prerequisites:** Canister schema updates to native `RawMaterial` record structure.
* **Rollback Consideration:** Restore metadata JSON backups to local storage if migration is reverted.
* **Acceptance Criteria:** Raw material metadata is stored and managed on the canister.

#### P2-FIND-005: Client-Side Calculation of Outstanding Balances
* **Finding ID:** P2-FIND-005
* **Severity:** Medium
* **Evidence:** [calculations.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/utils/calculations.ts) (L55-137) filters all previous invoices and payments dynamically on the frontend to calculate the customer's previous due and advance balances. These calculations are passed as arguments to `saveInvoice` on the canister.
* **Current Behavior:** The backend canister stores outstanding balances computed by the client without validating them.
* **Business Impact:** Frontend pagination or missing records in the local query list will cause incorrect due calculations, leading to ledger discrepancies.
* **Security/Data Impact:** A modified client can write arbitrary previous balances or final dues to the canister ledger.
* **Recommended Work Package:** `P2-WP-011` (Authoritative Backend Financial Validation)
* **Prerequisites:** Backend canister has access to all payments and invoices for calculations.
* **Rollback Consideration:** Revert canister code changes.
* **Acceptance Criteria:** Backend canister recalculates and verifies invoice dues before committing saving transactions.

#### P2-FIND-006: Brittle Pipe-Delimited Customer Serialization (taxId)
* **Finding ID:** P2-FIND-006
* **Severity:** Medium
* **Evidence:** [CreateInvoice.tsx](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/pages/CreateInvoice.tsx) (L137) saves customer info with `taxId` formatted as a pipe-delimited string of 12 elements.
* **Current Behavior:** Components like `GstReports.tsx`, `InvoiceHistory.tsx`, and `ViewInvoice.tsx` split this string by `'|'` to parse GSTIN, phone, and financial snapshots.
* **Business Impact:** High fragility. Any field containing `|` or changes to the index offsets will corrupt historical records.
* **Security/Data Impact:** Hard to query nested details on the backend. No structural database integrity.
* **Recommended Work Package:** `P2-WP-010` (Legacy taxId Compatibility Layer)
* **Prerequisites:** Dual-read logic.
* **Rollback Consideration:** None.
* **Acceptance Criteria:** Parser reads old formats using fallback handlers; new entries write to typed Candid fields.

#### P2-FIND-007: Missing Global React Query Cache Cleanup on Logout
* **Finding ID:** P2-FIND-007
* **Severity:** Medium
* **Evidence:** `AuthGuard.tsx` (L1013-1029) in `handleLogout` does not clear query caches.
* **Current Behavior:** Session details are deleted and `window.location.reload()` is invoked after a 300ms delay.
* **Business Impact:** SPA components could temporarily show cached admin data if page reload is delayed.
* **Security/Data Impact:** Potential leakage of cached financial/system records on shared workstations.
* **Recommended Work Package:** `P2-WP-002` (Query Key Factory & Cache Cleanup)
* **Prerequisites:** QueryClient access.
* **Rollback Consideration:** None.
* **Acceptance Criteria:** `queryClient.clear()` is called immediately on logout.

---

## 2. Current Build and Toolchain Report

* **Audit and Verification Status:**
  - **Baseline Audit:** **COMPLETED** (Independent verification of codebase patterns and legacy parameters completed).
  - **Frontend TypeScript Check:** **PASSED** (TypeScript verification checks compile with exit code 0 and zero errors).
  - **Frontend Production Build (Pre-Refactor):** **PASSED** (Vite production build completed and bundled successfully prior to the unauthorized Phase 2.1 execution).
  - **Frontend Production Build (Post-Refactor):** **NOT ACCEPTED** (Any builds derived from the premature Phase 2.1 refactor are rejected and remain unverified).
  - **Motoko / Canister Build:** **NOT EXECUTED** (The current Windows and WSL environments do not provide the required DFX toolchain. Canister compilation and upgrade verification MUST be performed in an approved environment such as a configured container, staging host, or CI runner before backend work is accepted).
  - **Security Gate:** **OPEN** (The Master Admin hijacking vulnerability remains unremediated on the canister backend; emergency review is required).

* **Compiler Configuration:**
  - Frontend: React `v19.1.0`, Vite `v5.4.1`, TypeScript `v5.8.3`, TanStack Query `v5.24.0`, TanStack Router `v1.131.8`.
  - Backend: Motoko (target compiled using `moc` inside an approved DFX compilation environment).

---

## 3. Backend Endpoint and Authorization Inventory

Every public canister endpoint was audited. Below is the mapping of access controls:

| Endpoint | Type | Check Mode | Department Target | Required Toggle |
| :--- | :--- | :--- | :--- | :--- |
| `verifyMasterAdminIntegrity` | Query | Custom check | None | None (Public integrity verification) |
| `registerOrGetSelf` | Update | Public/Unregistered | None | None (Bootstrap or identity resolution) |
| `createUser` | Update | Custom admin check | None | None (Admin-only creation constraints) |
| `deleteUser` | Update | Custom admin check | None | None (Admin-only deletion constraints) |
| `editUser` | Update | Custom admin check | None | None (Admin-only edit constraints) |
| `updateProfile` | Update | Own user match | None | None (Updates caller's own profile) |
| `changePassword` | Update | Own user match | None | None (Changes caller's own password) |
| `toggleUserStatus` | Update | Custom admin check | None | None (Admin-only status toggling) |
| `adminResetPassword` | Update | Custom admin check | None | None (Admin-only password resets) |
| `resetPasswordWithVerification` | Update | Anonymous/Public | None | None (Forgot password flow - HIGH RISK) |
| `logUserAction` | Update | Registered user match | None | None (Validates caller is a user) |
| `getUsers` | Query | `checkPermissions` | `#AdminSettings` | `canManageStaff` |
| `getActivityLogs` | Query | `checkPermissions` | `#AdminSettings` | `canViewLogs` |
| `getNextInvoiceNumber` | Query | `checkPermissions` | `#Sales`, `#Finance` | `canView` |
| `saveInvoice` | Update | `checkPermissions` | `#Sales` | `canCreate` |
| `getInvoices` | Query | `checkPermissions` | `#Sales`, `#Finance` | `canView` |
| `getInvoiceById` | Query | `checkPermissions` | `#Sales`, `#Finance` | `canView` |
| `deleteInvoice` | Update | `checkPermissions` | `#Sales` | `canDelete` |
| `updateInvoice` | Update | `checkPermissions` | `#Sales` | `canEdit` |
| `getProducts` | Query | `checkPermissions` | `#Inventory`, `#Sales`, `#Production`, `#Finance` | `canView` |
| `saveProduct` | Update | `checkPermissions` | `#Inventory`, `#Production`, `#Finance` | `requiredToggle` |
| `deleteProduct` | Update | `checkPermissions` | `#Inventory` | `canDelete` |
| `getCustomers` | Query | `checkPermissions` | `#Sales`, `#Finance` | `canView` |
| `saveCustomer` | Update | `checkPermissions` | `#Sales`, `#Finance` | `canCreate` |
| `deleteCustomer` | Update | `checkPermissions` | `#Sales` | `canDelete` |
| `saveSettings` | Update | `checkPermissions` | `#AdminSettings` | `canEdit` |
| `getSettings` | Query | Registered user match | None | None |
| `getDashboardStats` | Query | `checkPermissions` | `#Sales`, `#Finance`, `#Purchase`, `#Inventory` | `canView` |
| `collectPayment` | Update | `checkPermissions` | `#Sales`, `#Finance` | `canCreate` |
| `getPayments` | Query | `checkPermissions` | `#Sales`, `#Finance` | `canView` |
| `getPaymentsByCustomer` | Query | `checkPermissions` | `#Sales`, `#Finance` | `canView` |
| `getRawMaterials` | Query | `checkPermissions` | `#Inventory`, `#Purchase`, `#Production`, `#Finance` | `canView` |
| `saveRawMaterial` | Update | `checkPermissions` | `#Inventory`, `#Purchase` | `requiredToggle` |
| `deleteRawMaterial` | Update | `checkPermissions` | `#Inventory` | `canDelete` |
| `getPurchases` | Query | `checkPermissions` | `#Purchase`, `#Finance` | `canView` |
| `savePurchase` | Update | `checkPermissions` | `#Purchase` | `canCreate` |
| `deletePurchase` | Update | `checkPermissions` | `#Purchase` | `canDelete` |
| `saveExpense` | Update | `checkPermissions` | `#Finance` | `canCreate` |
| `getExpenses` | Query | `checkPermissions` | `#Finance` | `canView` |
| `deleteExpense` | Update | `checkPermissions` | `#Finance` | `canDelete` |
| `collectVendorPayment` | Update | `checkPermissions` | `#Purchase`, `#Finance` | `canCreate` |
| `getVendorPayments` | Query | `checkPermissions` | `#Purchase`, `#Finance` | `canView` |
| `getMaterialConsumptionHistory`| Query | `checkPermissions` | `#Inventory`, `#Production`, `#Finance` | `canView` |
| `getEmployees` | Query | `checkPermissions` | `#Production` | `canView` |
| `saveEmployee` | Update | `checkPermissions` | `#Production` | `canCreate` |
| `deleteEmployee` | Update | `checkPermissions` | `#Production` | `canDelete` |
| `getJobWorks` | Query | `checkPermissions` | `#Production` / `#Staff` | `canView` |
| `saveJobWork` | Update | `checkPermissions` | `#Production` | `canCreate` |
| `updateJobWorkProgress` | Update | `checkPermissions` | `#Staff` / `#Production` | `canCreate` |
| `saveCollectionEntry` | Update | `checkPermissions` | `#Staff` / `#Production` | `canCreate` |
| `editCollectionEntry` | Update | `checkPermissions` | `#Production` | `canEdit` |
| `deleteCollectionEntry` | Update | `checkPermissions` | `#Production` | `canDelete` |
| `getCollections` | Query | `checkPermissions` | `#Production` | `canView` |
| `getStockMovementHistory` | Query | `checkPermissions` | `#Inventory` | `canView` |
| `getSystemAuditLogs` | Query | `checkPermissions` | `#AdminSettings` | `canViewLogs` |
| `getKarigarLedger` | Query | `checkPermissions` | `#Production`, `#Finance` / `#Staff` | `canView` |
| `getEmployeePayments` | Query | `checkPermissions` | `#Production`, `#Finance` | `canView` |
| `saveEmployeePayment` | Update | `checkPermissions` | `#Production`, `#Finance` | `canCreate` |
| `editEmployeePayment` | Update | `checkPermissions` | `#Production`, `#Finance` | `canEdit` |
| `deleteEmployeePayment` | Update | `checkPermissions` | `#Production`, `#Finance` | `canDelete` |
| `checkStockReconciliation` | Query | `checkPermissions` | `#Inventory`, `#Finance` | `canView` |
| `runConsistencyAuditAndRepair` | Update | `checkPermissions` | `#Inventory`, `#Production`, `#Finance` | `canEdit` |
| `recalculateProductionReports` | Update | `checkPermissions` | `#Production` | `canEdit` |
| `getEmployeeDashboardStats` | Query | `checkPermissions` | `#Production` / `#Staff` | `canView` |
| `getConsumptionLogs` | Query | `checkPermissions` | `#Inventory`, `#Production` | `canView` |
| `saveConsumptionLog` | Update | `checkPermissions` | `#Inventory`, `#Production` | `canCreate` |
| `getFinishedGoodsLogs` | Query | `checkPermissions` | `#Inventory`, `#Production` | `canView` |
| `saveFinishedGoodsLog` | Update | `checkPermissions` | `#Inventory`, `#Production` | `canCreate` |
| `exportDatabase` | Query | `checkPermissions` | `#AdminSettings` | `canBackupRestore` |
| `importDatabase` | Update | `checkPermissions` | `#AdminSettings` | `canBackupRestore` |

---

## 4. Direct Actor Call Inventory

Audit of pages and hooks making direct, non-encapsulated actor canister requests:

1. **[useActor.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/hooks/useActor.ts):** Resolves the Ed25519 principal identity and bootstraps the `actor` instance.
2. **[useQueries.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/hooks/useQueries.ts):** Contains direct calls to generated canister bindings (e.g. `actor.getDashboardStats()`, `actor.getInvoices()`, etc.) inside React Query functions.
3. **[AuthGuard.tsx](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/components/AuthGuard.tsx):** Directly calls `actor.getUsers()`, `actor.registerOrGetSelf()`, and `actor.createUser()` inside auth verification hooks and manual database repair scripts.

---

## 5. Query Key Inventory

React Query keys are currently declared as inline literal arrays. Below is the inventory of keys used in `useQueries.ts`:

- `['dashboardStats']`
- `['invoices']`
- `['invoice', id]`
- `['nextInvoiceNumber']`
- `['settings']`
- `['userSelf']`
- `['users']`
- `['activityLogs']`
- `['products']`
- `['customers']`
- `['payments']`
- `['payments', customerId]`
- `['rawMaterials']`
- `['purchases']`
- `['purchaseInvoices']`
- `['purchaseInvoice', id]`
- `['purchaseOrders']`
- `['grns']`
- `['expenses']`
- `['vendorPayments']`
- `['consumptionHistory']`
- `['employees']`
- `['jobWorks']`
- `['employeePayments']`
- `['employeeDashboard']`
- `['collections']`
- `['stockMovements']`
- `['auditLogs']`
- `['karigarLedger', employeeName]`
- `['consumptionLogs']`
- `['finishedGoodsLogs']`
- `['stockReconciliation']`
- `['salesOrders']`
- `['productionRequirements']`
- `['purchaseRequirements']`
- `['mrpRecords']`
- `['vendors']` *(localStorage query key)*

---

## 6. Business Logic Location Inventory

Calculations and validations are distributed across the system instead of a centralized service layer:

- **Financial Totals / GST / Rounding:** Resolved in [calculations.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/utils/calculations.ts) (L4-29). Used on the fly during invoice creation.
- **Outstanding Balance & Advance Calculations:** Calculated in [calculations.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/utils/calculations.ts) (L55-137) via client filtering, then passed to the backend.
- **Job Work Delay Flagging:** Calculated in [calculations.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/utils/calculations.ts) (L280-317) using date conversions.
- **Vendor Normalization:** Done inside [masterData.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/utils/masterData.ts) (L52-72) during form saving.
- **Raw Material Metadata Merging:** Performed in [masterData.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/utils/masterData.ts) (L76-102) when raw materials are queried.
- **CSV Formatting & Escaping:** Defined inline in [masterData.ts](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/utils/masterData.ts) (L351-373).

---

## 7. High-Risk Migration Register

The following table categorizes the migration risks for Phase 2 data and schema changes.

| Risk ID | Title | Impacted Canister Variables / Browser Keys | Risk Level | Mitigation Control |
| :--- | :--- | :--- | :---: | :--- |
| **MR-001** | Vendor Master De-synchronization | `mock_vendors` / `VENDORS_KEY` | **High** | Dual-write phase comparing local checksums with Canister counts before deleting local records. |
| **MR-002** | Raw Material Metadata Loss | `mock_raw_materials_metadata` | **High** | Batch backup of all storage location indices to JSON files before canister import. |
| **MR-003** | Legacy `taxId` Formatting Break | `CustomerInfo.taxId` (pipe-delimited string) | **Medium** | Safe parser returning default values if delimiters do not match index bounds. |
| **MR-004** | Outstanding Dues Ledger Discrepancies | `saveInvoice` due parameters | **Medium** | Dry-run compare backend-calculated dues with historical client-submitted values to check formula consistency. |
