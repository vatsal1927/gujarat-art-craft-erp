import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Settings {
    businessInfo: BusinessInfo;
    termsAndConditions: string;
    defaultGstRate: number;
    allowStaffCollection: boolean;
    enableRejectedWage: boolean;
    companyLogo?: string;
    companyName?: string;
    themeColors?: string;
    sidebarStyle?: string;
    allowAdminBackupRestore?: boolean;
    enableAutoStockAlerts?: boolean;
    alertFrequency?: string;
    lowStockAlertThreshold?: number;
}

export interface ConsumptionLog {
    id: bigint;
    date: bigint;
    productName: string;
    batchNo: string;
    rawMaterialName: string;
    quantityUsed: number;
    unit: string;
    cost: number;
    employee: string;
    jobWorkNo: string;
    remarks: string;
}

export interface FinishedGoodsLog {
    id: bigint;
    date: bigint;
    productName: string;
    quantity: number;
    logType: string;
    reason: string;
    userName: string;
}
export type Time = bigint;
export type BusinessInfo = string;

export type Role = { Admin: null } | { Manager: null } | { Staff: null };

export type Department =
  | { Sales: null }
  | { Purchase: null }
  | { Inventory: null }
  | { Production: null }
  | { Finance: null }
  | { Staff: null }
  | { AdminSettings: null };

export interface Permissions {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canExport: boolean;
    canPrint: boolean;
    canManageStaff: boolean;
    canViewLogs: boolean;
    canBackupRestore: boolean;
    canAdjustStock: boolean;
    canAccessFinance: boolean;
    canAccessReports: boolean;
    "whatsapp.viewStatus"?: boolean;
    "whatsapp.sendInvoice"?: boolean;
    "whatsapp.resendInvoice"?: boolean;
    "whatsapp.viewLogs"?: boolean;
    "whatsapp.manageSettings"?: boolean;
    "whatsapp.manageAutomation"?: boolean;
}

export type IdentityProviderType =
  | { InternetIdentity: null }
  | { Future: string };

export interface LinkedIdentity {
    providerType: IdentityProviderType;
    providerId: string;
    linkedAt: Time;
}

export interface User {
    principalId: Principal;
    name: string;
    username: string;
    role: Role;
    createdAt: Time;
    email?: string;
    mobile?: string;
    address?: string;
    profilePhoto?: string;
    status?: string;
    lastLogin?: string;
    passwordHash?: string;
    needsPasswordChange?: boolean;
    department?: Department;
    permissions?: Permissions;
    linkedIdentities?: LinkedIdentity[];
}

export interface ActivityLog {
    id: bigint;
    timestamp: Time;
    userPrincipal: string;
    userName: string;
    action: string;
    details: string;
    operator?: string;
    operatorRole?: string;
    module?: string;
    targetUser?: string;
    targetRole?: string;
}

