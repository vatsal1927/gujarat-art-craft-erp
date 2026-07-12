# Gujarat Art & Craft ERP
## Phase 2.0 — Data Migration Inventory

This document inventories the decentralized client datasets stored in browser local storage and maps the legacy serialized structures (such as `taxId`) that require canister migration and dual-read compatibility layers.

---

## 1. Browser localStorage Data Inventory

The system maintains three primary master datasets solely within client-side browser memory.

### 1.1 Vendor Master Dataset (`mock_vendors`)
- **Primary Key:** `id` (Format: `VND-001`, `VND-002`, etc.)
- **Seed Size:** 5 default vendors.
- **Estimated Production Rows:** Dynamic (grows with custom vendors created by users).
- **Client Schema Properties:**
  ```typescript
  interface VendorMaster {
    id: string;             // Uppercase trimmed ID
    name: string;           // Vendor Display Name
    phone: string;          // Mobile number or N/A
    gstin: string;          // 15-character GSTIN or N/A
    businessAddress: string;// Business street address or N/A
    openingBalance: number; // Initial ledger dues
    bankName: string;       // Banking profile name
    bankBranch: string;     // Bank branch name
    accountNumber: string;  // Bank account number
    ifscCode: string;       // IFSC routing code
    panNumber: string;      // 10-char PAN or N/A
    status: 'Active' | 'Inactive';
    notes: string;          // Miscellaneous text notes
    creditLimit: number;    // Credit allowance amount
    creditDays: number;     // Payment window days
    rating: number;         // Vendor evaluation score (1-5)
  }
  ```

### 1.2 Raw Material Metadata Dataset (`mock_raw_materials_metadata`)
- **Primary Key:** Matches `id` of `RawMaterial` record on Canister.
- **Client Schema Properties:**
  ```typescript
  interface RawMaterialMetadata {
    purchaseRate: number;   // Override buy rate
    maxStockLevel: number;  // Storage capacity ceiling
    hsnCode: string;        // HSN classification (Default: '5609')
    gstPercent: number;     // GST tier (Default: 5%)
    storageRack: string;    // Rack locator (Default: 'N/A')
    warehouse: string;      // Warehouse allocation (Default: 'N/A')
    status: 'Active' | 'Inactive';
    notes: string;          // Operational remarks
  }
  ```

### 1.3 Uploaded Images Dataset (`mock_uploaded_images`)
- **Primary Key:** Matches raw material `id`.
- **Content:** Base64-encoded image strings.
- **Risk Detail:** Base64 payload storage inside local storage can easily exceed browser capacity limits (5MB limit per origin).

---

## 2. Legacy taxId Serialization Inventory

The ERP packages multiple customer attributes and invoice transaction snapshots within the customer's `taxId` property. This format must remain readable for historical records.

### 2.1 Delimited Schema Mappings
The serialization uses a pipe-delimited format containing exactly 12 offsets:

`phone|gstNo|taxType|dcNo|dcDate|transport|prevDue|advBal|total|payable|paid|due`

* **Index 0:** `customerPhone` (Contact number)
* **Index 1:** `gstNo` (GST identification number)
* **Index 2:** `taxType` (GST type: `CGST_SGST` or `IGST`)
* **Index 3:** `dcNo` (Challan number)
* **Index 4:** `dcDate` (Challan Date)
* **Index 5:** `transport` (Transport vehicle or shipping mode)
* **Index 6 (Snapshot):** `previousDue` (Customer dues balance at invoice creation)
* **Index 7 (Snapshot):** `advanceBalance` (Customer advance amount at invoice creation)
* **Index 8 (Snapshot):** `currentGrandTotal` (Invoice bill total)
* **Index 9 (Snapshot):** `totalPayable` (Invoice total + previousDue - advanceBalance)
* **Index 10 (Snapshot):** `paidAmount` (Customer payments collected at invoice creation)
* **Index 11 (Snapshot):** `finalDueAmount` (Dues remaining on this invoice)

### 2.2 Active Consumers Matrix
The following code locations split `taxId` to parse metadata:

- **[GstReports.tsx](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/pages/GstReports.tsx) (L74):** Extracts `gstNo` (Index 1) and `taxType` (Index 2) to compile GST summaries.
- **[InvoiceHistory.tsx](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/pages/InvoiceHistory.tsx) (L27, L83, L225):** Extracts `customerPhone` (Index 0) to render contact details in lists.
- **[ViewInvoice.tsx](file:///C:/Users/ASUS/Desktop/caffeine/New%20edited%20project/gujarat-art-and-craft-invoice-app/frontend/src/pages/ViewInvoice.tsx) (L68-75, L331-339):** Parses transport details (Index 3-5) and checks snapshot dues (Index 6-11) to render historical invoice invoices.

---

## 3. Canister Target Schema Migration Plan

To normalize database storage, the canister must declare native tables to hold these attributes.

### 3.1 Proposed Canister Vendor Structure (main.mo)
```motoko
public type Vendor = {
  id : Text;
  name : Text;
  phone : Text;
  gstin : Text;
  businessAddress : Text;
  openingBalance : Float;
  bankName : Text;
  bankBranch : Text;
  accountNumber : Text;
  ifscCode : Text;
  panNumber : Text;
  status : Text;
  notes : Text;
  creditLimit : Float;
  creditDays : Nat;
  rating : Nat;
};
```

### 3.2 Proposed Canister Raw Material Schema Upgrades
```diff
  public type RawMaterial = {
    id : Text;
    name : Text;
    category : Text;
    openingStock : Float;
    purchasedQty : Float;
    consumedQty : Float;
    currentStock : Float;
    unitCost : Float;
    unit : Text;
    minStockAlert : Float;
+   purchaseRate : Float;
+   maxStockLevel : Float;
+   hsnCode : Text;
+   gstPercent : Float;
+   storageRack : Text;
+   warehouse : Text;
+   status : Text;
+   notes : Text;
+   imageUrl : Text;
  };
```

---

## 4. Rollback and Reconciliation Safety Verification

1. **Local Storage Exports:** Before triggering the migration sync, the frontend application must export local `mock_vendors` and `mock_raw_materials_metadata` arrays to JSON files.
2. **Reconciliation Dry-Run:** The migration script must check that the migrated counts in the canister match the export files.
3. **Rollback Trigger:** If the imported canister count does not match the JSON seed file count, the sync process aborts and falls back to browser local storage.
