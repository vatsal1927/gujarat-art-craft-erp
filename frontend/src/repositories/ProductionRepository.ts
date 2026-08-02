import type {
  backendInterface,
  Employee,
  JobWork,
  EmployeePayment,
  EmployeeDashboardStats,
  CustomerOrderLink,
  KarigarCollection,
  EmployeeLedgerEntry,
  SalesOrder,
  ProductionRequirement,
  PurchaseRequirement,
  MRPRecord,
} from '../backend';

export class ProductionRepository {
  static async getEmployees(actor: backendInterface): Promise<Employee[]> {
    return actor.getEmployees();
  }

  static async saveEmployee(actor: backendInterface, data: any): Promise<string> {
    return actor.saveEmployee(
      data.id || '',
      data.name || '',
      data.mobile || '',
      data.address || '',
      data.joiningDate || BigInt(Date.now()),
      data.skillType || '',
      data.status || 'Active'
    );
  }

  static async deleteEmployee(actor: backendInterface, id: string): Promise<void> {
    return actor.deleteEmployee(id);
  }

  static async getJobWorkList(actor: backendInterface): Promise<JobWork[]> {
    return actor.getJobWorks();
  }

  static async getJobWorks(actor: backendInterface): Promise<JobWork[]> {
    return actor.getJobWorks();
  }

  static async saveJobWork(actor: backendInterface, data: any): Promise<bigint> {
    return actor.saveJobWork(
      data.jobDate || BigInt(Date.now()),
      data.employeeName || '',
      data.mobileNumber || '',
      data.productName || '',
      data.productCode || '',
      data.hsnCode || '',
      data.qtyGiven || 0,
      data.ratePerPiece || 0,
      data.expectedReturnDate || BigInt(Date.now()),
      data.remarks || '',
      data.customerOrderLink || null
    );
  }

  static async updateJobWorkStatus(actor: backendInterface, id: bigint, status: string): Promise<void> {
    return (actor as any).updateJobWorkStatus ? (actor as any).updateJobWorkStatus(id, status) : Promise.resolve();
  }

  static async updateJobWorkProgress(actor: backendInterface, jobId: bigint, completedQty: number, remarks: string): Promise<any> {
    return (actor as any).updateJobWorkProgress ? (actor as any).updateJobWorkProgress(jobId, completedQty, remarks) : Promise.resolve();
  }

  static async deleteJobWork(actor: backendInterface, id: bigint): Promise<void> {
    return (actor as any).deleteJobWork ? (actor as any).deleteJobWork(id) : Promise.resolve();
  }

  static async getEmployeePayments(actor: backendInterface): Promise<EmployeePayment[]> {
    return actor.getEmployeePayments();
  }

  static async saveEmployeePayment(actor: backendInterface, data: any): Promise<bigint> {
    return actor.saveEmployeePayment(
      data.employeeName || data.karigarName || '',
      data.amountPaid || data.paymentAmount || 0,
      data.paymentMode || '',
      data.remarks || data.note || ''
    );
  }

  static async editEmployeePayment(actor: backendInterface, paymentId: bigint, amountPaid: number, paymentMode: string, remarks: string): Promise<any> {
    return (actor as any).editEmployeePayment ? (actor as any).editEmployeePayment(paymentId, amountPaid, paymentMode, remarks) : Promise.resolve();
  }

  static async deleteEmployeePayment(actor: backendInterface, paymentId: bigint): Promise<void> {
    return actor.deleteEmployeePayment(paymentId);
  }

  static async getEmployeeDashboardStats(actor: backendInterface): Promise<EmployeeDashboardStats> {
    return actor.getEmployeeDashboardStats();
  }

  static async getCustomerOrderLinks(actor: backendInterface): Promise<CustomerOrderLink[]> {
    return (actor as any).getCustomerOrderLinks ? (actor as any).getCustomerOrderLinks() : Promise.resolve([]);
  }

