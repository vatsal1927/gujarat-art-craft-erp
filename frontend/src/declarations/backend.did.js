/* eslint-disable */
// @ts-nocheck

import { IDL } from '@icp-sdk/core/candid';

export const idlFactory = ({ IDL }) => {
  const Role = IDL.Variant({
    'Admin': IDL.Null,
    'Manager': IDL.Null,
    'Staff': IDL.Null
  });
  const Department = IDL.Variant({
    'Sales': IDL.Null,
    'Purchase': IDL.Null,
    'Inventory': IDL.Null,
    'Production': IDL.Null,
    'Finance': IDL.Null,
    'Staff': IDL.Null,
    'AdminSettings': IDL.Null
  });
  const Permissions = IDL.Record({
    'canView': IDL.Bool,
    'canCreate': IDL.Bool,
    'canEdit': IDL.Bool,
    'canDelete': IDL.Bool,
    'canApprove': IDL.Bool,
    'canExport': IDL.Bool,
    'canPrint': IDL.Bool,
    'canManageStaff': IDL.Bool,
    'canViewLogs': IDL.Bool,
    'canBackupRestore': IDL.Bool,
    'canAdjustStock': IDL.Bool,
    'canAccessFinance': IDL.Bool,
    'canAccessReports': IDL.Bool
  });
  const Time = IDL.Int;
  const LinkedIdentity = IDL.Record({
    'providerType': IDL.Variant({ 'InternetIdentity': IDL.Null, 'Future': IDL.Text }),
    'providerId': IDL.Text,
    'linkedAt': Time
  });
  const User = IDL.Record({
    'principalId': IDL.Principal,
    'name': IDL.Text,
    'username': IDL.Text,
    'role': Role,
    'createdAt': Time,
    'email': IDL.Opt(IDL.Text),
    'mobile': IDL.Opt(IDL.Text),
    'address': IDL.Opt(IDL.Text),
    'profilePhoto': IDL.Opt(IDL.Text),
    'status': IDL.Opt(IDL.Text),
    'lastLogin': IDL.Opt(IDL.Text),
    'passwordHash': IDL.Opt(IDL.Text),
    'needsPasswordChange': IDL.Opt(IDL.Bool),
    'department': IDL.Opt(Department),
    'permissions': IDL.Opt(Permissions),
    'linkedIdentities': IDL.Opt(IDL.Vec(LinkedIdentity))
  });
  const DashboardStats = IDL.Record({
    'allTimeTotalSales' : IDL.Float64,
    'todayTotalSales' : IDL.Float64,
    'todayInvoiceCount' : IDL.Nat,
    'allTimeInvoiceCount' : IDL.Nat,
    'totalOutstandingAmount' : IDL.Opt(IDL.Float64),
    'stockValue' : IDL.Opt(IDL.Float64),
  });
  const CustomerInfo = IDL.Record({
    'taxId' : IDL.Text,
    'name' : IDL.Text,
    'businessAddress' : IDL.Text,
  });
  const BusinessInfo = IDL.Text;
  const Product = IDL.Tuple(IDL.Text, IDL.Nat, IDL.Int);
  const Invoice = IDL.Record({
    'id' : IDL.Nat,
    'invoiceNumber' : IDL.Text,
    'date' : Time,
    'businessInfo' : BusinessInfo,
    'customerInfo' : CustomerInfo,
    'products' : IDL.Vec(Product),
    'totalAmount' : IDL.Float64,
    'paidAmount' : IDL.Float64,
    'creatorPrincipal' : IDL.Opt(IDL.Text),
    'creatorName' : IDL.Opt(IDL.Text),
    'previousBalanceAtCreation' : IDL.Opt(IDL.Float64),
    'advanceBalanceAtCreation' : IDL.Opt(IDL.Float64),
    'currentInvoiceTotalAtCreation' : IDL.Opt(IDL.Float64),
    'totalPayableAtCreation' : IDL.Opt(IDL.Float64),
    'paidAmountAtCreation' : IDL.Opt(IDL.Float64),
    'finalDueAtCreation' : IDL.Opt(IDL.Float64),
  });
  const Settings = IDL.Record({
    'businessInfo' : BusinessInfo,
    'termsAndConditions' : IDL.Text,
    'defaultGstRate' : IDL.Float64,
  });
  const CustomerItem = IDL.Record({
    'id' : IDL.Text,
    'name' : IDL.Text,
    'businessAddress' : IDL.Text,
    'phone' : IDL.Text,
    'gstNo' : IDL.Text,
  });
  const UnitConfig = IDL.Record({
    'unitLabel' : IDL.Text,
    'unitType' : IDL.Text,
    'symbol' : IDL.Text,
    'conversionToBase' : IDL.Opt(IDL.Float64),
  });
  const BOMRequirement = IDL.Record({
    'materialId' : IDL.Text,
    'quantity' : IDL.Float64,
    'qtyPerUnit' : IDL.Opt(IDL.Float64),
    'unitConfig' : IDL.Opt(UnitConfig),
    'legacyUnit' : IDL.Opt(IDL.Text),
    'qtyPerUnitBase' : IDL.Opt(IDL.Float64),
    'schemaVersion' : IDL.Opt(IDL.Int),
  });
  const ProductItem = IDL.Record({
    'id' : IDL.Text,
    'vigat' : IDL.Text,
    'rate' : IDL.Float64,
    'hsnCode' : IDL.Text,
    'stock' : IDL.Int,
    'productionCost' : IDL.Float64,
    'bom' : IDL.Vec(BOMRequirement),
    'openingStock' : IDL.Opt(IDL.Int),
    'reservedStock' : IDL.Opt(IDL.Int),
    'availableToSell' : IDL.Opt(IDL.Int),
  });
  const RawMaterial = IDL.Record({
    'id' : IDL.Text,
    'name' : IDL.Text,
    'category' : IDL.Text,
    'openingStock' : IDL.Float64,
    'purchasedQty' : IDL.Float64,
    'consumedQty' : IDL.Float64,
    'currentStock' : IDL.Float64,
    'unitCost' : IDL.Float64,
    'unit' : IDL.Text,
    'minStockAlert' : IDL.Float64,
    'reorderLevel' : IDL.Opt(IDL.Float64),
    'minimumStock' : IDL.Opt(IDL.Float64),
    'preferredVendor' : IDL.Opt(IDL.Text),
  });
  const MaterialConsumptionEntry = IDL.Record({
    'id' : IDL.Nat,
    'date' : Time,
    'finishedGoodId' : IDL.Text,
    'finishedGoodName' : IDL.Text,
    'invoiceNumber' : IDL.Text,
    'materialId' : IDL.Text,
    'materialName' : IDL.Text,
    'quantityConsumed' : IDL.Float64,
  });
  const StockMovement = IDL.Record({
    'id' : IDL.Nat,
    'date' : Time,
    'productName' : IDL.Text,
    'productCode' : IDL.Opt(IDL.Text),
    'movementType' : IDL.Text,
    'qtyAdded' : IDL.Float64,
    'relatedJobWorkNo' : IDL.Nat,
    'relatedCollectionNo' : IDL.Nat,
    'userName' : IDL.Text,
    'workerName' : IDL.Opt(IDL.Text),
    'collectedQty' : IDL.Opt(IDL.Float64),
    'rejectedQty' : IDL.Opt(IDL.Float64),
    'acceptedQty' : IDL.Opt(IDL.Float64),
    'previousStock' : IDL.Opt(IDL.Float64),
    'newStock' : IDL.Opt(IDL.Float64),
    'reversed' : IDL.Opt(IDL.Bool),
    'adjustmentQty' : IDL.Opt(IDL.Float64),
    'collectionId' : IDL.Opt(IDL.Text),
    'jobWorkId' : IDL.Opt(IDL.Text),
    'productId' : IDL.Opt(IDL.Text),
    'createdBy' : IDL.Opt(IDL.Text),
  });
  const AuditLog = IDL.Record({
    'id' : IDL.Nat,
    'timestamp' : Time,
    'user' : IDL.Text,
    'action' : IDL.Text,
    'description' : IDL.Text,
    'jobWorkNo' : IDL.Opt(IDL.Text),
    'collectionNo' : IDL.Opt(IDL.Text),
    'product' : IDL.Opt(IDL.Text),
    'employee' : IDL.Opt(IDL.Text),
    'details' : IDL.Opt(IDL.Text),
  });
  const PurchaseItem = IDL.Record({
    'materialId' : IDL.Text,
    'quantity' : IDL.Float64,
    'unit' : IDL.Text,
    'rate' : IDL.Float64,
    'gstPercent' : IDL.Float64,
    'amount' : IDL.Float64,
  });
  const Purchase = IDL.Record({
    'id' : IDL.Nat,
    'purchaseNumber' : IDL.Text,
    'date' : Time,
    'vendorName' : IDL.Text,
    'vendorMobile' : IDL.Text,
    'vendorGstNumber' : IDL.Text,
    'vendorAddress' : IDL.Text,
    'items' : IDL.Vec(PurchaseItem),
    'totalAmount' : IDL.Float64,
    'paidAmount' : IDL.Float64,
  });
  const Expense = IDL.Record({
    'id' : IDL.Nat,
    'date' : Time,
    'category' : IDL.Text,
    'amount' : IDL.Float64,
    'description' : IDL.Text,
  });
  const Payment = IDL.Record({
    'id' : IDL.Nat,
    'customerId' : IDL.Text,
    'invoiceNumber' : IDL.Text,
    'amount' : IDL.Float64,
    'date' : Time,
    'notes' : IDL.Text,
  });
  const VendorPayment = IDL.Record({
    'id' : IDL.Nat,
    'vendorName' : IDL.Text,
    'purchaseNumber' : IDL.Text,
    'amount' : IDL.Float64,
    'date' : Time,
    'notes' : IDL.Text,
  });
  const EmployeePayment = IDL.Record({
    'id' : IDL.Nat,
    'paymentDate' : Time,
    'employeeName' : IDL.Text,
    'amountPaid' : IDL.Float64,
    'paymentMode' : IDL.Text,
    'remarks' : IDL.Text,
  });
  const CustomerOrderLink = IDL.Record({
    'customerName' : IDL.Text,
    'orderNumber' : IDL.Text,
  });
  const Employee = IDL.Record({
    'id' : IDL.Text,
    'name' : IDL.Text,
    'mobile' : IDL.Text,
    'address' : IDL.Text,
    'joiningDate' : Time,
    'skillType' : IDL.Text,
    'status' : IDL.Text,
  });
  const JobWork = IDL.Record({
    'id' : IDL.Nat,
    'jobDate' : Time,
    'employeeName' : IDL.Text,
    'mobileNumber' : IDL.Text,
    'productName' : IDL.Text,
    'productCode' : IDL.Text,
    'hsnCode' : IDL.Text,
    'qtyGiven' : IDL.Float64,
    'ratePerPiece' : IDL.Float64,
    'expectedReturnDate' : Time,
    'remarks' : IDL.Text,
    'status' : IDL.Text,
    'collectedQty' : IDL.Float64,
    'rejectedQty' : IDL.Float64,
    'acceptedQty' : IDL.Float64,
    'customerOrderLink' : IDL.Opt(CustomerOrderLink),
    'totalCollectedQty' : IDL.Opt(IDL.Float64),
    'totalRejectedQty' : IDL.Opt(IDL.Float64),
    'totalAcceptedQty' : IDL.Opt(IDL.Float64),
    'createdByUserId' : IDL.Opt(IDL.Text),
    'createdByUsername' : IDL.Opt(IDL.Text),
    'createdByFullName' : IDL.Opt(IDL.Text),
    'createdByRole' : IDL.Opt(IDL.Text),
    'updatedByUserId' : IDL.Opt(IDL.Text),
    'updatedByUsername' : IDL.Opt(IDL.Text),
    'updatedByFullName' : IDL.Opt(IDL.Text),
    'updatedByRole' : IDL.Opt(IDL.Text),
    'lastUpdated' : IDL.Opt(Time),
    'lastAction' : IDL.Opt(IDL.Text),
    'lastActionBy' : IDL.Opt(IDL.Text),
    'lastActionRole' : IDL.Opt(IDL.Text),
  });
  const KarigarCollection = IDL.Record({
    'id' : IDL.Nat,
    'collectionDate' : Time,
    'jobWorkNo' : IDL.Nat,
    'karigarName' : IDL.Text,
    'productName' : IDL.Text,
    'qtyGiven' : IDL.Float64,
    'prevCollectedQty' : IDL.Float64,
    'pendingQty' : IDL.Float64,
    'todayCollectedQty' : IDL.Float64,
    'rejectedQty' : IDL.Float64,
    'acceptedQty' : IDL.Float64,
    'remarks' : IDL.Text,
    'stockUpdated' : IDL.Bool,
    'stockMovementId' : IDL.Opt(IDL.Text),
    'previousStock' : IDL.Opt(IDL.Float64),
    'newStock' : IDL.Opt(IDL.Float64),
    'collectionId' : IDL.Opt(IDL.Text),
    'oldAcceptedQty' : IDL.Opt(IDL.Float64),
    'createdBy' : IDL.Opt(IDL.Text),
    'createdById' : IDL.Opt(IDL.Text),
    'createdAt' : IDL.Opt(IDL.Text),
    'inspectedBy' : IDL.Opt(IDL.Text),
    'inspectedById' : IDL.Opt(IDL.Text),
    'inspectedAt' : IDL.Opt(IDL.Text),
  });
  const EmployeeLedgerEntry = IDL.Record({
    'id' : IDL.Nat,
    'employeeName' : IDL.Text,
    'jobWorkNo' : IDL.Nat,
    'date' : Time,
    'productName' : IDL.Text,
    'qtyGiven' : IDL.Float64,
    'acceptedQty' : IDL.Float64,
    'rejectedQty' : IDL.Float64,
    'pendingQty' : IDL.Float64,
    'rate' : IDL.Float64,
    'totalWage' : IDL.Float64,
    'paidAmount' : IDL.Float64,
    'balanceAmount' : IDL.Float64,
    'status' : IDL.Text,
    'collectionId' : IDL.Opt(IDL.Text),
    'jobWorkId' : IDL.Opt(IDL.Text),
    'employeeId' : IDL.Opt(IDL.Text),
    'source' : IDL.Opt(IDL.Text),
    'reversed' : IDL.Opt(IDL.Bool),
    'paymentId' : IDL.Opt(IDL.Text),
  });
  const EmployeeDashboardStats = IDL.Record({
    'totalEmployees' : IDL.Nat,
    'activeJobs' : IDL.Nat,
    'completedJobs' : IDL.Nat,
    'pendingJobs' : IDL.Nat,
    'totalWagesDue' : IDL.Float64,
    'todayProduction' : IDL.Float64,
    'totalPendingQty' : IDL.Float64,
    'todayCollectedQty' : IDL.Float64,
    'totalRejectedQty' : IDL.Float64,
    'finishedGoodsStockValue' : IDL.Float64,
  });
  const StockReconciliationItem = IDL.Record({
    'product' : IDL.Text,
    'expectedStock' : IDL.Float64,
    'actualStock' : IDL.Float64,
    'difference' : IDL.Float64,
    'reason' : IDL.Text,
  });

  return IDL.Service({
    'deleteInvoice' : IDL.Func([IDL.Nat], [], []),
    'getDashboardStats' : IDL.Func([], [DashboardStats], ['query']),
    'getInvoiceById' : IDL.Func([IDL.Nat], [Invoice], ['query']),
    'getInvoices' : IDL.Func([], [IDL.Vec(Invoice)], ['query']),
    'getNextInvoiceNumber' : IDL.Func([], [IDL.Text], ['query']),
    'getSettings' : IDL.Func([], [Settings], ['query']),
    'saveInvoice' : IDL.Func(
        [BusinessInfo, CustomerInfo, IDL.Vec(Product), IDL.Float64, IDL.Float64],
        [IDL.Text],
        [],
      ),
    'saveSettings' : IDL.Func([BusinessInfo, IDL.Float64, IDL.Text], [], []),
    'updateInvoice' : IDL.Func(
        [IDL.Nat, BusinessInfo, CustomerInfo, IDL.Vec(Product), IDL.Float64, IDL.Float64],
        [],
        [],
      ),
    'getCustomers' : IDL.Func([], [IDL.Vec(CustomerItem)], ['query']),
    'saveCustomer' : IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [], []),
    'getProducts' : IDL.Func([], [IDL.Vec(ProductItem)], ['query']),
    'saveProduct' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Float64, IDL.Text, IDL.Int, IDL.Float64, IDL.Vec(BOMRequirement)],
        [],
        [],
      ),
    'deleteProduct' : IDL.Func([IDL.Text], [], []),
    'getRawMaterials' : IDL.Func([], [IDL.Vec(RawMaterial)], ['query']),
    'saveRawMaterial' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Float64, IDL.Float64, IDL.Text, IDL.Float64],
        [],
        [],
      ),
    'deleteRawMaterial' : IDL.Func([IDL.Text], [], []),
    'getMaterialConsumptionHistory' : IDL.Func([], [IDL.Vec(MaterialConsumptionEntry)], ['query']),
    'getStockMovementHistory' : IDL.Func([], [IDL.Vec(StockMovement)], ['query']),
    'getSystemAuditLogs' : IDL.Func([], [IDL.Vec(AuditLog)], ['query']),
    'getPurchases' : IDL.Func([], [IDL.Vec(Purchase)], ['query']),
    'savePurchase' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Vec(PurchaseItem), IDL.Float64, IDL.Float64],
        [IDL.Text],
        [],
      ),
    'deletePurchase' : IDL.Func([IDL.Nat], [], []),
    'getExpenses' : IDL.Func([], [IDL.Vec(Expense)], ['query']),
    'saveExpense' : IDL.Func([IDL.Text, IDL.Float64, IDL.Text], [IDL.Nat], []),
    'deleteExpense' : IDL.Func([IDL.Nat], [], []),
    'getVendorPayments' : IDL.Func([], [IDL.Vec(VendorPayment)], ['query']),
    'collectVendorPayment' : IDL.Func([IDL.Text, IDL.Float64, IDL.Text], [], []),
    'getPayments' : IDL.Func([], [IDL.Vec(Payment)], ['query']),
    'collectPayment' : IDL.Func([IDL.Text, IDL.Float64, IDL.Text], [], []),
    'getEmployeePayments' : IDL.Func([], [IDL.Vec(EmployeePayment)], ['query']),
    'saveEmployeePayment' : IDL.Func([IDL.Text, IDL.Float64, IDL.Text, IDL.Text], [IDL.Nat], []),
    'deleteEmployeePayment' : IDL.Func([IDL.Nat], [], []),
    'getEmployees' : IDL.Func([], [IDL.Vec(Employee)], ['query']),
    'saveEmployee' : IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text, Time, IDL.Text, IDL.Text], [IDL.Text], []),
    'deleteEmployee' : IDL.Func([IDL.Text], [], []),
    'getJobWorks' : IDL.Func([], [IDL.Vec(JobWork)], ['query']),
    'saveJobWork' : IDL.Func(
        [Time, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Float64, IDL.Float64, Time, IDL.Text, IDL.Opt(CustomerOrderLink)],
        [IDL.Nat],
        [],
      ),
    'getCollections' : IDL.Func([], [IDL.Vec(KarigarCollection)], ['query']),
    'saveCollectionEntry' : IDL.Func([IDL.Nat, IDL.Float64, IDL.Float64, IDL.Text], [IDL.Nat], []),
    'editCollectionEntry' : IDL.Func([IDL.Nat, IDL.Float64, IDL.Float64, IDL.Text], [], []),
    'deleteCollectionEntry' : IDL.Func([IDL.Nat], [], []),
    'getKarigarLedger' : IDL.Func([IDL.Text], [IDL.Vec(EmployeeLedgerEntry)], ['query']),
    'getEmployeeDashboardStats' : IDL.Func([], [EmployeeDashboardStats], ['query']),
    'checkStockReconciliation' : IDL.Func([], [IDL.Vec(StockReconciliationItem)], ['query']),
    'runConsistencyAuditAndRepair' : IDL.Func([], [IDL.Vec(IDL.Text)], []),
    'registerOrGetSelf': IDL.Func([], [IDL.Opt(User)], []),
    'createUser': IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Text, IDL.Opt(Permissions)],
        [IDL.Text],
        []
    ),
    'changePassword': IDL.Func([IDL.Text, IDL.Text], [], []),
    'getUsers': IDL.Func([], [IDL.Vec(User)], ['query']),
    'editUser': IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text), IDL.Opt(Permissions)], [], []),
    'deleteUser': IDL.Func([IDL.Text], [], []),
    'logUserAction': IDL.Func([IDL.Text, IDL.Text], [], []),
    'updateProfile': IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [], []),
    'adminResetPassword': IDL.Func([IDL.Text, IDL.Text, IDL.Opt(IDL.Text)], [], []),
    'toggleUserStatus': IDL.Func([IDL.Text, IDL.Text], [], []),
    'linkIdentityToUser': IDL.Func([IDL.Text, IDL.Variant({ 'InternetIdentity': IDL.Null, 'Future': IDL.Text }), IDL.Text], [IDL.Text], []),
    'unlinkIdentityFromUser': IDL.Func([IDL.Text, IDL.Text], [IDL.Text], [])
  });
};

export const init = ({ IDL }) => { return []; };