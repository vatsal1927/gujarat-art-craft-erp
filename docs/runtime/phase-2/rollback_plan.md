# Gujarat Art & Craft ERP
## Phase 2 — Rollback and Checkpoint Plan

This document establishes the safety gates, commit strategy, on-chain backups, and rollback pipelines to prevent data loss during the Phase 2 runtime implementation.

---

## 1. Git Branching, Commits, and Tag Strategy

To maintain incremental development safety, every work package must follow a strict tag checkpoint protocol:

- **Branch Structure:** All implementation must occur in branches derived from `phase-2-runtime-development`.
- **Commit Formatting:** Commit messages must specify the work package ID (e.g. `feat(WP-002): centralize query key factory`).
- **Tag Naming Convention:**
  - Before starting a package: `phase-2-wp-[ID]-start`
  - Upon successful staging verification: `phase-2-wp-[ID]-completed`
  - If a package is rolled back: `phase-2-wp-[ID]-rolled-back`

### Checkpoint Example (WP-008 - Vendor Migration):
1. Create tag `phase-2-wp-008-start` on clean working tree.
2. Implement backend Vendor schemas and sync scripts.
3. Deploy to staging. Run verification.
4. Create tag `phase-2-wp-008-completed` on successful verification.

---

## 2. Canister State Backup & Restoration Procedures

The canister contains manual backup endpoints (`exportDatabase` and `importDatabase`) that must be triggered before any code update or schema upgrade.

### 2.1 Backup Steps (Pre-Deployment)
1. **Trigger Export:** Call `exportDatabase()` from the Master Admin console or command line:
   ```bash
   dfx canister call backend exportDatabase
   ```
2. **Save Snapshot:** Save the output `DatabaseBackup` payload into a secure, gitignored JSON file `C:\Users\ASUS\Desktop\caffeine\backups\pre_upgrade_[timestamp].json`.
3. **Verify Integrity:** Confirm the JSON contains complete records for invoices, customers, payments, and users.

### 2.2 Restoration Steps (Post-Failure Rollback)
1. **Redeploy Prior Code:** Git checkout the last completed work package tag:
   ```bash
   git checkout phase-2-wp-[ID]-completed
   ```
2. **Re-install Canister:** Re-install the canister code using `--mode reinstall` to wipe corrupt states:
   ```bash
   dfx deploy backend --mode reinstall
   ```
3. **Trigger Import:** Call `importDatabase(backup)` passing the saved JSON payload:
   ```bash
   dfx canister call backend importDatabase '(<JSON_PAYLOAD_HERE>)'
   ```
4. **Reconcile Counts:** Verify record sizes match the export counts.

---

## 3. localStorage Backup and Restoration

Vendor and raw material metadata are stored client-side. Before executing migration syncs:

### 3.1 Backup Script
Trigger backup by exporting current localStorage states via the browser console:
```javascript
const backup = {
  mock_vendors: localStorage.getItem('mock_vendors'),
  mock_raw_materials_metadata: localStorage.getItem('mock_raw_materials_metadata'),
  mock_uploaded_images: localStorage.getItem('mock_uploaded_images')
};
console.log(JSON.stringify(backup, null, 2));
// Copy output and save as "local_storage_backup_[date].json"
```

### 3.2 Restoration Script
If a sync fails or data corruption occurs, restore prior browser state:
```javascript
const backup = <PASTE_JSON_CONTENT_HERE>;
if (backup.mock_vendors) localStorage.setItem('mock_vendors', backup.mock_vendors);
if (backup.mock_raw_materials_metadata) localStorage.setItem('mock_raw_materials_metadata', backup.mock_raw_materials_metadata);
if (backup.mock_uploaded_images) localStorage.setItem('mock_uploaded_images', backup.mock_uploaded_images);
window.location.reload();
```

---

## 4. Staging Migration Dry-Run (Rehearsal)

To protect production stables:
1. Deploy a copy of the production canister database state to a staging replica canister.
2. Deploy the new canister code upgrade to the staging replica.
3. If the upgrade traps or triggers state losses, review `migration.mo` and abort the production deployment.