  static async saveCustomerOrderLink(actor: backendInterface, link: CustomerOrderLink): Promise<string> {
    return (actor as any).saveCustomerOrderLink ? (actor as any).saveCustomerOrderLink(link) : Promise.resolve('');
  }

  static async getKarigarCollections(actor: backendInterface): Promise<KarigarCollection[]> {
    return actor.getCollections();
  }

  static async getCollections(actor: backendInterface): Promise<KarigarCollection[]> {
    return actor.getCollections();
  }

  static async saveKarigarCollection(actor: backendInterface, col: KarigarCollection): Promise<string> {
    return (actor as any).saveKarigarCollection ? (actor as any).saveKarigarCollection(col) : Promise.resolve('');
  }

  static async saveCollectionEntry(actor: backendInterface, data: any): Promise<any> {
    return (actor as any).saveCollectionEntry ? (actor as any).saveCollectionEntry(data) : Promise.resolve();
  }

  static async editCollectionEntry(actor: backendInterface, data: any): Promise<any> {
    return (actor as any).editCollectionEntry ? (actor as any).editCollectionEntry(data) : Promise.resolve();
  }

  static async deleteCollectionEntry(actor: backendInterface, collectionId: bigint): Promise<any> {
    return (actor as any).deleteCollectionEntry ? (actor as any).deleteCollectionEntry(collectionId) : Promise.resolve();
  }

  static async approveCollection(actor: backendInterface, id: bigint): Promise<void> {
    return (actor as any).approveCollection ? (actor as any).approveCollection(id) : Promise.resolve();
  }

  static async rejectCollection(actor: backendInterface, id: bigint, reason: string): Promise<void> {
    return (actor as any).rejectCollection ? (actor as any).rejectCollection(id, reason) : Promise.resolve();
  }

  static async getKarigarLedger(actor: backendInterface, employeeName?: string): Promise<EmployeeLedgerEntry[]> {
    return actor.getKarigarLedger(employeeName || "");
  }

  static async getSalesOrders(actor: backendInterface): Promise<SalesOrder[]> {
    return actor.getSalesOrders();
  }

  static async saveSalesOrder(actor: backendInterface, so: SalesOrder): Promise<void> {
    return actor.saveSalesOrder(so);
  }

  static async deleteSalesOrder(actor: backendInterface, id: string): Promise<void> {
    return (actor as any).deleteSalesOrder ? (actor as any).deleteSalesOrder(id) : Promise.resolve();
  }

  static async reserveStockForOrder(actor: backendInterface, orderId: string): Promise<any> {
    return (actor as any).reserveStockForOrder ? (actor as any).reserveStockForOrder(orderId) : Promise.resolve();
  }

  static async getProductionRequirements(actor: backendInterface): Promise<ProductionRequirement[]> {
    return actor.getProductionRequirements();
  }

  static async saveProductionRequirement(actor: backendInterface, req: ProductionRequirement): Promise<void> {
    return actor.saveProductionRequirement(req);
  }

  static async completeProductionPlan(actor: backendInterface, requirementId: string, completedQty: number): Promise<void> {
    return actor.completeProductionPlan(requirementId, completedQty);
  }

  static async getPurchaseRequirements(actor: backendInterface): Promise<PurchaseRequirement[]> {
    return actor.getPurchaseRequirements();
  }

  static async savePurchaseRequirement(actor: backendInterface, req: PurchaseRequirement): Promise<void> {
    return actor.savePurchaseRequirement(req);
  }

  static async receivePurchaseRequirement(actor: backendInterface, requirementId: string, qty: number): Promise<any> {
    return (actor as any).receivePurchaseRequirement ? (actor as any).receivePurchaseRequirement(requirementId, qty) : Promise.resolve();
  }

  static async getMRPRecords(actor: backendInterface): Promise<MRPRecord[]> {
    return actor.getMRPRecords();
  }

  static async runMRP(actor: backendInterface, productionRequirementId: string): Promise<MRPRecord> {
    return actor.runMRP(productionRequirementId);
  }
}
