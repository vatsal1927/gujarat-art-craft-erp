import { type backendInterface, type Settings, type Invoice, type CustomerInfo, type Product, type DashboardStats, type User, type ActivityLog, type ProductItem, type CustomerItem, type Payment, type RawMaterial, type PurchaseItem, type Purchase, type Expense, type VendorPayment, type MaterialConsumptionEntry, type BOMRequirement, type Department, type Permissions, type SalesOrder, type ProductionRequirement, type PurchaseRequirement, type MRPRecord, type MRPMaterialRequirement, type PurchaseOrder, type GRN } from './backend';
import { normalizeUsername, normalizeEmail, normalizeMobile, createPasswordHash, findUserByRecoveryIdentity, deduplicateUsers } from './utils/passwordAuth';
import { runBOMMigration } from './utils/bomMigrations';
import { runVendorMigration, runRawMaterialMetadataMigration } from './utils/masterData';

class MockPrincipal {
    constructor(private text: string) {}
    toText() { return this.text; }
    toString() { return this.text; }
    isAnonymous() { return false; }
}

export class MockBackend implements backendInterface {
    constructor() {
        this.seedDemoData();
        runBOMMigration();
        this.enforceSingleMasterAdminPolicy();
        this.migrateLegacyPurchaseInvoices();
        try {
            runVendorMigration();
            runRawMaterialMetadataMigration(this.getRawMaterialsRaw());
        } catch (e) {
            console.error("Failed to run vendor or raw material metadata migration on boot:", e);
        }
    }

    private enforceSingleMasterAdminPolicy() {
        const stored = localStorage.getItem('mock_users');
        if (stored) {
            try {
                let users = JSON.parse(stored);
                let updated = false;
                users = users.map((u: any) => {
                    if (u.username === 'admin') {
                        if (u.name !== 'Vatsal Dholariya' || !u.role || !('Admin' in u.role)) {
                            u.name = 'Vatsal Dholariya';
                            u.role = { Admin: null };
                            updated = true;
                        }
                    } else if (u.role && 'Admin' in u.role) {
                        u.role = { Manager: null }; // Convert other Master Admins to Admin (Manager)
                        updated = true;
                    }
                    return u;
                });
                if (updated) {
                    localStorage.setItem('mock_users', JSON.stringify(users));
                }
            } catch (e) {
                console.error("Failed to enforce Single Master Admin Policy in mock database:", e);
            }
        }
    }

    private logSecurityAudit(callerPrincipal: string, callerName: string, action: string, reason: string) {
        this.logAuditUnified('USERS', action, `Security Policy Violation: ${reason} (Principal: ${callerPrincipal})`);
    }

    private parseDepartment(deptText?: string, roleText?: string): Department | undefined {
        if (!deptText) {
            if (roleText === 'Staff') return { Staff: null };
            if (roleText === 'Admin') return { AdminSettings: null };
            if (roleText === 'Manager') return { Sales: null };
            return undefined;
        }
        const lower = deptText.trim().toLowerCase();
        if (lower === 'sales' || lower === 'sales department') return { Sales: null };
        if (lower === 'purchase' || lower === 'purchase department') return { Purchase: null };
        if (lower === 'inventory' || lower === 'inventory department') return { Inventory: null };
        if (lower === 'production' || lower === 'production department') return { Production: null };
        if (lower === 'finance' || lower === 'accounts' || lower === 'accounts / finance department') return { Finance: null };
        if (lower === 'staff' || lower === 'staff/karigar' || lower === 'staff / karigar department') return { Staff: null };
        if (lower === 'adminsettings' || lower === 'admin' || lower === 'admin / settings department') return { AdminSettings: null };
        
        // Fallbacks
        if (roleText === 'Staff') return { Staff: null };
        if (roleText === 'Admin') return { AdminSettings: null };
        if (roleText === 'Manager') return { Sales: null };
        return undefined;
    }

    private defaultPermissions(roleText: string): Permissions {
        const isMaster = roleText === 'Admin';
        const isManager = roleText === 'Manager';
        return {
            canView: true,
            canCreate: isMaster,
            canEdit: isMaster,
            canDelete: isMaster,
            canApprove: isMaster,
            canExport: isMaster,
            canPrint: true,
            canManageStaff: isMaster,
            canViewLogs: isMaster,
            canBackupRestore: isMaster,
            canAdjustStock: isMaster,
            canAccessFinance: isMaster,
            canAccessReports: isMaster,
            "whatsapp.viewStatus": isMaster || isManager,
            "whatsapp.sendInvoice": isMaster || isManager,
            "whatsapp.resendInvoice": isMaster || isManager,
            "whatsapp.viewLogs": isMaster,
            "whatsapp.manageSettings": isMaster,
            "whatsapp.manageAutomation": isMaster
        };
    }

    private checkDeptAccess(
        allowedDepts: ('Sales' | 'Purchase' | 'Inventory' | 'Production' | 'Finance' | 'Staff' | 'AdminSettings')[], 
        requiredPermission: keyof Permissions, 
        caller?: any
    ): any {
        if (!caller) {
            caller = this.getCurrentUserRaw();
        }
        if (!caller) {
            this.mockLogAudit("Unknown", "Unauthorized Department Access", "Caller not found.");
            throw new Error("Access denied: insufficient department permission.");
        }
        
        // Master Admin always has full access
        if (caller.role && 'Admin' in caller.role) {
            return caller;
        }

        // Manager (UI Admin) has access to all operational departments
        if (caller.role && 'Manager' in caller.role) {
            if (allowedDepts.includes('AdminSettings')) {
                this.mockLogAudit(caller.name || caller.username || "Unknown", "Unauthorized Department Access", "Manager tried to access Admin Settings.");
                throw new Error("Access denied: insufficient department permission.");
            }
            return caller;
        }

        // Verify role and department exist
        if (!caller.role || !caller.department) {
            this.mockLogAudit(caller.name || caller.username || "Unknown", "Unauthorized Department Access", "No role or department assigned.");
            throw new Error("Access denied: insufficient department permission.");
        }

        // Extract department name
        const deptName = Object.keys(caller.department)[0] as any;
        if (!deptName) {
            this.mockLogAudit(caller.name, "Unauthorized Department Access", "User has no department assigned.");
            throw new Error("Access denied: insufficient department permission.");
        }

        // Check if user's department is allowed
        if (!allowedDepts.includes(deptName)) {
            this.mockLogAudit(caller.name, "Unauthorized Department Access", `User department ${deptName} is not allowed. Expected: ${allowedDepts.join(', ')}`);
            throw new Error("Access denied: insufficient department permission.");
        }

        // Check permission toggles
        if (!caller.permissions) {
            this.mockLogAudit(caller.name, "Unauthorized Department Access", "User has no permission toggles configured.");
            throw new Error("Access denied: insufficient department permission.");
        }

        const hasPerm = caller.permissions[requiredPermission];
        if (!hasPerm) {
            this.mockLogAudit(caller.name, "Unauthorized Department Access", `User lacks toggle permission: ${requiredPermission}`);
            throw new Error("Access denied: insufficient department permission.");
        }

        return caller;
    }

    private checkAccess(allowedRoles: ('Admin' | 'Manager' | 'Staff')[], caller: any) {
        if (!caller) {
            throw new Error("Unauthorized");
        }
        if (!caller.role) {
            throw new Error("Unauthorized");
        }
        const hasRole = allowedRoles.some(r => r in caller.role);
        if (!hasRole) {
            throw new Error("Unauthorized");
        }
    }

    async verifyMasterAdminIntegrity(): Promise<{ isValid: boolean; message: string }> {
        const users = this.getUsersRaw();
        const masterAdmins = users.filter(u => u.role && 'Admin' in u.role);
        if (masterAdmins.length === 0) {
            return { isValid: false, message: "CRITICAL SECURITY BREACH: Master Admin account is missing or deleted!" };
        }
        if (masterAdmins.length > 1) {
            return { isValid: false, message: "CRITICAL SECURITY BREACH: Multiple Master Admin accounts detected! Duplicate identities detected." };
        }
        const master = masterAdmins[0];
        if (master.status !== 'Active') {
            return { isValid: false, message: `CRITICAL SECURITY BREACH: Master Admin account (${master.name}) is deactivated or disabled!` };
        }
        if (master.name !== 'Vatsal Dholariya' || master.username !== 'admin') {
            return { isValid: false, message: "CRITICAL SECURITY BREACH: Master Admin identity mismatch! Unauthorized user holds Master Admin privileges." };
        }
        return { isValid: true, message: "Master Admin integrity is intact." };
    }

    private seedDemoData() {
        // Standardize product images and fix Decorative Jhumar placeholder in localStorage
        const storedProducts = localStorage.getItem('mock_products');
        if (storedProducts) {
            try {
                let products = JSON.parse(storedProducts);
                let updated = false;
                const standardizedUrls: Record<string, string> = {
                    'PRD-1': 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1200&h=800&fit=crop&q=90&fm=jpg',
                    'PRD-2': 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=1200&h=800&fit=crop&q=90&fm=jpg',
                    'PRD-3': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&h=800&fit=crop&q=90&fm=jpg',
                    'PRD-4': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200&h=800&fit=crop&q=90&fm=jpg',
                    'PRD-5': 'https://images.unsplash.com/photo-1519225495810-7512c696505a?w=1200&h=800&fit=crop&q=90&fm=jpg'
                };
                products = products.map((p: any) => {
                    if (standardizedUrls[p.id] && p.photoUrl !== standardizedUrls[p.id]) {
                        p.photoUrl = standardizedUrls[p.id];
                        updated = true;
                    }
                    return p;
                });
                if (updated) {
                    localStorage.setItem('mock_products', JSON.stringify(products));
                }
            } catch (e) {
                console.error("Failed to migrate mock products data:", e);
            }
        }

        if (localStorage.getItem('mock_data_seeded_v7')) {
            return;
        }

        // 1. Seed Raw Materials
        const rawMaterials = [
            { id: 'RM-1', name: 'Golden Beads', category: 'Beads', openingStock: 6470, purchasedQty: 20000, consumedQty: 11470, currentStock: 15000, unitCost: 0.50, unit: 'pcs', minStockAlert: 2000, photoUrl: 'https://images.unsplash.com/photo-1576016770956-debb63d900ad?w=400&auto=format&fit=crop&q=60' },
            { id: 'RM-2', name: 'Decorative Mirrors', category: 'Mirrors', openingStock: 2246, purchasedQty: 5000, consumedQty: 2246, currentStock: 5000, unitCost: 2.00, unit: 'pcs', minStockAlert: 1000, photoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60' },
            { id: 'RM-3', name: 'Silk Thread', category: 'Threads', openingStock: 442, purchasedQty: 3000, consumedQty: 442, currentStock: 3000, unitCost: 5.00, unit: 'meters', minStockAlert: 200, photoUrl: '' },
            { id: 'RM-4', name: 'Decorative Flowers', category: 'Flowers', openingStock: 955, purchasedQty: 2000, consumedQty: 955, currentStock: 2000, unitCost: 3.00, unit: 'pcs', minStockAlert: 500, photoUrl: '' },
            { id: 'RM-5', name: 'Bells', category: 'Bells', openingStock: 1096, purchasedQty: 0, consumedQty: 96, currentStock: 1000, unitCost: 8.00, unit: 'pcs', minStockAlert: 100, photoUrl: 'https://images.unsplash.com/photo-1543431109-7a0a6007e1f1?w=400&auto=format&fit=crop&q=60' },
            { id: 'RM-6', name: 'Packaging Bags', category: 'Packaging', openingStock: 500, purchasedQty: 0, consumedQty: 0, currentStock: 500, unitCost: 4.00, unit: 'pcs', minStockAlert: 100, photoUrl: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400&auto=format&fit=crop&q=60' }
        ];
        localStorage.setItem('mock_raw_materials', JSON.stringify(rawMaterials));

        // 2. Seed Products & BOMs
        const products = [
            {
                id: 'PRD-1',
                vigat: 'Premium Toran',
                rate: 450.00,
                hsnCode: '5609',
                stock: 52,
                productionCost: 70.00,
                photoUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1200&h=800&fit=crop&q=90&fm=jpg',
                bom: [
                    { materialId: 'RM-1', quantity: 50 },
                    { materialId: 'RM-2', quantity: 10 },
                    { materialId: 'RM-3', quantity: 2 },
                    { materialId: 'RM-4', quantity: 5 }
                ]
            },
            {
                id: 'PRD-2',
                vigat: 'Royal Toran',
                rate: 650.00,
                hsnCode: '5609',
                stock: 25,
                productionCost: 131.00,
                photoUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=1200&h=800&fit=crop&q=90&fm=jpg',
                bom: [
                    { materialId: 'RM-1', quantity: 80 },
                    { materialId: 'RM-2', quantity: 15 },
                    { materialId: 'RM-3', quantity: 3 },
                    { materialId: 'RM-4', quantity: 10 },
                    { materialId: 'RM-5', quantity: 2 }
                ]
            },
            {
                id: 'PRD-3',
                vigat: 'Decorative Jhumar',
                rate: 550.00,
                hsnCode: '5609',
                stock: 40,
                productionCost: 43.50,
                photoUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&h=800&fit=crop&q=90&fm=jpg',
                bom: [
                    { materialId: 'RM-1', quantity: 40 },
                    { materialId: 'RM-2', quantity: 8 },
                    { materialId: 'RM-3', quantity: 1.5 }
                ]
            },
            {
                id: 'PRD-4',
                vigat: 'Festival Hanging',
                rate: 350.00,
                hsnCode: '5609',
                stock: 60,
                productionCost: 25.00,
                photoUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200&h=800&fit=crop&q=90&fm=jpg',
                bom: []
            },
            {
                id: 'PRD-5',
                vigat: 'Wedding Decoration Toran',
                rate: 850.00,
                hsnCode: '5609',
                stock: 30,
                productionCost: 150.00,
                photoUrl: 'https://images.unsplash.com/photo-1519225495810-7512c696505a?w=1200&h=800&fit=crop&q=90&fm=jpg',
                bom: []
            }
        ];
        localStorage.setItem('mock_products', JSON.stringify(products));

        // 3. Seed Employees
        const employees = [
            { id: 'EMP-1', name: 'Ramesh Patel', mobile: '9876543210', address: 'Ahmedabad, Gujarat', joiningDate: (Date.now() - 365*24*60*60*1000).toString(), skillType: 'Master Artisan', status: 'Active' },
            { id: 'EMP-2', name: 'Suresh Patel', mobile: '9876543211', address: 'Ahmedabad, Gujarat', joiningDate: (Date.now() - 300*24*60*60*1000).toString(), skillType: 'Artisan', status: 'Active' },
            { id: 'EMP-3', name: 'Meena Ben', mobile: '9876543212', address: 'Ahmedabad, Gujarat', joiningDate: (Date.now() - 180*24*60*60*1000).toString(), skillType: 'Thread specialist', status: 'Active' },
            { id: 'EMP-4', name: 'Pooja Ben', mobile: '9876543213', address: 'Ahmedabad, Gujarat', joiningDate: (Date.now() - 90*24*60*60*1000).toString(), skillType: 'Mirror specialist', status: 'Active' },
            { id: 'EMP-5', name: 'Kiran Patel', mobile: '9876543214', address: 'Ahmedabad, Gujarat', joiningDate: (Date.now() - 30*24*60*60*1000).toString(), skillType: 'Artisan', status: 'Active' }
        ];
        localStorage.setItem('mock_employees', JSON.stringify(employees));

        // 4. Seed Job Works
        const jobWorks = [
            {
                id: '1',
                jobDate: (Date.now() - 30*24*60*60*1000).toString(),
                employeeName: 'Ramesh Patel',
                mobileNumber: '9876543210',
                productName: 'Premium Toran',
                productCode: 'PRD-1',
                hsnCode: '5609',
                qtyGiven: 100,
                qtyAssigned: 100,
                ratePerPiece: 15.00,
                expectedReturnDate: (Date.now() - 25*24*60*60*1000).toString(),
                expectedCompletionDate: (Date.now() - 25*24*60*60*1000).toString(),
                status: 'Completed',
                remarks: 'Special festive rush assignment',
                collectedQty: 100,
                completedQty: 100,
                rejectedQty: 5,
                acceptedQty: 95
            },
            {
                id: '2',
                jobDate: (Date.now() - 25*24*60*60*1000).toString(),
                employeeName: 'Meena Ben',
                mobileNumber: '9876543212',
                productName: 'Royal Toran',
                productCode: 'PRD-2',
                hsnCode: '5609',
                qtyGiven: 50,
                qtyAssigned: 50,
                ratePerPiece: 25.00,
                expectedReturnDate: (Date.now() - 20*24*60*60*1000).toString(),
                expectedCompletionDate: (Date.now() - 20*24*60*60*1000).toString(),
                status: 'Completed',
                remarks: 'Royal wedding theme collection',
                collectedQty: 50,
                completedQty: 50,
                rejectedQty: 2,
                acceptedQty: 48
            },
            {
                id: '3',
                jobDate: (Date.now() - 20*24*60*60*1000).toString(),
                employeeName: 'Pooja Ben',
                mobileNumber: '9876543213',
                productName: 'Decorative Jhumar',
                productCode: 'PRD-3',
                hsnCode: '5609',
                qtyGiven: 75,
                qtyAssigned: 75,
                ratePerPiece: 20.00,
                expectedReturnDate: (Date.now() - 15*24*60*60*1000).toString(),
                expectedCompletionDate: (Date.now() - 15*24*60*60*1000).toString(),
                status: 'Completed',
                remarks: 'Hanging chandeliers style',
                collectedQty: 75,
                completedQty: 75,
                rejectedQty: 3,
                acceptedQty: 72
            }
        ];
        localStorage.setItem('mock_job_works', JSON.stringify(jobWorks));

        // 5. Seed Goods Collections
        const collections = [
            {
                id: '1',
                collectionDate: (Date.now() - 28*24*60*60*1000).toString(),
                jobWorkNo: '1',
                karigarName: 'Ramesh Patel',
                productName: 'Premium Toran',
                qtyGiven: 100,
                prevCollectedQty: 0,
                pendingQty: 100,
                todayCollectedQty: 100,
                rejectedQty: 5,
                acceptedQty: 95,
                remarks: 'Completed with excellent finish'
            },
            {
                id: '2',
                collectionDate: (Date.now() - 23*24*60*60*1000).toString(),
                jobWorkNo: '2',
                karigarName: 'Meena Ben',
                productName: 'Royal Toran',
                qtyGiven: 50,
                prevCollectedQty: 0,
                pendingQty: 50,
                todayCollectedQty: 50,
                rejectedQty: 2,
                acceptedQty: 48,
                remarks: 'Slight mirror alignment issues corrected'
            },
            {
                id: '3',
                collectionDate: (Date.now() - 18*24*60*60*1000).toString(),
                jobWorkNo: '3',
                karigarName: 'Pooja Ben',
                productName: 'Decorative Jhumar',
                qtyGiven: 75,
                prevCollectedQty: 0,
                pendingQty: 75,
                todayCollectedQty: 75,
                rejectedQty: 3,
                acceptedQty: 72,
                remarks: 'All chandeliers properly tied'
            }
        ];
        localStorage.setItem('mock_collections_v2', JSON.stringify(collections));

        // 6. Seed Consumption Logs (linking raw materials & collection accepted quantities)
        const consumptionLogs = [
            // Collection 1 (Ramesh, Premium Toran, 95 accepted)
            { id: '1', date: (Date.now() - 28*24*60*60*1000).toString(), productName: 'Premium Toran', batchNo: 'COL-1', rawMaterialName: 'Golden Beads', quantityUsed: 4750, unit: 'pcs', cost: 2375, employee: 'Ramesh Patel', jobWorkNo: 'JW-1', remarks: 'Automated log for collection COL-1', collectionNo: '1', acceptedQty: 95, unitCost: 0.50, status: 'Completed' },
            { id: '2', date: (Date.now() - 28*24*60*60*1000).toString(), productName: 'Premium Toran', batchNo: 'COL-1', rawMaterialName: 'Decorative Mirrors', quantityUsed: 950, unit: 'pcs', cost: 1900, employee: 'Ramesh Patel', jobWorkNo: 'JW-1', remarks: 'Automated log for collection COL-1', collectionNo: '1', acceptedQty: 95, unitCost: 2.00, status: 'Completed' },
            { id: '3', date: (Date.now() - 28*24*60*60*1000).toString(), productName: 'Premium Toran', batchNo: 'COL-1', rawMaterialName: 'Silk Thread', quantityUsed: 190, unit: 'meters', cost: 950, employee: 'Ramesh Patel', jobWorkNo: 'JW-1', remarks: 'Automated log for collection COL-1', collectionNo: '1', acceptedQty: 95, unitCost: 5.00, status: 'Completed' },
            { id: '4', date: (Date.now() - 28*24*60*60*1000).toString(), productName: 'Premium Toran', batchNo: 'COL-1', rawMaterialName: 'Decorative Flowers', quantityUsed: 475, unit: 'pcs', cost: 1425, employee: 'Ramesh Patel', jobWorkNo: 'JW-1', remarks: 'Automated log for collection COL-1', collectionNo: '1', acceptedQty: 95, unitCost: 3.00, status: 'Completed' },
            // Collection 2 (Meena, Royal Toran, 48 accepted)
            { id: '5', date: (Date.now() - 23*24*60*60*1000).toString(), productName: 'Royal Toran', batchNo: 'COL-2', rawMaterialName: 'Golden Beads', quantityUsed: 3840, unit: 'pcs', cost: 1920, employee: 'Meena Ben', jobWorkNo: 'JW-2', remarks: 'Automated log for collection COL-2', collectionNo: '2', acceptedQty: 48, unitCost: 0.50, status: 'Completed' },
            { id: '6', date: (Date.now() - 23*24*60*60*1000).toString(), productName: 'Royal Toran', batchNo: 'COL-2', rawMaterialName: 'Decorative Mirrors', quantityUsed: 720, unit: 'pcs', cost: 1440, employee: 'Meena Ben', jobWorkNo: 'JW-2', remarks: 'Automated log for collection COL-2', collectionNo: '2', acceptedQty: 48, unitCost: 2.00, status: 'Completed' },
            { id: '7', date: (Date.now() - 23*24*60*60*1000).toString(), productName: 'Royal Toran', batchNo: 'COL-2', rawMaterialName: 'Silk Thread', quantityUsed: 144, unit: 'meters', cost: 720, employee: 'Meena Ben', jobWorkNo: 'JW-2', remarks: 'Automated log for collection COL-2', collectionNo: '2', acceptedQty: 48, unitCost: 5.00, status: 'Completed' },
            { id: '8', date: (Date.now() - 23*24*60*60*1000).toString(), productName: 'Royal Toran', batchNo: 'COL-2', rawMaterialName: 'Decorative Flowers', quantityUsed: 480, unit: 'pcs', cost: 1440, employee: 'Meena Ben', jobWorkNo: 'JW-2', remarks: 'Automated log for collection COL-2', collectionNo: '2', acceptedQty: 48, unitCost: 3.00, status: 'Completed' },
            { id: '9', date: (Date.now() - 23*24*60*60*1000).toString(), productName: 'Royal Toran', batchNo: 'COL-2', rawMaterialName: 'Bells', quantityUsed: 96, unit: 'pcs', cost: 768, employee: 'Meena Ben', jobWorkNo: 'JW-2', remarks: 'Automated log for collection COL-2', collectionNo: '2', acceptedQty: 48, unitCost: 8.00, status: 'Completed' },
            // Collection 3 (Pooja, Decorative Jhumar, 72 accepted)
            { id: '10', date: (Date.now() - 18*24*60*60*1000).toString(), productName: 'Decorative Jhumar', batchNo: 'COL-3', rawMaterialName: 'Golden Beads', quantityUsed: 2880, unit: 'pcs', cost: 1440, employee: 'Pooja Ben', jobWorkNo: 'JW-3', remarks: 'Automated log for collection COL-3', collectionNo: '3', acceptedQty: 72, unitCost: 0.50, status: 'Completed' },
            { id: '11', date: (Date.now() - 18*24*60*60*1000).toString(), productName: 'Decorative Jhumar', batchNo: 'COL-3', rawMaterialName: 'Decorative Mirrors', quantityUsed: 576, unit: 'pcs', cost: 1152, employee: 'Pooja Ben', jobWorkNo: 'JW-3', remarks: 'Automated log for collection COL-3', collectionNo: '3', acceptedQty: 72, unitCost: 2.00, status: 'Completed' },
            { id: '12', date: (Date.now() - 18*24*60*60*1000).toString(), productName: 'Decorative Jhumar', batchNo: 'COL-3', rawMaterialName: 'Silk Thread', quantityUsed: 108, unit: 'meters', cost: 540, employee: 'Pooja Ben', jobWorkNo: 'JW-3', remarks: 'Automated log for collection COL-3', collectionNo: '3', acceptedQty: 72, unitCost: 5.00, status: 'Completed' }
        ];
        localStorage.setItem('mock_consumption_logs', JSON.stringify(consumptionLogs));

        // 7. Seed Stock Movements (for the production collections & deletes etc)
        const stockMovements = [
            { id: '1', date: (Date.now() - 28*24*60*60*1000).toString(), productName: 'Premium Toran', movementType: 'Karigar Collection', qtyAdded: 95, relatedJobWorkNo: '1', relatedCollectionNo: '1', userName: 'System' },
            { id: '2', date: (Date.now() - 23*24*60*60*1000).toString(), productName: 'Royal Toran', movementType: 'Karigar Collection', qtyAdded: 48, relatedJobWorkNo: '2', relatedCollectionNo: '2', userName: 'System' },
            { id: '3', date: (Date.now() - 18*24*60*60*1000).toString(), productName: 'Decorative Jhumar', movementType: 'Karigar Collection', qtyAdded: 72, relatedJobWorkNo: '3', relatedCollectionNo: '3', userName: 'System' }
        ];
        localStorage.setItem('mock_stock_movements_v2', JSON.stringify(stockMovements));

        // 8. Seed Employee Ledger & Payments
        const employeeLedgers = [
            { id: '1', employeeName: 'Ramesh Patel', jobWorkNo: '1', date: (Date.now() - 28*24*60*60*1000).toString(), productName: 'Premium Toran', qtyGiven: 100, acceptedQty: 95, rejectedQty: 5, pendingQty: 0, rate: 15.00, totalWage: 1425, paidAmount: 0, balanceAmount: 1425, status: 'Completed' },
            { id: '2', employeeName: 'Ramesh Patel', jobWorkNo: '0', date: (Date.now() - 27*24*60*60*1000).toString(), productName: 'Payment Handover', qtyGiven: 0, acceptedQty: 0, rejectedQty: 0, pendingQty: 0, rate: 0, totalWage: 0, paidAmount: 1000, balanceAmount: 425, status: 'Paid' },
            
            { id: '3', employeeName: 'Meena Ben', jobWorkNo: '2', date: (Date.now() - 23*24*60*60*1000).toString(), productName: 'Royal Toran', qtyGiven: 50, acceptedQty: 48, rejectedQty: 2, pendingQty: 0, rate: 25.00, totalWage: 1200, paidAmount: 0, balanceAmount: 1200, status: 'Completed' },
            { id: '4', employeeName: 'Meena Ben', jobWorkNo: '0', date: (Date.now() - 22*24*60*60*1000).toString(), productName: 'Payment Handover', qtyGiven: 0, acceptedQty: 0, rejectedQty: 0, pendingQty: 0, rate: 0, totalWage: 0, paidAmount: 800, balanceAmount: 400, status: 'Paid' },

            { id: '5', employeeName: 'Pooja Ben', jobWorkNo: '3', date: (Date.now() - 18*24*60*60*1000).toString(), productName: 'Decorative Jhumar', qtyGiven: 75, acceptedQty: 72, rejectedQty: 3, pendingQty: 0, rate: 20.00, totalWage: 1440, paidAmount: 0, balanceAmount: 1440, status: 'Completed' },
            { id: '6', employeeName: 'Pooja Ben', jobWorkNo: '0', date: (Date.now() - 17*24*60*60*1000).toString(), productName: 'Payment Handover', qtyGiven: 0, acceptedQty: 0, rejectedQty: 0, pendingQty: 0, rate: 0, totalWage: 0, paidAmount: 1200, balanceAmount: 240, status: 'Paid' }
        ];
        localStorage.setItem('mock_ledger_entries_v2', JSON.stringify(employeeLedgers));

        const employeePayments = [
            { id: '1', paymentDate: (Date.now() - 27*24*60*60*1000).toString(), employeeName: 'Ramesh Patel', amountPaid: 1000, paymentMode: 'Cash', remarks: 'Partial wage payment' },
            { id: '2', paymentDate: (Date.now() - 22*24*60*60*1000).toString(), employeeName: 'Meena Ben', amountPaid: 800, paymentMode: 'Bank Transfer', remarks: 'Partial wage payment' },
            { id: '3', paymentDate: (Date.now() - 17*24*60*60*1000).toString(), employeeName: 'Pooja Ben', amountPaid: 1200, paymentMode: 'UPI', remarks: 'Partial wage payment' }
        ];
        localStorage.setItem('mock_employee_payments', JSON.stringify(employeePayments));

        // 9. Seed Customers
        const customers = [
            { id: 'Rajesh Traders', name: 'Rajesh Traders', businessAddress: 'A-21, Madhavpura Market, Ahmedabad', phone: '9898012345', gstNo: '24ABCDE1234F1ZA' },
            { id: 'Shree Decor', name: 'Shree Decor', businessAddress: '42, Royal Arcade, Surat', phone: '9898054321', gstNo: '24SHREE4321G2ZB' },
            { id: 'Patel Handicrafts', name: 'Patel Handicrafts', businessAddress: 'G-10, Craft Plaza, Bhuj', phone: '9712034567', gstNo: '24PATEL5678H1ZC' },
            { id: 'Festival House', name: 'Festival House', businessAddress: 'B-105, Festive Tower, Vadodara', phone: '9426098765', gstNo: '24FESTI8765J3ZD' },
            { id: 'Royal Events', name: 'Royal Events', businessAddress: 'Shop 5, Heritage Block, Rajkot', phone: '9909023456', gstNo: '24ROYAL1234K1ZE' }
        ];
        localStorage.setItem('mock_customers', JSON.stringify(customers));

        // 10. Seed Invoices & Customer Payments (mix of Paid, Unpaid, Partially Paid over 30 days)
        // We will define 25 invoices
        const invoicesList: any[] = [];
        const paymentsList: any[] = [];

        const clients = [
            { name: 'Rajesh Traders', address: 'A-21, Madhavpura Market, Ahmedabad', phone: '9898012345', gst: '24ABCDE1234F1ZA' },
            { name: 'Shree Decor', address: '42, Royal Arcade, Surat', phone: '9898054321', gst: '24SHREE4321G2ZB' },
            { name: 'Patel Handicrafts', address: 'G-10, Craft Plaza, Bhuj', phone: '9712034567', gst: '24PATEL5678H1ZC' },
            { name: 'Festival House', address: 'B-105, Festive Tower, Vadodara', phone: '9426098765', gst: '24FESTI8765J3ZD' },
            { name: 'Royal Events', address: 'Shop 5, Heritage Block, Rajkot', phone: '9909023456', gst: '24ROYAL1234K1ZE' }
        ];

        // Seed details of invoice contents
        const salesTx = [
            { clientIdx: 0, items: [['Premium Toran', 10, 450], ['Royal Toran', 5, 650]], total: 7750, paid: 7750, daysAgo: 29 },
            { clientIdx: 1, items: [['Decorative Jhumar', 12, 550], ['Festival Hanging', 10, 350]], total: 10100, paid: 5000, daysAgo: 28 },
            { clientIdx: 2, items: [['Wedding Decoration Toran', 8, 850]], total: 6800, paid: 0, daysAgo: 27 },
            { clientIdx: 3, items: [['Festival Hanging', 15, 350]], total: 5250, paid: 5250, daysAgo: 26 },
            { clientIdx: 4, items: [['Wedding Decoration Toran', 6, 850], ['Royal Toran', 8, 650]], total: 10300, paid: 5000, daysAgo: 24 },
            { clientIdx: 0, items: [['Premium Toran', 15, 450]], total: 6750, paid: 6750, daysAgo: 23 },
            { clientIdx: 1, items: [['Festival Hanging', 5, 350]], total: 1750, paid: 1750, daysAgo: 21 },
            { clientIdx: 2, items: [['Royal Toran', 10, 650]], total: 6500, paid: 0, daysAgo: 20 },
            { clientIdx: 3, items: [['Decorative Jhumar', 8, 550]], total: 4400, paid: 4400, daysAgo: 19 },
            { clientIdx: 4, items: [['Premium Toran', 12, 450]], total: 5400, paid: 5400, daysAgo: 18 },
            { clientIdx: 0, items: [['Royal Toran', 5, 650]], total: 3250, paid: 3250, daysAgo: 16 },
            { clientIdx: 1, items: [['Wedding Decoration Toran', 4, 850]], total: 3400, paid: 1500, daysAgo: 15 },
            { clientIdx: 2, items: [['Premium Toran', 8, 450]], total: 3600, paid: 3600, daysAgo: 14 },
            { clientIdx: 3, items: [['Festival Hanging', 12, 350]], total: 4200, paid: 0, daysAgo: 13 },
            { clientIdx: 4, items: [['Decorative Jhumar', 12, 550]], total: 6600, paid: 6600, daysAgo: 11 },
            { clientIdx: 0, items: [['Wedding Decoration Toran', 2, 850]], total: 1700, paid: 1700, daysAgo: 10 },
            { clientIdx: 1, items: [['Premium Toran', 6, 450]], total: 2700, paid: 2700, daysAgo: 9 },
            { clientIdx: 2, items: [['Royal Toran', 4, 650]], total: 2600, paid: 2600, daysAgo: 7 },
            { clientIdx: 3, items: [['Festival Hanging', 8, 350]], total: 2800, paid: 1000, daysAgo: 6 },
            { clientIdx: 4, items: [['Wedding Decoration Toran', 5, 850]], total: 4250, paid: 0, daysAgo: 5 },
            { clientIdx: 0, items: [['Decorative Jhumar', 10, 550]], total: 5500, paid: 5500, daysAgo: 4 },
            { clientIdx: 1, items: [['Premium Toran', 5, 450]], total: 2250, paid: 2250, daysAgo: 3 },
            { clientIdx: 2, items: [['Festival Hanging', 10, 350]], total: 3500, paid: 3500, daysAgo: 2 },
            { clientIdx: 3, items: [['Royal Toran', 2, 650]], total: 1300, paid: 1300, daysAgo: 1 },
            { clientIdx: 4, items: [['Wedding Decoration Toran', 3, 850]], total: 2550, paid: 1000, daysAgo: 0 }
        ];

        salesTx.forEach((tx, idx) => {
            const nextId = (idx + 1).toString();
            const invNum = `INV-${nextId}`;
            const client = clients[tx.clientIdx];
            
            invoicesList.push({
                id: nextId,
                invoiceNumber: invNum,
                date: (Date.now() - tx.daysAgo*24*60*60*1000).toString(),
                businessInfo: "GUJARAT ART & CRAFTS|A/26-27, Shreeram Park, Nr. Amikunj Society, Thakkarnagar, Ahmedabad-382350.|9824092261, 9824434096|24APYPP8111N1Z4",
                customerInfo: {
                    name: client.name,
                    businessAddress: client.address,
                    taxId: `${client.phone}|${client.gst}`
                },
                products: tx.items.map(it => [it[0], it[1].toString(), it[2].toString()]),
                totalAmount: tx.total,
                paidAmount: tx.paid,
                creatorPrincipal: "System",
                creatorName: "Seeded Administrator"
            });

            if (tx.paid > 0) {
                const payId = (paymentsList.length + 1).toString();
                paymentsList.push({
                    id: payId,
                    customerId: client.name,
                    invoiceNumber: invNum,
                    amount: tx.paid,
                    date: (Date.now() - tx.daysAgo*24*60*60*1000 + 1*60*60*1000).toString(), // 1 hour after invoice
                    notes: tx.paid === tx.total ? `Full payment received` : `Partial payment received`
                });
            }
        });

        localStorage.setItem('mock_invoices', JSON.stringify(invoicesList));
        localStorage.setItem('mock_payments', JSON.stringify(paymentsList));

        // 11. Seed Vendor Purchases & Vendor Payments
        const purchasesList = [
            {
                id: '1',
                purchaseNumber: 'PUR-001',
                date: (Date.now() - 29*24*60*60*1000).toString(),
                vendorName: 'Ambika Beads',
                vendorMobile: '9999011111',
                vendorGstNumber: '24AMBKA1111A1ZA',
                vendorAddress: 'Bead Bazaar, Baroda',
                items: [
                    { materialId: 'RM-1', quantity: 20000, unit: 'pcs', rate: 0.40, gstPercent: 18, amount: 8000 }
                ],
                totalAmount: 8000,
                paidAmount: 8000
            },
            {
                id: '2',
                purchaseNumber: 'PUR-002',
                date: (Date.now() - 25*24*60*60*1000).toString(),
                vendorName: 'Karan Mirror House',
                vendorMobile: '9999022222',
                vendorGstNumber: '24KARAN2222B1ZB',
                vendorAddress: 'Mirror Street, Ahmedabad',
                items: [
                    { materialId: 'RM-2', quantity: 5000, unit: 'pcs', rate: 1.80, gstPercent: 18, amount: 9000 }
                ],
                totalAmount: 9000,
                paidAmount: 5000
            },
            {
                id: '3',
                purchaseNumber: 'PUR-003',
                date: (Date.now() - 20*24*60*60*1000).toString(),
                vendorName: 'Gujarat Threads',
                vendorMobile: '9999033333',
                vendorGstNumber: '24GUTHR3333C1ZC',
                vendorAddress: 'Textile Market, Surat',
                items: [
                    { materialId: 'RM-3', quantity: 3000, unit: 'meters', rate: 4.50, gstPercent: 18, amount: 13500 }
                ],
                totalAmount: 13500,
                paidAmount: 10000
            },
            {
                id: '4',
                purchaseNumber: 'PUR-004',
                date: (Date.now() - 15*24*60*60*1000).toString(),
                vendorName: 'Rajlaxmi Flowers',
                vendorMobile: '9999044444',
                vendorGstNumber: '24RAJLA4444D1ZD',
                vendorAddress: 'Flower Market, Rajkot',
                items: [
                    { materialId: 'RM-4', quantity: 2000, unit: 'pcs', rate: 2.50, gstPercent: 18, amount: 5000 }
                ],
                totalAmount: 5000,
                paidAmount: 5000
            }
        ];
        localStorage.setItem('mock_purchases', JSON.stringify(purchasesList));

        const vendorPaymentsList = [
            { id: '1', vendorName: 'Karan Mirror House', purchaseNumber: 'PUR-002', amount: 5000, date: (Date.now() - 25*24*60*60*1000).toString(), notes: 'Partial payment handover' },
            { id: '2', vendorName: 'Gujarat Threads', purchaseNumber: 'PUR-003', amount: 10000, date: (Date.now() - 20*24*60*60*1000).toString(), notes: 'Partial payment handover' }
        ];
        localStorage.setItem('mock_vendor_payments', JSON.stringify(vendorPaymentsList));

        // 12. Seed Office Expenses
        const expenses = [
            { id: '1', date: (Date.now() - 25*24*60*60*1000).toString(), category: 'Rent', amount: 8000, description: 'Office building rental' },
            { id: '2', date: (Date.now() - 18*24*60*60*1000).toString(), category: 'Electricity Bill', amount: 2500, description: 'Workshop power consumption' },
            { id: '3', date: (Date.now() - 12*24*60*60*1000).toString(), category: 'Transport', amount: 1800, description: 'Courier / delivery charges' },
            { id: '4', date: (Date.now() - 8*24*60*60*1000).toString(), category: 'Refreshments', amount: 650, description: 'Artisan tea and snacks' },
            { id: '5', date: (Date.now() - 2*24*60*60*1000).toString(), category: 'Stationery', amount: 450, description: 'Invoicing printing papers & stationery' }
        ];
        localStorage.setItem('mock_expenses', JSON.stringify(expenses));

        // 13. Seed System Audit Logs
        const auditLogs = [
            { id: '1', timestamp: (Date.now() - 30*24*60*60*1000).toString(), user: 'System', action: 'Data Initialization', description: 'Handicraft demo registry seeded successfully' }
        ];
        localStorage.setItem('mock_audit_logs_v2', JSON.stringify(auditLogs));

        localStorage.setItem('mock_data_seeded_v7', 'true');
    }

    // Database Storage helpers
    private getInvoicesRaw(): any[] {
        const stored = localStorage.getItem('mock_invoices');
        return stored ? JSON.parse(stored) : [];
    }

    private saveInvoicesRaw(invoices: any[]) {
        localStorage.setItem('mock_invoices', JSON.stringify(invoices));
    }

    private getLogsRaw(): any[] {
        const stored = localStorage.getItem('mock_activity_logs');
        return stored ? JSON.parse(stored) : [];
    }

    private getSettingsRaw(): any {
        const stored = localStorage.getItem('mock_settings');
        return stored ? JSON.parse(stored) : null;
    }

    private saveLogsRaw(logs: any[]) {
        localStorage.setItem('mock_activity_logs', JSON.stringify(logs));
    }

    private logAuditUnified(
        module: 'AUTH' | 'USERS' | 'ERP',
        action: string,
        description: string,
        targetUser?: string,
        targetRole?: string,
        details?: string
    ) {
        const caller = this.getCurrentUserRaw();
        let operator = 'System';
        let operatorRole = 'System';
        if (caller) {
            operator = caller.name;
            operatorRole = this.getRoleText(caller.role);
        }
        const logs = this.getAuditLogsRaw();
        const nextId = (logs.reduce((max: number, item: any) => Math.max(max, parseInt(item.id) || 0), 0) + 1).toString();
        
        const newLog = {
            id: nextId,
            timestamp: Date.now().toString(),
            operator,
            operatorRole,
            module,
            action,
            description,
            targetUser: targetUser || '',
            targetRole: targetRole || '',
            details: details || ''
        };
        logs.unshift(newLog);
        this.saveAuditLogsRaw(logs);
    }

    private logActivity(userPrincipal: string, userName: string, action: string, details: string) {
        let module: 'AUTH' | 'USERS' | 'ERP' = 'ERP';
        const actLower = action.toLowerCase();
        if (actLower.includes('login') || actLower.includes('logout') || actLower.includes('password')) {
            module = 'AUTH';
        } else if (actLower.includes('user') || actLower.includes('role') || actLower.includes('department') || actLower.includes('permission')) {
            module = 'USERS';
        }
        
        let targetUser = '';
        let targetRole = '';
        if (details.includes('Target:')) {
            const match = details.match(/Target:\s*([^,]+),\s*Role:\s*([^,]+)/);
            if (match) {
                targetUser = match[1].trim();
                targetRole = match[2].trim();
            }
        }
        this.logAuditUnified(module, action, details, targetUser, targetRole);
    }

    private getUsersRaw(): any[] {
        const stored = localStorage.getItem('mock_users');
        return stored ? JSON.parse(stored) : [];
    }

    private saveUsersRaw(users: any[]) {
        const { cleanUsers } = deduplicateUsers(users);
        localStorage.setItem('mock_users', JSON.stringify(cleanUsers));
    }

    private getCurrentUserRaw(): any {
        const stored = localStorage.getItem('user_session') || sessionStorage.getItem('user_session') || localStorage.getItem('mock_current_user');
        return stored ? JSON.parse(stored) : null;
    }

    private getRoleText(roleObj: any): string {
        if (!roleObj) return 'Legacy Record';
        if (typeof roleObj === 'object') {
            if ('Admin' in roleObj) return 'Master Admin';
            if ('Manager' in roleObj) return 'Manager';
            if ('Staff' in roleObj) return 'Staff';
        }
        if (typeof roleObj === 'string') {
            if (roleObj === 'Admin') return 'Master Admin';
            return roleObj;
        }
        return 'Staff';
    }

    private saveCurrentUserRaw(user: any) {
        if (user) {
            if (sessionStorage.getItem('user_session')) {
                sessionStorage.setItem('user_session', JSON.stringify(user));
            } else {
                localStorage.setItem('user_session', JSON.stringify(user));
            }
        } else {
            localStorage.removeItem('user_session');
            sessionStorage.removeItem('user_session');
            localStorage.removeItem('mock_current_user');
        }
    }

    private mapToUser(item: any): User {
        return {
            principalId: new MockPrincipal(item.principalId) as any,
            name: item.name,
            username: item.username || item.name.toLowerCase().replace(/\s+/g, ''),
            role: item.role,
            createdAt: BigInt(item.createdAt || Date.now().toString()) * 1000000n,
            email: item.email || '',
            mobile: item.mobile || '',
            address: item.address || '',
            profilePhoto: item.profilePhoto || '',
            status: item.status || 'Active',
            lastLogin: item.lastLogin || '',
            passwordHash: item.passwordHash || '',
            needsPasswordChange: item.needsPasswordChange || false
        };
    }

    async registerOrGetSelf(): Promise<User | null> {
        let current = this.getCurrentUserRaw();
        if (current) {
            const users = this.getUsersRaw();
            const dbUser = users.find(u => u.username.toLowerCase() === current.username.toLowerCase());
            
            let reason = 'success';
            if (!dbUser) {
                reason = 'user_not_found';
            } else if (dbUser.principalId !== current.principalId) {
                // Do not require principalId to change or match in mock mode for password-based logins
                // reason = 'principal_mismatch';
            } else if (dbUser.status === 'Deactivated' || dbUser.status === 'Disabled') {
                reason = 'user_deactivated';
            }

            if (import.meta.env?.DEV) {
                console.log('AUTH_CHECK', {
                    sessionUsername: current.username,
                    sessionPrincipalId: current.principalId,
                    dbUsername: dbUser ? dbUser.username : null,
                    dbPrincipalId: dbUser ? dbUser.principalId : null,
                    status: dbUser ? dbUser.status : null,
                    reason
                });
            }

            if (reason !== 'success') {
                return null;
            }

            return this.mapToUser(dbUser!);
        }
        return null;
    }

    async createUser(
        principalText: string, 
        name: string, 
        username: string, 
        roleText: string,
        email?: string,
        mobile?: string,
        address?: string,
        profilePhoto?: string,
        status?: string,
        passwordHash?: string,
        departmentText?: string,
        permissionsObj?: Permissions
    ): Promise<string> {
        const caller = this.getCurrentUserRaw();
        if (!caller || !caller.role) {
            throw new Error("Access denied: insufficient department permission.");
        }

        if ('Staff' in caller.role) {
            this.mockLogAudit(caller.name, "Staff Access Blocked", "Staff tried to create a user.");
            throw new Error("Access denied: insufficient department permission.");
        }

        if ('Manager' in caller.role) {
            const dept = caller.department ? Object.keys(caller.department)[0] : '';
            const perms = caller.permissions;
            if (dept !== 'AdminSettings' || !perms || !perms.canManageStaff || roleText !== 'Staff') {
                this.mockLogAudit(caller.name, "Admin Settings Access Blocked", "Manager tried creating non-staff user or lacks permission.");
                throw new Error("Access denied: insufficient department permission.");
            }
        }

        const users = this.getUsersRaw();
        if (users.some(u => u.principalId === principalText || u.username === username)) {
            throw new Error("User already exists");
        }

        // Limit the Master Admin count
        if (roleText === 'Admin') {
            this.logSecurityAudit(
                caller.principalId, 
                caller.name, 
                "MASTER_ADMIN_CREATE_ATTEMPT", 
                `Attempted to create Master Admin user: ${name} (${username})`
            );
            const hasMaster = users.some(u => u.role && 'Admin' in u.role);
            if (hasMaster) {
                this.logSecurityAudit(
                    caller.principalId, 
                    caller.name, 
                    "MASTER_ADMIN_CREATE_BLOCKED", 
                    `Blocked creation of Master Admin: ${name} (${username}) because a Master Admin already exists.`
                );
                throw new Error("Security Policy Violation: Only one Master Admin account is allowed.");
            }
        }

        // Validate required contact details
        if (!email || !email.trim()) {
            throw new Error("Email is required");
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            throw new Error("Invalid email format");
        }

        if (!mobile || !mobile.trim()) {
            throw new Error("Mobile number is required");
        }
        const mobileRegex = /^[0-9]{10}$/;
        if (!mobileRegex.test(mobile.trim())) {
            throw new Error("Mobile number must be exactly 10 digits");
        }

        if (users.some(u => u.email && u.email.toLowerCase() === email.trim().toLowerCase())) {
            throw new Error("Email address already registered");
        }
        if (users.some(u => u.mobile && u.mobile === mobile.trim())) {
            throw new Error("Mobile number already registered");
        }

        const finalDept = this.parseDepartment(departmentText, roleText);
        const finalPerms = permissionsObj || this.defaultPermissions(roleText);

        const newUser = {
            principalId: principalText,
            name,
            username: username.trim().toLowerCase(),
            role: roleText === 'Admin' ? { Admin: null } : (roleText === 'Manager' ? { Manager: null } : { Staff: null }),
            createdAt: Date.now().toString(),
            email: email || '',
            mobile: mobile || '',
            address: address || '',
            profilePhoto: profilePhoto || '',
            status: status || 'Active',
            lastLogin: '',
            passwordHash: passwordHash || '',
            needsPasswordChange: true,
            department: finalDept,
            permissions: finalPerms
        };

        users.push(newUser);
        this.saveUsersRaw(users);

        this.logActivity(caller.principalId, caller.name, "User Created", `Target: ${name} (@${username.trim().toLowerCase()}), Role: ${roleText === 'Admin' ? 'Master Admin' : (roleText === 'Manager' ? 'Admin' : 'Staff')}, Info: Created new user account`);
        this.mockLogAudit(caller.name, "User Created", `Created user ${name} with role ${roleText}`);
        this.mockLogAudit(caller.name, "Department Assigned", `Assigned department ${departmentText || (roleText === 'Staff' ? 'Staff/Karigar' : 'Admin/Settings')} to ${username}`);
        this.mockLogAudit(caller.name, "Permission Changed", `Assigned permissions to ${username}`);
        this.mockLogAudit(caller.name, "User Permission Updated", `Permissions configured for ${username}`);

        return "User created successfully";
    }

    async editUser(
        principalText: string, 
        name: string, 
        username: string, 
        email: string, 
        mobile: string, 
        roleText: string, 
        status: string,
        departmentText?: string,
        permissionsObj?: Permissions
    ): Promise<void> {
        const caller = this.getCurrentUserRaw();
        if (!caller || !caller.role) {
            throw new Error("Access denied: insufficient department permission.");
        }

        if ('Staff' in caller.role) {
            this.mockLogAudit(caller.name, "Staff Access Blocked", "Staff tried to edit a user.");
            throw new Error("Access denied: insufficient department permission.");
        }

        const users = this.getUsersRaw();
        const targetUserIdx = users.findIndex(u => u.principalId === principalText);
        if (targetUserIdx === -1) {
            throw new Error("User not found");
        }

        const targetUser = users[targetUserIdx];
        const isTargetMaster = 'Admin' in targetUser.role;

        if ('Manager' in caller.role) {
            const dept = caller.department ? Object.keys(caller.department)[0] : '';
            const perms = caller.permissions;
            if (dept !== 'AdminSettings' || !perms || !perms.canManageStaff || roleText !== 'Staff' || !('Staff' in targetUser.role)) {
                this.mockLogAudit(caller.name, "Admin Settings Access Blocked", "Manager tried to edit non-staff or lacks permissions.");
                throw new Error("Access denied: insufficient department permission.");
            }
        }

        // Master Admin protection
        if (isTargetMaster) {
            let modificationAttempted = false;
            let actionAttempted = "";
            if (roleText !== 'Admin') {
                modificationAttempted = true;
                actionAttempted = `Demote role to ${roleText}`;
            } else if (status !== 'Active') {
                modificationAttempted = true;
                actionAttempted = `Deactivate account`;
            } else if (name.trim() !== 'Vatsal Dholariya') {
                modificationAttempted = true;
                actionAttempted = "Rename account";
            } else if (username.trim().toLowerCase() !== 'admin') {
                modificationAttempted = true;
                actionAttempted = "Change username";
            }

            if (modificationAttempted) {
                this.logSecurityAudit(
                    caller.principalId, 
                    caller.name, 
                    "MASTER_ADMIN_MODIFICATION_BLOCKED", 
                    `Blocked attempt to modify Master Admin: ${actionAttempted}`
                );
                this.logActivity(
                    caller.principalId, 
                    caller.name, 
                    "Master Admin Modification Blocked", 
                    `Target: ${targetUser.name} (@${targetUser.username}), Role: Master Admin, Info: Blocked attempt to modify Master Admin (Action: ${actionAttempted})`
                );
                throw new Error("Security Policy Violation: Master Admin cannot be modified.");
            }
        }

        // Validate Master Admin uniqueness if role is being changed to Master Admin (Admin)
        if (roleText === 'Admin' && !isTargetMaster) {
            this.logSecurityAudit(
                caller.principalId, 
                caller.name, 
                "MASTER_ADMIN_ROLE_CHANGE_ATTEMPT", 
                `Attempted to change role of ${targetUser.username} to Master Admin`
            );
            const currentMaster = users.find(u => u.role && 'Admin' in u.role);
            if (currentMaster) {
                // Check if caller is the current Master Admin
                if (caller.principalId === currentMaster.principalId) {
                    // This is a valid ownership transfer!
                    // Demote the current Master Admin (caller) to Manager
                    const callerIdx = users.findIndex(u => u.principalId === caller.principalId);
                    if (callerIdx !== -1) {
                        users[callerIdx].role = { Manager: null };
                        
                        // Update caller session
                        const sessionStr = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
                        if (sessionStr) {
                            const session = JSON.parse(sessionStr);
                            if (session.principalId === caller.principalId) {
                                session.role = { Manager: null };
                                if (localStorage.getItem('user_session')) {
                                    localStorage.setItem('user_session', JSON.stringify(session));
                                } else {
                                    sessionStorage.setItem('user_session', JSON.stringify(session));
                                }
                            }
                        }
                    }
                    this.logSecurityAudit(
                        caller.principalId, 
                        caller.name, 
                        "MASTER_ADMIN_ROLE_CHANGE_SUCCESS", 
                        `Master Admin ownership transferred from ${caller.username} to ${targetUser.username}`
                    );
                    this.mockLogAudit(caller.name, "User Role Changed", `Transferred Master Admin ownership to ${targetUser.username}`);
                } else {
                    this.logSecurityAudit(
                        caller.principalId, 
                        caller.name, 
                        "MASTER_ADMIN_ROLE_CHANGE_BLOCKED", 
                        `Blocked role change for ${targetUser.username} to Master Admin because another Master Admin already exists.`
                    );
                    throw new Error("Security Policy Violation: Only one Master Admin account is allowed.");
                }
            }
        }

        // Check validation: Username, Email, and Mobile must be unique (if changed)
        const usernameLower = username.trim().toLowerCase();
        const duplicateUsername = users.some(u => u.principalId !== principalText && u.username.toLowerCase() === usernameLower);
        if (duplicateUsername) {
            throw new Error("Username already taken");
        }

        // Validate required contact details (Email and 10-digit mobile)
        if (!email.trim()) {
            throw new Error("Email is required");
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            throw new Error("Invalid email format");
        }

        if (!mobile.trim()) {
            throw new Error("Mobile number is required");
        }
        const mobileRegex = /^[0-9]{10}$/;
        if (!mobileRegex.test(mobile.trim())) {
            throw new Error("Mobile number must be exactly 10 digits");
        }

        const duplicateEmail = users.some(u => u.principalId !== principalText && u.email && u.email.toLowerCase() === email.trim().toLowerCase());
        if (duplicateEmail) {
            throw new Error("Email address already registered");
        }

        const duplicateMobile = users.some(u => u.principalId !== principalText && u.mobile && u.mobile === mobile.trim());
        if (duplicateMobile) {
            throw new Error("Mobile number already registered");
        }

        // Keep track of changes for logging
        const oldRoleText = 'Admin' in targetUser.role ? 'Admin' : ('Manager' in targetUser.role ? 'Manager' : 'Staff');
        const roleChanged = oldRoleText !== roleText;
        const statusChanged = targetUser.status !== status;
        const oldDeptText = targetUser.department ? Object.keys(targetUser.department)[0] : '';
        const newDeptText = departmentText || (roleText === 'Staff' ? 'Staff' : 'AdminSettings');
        const deptChanged = oldDeptText !== newDeptText;
        const permsChanged = JSON.stringify(targetUser.permissions) !== JSON.stringify(permissionsObj);

        // Apply edits
        targetUser.name = name.trim();
        targetUser.username = usernameLower;
        targetUser.email = email.trim();
        targetUser.mobile = mobile.trim();
        targetUser.role = roleText === 'Admin' ? { Admin: null } : (roleText === 'Manager' ? { Manager: null } : { Staff: null });
        targetUser.status = status;
        targetUser.department = this.parseDepartment(newDeptText, roleText);
        targetUser.permissions = permissionsObj || this.defaultPermissions(roleText);

        users[targetUserIdx] = targetUser;
        this.saveUsersRaw(users);

        // Audit Logs
        const targetUserRoleLabel = roleText === 'Admin' ? 'Master Admin' : (roleText === 'Manager' ? 'Admin' : 'Staff');
        this.logActivity(
            caller.principalId, 
            caller.name, 
            "User Updated", 
            `Target: ${targetUser.name} (@${targetUser.username}), Role: ${targetUserRoleLabel}, Info: Updated profile or contact details`
        );
        if (statusChanged) {
            this.logActivity(
                caller.principalId, 
                caller.name, 
                status === 'Deactivated' ? "User Deactivated" : "User Activated", 
                `Target: ${targetUser.name} (@${targetUser.username}), Role: ${targetUserRoleLabel}, Info: Updated status to ${status}`
            );
        }
        if (roleChanged) {
            const newRoleLabel = roleText === 'Admin' ? 'Master Admin' : (roleText === 'Manager' ? 'Admin' : 'Staff');
            const oldRoleLabel = oldRoleText === 'Admin' ? 'Master Admin' : (oldRoleText === 'Manager' ? 'Admin' : 'Staff');
            this.logActivity(
                caller.principalId, 
                caller.name, 
                "Role Changed", 
                `Target: ${targetUser.name} (@${targetUser.username}), Role: ${newRoleLabel}, Info: Changed role from ${oldRoleLabel} to ${newRoleLabel}`
            );
            this.mockLogAudit(caller.name, "User Role Changed", `Changed role of ${targetUser.name} from ${oldRoleText} to ${roleText}`);
        }
        if (deptChanged) {
            this.mockLogAudit(caller.name, "Department Assigned", `Assigned department ${newDeptText} to ${targetUser.username}`);
        }
        if (permsChanged) {
            this.mockLogAudit(caller.name, "Permission Changed", `Assigned permissions to ${targetUser.username}`);
            this.mockLogAudit(caller.name, "User Permission Updated", `Permissions configured for ${targetUser.username}`);
        }

        // If the edited user is the current caller, update their session
        if (caller.principalId === principalText) {
            const sessionStr = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                session.username = targetUser.username;
                session.name = targetUser.name;
                session.role = targetUser.role;
                session.department = targetUser.department;
                session.permissions = targetUser.permissions;
                if (localStorage.getItem('user_session')) {
                    localStorage.setItem('user_session', JSON.stringify(session));
                } else {
                    sessionStorage.setItem('user_session', JSON.stringify(session));
                }
            }
        }
    }

    async updateProfile(email: string, name: string, mobile: string, address: string, profilePhoto: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkAccess(['Admin', 'Manager'], caller);
        const users = this.getUsersRaw();
        const idx = users.findIndex(u => u.principalId === caller.principalId || u.username === caller.username);
        if (idx === -1) {
            throw new Error("User not found");
        }
        users[idx].email = email;
        users[idx].name = name;
        users[idx].mobile = mobile;
        users[idx].address = address;
        users[idx].profilePhoto = profilePhoto;
        this.saveUsersRaw(users);
        
        // Also update session
        const sessionStr = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            session.name = name;
            if (localStorage.getItem('user_session')) {
                localStorage.setItem('user_session', JSON.stringify(session));
            } else {
                sessionStorage.setItem('user_session', JSON.stringify(session));
            }
        }
        
        this.logActivity(caller.principalId, caller.name, "User updated", `Updated profile details for ${caller.username}`);
    }

