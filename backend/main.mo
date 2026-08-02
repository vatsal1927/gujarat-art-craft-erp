import Map "mo:core/Map";
import Array "mo:base/Array";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Int "mo:core/Int";
import Float "mo:base/Float";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Migration "migration";

(with migration = Migration.run)
actor {
  type Product = (Text, Nat, Int);
  type BusinessInfo = Text;
  type CustomerInfo = {
    name : Text;
    businessAddress : Text;
    taxId : Text;
  };

  public type Role = {
    #Admin;
    #Manager;
    #Staff;
  };

  public type Department = {
    #Sales;
    #Purchase;
    #Inventory;
    #Production;
    #Finance;
    #Staff;
    #AdminSettings;
  };

  public type Permissions = {
    canView : Bool;
    canCreate : Bool;
    canEdit : Bool;
    canDelete : Bool;
    canApprove : Bool;
    canExport : Bool;
    canPrint : Bool;
    canManageStaff : Bool;
    canViewLogs : Bool;
    canBackupRestore : Bool;
    canAdjustStock : Bool;
    canAccessFinance : Bool;
    canAccessReports : Bool;
  };

  public type PermissionKey = {
    #canView;
    #canCreate;
    #canEdit;
    #canDelete;
    #canApprove;
    #canExport;
    #canPrint;
    #canManageStaff;
    #canViewLogs;
    #canBackupRestore;
    #canAdjustStock;
    #canAccessFinance;
    #canAccessReports;
  };

  func permissionKeyToText(key : PermissionKey) : Text {
    switch (key) {
      case (#canView) "canView";
      case (#canCreate) "canCreate";
      case (#canEdit) "canEdit";
      case (#canDelete) "canDelete";
      case (#canApprove) "canApprove";
      case (#canExport) "canExport";
      case (#canPrint) "canPrint";
      case (#canManageStaff) "canManageStaff";
      case (#canViewLogs) "canViewLogs";
      case (#canBackupRestore) "canBackupRestore";
      case (#canAdjustStock) "canAdjustStock";
      case (#canAccessFinance) "canAccessFinance";
      case (#canAccessReports) "canAccessReports";
    };
  };

  public type IdentityProviderType = {
    #InternetIdentity;
    #Future : Text;
  };

  public type LinkedIdentity = {
    providerType : IdentityProviderType;
    providerId : Text;
    linkedAt : Time.Time;
  };

  public type User = {
    principalId : Principal;
    name : Text;
    username : Text;
    role : Role;
    createdAt : Time.Time;
    email : ?Text;
    mobile : ?Text;
    address : ?Text;
    profilePhoto : ?Text;
    status : ?Text;
    passwordHash : ?Text;
    needsPasswordChange : ?Bool;
    lastLogin : ?Text;
    department : ?Department;
    permissions : ?Permissions;
    linkedIdentities : ?[LinkedIdentity];
  };

  public type ActivityLog = {
    id : Nat;
    timestamp : Time.Time;
    userPrincipal : Text;
    userName : Text;
    action : Text;
    details : Text;
  };

  public type UnitConfig = {
    label : Text;
    type : Text;
    symbol : Text;
    conversionToBase : ?Float;
  };

  public type BOMRequirement = {
    materialId : Text;
    quantity : Float;
    qtyPerUnit : ?Float;
    unitConfig : ?UnitConfig;
    legacyUnit : ?Text;
    qtyPerUnitBase : ?Float;
    schemaVersion : ?Int;
  };

  public type ProductItem = {
    id : Text;
    vigat : Text;
    rate : Float;
    hsnCode : Text;
    stock : Int;
    productionCost : Float;
    bom : [BOMRequirement];
    openingStock : ?Int;
    reservedStock : ?Int;
    availableToSell : ?Int;
  };
  public type CustomerItem = {
    id : Text;
    name : Text;
    businessAddress : Text;
    phone : Text;
    gstNo : Text;
  };

  public type Payment = {
    id : Nat;
    customerId : Text;
    invoiceNumber : Text;
    amount : Float;
    date : Time.Time;
    notes : Text;
  };

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
    reorderLevel : ?Float;
    minimumStock : ?Float;
    preferredVendor : ?Text;
  };

  public type SalesOrderItem = {
    productId : Text;
    productName : Text;
    sku : Text;
    qty : Float;
    rate : Float;
    amount : Float;
    reservedQty : Float;
    availableStock : Float;
    needProductionQty : Float;
  };

  public type SalesOrder = {
    id : Text;
    orderNo : Text;
    customerId : Text;
    customerName : Text;
    orderDate : Text;
    deliveryDate : Text;
    items : [SalesOrderItem];
    subtotal : Float;
    gst : Float;
    grandTotal : Float;
    paymentStatus : Text;
    status : Text;
    createdBy : Text;
    createdAt : Text;
    updatedBy : Text;
    updatedAt : Text;
  };

  public type StockReservation = {
    id : Text;
    salesOrderId : Text;
    productId : Text;
    productName : Text;
    reservedQty : Float;
    createdAt : Text;
  };

  public type ProductionRequirement = {
    id : Text;
    salesOrderId : Text;
    productId : Text;
    productName : Text;
    requiredQty : Float;
    plannedQty : Float;
    completedQty : Float;
    status : Text;
    priority : Text;
    expectedDate : Text;
    createdAt : Text;
  };

  public type MRPMaterialRequirement = {
    materialId : Text;
    materialName : Text;
    requiredQty : Float;
    availableQty : Float;
    shortageQty : Float;
  };

  public type MRPRecord = {
    id : Text;
    productionRequirementId : Text;
    productId : Text;
    productName : Text;
    requiredMaterials : [MRPMaterialRequirement];
    status : Text;
    createdAt : Text;
  };

  public type PurchaseRequirement = {
    id : Text;
    mrpId : Text;
    materialId : Text;
    materialName : Text;
    requiredQty : Float;
    availableQty : Float;
    shortageQty : Float;
    vendorId : Text;
    status : Text;
    createdAt : Text;
  };

  public type PurchaseItem = {
    materialId : Text;
    quantity : Float;
    unit : Text;
    rate : Float;
    gstPercent : Float;
    amount : Float;
  };

  public type Purchase = {
    id : Nat;
    purchaseNumber : Text;
    date : Time.Time;
    vendorName : Text;
    vendorMobile : Text;
    vendorGstNumber : Text;
    vendorAddress : Text;
    items : [PurchaseItem];
    totalAmount : Float;
    paidAmount : Float;
  };

  public type Expense = {
    id : Nat;
    date : Time.Time;
    category : Text;
    amount : Float;
    description : Text;
  };

  public type VendorPayment = {
    id : Nat;
    vendorName : Text;
    purchaseNumber : Text;
    amount : Float;
    date : Time.Time;
    notes : Text;
  };

  public type MaterialConsumptionEntry = {
    id : Nat;
    date : Time.Time;
    finishedGoodId : Text;
    finishedGoodName : Text;
    invoiceNumber : Text;
    materialId : Text;
    materialName : Text;
    quantityConsumed : Float;
  };

  public type CustomerOrderLink = {
    customerName : Text;
    orderNumber : Text;
  };

  public type Employee = {
    id : Text;
    name : Text;
    mobile : Text;
    address : Text;
    joiningDate : Time.Time;
    skillType : Text;
    status : Text;
  };

  public type JobWork = {
    id : Nat;
    jobDate : Time.Time;
    employeeName : Text;
    mobileNumber : Text;
    productName : Text;
    productCode : Text;
    hsnCode : Text;
    qtyGiven : Float;
    ratePerPiece : Float;
    expectedReturnDate : Time.Time;
    remarks : Text;
    status : Text;
    collectedQty : Float;
    rejectedQty : Float;
    acceptedQty : Float;
    customerOrderLink : ?CustomerOrderLink;
    totalCollectedQty : ?Float;
    totalRejectedQty : ?Float;
    totalAcceptedQty : ?Float;
    createdByUserId : ?Text;
    createdByUsername : ?Text;
    createdByFullName : ?Text;
    createdByRole : ?Text;
    updatedByUserId : ?Text;
    updatedByUsername : ?Text;
    updatedByFullName : ?Text;
    updatedByRole : ?Text;
    lastUpdated : ?Time.Time;
    lastAction : ?Text;
    lastActionBy : ?Text;
    lastActionRole : ?Text;
  };

  public type DailyWorkUpdate = {
    id : Nat;
    date : Time.Time;
    jobId : Nat;
    completedQty : Float;
    remarks : Text;
  };

  public type JobCollection = {
    id : Nat;
    collectionDate : Time.Time;
    jobId : Nat;
    collectedQty : Float;
    rejectedQty : Float;
    acceptedQty : Float;
  };

  public type KarigarCollection = {
    id : Nat;
    collectionDate : Time.Time;
    jobWorkNo : Nat;
    karigarName : Text;
    productName : Text;
    qtyGiven : Float;
    prevCollectedQty : Float;
    pendingQty : Float;
    todayCollectedQty : Float;
    rejectedQty : Float;
    acceptedQty : Float;
    remarks : Text;
    stockUpdated : Bool;
    stockMovementId : ?Text;
    previousStock : ?Float;
    newStock : ?Float;
    collectionId : ?Text;
    oldAcceptedQty : ?Float;
    createdBy : ?Text;
    createdById : ?Text;
    createdAt : ?Text;
    inspectedBy : ?Text;
    inspectedById : ?Text;
    inspectedAt : ?Text;
  };

  public type StockMovement = {
    id : Nat;
    date : Time.Time;
    productName : Text;
    productCode : ?Text;
    movementType : Text;
    qtyAdded : Float;
    relatedJobWorkNo : Nat;
    relatedCollectionNo : Nat;
    userName : Text;
    workerName : ?Text;
    collectedQty : ?Float;
    rejectedQty : ?Float;
    acceptedQty : ?Float;
    previousStock : ?Float;
    newStock : ?Float;
    reversed : ?Bool;
    adjustmentQty : ?Float;
    collectionId : ?Text;
    jobWorkId : ?Text;
    productId : ?Text;
    createdBy : ?Text;
  };

  public type AuditLog = {
    id : Nat;
    timestamp : Time.Time;
    user : Text;
    action : Text;
    description : Text;
    jobWorkNo : ?Text;
    collectionNo : ?Text;
    product : ?Text;
    employee : ?Text;
    details : ?Text;
  };

  public type EmployeeLedgerEntry = {
    id : Nat;
    employeeName : Text;
    jobWorkNo : Nat;
    date : Time.Time;
    productName : Text;
    qtyGiven : Float;
    acceptedQty : Float;
    rejectedQty : Float;
    pendingQty : Float;
    rate : Float;
    totalWage : Float;
    paidAmount : Float;
    balanceAmount : Float;
    status : Text;
    collectionId : ?Text;
    jobWorkId : ?Text;
    employeeId : ?Text;
    source : ?Text;
    reversed : ?Bool;
    paymentId : ?Text;
  };

  public type EmployeePayment = {
    id : Nat;
    paymentDate : Time.Time;
    employeeName : Text;
    amountPaid : Float;
    paymentMode : Text;
    remarks : Text;
  };

  public type StockReconciliationItem = {
    product : Text;
    expectedStock : Float;
    actualStock : Float;
    difference : Float;
    reason : Text;
  };

  public type EmployeeDashboardStats = {
    totalEmployees : Nat;
    activeJobs : Nat;
    completedJobs : Nat;
    pendingJobs : Nat;
    totalWagesDue : Float;
    todayProduction : Float;
    totalPendingQty : Float;
    todayCollectedQty : Float;
    totalRejectedQty : Float;
    finishedGoodsStockValue : Float;
  };

  type Invoice = {
    id : Nat;
    invoiceNumber : Text;
    date : Time.Time;
    businessInfo : BusinessInfo;
    customerInfo : CustomerInfo;
    products : [Product];
    totalAmount : Float;
    paidAmount : Float;
    creatorPrincipal : Text;
    creatorName : Text;
    previousBalanceAtCreation : ?Float;
    advanceBalanceAtCreation : ?Float;
    currentInvoiceTotalAtCreation : ?Float;
    totalPayableAtCreation : ?Float;
    paidAmountAtCreation : ?Float;
    finalDueAtCreation : ?Float;
  };

  public type ConsumptionLog = {
    id : Nat;
    date : Time.Time;
    productName : Text;
    batchNo : Text;
    rawMaterialName : Text;
    quantityUsed : Float;
    unit : Text;
    cost : Float;
    employee : Text;
    jobWorkNo : Text;
    remarks : Text;
    collectionNo : Text;
    acceptedQty : Float;
    unitCost : Float;
    status : Text;
  };

  public type FinishedGoodsLog = {
    id : Nat;
    date : Time.Time;
    productName : Text;
    quantity : Float;
    logType : Text;
    reason : Text;
    userName : Text;
  };

  type Settings = {
    businessInfo : BusinessInfo;
    defaultGstRate : Float;
    termsAndConditions : Text;
    allowStaffCollection : Bool;
    enableRejectedWage : Bool;
    companyLogo : ?Text;
    companyName : ?Text;
    themeColors : ?Text;
    sidebarStyle : ?Text;
    allowAdminBackupRestore : ?Bool;
  };

  public type DatabaseBackup = {
    invoices : [Invoice];
    lastInvoiceId : Nat;
    settings : ?Settings;
    users : [User];
    userCount : Nat;
    activityLogs : [ActivityLog];
    lastLogId : Nat;
    productsList : [ProductItem];
    productCount : Nat;
    customersList : [CustomerItem];
    customerCount : Nat;
    paymentsList : [Payment];
    lastPaymentId : Nat;
    rawMaterialsList : [RawMaterial];
    purchasesList : [Purchase];
    expensesList : [Expense];
    vendorPaymentsList : [VendorPayment];
    consumptionHistory : [MaterialConsumptionEntry];
    lastPurchaseId : Nat;
    lastExpenseId : Nat;
    lastVendorPaymentId : Nat;
    lastConsumptionId : Nat;
    employeesList : [Employee];
    jobWorksList : [JobWork];
    dailyWorkUpdatesList : [DailyWorkUpdate];
    jobCollectionsList : [JobCollection];
    employeePaymentsList : [EmployeePayment];
    collectionsList : [KarigarCollection];
    stockMovementsList : [StockMovement];
    auditLogsList : [AuditLog];
    employeeLedgersList : [EmployeeLedgerEntry];
    consumptionLogsList : [ConsumptionLog];
    lastConsumptionLogId : Nat;
    finishedGoodsLogsList : [FinishedGoodsLog];
    lastFinishedGoodsLogId : Nat;
    employeeCount : Nat;
    lastJobWorkId : Nat;
    lastDailyWorkUpdateId : Nat;
    lastJobCollectionId : Nat;
    lastEmployeePaymentId : Nat;
    lastCollectionId : Nat;
    lastStockMovementId : Nat;
    lastAuditLogId : Nat;
    lastEmployeeLedgerId : Nat;
  };

  type DashboardStats = {
    todayInvoiceCount : Nat;
    todayTotalSales : Float;
    allTimeInvoiceCount : Nat;
    allTimeTotalSales : Float;
    totalOutstandingAmount : Float;
    customersWithOutstanding : Nat;
    overdueInvoiceCount : Nat;
    todayCollections : Float;
    totalPurchases : Float;
    totalProfit : Float;
    totalGst : Float;
    vendorDue : Float;
    stockValue : Float;
  };

  type InternalInvoice = {
    id : Nat;
    invoiceNumber : Text;
    date : Time.Time;
    businessInfo : BusinessInfo;
    customerInfo : CustomerInfo;
    products : List.List<Product>;
    totalAmount : Float;
    paidAmount : Float;
    creatorPrincipal : Text;
    creatorName : Text;
    previousBalanceAtCreation : ?Float;
    advanceBalanceAtCreation : ?Float;
    currentInvoiceTotalAtCreation : ?Float;
    totalPayableAtCreation : ?Float;
    paidAmountAtCreation : ?Float;
    finalDueAtCreation : ?Float;
  };

  func indexOf(haystack : Text, needle : Char) : ?Nat {
    var index : Nat = 0;
    for (c in haystack.chars()) {
      if (c == needle) { return ?index; };
      index := index + 1;
    };
    null;
  };

  func debugShow(x : Float) : Text { debug_show(x) };

  func trimWhitespace(t : Text) : Text {
    let isWhitespace = func(c : Char) : Bool {
      c == ' ' or c == '\t' or c == '\r' or c == '\n'
    };
    Text.trim(t, #predicate(isWhitespace))
  };

  func fromNatToFloat(x : Nat) : Float { Float.fromInt(Int.fromNat(x)) };

  func subText(t : Text, start : Nat, len : Nat) : Text {
    let size = t.size();
    if (start == 0 and len == size) return t;
    let cs = t.chars();
    var r = "";
    var n = start;
    while (n > 0) {
      ignore cs.next();
      n -= 1
    };
    n := len;
    while (n > 0) {
      switch (cs.next()) {
        case null { };
        case (?c) { r := r # Text.fromChar(c) };
      };
      n -= 1
    };
    r
  };

  let invoices = Map.empty<Nat, InternalInvoice>();
  var lastInvoiceId = 0;
  var settings : ?Settings = null;

  stable var masterAdminUsername : Text = "admin";
  stable var masterAdminName : Text = "Master Admin";

  let users = Map.empty<Text, User>();
  var userCount = 0;

  var activityLogs : List.List<ActivityLog> = List.empty<ActivityLog>();
  var lastLogId = 0;

  let productsList = Map.empty<Text, ProductItem>();
  var productCount = 0;

  let customersList = Map.empty<Text, CustomerItem>();
  var customerCount = 0;

  let paymentsList = Map.empty<Nat, Payment>();
  var lastPaymentId = 0;

  let rawMaterialsList = Map.empty<Text, RawMaterial>();
  let purchasesList = Map.empty<Nat, Purchase>();
  let expensesList = Map.empty<Nat, Expense>();
  let vendorPaymentsList = Map.empty<Nat, VendorPayment>();
  var consumptionHistory : List.List<MaterialConsumptionEntry> = List.empty<MaterialConsumptionEntry>();

  var lastPurchaseId = 0;
  var lastExpenseId = 0;
  var lastVendorPaymentId = 0;
  var lastConsumptionId = 0;

  let employeesList = Map.empty<Text, Employee>();
  let jobWorksList = Map.empty<Nat, JobWork>();
  let dailyWorkUpdatesList = Map.empty<Nat, DailyWorkUpdate>();
  let jobCollectionsList = Map.empty<Nat, JobCollection>();
  let employeePaymentsList = Map.empty<Nat, EmployeePayment>();

  let collectionsList = Map.empty<Nat, KarigarCollection>();
  let stockMovementsList = Map.empty<Nat, StockMovement>();
  let auditLogsList = Map.empty<Nat, AuditLog>();
  let employeeLedgersList = Map.empty<Nat, EmployeeLedgerEntry>();

  let consumptionLogsList = Map.empty<Nat, ConsumptionLog>();
  var lastConsumptionLogId = 0;

  let finishedGoodsLogsList = Map.empty<Nat, FinishedGoodsLog>();
  var lastFinishedGoodsLogId = 0;

  let productionRequirementsList = Map.empty<Text, ProductionRequirement>();
  let purchaseRequirementsList = Map.empty<Text, PurchaseRequirement>();
  let mrpRecordsList = Map.empty<Text, MRPRecord>();

  var employeeCount = 0;
  var lastJobWorkId = 0;
  var lastDailyWorkUpdateId = 0;
  var lastJobCollectionId = 0;
  var lastEmployeePaymentId = 0;

  var lastCollectionId = 0;
  var lastStockMovementId = 0;
  var lastAuditLogId = 0;
  var lastEmployeeLedgerId = 0;

  func findUserByPrincipalInternal(principalText : Text) : ?User {
    switch (users.get(principalText)) {
      case (?u) { ?u };
      case (null) {
        for (u in users.values()) {
          switch (u.linkedIdentities) {
            case (?identities) {
              for (id in identities.vals()) {
                if (id.providerId == principalText) {
                  return ?u;
                };
              };
            };
            case (null) {};
          };
        };
        null;
      };
    };
  };

  func logActivity(userPrincipal : Principal, action : Text, details : Text) {
    let principalText = Principal.toText(userPrincipal);
    let userName = switch (findUserByPrincipalInternal(principalText)) {
      case (?u) { u.name };
      case (null) { "System" };
    };
    
    let id = lastLogId + 1;
    let logEntry : ActivityLog = {
      id;
      timestamp = Time.now();
      userPrincipal = principalText;
      userName;
      action;
      details;
    };
    
    List.add<ActivityLog>(activityLogs, logEntry);
    lastLogId := id;
  };

  func createAuditLogInternal(userPrincipal : Text, action : Text, description : Text) {
    let id = lastAuditLogId + 1;
    let userName = switch (findUserByPrincipalInternal(userPrincipal)) {
      case (?u) { u.name };
      case (null) { userPrincipal };
    };
    let log : AuditLog = {
      id;
      timestamp = Time.now();
      user = userName;
      action;
      description;
      jobWorkNo = null;
      collectionNo = null;
      product = null;
      employee = null;
      details = null;
    };
    auditLogsList.add(id, log);
    lastAuditLogId := id;
  };

  func logSecurityAudit(callerPrincipal : Principal, action : Text, reason : Text) {
    logActivity(callerPrincipal, action, reason);
    createAuditLogInternal(Principal.toText(callerPrincipal), action, "Principal: " # Principal.toText(callerPrincipal) # ". Reason: " # reason);
  };

  public query ({ caller }) func verifyMasterAdminIntegrity() : async { isValid : Bool; message : Text } {
    var adminCount = 0;
    var masterAdminValid = false;
    for (u in users.values()) {
      switch (u.role) {
        case (#Admin) {
          adminCount := adminCount + 1;
          if (u.username == masterAdminUsername) {
            masterAdminValid := true;
          };
        };
        case (_) {};
      };
    };

    if (adminCount == 0) {
      return { isValid = false; message = "CRITICAL SECURITY BREACH: Master Admin account is missing or deleted!" };
    };
    if (adminCount > 1) {
      return { isValid = false; message = "CRITICAL SECURITY BREACH: Multiple Master Admin accounts detected! Duplicate identities detected." };
    };
    if (not masterAdminValid) {
      return { isValid = false; message = "CRITICAL SECURITY BREACH: Master Admin identity mismatch! Unauthorized user holds Master Admin privileges." };
    };

    return { isValid = true; message = "Master Admin integrity is intact." };
  };

  func createLedgerEntryInternal(
    employeeName : Text,
    jobWorkNo : Nat,
    date : Time.Time,
    productName : Text,
    qtyGiven : Float,
    acceptedQty : Float,
    rejectedQty : Float,
    pendingQty : Float,
    rate : Float,
    totalWage : Float,
    paidAmount : Float,
    balanceAmount : Float,
    status : Text
  ) {
    createLedgerEntryWithPayment(
      employeeName,
      jobWorkNo,
      date,
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
      null
    );
  };

  func createLedgerEntryWithPayment(
    employeeName : Text,
    jobWorkNo : Nat,
    date : Time.Time,
    productName : Text,
    qtyGiven : Float,
    acceptedQty : Float,
    rejectedQty : Float,
    pendingQty : Float,
    rate : Float,
    totalWage : Float,
    paidAmount : Float,
    balanceAmount : Float,
    status : Text,
    paymentId : ?Text
  ) {
    let id = lastEmployeeLedgerId + 1;
    let entry : EmployeeLedgerEntry = {
      id;
      employeeName;
      jobWorkNo;
      date;
      productName;
      qtyGiven;
      acceptedQty;
      rejectedQty;
      pendingQty;
      rate;
      totalWage;
      paidAmount;
      balanceAmount;
      status;
      collectionId = null;
      jobWorkId = ?jobWorkNo.toText();
      employeeId = null;
      source = null;
      reversed = null;
      paymentId;
    };
    employeeLedgersList.add(id, entry);
    lastEmployeeLedgerId := id;
  };

  func recalculateEmployeeLedgerInternal(employeeName : Text) {
    let allLedgers = employeeLedgersList.values().toArray();
    let sortedLedgers = allLedgers.sort(func(a, b) {
      let dateCompare = Int.compare(a.date, b.date);
      if (dateCompare != #equal) { dateCompare }
      else { Nat.compare(a.id, b.id) };
    });
    
    var runningBalance = 0.0;
    for (entry in sortedLedgers.vals()) {
      if (entry.employeeName == employeeName) {
        let isReversed = switch (entry.reversed) {
          case (?b) { b };
          case (null) { false };
        };
        let wage = if (isReversed) { 0.0 } else { entry.totalWage };
        let paid = if (isReversed) { 0.0 } else { entry.paidAmount };
        runningBalance := runningBalance + wage - paid;
        let updatedEntry : EmployeeLedgerEntry = {
          entry with
          balanceAmount = runningBalance;
        };
        employeeLedgersList.add(entry.id, updatedEntry);
      };
    };
  };

  func getEmployeeTotalEarned(empName : Text) : Float {
    var total = 0.0;
    let allLedgers = employeeLedgersList.values().toArray();
    for (entry in allLedgers.vals()) {
      if (entry.employeeName == empName) {
        total := total + entry.totalWage;
      };
    };
    total;
  };

  func getEmployeeTotalPaid(empName : Text) : Float {
    var total = 0.0;
    let allPayments = employeePaymentsList.values().toArray();
    for (p in allPayments.vals()) {
      if (p.employeeName == empName) {
        total := total + p.amountPaid;
      };
    };
    total;
  };

  func adjustStockForProduct(prodText : Text, qtyChange : Int) {
    let pipeIndex = indexOf(prodText, '|');
    let vigatToMatch = switch (pipeIndex) {
      case (?idx) { subText(prodText, 0, idx) };
      case (null) { prodText };
    };

    let keys = productsList.keys();
    var foundKey : ?Text = null;
    for (k in keys) {
      switch (productsList.get(k)) {
        case (?item) {
          if (item.vigat == vigatToMatch) {
            foundKey := ?k;
          };
        };
        case (null) { };
      };
    };

    switch (foundKey) {
      case (?k) {
        switch (productsList.get(k)) {
          case (?item) {
            let updatedProduct : ProductItem = {
              item with
              stock = item.stock + qtyChange;
            };
            productsList.add(k, updatedProduct);
          };
          case (null) { };
        };
      };
      case (null) { };
    };
  };

  func adjustStockForProductId(prodId : Text, qtyChange : Int) {
    switch (productsList.get(prodId)) {
      case (?item) {
        let updatedProduct : ProductItem = {
          item with
          stock = item.stock + qtyChange;
        };
        productsList.add(prodId, updatedProduct);
      };
      case (null) { };
    };
  };

  func autoRegisterCustomer(name : Text, address : Text, taxId : Text) {
    if (name == "") { return; };
    
    let pipe1 = indexOf(taxId, '|');
    let phone = switch (pipe1) {
      case (?idx) { subText(taxId, 0, idx) };
      case (null) { taxId };
    };
    
    let remaining = switch (pipe1) {
      case (?idx) { subText(taxId, idx + 1, Text.size(taxId) - idx - 1) };
      case (null) { "" };
    };
    
    let pipe2 = indexOf(remaining, '|');
    let gstNo = switch (pipe2) {
      case (?idx) { subText(remaining, 0, idx) };
      case (null) { remaining };
    };

    let customerId = name;
    let customer : CustomerItem = {
      id = customerId;
      name;
      businessAddress = address;
      phone;
      gstNo;
    };
    if (not customersList.containsKey(customerId)) {
      customerCount := customerCount + 1;
    };
    customersList.add(customerId, customer);
  };

  func compareInvoicesByDate(a : InternalInvoice, b : InternalInvoice) : Order.Order {
    Int.compare(b.date, a.date);
  };

  func compareInvoicesByDateAscending(a : InternalInvoice, b : InternalInvoice) : Order.Order {
    Int.compare(a.date, b.date);
  };

  // Auth Operations
  func enforceSingleMasterAdminPolicyCanister() {
    let allUsers = users.values().toArray();
    for (u in allUsers.vals()) {
      switch (u.role) {
        case (#Admin) {
          if (u.username != masterAdminUsername) {
            let updatedUser : User = {
              principalId = u.principalId;
              name = u.name;
              username = u.username;
              role = #Manager;
              createdAt = u.createdAt;
              email = u.email;
              mobile = u.mobile;
              address = u.address;
              profilePhoto = u.profilePhoto;
              status = u.status;
              passwordHash = u.passwordHash;
              needsPasswordChange = u.needsPasswordChange;
              lastLogin = u.lastLogin;
              department = u.department;
              permissions = u.permissions;
            };
            users.add(Principal.toText(u.principalId), updatedUser);
            createAuditLogInternal("System", "Single Master Admin Policy Enforcement", "Demoted non-admin Master Admin account: " # u.name);
          };
        };
        case (_) {};
      };
    };
  };

  func parseDepartment(deptText : Text) : ?Department {
    if (deptText == "Sales" or deptText == "Sales Department") { ?#Sales }
    else if (deptText == "Purchase" or deptText == "Purchase Department") { ?#Purchase }
    else if (deptText == "Inventory" or deptText == "Inventory Department") { ?#Inventory }
    else if (deptText == "Production" or deptText == "Production Department") { ?#Production }
    else if (deptText == "Finance" or deptText == "Accounts" or deptText == "Accounts / Finance Department") { ?#Finance }
    else if (deptText == "Staff" or deptText == "Staff/Karigar" or deptText == "Staff / Karigar Department") { ?#Staff }
    else if (deptText == "AdminSettings" or deptText == "Admin" or deptText == "Admin / Settings Department") { ?#AdminSettings }
    else { null };
  };

  func defaultPermissions(roleText : Text) : Permissions {
    let isMaster = (roleText == "Admin");
    {
      canView = true;
      canCreate = isMaster;
      canEdit = isMaster;
      canDelete = isMaster;
      canApprove = isMaster;
      canExport = isMaster;
      canPrint = true;
      canManageStaff = isMaster;
      canViewLogs = isMaster;
      canBackupRestore = isMaster;
      canAdjustStock = isMaster;
      canAccessFinance = isMaster;
      canAccessReports = isMaster;
    };
  };

  func checkPermissions(caller : Principal, allowedDepts : [Department], requiredToggle : PermissionKey) : User {
    let callerText = Principal.toText(caller);
    let callerUser = switch (findUserByPrincipalInternal(callerText)) {
      case (?u) { u };
      case (null) {
        createAuditLogInternal("Unknown", "Unauthorized Department Access", "Caller: " # callerText # " tried accessing protected function.");
        Runtime.trap("Access denied: insufficient department permission.");
      };
    };

    // Master Admin always has full access
    switch (callerUser.role) {
      case (#Admin) { return callerUser; };
      case (_) {};
    };

    // For other roles, verify department and toggles
    let dept = switch (callerUser.department) {
      case (?d) { d };
      case (null) {
        createAuditLogInternal(callerText, "Unauthorized Department Access", "User " # callerUser.name # " has no department assigned.");
        Runtime.trap("Access denied: insufficient department permission.");
      };
    };

    // Check if caller's department is in allowedDepts
    var deptMatch = false;
    for (d in allowedDepts.vals()) {
      if (dept == d) { deptMatch := true; };
    };
    if (not deptMatch) {
      createAuditLogInternal(callerText, "Unauthorized Department Access", "User " # callerUser.name # " tried to access module not allowed for their department.");
      Runtime.trap("Access denied: insufficient department permission.");
    };

    // Check permission toggles
    let perms = switch (callerUser.permissions) {
      case (?p) { p };
      case (null) {
        createAuditLogInternal(callerText, "Unauthorized Department Access", "User " # callerUser.name # " has no permission toggles configured.");
        Runtime.trap("Access denied: insufficient department permission.");
      };
    };

    let hasPerm = switch (requiredToggle) {
      case (#canView) perms.canView;
      case (#canCreate) perms.canCreate;
      case (#canEdit) perms.canEdit;
      case (#canDelete) perms.canDelete;
      case (#canApprove) perms.canApprove;
      case (#canExport) perms.canExport;
      case (#canPrint) perms.canPrint;
      case (#canManageStaff) perms.canManageStaff;
      case (#canViewLogs) perms.canViewLogs;
      case (#canBackupRestore) perms.canBackupRestore;
      case (#canAdjustStock) perms.canAdjustStock;
      case (#canAccessFinance) perms.canAccessFinance;
      case (#canAccessReports) perms.canAccessReports;
    };

    if (not hasPerm) {
      createAuditLogInternal(callerText, "Unauthorized Department Access", "User " # callerUser.name # " lacks toggle permission: " # permissionKeyToText(requiredToggle));
      Runtime.trap("Access denied: insufficient department permission.");
    };

    return callerUser;
  };

  public shared ({ caller }) func registerOrGetSelf() : async ?User {
    enforceSingleMasterAdminPolicyCanister();
    let principalText = Principal.toText(caller);
    if (caller == Principal.fromText("2vxsx-fae")) {
      return null;
    };
    switch (findUserByPrincipalInternal(principalText)) {
      case (?user) { ?user };
      case (null) {
        if (userCount == 0) {
          let firstUser : User = {
            principalId = caller;
            name = masterAdminName;
            username = masterAdminUsername;
            role = #Admin;
            createdAt = Time.now();
            email = null;
            mobile = null;
            address = null;
            profilePhoto = null;
            status = ?"Active";
            passwordHash = ?"bf6b5bdb74c79ece9fc0ad0ac9fb0359f9555d4f35a83b2e6ec69ae99e09603d";
            needsPasswordChange = ?true;
            lastLogin = null;
            department = ?#AdminSettings;
            permissions = ?defaultPermissions("Admin");
          };
          users.add(principalText, firstUser);
          userCount := userCount + 1;
          logActivity(caller, "System Bootstrap", "Registered first Admin: " # firstUser.name);
          ?firstUser;
        } else {
          null;
        };
      };
    };
  };

  public shared ({ caller }) func createUser(
    principalText : Text,
    name : Text,
    username : Text,
    roleText : Text,
    email : ?Text,
    mobile : ?Text,
    address : ?Text,
    profilePhoto : ?Text,
    status : ?Text,
    passwordHash : ?Text,
    departmentText : Text,
    permissionsObj : ?Permissions
  ) : async Text {
    let callerText = Principal.toText(caller);
    let adminUser = switch (users.get(callerText)) {
      case (?u) { u };
      case (null) { Runtime.trap("Unauthorized: User not found"); };
    };

    switch (adminUser.role) {
      case (#Admin) { };
      case (#Manager) {
        let dept = switch (adminUser.department) {
          case (?d) { d };
          case (null) {
            createAuditLogInternal(callerText, "Admin Settings Access Blocked", "Manager lacks settings department assignment");
            Runtime.trap("Access denied: insufficient department permission.");
          };
        };
        let perms = switch (adminUser.permissions) {
          case (?p) { p };
          case (null) {
            createAuditLogInternal(callerText, "Admin Settings Access Blocked", "Manager lacks settings permissions");
            Runtime.trap("Access denied: insufficient department permission.");
          };
        };
        if (dept != #AdminSettings or not perms.canManageStaff or roleText != "Staff") {
          createAuditLogInternal(callerText, "Admin Settings Access Blocked", "Manager tried creating non-staff user or lacks permission.");
          Runtime.trap("Access denied: insufficient department permission.");
        };
      };
      case (#Staff) {
        createAuditLogInternal(callerText, "Staff Access Blocked", "Staff tried to create a user.");
        Runtime.trap("Access denied: insufficient department permission.");
      };
    };

    if (users.containsKey(principalText)) {
      Runtime.trap("User already exists");
    };

    let targetPrincipal = Principal.fromText(principalText);
    let role = switch (roleText) {
      case ("Admin") { #Admin };
      case ("Manager") { #Manager };
      case ("Staff") { #Staff };
      case (_) { Runtime.trap("Invalid role"); };
    };

    switch (role) {
      case (#Admin) {
        var adminCount = 0;
        for (u in users.values()) {
          switch (u.role) {
            case (#Admin) { adminCount := adminCount + 1 };
            case (_) {};
          };
        };
        if (adminCount > 0) {
          logSecurityAudit(caller, "MASTER_ADMIN_CREATE_ATTEMPT", "Attempted to create Master Admin user: " # name # " (" # username # ")");
          logSecurityAudit(caller, "MASTER_ADMIN_CREATE_BLOCKED", "Blocked creation of Master Admin: " # name # " (" # username # ") because a Master Admin already exists.");
          Runtime.trap("Security Policy Violation: Only one Master Admin account is allowed.");
        };
      };
      case (_) {};
    };

    let parsedDept = parseDepartment(departmentText);
    let finalDept = switch (parsedDept) {
      case (?d) { ?d };
      case (null) {
        if (roleText == "Staff") { ?#Staff }
        else if (roleText == "Admin") { ?#AdminSettings }
        else if (roleText == "Manager") { ?#Sales }
        else { null }
      };
    };

    let finalPerms = switch (permissionsObj) {
      case (?p) { ?p };
      case (null) { ?defaultPermissions(roleText) };
    };

    let newUser : User = {
      principalId = targetPrincipal;
      name;
      username = Text.toLower(trimWhitespace(username));
      role;
      createdAt = Time.now();
      email;
      mobile;
      address;
      profilePhoto;
      status;
      passwordHash;
      needsPasswordChange = ?true;
      lastLogin = null;
      department = finalDept;
      permissions = finalPerms;
    };

    users.add(principalText, newUser);
    userCount := userCount + 1;

    logActivity(caller, "Create User", "Created user " # name # " (" # username # ") with role " # roleText);
    createAuditLogInternal(callerText, "User Created", "Created user " # name # " with role " # roleText);
    createAuditLogInternal(callerText, "Department Assigned", "Assigned department " # departmentText # " to " # username);
    createAuditLogInternal(callerText, "Permission Changed", "Assigned permissions to " # username);
    createAuditLogInternal(callerText, "User Permission Updated", "Permissions configured for " # username);

    "User created successfully";
  };

  public shared ({ caller }) func deleteUser(principalText : Text) : async () {
    let callerText = Principal.toText(caller);
    let adminUser = switch (users.get(callerText)) {
      case (?u) { u };
      case (null) { Runtime.trap("Unauthorized: User not found"); };
    };

    switch (adminUser.role) {
      case (#Admin) { };
      case (#Manager) {
        let dept = switch (adminUser.department) {
          case (?d) { d };
          case (null) {
            createAuditLogInternal(callerText, "Admin Settings Access Blocked", "Manager lacks settings department assignment");
            Runtime.trap("Access denied: insufficient department permission.");
          };
        };
        let perms = switch (adminUser.permissions) {
          case (?p) { p };
          case (null) {
            createAuditLogInternal(callerText, "Admin Settings Access Blocked", "Manager lacks settings permissions");
            Runtime.trap("Access denied: insufficient department permission.");
          };
        };
        if (dept != #AdminSettings or not perms.canManageStaff) {
          createAuditLogInternal(callerText, "Admin Settings Access Blocked", "Manager lacks settings permission to delete users.");
          Runtime.trap("Access denied: insufficient department permission.");
        };
      };
      case (#Staff) {
        createAuditLogInternal(callerText, "Staff Access Blocked", "Staff tried to delete a user.");
        Runtime.trap("Access denied: insufficient department permission.");
      };
    };

    if (callerText == principalText) {
      Runtime.trap("Cannot delete yourself");
    };

    switch (users.get(principalText)) {
      case (?userToDelete) {
        if (adminUser.role == #Manager and userToDelete.role != #Staff) {
          createAuditLogInternal(callerText, "Admin Settings Access Blocked", "Manager tried to delete non-staff user.");
          Runtime.trap("Access denied: insufficient department permission.");
        };
        switch (userToDelete.role) {
          case (#Admin) { 
            logSecurityAudit(caller, "MASTER_ADMIN_DELETE_ATTEMPT", "Attempted to delete Master Admin user: " # userToDelete.name # " (" # principalText # ")");
            logSecurityAudit(caller, "MASTER_ADMIN_DELETE_BLOCKED", "Blocked deletion of Master Admin user: Master Admin cannot be deleted.");
            Runtime.trap("Security Violation: Master Admin account cannot be deleted.");
          };
          case (_) {};
        };
        users.remove(principalText);
        userCount := userCount - 1;
        logActivity(caller, "Delete User", "Deleted user " # userToDelete.name # " (" # principalText # ")");
        createAuditLogInternal(callerText, "User Deleted", "Deleted user " # userToDelete.name # " (" # principalText # ")");
      };
      case (null) {
        Runtime.trap("User not found");
      };
    };
  };

  public shared ({ caller }) func editUser(
    principalText : Text,
    name : Text,
    username : Text,
    email : Text,
    mobile : Text,
    roleText : Text,
    status : Text,
    departmentText : Text,
    permissionsObj : ?Permissions
  ) : async () {
    let callerText = Principal.toText(caller);
    let callerUser = switch (users.get(callerText)) {
      case (?u) { u };
      case (null) { Runtime.trap("Access denied: insufficient permissions."); };
    };

    let isMaster = switch (callerUser.role) { case (#Admin) { true }; case (_) { false } };
    let isManager = switch (callerUser.role) { case (#Manager) { true }; case (_) { false } };

    if (not isMaster and not isManager) {
      Runtime.trap("Access denied: insufficient permissions.");
    };

    let targetUser = switch (users.get(principalText)) {
      case (?u) { u };
      case (null) { Runtime.trap("User not found"); };
    };

    let isTargetMaster = switch (targetUser.role) { case (#Admin) { true }; case (_) { false } };

    // Admin / Manager limiting
    if (isManager) {
      let dept = switch (callerUser.department) {
        case (?d) { d };
        case (null) {
          createAuditLogInternal(callerText, "Admin Settings Access Blocked", "Manager lacks settings department assignment");
          Runtime.trap("Access denied: insufficient department permission.");
        };
      };
      let perms = switch (callerUser.permissions) {
        case (?p) { p };
        case (null) {
          createAuditLogInternal(callerText, "Admin Settings Access Blocked", "Manager lacks settings permissions");
          Runtime.trap("Access denied: insufficient department permission.");
        };
      };
      if (dept != #AdminSettings or not perms.canManageStaff or roleText != "Staff" or targetUser.role != #Staff) {
        createAuditLogInternal(callerText, "Admin Settings Access Blocked", "Manager tried to edit non-staff or lacks permissions.");
        Runtime.trap("Access denied: insufficient department permission.");
      };
    };

    // Master Admin protection
    if (isTargetMaster) {
      if (roleText != "Admin") {
        logSecurityAudit(caller, "MASTER_ADMIN_ROLE_CHANGE_BLOCKED", "Blocked demotion of Master Admin");
        Runtime.trap("Security Violation: Master Admin role cannot be demoted.");
      };
      if (status != "Active") {
        logSecurityAudit(caller, "MASTER_ADMIN_DISABLE_BLOCKED", "Blocked deactivation of Master Admin");
        Runtime.trap("Security Violation: Master Admin account cannot be deactivated.");
      };
      if (username != masterAdminUsername) {
        Runtime.trap("Security Violation: Cannot change Master Admin username.");
      };
    };

    // Role change validation
    let role = switch (roleText) {
      case ("Admin") { #Admin };
      case ("Manager") { #Manager };
      case ("Staff") { #Staff };
      case (_) { Runtime.trap("Invalid role"); };
    };

    // Single Master Admin enforcement on edit
    if (roleText == "Admin" and not isTargetMaster) {
      var adminCount = 0;
      for (u in users.values()) {
        switch (u.role) {
          case (#Admin) { adminCount := adminCount + 1 };
          case (_) {};
        };
      };
      if (adminCount > 0) {
        logSecurityAudit(caller, "MASTER_ADMIN_ROLE_CHANGE_BLOCKED", "Blocked role change to Master Admin: Only one allowed.");
        Runtime.trap("Access denied: insufficient permissions.");
      };
    };

    // Department parsing and permissions assignment
    let parsedDept = parseDepartment(departmentText);
    let finalDept = if (isTargetMaster) { ?#AdminSettings } else {
      switch (parsedDept) {
        case (?d) { ?d };
        case (null) {
          if (roleText == "Staff") { ?#Staff }
          else if (roleText == "Admin") { ?#AdminSettings }
          else if (roleText == "Manager") { ?#Sales }
          else { null }
        };
      }
    };

    let finalPerms = if (isTargetMaster) { ?defaultPermissions("Admin") } else {
      switch (permissionsObj) {
        case (?p) { ?p };
        case (null) { ?defaultPermissions(roleText) };
      }
    };

    let updatedUser : User = {
      targetUser with
      name;
      username = Text.toLower(trimWhitespace(username));
      email = ?email;
      mobile = ?mobile;
      role;
      status = ?status;
      department = finalDept;
      permissions = finalPerms;
    };

    // Audit logs for modifications
    let oldRoleText = switch (targetUser.role) {
      case (#Admin) { "Admin" };
      case (#Manager) { "Manager" };
      case (#Staff) { "Staff" };
    };
    if (oldRoleText != roleText) {
      createAuditLogInternal(callerText, "User Role Changed", "Changed role of " # name # " from " # oldRoleText # " to " # roleText);
    };

    let oldDeptText = switch (targetUser.department) {
      case (?d) {
        switch (d) {
          case (#Sales) { "Sales" };
          case (#Purchase) { "Purchase" };
          case (#Inventory) { "Inventory" };
          case (#Production) { "Production" };
          case (#Finance) { "Finance" };
          case (#Staff) { "Staff" };
          case (#AdminSettings) { "AdminSettings" };
        }
      };
      case (null) { "None" };
    };
    if (oldDeptText != departmentText) {
      createAuditLogInternal(callerText, "Department Assigned", "Assigned department " # departmentText # " to " # username);
    };

    // Always log permission update on edit
    createAuditLogInternal(callerText, "Permission Changed", "Permissions updated for " # username);
    createAuditLogInternal(callerText, "User Permission Updated", "Permissions updated for " # username);

    users.add(principalText, updatedUser);
    logActivity(caller, "User updated", "Updated details for " # username);
  };

  public shared ({ caller }) func updateProfile(
    email : Text,
    name : Text,
    mobile : Text,
    address : Text,
    profilePhoto : Text
  ) : async () {
    let callerText = Principal.toText(caller);
    let callerUser = switch (users.get(callerText)) {
      case (?u) { u };
      case (null) { Runtime.trap("User not found"); };
    };

    let updatedUser : User = {
      callerUser with
      email = ?email;
      name;
      mobile = ?mobile;
      address = ?address;
      profilePhoto = ?profilePhoto;
    };

    users.add(callerText, updatedUser);
    logActivity(caller, "User updated", "Updated profile details for " # callerUser.username);
  };

  public shared ({ caller }) func changePassword(
    newPassword : Text,
    newPrincipalId : Text
  ) : async () {
    let callerText = Principal.toText(caller);
    let callerUser = switch (users.get(callerText)) {
      case (?u) { u };
      case (null) { Runtime.trap("User not found"); };
    };

    // Remove old record
    users.remove(callerText);

    // Add new record under new principal
    let newPrincipal = Principal.fromText(newPrincipalId);
    let updatedUser : User = {
      callerUser with
      principalId = newPrincipal;
      needsPasswordChange = ?false;
    };
    users.add(newPrincipalId, updatedUser);

    logActivity(newPrincipal, "Password changed", "Updated password for " # callerUser.username);
  };

  public shared ({ caller }) func toggleUserStatus(
    principalText : Text,
    status : Text
  ) : async () {
    let callerText = Principal.toText(caller);
    let callerUser = switch (users.get(callerText)) {
      case (?u) { u };
      case (null) { Runtime.trap("Access denied: insufficient permissions."); };
    };

    let isMaster = switch (callerUser.role) { case (#Admin) { true }; case (_) { false } };
    let isManager = switch (callerUser.role) { case (#Manager) { true }; case (_) { false } };

    if (not isMaster and not isManager) {
      Runtime.trap("Access denied: insufficient permissions.");
    };

    let targetUser = switch (users.get(principalText)) {
      case (?u) { u };
      case (null) { Runtime.trap("User not found"); };
    };

    let isTargetMaster = switch (targetUser.role) { case (#Admin) { true }; case (_) { false } };
    if (isTargetMaster) {
      logSecurityAudit(caller, "MASTER_ADMIN_DISABLE_BLOCKED", "Blocked status change of Master Admin");
      Runtime.trap("Security Violation: Master Admin account cannot be deactivated.");
    };

    if (isManager) {
      let dept = switch (callerUser.department) {
        case (?d) { d };
        case (null) {
          createAuditLogInternal(callerText, "Admin Settings Access Blocked", "Manager lacks settings department assignment");
          Runtime.trap("Access denied: insufficient department permission.");
        };
      };
      let perms = switch (callerUser.permissions) {
        case (?p) { p };
        case (null) {
          createAuditLogInternal(callerText, "Admin Settings Access Blocked", "Manager lacks settings permissions");
          Runtime.trap("Access denied: insufficient department permission.");
        };
      };
      if (dept != #AdminSettings or not perms.canManageStaff or targetUser.role != #Staff) {
        createAuditLogInternal(callerText, "Admin Settings Access Blocked", "Manager lacks settings permission to manage this user.");
        Runtime.trap("Access denied: insufficient department permission.");
      };
    };

    let updatedUser : User = {
      targetUser with
      status = ?status;
    };
    users.add(principalText, updatedUser);

    logActivity(caller, "User disabled/enabled", "Updated status of " # targetUser.username # " to " # status);
  };

  public shared ({ caller }) func linkIdentityToUser(
    targetPrincipalText : Text,
    providerTypeVariant : IdentityProviderType,
    providerId : Text
  ) : async Text {
    let callerText = Principal.toText(caller);
    let adminUser = switch (findUserByPrincipalInternal(callerText)) {
      case (?u) { u };
      case (null) { Runtime.trap("Unauthorized: User not found"); };
    };

    switch (adminUser.role) {
      case (#Admin) { };
      case (#Manager) {
        let perms = switch (adminUser.permissions) {
          case (?p) { p };
          case (null) { Runtime.trap("Access denied: insufficient department permission."); };
        };
        if (not perms.canManageStaff) {
          Runtime.trap("Access denied: insufficient department permission.");
        };
      };
      case (#Staff) {
        Runtime.trap("Access denied: staff cannot link identities.");
      };
    };

    var targetKey : ?Text = null;
    var targetUser : ?User = null;

    if (users.containsKey(targetPrincipalText)) {
      targetKey := ?targetPrincipalText;
      targetUser := users.get(targetPrincipalText);
    } else {
      for (entry in users.entries()) {
        let (k, u) = entry;
        if (u.username == Text.toLower(trimWhitespace(targetPrincipalText))) {
          targetKey := ?k;
          targetUser := ?u;
        };
      };
    };

    let userObj = switch (targetUser) {
      case (?u) { u };
      case (null) { Runtime.trap("User not found: " # targetPrincipalText); };
    };
    let resolvedKey = switch (targetKey) {
      case (?k) { k };
      case (null) { Principal.toText(userObj.principalId); };
    };

    // Requirement 5: Prevent duplicate ERP user records
    // Check if providerId is already assigned as any user's primary principalId
    if (users.containsKey(providerId)) {
      Runtime.trap("Identity is already linked to another ERP user account.");
    };

    // Check if providerId is already linked to any user
    for (u in users.values()) {
      switch (u.linkedIdentities) {
        case (?identities) {
          for (id in identities.vals()) {
            if (id.providerId == providerId) {
              Runtime.trap("Identity is already linked to another ERP user account.");
            };
          };
        };
        case (null) {};
      };
    };

    let currentIdentities = switch (userObj.linkedIdentities) {
      case (?ids) { ids };
      case (null) { [] };
    };

    let newIdentity : LinkedIdentity = {
      providerType = providerTypeVariant;
      providerId;
      linkedAt = Time.now();
    };

    let updatedIdentities = Array.append<LinkedIdentity>(currentIdentities, [newIdentity]);

    let updatedUser : User = {
      userObj with
      linkedIdentities = ?updatedIdentities;
    };

    users.add(resolvedKey, updatedUser);
    logActivity(caller, "Link Identity", "Linked identity " # providerId # " to user " # userObj.name # " (" # userObj.username # ")");
    createAuditLogInternal(callerText, "Identity Linked", "Linked identity " # providerId # " to user " # userObj.username);

    "Identity linked successfully";
  };

  public shared ({ caller }) func unlinkIdentityFromUser(
    targetPrincipalText : Text,
    providerId : Text
  ) : async Text {
    let callerText = Principal.toText(caller);
    let adminUser = switch (findUserByPrincipalInternal(callerText)) {
      case (?u) { u };
      case (null) { Runtime.trap("Unauthorized: User not found"); };
    };

    switch (adminUser.role) {
      case (#Admin) { };
      case (#Manager) {
        let perms = switch (adminUser.permissions) {
          case (?p) { p };
          case (null) { Runtime.trap("Access denied: insufficient department permission."); };
        };
        if (not perms.canManageStaff) {
          Runtime.trap("Access denied: insufficient department permission.");
        };
      };
      case (#Staff) {
        Runtime.trap("Access denied: staff cannot unlink identities.");
      };
    };

    var targetKey : ?Text = null;
    var targetUser : ?User = null;

    if (users.containsKey(targetPrincipalText)) {
      targetKey := ?targetPrincipalText;
      targetUser := users.get(targetPrincipalText);
    } else {
      for (entry in users.entries()) {
        let (k, u) = entry;
        if (u.username == Text.toLower(trimWhitespace(targetPrincipalText))) {
          targetKey := ?k;
          targetUser := ?u;
        };
      };
    };

    let userObj = switch (targetUser) {
      case (?u) { u };
      case (null) { Runtime.trap("User not found: " # targetPrincipalText); };
    };
    let resolvedKey = switch (targetKey) {
      case (?k) { k };
      case (null) { Principal.toText(userObj.principalId); };
    };

    let currentIdentities = switch (userObj.linkedIdentities) {
      case (?ids) { ids };
      case (null) { [] };
    };

    var filtered : [LinkedIdentity] = [];
    for (id in currentIdentities.vals()) {
      if (id.providerId != providerId) {
        filtered := Array.append<LinkedIdentity>(filtered, [id]);
      };
    };

    let updatedUser : User = {
      userObj with
      linkedIdentities = ?filtered;
    };

    users.add(resolvedKey, updatedUser);
    logActivity(caller, "Unlink Identity", "Unlinked identity " # providerId # " from user " # userObj.name);
    createAuditLogInternal(callerText, "Identity Unlinked", "Unlinked identity " # providerId # " from user " # userObj.username);

    "Identity unlinked successfully";
  };

  public shared ({ caller }) func adminResetPassword(
    principalText : Text,
    newPrincipalId : Text,
    newPasswordHash : ?Text
  ) : async () {
    let callerText = Principal.toText(caller);
    let callerUser = switch (users.get(callerText)) {
      case (?u) { u };
      case (null) { Runtime.trap("Access denied: insufficient permissions."); };
    };

    let isCallerActive = switch (callerUser.status) {
      case (?s) { s == "Active" };
      case (null) { false };
    };
    if (not isCallerActive) {
      Runtime.trap("Access denied: caller account is inactive.");
    };

    let isMaster = switch (callerUser.role) { case (#Admin) { true }; case (_) { false } };
    let isManager = switch (callerUser.role) { case (#Manager) { true }; case (_) { false } };

    if (not isMaster and not isManager) {
      Runtime.trap("Access denied: insufficient permissions.");
    };

    if (isManager) {
      let hasPermission = switch (callerUser.permissions) {
        case (?perms) { perms.canManageStaff };
        case (null) { false };
      };
      if (not hasPermission) {
        Runtime.trap("Access denied: insufficient permissions to manage staff.");
      };
    };

    let targetUser = switch (users.get(principalText)) {
      case (?u) { u };
      case (null) { Runtime.trap("User not found"); };
    };

    let isTargetActive = switch (targetUser.status) {
      case (?s) { s == "Active" };
      case (null) { false };
    };
    if (not isTargetActive) {
      Runtime.trap("Access denied: target account is inactive.");
    };

    let isTargetMaster = switch (targetUser.role) { case (#Admin) { true }; case (_) { false } };
    if (isTargetMaster) {
      Runtime.trap("Security Violation: Cannot reset password of the Master Admin.");
    };

    if (isManager) {
      switch (targetUser.role) {
        case (#Staff) { };
        case (_) { Runtime.trap("Access denied: insufficient permissions."); };
      };
    };

    // Remove old record
    users.remove(principalText);

    // Add new record under new principal
    let newPrincipal = Principal.fromText(newPrincipalId);
    let updatedUser : User = {
      targetUser with
      principalId = newPrincipal;
      passwordHash = newPasswordHash;
      needsPasswordChange = ?true;
    };
    users.add(newPrincipalId, updatedUser);

    logSecurityAudit(caller, "ADMIN_RESET_PASSWORD", "Reset password for " # targetUser.username);
  };

  func stripSpaces(t : Text) : Text {
    var result : Text = "";
    for (char in t.chars()) {
      if (char != ' ') {
        result := result # Text.fromChar(char);
      };
    };
    result
  };

  public shared ({ caller }) func resetPasswordWithVerification(
    username : Text,
    email : Text,
    mobile : Text,
    newPasswordHash : Text,
    newPrincipalId : Text
  ) : async { success : Bool; message : Text } {
    logSecurityAudit(caller, "PASSWORD_RESET_ATTEMPT_NEUTRALIZED", "Anonymous recovery attempt received");
    return {
      success = false;
      message = "If account details are valid, recovery will continue.";
    };
  };

  public shared ({ caller }) func logUserAction(action : Text, details : Text) : async () {
    let callerText = Principal.toText(caller);
    if (not users.containsKey(callerText)) {
      Runtime.trap("Unauthorized");
    };
    logActivity(caller, action, details);
  };

  public query ({ caller }) func getUsers() : async [User] {
    let user = checkPermissions(caller, [#AdminSettings], #canManageStaff);
    users.values().toArray();
  };

  public query ({ caller }) func getActivityLogs() : async [ActivityLog] {
    let user = checkPermissions(caller, [#AdminSettings], #canViewLogs);
    List.toArray<ActivityLog>(activityLogs);
  };

  // Invoice Operations
  public query ({ caller }) func getNextInvoiceNumber() : async Text {
    let user = checkPermissions(caller, [#Sales, #Finance], #canView);
    let nextId = lastInvoiceId + 1;
    "INV-" # nextId.toText();
  };

  public shared ({ caller }) func saveInvoice(
    businessInfo : BusinessInfo,
    customerInfo : CustomerInfo,
    products : [Product],
    totalAmount : Float,
    paidAmount : Float,
  ) : async Text {
    let user = checkPermissions(caller, [#Sales], #canCreate);
    let callerText = Principal.toText(caller);

    let id = lastInvoiceId + 1;
    let invoiceNumber = "INV-" # id.toText();

    let invoice : InternalInvoice = {
      id;
      invoiceNumber;
      date = Time.now();
      businessInfo;
      customerInfo;
      products = List.fromArray<Product>(products);
      totalAmount;
      paidAmount;
      creatorPrincipal = callerText;
      creatorName = user.name;
      previousBalanceAtCreation = null;
      advanceBalanceAtCreation = null;
      currentInvoiceTotalAtCreation = null;
      totalPayableAtCreation = null;
      paidAmountAtCreation = null;
      finalDueAtCreation = null;
    };

    invoices.add(id, invoice);
    lastInvoiceId := id;

    // Deduct stock for saved products & raw materials from BOM
    for (p in products.vals()) {
      adjustStockForProduct(p.0, -Int.fromNat(p.1));

      let fgId = lastFinishedGoodsLogId + 1;
      let fgLog : FinishedGoodsLog = {
        id = fgId;
        date = Time.now();
        productName = p.0;
        quantity = fromNatToFloat(p.1);
        logType = "Sold";
        reason = "Invoice " # invoiceNumber;
        userName = user.name;
      };
      finishedGoodsLogsList.add(fgId, fgLog);
      lastFinishedGoodsLogId := fgId;
      let pipeIndex = indexOf(p.0, '|');
      let vigatToMatch = switch (pipeIndex) {
        case (?idx) { subText(p.0, 0, idx) };
        case (null) { p.0 };
      };

      switch (productsList.get(vigatToMatch)) {
        case (?prod) {
          for (bomReq in prod.bom.vals()) {
            let qtyToConsume = bomReq.quantity * fromNatToFloat(p.1);
            switch (rawMaterialsList.get(bomReq.materialId)) {
              case (?m) {
                let updatedMat : RawMaterial = {
                  m with
                  consumedQty = m.consumedQty + qtyToConsume;
                  currentStock = m.currentStock - qtyToConsume;
                };
                rawMaterialsList.add(bomReq.materialId, updatedMat);

                lastConsumptionId := lastConsumptionId + 1;
                let logEntry : MaterialConsumptionEntry = {
                  id = lastConsumptionId;
                  date = Time.now();
                  finishedGoodId = prod.id;
                  finishedGoodName = prod.vigat;
                  invoiceNumber = invoiceNumber;
                  materialId = m.id;
                  materialName = m.name;
                  quantityConsumed = qtyToConsume;
                };
                List.add<MaterialConsumptionEntry>(consumptionHistory, logEntry);
              };
              case (null) { };
            };
          };
        };
        case (null) { };
      };
    };

    // Auto register customer
    autoRegisterCustomer(customerInfo.name, customerInfo.businessAddress, customerInfo.taxId);

    logActivity(caller, "Create Invoice", "Created invoice " # invoiceNumber # " for " # customerInfo.name);

    invoiceNumber;
  };

  public query ({ caller }) func getInvoices() : async [Invoice] {
    let user = checkPermissions(caller, [#Sales, #Finance], #canView);

    let invoiceValues = invoices.values().toArray();
    let sortedInvoices = invoiceValues.sort(
      compareInvoicesByDate
    );

    sortedInvoices.map(
      func(internalInvoice) {
        {
          internalInvoice with
          products = internalInvoice.products.toArray()
        };
      }
    );
  };

  public query ({ caller }) func getInvoiceById(id : Nat) : async Invoice {
    let user = checkPermissions(caller, [#Sales, #Finance], #canView);

    switch (invoices.get(id)) {
      case (?internalInvoice) {
        {
          internalInvoice with
          products = internalInvoice.products.toArray()
        };
      };
      case (null) {
        Runtime.trap("Invoice not found");
      };
    };
  };

  public shared ({ caller }) func deleteInvoice(id : Nat) : async () {
    let user = checkPermissions(caller, [#Sales], #canDelete);
    let callerText = Principal.toText(caller);

    switch (invoices.get(id)) {
      case (?existingInvoice) {
        // Revert stock for deleted products and raw materials
        let productsArray = existingInvoice.products.toArray();
        for (p in productsArray.vals()) {
          adjustStockForProduct(p.0, Int.fromNat(p.1));

          let fgId = lastFinishedGoodsLogId + 1;
          let fgLog : FinishedGoodsLog = {
            id = fgId;
            date = Time.now();
            productName = p.0;
            quantity = fromNatToFloat(p.1);
            logType = "Returned";
            reason = "Invoice " # existingInvoice.invoiceNumber # " Deleted";
            userName = user.name;
          };
          finishedGoodsLogsList.add(fgId, fgLog);
          lastFinishedGoodsLogId := fgId;

          let pipeIndex = indexOf(p.0, '|');
          let vigatToMatch = switch (pipeIndex) {
            case (?idx) { subText(p.0, 0, idx) };
            case (null) { p.0 };
          };

          switch (productsList.get(vigatToMatch)) {
            case (?prod) {
              for (bomReq in prod.bom.vals()) {
                let qtyToConsume = bomReq.quantity * fromNatToFloat(p.1);
                switch (rawMaterialsList.get(bomReq.materialId)) {
                  case (?m) {
                    let updatedMat : RawMaterial = {
                      m with
                      consumedQty = m.consumedQty - qtyToConsume;
                      currentStock = m.currentStock + qtyToConsume;
                    };
                    rawMaterialsList.add(bomReq.materialId, updatedMat);
                  };
                  case (null) { };
                };
              };
            };
            case (null) { };
          };
        };

        invoices.remove(id);
        logActivity(caller, "Delete Invoice", "Deleted invoice " # existingInvoice.invoiceNumber);
        createAuditLogInternal(callerText, "Invoice Deleted", "Deleted invoice " # existingInvoice.invoiceNumber);
      };
      case (null) {
        Runtime.trap("Invoice not found");
      };
    };
  };

  public shared ({ caller }) func updateInvoice(
    id : Nat,
    businessInfo : BusinessInfo,
    customerInfo : CustomerInfo,
    products : [Product],
    totalAmount : Float,
    paidAmount : Float,
  ) : async () {
    let user = checkPermissions(caller, [#Sales], #canEdit);
    let callerText = Principal.toText(caller);

    switch (invoices.get(id)) {
      case (?existingInvoice) {
        // Revert old stock for finished products and raw materials
        let oldProductsArray = existingInvoice.products.toArray();
        for (p in oldProductsArray.vals()) {
          adjustStockForProduct(p.0, Int.fromNat(p.1));

          let fgId = lastFinishedGoodsLogId + 1;
          let fgLog : FinishedGoodsLog = {
            id = fgId;
            date = Time.now();
            productName = p.0;
            quantity = fromNatToFloat(p.1);
            logType = "Returned";
            reason = "Invoice " # existingInvoice.invoiceNumber # " Updated (Revert)";
            userName = user.name;
          };
          finishedGoodsLogsList.add(fgId, fgLog);
          lastFinishedGoodsLogId := fgId;

          let pipeIndex = indexOf(p.0, '|');
          let vigatToMatch = switch (pipeIndex) {
            case (?idx) { subText(p.0, 0, idx) };
            case (null) { p.0 };
          };

          switch (productsList.get(vigatToMatch)) {
            case (?prod) {
              for (bomReq in prod.bom.vals()) {
                let qtyToConsume = bomReq.quantity * fromNatToFloat(p.1);
                switch (rawMaterialsList.get(bomReq.materialId)) {
                  case (?m) {
                    let updatedMat : RawMaterial = {
                      m with
                      consumedQty = m.consumedQty - qtyToConsume;
                      currentStock = m.currentStock + qtyToConsume;
                    };
                    rawMaterialsList.add(bomReq.materialId, updatedMat);
                  };
                  case (null) { };
                };
              };
            };
            case (null) { };
          };
        };

        // Deduct new stock for finished products and raw materials from BOM
        for (p in products.vals()) {
          adjustStockForProduct(p.0, -Int.fromNat(p.1));

          let fgId = lastFinishedGoodsLogId + 1;
          let fgLog : FinishedGoodsLog = {
            id = fgId;
            date = Time.now();
            productName = p.0;
            quantity = fromNatToFloat(p.1);
            logType = "Sold";
            reason = "Invoice " # existingInvoice.invoiceNumber # " Updated (New)";
            userName = user.name;
          };
          finishedGoodsLogsList.add(fgId, fgLog);
          lastFinishedGoodsLogId := fgId;

          let pipeIndex = indexOf(p.0, '|');
          let vigatToMatch = switch (pipeIndex) {
            case (?idx) { subText(p.0, 0, idx) };
            case (null) { p.0 };
          };

          switch (productsList.get(vigatToMatch)) {
            case (?prod) {
              for (bomReq in prod.bom.vals()) {
                let qtyToConsume = bomReq.quantity * fromNatToFloat(p.1);
                switch (rawMaterialsList.get(bomReq.materialId)) {
                  case (?m) {
                    let updatedMat : RawMaterial = {
                      m with
                      consumedQty = m.consumedQty + qtyToConsume;
                      currentStock = m.currentStock - qtyToConsume;
                    };
                    rawMaterialsList.add(bomReq.materialId, updatedMat);

                    lastConsumptionId := lastConsumptionId + 1;
                    let logEntry : MaterialConsumptionEntry = {
                      id = lastConsumptionId;
                      date = Time.now();
                      finishedGoodId = prod.id;
                      finishedGoodName = prod.vigat;
                      invoiceNumber = existingInvoice.invoiceNumber;
                      materialId = m.id;
                      materialName = m.name;
                      quantityConsumed = qtyToConsume;
                    };
                    List.add<MaterialConsumptionEntry>(consumptionHistory, logEntry);
                  };
                  case (null) { };
                };
              };
            };
            case (null) { };
          };
        };

        // Auto register customer
        autoRegisterCustomer(customerInfo.name, customerInfo.businessAddress, customerInfo.taxId);

        let updatedInvoice : InternalInvoice = {
          id = existingInvoice.id;
          invoiceNumber = existingInvoice.invoiceNumber;
          date = Time.now();
          businessInfo;
          customerInfo;
          products = List.fromArray<Product>(products);
          totalAmount;
          paidAmount;
          creatorPrincipal = existingInvoice.creatorPrincipal;
          creatorName = existingInvoice.creatorName;
          previousBalanceAtCreation = existingInvoice.previousBalanceAtCreation;
          advanceBalanceAtCreation = existingInvoice.advanceBalanceAtCreation;
          currentInvoiceTotalAtCreation = existingInvoice.currentInvoiceTotalAtCreation;
          totalPayableAtCreation = existingInvoice.totalPayableAtCreation;
          paidAmountAtCreation = existingInvoice.paidAmountAtCreation;
          finalDueAtCreation = existingInvoice.finalDueAtCreation;
        };

        invoices.add(id, updatedInvoice);

        logActivity(caller, "Update Invoice", "Updated invoice " # existingInvoice.invoiceNumber);
      };
      case (null) {
        Runtime.trap("Invoice not found");
      };
    };
  };

  // Product Operations
  public query ({ caller }) func getProducts() : async [ProductItem] {
    let user = checkPermissions(caller, [#Inventory, #Sales, #Production, #Finance], #canView);
    productsList.values().toArray();
  };

  public shared ({ caller }) func saveProduct(id : Text, vigat : Text, rate : Float, hsnCode : Text, stock : Int, productionCost : Float, bom : [BOMRequirement]) : async () {
    let callerText = Principal.toText(caller);
    let oldStock = switch (productsList.get(id)) {
      case (?p) { p.stock };
      case (null) { 0 };
    };
    let requiredToggle : PermissionKey = if (oldStock != stock) { #canAdjustStock } else { #canEdit };
    let user = checkPermissions(caller, [#Inventory, #Production, #Finance], requiredToggle);
    let product : ProductItem = {
      id;
      vigat;
      rate;
      hsnCode;
      stock;
      productionCost;
      bom;
      openingStock = switch (productsList.get(id)) {
        case (?existing) { existing.openingStock };
        case (null) { ?stock };
      };
    };
    if (not productsList.containsKey(id)) {
      productCount := productCount + 1;
    };
    if (oldStock != stock) {
      createAuditLogInternal(callerText, "Stock Adjusted", "Adjusted stock for product " # vigat # " from " # Int.toText(oldStock) # " to " # Int.toText(stock));
    };

    productsList.add(id, product);
    logActivity(caller, "Save Product", "Saved product " # vigat # " (Stock: " # Int.toText(stock) # ", Cost: " # debugShow(productionCost) # ")");
  };

  public shared ({ caller }) func deleteProduct(id : Text) : async () {
    let user = checkPermissions(caller, [#Inventory], #canDelete);
    let callerText = Principal.toText(caller);
    switch (productsList.get(id)) {
      case (?prod) {
        productsList.remove(id);
        productCount := productCount - 1;
        logActivity(caller, "Delete Product", "Deleted product " # prod.vigat);
      };
      case (null) {
        Runtime.trap("Product not found");
      };
    };
  };

  // Customer Operations
  public query ({ caller }) func getCustomers() : async [CustomerItem] {
    let user = checkPermissions(caller, [#Sales, #Finance], #canView);
    customersList.values().toArray();
  };

  public shared ({ caller }) func saveCustomer(id : Text, name : Text, businessAddress : Text, phone : Text, gstNo : Text) : async () {
    let user = checkPermissions(caller, [#Sales, #Finance], #canCreate);
    let customer : CustomerItem = {
      id;
      name;
      businessAddress;
      phone;
      gstNo;
    };
    if (not customersList.containsKey(id)) {
      customerCount := customerCount + 1;
    };
    customersList.add(id, customer);
    logActivity(caller, "Save Customer", "Saved customer " # name);
  };

  public shared ({ caller }) func deleteCustomer(id : Text) : async () {
    let user = checkPermissions(caller, [#Sales], #canDelete);
    switch (customersList.get(id)) {
      case (?cust) {
        customersList.remove(id);
        customerCount := customerCount - 1;
        logActivity(caller, "Delete Customer", "Deleted customer " # cust.name);
      };
      case (null) {
        Runtime.trap("Customer not found");
      };
    };
  };

  public shared ({ caller }) func saveSettings(
    businessInfo : BusinessInfo,
    defaultGstRate : Float,
    termsAndConditions : Text,
    allowStaffCollection : Bool,
    enableRejectedWage : Bool,
    companyLogo : ?Text,
    companyName : ?Text,
    themeColors : ?Text,
    sidebarStyle : ?Text,
    allowAdminBackupRestore : ?Bool
  ) : async () {
    let user = checkPermissions(caller, [#AdminSettings], #canEdit);
    let callerText = Principal.toText(caller);

    settings := ?{
      businessInfo;
      defaultGstRate;
      termsAndConditions;
      allowStaffCollection;
      enableRejectedWage;
      companyLogo;
      companyName;
      themeColors;
      sidebarStyle;
      allowAdminBackupRestore;
    };

    logActivity(caller, "Update Settings", "Updated business settings");
    createAuditLogInternal(callerText, "Settings Changed", "Updated system and business settings");
  };

  public query ({ caller }) func getSettings() : async Settings {
    let callerText = Principal.toText(caller);
    if (not users.containsKey(callerText)) {
      Runtime.trap("Access denied: insufficient permissions.");
    };

    switch (settings) {
      case (?currentSettings) { currentSettings };
      case (null) {
        {
          businessInfo = "";
          defaultGstRate = 0.0;
          termsAndConditions = "";
          allowStaffCollection = true;
          enableRejectedWage = false;
          companyLogo = null;
          companyName = null;
          themeColors = null;
          sidebarStyle = null;
          allowAdminBackupRestore = ?false;
        };
      };
    };
  };

  public query ({ caller }) func getDashboardStats() : async DashboardStats {
    let user = checkPermissions(caller, [#Sales, #Finance, #Purchase, #Inventory], #canView);

    let allInvoices = invoices.values().toArray();

    let today = Time.now() / (24 * 60 * 60 * 1000000000);

    let todayInvoices = allInvoices.filter(
      func(invoice) {
        let invoiceDay = invoice.date / (24 * 60 * 60 * 1000000000);
        invoiceDay == today;
      }
    );

    let todayInvoiceCount = todayInvoices.size();
    let todayTotalSales = todayInvoices.foldLeft(
      0.0,
      func(acc, invoice) {
        acc + invoice.totalAmount;
      },
    );

    let allTimeInvoiceCount = allInvoices.size();
    let allTimeTotalSales = allInvoices.foldLeft(
      0.0,
      func(acc, invoice) {
        acc + invoice.totalAmount;
      },
    );

    // Compute totalOutstandingAmount
    let totalOutstandingAmount = allInvoices.foldLeft(
      0.0,
      func(acc, invoice) {
        acc + (invoice.totalAmount - invoice.paidAmount);
      },
    );

    // Compute overdueInvoiceCount (invoice is unpaid/partially paid and older than 30 days)
    let thirtyDaysAgo = Time.now() - (30 * 24 * 60 * 60 * 1000000000);
    let overdueInvoices = allInvoices.filter(
      func(invoice) {
        (invoice.paidAmount < invoice.totalAmount) and (invoice.date < thirtyDaysAgo);
      }
    );
    let overdueInvoiceCount = overdueInvoices.size();

    // Compute todayCollections: sum of all payments collected today
    let allPayments = paymentsList.values().toArray();
    let todayPayments = allPayments.filter(
      func(payment) {
        let paymentDay = payment.date / (24 * 60 * 60 * 1000000000);
        paymentDay == today;
      }
    );
    let todayCollections = todayPayments.foldLeft(
      0.0,
      func(acc, payment) {
        acc + payment.amount;
      },
    );

    // Compute customersWithOutstanding
    let allCustomers = customersList.values().toArray();
    var outstandingCustomersCount = 0;
    for (cust in allCustomers.vals()) {
      let custInvoices = allInvoices.filter(func(inv) { inv.customerInfo.name == cust.name });
      let custOutstanding = custInvoices.foldLeft(0.0, func(acc, inv) { acc + (inv.totalAmount - inv.paidAmount) });
      if (custOutstanding > 0.0) {
        outstandingCustomersCount := outstandingCustomersCount + 1;
      };
    };
    let customersWithOutstanding = outstandingCustomersCount;

    // Compute ERP Dashboard Stats:
    let allPurchases = purchasesList.values().toArray();
    let totalPurchases = allPurchases.foldLeft(
      0.0,
      func(acc, p) { acc + p.totalAmount }
    );

    let vendorDue = allPurchases.foldLeft(
      0.0,
      func(acc, p) { acc + (p.totalAmount - p.paidAmount) }
    );

    let allMaterials = rawMaterialsList.values().toArray();
    let rawMaterialsVal = allMaterials.foldLeft(
      0.0,
      func(acc, m) { acc + (m.currentStock * m.unitCost) }
    );
    let allProds = productsList.values().toArray();
    let finishedGoodsVal = allProds.foldLeft(
      0.0,
      func(acc, p) { acc + (Float.fromInt(p.stock) * p.productionCost) }
    );
    let stockValue = rawMaterialsVal + finishedGoodsVal;

    var totalCogs = 0.0;
    for (inv in allInvoices.vals()) {
      let invProds = inv.products.toArray();
      for (p in invProds.vals()) {
        let vigatToMatch = switch (indexOf(p.0, '|')) {
          case (?idx) { subText(p.0, 0, idx) };
          case (null) { p.0 };
        };
        switch (productsList.get(vigatToMatch)) {
          case (?prod) {
            totalCogs := totalCogs + (fromNatToFloat(p.1) * prod.productionCost);
          };
          case (null) { };
        };
      };
    };

    let allExpenses = expensesList.values().toArray();
    let totalExpenses = allExpenses.foldLeft(
      0.0,
      func(acc, e) { acc + e.amount }
    );

    let totalProfit = allTimeTotalSales - totalCogs - totalExpenses;

    let gstRate = switch (settings) {
      case (?s) { s.defaultGstRate };
      case (null) { 5.0 };
    };
    let totalOutputGst = allTimeTotalSales * gstRate / (100.0 + gstRate);

    var totalInputGst = 0.0;
    for (p in allPurchases.vals()) {
      for (item in p.items.vals()) {
        totalInputGst := totalInputGst + (item.amount * item.gstPercent / (100.0 + item.gstPercent));
      };
    };
    let totalGst = totalOutputGst - totalInputGst;

    {
      todayInvoiceCount;
      todayTotalSales;
      allTimeInvoiceCount;
      allTimeTotalSales;
      totalOutstandingAmount;
      customersWithOutstanding;
      overdueInvoiceCount;
      todayCollections;
      totalPurchases;
      totalProfit;
      totalGst;
      vendorDue;
      stockValue;
    };
  };

  public shared ({ caller }) func collectPayment(customerId : Text, amount : Float, notes : Text) : async () {
    let user = checkPermissions(caller, [#Sales, #Finance], #canCreate);
    let callerText = Principal.toText(caller);

    var remaining = amount;
    let allInvoices = invoices.values().toArray();
    
    let sortedInvoices = allInvoices.sort(compareInvoicesByDateAscending);

    for (inv in sortedInvoices.vals()) {
      if (remaining <= 0.0) {
        // Handled all remaining amount
      } else {
        if (inv.customerInfo.name == customerId) {
          let due = inv.totalAmount - inv.paidAmount;
          if (due > 0.0) {
            let apply = if (remaining < due) { remaining } else { due };
            
            let updatedInvoice : InternalInvoice = {
              inv with
              paidAmount = inv.paidAmount + apply;
            };
            invoices.add(inv.id, updatedInvoice);

            let paymentId = lastPaymentId + 1;
            let payment : Payment = {
              id = paymentId;
              customerId;
              invoiceNumber = inv.invoiceNumber;
              amount = apply;
              date = Time.now();
              notes = "Later Collection: " # notes;
            };
            paymentsList.add(paymentId, payment);
            lastPaymentId := paymentId;

            remaining := remaining - apply;
          };
        };
      };
    };

    if (remaining > 0.0) {
      let paymentId = lastPaymentId + 1;
      let payment : Payment = {
        id = paymentId;
        customerId;
        invoiceNumber = "Account Overpayment";
        amount = remaining;
        date = Time.now();
        notes = "Excess Collection: " # notes;
      };
      paymentsList.add(paymentId, payment);
      lastPaymentId := paymentId;
    };

    logActivity(caller, "Collect Payment", "Collected ₹" # debugShow(amount) # " from " # customerId);
  };

  public query ({ caller }) func getPayments() : async [Payment] {
    let user = checkPermissions(caller, [#Sales, #Finance], #canView);
    paymentsList.values().toArray();
  };

  public query ({ caller }) func getPaymentsByCustomer(customerId : Text) : async [Payment] {
    let user = checkPermissions(caller, [#Sales, #Finance], #canView);
    let allPayments = paymentsList.values().toArray();
    allPayments.filter(func(p) { p.customerId == customerId });
  };

  // Raw Material endpoints
  public query ({ caller }) func getRawMaterials() : async [RawMaterial] {
    let user = checkPermissions(caller, [#Inventory, #Purchase, #Production, #Finance], #canView);
    rawMaterialsList.values().toArray();
  };

  public shared ({ caller }) func saveRawMaterial(
    id : Text,
    name : Text,
    category : Text,
    openingStock : Float,
    unitCost : Float,
    unit : Text,
    minStock : Float
  ) : async () {
    let callerText = Principal.toText(caller);
    let oldStock = switch (rawMaterialsList.get(id)) {
      case (?m) { m.currentStock };
      case (null) { 0.0 };
    };
    let currentMaterial = rawMaterialsList.get(id);
    let purchased = switch (currentMaterial) {
      case (?m) { m.purchasedQty };
      case (null) { 0.0 };
    };
    let consumed = switch (currentMaterial) {
      case (?m) { m.consumedQty };
      case (null) { 0.0 };
    };
    let currentStock = openingStock + purchased - consumed;

    let requiredToggle : PermissionKey = if (oldStock != currentStock) { #canAdjustStock } else { #canEdit };
    let user = checkPermissions(caller, [#Inventory, #Purchase], requiredToggle);

    let material : RawMaterial = {
      id;
      name;
      category;
      openingStock;
      purchasedQty = purchased;
      consumedQty = consumed;
      currentStock;
      unitCost;
      unit;
      minStockAlert = minStock;
    };

    if (oldStock != currentStock) {
      createAuditLogInternal(callerText, "Stock Adjusted", "Adjusted stock for raw material " # name # " from " # debugShow(oldStock) # " to " # debugShow(currentStock));
    };

    rawMaterialsList.add(id, material);
    logActivity(caller, "Save Raw Material", "Saved raw material " # name # " (Stock: " # debugShow(currentStock) # ")");
  };

  public shared ({ caller }) func deleteRawMaterial(id : Text) : async () {
    let user = checkPermissions(caller, [#Inventory], #canDelete);
    let callerText = Principal.toText(caller);
    switch (rawMaterialsList.get(id)) {
      case (?m) {
        rawMaterialsList.remove(id);
        logActivity(caller, "Delete Raw Material", "Deleted raw material " # m.name);
      };
      case (null) {
        Runtime.trap("Material not found");
      };
    };
  };

  // Purchase endpoints
  public query ({ caller }) func getPurchases() : async [Purchase] {
    let user = checkPermissions(caller, [#Purchase, #Finance], #canView);
    purchasesList.values().toArray();
  };

  public shared ({ caller }) func savePurchase(
    purchaseNumber : Text,
    vendorName : Text,
    vendorMobile : Text,
    vendorGstNumber : Text,
    vendorAddress : Text,
    items : [PurchaseItem],
    totalAmount : Float,
    paidAmount : Float,
  ) : async Text {
    let user = checkPermissions(caller, [#Purchase], #canCreate);
    let callerText = Principal.toText(caller);

    let id = lastPurchaseId + 1;

    let purchase : Purchase = {
      id;
      purchaseNumber;
      date = Time.now();
      vendorName;
      vendorMobile;
      vendorGstNumber;
      vendorAddress;
      items;
      totalAmount;
      paidAmount;
    };

    purchasesList.add(id, purchase);
    lastPurchaseId := id;

    // Adjust raw material stock
    for (item in items.vals()) {
      switch (rawMaterialsList.get(item.materialId)) {
        case (?m) {
          let updated : RawMaterial = {
            m with
            purchasedQty = m.purchasedQty + item.quantity;
            currentStock = m.currentStock + item.quantity;
            unitCost = item.rate; // Update unit cost with latest purchase rate
          };
          rawMaterialsList.add(item.materialId, updated);
        };
        case (null) {
          let newMaterial : RawMaterial = {
            id = item.materialId;
            name = item.materialId;
            category = "General";
            openingStock = 0.0;
            purchasedQty = item.quantity;
            consumedQty = 0.0;
            currentStock = item.quantity;
            unitCost = item.rate;
            unit = item.unit;
            minStockAlert = 0.0;
          };
          rawMaterialsList.add(item.materialId, newMaterial);
        };
      };
    };

    logActivity(caller, "Create Purchase", "Created purchase " # purchaseNumber # " from " # vendorName);
    purchaseNumber;
  };

  public shared ({ caller }) func deletePurchase(id : Nat) : async () {
    let user = checkPermissions(caller, [#Purchase], #canDelete);
    let callerText = Principal.toText(caller);

    switch (purchasesList.get(id)) {
      case (?p) {
        // Revert raw material stock
        for (item in p.items.vals()) {
          switch (rawMaterialsList.get(item.materialId)) {
            case (?m) {
              let updated : RawMaterial = {
                m with
                purchasedQty = m.purchasedQty - item.quantity;
                currentStock = m.currentStock - item.quantity;
              };
              rawMaterialsList.add(item.materialId, updated);
            };
            case (null) { };
          };
        };

        purchasesList.remove(id);
        logActivity(caller, "Delete Purchase", "Deleted purchase " # p.purchaseNumber);
      };
      case (null) {
        Runtime.trap("Purchase not found");
      };
    };
  };

  // Expenses endpoints
  public shared ({ caller }) func saveExpense(category : Text, amount : Float, description : Text) : async Nat {
    let user = checkPermissions(caller, [#Finance], #canCreate);
    let callerText = Principal.toText(caller);

    let id = lastExpenseId + 1;
    let expense : Expense = {
      id;
      date = Time.now();
      category;
      amount;
      description;
    };

    expensesList.add(id, expense);
    lastExpenseId := id;

    logActivity(caller, "Create Expense", "Recorded expense of ₹" # debugShow(amount) # " in category " # category);
    id;
  };

  public query ({ caller }) func getExpenses() : async [Expense] {
    let user = checkPermissions(caller, [#Finance], #canView);
    expensesList.values().toArray();
  };

  public shared ({ caller }) func deleteExpense(id : Nat) : async () {
    let user = checkPermissions(caller, [#Finance], #canDelete);
    let callerText = Principal.toText(caller);

    switch (expensesList.get(id)) {
      case (?e) {
        expensesList.remove(id);
        logActivity(caller, "Delete Expense", "Deleted expense ID: " # id.toText());
      };
      case (null) {
        Runtime.trap("Expense not found");
      };
    };
  };

  // Vendor payment endpoints
  public shared ({ caller }) func collectVendorPayment(vendorName : Text, amount : Float, notes : Text) : async () {
    let user = checkPermissions(caller, [#Purchase, #Finance], #canCreate);
    let callerText = Principal.toText(caller);

    var remaining = amount;
    let allPurchases = purchasesList.values().toArray();
    let sortedPurchases = allPurchases.sort(func(a, b) { Int.compare(a.date, b.date) });

    for (p in sortedPurchases.vals()) {
      if (remaining <= 0.0) {
        // done
      } else {
        if (p.vendorName == vendorName) {
          let due = p.totalAmount - p.paidAmount;
          if (due > 0.0) {
            let apply = if (remaining < due) { remaining } else { due };
            
            let updatedPurchase : Purchase = {
              p with
              paidAmount = p.paidAmount + apply;
            };
            purchasesList.add(p.id, updatedPurchase);

            let paymentId = lastVendorPaymentId + 1;
            let payment : VendorPayment = {
              id = paymentId;
              vendorName;
              purchaseNumber = p.purchaseNumber;
              amount = apply;
              date = Time.now();
              notes = "Later Payment: " # notes;
            };
            vendorPaymentsList.add(paymentId, payment);
            lastVendorPaymentId := paymentId;

            remaining := remaining - apply;
          };
        };
      };
    };

    if (remaining > 0.0) {
      let paymentId = lastVendorPaymentId + 1;
      let payment : VendorPayment = {
        id = paymentId;
        vendorName;
        purchaseNumber = "Account Overpayment";
        amount = remaining;
        date = Time.now();
        notes = "Excess Payment: " # notes;
      };
      vendorPaymentsList.add(paymentId, payment);
      lastVendorPaymentId := paymentId;
    };

    logActivity(caller, "Collect Vendor Payment", "Paid ₹" # debugShow(amount) # " to " # vendorName);
  };

  public query ({ caller }) func getVendorPayments() : async [VendorPayment] {
    let user = checkPermissions(caller, [#Purchase, #Finance], #canView);
    vendorPaymentsList.values().toArray();
  };

  public query ({ caller }) func getMaterialConsumptionHistory() : async [MaterialConsumptionEntry] {
    let user = checkPermissions(caller, [#Inventory, #Production, #Finance], #canView);
    List.toArray<MaterialConsumptionEntry>(consumptionHistory);
  };

  // --- Employee Work & Production System ---

  public query ({ caller }) func getEmployees() : async [Employee] {
    let user = checkPermissions(caller, [#Production], #canView);
    employeesList.values().toArray();
  };

  public shared ({ caller }) func saveEmployee(
    id : Text,
    name : Text,
    mobile : Text,
    address : Text,
    joiningDate : Time.Time,
    skillType : Text,
    status : Text
  ) : async Text {
    let user = checkPermissions(caller, [#Production], #canCreate);
    let callerText = Principal.toText(caller);

    let emp : Employee = {
      id;
      name;
      mobile;
      address;
      joiningDate;
      skillType;
      status;
    };

    if (not employeesList.containsKey(id)) {
      employeeCount := employeeCount + 1;
    };
    employeesList.add(id, emp);
    logActivity(caller, "Save Employee", "Saved employee: " # name # " (ID: " # id # ")");
    id;
  };

  public shared ({ caller }) func deleteEmployee(id : Text) : async () {
    let user = checkPermissions(caller, [#Production], #canDelete);
    let callerText = Principal.toText(caller);

    switch (employeesList.get(id)) {
      case (?emp) {
        employeesList.remove(id);
        employeeCount := employeeCount - 1;
        logActivity(caller, "Delete Employee", "Deleted employee: " # emp.name # " (" # id # ")");
      };
      case (null) {
        Runtime.trap("Employee not found");
      };
    };
  };

  public query ({ caller }) func getJobWorks() : async [JobWork] {
    let callerText = Principal.toText(caller);
    let callerUser = switch (users.get(callerText)) {
      case (?u) { u };
      case (null) { Runtime.trap("Access denied: insufficient permissions."); };
    };

    let allJobs = jobWorksList.values().toArray();
    switch (callerUser.role) {
      case (#Admin) { allJobs };
      case (#Manager) {
        let user = checkPermissions(caller, [#Production], #canView);
        allJobs;
      };
      case (#Staff) {
        let user = checkPermissions(caller, [#Staff], #canView);
        allJobs.filter(func(j) { j.employeeName == user.name });
      };
    };
  };

  public shared ({ caller }) func saveJobWork(
    jobDate : Time.Time,
    employeeName : Text,
    mobileNumber : Text,
    productName : Text,
    productCode : Text,
    hsnCode : Text,
    qtyGiven : Float,
    ratePerPiece : Float,
    expectedReturnDate : Time.Time,
    remarks : Text,
    customerOrderLink : ?CustomerOrderLink
  ) : async Nat {
    let user = checkPermissions(caller, [#Production], #canCreate);
    let callerText = Principal.toText(caller);
    let roleText = switch (user.role) {
      case (#Admin) { "Master Admin" };
      case (#Manager) { "Admin" };
      case (#Staff) { "Staff" };
    };

    let id = lastJobWorkId + 1;
    let job : JobWork = {
      id;
      jobDate;
      employeeName;
      mobileNumber;
      productName;
      productCode;
      hsnCode;
      qtyGiven;
      ratePerPiece;
      expectedReturnDate;
      remarks;
      status = "Given";
      collectedQty = 0.0;
      rejectedQty = 0.0;
      acceptedQty = 0.0;
      customerOrderLink;
      totalCollectedQty = null;
      totalRejectedQty = null;
      totalAcceptedQty = null;
      createdByUserId = ?callerText;
      createdByUsername = ?user.username;
      createdByFullName = ?user.name;
      createdByRole = ?roleText;
      updatedByUserId = ?callerText;
      updatedByUsername = ?user.username;
      updatedByFullName = ?user.name;
      updatedByRole = ?roleText;
      lastUpdated = ?jobDate;
      lastAction = ?"Created Job Work";
      lastActionBy = ?user.name;
      lastActionRole = ?roleText;
    };

    jobWorksList.add(id, job);
    lastJobWorkId := id;

    // Log Activity
    logActivity(caller, "Create Job", "Created job JW-" # id.toText() # " for employee " # employeeName);

    // Create System Audit Log
    createAuditLogInternal(callerText, "Job Created", "Created job JW-" # id.toText() # " for employee " # employeeName);

    // Initial Ledger Entry
    createLedgerEntryInternal(
      employeeName,
      id,
      jobDate,
      productName,
      qtyGiven,
      0.0,
      0.0,
      qtyGiven,
      ratePerPiece,
      0.0,
      0.0,
      0.0,
      "Given"
    );

    id;
  };

  public shared ({ caller }) func updateJobWorkProgress(
    jobId : Nat,
    completedQty : Float,
    remarks : Text
  ) : async () {
    Runtime.trap("Unauthorized: Work progress can only be updated via the Collections Module.");
  };

  public shared ({ caller }) func saveCollectionEntry(
    jobWorkNo : Nat,
    todayCollectedQty : Float,
    rejectedQty : Float,
    remarks : Text
  ) : async Nat {
    let callerText = Principal.toText(caller);
    let user = switch (users.get(callerText)) {
      case (?u) { u };
      case (null) { Runtime.trap("Access denied: insufficient department permission."); };
    };

    let job = switch (jobWorksList.get(jobWorkNo)) {
      case (?j) { j };
      case (null) { Runtime.trap("Job work not found") };
    };

    if (user.role == #Staff) {
      let u = checkPermissions(caller, [#Staff], #canCreate);
      let allowed = switch (settings) {
        case (?s) { s.allowStaffCollection };
        case (null) { true };
      };
      if (not allowed) {
        createAuditLogInternal(callerText, "Staff Access Blocked", "Staff tried recording collection but staff collections are disabled.");
        Runtime.trap("Access denied: insufficient department permission.");
      };
      // Staff can only collect for assigned jobs
      if (job.employeeName != user.name) {
        createAuditLogInternal(callerText, "Staff Access Blocked", "Staff tried recording collection for job assigned to " # job.employeeName);
        Runtime.trap("Access denied: insufficient department permission.");
      };
    } else {
      let u = checkPermissions(caller, [#Production], #canCreate);
    };

    if (todayCollectedQty <= 0.0) {
      Runtime.trap("Collected quantity must be greater than 0");
    };
    if (rejectedQty < 0.0) {
      Runtime.trap("Rejected quantity cannot be negative");
    };

    let prevCollectedQty = job.collectedQty;
    let pendingQty = job.qtyGiven - job.acceptedQty;

    // Validation: Completed job cannot accept extra collection unless reopened by Admin
    let isCompleted = job.acceptedQty >= job.qtyGiven;
    if (isCompleted or job.status == "Completed") {
      if (user.role != #Admin) {
        Runtime.trap("Completed job cannot accept extra collection unless reopened by Admin");
      };
    };

    // Validation: Rejected Qty check
    if (rejectedQty > todayCollectedQty) {
      Runtime.trap("Rejected Qty cannot be greater than Today Collected Qty");
    };

    let acceptedQty = todayCollectedQty - rejectedQty;
    if (acceptedQty < 0.0) {
      Runtime.trap("Accepted Qty cannot be negative");
    };

    // Validation: Accepted Qty check
    if (user.role != #Admin) {
      if (acceptedQty > pendingQty) {
        Runtime.trap("Accepted quantity exceeds assigned quantity.");
      };
    };

    // Find the product in productsList to get its stock before updating (Priority order)
    var foundProduct : ?ProductItem = null;
    
    // Priority 1: Match by productId (job.productCode)
    if (foundProduct == null) {
      switch (productsList.get(job.productCode)) {
        case (?item) {
          foundProduct := ?item;
        };
        case (null) { };
      };
    };

    // Priority 2: Match by exact productName (vigat)
    let pipeIndex = indexOf(job.productName, '|');
    let vigatToMatch = switch (pipeIndex) {
      case (?idx) { subText(job.productName, 0, idx) };
      case (null) { job.productName };
    };
    let cleanVigat = trimWhitespace(vigatToMatch);
    if (foundProduct == null) {
      let pKeys = productsList.keys();
      for (k in pKeys) {
        switch (productsList.get(k)) {
          case (?item) {
            if (item.vigat == cleanVigat) {
              foundProduct := ?item;
            };
          };
          case (null) { };
        };
      };
    };

    let product = switch (foundProduct) {
      case (?p) { p };
      case (null) { Runtime.trap("Product must exist in Finished Goods inventory") };
    };

    let prevStockInt = product.stock;
    let prodIdText = product.id;

    let acceptedQtyInt = Float.toInt(acceptedQty);
    let newStockInt = prevStockInt + acceptedQtyInt;

    let id = lastCollectionId + 1;
    let smId = lastStockMovementId + 1;

    let collection : KarigarCollection = {
      id;
      collectionDate = Time.now();
      jobWorkNo;
      karigarName = job.employeeName;
      productName = job.productName;
      qtyGiven = job.qtyGiven;
      prevCollectedQty;
      pendingQty;
      todayCollectedQty;
      rejectedQty;
      acceptedQty;
      remarks;
      stockUpdated = true;
      stockMovementId = ?smId.toText();
      previousStock = ?Float.fromInt(prevStockInt);
      newStock = ?Float.fromInt(newStockInt);
      collectionId = ?id.toText();
      oldAcceptedQty = ?0.0;
      createdBy = ?user.name;
      createdById = ?callerText;
      createdAt = ?Int.toText(Time.now());
      inspectedBy = ?"Quality Inspector";
      inspectedById = ?"inspector";
      inspectedAt = ?Int.toText(Time.now());
    };
    collectionsList.add(id, collection);
    lastCollectionId := id;

    // Update Job Work quantities
    let totalAccepted = job.acceptedQty + acceptedQty;
    let totalRejected = job.rejectedQty + rejectedQty;
    let totalCollected = job.collectedQty + todayCollectedQty;

    var status = "Given";
    if (totalAccepted == 0.0) {
      status := "Given";
    } else if (totalAccepted < job.qtyGiven) {
      status := "Partially Collected";
    } else {
      status := "Completed";
    };

    let roleText = switch (user.role) {
      case (#Admin) { "Master Admin" };
      case (#Manager) { "Admin" };
      case (#Staff) { "Staff" };
    };

    let oldStatus = job.status;
    let newAction = if (status == "Completed") {
      "Inspection Completed"
    } else if (status != oldStatus) {
      "Status Updated"
    } else {
      "Collection Recorded"
    };

    let updatedJob : JobWork = {
      job with
      collectedQty = totalCollected;
      rejectedQty = totalRejected;
      acceptedQty = totalAccepted;
      status;
      updatedByUserId = ?callerText;
      updatedByUsername = ?user.username;
      updatedByFullName = ?user.name;
      updatedByRole = ?roleText;
      lastUpdated = ?Time.now();
      lastAction = ?newAction;
      lastActionBy = ?user.name;
      lastActionRole = ?roleText;
    };
    jobWorksList.add(jobWorkNo, updatedJob);

    // Auto Stock Update: Finished Goods Stock increases by Accepted Qty
    adjustStockForProductId(product.id, acceptedQtyInt);

    // Create Stock Movement log
    let sm : StockMovement = {
      id = smId;
      date = Time.now();
      productName = job.productName;
      productCode = ?job.productCode;
      movementType = "Production Collection";
      qtyAdded = acceptedQty;
      relatedJobWorkNo = jobWorkNo;
      relatedCollectionNo = id;
      userName = user.name;
      workerName = ?job.employeeName;
      collectedQty = ?todayCollectedQty;
      rejectedQty = ?rejectedQty;
      acceptedQty = ?acceptedQty;
      previousStock = ?Float.fromInt(prevStockInt);
      newStock = ?Float.fromInt(newStockInt);
      reversed = ?false;
      adjustmentQty = ?acceptedQty;
      collectionId = ?id.toText();
      jobWorkId = ?jobWorkNo.toText();
      productId = ?prodIdText;
      createdBy = ?user.name;
    };
    stockMovementsList.add(smId, sm);
    lastStockMovementId := smId;

    // Create Finished Goods produced log entry
    let fgId = lastFinishedGoodsLogId + 1;
    let fgLog : FinishedGoodsLog = {
      id = fgId;
      date = Time.now();
      productName = job.productName;
      quantity = acceptedQty;
      logType = "Produced";
      reason = "Karigar Collection JW-" # jobWorkNo.toText();
      userName = user.name;
    };
    finishedGoodsLogsList.add(fgId, fgLog);
    lastFinishedGoodsLogId := fgId;

    // Determine wage based on settings
    let rejectedWageEnabled = switch (settings) {
      case (?s) { s.enableRejectedWage };
      case (null) { false };
    };
    let wageBase = if (rejectedWageEnabled) {
      acceptedQty + rejectedQty
    } else {
      acceptedQty
    };
    let totalWage = wageBase * job.ratePerPiece;

    // Update Ledger: Add collection entry
    let earned = getEmployeeTotalEarned(job.employeeName) + totalWage;
    let paid = getEmployeeTotalPaid(job.employeeName);
    let balance = earned - paid;

    createLedgerEntryInternal(
      job.employeeName,
      jobWorkNo,
      Time.now(),
      job.productName,
      job.qtyGiven,
      acceptedQty,
      rejectedQty,
      job.qtyGiven - totalAccepted,
      job.ratePerPiece,
      totalWage,
      0.0,
      balance,
      status
    );

    // -------------------------------------------------------------
    // Automated Consumption Logs & Raw Material Deductions
    // -------------------------------------------------------------
    if (acceptedQty > 0.0) {
      for (bomReq in product.bom.vals()) {
        var foundMat : ?RawMaterial = null;
        switch (rawMaterialsList.get(bomReq.materialId)) {
          case (?m) { foundMat := ?m };
          case (null) {
            let allMats = rawMaterialsList.values().toArray();
            for (m in allMats.vals()) {
              if (m.name == bomReq.materialId) {
                foundMat := ?m;
              };
            };
          };
        };
        
        switch (foundMat) {
          case (?mat) {
            let qtyConsumed = bomReq.quantity * acceptedQty;
            
            // Check for duplicate consumption logs
            let logs = consumptionLogsList.values().toArray();
            var duplicateExists = false;
            for (log in logs.vals()) {
              if (log.collectionNo == id.toText() and log.rawMaterialName == mat.name) {
                duplicateExists := true;
              };
            };
            
            if (duplicateExists) {
              Runtime.trap("Duplicate consumption log detected for this collection");
            };
            
            // Create Consumption Log
            let clId = lastConsumptionLogId + 1;
            let cLog : ConsumptionLog = {
              id = clId;
              date = Time.now();
              productName = job.productName;
              batchNo = "COL-" # id.toText();
              rawMaterialName = mat.name;
              quantityUsed = qtyConsumed;
              unit = mat.unit;
              cost = qtyConsumed * mat.unitCost;
              employee = job.employeeName;
              jobWorkNo = "JW-" # jobWorkNo.toText();
              remarks = remarks;
              collectionNo = id.toText();
              acceptedQty = acceptedQty;
              unitCost = mat.unitCost;
              status = "Completed";
            };
            consumptionLogsList.add(clId, cLog);
            lastConsumptionLogId := clId;
            
            // Deduct Raw Material Stock
            let updatedMat : RawMaterial = {
              mat with
              consumedQty = mat.consumedQty + qtyConsumed;
              currentStock = mat.currentStock - qtyConsumed;
            };
            rawMaterialsList.add(mat.id, updatedMat);
          };
          case (null) { };
        };
      };
    };

    recalculateEmployeeLedgerInternal(job.employeeName);

    // Create System Audit Log
    createAuditLogInternal(callerText, "COLLECTION_SAVED", "Collection saved for Job JW-" # jobWorkNo.toText());
    createAuditLogInternal(callerText, "FINISHED_GOODS_STOCK_INCREASED", "Finished goods stock increased for " # job.productName # " by " # debugShow(acceptedQty));

    logActivity(caller, "Collect Job", "Collected job JW-" # jobWorkNo.toText() # ": Accepted=" # debugShow(acceptedQty) # ", Rejected=" # debugShow(rejectedQty));
    id;
  };

  public shared ({ caller }) func editCollectionEntry(
    collectionId : Nat,
    todayCollectedQty : Float,
    rejectedQty : Float,
    remarks : Text
  ) : async () {
    let user = checkPermissions(caller, [#Production], #canEdit);
    let callerText = Principal.toText(caller);

    let col = switch (collectionsList.get(collectionId)) {
      case (?c) { c };
      case (null) { Runtime.trap("Collection not found") };
    };

    let job = switch (jobWorksList.get(col.jobWorkNo)) {
      case (?j) { j };
      case (null) { Runtime.trap("Job work not found") };
    };

    if (todayCollectedQty <= 0.0) {
      Runtime.trap("Collected quantity must be greater than 0");
    };
    if (rejectedQty < 0.0) {
      Runtime.trap("Rejected quantity cannot be negative");
    };

    let prevAcceptedTotal = job.acceptedQty - col.acceptedQty;
    let prevRejectedTotal = job.rejectedQty - col.rejectedQty;
    let prevCollectedTotal = job.collectedQty - col.todayCollectedQty;
    let pendingQty = job.qtyGiven - prevAcceptedTotal;

    if (rejectedQty > todayCollectedQty) {
      Runtime.trap("Rejected Qty cannot be greater than Today Collected Qty");
    };

    let acceptedQty = todayCollectedQty - rejectedQty;
    if (acceptedQty < 0.0) {
      Runtime.trap("Accepted Qty cannot be negative");
    };

    let newJobAccepted = prevAcceptedTotal + acceptedQty;
    if (newJobAccepted > job.qtyGiven) {
      if (user.role != #Admin) {
        Runtime.trap("Completed job cannot accept extra collection unless reopened by Admin");
      };
    };

    if (user.role != #Admin) {
      if (acceptedQty > pendingQty) {
        Runtime.trap("Accepted quantity exceeds assigned quantity.");
      };
    };

    // Find the product in productsList to get its stock before updating (Priority order)
    var foundProduct : ?ProductItem = null;
    
    // Priority 1: Match by productId (job.productCode)
    if (foundProduct == null) {
      switch (productsList.get(job.productCode)) {
        case (?item) {
          foundProduct := ?item;
        };
        case (null) { };
      };
    };

    // Priority 2: Match by exact productName (vigat)
    let pipeIndex = indexOf(job.productName, '|');
    let vigatToMatch = switch (pipeIndex) {
      case (?idx) { subText(job.productName, 0, idx) };
      case (null) { job.productName };
    };
    let cleanVigat = trimWhitespace(vigatToMatch);
    if (foundProduct == null) {
      let pKeys = productsList.keys();
      for (k in pKeys) {
        switch (productsList.get(k)) {
          case (?item) {
            if (item.vigat == cleanVigat) {
              foundProduct := ?item;
            };
          };
          case (null) { };
        };
      };
    };

    let product = switch (foundProduct) {
      case (?p) { p };
      case (null) { Runtime.trap("Product must exist in Finished Goods inventory") };
    };

    let prevStockInt = product.stock;
    let prodIdText = product.id;

    let stockAdjustmentInt = Float.toInt(acceptedQty) - Float.toInt(col.acceptedQty);
    if (stockAdjustmentInt == 0) {
      Runtime.trap("No stock change required.");
    };
    let newStockInt = prevStockInt + stockAdjustmentInt;

    // Apply stock changes (difference only)
    adjustStockForProductId(product.id, stockAdjustmentInt);

    let smId = lastStockMovementId + 1;

    // Update collection record
    let updatedCol : KarigarCollection = {
      col with
      todayCollectedQty;
      rejectedQty;
      acceptedQty;
      remarks;
      stockUpdated = true;
      stockMovementId = ?smId.toText();
      previousStock = ?Float.fromInt(prevStockInt);
      newStock = ?Float.fromInt(newStockInt);
      collectionId = ?collectionId.toText();
      oldAcceptedQty = ?col.acceptedQty;
    };
    collectionsList.add(collectionId, updatedCol);

    // Update job work totals
    let totalAccepted = prevAcceptedTotal + acceptedQty;
    let totalRejected = prevRejectedTotal + rejectedQty;
    let totalCollected = prevCollectedTotal + todayCollectedQty;

    var status = "Given";
    if (totalAccepted == 0.0) {
      status := "Given";
    } else if (totalAccepted < job.qtyGiven) {
      status := "Partially Collected";
    } else {
      status := "Completed";
    };

    let roleText = switch (user.role) {
      case (#Admin) { "Master Admin" };
      case (#Manager) { "Admin" };
      case (#Staff) { "Staff" };
    };

    let oldStatus = job.status;
    let newAction = if (status == "Completed") {
      "Inspection Completed"
    } else if (status != oldStatus) {
      "Status Updated"
    } else {
      "Collection Edited"
    };

    let updatedJob : JobWork = {
      job with
      collectedQty = totalCollected;
      rejectedQty = totalRejected;
      acceptedQty = totalAccepted;
      status;
      updatedByUserId = ?callerText;
      updatedByUsername = ?user.username;
      updatedByFullName = ?user.name;
      updatedByRole = ?roleText;
      lastUpdated = ?Time.now();
      lastAction = ?newAction;
    };
    jobWorksList.add(col.jobWorkNo, updatedJob);

    // Create Stock Movement log
    let sm : StockMovement = {
      id = smId;
      date = Time.now();
      productName = job.productName;
      productCode = ?job.productCode;
      movementType = "Production Collection Edit";
      qtyAdded = acceptedQty - col.acceptedQty;
      relatedJobWorkNo = col.jobWorkNo;
      relatedCollectionNo = collectionId;
      userName = user.name;
      workerName = ?job.employeeName;
      collectedQty = ?todayCollectedQty;
      rejectedQty = ?rejectedQty;
      acceptedQty = ?acceptedQty;
      previousStock = ?Float.fromInt(prevStockInt);
      newStock = ?Float.fromInt(newStockInt);
      reversed = ?false;
      adjustmentQty = ?(acceptedQty - col.acceptedQty);
      collectionId = ?collectionId.toText();
      jobWorkId = ?col.jobWorkNo.toText();
      productId = ?prodIdText;
      createdBy = ?user.name;
    };
    stockMovementsList.add(smId, sm);
    lastStockMovementId := smId;

    // Wage adjustment
    let rejectedWageEnabled = switch (settings) {
      case (?s) { s.enableRejectedWage };
      case (null) { false };
    };
    let oldWageBase = if (rejectedWageEnabled) { col.acceptedQty + col.rejectedQty } else { col.acceptedQty };
    let newWageBase = if (rejectedWageEnabled) { acceptedQty + rejectedQty } else { acceptedQty };
    let wageDiff = (newWageBase - oldWageBase) * job.ratePerPiece;

    let earned = getEmployeeTotalEarned(job.employeeName) + wageDiff;
    let paid = getEmployeeTotalPaid(job.employeeName);
    let balance = earned - paid;

    createLedgerEntryInternal(
      job.employeeName,
      col.jobWorkNo,
      Time.now(),
      job.productName,
      job.qtyGiven,
      acceptedQty,
      rejectedQty,
      job.qtyGiven - totalAccepted,
      job.ratePerPiece,
      wageDiff,
      0.0,
      balance,
      status
    );

    // -------------------------------------------------------------
    // Revert Previous Consumption Logs & Raw Material Stock
    // -------------------------------------------------------------
    let allLogs = consumptionLogsList.values().toArray();
    for (log in allLogs.vals()) {
      if (log.collectionNo == collectionId.toText()) {
        // Find raw material
        var foundMat : ?RawMaterial = null;
        switch (rawMaterialsList.get(log.rawMaterialName)) {
          case (?m) { foundMat := ?m };
          case (null) {
            let allMats = rawMaterialsList.values().toArray();
            for (m in allMats.vals()) {
              if (m.name == log.rawMaterialName or m.id == log.rawMaterialName) {
                foundMat := ?m;
              };
            };
          };
        };
        
        switch (foundMat) {
          case (?mat) {
            let updatedMat : RawMaterial = {
              mat with
              consumedQty = if (mat.consumedQty >= log.quantityUsed) { mat.consumedQty - log.quantityUsed } else { 0.0 };
              currentStock = mat.currentStock + log.quantityUsed;
            };
            rawMaterialsList.add(mat.id, updatedMat);
          };
          case (null) { };
        };
        
        // Remove the log
        consumptionLogsList.remove(log.id);
      };
    };

    // -------------------------------------------------------------
    // Regenerate Consumption Logs & Deduct Raw Materials
    // -------------------------------------------------------------
    if (acceptedQty > 0.0) {
      for (bomReq in product.bom.vals()) {
        var foundMat : ?RawMaterial = null;
        switch (rawMaterialsList.get(bomReq.materialId)) {
          case (?m) { foundMat := ?m };
          case (null) {
            let allMats = rawMaterialsList.values().toArray();
            for (m in allMats.vals()) {
              if (m.name == bomReq.materialId) {
                foundMat := ?m;
              };
            };
          };
        };
        
        switch (foundMat) {
          case (?mat) {
            let qtyConsumed = bomReq.quantity * acceptedQty;
            
            // Check for duplicate
            let logs = consumptionLogsList.values().toArray();
            var duplicateExists = false;
            for (log in logs.vals()) {
              if (log.collectionNo == collectionId.toText() and log.rawMaterialName == mat.name) {
                duplicateExists := true;
              };
            };
            if (duplicateExists) {
              Runtime.trap("Duplicate consumption log detected for this collection");
            };
            
            let clId = lastConsumptionLogId + 1;
            let cLog : ConsumptionLog = {
              id = clId;
              date = Time.now();
              productName = job.productName;
              batchNo = "COL-" # collectionId.toText();
              rawMaterialName = mat.name;
              quantityUsed = qtyConsumed;
              unit = mat.unit;
              cost = qtyConsumed * mat.unitCost;
              employee = job.employeeName;
              jobWorkNo = "JW-" # col.jobWorkNo.toText();
              remarks = remarks;
              collectionNo = collectionId.toText();
              acceptedQty = acceptedQty;
              unitCost = mat.unitCost;
              status = "Completed";
            };
            consumptionLogsList.add(clId, cLog);
            lastConsumptionLogId := clId;
            
            let updatedMat : RawMaterial = {
              mat with
              consumedQty = mat.consumedQty + qtyConsumed;
              currentStock = mat.currentStock - qtyConsumed;
            };
            rawMaterialsList.add(mat.id, updatedMat);
          };
          case (null) { };
        };
      };
    };

    recalculateEmployeeLedgerInternal(job.employeeName);

    // Audit logs
    createAuditLogInternal(callerText, "COLLECTION_EDITED", "Edited Collection No " # collectionId.toText());
    createAuditLogInternal(callerText, "FINISHED_GOODS_STOCK_ADJUSTED", "Adjusted stock for " # job.productName # " by " # debugShow(acceptedQty - col.acceptedQty));
  };

  public shared ({ caller }) func deleteCollectionEntry(
    collectionId : Nat
  ) : async () {
    let user = checkPermissions(caller, [#Production], #canDelete);
    let callerText = Principal.toText(caller);

    let col = switch (collectionsList.get(collectionId)) {
      case (?c) { c };
      case (null) { Runtime.trap("Collection not found") };
    };

    let job = switch (jobWorksList.get(col.jobWorkNo)) {
      case (?j) { j };
      case (null) { Runtime.trap("Job work not found") };
    };

    // Find the product in productsList to get its stock before updating (Priority order)
    var foundProduct : ?ProductItem = null;
    
    // Priority 1: Match by productId (job.productCode)
    if (foundProduct == null) {
      switch (productsList.get(job.productCode)) {
        case (?item) {
          foundProduct := ?item;
        };
        case (null) { };
      };
    };

    // Priority 2: Match by exact productName (vigat)
    let pipeIndex = indexOf(job.productName, '|');
    let vigatToMatch = switch (pipeIndex) {
      case (?idx) { subText(job.productName, 0, idx) };
      case (null) { job.productName };
    };
    let cleanVigat = trimWhitespace(vigatToMatch);
    if (foundProduct == null) {
      let pKeys = productsList.keys();
      for (k in pKeys) {
        switch (productsList.get(k)) {
          case (?item) {
            if (item.vigat == cleanVigat) {
              foundProduct := ?item;
            };
          };
          case (null) { };
        };
      };
    };

    let product = switch (foundProduct) {
      case (?p) { p };
      case (null) { Runtime.trap("Product must exist in Finished Goods inventory") };
    };

    let prevStockInt = product.stock;
    let prodIdText = product.id;

    let acceptedQtyInt = Float.toInt(col.acceptedQty);
    let newStockInt = prevStockInt - acceptedQtyInt;

    // Revert finished goods stock
    adjustStockForProductId(product.id, -acceptedQtyInt);

    // Revert job work totals
    let totalAccepted = job.acceptedQty - col.acceptedQty;
    let totalRejected = job.rejectedQty - col.rejectedQty;
    let totalCollected = job.collectedQty - col.todayCollectedQty;

    var status = "Given";
    if (totalAccepted == 0.0) {
      status := "Given";
    } else if (totalAccepted < job.qtyGiven) {
      status := "Partially Collected";
    } else {
      status := "Completed";
    };

    let roleText = switch (user.role) {
      case (#Admin) { "Master Admin" };
      case (#Manager) { "Manager" };
      case (#Staff) { "Staff" };
    };

    let oldStatus = job.status;
    let newAction = if (status == "Completed") {
      "Inspection Completed"
    } else if (status != oldStatus) {
      "Status Updated"
    } else {
      "Collection Deleted"
    };

    let updatedJob : JobWork = {
      job with
      collectedQty = totalCollected;
      rejectedQty = totalRejected;
      acceptedQty = totalAccepted;
      status;
      updatedByUserId = ?callerText;
      updatedByUsername = ?user.username;
      updatedByFullName = ?user.name;
      updatedByRole = ?roleText;
      lastUpdated = ?Time.now();
      lastAction = ?newAction;
      lastActionBy = ?user.name;
      lastActionRole = ?roleText;
    };
    jobWorksList.add(col.jobWorkNo, updatedJob);

    // Find and revert original StockMovement
    switch (col.stockMovementId) {
      case (?smIdText) {
        let keys = stockMovementsList.keys();
        for (k in keys) {
          switch (stockMovementsList.get(k)) {
            case (?sm) {
              if (sm.id.toText() == smIdText) {
                let updatedSm : StockMovement = {
                  sm with
                  reversed = ?true;
                  movementType = "Production Collection (Reversed)";
                };
                stockMovementsList.add(k, updatedSm);
              };
            };
            case (null) { };
          };
        };
      };
      case (null) { };
    };

    // Create Stock Movement log
    let smId = lastStockMovementId + 1;
    let sm : StockMovement = {
      id = smId;
      date = Time.now();
      productName = job.productName;
      productCode = ?job.productCode;
      movementType = "Production Collection Delete";
      qtyAdded = -col.acceptedQty;
      relatedJobWorkNo = col.jobWorkNo;
      relatedCollectionNo = collectionId;
      userName = user.name;
      workerName = ?job.employeeName;
      collectedQty = ?col.todayCollectedQty;
      rejectedQty = ?col.rejectedQty;
      acceptedQty = ?col.acceptedQty;
      previousStock = ?Float.fromInt(prevStockInt);
      newStock = ?Float.fromInt(newStockInt);
      reversed = ?true;
      adjustmentQty = ?-col.acceptedQty;
      collectionId = ?collectionId.toText();
      jobWorkId = ?col.jobWorkNo.toText();
      productId = ?prodIdText;
      createdBy = ?user.name;
    };
    stockMovementsList.add(smId, sm);
    lastStockMovementId := smId;

    // Delete collection
    collectionsList.remove(collectionId);

    // Wage adjustment reversal
    let rejectedWageEnabled = switch (settings) {
      case (?s) { s.enableRejectedWage };
      case (null) { false };
    };
    let wageBase = if (rejectedWageEnabled) { col.acceptedQty + col.rejectedQty } else { col.acceptedQty };
    let wageReversal = -(wageBase * job.ratePerPiece);

    let earned = getEmployeeTotalEarned(job.employeeName) + wageReversal;
    let paid = getEmployeeTotalPaid(job.employeeName);
    let balance = earned - paid;

    createLedgerEntryInternal(
      job.employeeName,
      col.jobWorkNo,
      Time.now(),
      job.productName,
      job.qtyGiven,
      0.0,
      0.0,
      job.qtyGiven - totalAccepted,
      job.ratePerPiece,
      wageReversal,
      0.0,
      balance,
      "Deleted"
    );

    // -------------------------------------------------------------
    // Revert Consumption Logs & Raw Material Stock
    // -------------------------------------------------------------
    let allLogs = consumptionLogsList.values().toArray();
    for (log in allLogs.vals()) {
      if (log.collectionNo == collectionId.toText()) {
        // Find raw material
        var foundMat : ?RawMaterial = null;
        switch (rawMaterialsList.get(log.rawMaterialName)) {
          case (?m) { foundMat := ?m };
          case (null) {
            let allMats = rawMaterialsList.values().toArray();
            for (m in allMats.vals()) {
              if (m.name == log.rawMaterialName or m.id == log.rawMaterialName) {
                foundMat := ?m;
              };
            };
          };
        };
        
        switch (foundMat) {
          case (?mat) {
            let updatedMat : RawMaterial = {
              mat with
              consumedQty = if (mat.consumedQty >= log.quantityUsed) { mat.consumedQty - log.quantityUsed } else { 0.0 };
              currentStock = mat.currentStock + log.quantityUsed;
            };
            rawMaterialsList.add(mat.id, updatedMat);
          };
          case (null) { };
        };
        
        // Remove the log
        consumptionLogsList.remove(log.id);
      };
    };

    recalculateEmployeeLedgerInternal(job.employeeName);

    // Audit logs
    createAuditLogInternal(callerText, "COLLECTION_DELETED", "Deleted Collection No " # collectionId.toText());
    createAuditLogInternal(callerText, "FINISHED_GOODS_STOCK_REVERSED", "Reversed stock for " # job.productName # " by -" # debugShow(col.acceptedQty));
  };

  private func migrateCollection(c : KarigarCollection) : KarigarCollection {
    var createdByVal = c.createdBy;
    var inspectedByVal = c.inspectedBy;
    var createdAtVal = c.createdAt;
    var inspectedAtVal = c.inspectedAt;

    switch (createdByVal) {
      case (?txt) {
        if (txt == "Inspector") {
          createdByVal := ?"Unknown User";
        };
      };
      case (null) {
        createdByVal := ?"Unknown User";
      };
    };

    switch (inspectedByVal) {
      case (null) {
        inspectedByVal := ?"Quality Inspector";
      };
      case (_) {};
    };

    switch (createdAtVal) {
      case (null) {
        createdAtVal := ?Int.toText(c.collectionDate);
      };
      case (_) {};
    };

    switch (inspectedAtVal) {
      case (null) {
        inspectedAtVal := ?Int.toText(c.collectionDate);
      };
      case (_) {};
    };

    {
      id = c.id;
      collectionDate = c.collectionDate;
      jobWorkNo = c.jobWorkNo;
      karigarName = c.karigarName;
      productName = c.productName;
      qtyGiven = c.qtyGiven;
      prevCollectedQty = c.prevCollectedQty;
      pendingQty = c.pendingQty;
      todayCollectedQty = c.todayCollectedQty;
      rejectedQty = c.rejectedQty;
      acceptedQty = c.acceptedQty;
      remarks = c.remarks;
      stockUpdated = c.stockUpdated;
      stockMovementId = c.stockMovementId;
      previousStock = c.previousStock;
      newStock = c.newStock;
      collectionId = c.collectionId;
      oldAcceptedQty = c.oldAcceptedQty;
      createdBy = createdByVal;
      createdById = switch (c.createdById) { case (null) { ?"system" }; case (?id) { ?id }; };
      createdAt = createdAtVal;
      inspectedBy = inspectedByVal;
      inspectedById = switch (c.inspectedById) { case (null) { ?"inspector" }; case (?id) { ?id }; };
      inspectedAt = inspectedAtVal;
    };
  };

  public query ({ caller }) func getCollections() : async [KarigarCollection] {
    let callerText = Principal.toText(caller);
    let callerUser = switch (users.get(callerText)) {
      case (?u) { u };
      case (null) { Runtime.trap("Access denied: insufficient permissions."); };
    };

    let allCols = collectionsList.values().toArray();
    let migratedCols = allCols.map(migrateCollection);

    switch (callerUser.role) {
      case (#Admin) { migratedCols };
      case (#Manager) {
        let user = checkPermissions(caller, [#Production], #canView);
        migratedCols;
      };
      case (#Staff) {
        let user = checkPermissions(caller, [#Staff], #canView);
        migratedCols.filter(func(c) { c.karigarName == user.name });
      };
    };
  };

  public query ({ caller }) func getStockMovementHistory() : async [StockMovement] {
    let user = checkPermissions(caller, [#Inventory], #canView);
    stockMovementsList.values().toArray();
  };

  public query ({ caller }) func getSystemAuditLogs() : async [AuditLog] {
    let user = checkPermissions(caller, [#AdminSettings], #canViewLogs);
    auditLogsList.values().toArray();
  };

  public query ({ caller }) func getKarigarLedger(employeeName : Text) : async [EmployeeLedgerEntry] {
    let callerText = Principal.toText(caller);
    let callerUser = switch (users.get(callerText)) {
      case (?u) { u };
      case (null) { Runtime.trap("Access denied: insufficient permissions."); };
    };

    switch (callerUser.role) {
      case (#Admin) {};
      case (#Manager) {
        let user = checkPermissions(caller, [#Production, #Finance], #canView);
      };
      case (#Staff) {
        let user = checkPermissions(caller, [#Staff], #canView);
        if (employeeName != user.name) {
          createAuditLogInternal(callerText, "Staff Access Blocked", "Staff " # user.name # " tried viewing ledger of " # employeeName);
          Runtime.trap("Access denied: insufficient department permission.");
        };
      };
    };

    var matching : [EmployeeLedgerEntry] = [];
    let allLedgers = employeeLedgersList.values().toArray();
    let sortedLedgers = allLedgers.sort(func(a, b) { Nat.compare(a.id, b.id) });
    var runningBalance = 0.0;
    for (entry in sortedLedgers.vals()) {
      if (entry.employeeName == employeeName) {
        let isReversed = switch (entry.reversed) {
          case (?b) { b };
          case (null) { false };
        };
        let wage = if (isReversed) { 0.0 } else { entry.totalWage };
        let paid = if (isReversed) { 0.0 } else { entry.paidAmount };
        runningBalance := runningBalance + wage - paid;
        let updatedEntry : EmployeeLedgerEntry = {
          entry with
          balanceAmount = runningBalance;
        };
        matching := Array.append<EmployeeLedgerEntry>(matching, [updatedEntry]);
      };
    };
    matching;
  };

  public query ({ caller }) func getEmployeePayments() : async [EmployeePayment] {
    let user = checkPermissions(caller, [#Production, #Finance], #canView);
    employeePaymentsList.values().toArray();
  };

  public shared ({ caller }) func saveEmployeePayment(
    karigarName : Text,
    paymentAmount : Float,
    paymentMode : Text,
    note : Text
  ) : async Nat {
    let user = checkPermissions(caller, [#Production, #Finance], #canCreate);
    let callerText = Principal.toText(caller);

    let id = lastEmployeePaymentId + 1;
    let payment : EmployeePayment = {
      id;
      paymentDate = Time.now();
      employeeName = karigarName;
      amountPaid = paymentAmount;
      paymentMode;
      remarks = note;
    };

    employeePaymentsList.add(id, payment);
    lastEmployeePaymentId := id;

    // Update Ledger: Add payment debit entry
    let earned = getEmployeeTotalEarned(karigarName);
    let paid = getEmployeeTotalPaid(karigarName);
    let balance = earned - paid;

    createLedgerEntryWithPayment(
      karigarName,
      0,
      Time.now(),
      "Payment Handover",
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      paymentAmount,
      balance,
      "Paid",
      ?id.toText()
    );

    recalculateEmployeeLedgerInternal(karigarName);

    // Create Audit Log
    createAuditLogInternal(
      callerText,
      "Payment Made",
      "Processed payment of " # debugShow(paymentAmount) # " to " # karigarName # " via " # paymentMode
    );

    logActivity(caller, "Employee Payment", "Paid " # debugShow(paymentAmount) # " to " # karigarName # " (" # paymentMode # ")");
    id;
  };

  public shared ({ caller }) func editEmployeePayment(
    paymentId : Nat,
    paymentAmount : Float,
    paymentMode : Text,
    note : Text
  ) : async () {
    let user = checkPermissions(caller, [#Production, #Finance], #canEdit);
    let callerText = Principal.toText(caller);

    switch (employeePaymentsList.get(paymentId)) {
      case (?p) {
        let updated : EmployeePayment = {
          p with
          amountPaid = paymentAmount;
          paymentMode;
          remarks = note;
        };
        employeePaymentsList.add(paymentId, updated);
        
        // Update the corresponding ledger entry
        let keys = employeeLedgersList.keys();
        for (k in keys) {
          switch (employeeLedgersList.get(k)) {
            case (?entry) {
              switch (entry.paymentId) {
                case (?pId) {
                  if (pId == paymentId.toText()) {
                    let updatedEntry : EmployeeLedgerEntry = {
                      entry with
                      paidAmount = paymentAmount;
                    };
                    employeeLedgersList.add(k, updatedEntry);
                  };
                };
                case (null) { };
              };
            };
            case (null) { };
          };
        };
        
        // Audit log
        createAuditLogInternal(
          callerText,
          "Payment Edited",
          "Edited payment of " # debugShow(paymentAmount) # " for " # p.employeeName
        );

        recalculateEmployeeLedgerInternal(p.employeeName);
      };
      case (null) {
        Runtime.trap("Payment not found");
      };
    };
  };

  public shared ({ caller }) func deleteEmployeePayment(
    paymentId : Nat
  ) : async () {
    let user = checkPermissions(caller, [#Production, #Finance], #canDelete);
    let callerText = Principal.toText(caller);

    switch (employeePaymentsList.get(paymentId)) {
      case (?p) {
        employeePaymentsList.remove(paymentId);
        
        // Update the corresponding ledger entry to reverse it
        let keys = employeeLedgersList.keys();
        for (k in keys) {
          switch (employeeLedgersList.get(k)) {
            case (?entry) {
              switch (entry.paymentId) {
                case (?pId) {
                  if (pId == paymentId.toText()) {
                    let updatedEntry : EmployeeLedgerEntry = {
                      entry with
                      reversed = ?true;
                      status = "Reversed";
                      paidAmount = 0.0;
                    };
                    employeeLedgersList.add(k, updatedEntry);
                  };
                };
                case (null) { };
              };
            };
            case (null) { };
          };
        };
        
        // Audit log
        createAuditLogInternal(
          callerText,
          "Payment Deleted",
          "Deleted payment ID: " # paymentId.toText() # " for " # p.employeeName
        );

        recalculateEmployeeLedgerInternal(p.employeeName);
      };
      case (null) {
        Runtime.trap("Payment not found");
      };
    };
  };

  public query ({ caller }) func checkStockReconciliation() : async [StockReconciliationItem] {
    let user = checkPermissions(caller, [#Inventory, #Finance], #canView);
    let callerText = Principal.toText(caller);

    var report : [StockReconciliationItem] = [];
    let allProducts = productsList.values().toArray();
    let allCollections = collectionsList.values().toArray();
    let allInvoices = invoices.values().toArray();
    let allFGLogs = finishedGoodsLogsList.values().toArray();

    for (p in allProducts.vals()) {
      let opening = 0.0;
      
      var acceptedFromCol = 0.0;
      for (c in allCollections.vals()) {
        if (c.productName == p.vigat or Text.startsWith(c.productName, #text (p.vigat # "|"))) {
          acceptedFromCol := acceptedFromCol + c.acceptedQty;
        };
      };

      var salesQty = 0.0;
      for (inv in allInvoices.vals()) {
        for (item in inv.products.toArray().vals()) {
          let pipeIndex = indexOf(item.0, '|');
          let vigatToMatch = switch (pipeIndex) {
            case (?idx) { subText(item.0, 0, idx) };
            case (null) { item.0 };
          };
          let cleanVigat = trimWhitespace(vigatToMatch);
          if (cleanVigat == p.vigat) {
            salesQty := salesQty + Float.fromInt(Int.fromNat(item.1));
          };
        };
      };

      var manualAdjustments = 0.0;
      for (l in allFGLogs.vals()) {
        if (l.productName == p.vigat) {
          if (l.logType == "Damaged") {
            manualAdjustments := manualAdjustments - l.quantity;
          } else if (l.logType == "Adjusted") {
            manualAdjustments := manualAdjustments + l.quantity;
          };
        };
      };

      let expectedStock = opening + acceptedFromCol - salesQty + manualAdjustments;
      let actualStock = Float.fromInt(p.stock);
      let difference = actualStock - expectedStock;

      var reason = "In Sync";
      if (difference != 0.0) {
        let diffAbs = if (difference < 0.0) { -difference } else { difference };
        let overUnderText = if (difference > 0.0) { "over" } else { "under" };
        reason := "Mismatch: stock is " # overUnderText # " by " # debugShow(diffAbs) # " units.";
      };

      let item : StockReconciliationItem = {
        product = p.vigat;
        expectedStock;
        actualStock;
        difference;
        reason;
      };
      report := Array.append<StockReconciliationItem>(report, [item]);
    };

    var mismatchFound = false;
    for (item in report.vals()) {
      if (item.difference != 0.0) {
        mismatchFound := true;
      };
    };
    if (mismatchFound) {
      createAuditLogInternal(callerText, "STOCK_RECONCILIATION_FAILED", "Stock mismatch detected during reconciliation check.");
    };

    report;
  };

  public shared ({ caller }) func runConsistencyAuditAndRepair() : async [Text] {
    let user = checkPermissions(caller, [#Inventory, #Production, #Finance], #canEdit);
    let callerText = Principal.toText(caller);
    
    var report : [Text] = [];
    
    let allProducts = productsList.values().toArray();
    let allCollections = collectionsList.values().toArray();
    let allInvoices = invoices.values().toArray();
    let allFGLogs = finishedGoodsLogsList.values().toArray();
    let allRawMaterials = rawMaterialsList.values().toArray();
    let allLogs = consumptionLogsList.values().toArray();
    let allLedgers = employeeLedgersList.values().toArray();
    let jobs = jobWorksList.values().toArray();
    
    // 1. Audit duplicate consumption logs
    var uniqueLogs : [ConsumptionLog] = [];
    for (log in allLogs.vals()) {
      let collNo = log.collectionNo;
      let rawName = log.rawMaterialName;
      var duplicate = false;
      for (uLog in uniqueLogs.vals()) {
        if (uLog.collectionNo == collNo and uLog.rawMaterialName == rawName) {
          duplicate := true;
        };
      };
      if (duplicate) {
        report := Array.append<Text>(report, ["[REPAIR] Duplicate consumption log detected and removed: Log ID " # log.id.toText() # " for Collection " # collNo # ", Material " # rawName # "."]);
        consumptionLogsList.remove(log.id);
      } else {
        uniqueLogs := Array.append<ConsumptionLog>(uniqueLogs, [log]);
      };
    };
    
    // 2. Audit missing consumption logs based on collections
    for (col in allCollections.vals()) {
      switch (jobWorksList.get(col.jobWorkNo)) {
        case (?job) {
          var foundProd : ?ProductItem = null;
          switch (productsList.get(job.productCode)) {
            case (?p) { foundProd := ?p };
            case (null) {
              for (p in allProducts.vals()) {
                if (p.vigat == job.productName) {
                  foundProd := ?p;
                };
              };
            };
          };
          
          switch (foundProd) {
            case (?product) {
              let acceptedQty = col.acceptedQty;
              if (acceptedQty > 0.0) {
                for (bomReq in product.bom.vals()) {
                  var foundMat : ?RawMaterial = null;
                  switch (rawMaterialsList.get(bomReq.materialId)) {
                    case (?m) { foundMat := ?m };
                    case (null) {
                      for (m in allRawMaterials.vals()) {
                        if (m.name == bomReq.materialId) {
                          foundMat := ?m;
                        };
                      };
                    };
                  };
                  
                  switch (foundMat) {
                    case (?mat) {
                      var hasLog = false;
                      let currentLogs = consumptionLogsList.values().toArray();
                      for (l in currentLogs.vals()) {
                        if ((l.collectionNo == col.id.toText() or l.batchNo == "COL-" # col.id.toText()) and l.rawMaterialName == mat.name) {
                          hasLog := true;
                        };
                      };
                      
                      if (not hasLog) {
                        let qtyConsumed = bomReq.quantity * acceptedQty;
                        let clId = lastConsumptionLogId + 1;
                        let newLog : ConsumptionLog = {
                          id = clId;
                          date = col.collectionDate;
                          productName = job.productName;
                          batchNo = "COL-" # col.id.toText();
                          rawMaterialName = mat.name;
                          quantityUsed = qtyConsumed;
                          unit = mat.unit;
                          cost = qtyConsumed * mat.unitCost;
                          employee = job.employeeName;
                          jobWorkNo = "JW-" # col.jobWorkNo.toText();
                          remarks = "Automated repair log for collection COL-" # col.id.toText();
                          collectionNo = col.id.toText();
                          acceptedQty = acceptedQty;
                          unitCost = mat.unitCost;
                          status = "Completed";
                        };
                        consumptionLogsList.add(clId, newLog);
                        lastConsumptionLogId := clId;
                        
                        let updatedMat : RawMaterial = {
                          mat with
                          consumedQty = mat.consumedQty + qtyConsumed;
                          currentStock = mat.currentStock - qtyConsumed;
                        };
                        rawMaterialsList.add(mat.id, updatedMat);
                        
                        report := Array.append<Text>(report, ["[REPAIR] Missing consumption log created: Log ID " # clId.toText() # " for Collection " # col.id.toText() # ", Material " # mat.name # ", Quantity " # debugShow(qtyConsumed) # "."]);
                      };
                    };
                    case (null) { };
                  };
                };
              };
            };
            case (null) { };
          };
        };
        case (null) { };
      };
    };
    
    // 3. Audit Raw Material consumedQty and currentStock
    let finalRawMaterials = rawMaterialsList.values().toArray();
    let finalLogs = consumptionLogsList.values().toArray();
    for (mat in finalRawMaterials.vals()) {
      var expectedConsumed = 0.0;
      for (l in finalLogs.vals()) {
        if (l.rawMaterialName == mat.name or l.rawMaterialName == mat.id) {
          expectedConsumed := expectedConsumed + l.quantityUsed;
        };
      };
      
      var matChanged = false;
      var updatedMat = mat;
      if (mat.consumedQty != expectedConsumed) {
        report := Array.append<Text>(report, ["[REPAIR] Raw Material \"" # mat.name # "\" consumed quantity mismatch: database showed " # debugShow(mat.consumedQty) # ", expected " # debugShow(expectedConsumed) # ". Corrected."]);
        updatedMat := { updatedMat with consumedQty = expectedConsumed };
        matChanged := true;
      };
      
      let expectedStock = mat.openingStock + mat.purchasedQty - expectedConsumed;
      if (mat.currentStock != expectedStock) {
        report := Array.append<Text>(report, ["[REPAIR] Raw Material \"" # mat.name # "\" stock mismatch: database showed " # debugShow(mat.currentStock) # ", expected " # debugShow(expectedStock) # ". Corrected."]);
        updatedMat := { updatedMat with currentStock = expectedStock };
        matChanged := true;
      };
      
      if (matChanged) {
        rawMaterialsList.add(mat.id, updatedMat);
      };
    };
    
    // 4. Audit Finished Goods stock math
    let finalProducts = productsList.values().toArray();
    let finalCollections = collectionsList.values().toArray();
    for (p in finalProducts.vals()) {
      let opening = switch (p.openingStock) {
        case (?op) { Float.fromInt(op) };
        case (null) {
          let standardOpenings: [ (Text, Int) ] = [
            ("PRD-1", 13),
            ("PRD-2", 11),
            ("PRD-3", 10),
            ("PRD-4", 120),
            ("PRD-5", 58)
          ];
          var opVal = p.stock;
          for (so in standardOpenings.vals()) {
            if (so.0 == p.id or so.0 == p.vigat) {
              opVal := so.1;
            };
          };
          
          let updatedP : ProductItem = {
            p with
            openingStock = ?opVal;
          };
          productsList.add(p.id, updatedP);
          Float.fromInt(opVal);
        };
      };
      
      var acceptedFromCol = 0.0;
      for (c in finalCollections.vals()) {
        if (c.productName == p.vigat or Text.startsWith(c.productName, #text (p.vigat # "|"))) {
          acceptedFromCol := acceptedFromCol + c.acceptedQty;
        };
      };
      
      var salesQty = 0.0;
      for (inv in allInvoices.vals()) {
        for (item in inv.products.toArray().vals()) {
          let pipeIndex = indexOf(item.0, '|');
          let vigatToMatch = switch (pipeIndex) {
            case (?idx) { subText(item.0, 0, idx) };
            case (null) { item.0 };
          };
          let cleanVigat = trimWhitespace(vigatToMatch);
          if (cleanVigat == p.vigat) {
            salesQty := salesQty + Float.fromInt(Int.fromNat(item.1));
          };
        };
      };
      
      var manualAdjustments = 0.0;
      for (l in allFGLogs.vals()) {
        if (l.productName == p.vigat) {
          if (l.logType == "Sold" or l.logType == "Damaged") {
            manualAdjustments := manualAdjustments - l.quantity;
          } else if (l.logType == "Returned" or l.logType == "Produced" or l.logType == "Restocked") {
            manualAdjustments := manualAdjustments + l.quantity;
          };
        };
      };
      
      let expectedStock = opening + acceptedFromCol - salesQty + manualAdjustments;
      let actualStock = Float.fromInt(p.stock);
      if (actualStock != expectedStock) {
        report := Array.append<Text>(report, ["[REPAIR] Finished Product \"" # p.vigat # "\" stock mismatch: database showed " # debugShow(actualStock) # ", expected " # debugShow(expectedStock) # ". Corrected."]);
        adjustStockForProductId(p.id, Float.toInt(expectedStock) - p.stock);
      };
    };
    
    // 5. Audit Employee Ledger balances
    var employeesReported : [Text] = [];
    for (el in allLedgers.vals()) {
      var found = false;
      for (emp in employeesReported.vals()) {
        if (emp == el.employeeName) { found := true };
      };
      if (not found) {
        employeesReported := Array.append<Text>(employeesReported, [el.employeeName]);
      };
    };
    
    for (empName in employeesReported.vals()) {
      recalculateEmployeeLedgerInternal(empName);
      report := Array.append<Text>(report, ["[REPAIR] Ledger running balances for Karigar \"" # empName # "\" recalculated and corrected."]);
    };
    
    if (report.size() == 0) {
      report := Array.append<Text>(report, ["All systems are fully in sync. No mismatches detected."]);
    };
    
    createAuditLogInternal(callerText, "SYSTEM_CONSISTENCY_AUDIT", "System audit and repair completed. Actions recorded: " # Nat.toText(report.size()));
    report;
  };

  public shared ({ caller }) func recalculateProductionReports() : async () {
    let user = checkPermissions(caller, [#Production], #canEdit);
    let callerText = Principal.toText(caller);
    createAuditLogInternal(callerText, "REPORTS_RECALCULATED", "Global production reports recalculated successfully.");
  };

  public query ({ caller }) func getEmployeeDashboardStats() : async EmployeeDashboardStats {
    let callerText = Principal.toText(caller);
    let callerUser = switch (users.get(callerText)) {
      case (?u) { u };
      case (null) { Runtime.trap("Access denied: insufficient permissions."); };
    };

    switch (callerUser.role) {
      case (#Admin) {};
      case (#Manager) {
        let user = checkPermissions(caller, [#Production], #canView);
      };
      case (#Staff) {
        let user = checkPermissions(caller, [#Staff], #canView);
      };
    };

    let allEmployees = employeesList.values().toArray();
    let totalEmployees = allEmployees.size();

    let allJobs = jobWorksList.values().toArray();
    var activeJobsCount = 0;
    var completedJobsCount = 0;
    var pendingJobsCount = 0;
    var totalPendingQty = 0.0;
    var totalRejectedQty = 0.0;

    for (j in allJobs.vals()) {
      if (j.status == "Completed") {
        completedJobsCount := completedJobsCount + 1;
      } else {
        activeJobsCount := activeJobsCount + 1;
        pendingJobsCount := pendingJobsCount + 1;
        totalPendingQty := totalPendingQty + (j.qtyGiven - j.acceptedQty);
      };
      totalRejectedQty := totalRejectedQty + j.rejectedQty;
    };

    // Calculate wages due
    var totalWagesDue = 0.0;
    for (emp in allEmployees.vals()) {
      let earned = getEmployeeTotalEarned(emp.name);
      let paid = getEmployeeTotalPaid(emp.name);
      totalWagesDue := totalWagesDue + (earned - paid);
    };

    // Today's collected qty
    let today = Time.now() / (24 * 60 * 60 * 1000000000);
    let allCollections = collectionsList.values().toArray();
    var todayCollectedQty = 0.0;
    for (col in allCollections.vals()) {
      let colDay = col.collectionDate / (24 * 60 * 60 * 1000000000);
      if (colDay == today) {
        todayCollectedQty := todayCollectedQty + col.todayCollectedQty;
      };
    };

    // Today's production (from daily logs if any, or mapped as todayCollectedQty)
    let allWorkUpdates = dailyWorkUpdatesList.values().toArray();
    var todayProduction = 0.0;
    for (upd in allWorkUpdates.vals()) {
      let updDay = upd.date / (24 * 60 * 60 * 1000000000);
      if (updDay == today) {
        todayProduction := todayProduction + upd.completedQty;
      };
    };
    if (todayProduction == 0.0) {
      todayProduction := todayCollectedQty;
    };

    // Finished Goods Stock Value: stock * productionCost
    var finishedGoodsStockValue = 0.0;
    let allProds = productsList.values().toArray();
    for (p in allProds.vals()) {
      finishedGoodsStockValue := finishedGoodsStockValue + (Float.fromInt(p.stock) * p.productionCost);
    };

    {
      totalEmployees;
      activeJobs = activeJobsCount;
      completedJobs = completedJobsCount;
      pendingJobs = pendingJobsCount;
      totalWagesDue;
      todayProduction;
      totalPendingQty;
      todayCollectedQty;
      totalRejectedQty;
      finishedGoodsStockValue;
    };
  };

  // Consumption Log endpoints
  public query ({ caller }) func getConsumptionLogs() : async [ConsumptionLog] {
    let user = checkPermissions(caller, [#Inventory, #Production], #canView);
    consumptionLogsList.values().toArray();
  };

  public shared ({ caller }) func saveConsumptionLog(
    productName : Text,
    batchNo : Text,
    rawMaterialName : Text,
    quantityUsed : Float,
    unit : Text,
    cost : Float,
    employee : Text,
    jobWorkNo : Text,
    remarks : Text
  ) : async Nat {
    let user = checkPermissions(caller, [#Inventory, #Production], #canCreate);
    let callerText = Principal.toText(caller);

    let id = lastConsumptionLogId + 1;
    let log : ConsumptionLog = {
      id;
      date = Time.now();
      productName;
      batchNo;
      rawMaterialName;
      quantityUsed;
      unit;
      cost;
      employee;
      jobWorkNo;
      remarks;
      collectionNo = "";
      acceptedQty = 0.0;
      unitCost = if (quantityUsed > 0.0) { cost / quantityUsed } else { 0.0 };
      status = "Completed";
    };
    consumptionLogsList.add(id, log);
    lastConsumptionLogId := id;

    // Reduce raw material stock
    let allMaterials = rawMaterialsList.values().toArray();
    var foundMatId : ?Text = null;
    for (m in allMaterials.vals()) {
      if (m.name == rawMaterialName) {
        foundMatId := ?m.id;
      };
    };

    switch (foundMatId) {
      case (?matId) {
        switch (rawMaterialsList.get(matId)) {
          case (?m) {
            let updated : RawMaterial = {
              m with
              consumedQty = m.consumedQty + quantityUsed;
              currentStock = m.currentStock - quantityUsed;
            };
            rawMaterialsList.add(matId, updated);
          };
          case (null) { };
        };
      };
      case (null) {
        switch (rawMaterialsList.get(rawMaterialName)) {
          case (?m) {
            let updated : RawMaterial = {
              m with
              consumedQty = m.consumedQty + quantityUsed;
              currentStock = m.currentStock - quantityUsed;
            };
            rawMaterialsList.add(rawMaterialName, updated);
          };
          case (null) { };
        };
      };
    };

    createAuditLogInternal(
      callerText,
      "Material Consumed",
      "Consumed " # debugShow(quantityUsed) # " " # unit # " of " # rawMaterialName # " for " # productName
    );

    logActivity(caller, "Save Consumption Log", "Saved consumption log for " # rawMaterialName);
    id;
  };

  public query ({ caller }) func getFinishedGoodsLogs() : async [FinishedGoodsLog] {
    let user = checkPermissions(caller, [#Inventory, #Production], #canView);
    finishedGoodsLogsList.values().toArray();
  };

  public shared ({ caller }) func saveFinishedGoodsLog(
    productName : Text,
    quantity : Float,
    logType : Text,
    reason : Text
  ) : async Nat {
    let user = checkPermissions(caller, [#Inventory, #Production], #canCreate);
    let callerText = Principal.toText(caller);

    if (logType == "Produced" or logType == "Returned") {
      Runtime.trap("Access denied: insufficient permissions.");
    };

    let id = lastFinishedGoodsLogId + 1;
    let log : FinishedGoodsLog = {
      id;
      date = Time.now();
      productName;
      quantity;
      logType;
      reason;
      userName = user.name;
    };
    finishedGoodsLogsList.add(id, log);
    lastFinishedGoodsLogId := id;

    let qtyInt = Float.toInt(quantity);
    if (logType == "Sold" or logType == "Damaged") {
      adjustStockForProduct(productName, -qtyInt);
    };

    logActivity(caller, "Finished Goods Log", "Logged finished goods stock update: " # logType # " " # productName);
    id;
  };

  public query ({ caller }) func exportDatabase() : async DatabaseBackup {
    let user = checkPermissions(caller, [#AdminSettings], #canBackupRestore);
    let callerText = Principal.toText(caller);

    let allowed = switch (user.role) {
      case (#Admin) { true };
      case (#Manager) {
        switch (settings) {
          case (?s) {
            switch (s.allowAdminBackupRestore) {
              case (?val) { val };
              case (null) { false };
            };
          };
          case (null) { false };
        };
      };
      case (#Staff) { false };
    };

    if (not allowed) {
      Runtime.trap("Access denied: insufficient department permission.");
    };

    // Convert list activityLogs to array
    let logsArray = List.toArray<ActivityLog>(activityLogs);
    // Convert list consumptionHistory to array
    let consArray = List.toArray<MaterialConsumptionEntry>(consumptionHistory);

    // Convert invoices map to array of Invoice
    let invoicesArray = invoices.values().toArray().map(
      func(internalInvoice) {
        {
          id = internalInvoice.id;
          invoiceNumber = internalInvoice.invoiceNumber;
          date = internalInvoice.date;
          businessInfo = internalInvoice.businessInfo;
          customerInfo = internalInvoice.customerInfo;
          products = internalInvoice.products.toArray();
          totalAmount = internalInvoice.totalAmount;
          paidAmount = internalInvoice.paidAmount;
          creatorPrincipal = internalInvoice.creatorPrincipal;
          creatorName = internalInvoice.creatorName;
          previousBalanceAtCreation = internalInvoice.previousBalanceAtCreation;
          advanceBalanceAtCreation = internalInvoice.advanceBalanceAtCreation;
          currentInvoiceTotalAtCreation = internalInvoice.currentInvoiceTotalAtCreation;
          totalPayableAtCreation = internalInvoice.totalPayableAtCreation;
          paidAmountAtCreation = internalInvoice.paidAmountAtCreation;
          finalDueAtCreation = internalInvoice.finalDueAtCreation;
        };
      }
    );

    createAuditLogInternal(callerText, "Backup Exported", "Exported system database backup");

    {
      invoices = invoicesArray;
      lastInvoiceId;
      settings;
      users = users.values().toArray();
      userCount;
      activityLogs = logsArray;
      lastLogId;
      productsList = productsList.values().toArray();
      productCount;
      customersList = customersList.values().toArray();
      customerCount;
      paymentsList = paymentsList.values().toArray();
      lastPaymentId;
      rawMaterialsList = rawMaterialsList.values().toArray();
      purchasesList = purchasesList.values().toArray();
      expensesList = expensesList.values().toArray();
      vendorPaymentsList = vendorPaymentsList.values().toArray();
      consumptionHistory = consArray;
      lastPurchaseId;
      lastExpenseId;
      lastVendorPaymentId;
      lastConsumptionId;
      employeesList = employeesList.values().toArray();
      jobWorksList = jobWorksList.values().toArray();
      dailyWorkUpdatesList = dailyWorkUpdatesList.values().toArray();
      jobCollectionsList = jobCollectionsList.values().toArray();
      employeePaymentsList = employeePaymentsList.values().toArray();
      collectionsList = collectionsList.values().toArray();
      stockMovementsList = stockMovementsList.values().toArray();
      auditLogsList = auditLogsList.values().toArray();
      employeeLedgersList = employeeLedgersList.values().toArray();
      consumptionLogsList = consumptionLogsList.values().toArray();
      lastConsumptionLogId;
      finishedGoodsLogsList = finishedGoodsLogsList.values().toArray();
      lastFinishedGoodsLogId;
      employeeCount;
      lastJobWorkId;
      lastDailyWorkUpdateId;
      lastJobCollectionId;
      lastEmployeePaymentId;
      lastCollectionId;
      lastStockMovementId;
      lastAuditLogId;
      lastEmployeeLedgerId;
    };
  };

  public shared ({ caller }) func importDatabase(backup : DatabaseBackup) : async () {
    let user = checkPermissions(caller, [#AdminSettings], #canBackupRestore);
    let callerText = Principal.toText(caller);

    let allowed = switch (user.role) {
      case (#Admin) { true };
      case (#Manager) {
        switch (settings) {
          case (?s) {
            switch (s.allowAdminBackupRestore) {
              case (?val) { val };
              case (null) { false };
            };
          };
          case (null) { false };
        };
      };
      case (#Staff) { false };
    };

    if (not allowed) {
      Runtime.trap("Access denied: insufficient department permission.");
    };

    // Reconstruct settings, maps, counters, lists
    // First clear all existing
    for (k in invoices.keys()) { invoices.remove(k) };
    for (k in users.keys()) { users.remove(k) };
    for (k in productsList.keys()) { productsList.remove(k) };
    for (k in customersList.keys()) { customersList.remove(k) };
    for (k in paymentsList.keys()) { paymentsList.remove(k) };
    for (k in rawMaterialsList.keys()) { rawMaterialsList.remove(k) };
    for (k in purchasesList.keys()) { purchasesList.remove(k) };
    for (k in expensesList.keys()) { expensesList.remove(k) };
    for (k in vendorPaymentsList.keys()) { vendorPaymentsList.remove(k) };
    for (k in employeesList.keys()) { employeesList.remove(k) };
    for (k in jobWorksList.keys()) { jobWorksList.remove(k) };
    for (k in dailyWorkUpdatesList.keys()) { dailyWorkUpdatesList.remove(k) };
    for (k in jobCollectionsList.keys()) { jobCollectionsList.remove(k) };
    for (k in employeePaymentsList.keys()) { employeePaymentsList.remove(k) };
    for (k in collectionsList.keys()) { collectionsList.remove(k) };
    for (k in stockMovementsList.keys()) { stockMovementsList.remove(k) };
    for (k in auditLogsList.keys()) { auditLogsList.remove(k) };
    for (k in employeeLedgersList.keys()) { employeeLedgersList.remove(k) };
    for (k in consumptionLogsList.keys()) { consumptionLogsList.remove(k) };
    for (k in finishedGoodsLogsList.keys()) { finishedGoodsLogsList.remove(k) };

    for (inv in backup.invoices.vals()) {
      invoices.add(inv.id, {
        id = inv.id;
        invoiceNumber = inv.invoiceNumber;
        date = inv.date;
        businessInfo = inv.businessInfo;
        customerInfo = inv.customerInfo;
        products = List.fromArray<Product>(inv.products);
        totalAmount = inv.totalAmount;
        paidAmount = inv.paidAmount;
        creatorPrincipal = inv.creatorPrincipal;
        creatorName = inv.creatorName;
        previousBalanceAtCreation = inv.previousBalanceAtCreation;
        advanceBalanceAtCreation = inv.advanceBalanceAtCreation;
        currentInvoiceTotalAtCreation = inv.currentInvoiceTotalAtCreation;
        totalPayableAtCreation = inv.totalPayableAtCreation;
        paidAmountAtCreation = inv.paidAmountAtCreation;
        finalDueAtCreation = inv.finalDueAtCreation;
      });
    };

    for (u in backup.users.vals()) {
      users.add(Principal.toText(u.principalId), u);
    };
    for (p in backup.productsList.vals()) {
      productsList.add(p.id, p);
    };
    for (c in backup.customersList.vals()) {
      customersList.add(c.id, c);
    };
    for (pay in backup.paymentsList.vals()) {
      paymentsList.add(pay.id, pay);
    };
    for (m in backup.rawMaterialsList.vals()) {
      rawMaterialsList.add(m.id, m);
    };
    for (pur in backup.purchasesList.vals()) {
      purchasesList.add(pur.id, pur);
    };
    for (exp in backup.expensesList.vals()) {
      expensesList.add(exp.id, exp);
    };
    for (vp in backup.vendorPaymentsList.vals()) {
      vendorPaymentsList.add(vp.id, vp);
    };
    for (emp in backup.employeesList.vals()) {
      employeesList.add(emp.id, emp);
    };
    for (jw in backup.jobWorksList.vals()) {
      jobWorksList.add(jw.id, jw);
    };
    for (dw in backup.dailyWorkUpdatesList.vals()) {
      dailyWorkUpdatesList.add(dw.id, dw);
    };
    for (jc in backup.jobCollectionsList.vals()) {
      jobCollectionsList.add(jc.id, jc);
    };
    for (ep in backup.employeePaymentsList.vals()) {
      employeePaymentsList.add(ep.id, ep);
    };
    for (col in backup.collectionsList.vals()) {
      collectionsList.add(col.id, col);
    };
    for (sm in backup.stockMovementsList.vals()) {
      stockMovementsList.add(sm.id, sm);
    };
    for (al in backup.auditLogsList.vals()) {
      auditLogsList.add(al.id, al);
    };
    for (el in backup.employeeLedgersList.vals()) {
      employeeLedgersList.add(el.id, el);
    };
    for (cl in backup.consumptionLogsList.vals()) {
      consumptionLogsList.add(cl.id, cl);
    };
    for (fgl in backup.finishedGoodsLogsList.vals()) {
      finishedGoodsLogsList.add(fgl.id, fgl);
    };

    lastInvoiceId := backup.lastInvoiceId;
    userCount := backup.userCount;
    lastLogId := backup.lastLogId;
    productCount := backup.productCount;
    customerCount := backup.customerCount;
    lastPaymentId := backup.lastPaymentId;
    lastPurchaseId := backup.lastPurchaseId;
    lastExpenseId := backup.lastExpenseId;
    lastVendorPaymentId := backup.lastVendorPaymentId;
    lastConsumptionId := backup.lastConsumptionId;
    employeeCount := backup.employeeCount;
    lastJobWorkId := backup.lastJobWorkId;
    lastDailyWorkUpdateId := backup.lastDailyWorkUpdateId;
    lastJobCollectionId := backup.lastJobCollectionId;
    lastEmployeePaymentId := backup.lastEmployeePaymentId;
    lastCollectionId := backup.lastCollectionId;
    lastStockMovementId := backup.lastStockMovementId;
    lastAuditLogId := backup.lastAuditLogId;
    lastEmployeeLedgerId := backup.lastEmployeeLedgerId;
    lastConsumptionLogId := backup.lastConsumptionLogId;
    lastFinishedGoodsLogId := backup.lastFinishedGoodsLogId;

    let actList = List.empty<ActivityLog>();
    var idxAct = backup.activityLogs.size();
    while (idxAct > 0) {
      idxAct := idxAct - 1;
      List.add<ActivityLog>(actList, backup.activityLogs[idxAct]);
    };
    activityLogs := actList;

    let consList = List.empty<MaterialConsumptionEntry>();
    var idxCons = backup.consumptionHistory.size();
    while (idxCons > 0) {
      idxCons := idxCons - 1;
      List.add<MaterialConsumptionEntry>(consList, backup.consumptionHistory[idxCons]);
    };
    consumptionHistory := consList;

    settings := backup.settings;

    logActivity(caller, "Restore Backup", "System database restored from backup");
    createAuditLogInternal(callerText, "Backup Restored", "System database restored from backup");
  };
};
