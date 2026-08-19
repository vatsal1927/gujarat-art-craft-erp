import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
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

  public type CustomerInfo = {
    name : Text;
    businessAddress : Text;
    taxId : Text;
  };

  public type NewInternalInvoice = {
    id : Nat;
    invoiceNumber : Text;
    date : Time.Time;
    businessInfo : Text;
    customerInfo : CustomerInfo;
    products : List.List<(Text, Nat, Int)>;
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

  public type ProductItem_Old = {
    id : Text;
    vigat : Text;
    rate : Float;
    hsnCode : Text;
    stock : Int;
  };

  type OldActor = {
    invoices : Map.Map<Nat, NewInternalInvoice>;
    lastInvoiceId : Nat;
    settings : ?{
      businessInfo : Text;
      defaultGstRate : Float;
      termsAndConditions : Text;
    };
    users : Map.Map<Text, User>;
    userCount : Nat;
    activityLogs : List.List<ActivityLog>;
    lastLogId : Nat;
    productsList : Map.Map<Text, ProductItem_Old>;
    productCount : Nat;
    customersList : Map.Map<Text, CustomerItem>;
    customerCount : Nat;
    paymentsList : Map.Map<Nat, Payment>;
    lastPaymentId : Nat;
  };

  public type UnitConfig = {
    unitLabel : Text;
    unitType : Text;
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

  public type ProductItem_New = {
    id : Text;
    vigat : Text;
    rate : Float;
    hsnCode : Text;
    stock : Int;
    productionCost : Float;
    bom : [BOMRequirement];
    openingStock : ?Int;
    availableToSell : ?Int;
    reservedStock : ?Int;
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
    minimumStock : ?Float;
    preferredVendor : ?Text;
    reorderLevel : ?Float;
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
    createdAt : ?Text;
    createdBy : ?Text;
    createdById : ?Text;
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

  type NewActor = {
    invoices : Map.Map<Nat, NewInternalInvoice>;
    lastInvoiceId : Nat;
    settings : ?{
      businessInfo : Text;
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
    users : Map.Map<Text, User>;
    userCount : Nat;
    activityLogs : List.List<ActivityLog>;
    lastLogId : Nat;
    productsList : Map.Map<Text, ProductItem_New>;
    productCount : Nat;
    customersList : Map.Map<Text, CustomerItem>;
    customerCount : Nat;
    paymentsList : Map.Map<Nat, Payment>;
    lastPaymentId : Nat;

    rawMaterialsList : Map.Map<Text, RawMaterial>;
    purchasesList : Map.Map<Nat, Purchase>;
    expensesList : Map.Map<Nat, Expense>;
    vendorPaymentsList : Map.Map<Nat, VendorPayment>;
    consumptionHistory : List.List<MaterialConsumptionEntry>;

    lastPurchaseId : Nat;
    lastExpenseId : Nat;
    lastVendorPaymentId : Nat;
    lastConsumptionId : Nat;

    employeesList : Map.Map<Text, Employee>;
    jobWorksList : Map.Map<Nat, JobWork>;
    dailyWorkUpdatesList : Map.Map<Nat, DailyWorkUpdate>;
    jobCollectionsList : Map.Map<Nat, JobCollection>;
    employeePaymentsList : Map.Map<Nat, EmployeePayment>;

    collectionsList : Map.Map<Nat, KarigarCollection>;
    stockMovementsList : Map.Map<Nat, StockMovement>;
    auditLogsList : Map.Map<Nat, AuditLog>;
    employeeLedgersList : Map.Map<Nat, EmployeeLedgerEntry>;

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

  public func run(old : OldActor) : NewActor {
    let newProducts = old.productsList.map<Text, ProductItem_Old, ProductItem_New>(
      func(_id, oldProd) {
        {
          id = oldProd.id;
          vigat = oldProd.vigat;
          rate = oldProd.rate;
          hsnCode = oldProd.hsnCode;
          stock = oldProd.stock;
          productionCost = 0.0;
          bom = [];
          openingStock = ?oldProd.stock;
          availableToSell = null;
          reservedStock = null;
        };
      }
    );
    let newSettings = switch (old.settings) {
      case (?s) {
        ?{
          businessInfo = s.businessInfo;
          defaultGstRate = s.defaultGstRate;
          termsAndConditions = s.termsAndConditions;
          allowStaffCollection = true;
          enableRejectedWage = false;
          companyLogo = null;
          companyName = null;
          themeColors = null;
          sidebarStyle = null;
          allowAdminBackupRestore = null;
        }
      };
      case (null) { null };
    };
    {
      invoices = old.invoices;
      lastInvoiceId = old.lastInvoiceId;
      settings = newSettings;
      users = old.users;
      userCount = old.userCount;
      activityLogs = old.activityLogs;
      lastLogId = old.lastLogId;
      productsList = newProducts;
      productCount = old.productCount;
      customersList = old.customersList;
      customerCount = old.customerCount;
      paymentsList = old.paymentsList;
      lastPaymentId = old.lastPaymentId;

      rawMaterialsList = Map.empty<Text, RawMaterial>();
      purchasesList = Map.empty<Nat, Purchase>();
      expensesList = Map.empty<Nat, Expense>();
      vendorPaymentsList = Map.empty<Nat, VendorPayment>();
      consumptionHistory = List.empty<MaterialConsumptionEntry>();

      lastPurchaseId = 0;
      lastExpenseId = 0;
      lastVendorPaymentId = 0;
      lastConsumptionId = 0;

      employeesList = Map.empty<Text, Employee>();
      jobWorksList = Map.empty<Nat, JobWork>();
      dailyWorkUpdatesList = Map.empty<Nat, DailyWorkUpdate>();
      jobCollectionsList = Map.empty<Nat, JobCollection>();
      employeePaymentsList = Map.empty<Nat, EmployeePayment>();

      collectionsList = Map.empty<Nat, KarigarCollection>();
      stockMovementsList = Map.empty<Nat, StockMovement>();
      auditLogsList = Map.empty<Nat, AuditLog>();
      employeeLedgersList = Map.empty<Nat, EmployeeLedgerEntry>();

      employeeCount = 0;
      lastJobWorkId = 0;
      lastDailyWorkUpdateId = 0;
      lastJobCollectionId = 0;
      lastEmployeePaymentId = 0;

      lastCollectionId = 0;
      lastStockMovementId = 0;
      lastAuditLogId = 0;
      lastEmployeeLedgerId = 0;
    };
  };
};