export interface BOMRequirement {
    materialId: string;
    quantity: number;
    qtyPerUnit?: number;
    unitConfig?: {
        label: string;
        type: string;
        symbol: string;
        conversionToBase?: number | null;
    };
    legacyUnit?: string;
    qtyPerUnitBase?: number;
    schemaVersion?: number;
}
export interface ProductItem {
    id: string;
    vigat: string;
    rate: number;
    hsnCode: string;
    stock: bigint;
    productionCost: number;
    bom: Array<BOMRequirement>;
    photoUrl?: string;
    openingStock?: bigint;
    reservedStock?: bigint;
    availableToSell?: bigint;
}
export interface CustomerItem {
    id: string;
    name: string;
    businessAddress: string;
    phone: string;
    gstNo: string;
}
export interface Payment {
    id: bigint;
    customerId: string;
    invoiceNumber: string;
    amount: number;
    date: Time;
    notes: string;
}
export interface RawMaterial {
    id: string;
    name: string;
    category: string;
    openingStock: number;
    purchasedQty: number;
    consumedQty: number;
    currentStock: number;
    unitCost: number;
    unit: string;
    minStockAlert: number;
    photoUrl?: string;
    reorderLevel?: number;
    minimumStock?: number;
    preferredVendor?: string;
    preferredVendors?: Array<{
        vendorId: string;
        vendorName: string;
        lastRate?: number;
        leadTime?: number;
    }>;
    costingMethod?: string;
    lastPurchaseDate?: string;
    lastPurchaseRate?: number;
}
export interface PurchaseItem {
    materialId: string;
    quantity: number;
    unit: string;
    rate: number;
    gstPercent: number;
    amount: number;
}
export interface Purchase {
    id: bigint;
    purchaseNumber: string;
    date: Time;
    vendorName: string;
    vendorMobile: string;
    vendorGstNumber: string;
    vendorAddress: string;
    items: Array<PurchaseItem>;
    totalAmount: number;
    paidAmount: number;
}
export interface Expense {
    id: bigint;
    date: Time;
    category: string;
    amount: number;
    description: string;
}
export interface VendorPayment {
    id: bigint;
    vendorName: string;
    purchaseNumber: string;
    amount: number;
    date: Time;
    notes: string;
}
export interface MaterialConsumptionEntry {
    id: bigint;
    date: Time;
    finishedGoodId: string;
    finishedGoodName: string;
    invoiceNumber: string;
    materialId: string;
    materialName: string;
    quantityConsumed: number;
}
export interface Invoice {
    id: bigint;
    customerInfo: CustomerInfo;
    date: Time;
    businessInfo: BusinessInfo;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    products: Array<Product>;
    creatorPrincipal: string;
    creatorName: string;
    previousBalanceAtCreation?: number;
    advanceBalanceAtCreation?: number;
    currentInvoiceTotalAtCreation?: number;
    totalPayableAtCreation?: number;
    paidAmountAtCreation?: number;
    finalDueAtCreation?: number;
}
export interface CustomerInfo {
    taxId: string;
    name: string;
    businessAddress: string;
}
export interface DashboardStats {
    allTimeTotalSales: number;
    todayTotalSales: number;
    todayInvoiceCount: bigint;
    allTimeInvoiceCount: bigint;
    totalOutstandingAmount: number;
    customersWithOutstanding: bigint;
    overdueInvoiceCount: bigint;
    todayCollections: number;
    totalPurchases: number;
    totalProfit: number;
    totalGst: number;
    vendorDue: number;
    stockValue: number;
}
export type Product = [string, bigint, bigint];

export interface CustomerOrderLink {
    customerName: string;
    orderNumber: string;
}
export interface Employee {
    id: string;
    name: string;
    mobile: string;
    address: string;
    joiningDate: Time;
    skillType: string;
    status: string;
}
export interface JobWork {
    id: bigint;
    jobDate: Time;
    employeeName: string;
    mobileNumber: string;
    productName: string;
    productCode: string;
    hsnCode: string;
    qtyGiven: number;
    ratePerPiece: number;
    expectedReturnDate: Time;
    remarks: string;
    status: string;
    collectedQty: number;
    rejectedQty: number;
    acceptedQty: number;
    customerOrderLink: CustomerOrderLink | null;
    lastUpdated?: Time;
    completedQty: number;
    totalCollectedQty?: number;
    totalRejectedQty?: number;
    totalAcceptedQty?: number;
    createdByUserId?: string | null;
    createdByUsername?: string | null;
    createdByFullName?: string | null;
    createdByRole?: string | null;
    updatedByUserId?: string | null;
    updatedByUsername?: string | null;
    updatedByFullName?: string | null;
    updatedByRole?: string | null;
    lastAction?: string | null;
}
export interface DailyWorkUpdate {
    id: bigint;
    date: Time;
    jobId: bigint;
    completedQty: number;
    remarks: string;
}
export interface JobCollection {
    id: bigint;
    collectionDate: Time;
    jobId: bigint;
    collectedQty: number;
    rejectedQty: number;
    acceptedQty: number;
}
export interface KarigarCollection {
    id: bigint;
    collectionDate: Time;
    jobWorkNo: bigint;
    karigarName: string;
    productName: string;
    qtyGiven: number;
    prevCollectedQty: number;
    pendingQty: number;
    todayCollectedQty: number;
    rejectedQty: number;
    acceptedQty: number;
    remarks: string;
    stockUpdated?: boolean;
    stockMovementId?: string;
    previousStock?: number;
    newStock?: number;
    collectionId?: string;
    oldAcceptedQty?: number;
    createdBy?: string;
    createdById?: string;
    createdAt?: string;
    inspectedBy?: string;
    inspectedById?: string;
    inspectedAt?: string;
}
export interface StockMovement {
    id: bigint;
    date: Time;
    productName: string;
    productCode?: string;
    movementType: string;
    qtyAdded: number;
    relatedJobWorkNo: bigint;
    relatedCollectionNo: bigint;
    userName: string;
    workerName?: string;
    collectedQty?: number;
    rejectedQty?: number;
    acceptedQty?: number;
    previousStock?: number;
    adjustmentQty?: number;
    newStock?: number;
    collectionId?: string;
    jobWorkId?: string;
    productId?: string;
    createdBy?: string;
    reversed?: boolean;
}
export interface AuditLog {
    id: bigint;
    timestamp: Time;
    user: string;
    action: string;
    description: string;
    jobWorkNo?: string;
    collectionNo?: string;
    product?: string;
    employee?: string;
    details?: string;
    operator?: string;
    operatorRole?: string;
    module?: string;
    targetUser?: string;
    targetRole?: string;
}
export interface EmployeeLedgerEntry {
    id: bigint;
    employeeName: string;
    jobWorkNo: bigint;
    date: Time;
    productName: string;
    qtyGiven: number;
    acceptedQty: number;
    rejectedQty: number;
    pendingQty: number;
    rate: number;
    totalWage: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
    collectionId?: string;
    jobWorkId?: string;
    employeeId?: string;
    source?: string;
    reversed?: boolean;
}
export interface EmployeePayment {
    id: bigint;
    paymentDate: Time;
    employeeName: string;
    amountPaid: number;
    paymentMode: string;
    remarks: string;
}
export interface EmployeeDashboardStats {
    totalEmployees: bigint;
    activeJobs: bigint;
    completedJobs: bigint;
    pendingJobs: bigint;
    totalWagesDue: number;
    todayProduction: number;
    totalPendingQty: number;
    todayCollectedQty: number;
    totalRejectedQty: number;
    finishedGoodsStockValue: number;
}

