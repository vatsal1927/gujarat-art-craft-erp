# Gujarat Art & Craft ERP
## Phase 2.0 — Existing Workflow Regression Matrix

This document maps the core business workflows of the ERP application, detailing the verification methods, potential regression failure modes during Phase 2.1-2.4 upgrades, and manual test scripts to protect baseline features.

---

## 1. Core Workflow Regression Matrix

| Workflow ID | Workflow Name | Key Components | Potential Phase 2 Regression Points | Manual Verification Method | Automated Test Gate (Target) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **WF-001** | User Authentication & Guard Routing | `AuthGuard.tsx`<br>`App.tsx`<br>`useActor.ts` | - Password-based Ed25519 reconstruction errors.<br>- Session storage timeouts.<br>- False redirection triggers to `/unauthorized`. | Log in with staff credentials, verify settings tabs are blocked; log in with Master Admin, verify all configurations are editable. | Unit testing of roles mapping and AuthGuard mount states. |
| **WF-002** | Invoice Creation & Printing | `CreateInvoice.tsx`<br>`calculations.ts`<br>`InvoiceTotals.tsx`<br>`pdfGenerator.ts` | - Floating-point rounding offsets.<br>- Pipe-delimited string parsing failures.<br>- Print stylesheet scaling offsets. | Create a sample invoice with mixed GST items, verify grand totals match. Print invoice, check layout rendering. | Unit testing on `calculations.ts` (subtotal, GST, grand total). |
| **WF-003** | Outstanding Balance Tracking | `Ledger.tsx`<br>`calculations.ts` | - Missing previous invoices in query list.<br>- Incorrect payment allocation indexing.<br>- Balance mismatches due to caching lag. | Verify customer ledger total outstanding balance matches sum of unpaid invoices minus advances. | Integration test verifying calculated due balances against known states. |
| **WF-004** | Raw Material Inventory & Alerts | `Inventory.tsx`<br>`useRawMaterialForm.ts`<br>`StockAlerts.tsx` | - Missing locations/rack indices on cache reset.<br>- Threshold alert badges fail to render.<br>- Formula discrepancies in current stock count. | Save a raw material location edit, refresh browser, verify the location persists. Verify warning badge renders when stock < minStock. | Unit test of `normalizeRawMaterialMaster` and stock comparison logic. |
| **WF-005** | Karigar Job Work Allocation | `JobWork.tsx`<br>`Employees.tsx`<br>`main.mo` | - Principal identity mapping failures.<br>- Numeric parsing issues of `expectedReturnDate`. | Create a Job Work entry, verify worker is assigned, status becomes `"Given"`. | Integration test verifying caller principal role check on allocation. |
| **WF-006** | Karigar Wage Ledger & Payments | `EmployeeLedger.tsx`<br>`EmployeePayments.tsx`<br>`Collections.tsx` | - Wage calculations mismatch on collection.<br>- Double-posting on payment save. | Record a collection with 2 rejections, verify wages calculated match accepted pieces only. Record payment, check balance reduction. | Integration test verifying ledger entry calculation on collection submit. |
| **WF-007** | Profit & Loss Statement | `ProfitLoss.tsx`<br>`Ledger.tsx` | - Inconsistent date filtration.<br>- Omission of raw material purchase costs. | Compare sales total and purchase expenses with Cash Book summaries for a matching date range. | Unit test checking date filter boundary conditions on balance sheet query. |

---

## 2. Core Functional Verification Scripts (Manual UAT Baseline)

To ensure no features are compromised during incremental runtime refactoring, developers must run the following manual test procedures before finalizing any work package.

### Test Script 1: User Session and Permission Isolation
1. **Prepare:** Clear local storage and session storage data.
2. **Execute:**
   - Log in using a derived Staff principal.
   - Navigate to `http://localhost:3000/settings`.
3. **Verify:** The router or layout redirect blocks access, rendering the `/unauthorized` component.
4. **Execute:**
   - Log in using the Master Admin principal.
   - Navigate to `/settings` and edit company logo details.
5. **Verify:** Settings save successfully and display updated company names globally.

### Test Script 2: Tax Serialization (taxId) and Outstanding Summaries
1. **Prepare:** Locate a customer record with previous outstanding dues.
2. **Execute:**
   - Navigate to `/sales`, choose the customer.
   - Check if the "Previous Due" field automatically populates with the correct balance.
   - Create an invoice with `Total = 1500`, `Paid = 500`. Save invoice.
3. **Verify:** The invoice saves successfully without Candid trap errors.
4. **Execute:**
   - Navigate to `/history` and view the saved invoice.
   - Click "Print Invoice" to open the PDF preview.
5. **Verify:** Customer GSTIN and correct financial snapshot values (Grand Total: 1500, Paid: 500, Balance Due: 1000) are printed correctly.

### Test Script 3: Raw Material Metadata Persistence
1. **Prepare:** Authenticate as an Admin or Inventory manager.
2. **Execute:**
   - Navigate to `/inventory`, select a raw material (e.g. "Cotton Thread").
   - Click "Edit", set Warehouse: `"Central Warehouse"`, Storage Rack: `"Rack B2"`, Max Stock Level: `500`. Save.
   - Clear browser cache / cookies or log out and log back in on a different browser window.
3. **Verify:** The metadata edits (Warehouse `"Central Warehouse"`, Rack `"Rack B2"`) are still displayed on the material info card. (Note: During the transition phase, this tests localStorage synchronization; after migration, this tests Canister persistence).