    async changePassword(newPassword: string, newPrincipalId: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkAccess(['Admin', 'Manager'], caller);
        const users = this.getUsersRaw();
        const idx = users.findIndex(u => u.principalId === caller.principalId || u.username === caller.username);
        if (idx === -1) {
            throw new Error("User not found");
        }
        
        // Hash password locally inside mock database for verification
        const seedHex = await createPasswordHash(users[idx].username, newPassword);
        
        users[idx].principalId = newPrincipalId;
        users[idx].passwordHash = seedHex;
        users[idx].needsPasswordChange = false;
        this.saveUsersRaw(users);
        
        // Update session principal and credentials
        const sessionStr = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            session.principalId = newPrincipalId;
            session.secretKeyHex = seedHex;
            if (localStorage.getItem('user_session')) {
                localStorage.setItem('user_session', JSON.stringify(session));
            } else {
                sessionStorage.setItem('user_session', JSON.stringify(session));
            }
        }
        
        this.logActivity(caller.principalId, caller.name, "Password changed", `Updated password for ${caller.username}`);
    }

    async toggleUserStatus(principalText: string, status: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        if (!caller || !caller.role) {
            throw new Error("Access denied: insufficient department permission.");
        }

        if ('Staff' in caller.role) {
            this.mockLogAudit(caller.name, "Staff Access Blocked", "Staff tried to toggle user status.");
            throw new Error("Access denied: insufficient department permission.");
        }

        const users = this.getUsersRaw();
        const idx = users.findIndex(u => u.principalId === principalText);
        if (idx === -1) {
            throw new Error("User not found");
        }

        const targetUser = users[idx];

        if ('Manager' in caller.role) {
            const dept = caller.department ? Object.keys(caller.department)[0] : '';
            const perms = caller.permissions;
            if (dept !== 'AdminSettings' || !perms || !perms.canManageStaff || !('Staff' in targetUser.role)) {
                this.mockLogAudit(caller.name, "Admin Settings Access Blocked", "Manager lacks settings permission to toggle status or target is not staff.");
                throw new Error("Access denied: insufficient department permission.");
            }
        }

        // Master Admin protection
        if ('Admin' in targetUser.role) {
            this.logSecurityAudit(
                caller.principalId, 
                caller.name, 
                "MASTER_ADMIN_MODIFICATION_BLOCKED", 
                `Blocked attempt to deactivate Master Admin account ${targetUser.username}`
            );
            this.logActivity(
                caller.principalId, 
                caller.name, 
                "Master Admin Modification Blocked", 
                `Target: ${targetUser.name} (@${targetUser.username}), Role: Master Admin, Info: Blocked attempt to modify Master Admin (Action: Deactivate)`
            );
            throw new Error("Security Policy Violation: Master Admin cannot be modified.");
        }

        users[idx].status = status;
        this.saveUsersRaw(users);
        
        const targetUserRoleLabel = 'Admin' in users[idx].role ? 'Master Admin' : ('Manager' in users[idx].role ? 'Admin' : 'Staff');
        this.logActivity(
            caller.principalId, 
            caller.name, 
            status === 'Deactivated' ? "User Deactivated" : "User Activated", 
            `Target: ${users[idx].name} (@${users[idx].username}), Role: ${targetUserRoleLabel}, Info: Updated status to ${status}`
        );
    }

    async adminResetPassword(principalText: string, newPrincipalId: string, newPasswordHash?: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        if (!caller || !caller.role) {
            throw new Error("Access denied: insufficient department permission.");
        }

        const callerStatus = caller.status ? (typeof caller.status === 'string' ? caller.status : Object.keys(caller.status)[0]) : '';
        if (callerStatus !== 'Active') {
            throw new Error("Access denied: caller account is inactive.");
        }

        if ('Staff' in caller.role) {
            this.mockLogAudit(caller.name, "Staff Access Blocked", "Staff tried to reset user password.");
            throw new Error("Access denied: insufficient department permission.");
        }

        const users = this.getUsersRaw();
        const idx = users.findIndex(u => u.principalId === principalText);
        if (idx === -1) {
            throw new Error("User not found");
        }

        const targetUser = users[idx];

        const targetStatus = targetUser.status ? (typeof targetUser.status === 'string' ? targetUser.status : Object.keys(targetUser.status)[0]) : '';
        if (targetStatus !== 'Active') {
            throw new Error("Access denied: target account is inactive.");
        }

        if ('Manager' in caller.role) {
            const dept = caller.department ? Object.keys(caller.department)[0] : '';
            const perms = caller.permissions;
            if (dept !== 'AdminSettings' || !perms || !perms.canManageStaff || !('Staff' in targetUser.role)) {
                this.mockLogAudit(caller.name, "Admin Settings Access Blocked", "Manager lacks settings permission to reset password or target is not staff.");
                throw new Error("Access denied: insufficient department permission.");
            }
        }

        // Master Admin protection
        if ('Admin' in targetUser.role) {
            this.logSecurityAudit(
                caller.principalId, 
                caller.name, 
                "MASTER_ADMIN_MODIFICATION_BLOCKED", 
                `Blocked attempt to reset password of Master Admin account ${targetUser.username}`
            );
            this.logActivity(
                caller.principalId, 
                caller.name, 
                "Master Admin Modification Blocked", 
                `Target: ${targetUser.name} (@${targetUser.username}), Role: Master Admin, Info: Blocked attempt to modify Master Admin (Action: Reset Password)`
            );
            throw new Error("Security Policy Violation: Master Admin cannot be modified.");
        }

        users[idx].principalId = newPrincipalId;
        if (newPasswordHash) {
            users[idx].passwordHash = newPasswordHash;
            users[idx].needsPasswordChange = true;
        }
        this.saveUsersRaw(users);
        
        this.logSecurityAudit(
            caller.principalId,
            caller.name,
            "ADMIN_RESET_PASSWORD",
            `Reset password for ${targetUser.username}`
        );
    }

    async resetPasswordWithVerification(
        username: string,
        email: string,
        mobile: string,
        newPasswordHash: string,
        newPrincipalId: string
    ): Promise<{ success: boolean; message: string }> {
        const writeAuditLog = (
            action: string,
            description: string,
            userObj?: any,
            metadata?: any
        ) => {
            const logs = this.getAuditLogsRaw();
            const nextId = (logs.reduce((max: number, item: any) => Math.max(max, parseInt(item.id) || 0), 0) + 1).toString();
            
            const newLog = {
                id: nextId,
                timestamp: Date.now().toString(),
                operator: userObj ? userObj.name : 'Anonymous',
                operatorRole: userObj ? this.getRoleText(userObj.role) : 'Anonymous',
                module: 'AUTH',
                action,
                description,
                targetUser: userObj ? userObj.username : '',
                targetRole: userObj ? this.getRoleText(userObj.role) : '',
                userId: userObj ? userObj.principalId : '',
                username: userObj ? userObj.username : '',
                role: userObj ? this.getRoleText(userObj.role) : 'Anonymous',
                metadata: metadata || {}
            };
            logs.unshift(newLog);
            this.saveAuditLogsRaw(logs);
        };

        writeAuditLog(
            "PASSWORD_RESET_ATTEMPT_NEUTRALIZED",
            "Anonymous recovery attempt received"
        );

        return {
            success: false,
            message: "If account details are valid, recovery will continue."
        };
    }

    async logUserAction(action: string, details: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkAccess(['Admin', 'Manager'], caller);
        this.logActivity(caller.principalId, caller.name, action, details);
    }

    async deleteUser(principalText: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        if (!caller || !caller.role) {
            throw new Error("Access denied: insufficient department permission.");
        }

        if ('Staff' in caller.role) {
            this.mockLogAudit(caller.name, "Staff Access Blocked", "Staff tried to delete a user.");
            throw new Error("Access denied: insufficient department permission.");
        }

        const users = this.getUsersRaw();
        const found = users.find(u => u.principalId === principalText);
        if (!found) {
            throw new Error("User not found");
        }

        if ('Manager' in caller.role) {
            const dept = caller.department ? Object.keys(caller.department)[0] : '';
            const perms = caller.permissions;
            if (dept !== 'AdminSettings' || !perms || !perms.canManageStaff || !('Staff' in found.role)) {
                this.mockLogAudit(caller.name, "Admin Settings Access Blocked", "Manager lacks settings permission to delete users or tried deleting non-staff.");
                throw new Error("Access denied: insufficient department permission.");
            }
        }

        // Master Admin protection
        if ('Admin' in found.role) {
            this.logSecurityAudit(
                caller.principalId, 
                caller.name, 
                "MASTER_ADMIN_MODIFICATION_BLOCKED", 
                `Blocked attempt to delete Master Admin user: ${found.name} (${principalText})`
            );
            this.logActivity(
                caller.principalId, 
                caller.name, 
                "Master Admin Modification Blocked", 
                `Target: ${found.name} (@${found.username}), Role: Master Admin, Info: Blocked attempt to modify Master Admin (Action: Delete)`
            );
            throw new Error("Security Policy Violation: Master Admin cannot be modified.");
        }

        if (caller.principalId === principalText) {
            throw new Error("Cannot delete yourself");
        }

        const filtered = users.filter(u => u.principalId !== principalText);
        this.saveUsersRaw(filtered);

        const targetUserRoleLabel = 'Admin' in found.role ? 'Master Admin' : ('Manager' in found.role ? 'Admin' : 'Staff');
        this.logActivity(
            caller.principalId, 
            caller.name, 
            "User Deleted", 
            `Target: ${found.name} (@${found.username}), Role: ${targetUserRoleLabel}, Info: Deleted user account from database`
        );
        this.mockLogAudit(caller.name, "User Deleted", `Deleted user ${found.name} (${principalText})`);
    }

    async getUsers(): Promise<Array<User>> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['AdminSettings'], 'canManageStaff', caller);

        const users = this.getUsersRaw();
        return users.map(u => this.mapToUser(u));
    }

    async getActivityLogs(): Promise<Array<ActivityLog>> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['AdminSettings'], 'canViewLogs', caller);

        const logs = this.getAuditLogsRaw();
        return logs.map(l => ({
            id: BigInt(l.id),
            timestamp: BigInt(l.timestamp) * 1000000n,
            userPrincipal: l.operator || 'System',
            userName: l.operator || 'System',
            action: l.action,
            details: l.description,
            operator: l.operator || 'System',
            operatorRole: l.operatorRole || 'System',
            module: l.module || 'ERP',
            targetUser: l.targetUser || '',
            targetRole: l.targetRole || ''
        }));
    }

    async getInvoices(): Promise<Array<Invoice>> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Sales', 'Finance'], 'canView', caller);

        const list = this.getInvoicesRaw();
        const mapped = list.map(item => this.mapToInvoice(item));
        return mapped.sort((a, b) => Number(b.date - a.date));
    }

    async getNextInvoiceNumber(): Promise<string> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Sales', 'Finance'], 'canView', caller);

        const list = this.getInvoicesRaw();
        const nextId = (list.reduce((max, item) => Math.max(max, parseInt(item.id) || 0), 0) + 1).toString();
        return `INV-${nextId}`;
    }

    async getInvoiceById(id: bigint): Promise<Invoice> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Sales', 'Finance'], 'canView', caller);

        const list = this.getInvoicesRaw();
        const found = list.find(item => item.id === id.toString());
        if (!found) {
            throw new Error('Invoice not found');
        }
        return this.mapToInvoice(found);
    }

    private getStockAlertsRaw(): any[] {
        const stored = localStorage.getItem('mock_stock_alerts');
        return stored ? JSON.parse(stored) : [];
    }

    private saveStockAlertsRaw(alerts: any[]) {
        localStorage.setItem('mock_stock_alerts', JSON.stringify(alerts));
    }

    private createStockAlertRaw(
        productId: string,
        productName: string,
        alertType: "LOW_STOCK" | "OUT_OF_STOCK" | "NEGATIVE_STOCK_PREVENTED" | "PRODUCTION_REQUIRED",
        currentStock: number,
        requiredQty: number,
        shortageQty: number,
        sourceModule: "SALES" | "ORDER_BOOK" | "PRODUCTION" | "INVENTORY",
        sourceId?: string
    ) {
        const alerts = this.getStockAlertsRaw();
        const existing = alerts.find(a => a.productId === productId && a.alertType === alertType && !a.isResolved);
        if (existing) {
            existing.currentStock = currentStock;
            existing.requiredQty = requiredQty;
            existing.shortageQty = shortageQty;
            existing.createdAt = new Date().toISOString();
            this.saveStockAlertsRaw(alerts);
            return;
        }

        const nextId = (alerts.reduce((max: number, item: any) => Math.max(max, parseInt(item.id) || 0), 0) + 1).toString();
        const alert = {
            id: nextId,
            productId,
            productName,
            alertType,
            currentStock,
            requiredQty,
            shortageQty,
            sourceModule,
            sourceId: sourceId || '',
            message: `Product ${productName} has status ${alertType}. Current Stock: ${currentStock} pcs, Shortage: ${shortageQty} pcs.`,
            isResolved: false,
            createdAt: new Date().toISOString()
        };
        alerts.unshift(alert);
        this.saveStockAlertsRaw(alerts);
    }

    private repairNegativeStock() {
        const products = this.getProductsRaw();
        let changed = false;
        products.forEach(p => {
            const currentVal = parseInt(p.stock) || 0;
            if (currentVal < 0) {
                const oldStock = currentVal;
                const shortageQty = Math.abs(oldStock);
                p.stock = 0;
                p.shortageQty = shortageQty;
                changed = true;

                this.createStockAlertRaw(
                    p.id,
                    p.vigat,
                    "NEGATIVE_STOCK_PREVENTED",
                    0,
                    0,
                    shortageQty,
                    "INVENTORY",
                    "REPAIR"
                );

                this.createStockAlertRaw(
                    p.id,
                    p.vigat,
                    "PRODUCTION_REQUIRED",
                    0,
                    0,
                    shortageQty,
                    "INVENTORY",
                    "REPAIR"
                );

                const metadata = {
                    productId: p.id,
                    productName: p.vigat,
                    oldStock,
                    attemptedStock: oldStock,
                    finalStock: 0,
                    shortageQty,
                    sourceModule: "INVENTORY",
                    sourceId: "REPAIR"
                };
                this.logAuditUnified(
                    'ERP',
                    'FINISHED_GOODS_STOCK_CLAMPED_TO_ZERO',
                    `Negative stock repaired and clamped to 0 for ${p.vigat}. Metadata: ${JSON.stringify(metadata)}`
                );

                console.log(`[StockRepair] ${p.vigat} repaired from ${oldStock} to 0`);
            }
        });
        if (changed) {
            this.saveProductsRaw(products);
        }
    }

    private adjustStock(vigatWithHsn: string, qtyChange: number, sourceModule: "SALES" | "ORDER_BOOK" | "PRODUCTION" | "INVENTORY" = "SALES", sourceId?: string) {
        const parts = vigatWithHsn.split('|');
        const vigat = parts[0];
        const products = this.getProductsRaw();
        const found = products.find(p => p.vigat === vigat);
        if (found) {
            const oldStock = parseInt(found.stock) || 0;
            const attemptedStock = oldStock + qtyChange;
            let finalStock = attemptedStock;
            let shortageQty = 0;

            if (attemptedStock < 0) {
                finalStock = 0;
                shortageQty = Math.abs(attemptedStock);

                this.createStockAlertRaw(
                    found.id,
                    found.vigat,
                    "NEGATIVE_STOCK_PREVENTED",
                    0,
                    Math.abs(qtyChange),
                    shortageQty,
                    sourceModule,
                    sourceId
                );

                this.createStockAlertRaw(
                    found.id,
                    found.vigat,
                    "PRODUCTION_REQUIRED",
                    0,
                    Math.abs(qtyChange),
                    shortageQty,
                    sourceModule,
                    sourceId
                );

                const metadata = {
                    productId: found.id,
                    productName: found.vigat,
                    oldStock,
                    attemptedStock,
                    finalStock,
                    shortageQty,
                    sourceModule,
                    sourceId: sourceId || ''
                };
                this.logAuditUnified(
                    'ERP',
                    'NEGATIVE_STOCK_PREVENTED',
                    `Negative stock prevented for ${found.vigat}. Metadata: ${JSON.stringify(metadata)}`
                );
            } else {
                if (finalStock === 0) {
                    this.createStockAlertRaw(
                        found.id,
                        found.vigat,
                        "OUT_OF_STOCK",
                        0,
                        Math.abs(qtyChange),
                        0,
                        sourceModule,
                        sourceId
                    );
                } else if (finalStock <= 10) {
                    this.createStockAlertRaw(
                        found.id,
                        found.vigat,
                        "LOW_STOCK",
                        finalStock,
                        Math.abs(qtyChange),
                        0,
                        sourceModule,
                        sourceId
                    );
                }
            }

            found.stock = finalStock;
            found.shortageQty = shortageQty;
            this.saveProductsRaw(products);
        }
    }

    // Material BOM Stock Deductions
    private adjustRawMaterialsFromBOM(vigatWithHsn: string, qtySold: number, invoiceNo: string, isRevert: boolean) {
        const parts = vigatWithHsn.split('|');
        const vigat = parts[0];
        const products = this.getProductsRaw();
        const foundProd = products.find(p => p.vigat === vigat);
        if (foundProd && foundProd.bom && foundProd.bom.length > 0) {
            const rawMaterials = this.getRawMaterialsRaw();
            const consumption = this.getConsumptionHistoryRaw();

            foundProd.bom.forEach((bomReq: any) => {
                const qtyToConsume = Number(bomReq.quantity) * qtySold;
                const mat = rawMaterials.find(m => m.id === bomReq.materialId);
                if (mat) {
                    if (isRevert) {
                        mat.consumedQty = Math.max(0, (mat.consumedQty || 0) - qtyToConsume);
                        mat.currentStock = (mat.openingStock || 0) + (mat.purchasedQty || 0) - mat.consumedQty;
                    } else {
                        mat.consumedQty = (mat.consumedQty || 0) + qtyToConsume;
                        mat.currentStock = (mat.openingStock || 0) + (mat.purchasedQty || 0) - mat.consumedQty;

                        // Log consumption
                        const nextId = (consumption.reduce((max, item) => Math.max(max, parseInt(item.id) || 0), 0) + 1).toString();
                        consumption.unshift({
                            id: nextId,
                            date: Date.now().toString(),
                            finishedGoodId: foundProd.id,
                            finishedGoodName: foundProd.vigat,
                            invoiceNumber: invoiceNo,
                            materialId: mat.id,
                            materialName: mat.name,
                            quantityConsumed: qtyToConsume
                        });
                    }
                }
            });

            this.saveRawMaterialsRaw(rawMaterials);
            if (!isRevert) {
                this.saveConsumptionHistoryRaw(consumption);
            }
        }
    }

    private autoRegisterCustomer(customerInfo: CustomerInfo) {
        if (!customerInfo.name) return;
        const customers = this.getCustomersRaw();
        const taxIdParts = customerInfo.taxId.split('|');
        const phone = taxIdParts[0] || '';
        const gstNo = taxIdParts[1] || '';
        
        const existingIdx = customers.findIndex(c => c.name === customerInfo.name);
        const customer = {
            id: customerInfo.name,
            name: customerInfo.name,
            businessAddress: customerInfo.businessAddress,
            phone,
            gstNo
        };
        if (existingIdx !== -1) {
            customers[existingIdx] = customer;
        } else {
            customers.push(customer);
        }
        this.saveCustomersRaw(customers);
    }

    private getProductsRaw(): any[] {
        const stored = localStorage.getItem('mock_products');
        let products = stored ? JSON.parse(stored) : [
            { id: '1', vigat: 'Beaded Toran', rate: 120.00, hsnCode: '5609', stock: 50, productionCost: 45.0, bom: [] },
            { id: '2', vigat: 'Designer Latkan', rate: 85.00, hsnCode: '5609', stock: 100, productionCost: 30.0, bom: [] },
            { id: '3', vigat: 'Hanging Diya', rate: 210.00, hsnCode: '5609', stock: 35, productionCost: 90.0, bom: [] }
        ];
        if (!products.some((p: any) => p.vigat === 'Premium Toran')) {
            products.push({ id: '4', vigat: 'Premium Toran', rate: 150.00, hsnCode: '5609', stock: 52, productionCost: 60.0, bom: [] });
            localStorage.setItem('mock_products', JSON.stringify(products));
        }
        return products;
    }

    private saveProductsRaw(products: any[]) {
        localStorage.setItem('mock_products', JSON.stringify(products));
    }

    private getCustomersRaw(): any[] {
        const stored = localStorage.getItem('mock_customers');
        return stored ? JSON.parse(stored) : [];
    }

    private saveCustomersRaw(customers: any[]) {
        localStorage.setItem('mock_customers', JSON.stringify(customers));
    }

    async saveInvoice(businessInfo: string, customerInfo: CustomerInfo, products: Array<Product>, totalAmount: number, paidAmount: number): Promise<string> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Sales'], 'canCreate', caller);

        const list = this.getInvoicesRaw();
        const nextId = (list.reduce((max, item) => Math.max(max, parseInt(item.id) || 0), 0) + 1).toString();
        const invoiceNumber = `INV-${nextId}`;
        const taxIdParts = (customerInfo.taxId || '').split('|');
        const hasSnapshot = taxIdParts.length > 11;
        const newInvoice = {
            id: nextId,
            invoiceNumber,
            date: Date.now().toString(),
            businessInfo,
            customerInfo,
            products: products.map(p => [p[0], p[1].toString(), p[2].toString()]),
            totalAmount,
            paidAmount,
            creatorPrincipal: caller.principalId,
            creatorName: caller.name,
            previousBalanceAtCreation: hasSnapshot ? Number(taxIdParts[6]) : 0,
            advanceBalanceAtCreation: hasSnapshot ? Number(taxIdParts[7]) : 0,
            currentInvoiceTotalAtCreation: hasSnapshot ? Number(taxIdParts[8]) : 0,
            totalPayableAtCreation: hasSnapshot ? Number(taxIdParts[9]) : 0,
            paidAmountAtCreation: hasSnapshot ? Number(taxIdParts[10]) : 0,
            finalDueAtCreation: hasSnapshot ? Number(taxIdParts[11]) : 0
        };
        list.push(newInvoice);
        this.saveInvoicesRaw(list);

        // Deduct finished goods stock & raw materials
        products.forEach(p => {
            const parts = p[0].split('|');
            const productVigat = parts[0];
            const prods = this.getProductsRaw();
            const prod = prods.find(pr => pr.vigat === productVigat);
            const currentStock = prod ? (parseInt(prod.stock) || 0) : 0;
            const orderQty = Number(p[1]);

            let logReason = `Invoice ${invoiceNumber}`;
            if (orderQty > currentStock) {
                logReason += ` (Production Pending / Material Shortage)`;
            }

            this.adjustStock(p[0], -orderQty, "SALES", invoiceNumber);
            this.saveFinishedGoodsLogRaw(p[0], orderQty, "Sold", logReason);
        });

        // Register customer
        this.autoRegisterCustomer(customerInfo);

        this.logActivity(caller.principalId, caller.name, "Create Invoice", `Created invoice ${invoiceNumber} for ${customerInfo.name}`);

        return invoiceNumber;
    }

    async updateInvoice(id: bigint, businessInfo: string, customerInfo: CustomerInfo, products: Array<Product>, totalAmount: number, paidAmount: number): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Sales'], 'canEdit', caller);

        const list = this.getInvoicesRaw();
        const idx = list.findIndex(item => item.id === id.toString());
        if (idx === -1) {
            throw new Error('Invoice not found');
        }

        const existing = list[idx];
        
        // Revert old stock
        (existing.products || []).forEach((p: any) => {
            this.adjustStock(p[0], Number(p[1]));
            // this.adjustRawMaterialsFromBOM(p[0], Number(p[1]), existing.invoiceNumber, true);
            this.saveFinishedGoodsLogRaw(p[0], Number(p[1]), "Returned", `Invoice ${existing.invoiceNumber} Updated (Revert)`);
        });

        // Deduct new stock
        products.forEach(p => {
            const parts = p[0].split('|');
            const productVigat = parts[0];
            const prods = this.getProductsRaw();
            const prod = prods.find(pr => pr.vigat === productVigat);
            const currentStock = prod ? (parseInt(prod.stock) || 0) : 0;
            const orderQty = Number(p[1]);

            let logReason = `Invoice ${existing.invoiceNumber} Updated (New)`;
            if (orderQty > currentStock) {
                logReason += ` (Production Pending / Material Shortage)`;
            }

            this.adjustStock(p[0], -orderQty, "SALES", existing.invoiceNumber);
            this.saveFinishedGoodsLogRaw(p[0], orderQty, "Sold", logReason);
        });

        // Register customer
        this.autoRegisterCustomer(customerInfo);

        const taxIdParts = (customerInfo.taxId || '').split('|');
        const hasSnapshot = taxIdParts.length > 11;
        list[idx] = {
            ...existing,
            businessInfo,
            customerInfo,
            products: products.map(p => [p[0], p[1].toString(), p[2].toString()]),
            totalAmount,
            paidAmount,
            previousBalanceAtCreation: hasSnapshot ? Number(taxIdParts[6]) : (existing.previousBalanceAtCreation !== undefined ? existing.previousBalanceAtCreation : 0),
            advanceBalanceAtCreation: hasSnapshot ? Number(taxIdParts[7]) : (existing.advanceBalanceAtCreation !== undefined ? existing.advanceBalanceAtCreation : 0),
            currentInvoiceTotalAtCreation: hasSnapshot ? Number(taxIdParts[8]) : (existing.currentInvoiceTotalAtCreation !== undefined ? existing.currentInvoiceTotalAtCreation : 0),
            totalPayableAtCreation: hasSnapshot ? Number(taxIdParts[9]) : (existing.totalPayableAtCreation !== undefined ? existing.totalPayableAtCreation : 0),
            paidAmountAtCreation: hasSnapshot ? Number(taxIdParts[10]) : (existing.paidAmountAtCreation !== undefined ? existing.paidAmountAtCreation : 0),
            finalDueAtCreation: hasSnapshot ? Number(taxIdParts[11]) : (existing.finalDueAtCreation !== undefined ? existing.finalDueAtCreation : 0)
        };
        this.saveInvoicesRaw(list);

        this.logActivity(caller.principalId, caller.name, "Update Invoice", `Updated invoice ${existing.invoiceNumber}`);
    }

    async deleteInvoice(id: bigint): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Sales'], 'canDelete', caller);

        const list = this.getInvoicesRaw();
        const found = list.find(item => item.id === id.toString());
        if (!found) {
            throw new Error('Invoice not found');
        }
        this.mockLogAudit(caller.name, "Invoice Deleted", `Deleted invoice ${found.invoiceNumber}`);

        // Revert stock
        (found.products || []).forEach((p: any) => {
            this.adjustStock(p[0], Number(p[1]));
            // this.adjustRawMaterialsFromBOM(p[0], Number(p[1]), found.invoiceNumber, true);
            this.saveFinishedGoodsLogRaw(p[0], Number(p[1]), "Returned", `Invoice ${found.invoiceNumber} Deleted`);
        });

        const filtered = list.filter(item => item.id !== id.toString());
        this.saveInvoicesRaw(filtered);

        this.logActivity(caller.principalId, caller.name, "Delete Invoice", `Deleted invoice ${found.invoiceNumber}`);
    }

    async getProducts(): Promise<Array<ProductItem>> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Inventory', 'Sales', 'Production', 'Finance'], 'canView', caller);
        
        // Auto repair negative stock
        this.repairNegativeStock();

        const products = this.getProductsRaw();
        const rawMaterials = this.getRawMaterialsRaw();
        return products.map(p => {
            const bomCost = p.bom ? p.bom.reduce((sum: number, req: any) => {
                const mat = rawMaterials.find(m => m.id === req.materialId || m.name === req.materialId);
                const cost = mat ? mat.unitCost : 0;
                return sum + (req.quantity * cost);
            }, 0) : 0;
            const laborCost = this.getLaborCostForProduct(p.id, p.vigat);
            return {
                id: p.id,
                vigat: p.vigat,
                rate: Number(p.rate),
                hsnCode: p.hsnCode || '5609',
                stock: BigInt(p.stock),
                productionCost: bomCost + laborCost,
                bom: p.bom || [],
                shortageQty: Number(p.shortageQty || 0)
            };
        });
    }

    async saveProduct(id: string, vigat: string, rate: number, hsnCode: string, stock: bigint, productionCost: number, bom: Array<BOMRequirement>): Promise<void> {
        const caller = this.getCurrentUserRaw();
        const products = this.getProductsRaw();
        const existingIdx = products.findIndex(p => p.id === id);
        const toggle = existingIdx !== -1 ? 'canEdit' : 'canCreate';
        this.checkDeptAccess(['Inventory', 'Production', 'Finance'], toggle, caller);

        if (existingIdx !== -1) {
            const oldStock = products[existingIdx].stock;
            if (Number(oldStock) !== Number(stock)) {
                this.mockLogAudit(caller.name, "Stock Adjusted", `Adjusted stock for product ${vigat} from ${oldStock} to ${stock}`);
            }
        }
        
        let finalStock = Number(stock);
        let shortageQty = existingIdx !== -1 ? (products[existingIdx].shortageQty || 0) : 0;
        
        if (finalStock < 0) {
            shortageQty = Math.abs(finalStock);
            finalStock = 0;
            this.createStockAlertRaw(id, vigat, "NEGATIVE_STOCK_PREVENTED", 0, 0, shortageQty, "INVENTORY", "SAVE_PRODUCT");
            this.createStockAlertRaw(id, vigat, "PRODUCTION_REQUIRED", 0, 0, shortageQty, "INVENTORY", "SAVE_PRODUCT");
            
            const metadata = {
                productId: id,
                productName: vigat,
                oldStock: existingIdx !== -1 ? products[existingIdx].stock : 0,
                attemptedStock: Number(stock),
                finalStock: 0,
                shortageQty,
                sourceModule: "INVENTORY",
                sourceId: "SAVE_PRODUCT"
            };
            this.logAuditUnified(
                'ERP',
                'NEGATIVE_STOCK_PREVENTED',
                `Negative stock prevented during save product for ${vigat}. Metadata: ${JSON.stringify(metadata)}`
            );
        }

        const openingStock = existingIdx !== -1 ? (products[existingIdx].openingStock || finalStock) : finalStock;
        const product = {
            id,
            vigat,
            rate,
            hsnCode,
            stock: finalStock,
            openingStock,
            productionCost,
            bom,
            shortageQty
        };
        console.log(`[BOMUnitSave] productId=${id}, rowCount=${bom ? bom.length : 0}`);
        if (existingIdx !== -1) {
            products[existingIdx] = product;
        } else {
            products.push(product);
        }
        this.saveProductsRaw(products);
    }

    async deleteProduct(id: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Inventory'], 'canDelete', caller);
        const products = this.getProductsRaw();
        const filtered = products.filter(p => p.id !== id);
        this.saveProductsRaw(filtered);
    }

    private getLaborCostForProduct(productId: string, productVigat: string): number {
        const collections = this.getCollectionsRaw();
        const jobs = this.getJobWorksRaw();
        
        const productCollections = collections.filter(c => c.productName === productVigat);
        let totalWages = 0;
        let totalAccepted = 0;
        
        const settingsStored = localStorage.getItem('mock_settings');
        const settings = settingsStored ? JSON.parse(settingsStored) : { enableRejectedWage: false };
        
        productCollections.forEach(c => {
            const j = jobs.find(job => job.id === c.jobWorkNo);
            const rate = j ? Number(j.ratePerPiece) : 0;
            const wageBase = settings.enableRejectedWage ? (Number(c.acceptedQty || 0) + Number(c.rejectedQty || 0)) : Number(c.acceptedQty || 0);
            totalWages += wageBase * rate;
            totalAccepted += Number(c.acceptedQty || 0);
        });
        
        if (totalAccepted > 0) {
            return totalWages / totalAccepted;
        }
        
        const productJobs = jobs.filter(j => j.productName === productVigat);
        if (productJobs.length > 0) {
            const latestJob = [...productJobs].sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0))[0];
            return Number(latestJob.ratePerPiece || 0);
        }
        
        const stored = JSON.parse(localStorage.getItem('mock_product_extra_costs') || '{}');
        if (stored[productId] && typeof stored[productId].laborCost === 'number') {
            return stored[productId].laborCost;
        }
        
        const defaults: { [key: string]: number } = {
            'PRD-1': 30,
            'PRD-2': 50,
            '1': 30,
            '2': 50
        };
        return defaults[productId] || defaults[productId.replace('PRD-', '')] || 0;
    }

    private updateProductProductionCost(productVigat: string) {
        const products = this.getProductsRaw();
        const prodIdx = products.findIndex(p => p.vigat === productVigat);
        if (prodIdx === -1) return;
        
        const prod = products[prodIdx];
        const rawMaterials = this.getRawMaterialsRaw();
        const bomCost = prod.bom ? prod.bom.reduce((sum: number, req: any) => {
            const mat = rawMaterials.find(m => m.id === req.materialId || m.name === req.materialId);
            const cost = mat ? mat.unitCost : 0;
            return sum + (req.quantity * cost);
        }, 0) : 0;
        
        const laborCost = this.getLaborCostForProduct(prod.id, prod.vigat);
        prod.productionCost = bomCost + laborCost;
        
        this.saveProductsRaw(products);
    }

    async getCustomers(): Promise<Array<CustomerItem>> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Sales', 'Finance'], 'canView', caller);
        const customers = this.getCustomersRaw();
        return customers.map(c => ({
            id: c.id,
            name: c.name,
            businessAddress: c.businessAddress,
            phone: c.phone || '',
            gstNo: c.gstNo || ''
        }));
    }

    async saveCustomer(id: string, name: string, businessAddress: string, phone: string, gstNo: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Sales', 'Finance'], 'canCreate', caller);
        const customers = this.getCustomersRaw();
        const existingIdx = customers.findIndex(c => c.id === id);
        const customer = {
            id,
            name,
            businessAddress,
            phone,
            gstNo
        };
        if (existingIdx !== -1) {
            customers[existingIdx] = customer;
        } else {
            customers.push(customer);
        }
        this.saveCustomersRaw(customers);
    }

    async deleteCustomer(id: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Sales'], 'canDelete', caller);
        const customers = this.getCustomersRaw();
        const filtered = customers.filter(c => c.id !== id);
        this.saveCustomersRaw(filtered);
    }

    async getSettings(): Promise<Settings> {
        const caller = this.getCurrentUserRaw();
        this.checkAccess(['Admin', 'Manager'], caller);

        const stored = localStorage.getItem('mock_settings');
        if (stored) {
            const s = JSON.parse(stored);
            return {
                businessInfo: s.businessInfo,
                defaultGstRate: s.defaultGstRate,
                termsAndConditions: s.termsAndConditions,
                allowStaffCollection: s.allowStaffCollection !== undefined ? s.allowStaffCollection : true,
                enableRejectedWage: s.enableRejectedWage !== undefined ? s.enableRejectedWage : false,
                companyLogo: s.companyLogo,
                companyName: s.companyName || "Gujarat Art & Crafts",
                themeColors: s.themeColors,
                sidebarStyle: s.sidebarStyle || "Minimalist"
            };
        }
        return {
            businessInfo: "GUJARAT ART & CRAFTS|A/26-27, Shreeram Park, Nr. Amikunj Society, Thakkarnagar, Ahmedabad-382350.|9824092261, 9824434096|24APYPP8111N1Z4",
            defaultGstRate: 5,
            termsAndConditions: "1. Any complaint regarding this bill must be made within three days.\n2. Subject to Ahmedabad Jurisdiction.\n3. Our risk & responsibility ceases on delivery or goods on Railway-Transport.",
            allowStaffCollection: true,
            enableRejectedWage: false,
            companyName: "Gujarat Art & Crafts",
            sidebarStyle: "Minimalist"
        };
    }

     async saveSettings(
        businessInfo: string,
        defaultGstRate: number,
        termsAndConditions: string,
        allowStaffCollection?: boolean,
        enableRejectedWage?: boolean,
        companyLogo?: string,
        companyName?: string,
        themeColors?: string,
        sidebarStyle?: string,
        allowAdminBackupRestore?: boolean,
        enableAutoStockAlerts?: boolean,
        alertFrequency?: string,
        lowStockAlertThreshold?: number
    ): Promise<void> {
        const caller = this.getCurrentUserRaw();
        if (!caller || !('Admin' in caller.role)) {
            throw new Error("Access denied: insufficient permissions.");
        }

        const settings: Settings = {
            businessInfo,
            defaultGstRate,
            termsAndConditions,
            allowStaffCollection: allowStaffCollection !== undefined ? allowStaffCollection : true,
            enableRejectedWage: enableRejectedWage !== undefined ? enableRejectedWage : false,
            companyLogo,
            companyName,
            themeColors,
            sidebarStyle,
            allowAdminBackupRestore: allowAdminBackupRestore !== undefined ? allowAdminBackupRestore : false,
            enableAutoStockAlerts: enableAutoStockAlerts !== undefined ? enableAutoStockAlerts : true,
            alertFrequency,
            lowStockAlertThreshold
        };
        localStorage.setItem('mock_settings', JSON.stringify(settings));

        this.logActivity(caller.principalId, caller.name, "Update Settings", "Updated business settings");
        this.mockLogAudit(caller.name, "Settings Changed", "Updated system and business settings");
    }

    private getPaymentsRaw(): any[] {
        const stored = localStorage.getItem('mock_payments');
        return stored ? JSON.parse(stored) : [];
    }

    private savePaymentsRaw(payments: any[]) {
        localStorage.setItem('mock_payments', JSON.stringify(payments));
    }

    // Dashboard Calculations
    async getDashboardStats(): Promise<DashboardStats> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Sales', 'Finance', 'Purchase', 'Inventory'], 'canView', caller);

        const list = this.getInvoicesRaw();
        const payments = this.getPaymentsRaw();
        const purchases = this.getPurchasesRaw();
        const expenses = this.getExpensesRaw();
        const rawMaterials = this.getRawMaterialsRaw();
        const products = this.getProductsRaw();
        
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayEnd = todayStart + 24 * 60 * 60 * 1000;

        let todayInvoiceCount = 0n;
        let todayTotalSales = 0;
        let allTimeInvoiceCount = BigInt(list.length);
        let allTimeTotalSales = 0;

        let totalOutstandingAmount = 0;
        let overdueInvoiceCount = 0n;
        let thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

        list.forEach(item => {
            const dateMs = parseInt(item.date) || 0;
            const amt = item.totalAmount || 0;
            const paid = item.paidAmount !== undefined ? item.paidAmount : item.totalAmount;
            const due = amt - paid;
            
            allTimeTotalSales += amt;
            totalOutstandingAmount += due;

            if (due > 0 && dateMs < thirtyDaysAgo) {
                overdueInvoiceCount++;
            }

            if (dateMs >= todayStart && dateMs < todayEnd) {
                todayInvoiceCount++;
                todayTotalSales += amt;
            }
        });

        let todayCollections = 0;
        payments.forEach(p => {
            const dateMs = parseInt(p.date) || 0;
            if (dateMs >= todayStart && dateMs < todayEnd) {
                todayCollections += p.amount;
            }
        });

        const customersWithOutstandingSet = new Set<string>();
        list.forEach(item => {
            const paid = item.paidAmount !== undefined ? item.paidAmount : item.totalAmount;
            const due = item.totalAmount - paid;
            if (due > 0) {
                customersWithOutstandingSet.add(item.customerInfo.name);
            }
        });
        const customersWithOutstanding = BigInt(customersWithOutstandingSet.size);

        // Compute new ERP Stats
        const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
        const vendorDue = purchases.reduce((sum, p) => sum + (p.totalAmount - p.paidAmount), 0);
        
        const rawMaterialsVal = rawMaterials.reduce((sum, m) => sum + ((m.currentStock || 0) * (m.unitCost || 0)), 0);
        const finishedGoodsVal = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.productionCost || 0)), 0);
        const stockValue = rawMaterialsVal + finishedGoodsVal;

        // Compute COGS
        let totalCogs = 0;
        list.forEach(inv => {
            (inv.products || []).forEach((p: any) => {
                const parts = p[0].split('|');
                const vigat = parts[0];
                const matchingProd = products.find(prod => prod.vigat === vigat);
                if (matchingProd) {
                    totalCogs += Number(p[1]) * (matchingProd.productionCost || 0);
                }
            });
        });

        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalProfit = allTimeTotalSales - totalCogs - totalExpenses;

        // GST calculations
        const settings = await this.getSettings();
        const gstRate = Number(settings.defaultGstRate || 5);
        const totalOutputGst = allTimeTotalSales * gstRate / (100 + gstRate);
        
        let totalInputGst = 0;
        purchases.forEach(p => {
            (p.items || []).forEach((item: any) => {
                totalInputGst += item.amount * item.gstPercent / (100 + item.gstPercent);
            });
        });
        const totalGst = totalOutputGst - totalInputGst;

        return {
            todayInvoiceCount,
            todayTotalSales,
            allTimeInvoiceCount,
            allTimeTotalSales,
            totalOutstandingAmount,
            customersWithOutstanding,
            overdueInvoiceCount,
            todayCollections,
            totalPurchases,
            totalProfit,
            totalGst,
            vendorDue,
            stockValue
        };
    }

    async collectPayment(customerId: string, amount: number, notes: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkAccess(['Admin', 'Manager'], caller);

        let remaining = amount;
        const list = this.getInvoicesRaw();
        const sortedInvoices = [...list].sort((a, b) => (parseInt(a.date) || 0) - (parseInt(b.date) || 0));
        const payments = this.getPaymentsRaw();

        sortedInvoices.forEach(inv => {
            if (remaining <= 0) return;
            if (inv.customerInfo.name === customerId) {
                const paid = inv.paidAmount !== undefined ? inv.paidAmount : inv.totalAmount;
                const due = inv.totalAmount - paid;
                if (due > 0) {
                    const apply = Math.min(remaining, due);
                    
                    const originalIdx = list.findIndex(item => item.id === inv.id);
                    if (originalIdx !== -1) {
                        list[originalIdx].paidAmount = paid + apply;
                    }

                    const nextId = (payments.reduce((max, item) => Math.max(max, parseInt(item.id) || 0), 0) + 1).toString();
                    payments.push({
                        id: nextId,
                        customerId,
                        invoiceNumber: inv.invoiceNumber,
                        amount: apply,
                        date: Date.now().toString(),
                        notes: `Later Collection: ${notes}`
                    });

                    remaining -= apply;
                }
            }
        });

        if (remaining > 0) {
            const nextId = (payments.reduce((max, item) => Math.max(max, parseInt(item.id) || 0), 0) + 1).toString();
            payments.push({
                id: nextId,
                customerId,
                invoiceNumber: "Account Overpayment",
                amount: remaining,
                date: Date.now().toString(),
                notes: `Excess Collection: ${notes}`
            });
        }

        this.saveInvoicesRaw(list);
        this.savePaymentsRaw(payments);
        this.logActivity(caller.principalId, caller.name, "Collect Payment", `Collected ₹${amount} from ${customerId}`);
    }

    async getPayments(): Promise<Array<Payment>> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Sales', 'Finance'], 'canView', caller);
        const payments = this.getPaymentsRaw();
        return payments.map(p => ({
            id: BigInt(p.id),
            customerId: p.customerId,
            invoiceNumber: p.invoiceNumber,
            amount: p.amount,
            date: BigInt(p.date) * 1000000n,
            notes: p.notes
        }));
    }

    async getPaymentsByCustomer(customerId: string): Promise<Array<Payment>> {
        const caller = this.getCurrentUserRaw();
        this.checkAccess(['Admin', 'Manager'], caller);
        const payments = this.getPaymentsRaw();
        return payments
            .filter(p => p.customerId === customerId)
            .map(p => ({
                id: BigInt(p.id),
                customerId: p.customerId,
                invoiceNumber: p.invoiceNumber,
                amount: p.amount,
                date: BigInt(p.date) * 1000000n,
                notes: p.notes
            }));
    }

    // --- Raw Materials Mock Endpoints ---
    private getRawMaterialsRaw(): any[] {
        const stored = localStorage.getItem('mock_raw_materials');
        if (stored) return JSON.parse(stored);
        
        const defaultRaw = [
            { id: 'RM-1', name: 'Beads', category: 'Raw Beads', openingStock: 1000, purchasedQty: 0, consumedQty: 0, currentStock: 1000, unitCost: 0.50, unit: 'pcs', minStockAlert: 200 },
            { id: 'RM-2', name: 'Thread', category: 'Threads', openingStock: 50, purchasedQty: 0, consumedQty: 0, currentStock: 50, unitCost: 15.00, unit: 'meters', minStockAlert: 10 },
            { id: 'RM-3', name: 'Mirror', category: 'Decorations', openingStock: 500, purchasedQty: 0, consumedQty: 0, currentStock: 500, unitCost: 1.20, unit: 'pcs', minStockAlert: 100 }
        ];
        localStorage.setItem('mock_raw_materials', JSON.stringify(defaultRaw));
        return defaultRaw;
    }

    private saveRawMaterialsRaw(materials: any[]) {
        localStorage.setItem('mock_raw_materials', JSON.stringify(materials));
    }

    private getPurchasesRaw(): any[] {
        const stored = localStorage.getItem('mock_purchases');
        return stored ? JSON.parse(stored) : [];
    }

    private savePurchasesRaw(purchases: any[]) {
        localStorage.setItem('mock_purchases', JSON.stringify(purchases));
    }

    private getConsumptionHistoryRaw(): any[] {
        const stored = localStorage.getItem('mock_consumption_history');
        return stored ? JSON.parse(stored) : [];
    }

    private saveConsumptionHistoryRaw(consumption: any[]) {
        localStorage.setItem('mock_consumption_history', JSON.stringify(consumption));
    }

    async getRawMaterials(): Promise<Array<RawMaterial>> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Inventory', 'Purchase', 'Production', 'Finance'], 'canView', caller);
        const materials = this.getRawMaterialsRaw();
        return materials.map(m => ({
            id: m.id,
            name: m.name,
            category: m.category || 'General',
            openingStock: m.openingStock || 0,
            purchasedQty: m.purchasedQty || 0,
            consumedQty: m.consumedQty || 0,
            currentStock: m.currentStock || 0,
            unitCost: m.unitCost || 0,
            unit: m.unit || 'pcs',
            minStockAlert: m.minStockAlert || 0,
            reorderLevel: m.reorderLevel || 0,
            minimumStock: m.minimumStock || 0,
            preferredVendor: m.preferredVendor || ''
        }));
    }

    async saveRawMaterial(id: string, name: string, category: string, openingStock: number, unitCost: number, unit: string, minStock: number, reorderLevel?: number, minimumStock?: number, preferredVendor?: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        const materials = this.getRawMaterialsRaw();
        const existingIdx = materials.findIndex(m => m.id === id);
        const toggle = existingIdx !== -1 ? 'canEdit' : 'canCreate';
        this.checkDeptAccess(['Inventory', 'Purchase'], toggle, caller);
        if (existingIdx !== -1) {
            const oldStock = materials[existingIdx].currentStock;
            const expectedStock = openingStock + Number(materials[existingIdx].purchasedQty || 0) - Number(materials[existingIdx].consumedQty || 0);
            if (oldStock !== expectedStock) {
                this.mockLogAudit(caller.name, "Stock Adjusted", `Adjusted stock for raw material ${name} from ${oldStock} to ${expectedStock}`);
            }
        }
         const currentMaterial = existingIdx !== -1 ? materials[existingIdx] : null;
         const purchased = currentMaterial ? Number(currentMaterial.purchasedQty || 0) : 0;
         const consumed = currentMaterial ? Number(currentMaterial.consumedQty || 0) : 0;
         const currentStock = openingStock + purchased - consumed;
 
         const customImages = JSON.parse(localStorage.getItem('mock_uploaded_images') || '{}');
         const imgUrl = customImages[id] || (currentMaterial ? (currentMaterial.imageUrl || currentMaterial.photoUrl || currentMaterial.image || currentMaterial.photo) : '') || '';
 
         const material = {
             id,
             name,
             category,
             openingStock,
             purchasedQty: purchased,
             consumedQty: consumed,
             currentStock,
             unitCost,
             unit,
             minStockAlert: minStock,
             reorderLevel: reorderLevel || (currentMaterial ? currentMaterial.reorderLevel : 0),
             minimumStock: minimumStock || (currentMaterial ? currentMaterial.minimumStock : 0),
             preferredVendor: preferredVendor !== undefined ? preferredVendor : (currentMaterial ? currentMaterial.preferredVendor : ''),
             imageUrl: imgUrl,
             image: imgUrl,
             photo: imgUrl,
             photoUrl: imgUrl
         };
 
         if (existingIdx !== -1) {
             materials[existingIdx] = material;
         } else {
             materials.push(material);
         }
         this.saveRawMaterialsRaw(materials);
     }

    async deleteRawMaterial(id: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Inventory'], 'canDelete', caller);
        const materials = this.getRawMaterialsRaw();
        this.saveRawMaterialsRaw(materials.filter(m => m.id !== id));
    }

    // --- Purchases Mock Endpoints ---
    async getPurchases(): Promise<Array<Purchase>> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Purchase', 'Finance'], 'canView', caller);
        const purchases = this.getPurchasesRaw();
        return purchases.map(p => ({
            id: BigInt(p.id),
            purchaseNumber: p.purchaseNumber,
            date: BigInt(p.date) * 1000000n,
            vendorName: p.vendorName,
            vendorMobile: p.vendorMobile || '',
            vendorGstNumber: p.vendorGstNumber || '',
            vendorAddress: p.vendorAddress || '',
            items: p.items || [],
            totalAmount: p.totalAmount,
            paidAmount: p.paidAmount
        }));
    }

    async savePurchase(purchaseNumber: string, vendorName: string, vendorMobile: string, vendorGstNumber: string, vendorAddress: string, items: Array<PurchaseItem>, totalAmount: number, paidAmount: number): Promise<string> {
        const caller = this.getCurrentUserRaw();
        this.checkAccess(['Admin', 'Manager'], caller);

        const purchases = this.getPurchasesRaw();
        const nextId = (purchases.reduce((max, item) => Math.max(max, parseInt(item.id) || 0), 0) + 1).toString();

        const remainingAmount = Math.max(0, totalAmount - paidAmount);
        let paymentStatus = "Unpaid";
        if (paidAmount >= totalAmount && totalAmount > 0) {
            paymentStatus = "Paid";
        } else if (paidAmount > 0) {
            paymentStatus = "Partial";
        }

        const newPurchase = {
            id: nextId,
            purchaseNumber,
            date: Date.now().toString(),
            vendorName,
            vendorMobile,
            vendorGstNumber,
            vendorAddress,
            items,
            totalAmount,
            paidAmount,
            remainingAmount,
            paymentStatus
        };
        purchases.push(newPurchase);
        this.savePurchasesRaw(purchases);

        // Update Finance / Vendor Ledger (mock_vendor_ledger)
        const vendorLedgerStored = localStorage.getItem('mock_vendor_ledger');
        let vendorLedger = vendorLedgerStored ? JSON.parse(vendorLedgerStored) : [];
        
        // 1. Invoice registration entry
        const newLedgerEntry = {
            id: `VL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: new Date().toISOString(),
            vendorName,
            invoiceNo: purchaseNumber,
            debit: "Raw Material Inventory",
            credit: "Vendor Payable",
            amount: totalAmount,
            description: `Purchase Invoice ${purchaseNumber} registered`
        };
        vendorLedger.push(newLedgerEntry);

        // 2. If paidAmount > 0, record the payment entry as well
        if (paidAmount > 0) {
            const paymentLedgerEntry = {
                id: `VL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                date: new Date().toISOString(),
                vendorName,
                invoiceNo: purchaseNumber,
                debit: "Vendor Payable",
                credit: "Cash / Bank",
                amount: paidAmount,
                description: `Payment for Invoice ${purchaseNumber} registered`
            };
            vendorLedger.push(paymentLedgerEntry);
        }
        localStorage.setItem('mock_vendor_ledger', JSON.stringify(vendorLedger));

        // Update vendor outstanding map (mock_vendor_outstanding)
        const vendorOutstandingStored = localStorage.getItem('mock_vendor_outstanding');
        let vendorOutstandingMap = vendorOutstandingStored ? JSON.parse(vendorOutstandingStored) : {};
        vendorOutstandingMap[vendorName] = (vendorOutstandingMap[vendorName] || 0) + remainingAmount;
        localStorage.setItem('mock_vendor_outstanding', JSON.stringify(vendorOutstandingMap));

        // Adjust raw materials
        const rawMaterials = this.getRawMaterialsRaw();
        items.forEach(item => {
            const mat = rawMaterials.find(m => m.id === item.materialId);
            if (mat) {
                mat.purchasedQty = (mat.purchasedQty || 0) + item.quantity;
                mat.currentStock = (mat.openingStock || 0) + mat.purchasedQty - (mat.consumedQty || 0);
                mat.unitCost = item.rate;
            } else {
                rawMaterials.push({
                    id: item.materialId,
                    name: item.materialId,
                    category: "General",
                    openingStock: 0,
                    purchasedQty: item.quantity,
                    consumedQty: 0,
                    currentStock: item.quantity,
                    unitCost: item.rate,
                    unit: item.unit || "pcs",
                    minStockAlert: 0
                });
            }
        });
        this.saveRawMaterialsRaw(rawMaterials);
        this.logActivity(caller.principalId, caller.name, "Create Purchase", `Created purchase ${purchaseNumber} from ${vendorName}`);

        return purchaseNumber;
    }

    async deletePurchase(id: bigint): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Purchase'], 'canDelete', caller);

        const purchases = this.getPurchasesRaw();
        const found = purchases.find(p => p.id === id.toString());
        if (!found) {
            throw new Error("Purchase not found");
        }

        // Revert raw materials purchased
        const rawMaterials = this.getRawMaterialsRaw();
        (found.items || []).forEach((item: any) => {
            const mat = rawMaterials.find(m => m.id === item.materialId);
            if (mat) {
                mat.purchasedQty = Math.max(0, (mat.purchasedQty || 0) - item.quantity);
                mat.currentStock = (mat.openingStock || 0) + mat.purchasedQty - (mat.consumedQty || 0);
            }
        });
        this.saveRawMaterialsRaw(rawMaterials);

        this.savePurchasesRaw(purchases.filter(p => p.id !== id.toString()));
        this.logActivity(caller.principalId, caller.name, "Delete Purchase", `Deleted purchase ${found.purchaseNumber}`);
    }

    // --- Expenses Mock Endpoints ---
    private getExpensesRaw(): any[] {
        const stored = localStorage.getItem('mock_expenses');
        return stored ? JSON.parse(stored) : [];
    }

    private saveExpensesRaw(list: any[]) {
        localStorage.setItem('mock_expenses', JSON.stringify(list));
    }

    async saveExpense(category: string, amount: number, description: string): Promise<bigint> {
        const caller = this.getCurrentUserRaw();
        this.checkAccess(['Admin', 'Manager'], caller);

        const expenses = this.getExpensesRaw();
        const nextId = (expenses.reduce((max, item) => Math.max(max, parseInt(item.id) || 0), 0) + 1).toString();
        
        expenses.unshift({
            id: nextId,
            date: Date.now().toString(),
            category,
            amount,
            description
        });
        this.saveExpensesRaw(expenses);
        this.logActivity(caller.principalId, caller.name, "Create Expense", `Recorded expense of ₹${amount} for ${category}`);
        
        return BigInt(nextId);
    }

    async getExpenses(): Promise<Array<Expense>> {
        const expenses = this.getExpensesRaw();
        return expenses.map(e => ({
            id: BigInt(e.id),
            date: BigInt(e.date) * 1000000n,
            category: e.category,
            amount: e.amount,
            description: e.description
        }));
    }

    async deleteExpense(id: bigint): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Finance'], 'canDelete', caller);

        const expenses = this.getExpensesRaw();
        this.saveExpensesRaw(expenses.filter(e => e.id !== id.toString()));
        this.logActivity(caller.principalId, caller.name, "Delete Expense", `Deleted expense ID: ${id}`);
    }

    // --- Vendor Payments Mock Endpoints ---
    private getVendorPaymentsRaw(): any[] {
        const stored = localStorage.getItem('mock_vendor_payments');
        return stored ? JSON.parse(stored) : [];
    }

    private saveVendorPaymentsRaw(list: any[]) {
        localStorage.setItem('mock_vendor_payments', JSON.stringify(list));
    }

    async collectVendorPayment(vendorName: string, amount: number, notes: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkAccess(['Admin', 'Manager'], caller);

        let remaining = amount;
        const purchases = this.getPurchasesRaw();
        const sortedPurchases = [...purchases].sort((a, b) => (parseInt(a.date) || 0) - (parseInt(b.date) || 0));
        const payments = this.getVendorPaymentsRaw();

        sortedPurchases.forEach(p => {
            if (remaining <= 0) return;
            if (p.vendorName === vendorName) {
                const due = p.totalAmount - p.paidAmount;
                if (due > 0) {
                    const apply = Math.min(remaining, due);
                    const origIdx = purchases.findIndex(item => item.id === p.id);
                    if (origIdx !== -1) {
                        const newPaid = p.paidAmount + apply;
                        purchases[origIdx].paidAmount = newPaid;
                        const newRemaining = Math.max(0, p.totalAmount - newPaid);
                        (purchases[origIdx] as any).remainingAmount = newRemaining;
                        (purchases[origIdx] as any).paymentStatus = newRemaining === 0 ? "Paid" : "Partial";
                    }

                    const nextId = (payments.reduce((max, item) => Math.max(max, parseInt(item.id) || 0), 0) + 1).toString();
                    payments.push({
                        id: nextId,
                        vendorName,
                        purchaseNumber: p.purchaseNumber,
                        amount: apply,
                        date: Date.now().toString(),
                        notes: `Later Payment: ${notes}`
                    });

                    remaining -= apply;
                }
            }
        });

        if (remaining > 0) {
            const nextId = (payments.reduce((max, item) => Math.max(max, parseInt(item.id) || 0), 0) + 1).toString();
            payments.push({
                id: nextId,
                vendorName,
                purchaseNumber: "Account Overpayment",
                amount: remaining,
                date: Date.now().toString(),
                notes: `Excess Payment: ${notes}`
            });
        }

        this.savePurchasesRaw(purchases);
        this.saveVendorPaymentsRaw(payments);

        // Update vendor outstanding map (mock_vendor_outstanding)
        const vendorOutstandingStored = localStorage.getItem('mock_vendor_outstanding');
        let vendorOutstandingMap = vendorOutstandingStored ? JSON.parse(vendorOutstandingStored) : {};
        vendorOutstandingMap[vendorName] = Math.max(0, (vendorOutstandingMap[vendorName] || 0) - amount);
        localStorage.setItem('mock_vendor_outstanding', JSON.stringify(vendorOutstandingMap));

        // Update Finance / Vendor Ledger (mock_vendor_ledger)
        const vendorLedgerStored = localStorage.getItem('mock_vendor_ledger');
        let vendorLedger = vendorLedgerStored ? JSON.parse(vendorLedgerStored) : [];
        const newLedgerEntry = {
            id: `VL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: new Date().toISOString(),
            vendorName: vendorName,
            invoiceNo: "PAYMENT-OUT",
            debit: "Vendor Payable",
            credit: "Cash / Bank",
            amount: amount,
            description: `Payment to Supplier: ${notes}`
        };
        vendorLedger.push(newLedgerEntry);
        localStorage.setItem('mock_vendor_ledger', JSON.stringify(vendorLedger));

        this.logActivity(caller.principalId, caller.name, "Collect Vendor Payment", `Paid ₹${amount} to ${vendorName}`);
    }

    async getVendorPayments(): Promise<Array<VendorPayment>> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Purchase', 'Finance'], 'canView', caller);
        const payments = this.getVendorPaymentsRaw();
        return payments.map(p => ({
            id: BigInt(p.id),
            vendorName: p.vendorName,
            purchaseNumber: p.purchaseNumber,
            amount: p.amount,
            date: BigInt(p.date) * 1000000n,
            notes: p.notes
        }));
    }

    async getMaterialConsumptionHistory(): Promise<Array<MaterialConsumptionEntry>> {
        const consumption = this.getConsumptionHistoryRaw();
        return consumption.map(c => ({
            id: BigInt(c.id),
            date: BigInt(c.date) * 1000000n,
            finishedGoodId: c.finishedGoodId,
            finishedGoodName: c.finishedGoodName,
            invoiceNumber: c.invoiceNumber,
            materialId: c.materialId,
            materialName: c.materialName,
            quantityConsumed: c.quantityConsumed
        }));
    }

    private getEmployeesRaw(): any[] {
        const stored = localStorage.getItem('mock_employees');
        return stored ? JSON.parse(stored) : [];
    }
    private saveEmployeesRaw(employees: any[]) {
        localStorage.setItem('mock_employees', JSON.stringify(employees));
    }

    private getJobWorksRaw(): any[] {
        const stored = localStorage.getItem('mock_job_works');
        return stored ? JSON.parse(stored) : [];
    }
    private saveJobWorksRaw(jobs: any[]) {
        localStorage.setItem('mock_job_works', JSON.stringify(jobs));
    }

    private computeJobStatus(job: any): string {
        const given = Number(job.qtyGiven || job.qtyAssigned || 0);
        const accepted = Number(job.acceptedQty || 0);
        const pending = given - accepted;
        if (pending <= 0) {
            return "Completed";
        } else if (accepted > 0) {
            return "Partially Collected";
        } else {
            return "Given";
        }
    }

    private getDailyWorkUpdatesRaw(): any[] {
        const stored = localStorage.getItem('mock_daily_work_updates');
        return stored ? JSON.parse(stored) : [];
    }
    private saveDailyWorkUpdatesRaw(updates: any[]) {
        localStorage.setItem('mock_daily_work_updates', JSON.stringify(updates));
    }

    private getJobCollectionsRaw(): any[] {
        const stored = localStorage.getItem('mock_job_collections');
        return stored ? JSON.parse(stored) : [];
    }
    private saveJobCollectionsRaw(collections: any[]) {
        localStorage.setItem('mock_job_collections', JSON.stringify(collections));
    }

    private getEmployeePaymentsRaw(): any[] {
        const stored = localStorage.getItem('mock_employee_payments');
        return stored ? JSON.parse(stored) : [];
    }
    private saveEmployeePaymentsRaw(payments: any[]) {
        localStorage.setItem('mock_employee_payments', JSON.stringify(payments));
    }

    private getCollectionsRaw(): any[] {
        const stored = localStorage.getItem('mock_collections_v2');
        return stored ? JSON.parse(stored) : [];
    }
    private saveCollectionsRaw(collections: any[]) {
        localStorage.setItem('mock_collections_v2', JSON.stringify(collections));
    }
    private getStockMovementsRaw(): any[] {
        const stored = localStorage.getItem('mock_stock_movements_v2');
        return stored ? JSON.parse(stored) : [];
    }
    private saveStockMovementsRaw(movements: any[]) {
        localStorage.setItem('mock_stock_movements_v2', JSON.stringify(movements));
    }
    private getAuditLogsRaw(): any[] {
        const stored = localStorage.getItem('mock_audit_logs_v2');
        return stored ? JSON.parse(stored) : [];
    }
    private saveAuditLogsRaw(logs: any[]) {
        localStorage.setItem('mock_audit_logs_v2', JSON.stringify(logs));
    }
    private getLedgerEntriesRaw(): any[] {
        const stored = localStorage.getItem('mock_ledger_entries_v2');
        return stored ? JSON.parse(stored) : [];
    }
    private saveLedgerEntriesRaw(entries: any[]) {
        localStorage.setItem('mock_ledger_entries_v2', JSON.stringify(entries));
    }

    private mockLogAudit(
        userName: string,
        action: string,
        description: string,
        jobWorkNo?: string,
        collectionNo?: string,
        product?: string,
        employee?: string,
        details?: string
    ) {
        let module: 'AUTH' | 'USERS' | 'ERP' = 'ERP';
        const actLower = action.toLowerCase();
        if (actLower.includes('login') || actLower.includes('logout') || actLower.includes('password') || actLower.includes('auth')) {
            module = 'AUTH';
        } else if (actLower.includes('user') || actLower.includes('role') || actLower.includes('department') || actLower.includes('permission')) {
            module = 'USERS';
        }

        let desc = description;
        if (details) {
            desc += ` | Details: ${details}`;
        }
        if (jobWorkNo) desc += ` | JobWork: ${jobWorkNo}`;
        if (collectionNo) desc += ` | Collection: ${collectionNo}`;
        if (product) desc += ` | Product: ${product}`;

        const targetUser = employee || '';
        const targetRole = '';

        this.logAuditUnified(module, action, desc, targetUser, targetRole);
    }

    private mockAddLedgerEntry(
        employeeName: string,
        jobWorkNo: string,
        dateMs: number,
        productName: string,
        qtyGiven: number,
        acceptedQty: number,
        rejectedQty: number,
        pendingQty: number,
        rate: number,
        totalWage: number,
        paidAmount: number,
        balanceAmount: number,
        status: string,
        collectionId?: string,
        jobWorkId?: string,
        employeeId?: string,
        source?: string,
        reversed?: boolean,
        paymentId?: string
    ) {
        const entries = this.getLedgerEntriesRaw();
        const nextId = (entries.reduce((max, item) => Math.max(max, parseInt(item.id) || 0), 0) + 1).toString();
        entries.push({
            id: nextId,
            employeeName,
            jobWorkNo: jobWorkNo.toString(),
            date: dateMs.toString(),
            productName,
            qtyGiven,
            acceptedQty,
            rejectedQty,
            pendingQty,
            rate,
            totalWage,
            paidAmount,
            balanceAmount,
            status,
            collectionId: collectionId || null,
            jobWorkId: jobWorkId || null,
            employeeId: employeeId || null,
            source: source || null,
            reversed: reversed || false,
            paymentId: paymentId || null
        });
        this.saveLedgerEntriesRaw(entries);

        const caller = this.getCurrentUserRaw();
        const callerName = caller ? caller.name : "System";
        this.mockLogAudit(
            callerName,
            "LEDGER_ENTRY_CREATED",
            `Created ledger entry ID: ${nextId} for ${employeeName}`,
            jobWorkNo,
            collectionId,
            productName,
            employeeName,
            `Wage: ${totalWage}, Paid: ${paidAmount}`
        );
    }

    private mockGetEmployeeTotalEarned(empName: string): number {
        const entries = this.getLedgerEntriesRaw();
        return entries
            .filter(e => e.employeeName === empName && !e.reversed)
            .reduce((sum, e) => sum + (parseFloat(e.totalWage) || 0), 0);
    }

    private mockGetEmployeeTotalPaid(empName: string): number {
        const payments = this.getEmployeePaymentsRaw();
        return payments
            .filter(p => p.employeeName === empName)
            .reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
    }

    private recalculateEmployeeLedger(employeeName: string) {
        const entries = this.getLedgerEntriesRaw();
        const employeeEntries = entries.filter(e => e.employeeName === employeeName);
        
        // Sort entries chronologically by date and then by ID
        employeeEntries.sort((a, b) => {
            const dateDiff = (parseFloat(a.date) || 0) - (parseFloat(b.date) || 0);
            if (dateDiff !== 0) return dateDiff;
            return (parseInt(a.id) || 0) - (parseInt(b.id) || 0);
        });

        let runningEarned = 0;
        let runningPaid = 0;

        employeeEntries.forEach(entry => {
            if (!entry.reversed) {
                runningEarned += Number(entry.totalWage || 0);
                runningPaid += Number(entry.paidAmount || 0);
            }
            entry.balanceAmount = runningEarned - runningPaid;
        });

        this.saveLedgerEntriesRaw(entries);
    }

    async getEmployees(): Promise<Array<any>> {
        const caller = this.getCurrentUserRaw();
        this.checkAccess(['Admin', 'Manager'], caller);
        const emps = this.getEmployeesRaw();
        return emps.map(e => ({
            id: e.id,
            name: e.name,
            mobile: e.mobile,
            address: e.address,
            joiningDate: BigInt(e.joiningDate) * 1000000n,
            skillType: e.skillType,
            status: e.status
        }));
    }

    async saveEmployee(id: string, name: string, mobile: string, address: string, joiningDate: bigint, skillType: string, status: string): Promise<string> {
        const emps = this.getEmployeesRaw();
        const existingIdx = emps.findIndex(e => e.id === id);
        const emp = {
            id,
            name,
            mobile,
            address,
            joiningDate: (joiningDate / 1000000n).toString(),
            skillType,
            status
        };
        if (existingIdx !== -1) {
            emps[existingIdx] = emp;
        } else {
            emps.push(emp);
        }
        this.saveEmployeesRaw(emps);
        const caller = this.getCurrentUserRaw();
        if (caller) {
            this.mockLogAudit(caller.name, "User Created", `Created user/employee ${name}`);
        }
        this.logActivity(caller ? caller.principalId : "System", caller ? caller.name : "System", "Save Employee", `Saved employee: ${name} (ID: ${id})`);
        return id;
    }

    async deleteEmployee(id: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Production'], 'canDelete', caller);
        const emps = this.getEmployeesRaw();
        const found = emps.find(e => e.id === id);
        if (!found) {
            throw new Error("Employee not found");
        }
        const filtered = emps.filter(e => e.id !== id);
        this.saveEmployeesRaw(filtered);
        this.logActivity(caller ? caller.principalId : "System", caller ? caller.name : "System", "Delete Employee", `Deleted employee: ${found.name} (${id})`);
    }

    async getJobWorks(): Promise<Array<any>> {
        const caller = this.getCurrentUserRaw();
        if (!caller) {
            throw new Error("Access denied: insufficient permissions.");
        }
        let jobs = this.getJobWorksRaw();
        if ('Staff' in caller.role) {
            const linkedEmployeeName = localStorage.getItem('staff_employee_name_' + caller.username.toLowerCase()) || '';
            jobs = jobs.filter(j => j.employeeName.toLowerCase() === linkedEmployeeName.toLowerCase());
        }
        return jobs.map(j => ({
            id: BigInt(j.id),
            jobDate: BigInt(j.jobDate) * 1000000n,
            employeeName: j.employeeName,
            mobileNumber: j.mobileNumber || '',
            productName: j.productName,
            productCode: j.productCode || '',
            hsnCode: j.hsnCode || '',
            qtyGiven: Number(j.qtyGiven || j.qtyAssigned || 0),
            ratePerPiece: Number(j.ratePerPiece),
            expectedReturnDate: BigInt(j.expectedReturnDate || j.expectedCompletionDate) * 1000000n,
            status: j.status,
            remarks: j.remarks || '',
            collectedQty: Number(j.collectedQty || 0),
            rejectedQty: Number(j.rejectedQty || 0),
            acceptedQty: Number(j.acceptedQty || 0),
            completedQty: Number(j.completedQty || 0),
            lastUpdated: BigInt(j.lastUpdated || j.jobDate) * 1000000n,
            customerOrderLink: j.customerOrderLink ? {
                customerName: j.customerOrderLink.customerName,
                orderNumber: j.customerOrderLink.orderNumber
            } : null,
            createdByUserId: j.createdByUserId || null,
            createdByUsername: j.createdByUsername || null,
            createdByFullName: j.createdByFullName || null,
            createdByRole: j.createdByRole || null,
            updatedByUserId: j.updatedByUserId || null,
            updatedByUsername: j.updatedByUsername || null,
            updatedByFullName: j.updatedByFullName || null,
            updatedByRole: j.updatedByRole || null,
            lastAction: j.lastAction || null
        }));
    }

    async saveJobWork(
        jobDate: bigint,
        employeeName: string,
        mobileNumber: string,
        productName: string,
        productCode: string,
        hsnCode: string,
        qtyGiven: number,
        ratePerPiece: number,
        expectedReturnDate: bigint,
        remarks: string,
        customerOrderLink: any | null
    ): Promise<bigint> {
        const jobs = this.getJobWorksRaw();
        const nextId = jobs.reduce((max, j) => Math.max(max, parseInt(j.id) || 0), 0) + 1;
        const caller = this.getCurrentUserRaw();
        const newJob = {
            id: nextId.toString(),
            jobDate: (jobDate / 1000000n).toString(),
            employeeName,
            mobileNumber,
            productName,
            productCode,
            hsnCode,
            qtyGiven,
            qtyAssigned: qtyGiven,
            ratePerPiece,
            expectedReturnDate: (expectedReturnDate / 1000000n).toString(),
            expectedCompletionDate: (expectedReturnDate / 1000000n).toString(),
            status: "Given",
            remarks,
            collectedQty: 0,
            completedQty: 0,
            rejectedQty: 0,
            acceptedQty: 0,
            lastUpdated: (jobDate / 1000000n).toString(),
            customerOrderLink: customerOrderLink ? {
                customerName: customerOrderLink.customerName,
                orderNumber: customerOrderLink.orderNumber
            } : null,
            createdByUserId: caller ? caller.principalId : 'system_principal',
            createdByUsername: caller ? caller.username : 'system',
            createdByFullName: caller ? caller.name : 'System',
            createdByRole: caller ? this.getRoleText(caller.role) : 'Master Admin',
            updatedByUserId: caller ? caller.principalId : 'system_principal',
            updatedByUsername: caller ? caller.username : 'system',
            updatedByFullName: caller ? caller.name : 'System',
            updatedByRole: caller ? this.getRoleText(caller.role) : 'Master Admin',
            lastAction: "Created Job Work"
        };
        jobs.push(newJob);
        this.saveJobWorksRaw(jobs);

        const callerName = caller ? caller.name : "System";
        this.mockLogAudit(callerName, "Job Created", `Created job JW-${nextId} for employee ${employeeName}`);
        
        this.mockAddLedgerEntry(
            employeeName,
            nextId.toString(),
            Date.now(),
            productName,
            qtyGiven,
            0,
            0,
            qtyGiven,
            ratePerPiece,
            0,
            0,
            0,
            "Given"
        );

        this.logActivity(caller ? caller.principalId : "System", callerName, "Create Job", `Created job JW-${nextId} for employee ${employeeName}`);
        return BigInt(nextId);
    }

    async updateJobWorkProgress(jobId: bigint, completedQty: number, remarks: string): Promise<void> {
        throw new Error("Access denied: insufficient permissions.");
    }

    private findProduct(products: any[], productName: string, productCode: string, productId?: string): any {
        const pId = productId || productCode;
        if (pId) {
            const found = products.find(p => p.id === pId);
            if (found) return found;
        }
        if (productCode) {
            const found = products.find(p => p.sku === productCode || p.id === productCode);
            if (found) return found;
        }
        const cleanName = productName ? productName.split('|')[0].trim() : '';
        if (cleanName) {
            const found = products.find(p => p.vigat?.trim() === cleanName);
            if (found) return found;
        }
        return null;
    }

    async saveCollectionEntry(jobWorkNo: bigint, todayCollectedQty: number, rejectedQty: number, remarks: string): Promise<bigint> {
        const caller = this.getCurrentUserRaw();
        const callerName = caller ? caller.name : "System";
        
        const settingsStored = localStorage.getItem('mock_settings');
        const settings = settingsStored ? JSON.parse(settingsStored) : { allowStaffCollection: true, enableRejectedWage: false };
        if (caller && 'Staff' in caller.role && !settings.allowStaffCollection) {
            throw new Error("Access denied: insufficient permissions.");
        }

        const jobs = this.getJobWorksRaw();
        const idx = jobs.findIndex(j => j.id === jobWorkNo.toString());
        if (idx === -1) {
            throw new Error("Job work not found");
        }
        const job = jobs[idx];

        if (todayCollectedQty <= 0) {
            throw new Error("Collected quantity must be greater than 0");
        }
        if (rejectedQty < 0) {
            throw new Error("Rejected quantity cannot be negative");
        }
        if (rejectedQty > todayCollectedQty) {
            throw new Error("Rejected quantity cannot be greater than collected quantity");
        }
        const acceptedQty = todayCollectedQty - rejectedQty;
        if (acceptedQty < 0) {
            throw new Error("Accepted quantity cannot be negative");
        }

        const products = this.getProductsRaw();
        const product = this.findProduct(products, job.productName, job.productCode);
        if (!product) {
            throw new Error("Product must exist in Finished Goods inventory");
        }

        const given = Number(job.qtyGiven || job.qtyAssigned || 0);
        const accepted = Number(job.acceptedQty || 0);

        if (accepted + acceptedQty > given) {
            this.mockLogAudit(callerName, "COLLECTION_LOCK_BLOCKED", `Blocked collection save because accepted quantity exceeds assigned quantity. Job JW-${jobWorkNo}. Assigned: ${given}, Existing Accepted: ${accepted}, New Accepted: ${acceptedQty}`, jobWorkNo.toString(), "", job.productName, job.employeeName, `Assigned: ${given}, Existing Accepted: ${accepted}, New Accepted: ${acceptedQty}`);
            throw new Error("Accepted quantity exceeds assigned quantity.");
        }

        if (job.status === "Completed" || accepted >= given) {
            const isCallerAdmin = caller && ('Admin' in caller.role);
            if (!isCallerAdmin) {
                this.mockLogAudit(callerName, "COLLECTION_LOCK_BLOCKED", `Blocked collection save because job status is Completed. Job JW-${jobWorkNo}`, jobWorkNo.toString(), "", job.productName, job.employeeName, "Status is Completed");
                throw new Error("Completed job cannot receive extra collection unless Admin reopens the job.");
            }
        }

        const collections = this.getCollectionsRaw();
        const idVal = collections.reduce((max, c) => Math.max(max, parseInt(c.id) || 0), 0) + 1;
        const collectionId = idVal.toString();

        try {
            const previousStock = Number(product.stock || 0);
            const newStock = previousStock + acceptedQty;

            const movements = this.getStockMovementsRaw();
            const smId = (movements.length + 1).toString();

            product.stock = newStock;

            const totalCollected = (Number(job.totalCollectedQty || job.collectedQty || 0)) + todayCollectedQty;
            const totalRejected = (Number(job.totalRejectedQty || job.rejectedQty || 0)) + rejectedQty;
            const totalAccepted = totalCollected - totalRejected;

            const newCol = {
                id: collectionId,
                collectionDate: Date.now().toString(),
                jobWorkNo: jobWorkNo.toString(),
                karigarName: job.employeeName,
                productName: job.productName,
                qtyGiven: given,
                prevCollectedQty: Number(job.collectedQty || 0),
                pendingQty: given - totalAccepted,
                todayCollectedQty,
                rejectedQty,
                acceptedQty,
                remarks,
                stockUpdated: true,
                stockMovementId: smId,
                previousStock,
                newStock,
                collectionId,
                oldAcceptedQty: 0,
                createdBy: caller ? (caller.fullName || caller.name || caller.username || "Unknown User") : "Unknown User",
                createdById: caller ? (caller.id || caller.principalId || caller.username || "") : "",
                createdAt: Date.now().toString(),
                inspectedBy: "Quality Inspector",
                inspectedById: "inspector",
                inspectedAt: Date.now().toString()
            };
            collections.push(newCol);

            job.collectedQty = totalCollected;
            job.rejectedQty = totalRejected;
            job.acceptedQty = totalAccepted;
            job.completedQty = totalAccepted;
            
            job.totalCollectedQty = totalCollected;
            job.totalRejectedQty = totalRejected;
            job.totalAcceptedQty = totalAccepted;

            const oldStatus = job.status;
            job.status = this.computeJobStatus(job);
            
            if (job.status === "Completed") {
                job.lastAction = "Inspection Completed";
            } else if (job.status !== oldStatus) {
                job.lastAction = "Status Updated";
            } else {
                job.lastAction = "Collection Recorded";
            }

            job.lastUpdated = Date.now().toString();
            job.updatedByUserId = caller ? caller.principalId : 'system_principal';
            job.updatedByUsername = caller ? caller.username : 'system';
            job.updatedByFullName = caller ? caller.name : 'System';
            job.updatedByRole = caller ? this.getRoleText(caller.role) : 'Master Admin';

            this.saveFinishedGoodsLogRaw(job.productName, acceptedQty, "Produced", `Karigar Collection JW-${jobWorkNo}`);

            movements.unshift({
                id: smId,
                date: Date.now().toString(),
                productName: job.productName,
                productCode: job.productCode,
                movementType: "Production Collection",
                qtyAdded: acceptedQty,
                relatedJobWorkNo: jobWorkNo.toString(),
                relatedCollectionNo: collectionId,
                userName: callerName,
                previousStock,
                adjustmentQty: acceptedQty,
                newStock,
                collectionId,
                jobWorkId: jobWorkNo.toString(),
                productId: product.id,
                createdBy: callerName,
                reversed: false
            });

            const rawMaterials = this.getRawMaterialsRaw();
            const consLogs = this.getConsumptionLogsRaw();
            if (acceptedQty > 0) {
                if (product.bom && product.bom.length > 0) {
                    const duplicateExists = product.bom.some((bomReq: any) => {
                        const mat = rawMaterials.find(m => m.id === bomReq.materialId || m.name === bomReq.materialId);
                        return mat && consLogs.some(l => l.collectionNo === collectionId && l.rawMaterialName === mat.name);
                    });
                    if (duplicateExists) {
                        throw new Error("Duplicate consumption log detected for this collection");
                    }

                    product.bom.forEach((bomReq: any) => {
                        const qtyConsumed = bomReq.quantity * acceptedQty;
                        const mat = rawMaterials.find(m => m.id === bomReq.materialId || m.name === bomReq.materialId);
                        if (mat) {
                            mat.consumedQty = (mat.consumedQty || 0) + qtyConsumed;
                            mat.currentStock = (mat.openingStock || 0) + (mat.purchasedQty || 0) - mat.consumedQty;
                            
                            const logId = (consLogs.reduce((max, l) => Math.max(max, parseInt(l.id) || 0), 0) + 1).toString();
                            consLogs.unshift({
                                id: logId,
                                date: Date.now().toString(),
                                productName: job.productName,
                                batchNo: `COL-${idVal}`,
                                rawMaterialName: mat.name,
                                quantityUsed: qtyConsumed,
                                unit: mat.unit,
                                cost: qtyConsumed * (mat.unitCost || 0),
                                employee: job.employeeName,
                                jobWorkNo: `JW-${jobWorkNo}`,
                                remarks: remarks || `Automated log for collection COL-${idVal}`,
                                collectionNo: idVal.toString(),
                                acceptedQty: acceptedQty,
                                unitCost: mat.unitCost || 0,
                                status: "Completed"
                            });
                        }
                    });
                }
            }

            const wageBase = settings.enableRejectedWage ? (acceptedQty + rejectedQty) : acceptedQty;
            const totalWage = wageBase * Number(job.ratePerPiece);

            const earned = this.mockGetEmployeeTotalEarned(job.employeeName) + totalWage;
            const paid = this.mockGetEmployeeTotalPaid(job.employeeName);
            const balance = earned - paid;

            this.mockAddLedgerEntry(
                job.employeeName,
                jobWorkNo.toString(),
                Date.now(),
                job.productName,
                given,
                acceptedQty,
                rejectedQty,
                given - totalAccepted,
                Number(job.ratePerPiece),
                totalWage,
                0,
                balance,
                job.status,
                collectionId,
                jobWorkNo.toString(),
                job.employeeId || "",
                "COLLECTION",
                false
            );

            this.recalculateEmployeeLedger(job.employeeName);

            this.updateProductProductionCost(job.productName);

            this.saveProductsRaw(products);
            this.saveCollectionsRaw(collections);
            this.saveJobWorksRaw(jobs);
            this.saveStockMovementsRaw(movements);
            this.saveRawMaterialsRaw(rawMaterials);
            this.saveConsumptionLogsRaw(consLogs);

            this.mockLogAudit(callerName, "REJECTION_QTY_UPDATED", `Collection saved: RejectedQty=${rejectedQty}, AcceptedQty=${acceptedQty} for JW-${jobWorkNo}`, jobWorkNo.toString(), collectionId, job.productName, job.employeeName, `Accepted: ${acceptedQty}, Rejected: ${rejectedQty}`);
            this.mockLogAudit(callerName, "COLLECTION_SAVED", `Collection saved for Job JW-${jobWorkNo} (Accepted: ${acceptedQty}, Rejected: ${rejectedQty})`);
            this.mockLogAudit(callerName, "FINISHED_GOODS_STOCK_INCREASED", `Finished goods stock increased for ${job.productName} by ${acceptedQty} (Previous: ${previousStock}, New: ${newStock})`);
            this.mockLogAudit(callerName, "Labor Cost Generated", `Labor Cost of ₹${totalWage.toFixed(2)} generated for ${job.employeeName}`);
            this.mockLogAudit(callerName, "Employee Ledger Updated", `Ledger updated for ${job.employeeName}: wage amount ₹${totalWage.toFixed(2)} credited`);

            this.logActivity(caller ? caller.principalId : "System", callerName, "Collect Job", `Collected job JW-${jobWorkNo}: Accepted=${acceptedQty}, Rejected=${rejectedQty}`);

            this.recalculateProductionReports();

            return BigInt(idVal);
        } catch (err: any) {
            throw err;
        }
    }

    async editCollectionEntry(collectionId: bigint, todayCollectedQty: number, rejectedQty: number, remarks: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkAccess(['Admin', 'Manager'], caller);
        const callerName = caller ? caller.name : "System";

        const collections = this.getCollectionsRaw();
        const colIdx = collections.findIndex(c => c.id === collectionId.toString());
        if (colIdx === -1) {
            throw new Error("Collection entry not found");
        }
        const col = collections[colIdx];
        if (!col.stockUpdated) {
            throw new Error("Stock was not previously updated for this collection.");
        }

        const jobs = this.getJobWorksRaw();
        const jobIdx = jobs.findIndex(j => j.id === col.jobWorkNo);
        if (jobIdx === -1) {
            throw new Error("Job work not found");
        }
        const job = jobs[jobIdx];

        if (todayCollectedQty <= 0) {
            throw new Error("Collected quantity must be greater than 0");
        }
        if (rejectedQty < 0) {
            throw new Error("Rejected quantity cannot be negative");
        }
        if (rejectedQty > todayCollectedQty) {
            throw new Error("Rejected quantity cannot be greater than collected quantity");
        }
        const acceptedQty = todayCollectedQty - rejectedQty;
        if (acceptedQty < 0) {
            throw new Error("Accepted quantity cannot be negative");
        }

        const products = this.getProductsRaw();
        const product = this.findProduct(products, job.productName, job.productCode);
        if (!product) {
            throw new Error("Product must exist in Finished Goods inventory");
        }

        const prevAcceptedTotal = Number(job.acceptedQty || 0) - col.acceptedQty;
        const given = Number(job.qtyGiven || job.qtyAssigned || 0);

        const stockAdjustment = acceptedQty - col.acceptedQty;
        if (stockAdjustment === 0) {
            throw new Error("No stock change required.");
        }

        if (prevAcceptedTotal + acceptedQty > given) {
            this.mockLogAudit(callerName, "COLLECTION_LOCK_BLOCKED", `Blocked collection edit because accepted quantity exceeds assigned quantity. Collection: ${collectionId}. Assigned: ${given}, Existing Accepted: ${prevAcceptedTotal}, New Accepted: ${acceptedQty}`, col.jobWorkNo, collectionId.toString(), job.productName, job.employeeName, `Assigned: ${given}, Existing Accepted: ${prevAcceptedTotal}, New Accepted: ${acceptedQty}`);
            throw new Error("Accepted quantity exceeds assigned quantity.");
        }

        if ((job.status === "Completed" || prevAcceptedTotal >= given) && stockAdjustment > 0) {
            const isCallerAdmin = caller && ('Admin' in caller.role);
            if (!isCallerAdmin) {
                this.mockLogAudit(callerName, "COLLECTION_LOCK_BLOCKED", `Blocked collection edit because job status is Completed. Collection: ${collectionId}`, col.jobWorkNo, collectionId.toString(), job.productName, job.employeeName, "Status is Completed");
                throw new Error("Completed job cannot receive extra collection unless Admin reopens the job.");
            }
        }

        try {
            const previousStock = Number(product.stock || 0);
            const newStock = Math.max(0, previousStock + stockAdjustment);
            product.stock = newStock;

            const consLogs = this.getConsumptionLogsRaw();
            const logsToRevert = consLogs.filter(l => l.collectionNo === collectionId.toString());
            const rawMaterials = this.getRawMaterialsRaw();
            if (logsToRevert.length > 0) {
                logsToRevert.forEach(log => {
                    const mat = rawMaterials.find(m => m.name === log.rawMaterialName || m.id === log.rawMaterialName);
                    if (mat) {
                        mat.consumedQty = Math.max(0, (mat.consumedQty || 0) - Number(log.quantityUsed));
                        mat.currentStock = (mat.openingStock || 0) + (mat.purchasedQty || 0) - mat.consumedQty;
                    }
                });
            }
            const updatedConsLogs = consLogs.filter(l => l.collectionNo !== collectionId.toString());

            if (acceptedQty > 0) {
                if (product.bom && product.bom.length > 0) {
                    product.bom.forEach((bomReq: any) => {
                        const qtyConsumed = bomReq.quantity * acceptedQty;
                        const mat = rawMaterials.find(m => m.id === bomReq.materialId || m.name === bomReq.materialId);
                        if (mat) {
                            mat.consumedQty = (mat.consumedQty || 0) + qtyConsumed;
                            mat.currentStock = (mat.openingStock || 0) + (mat.purchasedQty || 0) - mat.consumedQty;
                            
                            const logId = (updatedConsLogs.reduce((max, l) => Math.max(max, parseInt(l.id) || 0), 0) + 1).toString();
                            updatedConsLogs.unshift({
                                id: logId,
                                date: Date.now().toString(),
                                productName: job.productName,
                                batchNo: `COL-${collectionId}`,
                                rawMaterialName: mat.name,
                                quantityUsed: qtyConsumed,
                                unit: mat.unit,
                                cost: qtyConsumed * (mat.unitCost || 0),
                                employee: job.employeeName,
                                jobWorkNo: `JW-${col.jobWorkNo}`,
                                remarks: remarks || `Automated log for collection COL-${collectionId} (Edited)`,
                                collectionNo: collectionId.toString(),
                                acceptedQty: acceptedQty,
                                unitCost: mat.unitCost || 0,
                                status: "Completed"
                            });
                        }
                    });
                }
            }

            const movements = this.getStockMovementsRaw();
            const smId = (movements.length + 1).toString();
            movements.unshift({
                id: smId,
                date: Date.now().toString(),
                productName: job.productName,
                productCode: job.productCode,
                movementType: "Production Collection Edit",
                qtyAdded: stockAdjustment,
                relatedJobWorkNo: col.jobWorkNo,
                relatedCollectionNo: collectionId.toString(),
                userName: callerName,
                previousStock,
                adjustmentQty: stockAdjustment,
                newStock,
                collectionId: collectionId.toString(),
                jobWorkId: col.jobWorkNo,
                productId: product.id,
                createdBy: callerName,
                reversed: false
            });

            const oldCollectedQty = col.todayCollectedQty;
            const oldRejectedQty = col.rejectedQty;
            const oldAcceptedQty = col.acceptedQty;

            const totalCollected = (Number(job.totalCollectedQty || job.collectedQty || 0)) - oldCollectedQty + todayCollectedQty;
            const totalRejected = (Number(job.totalRejectedQty || job.rejectedQty || 0)) - oldRejectedQty + rejectedQty;
            const totalAccepted = totalCollected - totalRejected;

            col.todayCollectedQty = todayCollectedQty;
            col.rejectedQty = rejectedQty;
            col.acceptedQty = acceptedQty;
            col.remarks = remarks;
            col.stockUpdated = true;
            col.previousStock = previousStock;
            col.newStock = newStock;
            col.stockMovementId = smId;
            col.collectionId = collectionId.toString();
            col.oldAcceptedQty = oldAcceptedQty;
            col.pendingQty = given - totalAccepted;

            job.collectedQty = totalCollected;
            job.rejectedQty = totalRejected;
            job.acceptedQty = totalAccepted;
            job.completedQty = totalAccepted;

            job.totalCollectedQty = totalCollected;
            job.totalRejectedQty = totalRejected;
            job.totalAcceptedQty = totalAccepted;

            const oldStatus = job.status;
            job.status = this.computeJobStatus(job);
            
            if (job.status === "Completed") {
                job.lastAction = "Inspection Completed";
            } else if (job.status !== oldStatus) {
                job.lastAction = "Status Updated";
            } else {
                job.lastAction = "Collection Edited";
            }

            job.lastUpdated = Date.now().toString();
            job.updatedByUserId = caller ? caller.principalId : 'system_principal';
            job.updatedByUsername = caller ? caller.username : 'system';
            job.updatedByFullName = caller ? caller.name : 'System';
            job.updatedByRole = caller ? this.getRoleText(caller.role) : 'Master Admin';

            const settingsStored = localStorage.getItem('mock_settings');
            const settings = settingsStored ? JSON.parse(settingsStored) : { enableRejectedWage: false };
            const newWageBase = settings.enableRejectedWage ? (acceptedQty + rejectedQty) : acceptedQty;
            const totalWage = newWageBase * Number(job.ratePerPiece);

            const ledgerEntries = this.getLedgerEntriesRaw();
            const ledgerIdx = ledgerEntries.findIndex(e => e.collectionId === collectionId.toString());
            if (ledgerIdx !== -1) {
                ledgerEntries[ledgerIdx].acceptedQty = acceptedQty;
                ledgerEntries[ledgerIdx].rejectedQty = rejectedQty;
                ledgerEntries[ledgerIdx].totalWage = totalWage;
                ledgerEntries[ledgerIdx].pendingQty = given - totalAccepted;
                ledgerEntries[ledgerIdx].status = job.status;
                this.saveLedgerEntriesRaw(ledgerEntries);

                this.mockLogAudit(callerName, "LEDGER_ENTRY_UPDATED", `Updated ledger entry ID: ${ledgerEntries[ledgerIdx].id} for collection ${collectionId}`, col.jobWorkNo, collectionId.toString(), job.productName, job.employeeName, `New Wage: ${totalWage}`);
            } else {
                const earned = this.mockGetEmployeeTotalEarned(job.employeeName) + totalWage;
                const paid = this.mockGetEmployeeTotalPaid(job.employeeName);
                const balance = earned - paid;

                this.mockAddLedgerEntry(
                    job.employeeName,
                    col.jobWorkNo,
                    Date.now(),
                    job.productName,
                    given,
                    acceptedQty,
                    rejectedQty,
                    given - totalAccepted,
                    Number(job.ratePerPiece),
                    totalWage,
                    0,
                    balance,
                    job.status,
                    collectionId.toString(),
                    col.jobWorkNo,
                    job.employeeId || "",
                    "COLLECTION",
                    false
                );
            }

            this.recalculateEmployeeLedger(job.employeeName);

            this.updateProductProductionCost(job.productName);

            this.saveProductsRaw(products);
            this.saveCollectionsRaw(collections);
            this.saveJobWorksRaw(jobs);
            this.saveStockMovementsRaw(movements);
            this.saveRawMaterialsRaw(rawMaterials);
            this.saveConsumptionLogsRaw(updatedConsLogs);

            this.mockLogAudit(callerName, "REJECTION_QTY_UPDATED", `Collection edited: RejectedQty=${rejectedQty}, AcceptedQty=${acceptedQty} for JW-${col.jobWorkNo}`, col.jobWorkNo, collectionId.toString(), job.productName, job.employeeName, `Accepted: ${acceptedQty}, Rejected: ${rejectedQty}`);
            this.mockLogAudit(callerName, "COLLECTION_EDITED", `Edited Collection No ${collectionId}`);
            this.mockLogAudit(callerName, "FINISHED_GOODS_STOCK_ADJUSTED", `Adjusted stock for "${job.productName}" by ${stockAdjustment} units (Previous: ${previousStock}, New: ${newStock})`);
            this.mockLogAudit(callerName, "Goods Collected", `Edited Collection entry No ${collectionId} (AcceptedQty: ${acceptedQty}, RejectedQty: ${rejectedQty})`);

            this.recalculateProductionReports();
        } catch (err: any) {
            throw err;
        }
    }

    async deleteCollectionEntry(collectionId: bigint): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkAccess(['Admin', 'Manager'], caller);
        const callerName = caller ? caller.name : "System";

        const collections = this.getCollectionsRaw();
        const colIdx = collections.findIndex(c => c.id === collectionId.toString());
        if (colIdx === -1) {
            throw new Error("Collection entry not found");
        }
        const col = collections[colIdx];
        if (!col.stockUpdated) {
            throw new Error("Stock was not updated or already reversed for this collection");
        }

        const jobs = this.getJobWorksRaw();
        const jobIdx = jobs.findIndex(j => j.id === col.jobWorkNo);
        if (jobIdx === -1) {
            throw new Error("Job work not found");
        }
        const job = jobs[jobIdx];

        const products = this.getProductsRaw();
        const product = this.findProduct(products, job.productName, job.productCode);
        if (!product) {
            throw new Error("Product must exist in Finished Goods inventory");
        }

        try {
            const previousStock = Number(product.stock || 0);
            const newStock = Math.max(0, previousStock - col.acceptedQty);
            product.stock = newStock;

            const consLogs = this.getConsumptionLogsRaw();
            const logsToRevert = consLogs.filter(l => l.collectionNo === collectionId.toString());
            const rawMaterials = this.getRawMaterialsRaw();
            if (logsToRevert.length > 0) {
                logsToRevert.forEach(log => {
                    const mat = rawMaterials.find(m => m.name === log.rawMaterialName || m.id === log.rawMaterialName);
                    if (mat) {
                        mat.consumedQty = Math.max(0, (mat.consumedQty || 0) - Number(log.quantityUsed));
                        mat.currentStock = (mat.openingStock || 0) + (mat.purchasedQty || 0) - mat.consumedQty;
                    }
                });
            }
            const updatedConsLogs = consLogs.filter(l => l.collectionNo !== collectionId.toString());

            const totalCollected = Number(job.totalCollectedQty || job.collectedQty || 0) - col.todayCollectedQty;
            const totalRejected = Number(job.totalRejectedQty || job.rejectedQty || 0) - col.rejectedQty;
            const totalAccepted = totalCollected - totalRejected;

            job.collectedQty = totalCollected;
            job.rejectedQty = totalRejected;
            job.acceptedQty = totalAccepted;
            job.completedQty = totalAccepted;

            job.totalCollectedQty = totalCollected;
            job.totalRejectedQty = totalRejected;
            job.totalAcceptedQty = totalAccepted;

            const oldStatus = job.status;
            job.status = this.computeJobStatus(job);
            
            if (job.status === "Completed") {
                job.lastAction = "Inspection Completed";
            } else if (job.status !== oldStatus) {
                job.lastAction = "Status Updated";
            } else {
                job.lastAction = "Collection Deleted";
            }

            job.lastUpdated = Date.now().toString();
            job.updatedByUserId = caller ? caller.principalId : 'system_principal';
            job.updatedByUsername = caller ? caller.username : 'system';
            job.updatedByFullName = caller ? caller.name : 'System';
            job.updatedByRole = caller ? this.getRoleText(caller.role) : 'Master Admin';

            const movements = this.getStockMovementsRaw();
            const originalMovement = movements.find(m => m.id === col.stockMovementId);
            if (originalMovement) {
                originalMovement.reversed = true;
                originalMovement.movementType = "Production Collection (Reversed)";
            }

            const smId = (movements.length + 1).toString();
            movements.unshift({
                id: smId,
                date: Date.now().toString(),
                productName: job.productName,
                productCode: job.productCode,
                movementType: "Production Collection Delete",
                qtyAdded: -col.acceptedQty,
                relatedJobWorkNo: col.jobWorkNo,
                relatedCollectionNo: collectionId.toString(),
                userName: callerName,
                previousStock,
                adjustmentQty: -col.acceptedQty,
                newStock,
                collectionId: collectionId.toString(),
                jobWorkId: col.jobWorkNo,
                productId: product.id,
                createdBy: callerName,
                reversed: true
            });

            const ledgerEntries = this.getLedgerEntriesRaw();
            const ledgerIdx = ledgerEntries.findIndex(e => e.collectionId === collectionId.toString());
            if (ledgerIdx !== -1) {
                ledgerEntries[ledgerIdx].reversed = true;
                ledgerEntries[ledgerIdx].status = "Reversed";
                ledgerEntries[ledgerIdx].totalWage = 0;
                ledgerEntries[ledgerIdx].acceptedQty = 0;
                ledgerEntries[ledgerIdx].rejectedQty = 0;
                this.saveLedgerEntriesRaw(ledgerEntries);

                this.recalculateEmployeeLedger(job.employeeName);

                this.mockLogAudit(callerName, "LEDGER_ENTRY_REVERSED", `Marked ledger entry ID: ${ledgerEntries[ledgerIdx].id} as reversed for collection ${collectionId}`, col.jobWorkNo, collectionId.toString(), job.productName, job.employeeName, `Wage reversed to 0`);
            }

            col.stockUpdated = false;
            collections.splice(colIdx, 1);

            this.updateProductProductionCost(job.productName);

            this.saveProductsRaw(products);
            this.saveCollectionsRaw(collections);
            this.saveJobWorksRaw(jobs);
            this.saveStockMovementsRaw(movements);
            this.saveRawMaterialsRaw(rawMaterials);
            this.saveConsumptionLogsRaw(updatedConsLogs);

            this.mockLogAudit(callerName, "REJECTION_QTY_UPDATED", `Collection deleted: Reverted RejectedQty=${col.rejectedQty}, AcceptedQty=${col.acceptedQty} for JW-${col.jobWorkNo}`, col.jobWorkNo, collectionId.toString(), job.productName, job.employeeName, `Accepted: 0, Rejected: 0`);
            this.mockLogAudit(callerName, "COLLECTION_DELETED", `Deleted Collection No ${collectionId}`);
            this.mockLogAudit(callerName, "FINISHED_GOODS_STOCK_REVERSED", `Reversed stock for "${job.productName}" by -${col.acceptedQty} units (Previous: ${previousStock}, New: ${newStock})`);
            this.mockLogAudit(callerName, "Goods Collected", `Deleted Collection entry No ${collectionId}`);

            this.recalculateProductionReports();
        } catch (err: any) {
            throw err;
        }
    }

    async getCollections(): Promise<Array<any>> {
        const caller = this.getCurrentUserRaw();
        if (!caller) {
            throw new Error("Access denied: insufficient permissions.");
        }
        let cols = this.getCollectionsRaw();
        if ('Staff' in caller.role) {
            const linkedEmployeeName = localStorage.getItem('staff_employee_name_' + caller.username.toLowerCase()) || '';
            cols = cols.filter(c => c.karigarName.toLowerCase() === linkedEmployeeName.toLowerCase());
        }
        return cols.map(c => {
            let createdBy = c.createdBy;
            let inspectedBy = c.inspectedBy;
            
            if (createdBy === "Inspector") {
                createdBy = c.lastModifiedBy || c.createdByUser || c.userName || "Unknown User";
                if (createdBy === "Inspector") {
                    createdBy = "Unknown User";
                }
            } else if (!createdBy) {
                createdBy = c.userName || "Unknown User";
                if (createdBy === "Inspector") {
                    createdBy = "Unknown User";
                }
            }

            if (!inspectedBy) {
                inspectedBy = "Quality Inspector";
            }

            return {
                id: BigInt(c.id),
                collectionDate: BigInt(c.collectionDate) * 1000000n,
                jobWorkNo: BigInt(c.jobWorkNo),
                karigarName: c.karigarName,
                productName: c.productName,
                qtyGiven: Number(c.qtyGiven),
                prevCollectedQty: Number(c.prevCollectedQty),
                pendingQty: Number(c.pendingQty),
                todayCollectedQty: Number(c.todayCollectedQty),
                rejectedQty: Number(c.rejectedQty),
                acceptedQty: Number(c.acceptedQty),
                remarks: c.remarks || '',
                stockUpdated: !!c.stockUpdated,
                stockMovementId: c.stockMovementId || undefined,
                previousStock: c.previousStock !== undefined ? Number(c.previousStock) : undefined,
                newStock: c.newStock !== undefined ? Number(c.newStock) : undefined,
                collectionId: c.collectionId || undefined,
                oldAcceptedQty: c.oldAcceptedQty !== undefined ? Number(c.oldAcceptedQty) : undefined,
                createdBy: createdBy,
                createdById: c.createdById || "system",
                createdAt: c.createdAt || c.collectionDate || Date.now().toString(),
                inspectedBy: inspectedBy,
                inspectedById: c.inspectedById || "inspector",
                inspectedAt: c.inspectedAt || c.collectionDate || Date.now().toString()
            };
        });
    }

    async getStockMovementHistory(): Promise<Array<any>> {
        const movements = this.getStockMovementsRaw();
        return movements.map(m => ({
            id: BigInt(m.id),
            date: BigInt(m.date) * 1000000n,
            productName: m.productName,
            movementType: m.movementType,
            qtyAdded: Number(m.qtyAdded),
            relatedJobWorkNo: BigInt(m.relatedJobWorkNo || 0),
            relatedCollectionNo: BigInt(m.relatedCollectionNo || 0),
            userName: m.userName
        }));
    }

    async getSystemAuditLogs(): Promise<Array<any>> {
        const logs = this.getAuditLogsRaw();
        return logs.map(l => ({
            id: BigInt(l.id),
            timestamp: BigInt(l.timestamp) * 1000000n,
            user: l.operator || 'System',
            action: l.action,
            description: l.description,
            operator: l.operator || 'System',
            operatorRole: l.operatorRole || 'System',
            module: l.module || 'ERP',
            targetUser: l.targetUser || '',
            targetRole: l.targetRole || ''
        }));
    }

    async getKarigarLedger(employeeName: string): Promise<Array<any>> {
        const caller = this.getCurrentUserRaw();
        if (!caller) {
            throw new Error("Access denied: insufficient permissions.");
        }
        if ('Staff' in caller.role) {
            const linkedEmployeeName = localStorage.getItem('staff_employee_name_' + caller.username.toLowerCase()) || '';
            if (!linkedEmployeeName || employeeName.toLowerCase() !== linkedEmployeeName.toLowerCase()) {
                throw new Error("Unauthorized");
            }
        }
        const entries = this.getLedgerEntriesRaw();
        const empEntries = entries
            .filter(e => e.employeeName === employeeName)
            .sort((a, b) => parseInt(a.id) - parseInt(b.id));

        let runningBalance = 0;
        return empEntries.map(e => {
            const isReversed = e.reversed === true;
            const wage = isReversed ? 0 : Number(e.totalWage || 0);
            const paid = isReversed ? 0 : Number(e.paidAmount || 0);
            runningBalance += wage - paid;
            
            return {
                id: BigInt(e.id),
                employeeName: e.employeeName,
                jobWorkNo: BigInt(e.jobWorkNo || 0),
                date: BigInt(e.date) * 1000000n,
                productName: e.productName,
                qtyGiven: Number(e.qtyGiven || 0),
                acceptedQty: isReversed ? 0 : Number(e.acceptedQty || 0),
                rejectedQty: isReversed ? 0 : Number(e.rejectedQty || 0),
                pendingQty: Number(e.pendingQty || 0),
                rate: Number(e.rate || 0),
                totalWage: wage,
                paidAmount: paid,
                balanceAmount: runningBalance,
                status: e.status,
                collectionId: e.collectionId,
                jobWorkId: e.jobWorkId,
                employeeId: e.employeeId,
                source: e.source,
                reversed: e.reversed
            };
        });
    }

    async getEmployeePayments(): Promise<Array<any>> {
        const caller = this.getCurrentUserRaw();
        this.checkAccess(['Admin', 'Manager'], caller);
        const payments = this.getEmployeePaymentsRaw();
        return payments.map(p => ({
            id: BigInt(p.id),
            paymentDate: BigInt(p.paymentDate) * 1000000n,
            employeeName: p.employeeName,
            amountPaid: Number(p.amountPaid),
            paymentMode: p.paymentMode,
            remarks: p.remarks || ''
        }));
    }

    async saveEmployeePayment(karigarName: string, paymentAmount: number, paymentMode: string, note: string): Promise<bigint> {
        const payments = this.getEmployeePaymentsRaw();
        const nextId = payments.reduce((max, p) => Math.max(max, parseInt(p.id) || 0), 0) + 1;
        const newPayment = {
            id: nextId.toString(),
            paymentDate: Date.now().toString(),
            employeeName: karigarName,
            amountPaid: paymentAmount,
            paymentMode,
            remarks: note
        };
        payments.push(newPayment);
        this.saveEmployeePaymentsRaw(payments);

        const caller = this.getCurrentUserRaw();
        const callerName = caller ? caller.name : "System";
        
        // Ledger entry for payment
        const earned = this.mockGetEmployeeTotalEarned(karigarName);
        const paid = this.mockGetEmployeeTotalPaid(karigarName); // will include this since it was just added
        const balance = earned - paid;

        this.mockAddLedgerEntry(
            karigarName,
            "0",
            Date.now(),
            "Payment Handover",
            0,
            0,
            0,
            0,
            0,
            0,
            paymentAmount,
            balance,
            "Paid"
        );

        this.recalculateEmployeeLedger(karigarName);

        this.mockLogAudit(callerName, "Payment Made", `Processed payment of ${paymentAmount} to ${karigarName} via ${paymentMode}`);
        this.logActivity(caller ? caller.principalId : "System", callerName, "Employee Payment", `Paid ${paymentAmount} to ${karigarName} (${paymentMode})`);
        return BigInt(nextId);
    }

    async getEmployeeDashboardStats(): Promise<any> {
        const emps = this.getEmployeesRaw();
        const jobs = this.getJobWorksRaw();
        const collections = this.getCollectionsRaw();
        const products = this.getProductsRaw();

        const totalEmployees = BigInt(emps.length);
        let activeJobs = 0n;
        let completedJobs = 0n;
        let pendingJobs = 0n;
        let totalPendingQty = 0;
        let totalRejectedQty = 0;

        jobs.forEach(j => {
            const given = Number(j.qtyGiven || j.qtyAssigned || 0);
            const accepted = Number(j.acceptedQty || 0);
            if (j.status === "Completed" || j.status === "Collected") {
                completedJobs++;
            } else {
                activeJobs++;
                pendingJobs++;
                totalPendingQty += (given - accepted);
            }
            totalRejectedQty += Number(j.rejectedQty || 0);
        });

        // Wages due
        let totalWagesDue = 0;
        emps.forEach(emp => {
            const earned = this.mockGetEmployeeTotalEarned(emp.name);
            const paid = this.mockGetEmployeeTotalPaid(emp.name);
            totalWagesDue += (earned - paid);
        });

        // Today's collected quantity
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayEnd = todayStart + 24 * 60 * 60 * 1000;
        let todayCollectedQty = 0;

        collections.forEach(c => {
            const dateMs = parseInt(c.collectionDate) || 0;
            if (dateMs >= todayStart && dateMs < todayEnd) {
                todayCollectedQty += Number(c.todayCollectedQty) || 0;
            }
        });

        // Today's production (defaults to todayCollectedQty)
        let todayProduction = todayCollectedQty;

        // Finished Goods stock value: stock * productionCost
        let finishedGoodsStockValue = 0;
        products.forEach(p => {
            finishedGoodsStockValue += (Number(p.stock || 0) * (p.productionCost || 0));
        });

        return {
            totalEmployees,
            activeJobs,
            completedJobs,
            pendingJobs,
            totalWagesDue,
            todayProduction,
            totalPendingQty,
            todayCollectedQty,
            totalRejectedQty,
            finishedGoodsStockValue
        };
    }

    private mapToInvoice(item: any): Invoice {
        return {
            id: BigInt(item.id),
            invoiceNumber: item.invoiceNumber,
            date: BigInt(item.date) * 1000000n,
            businessInfo: item.businessInfo,
            customerInfo: {
                name: item.customerInfo.name,
                businessAddress: item.customerInfo.businessAddress,
                taxId: item.customerInfo.taxId
            },
            products: (item.products || []).map((p: any) => [
                p[0],
                BigInt(p[1]),
                BigInt(p[2])
            ]),
            totalAmount: item.totalAmount,
            paidAmount: item.paidAmount !== undefined ? item.paidAmount : item.totalAmount,
            creatorPrincipal: item.creatorPrincipal || "System",
            creatorName: item.creatorName || "System"
        };
    }

    private getConsumptionLogsRaw(): any[] {
        const stored = localStorage.getItem('mock_consumption_logs');
        return stored ? JSON.parse(stored) : [];
    }

    private saveConsumptionLogsRaw(logs: any[]) {
        localStorage.setItem('mock_consumption_logs', JSON.stringify(logs));
    }

    async getConsumptionLogs(): Promise<Array<any>> {
        const logs = this.getConsumptionLogsRaw();
        return logs.map(l => ({
            id: BigInt(l.id),
            date: BigInt(l.date) * 1000000n,
            productName: l.productName,
            batchNo: l.batchNo,
            rawMaterialName: l.rawMaterialName,
            quantityUsed: Number(l.quantityUsed),
            unit: l.unit,
            cost: Number(l.cost),
            employee: l.employee,
            jobWorkNo: l.jobWorkNo,
            remarks: l.remarks,
            acceptedQty: l.acceptedQty !== undefined ? Number(l.acceptedQty) : undefined,
            unitCost: l.unitCost !== undefined ? Number(l.unitCost) : undefined,
            status: l.status
        }));
    }

    async saveConsumptionLog(
        productName: string,
        batchNo: string,
        rawMaterialName: string,
        quantityUsed: number,
        unit: string,
        cost: number,
        employee: string,
        jobWorkNo: string,
        remarks: string
    ): Promise<bigint> {
        const caller = this.getCurrentUserRaw();
        const logs = this.getConsumptionLogsRaw();
        const nextId = (logs.reduce((max, l) => Math.max(max, parseInt(l.id) || 0), 0) + 1).toString();
        
        logs.unshift({
            id: nextId,
            date: Date.now().toString(),
            productName,
            batchNo,
            rawMaterialName,
            quantityUsed,
            unit,
            cost,
            employee,
            jobWorkNo,
            remarks
        });
        this.saveConsumptionLogsRaw(logs);

        // Reduce raw material stock
        const materials = this.getRawMaterialsRaw();
        const mat = materials.find(m => m.name === rawMaterialName || m.id === rawMaterialName);
        if (mat) {
            mat.consumedQty = (mat.consumedQty || 0) + quantityUsed;
            mat.currentStock = (mat.openingStock || 0) + (mat.purchasedQty || 0) - mat.consumedQty;
            this.saveRawMaterialsRaw(materials);
        }

        this.mockLogAudit(caller ? caller.name : "System", "Material Consumed", `Consumed ${quantityUsed} ${unit} of ${rawMaterialName} for ${productName}`);
        return BigInt(nextId);
    }

    private getFinishedGoodsLogsRaw(): any[] {
        const stored = localStorage.getItem('mock_finished_goods_logs');
        return stored ? JSON.parse(stored) : [];
    }

    private saveFinishedGoodsLogsRaw(logs: any[]) {
        localStorage.setItem('mock_finished_goods_logs', JSON.stringify(logs));
    }

    private saveFinishedGoodsLogRaw(productName: string, quantity: number, logType: string, reason: string) {
        const caller = this.getCurrentUserRaw();
        const logs = this.getFinishedGoodsLogsRaw();
        const nextId = (logs.reduce((max, l) => Math.max(max, parseInt(l.id) || 0), 0) + 1).toString();
        logs.unshift({
            id: nextId,
            date: Date.now().toString(),
            productName,
            quantity,
            logType,
            reason,
            userName: caller ? caller.name : "System"
        });
        this.saveFinishedGoodsLogsRaw(logs);
    }

    async getFinishedGoodsLogs(): Promise<Array<any>> {
        const logs = this.getFinishedGoodsLogsRaw();
        return logs.map(l => ({
            id: BigInt(l.id),
            date: BigInt(l.date) * 1000000n,
            productName: l.productName,
            quantity: Number(l.quantity),
            logType: l.logType,
            reason: l.reason,
            userName: l.userName
        }));
    }

    async saveFinishedGoodsLog(
        productName: string,
        quantity: number,
        logType: string,
        reason: string
    ): Promise<bigint> {
        if (logType === "Produced" || logType === "Returned") {
            throw new Error("Access denied: insufficient permissions.");
        }
        const logs = this.getFinishedGoodsLogsRaw();
        const nextId = (logs.reduce((max, l) => Math.max(max, parseInt(l.id) || 0), 0) + 1).toString();
        
        this.saveFinishedGoodsLogRaw(productName, quantity, logType, reason);

        if (logType === "Sold" || logType === "Damaged") {
            this.adjustStock(productName, -quantity);
        }

        return BigInt(nextId);
    }

    async getStockAlerts(): Promise<Array<any>> {
        return this.getStockAlertsRaw();
    }

    async resolveStockAlert(alertId: string): Promise<void> {
        const alerts = this.getStockAlertsRaw();
        const found = alerts.find(a => a.id === alertId);
        if (found) {
            found.isResolved = true;
            this.saveStockAlertsRaw(alerts);

            const unresolvedAlertsForProduct = alerts.filter(a => a.productId === found.productId && !a.isResolved);
            if (unresolvedAlertsForProduct.length === 0) {
                const products = this.getProductsRaw();
                const prod = products.find(p => p.id === found.productId);
                if (prod) {
                    prod.shortageQty = 0;
                    this.saveProductsRaw(products);
                }
            }
        }
    }

    async logWhatsAppStockAlertOpened(
        productId: string,
        productName: string,
        shortageQty: number,
        phoneNumberMasked?: string,
        source?: string
    ): Promise<void> {
        const metadata = {
            productId,
            productName,
            shortageQty,
            phoneNumberMasked: phoneNumberMasked || '',
            source: source || 'STOCK_ALERT'
        };
        this.logAuditUnified(
            'ERP',
            'WHATSAPP_STOCK_ALERT_OPENED',
            `WhatsApp stock alert opened for ${productName} (Shortage: ${shortageQty})`,
            undefined,
            undefined,
            JSON.stringify(metadata)
        );
    }

    async generateDemoConsumptionLogs(): Promise<string> {
        // 1. Ensure raw materials exist in mock_raw_materials
        const rawMaterials = this.getRawMaterialsRaw();
        const requiredMaterials = [
            { id: 'RM-1', name: 'Golden Beads', category: 'Beads', openingStock: 1000, purchasedQty: 0, consumedQty: 0, currentStock: 1000, unitCost: 0.50, unit: 'pcs', minStockAlert: 200 },
            { id: 'RM-2', name: 'Decorative Mirrors', category: 'Mirrors', openingStock: 500, purchasedQty: 0, consumedQty: 0, currentStock: 500, unitCost: 2.00, unit: 'pcs', minStockAlert: 100 },
            { id: 'RM-3', name: 'Silk Thread', category: 'Threads', openingStock: 200, purchasedQty: 0, consumedQty: 0, currentStock: 200, unitCost: 5.00, unit: 'meters', minStockAlert: 50 }
        ];

        requiredMaterials.forEach(req => {
            if (!rawMaterials.some(m => m.id === req.id)) {
                rawMaterials.push(req);
            }
        });
        this.saveRawMaterialsRaw(rawMaterials);

        // 2. Ensure product exists with BOM
        const products = this.getProductsRaw();
        let prod = products.find(p => p.id === 'PRD-1' || p.vigat === 'Premium Toran');
        const bomConfig = [
            { materialId: 'RM-1', quantity: 50 },
            { materialId: 'RM-2', quantity: 10 },
            { materialId: 'RM-3', quantity: 2 }
        ];
        
        if (!prod) {
            prod = {
                id: 'PRD-1',
                vigat: 'Premium Toran',
                rate: 450.00,
                hsnCode: '5609',
                stock: 0,
                productionCost: 70.00,
                bom: bomConfig
            };
            products.push(prod);
        } else {
            prod.bom = bomConfig;
        }
        this.saveProductsRaw(products);

        // 3. Ensure employee exists
        const employees = [
            { id: 'EMP-1', name: 'Ramesh Patel', mobile: '9876543210', address: 'Ahmedabad, Gujarat', joiningDate: Date.now().toString(), skillType: 'Master Artisan', status: 'Active' }
        ];
        const currentEmployees = localStorage.getItem('mock_employees') ? JSON.parse(localStorage.getItem('mock_employees')!) : [];
        employees.forEach(emp => {
            if (!currentEmployees.some((e: any) => e.name === emp.name)) {
                currentEmployees.push(emp);
            }
        });
        localStorage.setItem('mock_employees', JSON.stringify(currentEmployees));

        // 4. Create demo Job Work
        const jobs = this.getJobWorksRaw();
        const nextJobId = (jobs.reduce((max, j) => Math.max(max, parseInt(j.id) || 0), 0) + 1).toString();
        const newJob = {
            id: nextJobId,
            jobDate: Date.now().toString(),
            employeeName: 'Ramesh Patel',
            mobileNumber: '9876543210',
            productName: 'Premium Toran',
            productCode: 'PRD-1',
            hsnCode: '5609',
            qtyGiven: 10,
            qtyAssigned: 10,
            ratePerPiece: 15.00,
            expectedReturnDate: (Date.now() + 5*24*60*60*1000).toString(),
            expectedCompletionDate: (Date.now() + 5*24*60*60*1000).toString(),
            status: 'Given',
            remarks: 'Demo verification job',
            collectedQty: 0,
            completedQty: 0,
            rejectedQty: 0,
            acceptedQty: 0
        };
        jobs.push(newJob);
        this.saveJobWorksRaw(jobs);

        // 5. Execute Collection Entry (Accepted quantity 10)
        await this.saveCollectionEntry(BigInt(nextJobId), 10, 0, "Demo verification collection");

        return "Demo collection and consumption logs generated successfully!";
    }

    async runProductConsumptionTest(productId: string, productName: string): Promise<string> {
        // 1. Ensure employee Ramesh Patel exists
        const employees = [
            { id: 'EMP-1', name: 'Ramesh Patel', mobile: '9876543210', address: 'Ahmedabad, Gujarat', joiningDate: Date.now().toString(), skillType: 'Master Artisan', status: 'Active' }
        ];
        const currentEmployees = localStorage.getItem('mock_employees') ? JSON.parse(localStorage.getItem('mock_employees')!) : [];
        employees.forEach(emp => {
            if (!currentEmployees.some((e: any) => e.name === emp.name)) {
                currentEmployees.push(emp);
            }
        });
        localStorage.setItem('mock_employees', JSON.stringify(currentEmployees));

        // 2. Create Job Work with qtyGiven = 1
        const jobs = this.getJobWorksRaw();
        const nextJobId = (jobs.reduce((max, j) => Math.max(max, parseInt(j.id) || 0), 0) + 1).toString();
        const newJob = {
            id: nextJobId,
            jobDate: Date.now().toString(),
            employeeName: 'Ramesh Patel',
            mobileNumber: '9876543210',
            productName: productName,
            productCode: productId,
            hsnCode: '5609',
            qtyGiven: 1,
            qtyAssigned: 1,
            ratePerPiece: 15.00,
            expectedReturnDate: (Date.now() + 5*24*60*60*1000).toString(),
            expectedCompletionDate: (Date.now() + 5*24*60*60*1000).toString(),
            status: 'Given',
            remarks: 'Consumption Test Job',
            collectedQty: 0,
            completedQty: 0,
            rejectedQty: 0,
            acceptedQty: 0
        };
        jobs.push(newJob);
        this.saveJobWorksRaw(jobs);

        // 3. Save collection entry (accepted qty = 1)
        await this.saveCollectionEntry(BigInt(nextJobId), 1, 0, "BOM Consumption Test");

        return `Consumption test generated! Completed collection for 1 unit of ${productName}. Stock updated and logs created.`;
    }

    async editEmployeePayment(paymentId: bigint, paymentAmount: number, paymentMode: string, note: string): Promise<void> {
        const payments = this.getEmployeePaymentsRaw();
        const idx = payments.findIndex(p => p.id === paymentId.toString());
        if (idx === -1) {
            throw new Error("Payment not found");
        }
        const p = payments[idx];
        p.amountPaid = paymentAmount;
        p.paymentMode = paymentMode;
        p.remarks = note;
        this.saveEmployeePaymentsRaw(payments);

        const ledgerEntries = this.getLedgerEntriesRaw();
        const ledgerIdx = ledgerEntries.findIndex(e => e.paymentId === paymentId.toString());
        if (ledgerIdx !== -1) {
            ledgerEntries[ledgerIdx].paidAmount = paymentAmount;
            ledgerEntries[ledgerIdx].remarks = note;
            this.saveLedgerEntriesRaw(ledgerEntries);
            
            this.recalculateEmployeeLedger(p.employeeName);
            
            const caller = this.getCurrentUserRaw();
            const callerName = caller ? caller.name : "System";
            this.mockLogAudit(callerName, "LEDGER_ENTRY_UPDATED", `Updated ledger entry for payment ID: ${paymentId}`, "", "", "", p.employeeName, `New Payment: ${paymentAmount}`);
        }
        
        this.recalculateProductionReports();
    }

    async deleteEmployeePayment(paymentId: bigint): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Production', 'Finance'], 'canDelete', caller);
        
        const payments = this.getEmployeePaymentsRaw();
        const idx = payments.findIndex(p => p.id === paymentId.toString());
        if (idx === -1) {
            throw new Error("Payment not found");
        }
        const p = payments[idx];
        payments.splice(idx, 1);
        this.saveEmployeePaymentsRaw(payments);

        const ledgerEntries = this.getLedgerEntriesRaw();
        const ledgerIdx = ledgerEntries.findIndex(e => e.paymentId === paymentId.toString());
        if (ledgerIdx !== -1) {
            ledgerEntries[ledgerIdx].reversed = true;
            ledgerEntries[ledgerIdx].status = "Reversed";
            ledgerEntries[ledgerIdx].paidAmount = 0;
            this.saveLedgerEntriesRaw(ledgerEntries);
            
            this.recalculateEmployeeLedger(p.employeeName);
            
            this.mockLogAudit(caller.name, "Payment Deleted", `Deleted employee payment for ${p.employeeName} of amount ${p.amountPaid}`);
            this.mockLogAudit(caller.name, "LEDGER_ENTRY_REVERSED", `Marked ledger entry for payment ID: ${paymentId} as reversed`, "", "", "", p.employeeName, `Payment reversed to 0`);
        }

        this.recalculateProductionReports();
    }

    async recalculateProductionReports(): Promise<void> {
        const caller = this.getCurrentUserRaw();
        const callerName = caller ? caller.name : "System";
        this.mockLogAudit(callerName, "REPORTS_RECALCULATED", "Global production reports recalculated successfully.");
    }

    async checkStockReconciliation(): Promise<Array<any>> {
        const products = this.getProductsRaw();
        const collections = this.getCollectionsRaw();
        const invoices = this.getInvoicesRaw();
        const fgLogs = this.getFinishedGoodsLogsRaw();

        const report: any[] = [];
        let mismatchFound = false;

        products.forEach(p => {
            const opening = Number(p.openingStock !== undefined ? p.openingStock : p.stock || 0);
            
            const acceptedFromCol = collections
                .filter(c => c.productName === p.vigat || c.productName.startsWith(p.vigat + '|'))
                .reduce((sum, c) => sum + (Number(c.acceptedQty) || 0), 0);

            let salesQty = 0;
            invoices.forEach(inv => {
                (inv.products || []).forEach((item: any) => {
                    const itemName = item[0].split('|')[0].trim();
                    if (itemName === p.vigat) {
                        salesQty += Number(item[1]);
                    }
                });
            });

            let manualAdjustments = 0;
            fgLogs.forEach(l => {
                if (l.productName === p.vigat) {
                    if (l.logType === "Damaged") {
                        manualAdjustments -= Number(l.quantity);
                    } else if (l.logType === "Adjusted") {
                        manualAdjustments += Number(l.quantity);
                    }
                }
            });

            const expectedStock = opening + acceptedFromCol - salesQty + manualAdjustments;
            const actualStock = Number(p.stock || 0);
            const difference = actualStock - expectedStock;

            let reason = "In Sync";
            if (difference !== 0) {
                reason = `Mismatch: stock is ${difference > 0 ? 'over' : 'under'} by ${Math.abs(difference)} units.`;
                mismatchFound = true;
            }

            report.push({
                product: p.vigat,
                expectedStock,
                actualStock,
                difference,
                reason
            });
        });

        if (mismatchFound) {
            const caller = this.getCurrentUserRaw();
            const callerName = caller ? caller.name : "System";
            this.mockLogAudit(callerName, "STOCK_RECONCILIATION_FAILED", "Stock mismatch detected during reconciliation check.");
        }

        return report;
    }

    async runConsistencyAuditAndRepair(): Promise<Array<string>> {
        const report: string[] = [];
        const products = this.getProductsRaw();
        const collections = this.getCollectionsRaw();
        const invoices = this.getInvoicesRaw();
        const fgLogs = this.getFinishedGoodsLogsRaw();
        const rawMaterials = this.getRawMaterialsRaw();
        let consLogs = this.getConsumptionLogsRaw();
        const ledgerEntries = this.getLedgerEntriesRaw();
        const jobs = this.getJobWorksRaw();

        let updatedProducts = false;
        let updatedMaterials = false;
        let updatedConsLogs = false;
        let updatedLedger = false;

        // 1. Audit duplicate consumption logs
        const uniqueConsLogs: any[] = [];
        const seenLogs = new Set<string>();
        consLogs.forEach(log => {
            const key = `${log.collectionNo || log.batchNo}-${log.rawMaterialName}`;
            if (seenLogs.has(key)) {
                report.push(`[REPAIR] Duplicate consumption log detected and removed: Log ID ${log.id} for Collection ${log.collectionNo || log.batchNo}, Material ${log.rawMaterialName}.`);
                updatedConsLogs = true;
            } else {
                seenLogs.add(key);
                uniqueConsLogs.push(log);
            }
        });
        consLogs = uniqueConsLogs;

        // 2. Audit missing consumption logs based on collections
        collections.forEach(col => {
            const job = jobs.find(j => j.id === col.jobWorkNo);
            if (!job) return;
            const product = this.findProduct(products, job.productName, job.productCode);
            if (!product || !product.bom) return;

            const acceptedQty = Number(col.acceptedQty || 0);
            if (acceptedQty <= 0) return;

            product.bom.forEach((bomReq: any) => {
                const mat = rawMaterials.find(m => m.id === bomReq.materialId || m.name === bomReq.materialId);
                if (!mat) return;

                const hasLog = consLogs.some(l => (l.collectionNo === col.id || l.batchNo === `COL-${col.id}`) && l.rawMaterialName === mat.name);
                if (!hasLog) {
                    const qtyConsumed = bomReq.quantity * acceptedQty;
                    const logId = (consLogs.reduce((max, l) => Math.max(max, parseInt(l.id) || 0), 0) + 1).toString();
                    
                    const newLog = {
                        id: logId,
                        date: col.collectionDate || Date.now().toString(),
                        productName: job.productName,
                        batchNo: `COL-${col.id}`,
                        rawMaterialName: mat.name,
                        quantityUsed: qtyConsumed,
                        unit: mat.unit,
                        cost: qtyConsumed * (mat.unitCost || 0),
                        employee: job.employeeName,
                        jobWorkNo: `JW-${col.jobWorkNo}`,
                        remarks: `Automated repair log for collection COL-${col.id}`,
                        collectionNo: col.id.toString(),
                        acceptedQty: acceptedQty,
                        unitCost: mat.unitCost || 0,
                        status: "Completed"
                    };
                    consLogs.unshift(newLog);
                    report.push(`[REPAIR] Missing consumption log created: Log ID ${logId} for Collection ${col.id}, Material ${mat.name}, Quantity ${qtyConsumed}.`);
                    updatedConsLogs = true;
                }
            });
        });

        // 3. Audit Raw Material consumedQty and currentStock
        rawMaterials.forEach(mat => {
            const expectedConsumed = consLogs
                .filter(l => l.rawMaterialName === mat.name || l.rawMaterialName === mat.id)
                .reduce((sum, l) => sum + Number(l.quantityUsed || 0), 0);

            if (Number(mat.consumedQty || 0) !== expectedConsumed) {
                report.push(`[REPAIR] Raw Material "${mat.name}" consumed quantity mismatch: database showed ${mat.consumedQty}, expected ${expectedConsumed}. Corrected.`);
                mat.consumedQty = expectedConsumed;
                updatedMaterials = true;
            }

            const expectedStock = Number(mat.openingStock || 0) + Number(mat.purchasedQty || 0) - Number(mat.consumedQty || 0);
            if (Number(mat.currentStock || 0) !== expectedStock) {
                report.push(`[REPAIR] Raw Material "${mat.name}" stock mismatch: database showed ${mat.currentStock}, expected ${expectedStock}. Corrected.`);
                mat.currentStock = expectedStock;
                updatedMaterials = true;
            }
        });

        // 4. Audit Finished Goods stock math
        products.forEach(p => {
            if (p.openingStock === undefined) {
                const standardOpenings: Record<string, number> = {
                    'PRD-1': 13,
                    'PRD-2': 11,
                    'PRD-3': 10,
                    'PRD-4': 120,
                    'PRD-5': 58
                };
                p.openingStock = standardOpenings[p.id] !== undefined ? standardOpenings[p.id] : Number(p.stock || 0);
                updatedProducts = true;
            }

            const acceptedFromCol = collections
                .filter(c => c.productName === p.vigat || c.productName.startsWith(p.vigat + '|'))
                .reduce((sum, c) => sum + (Number(c.acceptedQty) || 0), 0);

            let salesQty = 0;
            invoices.forEach(inv => {
                (inv.products || []).forEach((item: any) => {
                    const itemName = item[0].split('|')[0].trim();
                    if (itemName === p.vigat) {
                        salesQty += Number(item[1]);
                    }
                });
            });

            let manualAdjustments = 0;
            fgLogs.forEach(l => {
                if (l.productName === p.vigat) {
                    if (l.logType === "Damaged") {
                        manualAdjustments -= Number(l.quantity);
                    } else if (l.logType === "Adjusted") {
                        manualAdjustments += Number(l.quantity);
                    }
                }
            });

            const expectedStock = Number(p.openingStock || 0) + acceptedFromCol - salesQty + manualAdjustments;
            if (Number(p.stock || 0) !== expectedStock) {
                report.push(`[REPAIR] Finished Product "${p.vigat}" stock mismatch: database showed ${p.stock}, expected ${expectedStock}. Corrected.`);
                p.stock = expectedStock;
                updatedProducts = true;
            }
        });

        // 5. Audit Employee Ledger balances
        const uniqueEmployees = Array.from(new Set(ledgerEntries.map(e => e.employeeName)));
        uniqueEmployees.forEach(empName => {
            const employeeEntries = ledgerEntries.filter(e => e.employeeName === empName);
            
            employeeEntries.sort((a, b) => {
                const dateDiff = (parseFloat(a.date) || 0) - (parseFloat(b.date) || 0);
                if (dateDiff !== 0) return dateDiff;
                return (parseInt(a.id) || 0) - (parseInt(b.id) || 0);
            });

            let runningEarned = 0;
            let runningPaid = 0;
            let mismatchDetected = false;

            employeeEntries.forEach(entry => {
                if (!entry.reversed) {
                    runningEarned += Number(entry.totalWage || 0);
                    runningPaid += Number(entry.paidAmount || 0);
                }
                const expectedBalance = runningEarned - runningPaid;
                if (Number(entry.balanceAmount || 0) !== expectedBalance) {
                    mismatchDetected = true;
                    entry.balanceAmount = expectedBalance;
                }
            });

            if (mismatchDetected) {
                report.push(`[REPAIR] Ledger running balances for Karigar "${empName}" recalculated and corrected.`);
                updatedLedger = true;
            }
        });

        if (updatedProducts) this.saveProductsRaw(products);
        if (updatedMaterials) this.saveRawMaterialsRaw(rawMaterials);
        if (updatedConsLogs) this.saveConsumptionLogsRaw(consLogs);
        if (updatedLedger) this.saveLedgerEntriesRaw(ledgerEntries);

        if (report.length === 0) {
            report.push("All systems are fully in sync. No mismatches detected.");
        }

        return report;
    }

    async exportDatabase(): Promise<any> {
        const caller = this.getCurrentUserRaw();
        const settings = this.getSettingsRaw();
        
        const allowed = caller && (
            'Admin' in caller.role ||
            ('Manager' in caller.role && settings && settings.allowAdminBackupRestore)
        );
        if (!allowed) {
            throw new Error("Access denied: insufficient permissions.");
        }

        const mapBigIntDefault = (val: string | null, def: bigint): bigint => {
            if (!val) return def;
            try { return BigInt(val); } catch(e) { return def; }
        };

        const serializeObj = (arr: any[]) => JSON.parse(JSON.stringify(arr.map(item => {
            const newItem = { ...item };
            for (const key in newItem) {
                if (typeof newItem[key] === 'bigint') {
                    newItem[key] = newItem[key].toString();
                }
            }
            return newItem;
        })));

        this.mockLogAudit(caller.name, "Backup Exported", "System database exported for backup");

        return {
            invoices: serializeObj(this.getInvoicesRaw()),
            lastInvoiceId: mapBigIntDefault(localStorage.getItem('mock_last_invoice_id'), 0n),
            users: serializeObj(this.getUsersRaw()),
            userCount: mapBigIntDefault(localStorage.getItem('mock_user_count'), 0n),
            activityLogs: serializeObj(this.getLogsRaw()),
            lastLogId: mapBigIntDefault(localStorage.getItem('mock_last_log_id'), 0n),
            productsList: serializeObj(this.getProductsRaw()),
            productCount: mapBigIntDefault(localStorage.getItem('mock_product_count'), 0n),
            customersList: serializeObj(this.getCustomersRaw()),
            customerCount: mapBigIntDefault(localStorage.getItem('mock_customer_count'), 0n),
            paymentsList: serializeObj(this.getPaymentsRaw()),
            lastPaymentId: mapBigIntDefault(localStorage.getItem('mock_last_payment_id'), 0n),
            rawMaterialsList: serializeObj(this.getRawMaterialsRaw()),
            purchasesList: serializeObj(this.getPurchasesRaw()),
            expensesList: serializeObj(this.getExpensesRaw()),
            vendorPaymentsList: serializeObj(this.getVendorPaymentsRaw()),
            consumptionHistory: serializeObj(this.getConsumptionHistoryRaw ? this.getConsumptionHistoryRaw() : []),
            lastPurchaseId: mapBigIntDefault(localStorage.getItem('mock_last_purchase_id'), 0n),
            lastExpenseId: mapBigIntDefault(localStorage.getItem('mock_last_expense_id'), 0n),
            lastVendorPaymentId: mapBigIntDefault(localStorage.getItem('mock_last_vendor_payment_id'), 0n),
            lastConsumptionId: mapBigIntDefault(localStorage.getItem('mock_last_consumption_id'), 0n),
            employeesList: serializeObj(this.getEmployeesRaw()),
            jobWorksList: serializeObj(this.getJobWorksRaw()),
            dailyWorkUpdatesList: serializeObj(this.getDailyWorkUpdatesRaw ? this.getDailyWorkUpdatesRaw() : []),
            jobCollectionsList: serializeObj(this.getJobCollectionsRaw ? this.getJobCollectionsRaw() : []),
            employeePaymentsList: serializeObj(this.getEmployeePaymentsRaw()),
            collectionsList: serializeObj(this.getCollectionsRaw()),
            stockMovementsList: serializeObj(this.getStockMovementsRaw ? this.getStockMovementsRaw() : []),
            auditLogsList: serializeObj(this.getAuditLogsRaw ? this.getAuditLogsRaw() : []),
            employeeLedgersList: serializeObj(this.getLedgerEntriesRaw()),
            consumptionLogsList: serializeObj(this.getConsumptionLogsRaw ? this.getConsumptionLogsRaw() : []),
            lastConsumptionLogId: mapBigIntDefault(localStorage.getItem('mock_last_consumption_log_id'), 0n),
            finishedGoodsLogsList: serializeObj(this.getFinishedGoodsLogsRaw ? this.getFinishedGoodsLogsRaw() : []),
            lastFinishedGoodsLogId: mapBigIntDefault(localStorage.getItem('mock_last_finished_goods_log_id'), 0n),
            employeeCount: mapBigIntDefault(localStorage.getItem('mock_employee_count'), 0n),
            lastJobWorkId: mapBigIntDefault(localStorage.getItem('mock_last_job_work_id'), 0n),
            lastDailyWorkUpdateId: mapBigIntDefault(localStorage.getItem('mock_last_daily_work_update_id'), 0n),
            lastJobCollectionId: mapBigIntDefault(localStorage.getItem('mock_last_job_collection_id'), 0n),
            lastEmployeePaymentId: mapBigIntDefault(localStorage.getItem('mock_last_employee_payment_id'), 0n),
            lastCollectionId: mapBigIntDefault(localStorage.getItem('mock_last_collection_id'), 0n),
            lastStockMovementId: mapBigIntDefault(localStorage.getItem('mock_last_stock_movement_id'), 0n),
            lastAuditLogId: mapBigIntDefault(localStorage.getItem('mock_last_audit_log_id'), 0n),
            lastEmployeeLedgerId: mapBigIntDefault(localStorage.getItem('mock_last_employee_ledger_id'), 0n),
            settings: settings
        };
    }

    async importDatabase(backup: any): Promise<void> {
        const caller = this.getCurrentUserRaw();
        const settings = this.getSettingsRaw();
        
        const allowed = caller && (
            'Admin' in caller.role ||
            ('Manager' in caller.role && settings && settings.allowAdminBackupRestore)
        );
        if (!allowed) {
            throw new Error("Access denied: insufficient permissions.");
        }

        const serializeObj = (arr: any[]) => JSON.stringify(arr || []);

        localStorage.setItem('mock_invoices', serializeObj(backup.invoices));
        localStorage.setItem('mock_last_invoice_id', (backup.lastInvoiceId ?? 0).toString());
        localStorage.setItem('mock_users', serializeObj(backup.users));
        localStorage.setItem('mock_user_count', (backup.userCount ?? 0).toString());
        localStorage.setItem('mock_activity_logs', serializeObj(backup.activityLogs));
        localStorage.setItem('mock_last_log_id', (backup.lastLogId ?? 0).toString());
        localStorage.setItem('mock_products', serializeObj(backup.productsList));
        localStorage.setItem('mock_product_count', (backup.productCount ?? 0).toString());
        localStorage.setItem('mock_customers', serializeObj(backup.customersList));
        localStorage.setItem('mock_customer_count', (backup.customerCount ?? 0).toString());
        localStorage.setItem('mock_payments', serializeObj(backup.paymentsList));
        localStorage.setItem('mock_last_payment_id', (backup.lastPaymentId ?? 0).toString());
        localStorage.setItem('mock_raw_materials', serializeObj(backup.rawMaterialsList));
        localStorage.setItem('mock_purchases', serializeObj(backup.purchasesList));
        localStorage.setItem('mock_expenses', serializeObj(backup.expensesList));
        localStorage.setItem('mock_vendor_payments', serializeObj(backup.vendorPaymentsList));
        localStorage.setItem('mock_consumption_history', serializeObj(backup.consumptionHistory));
        localStorage.setItem('mock_last_purchase_id', (backup.lastPurchaseId ?? 0).toString());
        localStorage.setItem('mock_last_expense_id', (backup.lastExpenseId ?? 0).toString());
        localStorage.setItem('mock_last_vendor_payment_id', (backup.lastVendorPaymentId ?? 0).toString());
        localStorage.setItem('mock_last_consumption_id', (backup.lastConsumptionId ?? 0).toString());
        localStorage.setItem('mock_employees', serializeObj(backup.employeesList));
        localStorage.setItem('mock_job_works', serializeObj(backup.jobWorksList));
        localStorage.setItem('mock_daily_work_updates', serializeObj(backup.dailyWorkUpdatesList));
        localStorage.setItem('mock_job_collections', serializeObj(backup.jobCollectionsList));
        localStorage.setItem('mock_employee_payments', serializeObj(backup.employeePaymentsList));
        localStorage.setItem('mock_collections_v2', serializeObj(backup.collectionsList));
        localStorage.setItem('mock_stock_movements_v2', serializeObj(backup.stockMovementsList));
        localStorage.setItem('mock_audit_logs_v2', serializeObj(backup.auditLogsList));
        localStorage.setItem('mock_ledger_entries_v2', serializeObj(backup.employeeLedgersList));
        localStorage.setItem('mock_consumption_logs', serializeObj(backup.consumptionLogsList));
        localStorage.setItem('mock_last_consumption_log_id', (backup.lastConsumptionLogId ?? 0).toString());
        localStorage.setItem('mock_finished_goods_logs', serializeObj(backup.finishedGoodsLogsList));
        localStorage.setItem('mock_last_finished_goods_log_id', (backup.lastFinishedGoodsLogId ?? 0).toString());
        localStorage.setItem('mock_employee_count', (backup.employeeCount ?? 0).toString());
        localStorage.setItem('mock_last_job_work_id', (backup.lastJobWorkId ?? 0).toString());
        localStorage.setItem('mock_last_daily_work_update_id', (backup.lastDailyWorkUpdateId ?? 0).toString());
        localStorage.setItem('mock_last_job_collection_id', (backup.lastJobCollectionId ?? 0).toString());
        localStorage.setItem('mock_last_employee_payment_id', (backup.lastEmployeePaymentId ?? 0).toString());
        localStorage.setItem('mock_last_collection_id', (backup.lastCollectionId ?? 0).toString());
        localStorage.setItem('mock_last_stock_movement_id', (backup.lastStockMovementId ?? 0).toString());
        localStorage.setItem('mock_last_audit_log_id', (backup.lastAuditLogId ?? 0).toString());
        localStorage.setItem('mock_last_employee_ledger_id', (backup.lastEmployeeLedgerId ?? 0).toString());

        if (backup.settings) {
            localStorage.setItem('mock_settings', JSON.stringify(backup.settings));
        }

        this.mockLogAudit(caller.name, "Backup Restored", "System database restored from backup");
    }

    private normalizeIndianPhone(phone: string): string | null {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return '91' + cleaned;
        } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
            return cleaned;
        } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
            return '91' + cleaned.substring(1);
        }
        return null;
    }

    // Phase 2 ready: Backend-only placeholders
    private WHATSAPP_PHONE_NUMBER_ID = "105943212345678";
    private WHATSAPP_ACCESS_TOKEN = "EAAGxx0xXxX...SECRET";
    private WHATSAPP_TEMPLATE_NAME = "invoice_notification";

    private async sendWhatsAppInvoiceMessage(invoiceId: bigint, userId: string): Promise<boolean> {
        console.log(`[WhatsApp API] Sending template ${this.WHATSAPP_TEMPLATE_NAME} for invoice ${invoiceId} by user ${userId}`);
        return true;
    }

    private getWhatsAppLogsRaw(): any[] {
        const stored = localStorage.getItem('mock_whatsapp_logs');
        return stored ? JSON.parse(stored) : [];
    }

    async getWhatsAppLogs(): Promise<Array<any>> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['AdminSettings'], 'whatsapp.viewLogs', caller);
        return this.getWhatsAppLogsRaw();
    }

    async getWhatsAppStatusForInvoice(invoiceId: bigint): Promise<{ sent: boolean; sentCount: number; lastSent?: number }> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Sales', 'Finance', 'AdminSettings'], 'whatsapp.viewStatus', caller);

        const logs = this.getWhatsAppLogsRaw();
        const invoiceLogs = logs.filter(l => l.invoiceId === invoiceId.toString());
        return {
            sent: invoiceLogs.length > 0,
            sentCount: invoiceLogs.length,
            lastSent: invoiceLogs.length > 0 ? invoiceLogs[invoiceLogs.length - 1].timestamp : undefined
        };
    }

    async getWhatsAppSettings(): Promise<any> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['AdminSettings'], 'whatsapp.manageSettings', caller);
        const stored = localStorage.getItem('mock_whatsapp_settings');
        if (stored) {
            return JSON.parse(stored);
        }
        return {
            phoneNumberId: this.WHATSAPP_PHONE_NUMBER_ID,
            accessToken: this.WHATSAPP_ACCESS_TOKEN,
            templateName: this.WHATSAPP_TEMPLATE_NAME,
            automationEnabled: true
        };
    }

    async saveWhatsAppSettings(phoneNumberId: string, accessToken: string, templateName: string, automationEnabled: boolean): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['AdminSettings'], 'whatsapp.manageSettings', caller);

        const settings = {
            phoneNumberId,
            accessToken,
            templateName,
            automationEnabled
        };
        localStorage.setItem('mock_whatsapp_settings', JSON.stringify(settings));
        this.mockLogAudit(caller.name, "WhatsApp Settings Updated", "Updated WhatsApp API configuration and automation settings");
    }

    async sendWhatsAppInvoice(invoiceId: bigint, isResend: boolean): Promise<{ success: boolean; message: string }> {
        const caller = this.getCurrentUserRaw();
        if (!caller) throw new Error("Unauthorized");

        const permissionToCheck = isResend ? 'whatsapp.resendInvoice' : 'whatsapp.sendInvoice';
        this.checkDeptAccess(['Sales', 'Finance', 'Production', 'Inventory', 'Purchase', 'Staff', 'AdminSettings'], permissionToCheck, caller);

        let invoice;
        const invoices = this.getInvoicesRaw();
        if (invoiceId === 0n) {
            invoice = invoices[invoices.length - 1];
        } else {
            invoice = invoices.find(i => i.id === invoiceId);
        }

        if (!invoice) {
            throw new Error("Invoice not found");
        }

        const phoneParts = invoice.customerInfo.taxId.split('|');
        const phone = phoneParts[0] || '';

        const normalizedPhone = this.normalizeIndianPhone(phone);
        if (!normalizedPhone) {
            this.mockLogAudit(caller.name, "WhatsApp Permission Denied", `Failed to send WhatsApp: Invalid phone number "${phone}"`);
            return { success: false, message: "Invalid customer phone number" };
        }

        const logs = this.getWhatsAppLogsRaw();
        const newLog = {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
            invoiceId: invoice.id.toString(),
            invoiceNumber: invoice.invoiceNumber,
            recipientPhone: normalizedPhone,
            senderUsername: caller.username,
            status: "Success",
            type: isResend ? "Resend" : "Send"
        };
        logs.push(newLog);
        localStorage.setItem('mock_whatsapp_logs', JSON.stringify(logs));

        const auditAction = isResend ? "WhatsApp Invoice Resent" : "WhatsApp Invoice Sent";
        const auditDetails = `Sent invoice #${invoice.invoiceNumber} to +${normalizedPhone}`;
        this.mockLogAudit(caller.name, auditAction, auditDetails);

        return { success: true, message: `WhatsApp invoice ${isResend ? 'resent' : 'sent'} successfully.` };
    }

    // --- MANUFACTURING ERP WORKFLOW MOCK METHODS ---
    private getSalesOrdersRaw(): any[] {
        const stored = localStorage.getItem('mock_sales_orders');
        return stored ? JSON.parse(stored) : [];
    }

    private saveSalesOrdersRaw(orders: any[]) {
        localStorage.setItem('mock_sales_orders', JSON.stringify(orders));
    }

    private getProductionRequirementsRaw(): any[] {
        const stored = localStorage.getItem('mock_production_requirements');
        return stored ? JSON.parse(stored) : [];
    }

    private saveProductionRequirementsRaw(reqs: any[]) {
        localStorage.setItem('mock_production_requirements', JSON.stringify(reqs));
    }

    private getPurchaseRequirementsRaw(): any[] {
        const stored = localStorage.getItem('mock_purchase_requirements');
        return stored ? JSON.parse(stored) : [];
    }

    private savePurchaseRequirementsRaw(reqs: any[]) {
        localStorage.setItem('mock_purchase_requirements', JSON.stringify(reqs));
    }

    private getMRPRecordsRaw(): any[] {
        const stored = localStorage.getItem('mock_mrp_records');
        return stored ? JSON.parse(stored) : [];
    }

    private saveMRPRecordsRaw(records: any[]) {
        localStorage.setItem('mock_mrp_records', JSON.stringify(records));
    }

    async getSalesOrders(): Promise<Array<SalesOrder>> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Sales'], 'canView', caller);
        return this.getSalesOrdersRaw();
    }

    async saveSalesOrder(order: SalesOrder): Promise<void> {
        const caller = this.getCurrentUserRaw();
        const orders = this.getSalesOrdersRaw();
        const existingIdx = orders.findIndex(o => o.id === order.id);
        const toggle = existingIdx !== -1 ? 'canEdit' : 'canCreate';
        this.checkDeptAccess(['Sales'], toggle, caller);

        const nowStr = new Date().toISOString();
        const orderData = {
            ...order,
            updatedAt: nowStr,
            updatedBy: caller.name
        };

        if (existingIdx !== -1) {
            orders[existingIdx] = orderData;
        } else {
            orderData.createdAt = nowStr;
            orderData.createdBy = caller.name;
            orders.push(orderData);
            this.logActivity(caller.principalId, caller.name, "SALES_ORDER_CREATED", `Created sales order ${order.orderNo}`);
            this.mockLogAudit(caller.name, "SALES_ORDER_CREATED", `Created sales order ${order.orderNo}`);
        }

        this.saveSalesOrdersRaw(orders);

        if (orderData.status === 'Confirmed') {
            await this.reserveStockForOrder(orderData.id);
        }
    }

    async deleteSalesOrder(id: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Sales'], 'canDelete', caller);
        const orders = this.getSalesOrdersRaw();
        const filtered = orders.filter(o => o.id !== id);
        this.saveSalesOrdersRaw(filtered);
    }

    async getProductionRequirements(): Promise<Array<ProductionRequirement>> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Production'], 'canView', caller);
        return this.getProductionRequirementsRaw();
    }

    async saveProductionRequirement(req: ProductionRequirement): Promise<void> {
        const caller = this.getCurrentUserRaw();
        const reqs = this.getProductionRequirementsRaw();
        const existingIdx = reqs.findIndex(r => r.id === req.id);
        const toggle = existingIdx !== -1 ? 'canEdit' : 'canCreate';
        this.checkDeptAccess(['Production'], toggle, caller);

        if (existingIdx !== -1) {
            reqs[existingIdx] = req;
        } else {
            reqs.push(req);
        }
        this.saveProductionRequirementsRaw(reqs);
    }

    async deleteProductionRequirement(id: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Production'], 'canDelete', caller);
        const reqs = this.getProductionRequirementsRaw();
        const filtered = reqs.filter(r => r.id !== id);
        this.saveProductionRequirementsRaw(filtered);
    }

    async getPurchaseRequirements(): Promise<Array<PurchaseRequirement>> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Purchase'], 'canView', caller);
        return this.getPurchaseRequirementsRaw();
    }

    async savePurchaseRequirement(req: PurchaseRequirement): Promise<void> {
        const caller = this.getCurrentUserRaw();
        const reqs = this.getPurchaseRequirementsRaw();
        const existingIdx = reqs.findIndex(r => r.id === req.id);
        const toggle = existingIdx !== -1 ? 'canEdit' : 'canCreate';
        this.checkDeptAccess(['Purchase'], toggle, caller);

        if (existingIdx !== -1) {
            reqs[existingIdx] = req;
        } else {
            reqs.push(req);
        }
        this.savePurchaseRequirementsRaw(reqs);
    }

    async deletePurchaseRequirement(id: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Purchase'], 'canDelete', caller);
        const reqs = this.getPurchaseRequirementsRaw();
        const filtered = reqs.filter(r => r.id !== id);
        this.savePurchaseRequirementsRaw(filtered);
    }

    async getMRPRecords(): Promise<Array<MRPRecord>> {
        return this.getMRPRecordsRaw();
    }

    async saveMRPRecord(record: MRPRecord): Promise<void> {
        const records = this.getMRPRecordsRaw();
        const existingIdx = records.findIndex(r => r.id === record.id);
        if (existingIdx !== -1) {
            records[existingIdx] = record;
        } else {
            records.push(record);
        }
        this.saveMRPRecordsRaw(records);
    }

    async runMRP(requirementId: string): Promise<MRPRecord> {
        const reqs = this.getProductionRequirementsRaw();
        const reqIdx = reqs.findIndex(r => r.id === requirementId);
        if (reqIdx === -1) {
            throw new Error(`Production Requirement ${requirementId} not found`);
        }
        const req = reqs[reqIdx];

        const products = this.getProductsRaw();
        const targetId = req.productId || (req as any).finishedGoodId || (req as any).itemId;
        const targetName = req.productName || (req as any).name;
        const product = products.find(p => 
            (p.id && targetId && p.id === targetId) ||
            ((p as any).finishedGoodId && targetId && (p as any).finishedGoodId === targetId) ||
            ((p as any).itemId && targetId && (p as any).itemId === targetId) ||
            ((p as any).productId && targetId && (p as any).productId === targetId) ||
            (p.id && req.productId && p.id === req.productId) ||
            (p.vigat && targetName && p.vigat.toLowerCase() === targetName.toLowerCase()) ||
            ((p as any).name && targetName && (p as any).name.toLowerCase() === targetName.toLowerCase())
        );
        if (!product) {
            throw new Error(`Product ${req.productName} not found`);
        }

        const rawMaterials = this.getRawMaterialsRaw();
        const requiredMaterials: MRPMaterialRequirement[] = [];
        let hasShortage = false;
        let allUnavailable = true;

        const bomRequirements = product.bom || (product as any).bomMaterials || (product as any).materials || (product as any).bomItems || [];
        for (const bom of bomRequirements) {
            const matIdOrName = bom.materialId || (bom as any).rawMaterialId || (bom as any).materialName || (bom as any).rawMaterialName || (bom as any).name;
            const material = rawMaterials.find(m => 
                (m.id && matIdOrName && m.id === matIdOrName) || 
                (m.name && matIdOrName && m.name.toLowerCase() === matIdOrName.toLowerCase()) ||
                (bom.materialId && m.id === bom.materialId) ||
                ((bom as any).rawMaterialId && m.id === (bom as any).rawMaterialId) ||
                ((bom as any).materialName && m.name === (bom as any).materialName) ||
                ((bom as any).rawMaterialName && m.name === (bom as any).rawMaterialName) ||
                ((bom as any).name && m.name === (bom as any).name)
            );
            if (material) {
                const bomQty = Number(bom.quantity ?? (bom as any).qty ?? (bom as any).qtyPerUnit ?? (bom as any).qtyPerUnitBase ?? 0);
                const requiredQty = bomQty * (req.plannedQty || req.requiredQty || 0);
                const availableQty = material.currentStock || 0;
                const shortageQty = Math.max(0, requiredQty - availableQty);

                if (shortageQty > 0) {
                    hasShortage = true;
                }
                if (availableQty > 0) {
                    allUnavailable = false;
                }

                requiredMaterials.push({
                    materialId: material.id,
                    materialName: material.name,
                    requiredQty,
                    availableQty,
                    shortageQty
                });

                // Auto-create purchase requirement if shortage exists
                if (shortageQty > 0) {
                    const purchReqs = this.getPurchaseRequirementsRaw();
                    const existingPurch = purchReqs.find(pr => 
                        (pr.mrpId === req.id || (pr as any).productionRequirementId === req.id) && 
                        (pr.materialId === material.id || (pr as any).rawMaterialId === material.id) &&
                        pr.status !== 'Cancelled'
                    );
                    if (!existingPurch) {
                        const newPurch: PurchaseRequirement = {
                            id: `PURCH-REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            mrpId: req.id,
                            materialId: material.id,
                            materialName: material.name,
                            requiredQty,
                            availableQty,
                            shortageQty,
                            vendorId: material.preferredVendor || 'Default Vendor',
                            status: 'Pending',
                            createdAt: new Date().toISOString()
                        };
                        purchReqs.push(newPurch);
                        this.savePurchaseRequirementsRaw(purchReqs);
                        this.logActivity(this.getCurrentUserRaw().principalId, this.getCurrentUserRaw().name, "PRODUCTION_PLAN_CREATED", `Created purchase request for ${material.name}`);
                        this.mockLogAudit(this.getCurrentUserRaw().name, "PRODUCTION_PLAN_CREATED", `Created purchase request for ${material.name}`);
                    }
                }
            }
        }

        let status = 'Ready';
        if (hasShortage) {
            status = allUnavailable ? 'Insufficient Materials' : 'Partially Available';
        }

        // Update requirement status based on shortage
        if (req.status !== 'Completed' && req.status !== 'Cancelled' && req.status !== 'In Production') {
            req.status = hasShortage ? 'Material Shortage' : 'Ready To Produce';
            reqs[reqIdx] = req;
            this.saveProductionRequirementsRaw(reqs);
        }

        const mrpRecord: MRPRecord = {
            id: `MRP-${req.id}`,
            productionRequirementId: req.id,
            productId: req.productId,
            productName: req.productName,
            requiredMaterials,
            status,
            createdAt: new Date().toISOString()
        };

        const mrpRecords = this.getMRPRecordsRaw();
        const existingIdx = mrpRecords.findIndex(m => m.productionRequirementId === req.id);
        if (existingIdx !== -1) {
            mrpRecords[existingIdx] = mrpRecord;
        } else {
            mrpRecords.push(mrpRecord);
        }
        this.saveMRPRecordsRaw(mrpRecords);

        this.logActivity(this.getCurrentUserRaw().principalId, this.getCurrentUserRaw().name, "MRP_CALCULATED", `MRP calculated for production requirement ${req.id}`);
        this.mockLogAudit(this.getCurrentUserRaw().name, "MRP_CALCULATED", `MRP calculated for production requirement ${req.id}`);

        return mrpRecord;
    }

    async reserveStockForOrder(orderId: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        const orders = this.getSalesOrdersRaw();
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const products = this.getProductsRaw();
        let changed = false;

        const items = order.items || [];
        for (const item of items) {
            const product = products.find(p => p.id === item.productId || p.vigat === item.productName);
            if (product) {
                const currentStock = Number(product.stock || 0);
                const reservedStock = Number(product.reservedStock || 0);
                const availableToSell = Math.max(0, currentStock - reservedStock);

                if (availableToSell >= item.qty) {
                    item.reservedQty = item.qty;
                    item.needProductionQty = 0;
                    product.reservedStock = reservedStock + item.qty;
                } else {
                    item.reservedQty = availableToSell;
                    item.needProductionQty = item.qty - availableToSell;
                    product.reservedStock = reservedStock + availableToSell;
                }
                product.availableToSell = Math.max(0, currentStock - product.reservedStock);
                changed = true;

                // Auto create production requirement if needed
                if (item.needProductionQty > 0) {
                    const reqs = this.getProductionRequirementsRaw();
                    const existingReq = reqs.find(r => r.salesOrderId === order.id && r.productId === item.productId);
                    if (!existingReq) {
                        const newReq: ProductionRequirement = {
                            id: `PROD-REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            salesOrderId: order.id,
                            productId: item.productId,
                            productName: item.productName,
                            requiredQty: item.needProductionQty,
                            plannedQty: item.needProductionQty,
                            completedQty: 0,
                            status: 'Pending',
                            priority: 'Medium',
                            expectedDate: order.deliveryDate,
                            createdAt: new Date().toISOString()
                        };
                        reqs.push(newReq);
                        this.saveProductionRequirementsRaw(reqs);

                        this.logActivity(caller.principalId, caller.name, "PRODUCTION_PLAN_CREATED", `Created production requirement for ${item.productName}`);
                        this.mockLogAudit(caller.name, "PRODUCTION_PLAN_CREATED", `Created production requirement for ${item.productName}`);

                        // Run MRP for this plan
                        await this.runMRP(newReq.id);
                    }
                }
            }
        }

        // Determine overall order status
        const allReserved = items.every(item => item.needProductionQty === 0);
        const someReserved = items.some(item => item.reservedQty > 0);

        if (allReserved) {
            order.status = 'Reserved';
        } else if (someReserved) {
            order.status = 'Partially Reserved';
        } else {
            order.status = 'Production Pending';
        }

        this.saveSalesOrdersRaw(orders);
        this.saveProductsRaw(products);

        this.logActivity(caller.principalId, caller.name, "STOCK_RESERVED", `Stock reservation processed for order ${order.orderNo}`);
        this.mockLogAudit(caller.name, "STOCK_RESERVED", `Stock reservation processed for order ${order.orderNo}`);
    }

    async completeProductionPlan(requirementId: string, completedQty: number): Promise<void> {
        const caller = this.getCurrentUserRaw();
        const reqs = this.getProductionRequirementsRaw();
        const reqIdx = reqs.findIndex(r => r.id === requirementId);
        if (reqIdx === -1) return;

        const req = reqs[reqIdx];
        const products = this.getProductsRaw();
        const targetId = req.productId || (req as any).finishedGoodId || (req as any).itemId;
        const targetName = req.productName || (req as any).name;
        const productIdx = products.findIndex(p => 
            (p.id && targetId && p.id === targetId) ||
            ((p as any).finishedGoodId && targetId && (p as any).finishedGoodId === targetId) ||
            ((p as any).itemId && targetId && (p as any).itemId === targetId) ||
            ((p as any).productId && targetId && (p as any).productId === targetId) ||
            (p.id && req.productId && p.id === req.productId) ||
            (p.vigat && targetName && p.vigat.toLowerCase() === targetName.toLowerCase()) ||
            ((p as any).name && targetName && (p as any).name.toLowerCase() === targetName.toLowerCase())
        );
        if (productIdx === -1) return;

        const product = products[productIdx];
        const rawMaterials = this.getRawMaterialsRaw();

        // Consume raw materials from stock based on BOM
        const bomRequirements = product.bom || (product as any).bomMaterials || (product as any).materials || (product as any).bomItems || [];
        for (const bom of bomRequirements) {
            const matIdOrName = bom.materialId || (bom as any).rawMaterialId || (bom as any).materialName || (bom as any).rawMaterialName || (bom as any).name;
            const materialIdx = rawMaterials.findIndex(m => 
                (m.id && matIdOrName && m.id === matIdOrName) || 
                (m.name && matIdOrName && m.name.toLowerCase() === matIdOrName.toLowerCase()) ||
                (bom.materialId && m.id === bom.materialId) ||
                ((bom as any).rawMaterialId && m.id === (bom as any).rawMaterialId) ||
                ((bom as any).materialName && m.name === (bom as any).materialName) ||
                ((bom as any).rawMaterialName && m.name === (bom as any).rawMaterialName) ||
                ((bom as any).name && m.name === (bom as any).name)
            );
            if (materialIdx !== -1) {
                const bomQty = Number(bom.quantity ?? (bom as any).qty ?? (bom as any).qtyPerUnit ?? (bom as any).qtyPerUnitBase ?? 0);
                const consumed = bomQty * completedQty;
                rawMaterials[materialIdx].consumedQty = (rawMaterials[materialIdx].consumedQty || 0) + consumed;
                rawMaterials[materialIdx].currentStock = Math.max(0, (rawMaterials[materialIdx].currentStock || 0) - consumed);
            }
        }
        this.saveRawMaterialsRaw(rawMaterials);

        // Update finished good product stock
        const oldStock = Number(product.stock || 0);
        product.stock = oldStock + completedQty;

        // Update production requirement status
        req.completedQty += completedQty;
        if (req.completedQty >= req.requiredQty) {
            req.status = 'Completed';
        } else {
            req.status = 'In Production';
        }
        reqs[reqIdx] = req;
        this.saveProductionRequirementsRaw(reqs);

        // Update sales order reservation with newly completed stock
        const orders = this.getSalesOrdersRaw();
        const order = orders.find(o => o.id === req.salesOrderId);
        if (order) {
            const item = order.items.find((i: any) => i.productId === req.productId || i.productName === req.productName);
            if (item && item.needProductionQty > 0) {
                const fulfilled = Math.min(item.needProductionQty, completedQty);
                item.reservedQty += fulfilled;
                item.needProductionQty -= fulfilled;
                product.reservedStock = Number(product.reservedStock || 0) + fulfilled;
            }

            // Check if entire order is fully reserved
            const allReserved = order.items.every((i: any) => i.needProductionQty === 0);
            if (allReserved) {
                order.status = 'Ready For Delivery';
            }
            this.saveSalesOrdersRaw(orders);
        }

        product.availableToSell = Math.max(0, Number(product.stock) - Number(product.reservedStock || 0));
        this.saveProductsRaw(products);

        this.logActivity(caller.principalId, caller.name, "MATERIAL_RECEIVED", `Completed production run of ${completedQty} units for ${product.vigat}`);
        this.mockLogAudit(caller.name, "MATERIAL_RECEIVED", `Completed production run of ${completedQty} units for ${product.vigat}`);
    }

    async receivePurchaseRequirement(requirementId: string, qty: number): Promise<void> {
        const caller = this.getCurrentUserRaw();
        const reqs = this.getPurchaseRequirementsRaw();
        const reqIdx = reqs.findIndex(r => r.id === requirementId);
        if (reqIdx === -1) return;

        const req = reqs[reqIdx];
        const oldShortage = req.shortageQty || 0;

        // Idempotency check: stable key containing requirement ID + received Qty + today's date
        const todayStr = new Date().toISOString().split('T')[0];
        const stableReceiptId = `${requirementId}-${qty}-${todayStr}`;
        const processedReceiptsStored = localStorage.getItem('mock_processed_receipts');
        let processedReceipts = processedReceiptsStored ? JSON.parse(processedReceiptsStored) : [];

        if (processedReceipts.includes(stableReceiptId) || (req.receiptProcessed && req.shortageQty === 0)) {
            throw new Error("This receipt has already been processed.");
        }

        const rawMaterials = this.getRawMaterialsRaw();
        const materialIdx = rawMaterials.findIndex(m => m.id === req.materialId || m.name === req.materialName);
        if (materialIdx === -1) return;

        const material = rawMaterials[materialIdx];
        const oldStock = material.currentStock || 0;

        // Resolve unit label:
        const unit = material.unit 
            || (material as any).unitLabel 
            || (material as any).stockUnit 
            || (material as any).measurementUnit 
            || req.unit 
            || 'pcs';

        // Resolve purchase rate:
        const rate = (material as any).purchaseRate 
            ?? material.rate 
            ?? (material as any).lastPurchaseRate 
            ?? material.unitCost 
            ?? 0;

        // Auto Create Purchase Invoice
        const invoiceNum = `PI-${Math.floor(10000 + Math.random() * 90000)}`;
        const subtotal = qty * rate;
        const gst = subtotal * 0.18;
        const grandTotal = subtotal + gst;
        const vName = req.vendorId || material.preferredVendor || 'General Vendor';

        const items = [
            {
                materialId: material.id,
                materialName: material.name,
                quantity: qty,
                qty: qty,
                unit: unit,
                rate: rate,
                gstPercent: 18,
                amount: subtotal
            }
        ];

        // Call standard savePurchase (setting paidAmount as 0 so paymentStatus remains Unpaid)
        await this.savePurchase(
            invoiceNum, 
            vName, 
            '', 
            '', 
            '', 
            items as any, 
            grandTotal, // totalAmount = grandTotal (which includes GST)
            0           // paidAmount = 0 (completely Unpaid)
        );

        // Retrieve and extend the created purchase invoice record with custom fields
        const purchases = this.getPurchasesRaw();
        const pIdx = purchases.findIndex(p => p.purchaseNumber === invoiceNum);
        if (pIdx !== -1) {
            const p = purchases[pIdx];
            (p as any).invoiceNo = invoiceNum;
            (p as any).subtotal = subtotal;
            (p as any).gst = gst;
            (p as any).grandTotal = grandTotal;
            (p as any).status = "Received";
            (p as any).paymentStatus = "Unpaid";
            (p as any).source = "Purchase Requirement";
            (p as any).sourceRequirementId = requirementId;
            purchases[pIdx] = p;
            this.savePurchasesRaw(purchases);
        }

        // Fetch raw materials again to update lastPurchaseDate, lastPurchaseRate, availableStock, and clamp stock
        const updatedRawMaterials = this.getRawMaterialsRaw();
        const uMatIdx = updatedRawMaterials.findIndex(m => m.id === material.id);
        let newStock = oldStock + qty;
        if (uMatIdx !== -1) {
            const uMat = updatedRawMaterials[uMatIdx];
            uMat.lastPurchaseDate = new Date().toISOString();
            uMat.lastPurchaseRate = rate;
            if ((uMat as any).availableStock !== undefined) {
                (uMat as any).availableStock = ((uMat as any).availableStock || 0) + qty;
            }
            // Clamp stock to prevent negative stock values
            uMat.currentStock = Math.max(0, uMat.currentStock);
            if ((uMat as any).availableStock !== undefined) {
                (uMat as any).availableStock = Math.max(0, (uMat as any).availableStock);
            }
            newStock = uMat.currentStock;
            updatedRawMaterials[uMatIdx] = uMat;
            this.saveRawMaterialsRaw(updatedRawMaterials);
        }

        // Create Inventory Batch (mock_inventory_batches)
        const batchesStored = localStorage.getItem('mock_inventory_batches');
        let batches = batchesStored ? JSON.parse(batchesStored) : [];
        const newBatch = {
            batchId: `BAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            materialId: material.id,
            materialName: material.name,
            invoiceNo: invoiceNum,
            qty: qty,
            unit: unit,
            rate: rate,
            vendor: vName,
            receivedDate: new Date().toISOString()
        };
        batches.push(newBatch);
        localStorage.setItem('mock_inventory_batches', JSON.stringify(batches));

        // Create Inventory Transaction (mock_inventory_transactions)
        const transactionsStored = localStorage.getItem('mock_inventory_transactions');
        let transactions = transactionsStored ? JSON.parse(transactionsStored) : [];
        const existingTx = transactions.find((tx: any) => tx.referenceId === requirementId && tx.invoiceNo === invoiceNum);
        if (!existingTx) {
            const newTx = {
                id: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                type: "PURCHASE_RECEIPT",
                materialId: material.id,
                materialName: material.name,
                qty: qty,
                unit: unit,
                vendor: vName,
                invoiceNo: invoiceNum,
                referenceId: requirementId,
                createdBy: caller ? (caller.fullName || caller.name || caller.username || "System") : "System",
                createdAt: new Date().toISOString()
            };
            transactions.push(newTx);
            localStorage.setItem('mock_inventory_transactions', JSON.stringify(transactions));
        }
        // Update purchase requirement details & history log
        const remainingQty = Math.max(0, oldShortage - qty);
        const completedQty = (req.completedQty || 0) + qty;
        const lastReceiptDate = new Date().toISOString();

        req.receivedQty = qty;
        req.remainingQty = remainingQty;
        req.completedQty = completedQty;
        req.lastReceiptDate = lastReceiptDate;
        
        req.receiptHistory = req.receiptHistory || [];
        req.receiptHistory.push({
            receiptId: stableReceiptId,
            invoiceNo: invoiceNum,
            qty: qty,
            receivedDate: lastReceiptDate,
            receivedBy: caller ? (caller.fullName || caller.name || caller.username || "System") : "System"
        });

        // Set safety flags on requirement
        req.receiptProcessed = true;
        req.invoiceCreated = true;
        req.stockUpdated = true;
        req.auditLogged = true;

        let newShortage = 0;
        if (remainingQty === 0) {
            req.status = "Completed";
            req.shortageQty = 0;
            req.completedAt = lastReceiptDate;
            req.completedBy = caller ? (caller.fullName || caller.name || caller.username || "System") : "System";
            newShortage = 0;
        } else {
            req.status = "Partial";
            req.shortageQty = remainingQty;
            newShortage = remainingQty;
        }
        reqs[reqIdx] = req;
        this.savePurchaseRequirementsRaw(reqs);

        // Record unified audit logs (8 logs)
        const metadata = {
            purchaseRequirementId: requirementId,
            purchaseInvoiceNo: invoiceNum,
            materialId: material.id,
            materialName: material.name,
            receivedQty: qty,
            unit: unit,
            oldStock: oldStock,
            newStock: newStock,
            oldShortage: oldShortage,
            newShortage: newShortage,
            productionRequirementId: req.mrpId || req.productionRequirementId || '',
            userId: caller ? caller.principalId : 'system',
            userName: caller ? caller.name : 'System',
            timestamp: Date.now().toString(),
            grandTotal: grandTotal,
            vendorName: vName
        };
        const metadataStr = JSON.stringify(metadata);

        this.logAuditUnified('ERP', 'PURCHASE_RECEIPT_CREATED', `Created purchase receipt for requirement ${requirementId}. Received Qty: ${qty} ${unit}`, '', '', metadataStr);
        this.logAuditUnified('ERP', 'PURCHASE_INVOICE_CREATED', `Created purchase invoice ${invoiceNum} for raw material ${material.name}`, '', '', metadataStr);
        this.logAuditUnified('ERP', 'RAW_MATERIAL_STOCK_UPDATED', `Updated stock for raw material ${material.name}. Old stock: ${oldStock}, New stock: ${newStock}`, '', '', metadataStr);
        this.logAuditUnified('ERP', 'INVENTORY_BATCH_CREATED', `Created inventory batch BAT-... for material ${material.name}`, '', '', metadataStr);
        this.logAuditUnified('ERP', 'INVENTORY_TRANSACTION_CREATED', `Recorded purchase receipt transaction for material ${material.name}`, '', '', metadataStr);
        this.logAuditUnified('ERP', 'MRP_RECALCULATED', `Recalculated MRP for production requirement ${metadata.productionRequirementId}`, '', '', metadataStr);
        this.logAuditUnified('ERP', 'PRODUCTION_REQUIREMENT_UPDATED', `Updated production requirement status based on recalculated MRP`, '', '', metadataStr);
        this.logAuditUnified('ERP', 'VENDOR_LEDGER_UPDATED', `Updated vendor ledger and payable outstanding for vendor ${vName} by ${grandTotal}`, '', '', metadataStr);

        // Mark stable receipt ID as processed
        processedReceipts.push(stableReceiptId);
        localStorage.setItem('mock_processed_receipts', JSON.stringify(processedReceipts));

        // Re-run MRP recalculation for all affected production requirements
        const allProdReqs = this.getProductionRequirementsRaw();
        const products = this.getProductsRaw();
        
        const affectedProdReqs = allProdReqs.filter(pr => {
            if (pr.id === req.mrpId || pr.id === req.productionRequirementId) {
                return true;
            }
            const product = products.find(p => p.id === pr.productId || p.vigat === pr.productName);
            if (product && product.bom) {
                return product.bom.some((bomItem: any) => bomItem.materialId === material.id || bomItem.materialId === material.name);
            }
            return false;
        });

        for (const prodReq of affectedProdReqs) {
            try {
                const updatedMRP = await this.runMRP(prodReq.id);
                const currentProdReqs = this.getProductionRequirementsRaw();
                const idx = currentProdReqs.findIndex(r => r.id === prodReq.id);
                if (idx !== -1) {
                    const currentProdReq = currentProdReqs[idx];
                    const hasShortagesRemaining = updatedMRP.requiredMaterials?.some((m: any) => m.shortageQty > 0);
                    
                    if (!hasShortagesRemaining) {
                        currentProdReq.mrpStatus = "In Stock";
                        if (currentProdReq.status === 'Pending' || currentProdReq.status === 'Material Shortage') {
                            currentProdReq.status = "Ready To Produce";
                        }
                    } else {
                        currentProdReq.mrpStatus = "Partially Available";
                        if (currentProdReq.status === 'Pending' || currentProdReq.status === 'Ready To Produce') {
                            currentProdReq.status = "Material Shortage";
                        }
                    }
                    currentProdReqs[idx] = currentProdReq;
                    this.saveProductionRequirementsRaw(currentProdReqs);
                }
            } catch (e) {
                console.error(`Failed to run MRP recalculation for production requirement ${prodReq.id}:`, e);
            }
        }
    }

    async getPurchaseOrders(): Promise<Array<PurchaseOrder>> {
        const stored = localStorage.getItem('mock_purchase_orders');
        return stored ? JSON.parse(stored) : [];
    }

    async savePurchaseOrder(po: PurchaseOrder): Promise<void> {
        const caller = this.getCurrentUserRaw();
        const pos = await this.getPurchaseOrders();
        const existingIdx = pos.findIndex(p => p.id === po.id || p.poNumber === po.poNumber);
        
        let isNew = false;
        let oldStatus = "";
        if (existingIdx === -1) {
            isNew = true;
            pos.push(po);
        } else {
            oldStatus = pos[existingIdx].status;
            pos[existingIdx] = po;
        }
        localStorage.setItem('mock_purchase_orders', JSON.stringify(pos));

        // Audit logging
        const auditAction = isNew ? "PO_CREATED" : (oldStatus !== po.status ? `PO_${po.status.toUpperCase()}` : "PO_UPDATED");
        const metadata = JSON.stringify({
            poId: po.id,
            poNumber: po.poNumber,
            materialId: po.materialId,
            materialName: po.materialName,
            orderedQty: po.orderedQty,
            status: po.status,
            vendorId: po.vendorId,
            userId: caller ? caller.principalId : 'system',
            userName: caller ? caller.name : 'System',
            timestamp: Date.now().toString()
        });
        this.logAuditUnified('ERP', auditAction, `${isNew ? 'Created' : 'Updated'} Purchase Order ${po.poNumber} for material ${po.materialName} (Vendor: ${po.vendorId}). Status: ${po.status}`, '', '', metadata);

        // Link status back to Purchase Requirements
        if (po.purchaseRequirementId) {
            const reqs = this.getPurchaseRequirementsRaw();
            const reqIdx = reqs.findIndex(r => r.id === po.purchaseRequirementId);
            if (reqIdx !== -1) {
                const req = reqs[reqIdx];
                if (po.status === "Approved") {
                    req.status = "Ordered";
                } else if (po.status === "Cancelled") {
                    req.status = "Cancelled";
                }
                reqs[reqIdx] = req;
                this.savePurchaseRequirementsRaw(reqs);
            }
        }
    }

    async deletePurchaseOrder(id: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        const pos = await this.getPurchaseOrders();
        const filtered = pos.filter(p => p.id !== id);
        localStorage.setItem('mock_purchase_orders', JSON.stringify(filtered));
        this.logActivity(caller.principalId, caller.name, "Delete Purchase Order", `Deleted Purchase Order ${id}`);
    }

    async getGRNs(): Promise<Array<GRN>> {
        const stored = localStorage.getItem('mock_grns');
        return stored ? JSON.parse(stored) : [];
    }

    async saveGRN(grn: GRN): Promise<void> {
        const caller = this.getCurrentUserRaw();
        const grns = await this.getGRNs();
        grns.push(grn);
        localStorage.setItem('mock_grns', JSON.stringify(grns));

        const metadata = JSON.stringify({
            grnNo: grn.grnNo,
            poNumber: grn.poNumber,
            vendorId: grn.vendorId,
            userId: caller ? caller.principalId : 'system',
            userName: caller ? caller.name : 'System',
            timestamp: Date.now().toString()
        });
        this.logAuditUnified('ERP', "GRN_CREATED", `Created Goods Receipt Note ${grn.grnNo} for PO ${grn.poNumber}`, '', '', metadata);
    }

    async receivePOItem(poId: string, qty: number, invoiceNo: string, expiryDate?: string, remarks?: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        const pos = await this.getPurchaseOrders();
        const poIdx = pos.findIndex(p => p.id === poId);
        if (poIdx === -1) throw new Error("Purchase Order not found.");

        const po = pos[poIdx];
        if (po.status === "Cancelled" || po.status === "Completed") {
            throw new Error("Cannot receive items against this PO status.");
        }

        // Idempotency check: stable key containing PO ID + received Qty + today's date
        const todayStr = new Date().toISOString().split('T')[0];
        const stableReceiptId = `${poId}-${qty}-${todayStr}`;
        const processedReceiptsStored = localStorage.getItem('mock_processed_receipts');
        let processedReceipts = processedReceiptsStored ? JSON.parse(processedReceiptsStored) : [];

        if (processedReceipts.includes(stableReceiptId)) {
            throw new Error("This receipt has already been processed.");
        }

        // Check for duplicate invoice number
        const purchases = this.getPurchasesRaw();
        if (purchases.some(p => p.purchaseNumber === invoiceNo)) {
            throw new Error(`Supplier Invoice ${invoiceNo} has already been registered.`);
        }

        // Load Raw Material
        const rawMaterials = this.getRawMaterialsRaw();
        const materialIdx = rawMaterials.findIndex(m => m.id === po.materialId || m.name === po.materialName);
        if (materialIdx === -1) throw new Error("Raw Material not found.");

        const material = rawMaterials[materialIdx];
        const oldStock = material.currentStock || 0;

        // Resolve unit label:
        const unit = material.unit 
            || (material as any).unitLabel 
            || (material as any).stockUnit 
            || (material as any).measurementUnit 
            || po.unit 
            || 'pcs';

        // Resolve purchase rate:
        const rate = po.rate || material.unitCost || 0;

        // Auto Create Purchase Invoice
        const subtotal = qty * rate;
        const gst = subtotal * 0.18;
        const grandTotal = subtotal + gst;
        const vName = po.vendorId || material.preferredVendor || 'General Vendor';

        // Lookup vendor details from master data
        let vMobile = '';
        let vGst = '';
        let vAddress = '';
        try {
            const storedVendors = localStorage.getItem('mock_vendors');
            const vendors = storedVendors ? JSON.parse(storedVendors) : [];
            const vendor = vendors.find((v: any) => v.name.trim().toLowerCase() === vName.trim().toLowerCase());
            if (vendor) {
                vMobile = vendor.phone || '';
                vGst = vendor.gstin || '';
                vAddress = vendor.businessAddress || '';
            }
        } catch (e) {
            console.error("Error looking up vendor details during PO receipt:", e);
        }

        const items = [
            {
                materialId: material.id,
                materialName: material.name,
                quantity: qty,
                qty: qty,
                unit: unit,
                rate: rate,
                gstPercent: po.gstPercent || 18,
                amount: subtotal
            }
        ];

        // Call standard savePurchase
        await this.savePurchase(
            invoiceNo, 
            vName, 
            vMobile, 
            vGst, 
            vAddress, 
            items as any, 
            grandTotal, 
            0 // paidAmount = 0
        );

        // Retrieve and extend the created purchase invoice record with custom fields
        const updatedPurchases = this.getPurchasesRaw();
        const pIdx = updatedPurchases.findIndex(p => p.purchaseNumber === invoiceNo);
        if (pIdx !== -1) {
            const p = updatedPurchases[pIdx];
            const settingsStored = localStorage.getItem('mock_settings');
            const settings = settingsStored ? JSON.parse(settingsStored) : {};
            const terms = settings.defaultPaymentTerms || "Net 30";
            let days = 30;
            if (terms === "Net 15") days = 15;
            else if (terms === "Net 60") days = 60;
            else if (terms === "Cash") days = 0;

            const dueDt = new Date();
            dueDt.setDate(dueDt.getDate() + days);

            (p as any).invoiceNo = invoiceNo;
            (p as any).subtotal = subtotal;
            (p as any).gst = gst;
            (p as any).grandTotal = grandTotal;
            (p as any).status = "Received";
            (p as any).paymentStatus = "Unpaid";
            (p as any).source = "Purchase Order";
            (p as any).sourceRequirementId = po.purchaseRequirementId || "";
            (p as any).poNumber = po.poNumber;
            (p as any).invoiceType = "Standard";
            (p as any).paymentTerms = terms;
            (p as any).dueDate = dueDt.toISOString().split('T')[0];
            (p as any).remainingAmount = grandTotal;
            updatedPurchases[pIdx] = p;
            this.savePurchasesRaw(updatedPurchases);
        }

        // Adjust costing method
        const settingsStored = localStorage.getItem('mock_settings');
        const settings = settingsStored ? JSON.parse(settingsStored) : {};
        const costingMethod = settings.costingMethod || "WeightedAverage";

        let finalUnitCost = material.unitCost;
        if (costingMethod === "WeightedAverage") {
            const totalStockBefore = Math.max(0, oldStock);
            const totalCostBefore = totalStockBefore * (material.unitCost || 0);
            const incomingCost = qty * rate;
            const totalStockAfter = totalStockBefore + qty;
            finalUnitCost = totalStockAfter > 0 ? (totalCostBefore + incomingCost) / totalStockAfter : rate;
        } else if (costingMethod === "Standard") {
            // Keep existing manual cost
            finalUnitCost = material.unitCost;
        } else {
            // Default Weighted Average fallback
            finalUnitCost = rate;
        }

        // Fetch raw materials again to update lastPurchaseDate, lastPurchaseRate, availableStock, and clamp stock
        const updatedRawMaterials = this.getRawMaterialsRaw();
        const uMatIdx = updatedRawMaterials.findIndex(m => m.id === material.id);
        let newStock = oldStock + qty;
        if (uMatIdx !== -1) {
            const uMat = updatedRawMaterials[uMatIdx];
            uMat.lastPurchaseDate = new Date().toISOString();
            uMat.lastPurchaseRate = rate;
            uMat.unitCost = finalUnitCost;
            if ((uMat as any).availableStock !== undefined) {
                (uMat as any).availableStock = ((uMat as any).availableStock || 0) + qty;
            }
            // Clamp stock to prevent negative stock values
            uMat.currentStock = Math.max(0, uMat.currentStock);
            if ((uMat as any).availableStock !== undefined) {
                (uMat as any).availableStock = Math.max(0, (uMat as any).availableStock);
            }
            newStock = uMat.currentStock;
            updatedRawMaterials[uMatIdx] = uMat;
            this.saveRawMaterialsRaw(updatedRawMaterials);
        }

        // Create Goods Receipt Note (GRN)
        const grnNo = `GRN-${Math.floor(10000 + Math.random() * 90000)}`;
        const newGRN: GRN = {
            grnNo,
            poNumber: po.poNumber,
            invoiceNo: invoiceNo,
            receivedDate: new Date().toISOString(),
            vendorId: vName,
            receivedBy: caller ? (caller.fullName || caller.name || caller.username || "System") : "System",
            items: [
                {
                    materialId: material.id,
                    materialName: material.name,
                    quantity: qty,
                    unit: unit,
                    batchNo: `BAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    expiryDate: expiryDate || ""
                }
            ],
            status: "Received",
            remarks: remarks || ""
        };
        await this.saveGRN(newGRN);

        // Create Inventory Batch (mock_inventory_batches)
        const batchesStored = localStorage.getItem('mock_inventory_batches');
        let batches = batchesStored ? JSON.parse(batchesStored) : [];
        const newBatch = {
            batchId: newGRN.items[0].batchNo,
            materialId: material.id,
            materialName: material.name,
            invoiceNo: invoiceNo,
            qty: qty,
            unit: unit,
            rate: rate,
            vendor: vName,
            receivedDate: new Date().toISOString(),
            expiryDate: expiryDate || ""
        };
        batches.push(newBatch);
        localStorage.setItem('mock_inventory_batches', JSON.stringify(batches));

        // Create Inventory Transaction (mock_inventory_transactions)
        const transactionsStored = localStorage.getItem('mock_inventory_transactions');
        let transactions = transactionsStored ? JSON.parse(transactionsStored) : [];
        const newTx = {
            id: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type: "PURCHASE_RECEIPT",
            materialId: material.id,
            materialName: material.name,
            qty: qty,
            unit: unit,
            vendor: vName,
            invoiceNo: invoiceNo,
            referenceId: poId,
            createdBy: caller ? (caller.fullName || caller.name || caller.username || "System") : "System",
            createdAt: new Date().toISOString()
        };
        transactions.push(newTx);
        localStorage.setItem('mock_inventory_transactions', JSON.stringify(transactions));
        // Update PO details & history log
        po.receiptHistory = po.receiptHistory || [];
        po.receiptHistory.push({
            receiptId: stableReceiptId,
            grnNo: grnNo,
            invoiceNo: invoiceNo,
            qty: qty,
            receivedDate: new Date().toISOString(),
            receivedBy: caller ? (caller.fullName || caller.name || caller.username || "System") : "System"
        });

        const totalReceivedPO = po.receiptHistory.reduce((sum, h) => sum + h.qty, 0);
        po.orderedQty = po.orderedQty || po.requiredQty || 0; // fallback safety
        if (totalReceivedPO >= po.orderedQty) {
            po.status = "Completed";
        } else {
            po.status = "Partial";
        }
        pos[poIdx] = po;
        localStorage.setItem('mock_purchase_orders', JSON.stringify(pos));

        // Update purchase requirement details & history log
        let oldShortage = 0;
        let newShortage = 0;
        if (po.purchaseRequirementId) {
            const reqs = this.getPurchaseRequirementsRaw();
            const reqIdx = reqs.findIndex(r => r.id === po.purchaseRequirementId);
            if (reqIdx !== -1) {
                const req = reqs[reqIdx];
                oldShortage = req.shortageQty || 0;
                const remainingQty = Math.max(0, oldShortage - qty);
                const completedQty = (req.completedQty || 0) + qty;
                req.receivedQty = qty;
                req.remainingQty = remainingQty;
                req.completedQty = completedQty;
                req.lastReceiptDate = new Date().toISOString();
                
                req.receiptHistory = req.receiptHistory || [];
                req.receiptHistory.push({
                    receiptId: stableReceiptId,
                    invoiceNo: invoiceNo,
                    qty: qty,
                    receivedDate: new Date().toISOString(),
                    receivedBy: caller ? (caller.fullName || caller.name || caller.username || "System") : "System"
                });

                req.receiptProcessed = true;
                req.invoiceCreated = true;
                req.stockUpdated = true;
                req.auditLogged = true;

                if (remainingQty === 0) {
                    req.status = "Completed";
                    req.shortageQty = 0;
                    req.completedAt = new Date().toISOString();
                    req.completedBy = caller ? (caller.fullName || caller.name || caller.username || "System") : "System";
                    newShortage = 0;
                } else {
                    req.status = "Partial";
                    req.shortageQty = remainingQty;
                    newShortage = remainingQty;
                }
                reqs[reqIdx] = req;
                this.savePurchaseRequirementsRaw(reqs);
            }
        }

        // Record unified audit logs (8 logs)
        const metadata = {
            poId: poId,
            poNumber: po.poNumber,
            grnNo: grnNo,
            purchaseInvoiceNo: invoiceNo,
            materialId: material.id,
            materialName: material.name,
            receivedQty: qty,
            unit: unit,
            oldStock: oldStock,
            newStock: newStock,
            oldShortage: oldShortage,
            newShortage: newShortage,
            productionRequirementId: po.mrpId || '',
            userId: caller ? caller.principalId : 'system',
            userName: caller ? caller.name : 'System',
            timestamp: Date.now().toString(),
            grandTotal: grandTotal,
            vendorName: vName
        };
        const metadataStr = JSON.stringify(metadata);

        this.logAuditUnified('ERP', 'PURCHASE_RECEIPT_CREATED', `Created purchase receipt for PO ${po.poNumber}. Received Qty: ${qty} ${unit}`, '', '', metadataStr);
        this.logAuditUnified('ERP', 'PURCHASE_INVOICE_CREATED', `Created purchase invoice ${invoiceNo} for raw material ${material.name}`, '', '', metadataStr);
        this.logAuditUnified('ERP', 'RAW_MATERIAL_STOCK_UPDATED', `Updated stock for raw material ${material.name}. Old stock: ${oldStock}, New stock: ${newStock}`, '', '', metadataStr);
        this.logAuditUnified('ERP', 'INVENTORY_BATCH_CREATED', `Created inventory batch ${newGRN.items[0].batchNo} for material ${material.name}`, '', '', metadataStr);
        this.logAuditUnified('ERP', 'INVENTORY_TRANSACTION_CREATED', `Recorded purchase receipt transaction for material ${material.name}`, '', '', metadataStr);
        this.logAuditUnified('ERP', 'MRP_RECALCULATED', `Recalculated MRP for production requirement ${metadata.productionRequirementId}`, '', '', metadataStr);
        this.logAuditUnified('ERP', 'PRODUCTION_REQUIREMENT_UPDATED', `Updated production requirement status based on recalculated MRP`, '', '', metadataStr);
        this.logAuditUnified('ERP', 'VENDOR_LEDGER_UPDATED', `Updated vendor ledger and payable outstanding for vendor ${vName} by ${grandTotal}`, '', '', metadataStr);

        // Mark stable receipt ID as processed
        processedReceipts.push(stableReceiptId);
        localStorage.setItem('mock_processed_receipts', JSON.stringify(processedReceipts));

        // Re-run MRP recalculation for all affected production requirements
        const allProdReqs = this.getProductionRequirementsRaw();
        const products = this.getProductsRaw();
        
        const affectedProdReqs = allProdReqs.filter(pr => {
            if (pr.id === po.mrpId) {
                return true;
            }
            const product = products.find(p => p.id === pr.productId || p.vigat === pr.productName);
            if (product && product.bom) {
                return product.bom.some((bomItem: any) => bomItem.materialId === material.id || bomItem.materialId === material.name);
            }
            return false;
        });

        for (const prodReq of affectedProdReqs) {
            try {
                const updatedMRP = await this.runMRP(prodReq.id);
                const currentProdReqs = this.getProductionRequirementsRaw();
                const idx = currentProdReqs.findIndex(r => r.id === prodReq.id);
                if (idx !== -1) {
                    const currentProdReq = currentProdReqs[idx];
                    const hasShortagesRemaining = updatedMRP.requiredMaterials?.some((m: any) => m.shortageQty > 0);
                    
                    if (!hasShortagesRemaining) {
                        currentProdReq.mrpStatus = "In Stock";
                        if (currentProdReq.status === 'Pending' || currentProdReq.status === 'Material Shortage') {
                            currentProdReq.status = "Ready To Produce";
                        }
                    } else {
                        currentProdReq.mrpStatus = "Partially Available";
                        if (currentProdReq.status === 'Pending' || currentProdReq.status === 'Ready To Produce') {
                            currentProdReq.status = "Material Shortage";
                        }
                    }
                    currentProdReqs[idx] = currentProdReq;
                    this.saveProductionRequirementsRaw(currentProdReqs);
                }
            } catch (e) {
                console.error(`Failed to run MRP recalculation for production requirement ${prodReq.id}:`, e);
            }
        }
    }

    // --- Purchase Invoice History & Payment Methods ---
    private parseSafeDate(invoice: any): string {
        const candidates = [
            invoice.date,
            invoice.invoiceDate,
            invoice.createdAt,
            invoice.purchaseDate
        ];

        for (const val of candidates) {
            if (val === undefined || val === null || val === '' || val === 0 || val === '0') {
                continue;
            }

            // Check for BigInt nanoseconds
            let numVal = Number(val);
            if (typeof val === 'bigint' || (typeof val === 'string' && val.endsWith('n'))) {
                try {
                    const biVal = typeof val === 'bigint' ? val : BigInt(val.slice(0, -1));
                    numVal = Number(biVal / 1000000n);
                } catch (e) {}
            }

            if (!isNaN(numVal) && numVal > 0) {
                // Milliseconds
                if (numVal > 100000000000) {
                    const d = new Date(numVal);
                    if (d.getTime() > 0 && d.getFullYear() > 1970) {
                        return d.toISOString();
                    }
                }
                // Seconds
                if (numVal > 100000000 && numVal < 100000000000) {
                    const d = new Date(numVal * 1000);
                    if (d.getTime() > 0 && d.getFullYear() > 1970) {
                        return d.toISOString();
                    }
                }
            }

            // General string parsing
            try {
                const d = new Date(val);
                if (d.getTime() > 0 && d.getFullYear() > 1970) {
                    return d.toISOString();
                }
            } catch (e) {}
        }

        // Ultimate fallback
        return new Date().toISOString();
    }

    normalizePurchaseInvoice(invoice: any): any {
        if (!invoice) return null;
        
        const id = invoice.id ? invoice.id.toString() : '';
        const invoiceNumber = invoice.invoiceNumber || invoice.billNumber || invoice.purchaseNumber || '';
        
        const dateStr = this.parseSafeDate(invoice);
        
        const vendorName = invoice.vendorName || invoice.supplierName || '';
        const vendorMobile = invoice.vendorMobile || invoice.vendorId || '';
        const vendorGSTIN = invoice.vendorGSTIN || invoice.vendorGstNumber || '';
        
        const grandTotal = Number(invoice.grandTotal || invoice.totalAmount || 0);
        const subtotal = Number(invoice.subtotal || grandTotal - Number(invoice.gstAmount || 0));
        const gstAmount = Number(invoice.gstAmount || 0);
        
        const paidAmount = Number(invoice.paidAmount || 0);
        const remainingAmount = Math.max(0, grandTotal - paidAmount);
        
        let dueDateStr = invoice.dueDate;
        if (!dueDateStr) {
            dueDateStr = new Date(new Date(dateStr).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        } else {
            const parsedDue = new Date(dueDateStr);
            if (isNaN(parsedDue.getTime()) || parsedDue.getFullYear() <= 1970) {
                dueDateStr = new Date(new Date(dateStr).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
            } else {
                dueDateStr = parsedDue.toISOString();
            }
        }
        
        const todayStr = new Date().toISOString().split('T')[0];
        const dueStrDateOnly = dueDateStr.split('T')[0];
        
        let paymentStatus = invoice.paymentStatus || 'Unpaid';
        if (paymentStatus === 'Cancelled' || invoice.status === 'Cancelled') {
            paymentStatus = 'Cancelled';
        } else if (remainingAmount <= 0) {
            paymentStatus = 'Paid';
        } else if (paidAmount > 0 && remainingAmount > 0) {
            paymentStatus = 'Partial';
        } else if (dueStrDateOnly < todayStr && remainingAmount > 0) {
            paymentStatus = 'Overdue';
        } else {
            paymentStatus = 'Unpaid';
        }
        
        const items = invoice.items || [];
        
        return {
            id,
            invoiceNumber,
            billNumber: invoiceNumber,
            purchaseNumber: invoiceNumber,
            date: dateStr,
            invoiceDate: dateStr,
            createdAt: invoice.createdAt || dateStr,
            vendorName,
            supplierName: vendorName,
            vendorMobile,
            vendorGSTIN,
            vendorGstNumber: vendorGSTIN,
            items: items.map((itm: any) => {
                const materialId = itm.materialId || itm.rawMaterialId || itm.id || '';
                const name = itm.materialName || itm.name || itm.materialId || '';
                const quantity = Number(itm.quantity || itm.qty || 0);
                const rate = Number(itm.rate || itm.unitCost || itm.price || 0);
                const gstPercent = Number(itm.gstPercent !== undefined ? itm.gstPercent : 18);
                const gstAmount = Number(itm.gstAmount !== undefined ? itm.gstAmount : (quantity * rate * gstPercent / 100));
                const total = Number(itm.total || itm.amount || (quantity * rate) + gstAmount);
                const unit = itm.unit || 'pcs';
                return {
                    materialId,
                    name,
                    quantity,
                    rate,
                    gstPercent,
                    gstAmount,
                    total,
                    unit
                };
            }),
            subtotal,
            gstAmount,
            grandTotal,
            totalAmount: grandTotal,
            paidAmount,
            remainingAmount,
            paymentStatus,
            dueDate: dueDateStr,
            poNumber: invoice.poNumber || '',
            grnNumber: invoice.grnNumber || '',
            sourceRequirementId: invoice.sourceRequirementId || invoice.mrpId || '',
            source: invoice.source || 'Manual',
            paymentHistory: invoice.paymentHistory || []
        };
    }

    async migrateLegacyPurchaseInvoices(): Promise<void> {
        try {
            const legacyStored = localStorage.getItem('mock_purchase_invoices');
            const legacy = legacyStored ? JSON.parse(legacyStored) : [];
            if (!Array.isArray(legacy) || legacy.length === 0) return;

            const purchases = this.getPurchasesRaw();
            let updated = false;

            legacy.forEach((legInv: any) => {
                const legNum = legInv.invoiceNumber || legInv.purchaseNumber || '';
                const legId = legInv.id ? legInv.id.toString() : '';
                
                const exists = purchases.some((p: any) => {
                    const pNum = p.invoiceNumber || p.purchaseNumber || '';
                    const pId = p.id ? p.id.toString() : '';
                    return (legNum && pNum && legNum === pNum) || (legId && pId && legId === pId);
                });

                if (!exists) {
                    const normalized = this.normalizePurchaseInvoice(legInv);
                    purchases.push({
                        id: normalized.id || (purchases.reduce((max: number, item: any) => Math.max(max, parseInt(item.id) || 0), 0) + 1).toString(),
                        purchaseNumber: normalized.invoiceNumber,
                        date: new Date(normalized.date).getTime().toString(),
                        vendorName: normalized.vendorName,
                        vendorMobile: normalized.vendorId || '',
                        vendorGstNumber: '',
                        vendorAddress: '',
                        items: normalized.items.map((i: any) => ({
                            materialId: i.materialId,
                            materialName: i.name,
                            quantity: i.quantity,
                            rate: i.rate,
                            unit: 'pcs'
                        })),
                        totalAmount: normalized.grandTotal,
                        paidAmount: normalized.paidAmount,
                        remainingAmount: normalized.remainingAmount,
                        paymentStatus: normalized.paymentStatus,
                        dueDate: normalized.dueDate,
                        source: normalized.source,
                        sourceRequirementId: normalized.sourceRequirementId,
                        poNumber: normalized.poNumber,
                        grnNumber: normalized.grnNumber,
                        createdAt: normalized.createdAt,
                        updatedAt: normalized.updatedAt,
                        paymentHistory: normalized.paymentHistory
                    });
                    updated = true;
                }
            });

            if (updated) {
                this.savePurchasesRaw(purchases);
                console.log("Successfully migrated legacy purchase invoices to mock_purchases");
            }
        } catch (error) {
            console.error("Error migrating legacy purchase invoices:", error);
        }
    }

    async getPurchaseInvoices(): Promise<any[]> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Purchase', 'Finance'], 'canView', caller);
        
        await this.migrateLegacyPurchaseInvoices();
        
        const invoicesStored = localStorage.getItem('mock_purchase_invoices');
        let invoices = invoicesStored ? JSON.parse(invoicesStored) : [];
        if (!Array.isArray(invoices)) {
            invoices = [];
        }

        const purchases = this.getPurchasesRaw();
        
        let merged = [...invoices];
        purchases.forEach((p: any) => {
            const pNum = p.invoiceNumber || p.purchaseNumber || '';
            const pId = p.id ? p.id.toString() : '';
            const exists = merged.some((m: any) => {
                const mNum = m.invoiceNumber || m.purchaseNumber || '';
                const mId = m.id ? m.id.toString() : '';
                return (pNum && mNum && pNum === mNum) || (pId && mId && pId === mId);
            });
            if (!exists) {
                merged.push(p);
            }
        });

        return merged.map(p => this.normalizePurchaseInvoice(p));
    }

    async getPurchaseInvoiceById(id: string): Promise<any> {
        const caller = this.getCurrentUserRaw();
        this.checkDeptAccess(['Purchase', 'Finance'], 'canView', caller);
        
        const invoices = await this.getPurchaseInvoices();
        const invoice = invoices.find(inv => inv.id === id);
        if (!invoice) {
            throw new Error(`Purchase Invoice ${id} not found`);
        }
        return invoice;
    }

    private logPurchaseAudit(action: string, description: string) {
        const caller = this.getCurrentUserRaw();
        this.logActivity(caller.principalId, caller.name, action, description);
        this.mockLogAudit(caller.name, action, description);
    }

    async recordPurchasePayment(invoiceId: string, paymentData: any): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkAccess(['Admin', 'Manager'], caller);

        const invoicesStored = localStorage.getItem('mock_purchase_invoices');
        let invoices = invoicesStored ? JSON.parse(invoicesStored) : [];
        if (!Array.isArray(invoices)) invoices = [];
        
        const purchases = this.getPurchasesRaw();

        const idxInvoices = invoices.findIndex((p: any) => p.id === invoiceId);
        const idxPurchases = purchases.findIndex((p: any) => p.id === invoiceId);

        if (idxInvoices === -1 && idxPurchases === -1) {
            throw new Error(`Purchase Invoice ${invoiceId} not found`);
        }

        const purchase = idxInvoices !== -1 ? invoices[idxInvoices] : purchases[idxPurchases];
        if (purchase.paymentStatus === 'Cancelled') {
            throw new Error("Cannot record payment on a cancelled invoice");
        }

        const amount = Number(paymentData.amount);
        if (isNaN(amount) || amount <= 0) {
            throw new Error("Payment amount must be greater than zero");
        }

        const grandTotal = Number(purchase.totalAmount || purchase.grandTotal || 0);
        const currentPaid = Number(purchase.paidAmount || 0);
        const currentRemaining = Math.max(0, grandTotal - currentPaid);

        if (amount > currentRemaining) {
            throw new Error(`Payment amount (${amount}) cannot be greater than remaining amount (${currentRemaining})`);
        }

        const newPaidAmount = currentPaid + amount;
        if (newPaidAmount > grandTotal) {
            throw new Error("Paid amount cannot exceed grand total");
        }

        const newRemainingAmount = Math.max(0, grandTotal - newPaidAmount);

        const paymentHistory = purchase.paymentHistory || [];
        const newPayment = {
            id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: paymentData.date || new Date().toISOString(),
            amount,
            method: paymentData.method || 'Cash',
            referenceNumber: paymentData.referenceNumber || '',
            remarks: paymentData.remarks || '',
            recordedBy: caller.name
        };
        paymentHistory.push(newPayment);

        const pNum = purchase.invoiceNumber || purchase.purchaseNumber || '';

        const updateFields = (p: any) => {
            p.paidAmount = newPaidAmount;
            p.remainingAmount = newRemainingAmount;
            p.paymentHistory = paymentHistory;
            
            let paymentStatus = p.paymentStatus || 'Unpaid';
            const dateVal = p.date || p.createdAt || Date.now();
            const dueDateStr = p.dueDate || new Date(Number(dateVal) + 30 * 24 * 60 * 60 * 1000).toISOString();
            const todayStr = new Date().toISOString().split('T')[0];
            const dueStrDateOnly = dueDateStr.split('T')[0];

            if (newRemainingAmount <= 0) {
                paymentStatus = 'Paid';
            } else if (newPaidAmount > 0 && newRemainingAmount > 0) {
                paymentStatus = 'Partial';
            } else if (dueStrDateOnly < todayStr && newRemainingAmount > 0) {
                paymentStatus = 'Overdue';
            } else {
                paymentStatus = 'Unpaid';
            }
            p.paymentStatus = paymentStatus;
            p.updatedAt = new Date().toISOString();
        };

        if (idxInvoices !== -1) {
            updateFields(invoices[idxInvoices]);
            localStorage.setItem('mock_purchase_invoices', JSON.stringify(invoices));
        }

        if (idxPurchases !== -1) {
            updateFields(purchases[idxPurchases]);
            this.savePurchasesRaw(purchases);
        }

        const vendorOutstandingStored = localStorage.getItem('mock_vendor_outstanding');
        let vendorOutstandingMap = vendorOutstandingStored ? JSON.parse(vendorOutstandingStored) : {};
        vendorOutstandingMap[purchase.vendorName] = Math.max(0, (vendorOutstandingMap[purchase.vendorName] || 0) - amount);
        localStorage.setItem('mock_vendor_outstanding', JSON.stringify(vendorOutstandingMap));

        const vendorLedgerStored = localStorage.getItem('mock_vendor_ledger');
        let vendorLedger = vendorLedgerStored ? JSON.parse(vendorLedgerStored) : [];
        const newLedgerEntry = {
            id: `VL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: paymentData.date || new Date().toISOString(),
            vendorName: purchase.vendorName,
            invoiceNo: pNum,
            debit: "Vendor Payable",
            credit: "Cash / Bank",
            amount,
            description: `Payment for Invoice ${pNum} recorded via ${paymentData.method}`
        };
        vendorLedger.push(newLedgerEntry);
        localStorage.setItem('mock_vendor_ledger', JSON.stringify(vendorLedger));

        this.logPurchaseAudit("PURCHASE_PAYMENT_RECORDED", `Recorded payment of ₹${amount} for purchase invoice ${pNum}`);
    }

    async cancelPurchaseInvoice(invoiceId: string): Promise<void> {
        const caller = this.getCurrentUserRaw();
        this.checkAccess(['Admin'], caller);

        const invoicesStored = localStorage.getItem('mock_purchase_invoices');
        let invoices = invoicesStored ? JSON.parse(invoicesStored) : [];
        if (!Array.isArray(invoices)) invoices = [];

        const purchases = this.getPurchasesRaw();

        const idxInvoices = invoices.findIndex((p: any) => p.id === invoiceId);
        const idxPurchases = purchases.findIndex((p: any) => p.id === invoiceId);

        if (idxInvoices === -1 && idxPurchases === -1) {
            throw new Error(`Purchase Invoice ${invoiceId} not found`);
        }

        const purchase = idxInvoices !== -1 ? invoices[idxInvoices] : purchases[idxPurchases];
        if (purchase.paymentStatus === 'Cancelled') {
            return;
        }

        const remainingAmount = Number(purchase.remainingAmount ?? (Number(purchase.totalAmount || 0) - Number(purchase.paidAmount || 0)));
        const pNum = purchase.invoiceNumber || purchase.purchaseNumber || '';

        const updateFields = (p: any) => {
            p.paymentStatus = 'Cancelled';
            p.remainingAmount = 0;
            p.updatedAt = new Date().toISOString();
        };

        if (idxInvoices !== -1) {
            updateFields(invoices[idxInvoices]);
            localStorage.setItem('mock_purchase_invoices', JSON.stringify(invoices));
        }

        if (idxPurchases !== -1) {
            updateFields(purchases[idxPurchases]);
            this.savePurchasesRaw(purchases);
        }

        if (remainingAmount > 0) {
            const vendorOutstandingStored = localStorage.getItem('mock_vendor_outstanding');
            let vendorOutstandingMap = vendorOutstandingStored ? JSON.parse(vendorOutstandingStored) : {};
            vendorOutstandingMap[purchase.vendorName] = Math.max(0, (vendorOutstandingMap[purchase.vendorName] || 0) - remainingAmount);
            localStorage.setItem('mock_vendor_outstanding', JSON.stringify(vendorOutstandingMap));
        }

        const vendorLedgerStored = localStorage.getItem('mock_vendor_ledger');
        let vendorLedger = vendorLedgerStored ? JSON.parse(vendorLedgerStored) : [];
        const cancelLedgerEntry = {
            id: `VL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: new Date().toISOString(),
            vendorName: purchase.vendorName,
            invoiceNo: pNum,
            debit: "Vendor Payable",
            credit: "Raw Material Inventory",
            amount: remainingAmount,
            description: `Purchase Invoice ${pNum} cancelled`
        };
        vendorLedger.push(cancelLedgerEntry);
        localStorage.setItem('mock_vendor_ledger', JSON.stringify(vendorLedger));

        this.logPurchaseAudit("PURCHASE_INVOICE_CANCELLED", `Cancelled purchase invoice ${pNum}`);
    }

    async logPurchaseInvoiceViewed(invoiceNumber: string): Promise<void> {
        this.logPurchaseAudit("PURCHASE_INVOICE_VIEWED", `Viewed purchase invoice ${invoiceNumber}`);
    }

    async logPurchaseInvoicePrinted(invoiceNumber: string): Promise<void> {
        this.logPurchaseAudit("PURCHASE_INVOICE_PRINTED", `Printed purchase invoice ${invoiceNumber}`);
    }

    async logPurchaseInvoicePdfDownloaded(invoiceNumber: string): Promise<void> {
        this.logPurchaseAudit("PURCHASE_INVOICE_PDF_DOWNLOADED", `Downloaded PDF for purchase invoice ${invoiceNumber}`);
    }
}