export interface DatabaseBackup {
    invoices: Array<Invoice>;
    lastInvoiceId: bigint;
    settings: Settings | null;
    users: Array<User>;
    userCount: bigint;
    activityLogs: Array<ActivityLog>;
    lastLogId: bigint;
    productsList: Array<ProductItem>;
    productCount: bigint;
    customersList: Array<CustomerItem>;
    customerCount: bigint;
    paymentsList: Array<Payment>;
    lastPaymentId: bigint;
    rawMaterialsList: Array<RawMaterial>;
    purchasesList: Array<Purchase>;
    expensesList: Array<Expense>;
    vendorPaymentsList: Array<VendorPayment>;
    consumptionHistory: Array<MaterialConsumptionEntry>;
    lastPurchaseId: bigint;
    lastExpenseId: bigint;
    lastVendorPaymentId: bigint;
    lastConsumptionId: bigint;
    employeesList: Array<Employee>;
    jobWorksList: Array<JobWork>;
    dailyWorkUpdatesList: Array<DailyWorkUpdate>;
    jobCollectionsList: Array<JobCollection>;
    employeePaymentsList: Array<EmployeePayment>;
    collectionsList: Array<KarigarCollection>;
    stockMovementsList: Array<StockMovement>;
    auditLogsList: Array<AuditLog>;
    employeeLedgersList: Array<EmployeeLedgerEntry>;
    consumptionLogsList: Array<ConsumptionLog>;
    lastConsumptionLogId: bigint;
    finishedGoodsLogsList: Array<FinishedGoodsLog>;
    lastFinishedGoodsLogId: bigint;
    employeeCount: bigint;
    lastJobWorkId: bigint;
    lastDailyWorkUpdateId: bigint;
    lastJobCollectionId: bigint;
    lastEmployeePaymentId: bigint;
    lastCollectionId: bigint;
    lastStockMovementId: bigint;
    lastAuditLogId: bigint;
    lastEmployeeLedgerId: bigint;
}

export interface backendInterface {
    deleteInvoice(id: bigint): Promise<void>;
    getDashboardStats(): Promise<DashboardStats>;
    getInvoiceById(id: bigint): Promise<Invoice>;
    getNextInvoiceNumber(): Promise<string>;
    getInvoices(): Promise<Array<Invoice>>;
    getSettings(): Promise<Settings>;
    saveInvoice(businessInfo: BusinessInfo, customerInfo: CustomerInfo, products: Array<Product>, totalAmount: number, paidAmount: number): Promise<string>;
    saveSettings(businessInfo: BusinessInfo, defaultGstRate: number, termsAndConditions: string, allowStaffCollection: boolean, enableRejectedWage: boolean, companyLogo?: string, companyName?: string, themeColors?: string, sidebarStyle?: string, allowAdminBackupRestore?: boolean, enableAutoStockAlerts?: boolean, alertFrequency?: string, lowStockAlertThreshold?: number): Promise<void>;
    updateInvoice(id: bigint, businessInfo: BusinessInfo, customerInfo: CustomerInfo, products: Array<Product>, totalAmount: number, paidAmount: number): Promise<void>;
    registerOrGetSelf(): Promise<User | null>;
    createUser(principalText: string, name: string, username: string, roleText: string, email?: string, mobile?: string, address?: string, profilePhoto?: string, status?: string, passwordHash?: string, departmentText?: string, permissionsObj?: Permissions): Promise<string>;
    editUser(principalText: string, name: string, username: string, email: string, mobile: string, roleText: string, status: string, departmentText?: string, permissionsObj?: Permissions): Promise<void>;
    deleteUser(principalText: string): Promise<void>;
    getUsers(): Promise<Array<User>>;
    getActivityLogs(): Promise<Array<ActivityLog>>;
    logUserAction(action: string, details: string): Promise<void>;
    updateProfile(email: string, name: string, mobile: string, address: string, profilePhoto: string): Promise<void>;
    changePassword(newPassword: string, newPrincipalId: string): Promise<void>;
    toggleUserStatus(principalText: string, status: string): Promise<void>;
    adminResetPassword(principalText: string, newPrincipalId: string, newPasswordHash?: string): Promise<void>;
    linkIdentityToUser(targetPrincipalText: string, providerTypeVariant: IdentityProviderType, providerId: string): Promise<string>;
    unlinkIdentityFromUser(targetPrincipalText: string, providerId: string): Promise<string>;
    getProducts(): Promise<Array<ProductItem>>;
    saveProduct(id: string, vigat: string, rate: number, hsnCode: string, stock: bigint, productionCost: number, bom: Array<BOMRequirement>): Promise<void>;
    deleteProduct(id: string): Promise<void>;
    getCustomers(): Promise<Array<CustomerItem>>;
    saveCustomer(id: string, name: string, businessAddress: string, phone: string, gstNo: string): Promise<void>;
    deleteCustomer(id: string): Promise<void>;
    collectPayment(customerId: string, amount: number, notes: string): Promise<void>;
    getPayments(): Promise<Array<Payment>>;
    getPaymentsByCustomer(customerId: string): Promise<Array<Payment>>;
    getRawMaterials(): Promise<Array<RawMaterial>>;
    saveRawMaterial(id: string, name: string, category: string, openingStock: number, unitCost: number, unit: string, minStock: number, reorderLevel?: number, minimumStock?: number, preferredVendor?: string): Promise<void>;
    deleteRawMaterial(id: string): Promise<void>;
    getPurchases(): Promise<Array<Purchase>>;
    savePurchase(purchaseNumber: string, vendorName: string, vendorMobile: string, vendorGstNumber: string, vendorAddress: string, items: Array<PurchaseItem>, totalAmount: number, paidAmount: number): Promise<string>;
    deletePurchase(id: bigint): Promise<void>;
    saveExpense(category: string, amount: number, description: string): Promise<bigint>;
    getExpenses(): Promise<Array<Expense>>;
    deleteExpense(id: bigint): Promise<void>;
    collectVendorPayment(vendorName: string, amount: number, notes: string): Promise<void>;
    getVendorPayments(): Promise<Array<VendorPayment>>;
    getMaterialConsumptionHistory(): Promise<Array<MaterialConsumptionEntry>>;

    getEmployees(): Promise<Array<Employee>>;
    saveEmployee(id: string, name: string, mobile: string, address: string, joiningDate: Time, skillType: string, status: string): Promise<string>;
    deleteEmployee(id: string): Promise<void>;
    getJobWorks(): Promise<Array<JobWork>>;
    saveJobWork(jobDate: Time, employeeName: string, mobileNumber: string, productName: string, productCode: string, hsnCode: string, qtyGiven: number, ratePerPiece: number, expectedReturnDate: Time, remarks: string, customerOrderLink: CustomerOrderLink | null): Promise<bigint>;
    updateJobWorkProgress(jobId: bigint, completedQty: number, remarks: string): Promise<void>;
    saveCollectionEntry(jobWorkNo: bigint, todayCollectedQty: number, rejectedQty: number, remarks: string): Promise<bigint>;
    editCollectionEntry(collectionId: bigint, todayCollectedQty: number, rejectedQty: number, remarks: string): Promise<void>;
    deleteCollectionEntry(collectionId: bigint): Promise<void>;
    getCollections(): Promise<Array<KarigarCollection>>;
    getStockMovementHistory(): Promise<Array<StockMovement>>;
    getSystemAuditLogs(): Promise<Array<AuditLog>>;
    getKarigarLedger(employeeName: string): Promise<Array<EmployeeLedgerEntry>>;
    getEmployeePayments(): Promise<Array<EmployeePayment>>;
    saveEmployeePayment(karigarName: string, paymentAmount: number, paymentMode: string, note: string): Promise<bigint>;
    editEmployeePayment(paymentId: bigint, paymentAmount: number, paymentMode: string, note: string): Promise<void>;
    deleteEmployeePayment(paymentId: bigint): Promise<void>;
    getEmployeeDashboardStats(): Promise<EmployeeDashboardStats>;
    getConsumptionLogs(): Promise<Array<ConsumptionLog>>;
    saveConsumptionLog(productName: string, batchNo: string, rawMaterialName: string, quantityUsed: number, unit: string, cost: number, employee: string, jobWorkNo: string, remarks: string): Promise<bigint>;
    getFinishedGoodsLogs(): Promise<Array<FinishedGoodsLog>>;
    saveFinishedGoodsLog(productName: string, quantity: number, logType: string, reason: string): Promise<bigint>;
    resetPasswordWithVerification(username: string, email: string, mobile: string, newPasswordHash: string, newPrincipalId: string): Promise<{ success: boolean; message: string }>;
    verifyMasterAdminIntegrity(): Promise<{ isValid: boolean; message: string }>;
    exportDatabase(): Promise<DatabaseBackup>;
    importDatabase(backup: DatabaseBackup): Promise<void>;
    sendWhatsAppInvoice(invoiceId: bigint, isResend: boolean): Promise<{ success: boolean; message: string }>;
    getWhatsAppLogs(): Promise<Array<any>>;
    getWhatsAppStatusForInvoice(invoiceId: bigint): Promise<{ sent: boolean; sentCount: number; lastSent?: number }>;
    getWhatsAppSettings(): Promise<any>;
    saveWhatsAppSettings(phoneNumberId: string, accessToken: string, templateName: string, automationEnabled: boolean): Promise<void>;
    runConsistencyAuditAndRepair(): Promise<Array<string>>;
    getStockAlerts(): Promise<Array<any>>;
    resolveStockAlert(id: string): Promise<void>;
    logWhatsAppStockAlertOpened(productId: string, productName: string, shortageQty: number, phoneNumberMasked?: string, source?: string): Promise<void>;
    getSalesOrders(): Promise<Array<SalesOrder>>;
    saveSalesOrder(order: SalesOrder): Promise<void>;
    deleteSalesOrder(id: string): Promise<void>;
    getProductionRequirements(): Promise<Array<ProductionRequirement>>;
    saveProductionRequirement(req: ProductionRequirement): Promise<void>;
    deleteProductionRequirement(id: string): Promise<void>;
    getPurchaseRequirements(): Promise<Array<PurchaseRequirement>>;
    savePurchaseRequirement(req: PurchaseRequirement): Promise<void>;
    deletePurchaseRequirement(id: string): Promise<void>;
    getMRPRecords(): Promise<Array<MRPRecord>>;
    saveMRPRecord(record: MRPRecord): Promise<void>;
    runMRP(requirementId: string): Promise<MRPRecord>;
    reserveStockForOrder(orderId: string): Promise<void>;
    completeProductionPlan(requirementId: string, completedQty: number): Promise<void>;
    receivePurchaseRequirement(requirementId: string, qty: number): Promise<void>;
    getPurchaseOrders(): Promise<Array<PurchaseOrder>>;
    savePurchaseOrder(po: PurchaseOrder): Promise<void>;
    deletePurchaseOrder(id: string): Promise<void>;
    getGRNs(): Promise<Array<GRN>>;
    saveGRN(grn: GRN): Promise<void>;
    receivePOItem(poId: string, qty: number, invoiceNo: string, expiryDate?: string, remarks?: string): Promise<void>;
    getPurchaseInvoices(): Promise<Array<any>>;
    getPurchaseInvoiceById(id: string): Promise<any>;
    recordPurchasePayment(invoiceId: string, paymentData: any): Promise<void>;
    cancelPurchaseInvoice(invoiceId: string): Promise<void>;
    normalizePurchaseInvoice(invoice: any): any;
    migrateLegacyPurchaseInvoices(): Promise<void>;
}

export interface SalesOrderItem {
    productId: string;
    productName: string;
    sku: string;
    qty: number;
    rate: number;
    amount: number;
    reservedQty: number;
    availableStock: number;
    needProductionQty: number;
}

export interface SalesOrder {
    id: string;
    orderNo: string;
    customerId: string;
    customerName: string;
    orderDate: string;
    deliveryDate: string;
    items: SalesOrderItem[];
    subtotal: number;
    gst: number;
    grandTotal: number;
    paymentStatus: string;
    status: string;
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
}

export interface StockReservation {
    id: string;
    salesOrderId: string;
    productId: string;
    productName: string;
    reservedQty: number;
    createdAt: string;
}

export interface ProductionRequirement {
    id: string;
    salesOrderId: string;
    productId: string;
    productName: string;
    requiredQty: number;
    plannedQty: number;
    completedQty: number;
    status: string;
    priority: string;
    expectedDate: string;
    createdAt: string;
}

export interface MRPMaterialRequirement {
    materialId: string;
    materialName: string;
    requiredQty: number;
    availableQty: number;
    shortageQty: number;
}

export interface MRPRecord {
    id: string;
    productionRequirementId: string;
    productId: string;
    productName: string;
    requiredMaterials: MRPMaterialRequirement[];
    status: string;
    createdAt: string;
}

export interface PurchaseRequirement {
    id: string;
    mrpId: string;
    materialId: string;
    materialName: string;
    requiredQty: number;
    availableQty: number;
    shortageQty: number;
    vendorId: string;
    status: string;
    createdAt: string;
    receivedQty?: number;
    remainingQty?: number;
    completedQty?: number;
    lastReceiptDate?: string;
    receiptHistory?: Array<{
        receiptId: string;
        invoiceNo: string;
        qty: number;
        receivedDate: string;
        receivedBy: string;
    }>;
    completedAt?: string;
    completedBy?: string;
    receiptProcessed?: boolean;
    invoiceCreated?: boolean;
    stockUpdated?: boolean;
    auditLogged?: boolean;
}

export interface PurchaseOrder {
    id: string;
    poNumber: string;
    mrpId?: string;
    materialId: string;
    materialName: string;
    requiredQty: number;
    orderedQty: number;
    unit: string;
    rate: number;
    gstPercent: number;
    totalAmount: number;
    vendorId: string;
    status: "Draft" | "Sent" | "Approved" | "Partial" | "Completed" | "Cancelled";
    createdAt: string;
    approvedAt?: string;
    approvedBy?: string;
    purchaseRequirementId?: string;
    receiptHistory?: Array<{
        receiptId: string;
        grnNo: string;
        invoiceNo: string;
        qty: number;
        receivedDate: string;
        receivedBy: string;
    }>;
}

export interface GRN {
    grnNo: string;
    poNumber: string;
    invoiceNo?: string;
    receivedDate: string;
    vendorId: string;
    receivedBy: string;
    items: Array<{
        materialId: string;
        materialName: string;
        quantity: number;
        unit: string;
        batchNo?: string;
        expiryDate?: string;
    }>;
    status: "Received" | "Inspected" | "Returned";
    remarks?: string;
}
