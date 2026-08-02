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
import { executeRepository, executeRepositoryResult } from './base/repositoryRunner';
import type { ApiResult } from '../utils/apiResult';

export class ProductionRepository {
  static async getEmployees(actor: backendInterface): Promise<Employee[]> {
    return executeRepository('Production', 'getEmployees', actor, () => actor.getEmployees(), { fallbackValue: [] });
  }

  static async getEmployeesResult(actor: backendInterface): Promise<ApiResult<Employee[]>> {
    return executeRepositoryResult('Production', 'getEmployees', actor, () => actor.getEmployees(), { fallbackValue: [] });
  }

  static async saveEmployee(actor: backendInterface, data: any): Promise<string> {
    return executeRepository('Production', 'saveEmployee', actor, () =>
      actor.saveEmployee(
        data.id || '',
        data.name || '',
        data.mobile || '',
        data.address || '',
        data.joiningDate || BigInt(Date.now()),
        data.skillType || '',
        data.status || 'Active'
      )
    );
  }

  static async deleteEmployee(actor: backendInterface, id: string): Promise<void> {
    return executeRepository('Production', 'deleteEmployee', actor, () => actor.deleteEmployee(id));
  }

  static async getJobWorkList(actor: backendInterface): Promise<JobWork[]> {
    return executeRepository('Production', 'getJobWorkList', actor, () => actor.getJobWorks(), { fallbackValue: [] });
  }

  static async getJobWorks(actor: backendInterface): Promise<JobWork[]> {
    return executeRepository('Production', 'getJobWorks', actor, () => actor.getJobWorks(), { fallbackValue: [] });
  }

  static async saveJobWork(actor: backendInterface, data: any): Promise<bigint> {
    return executeRepository('Production', 'saveJobWork', actor, () =>
      actor.saveJobWork(
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
      )
    );
  }

  static async updateJobWorkStatus(actor: backendInterface, id: bigint, status: string): Promise<void> {
    return executeRepository('Production', 'updateJobWorkStatus', actor, async () => {
      if ((actor as any).updateJobWorkStatus) {
        return (actor as any).updateJobWorkStatus(id, status);
      }
    });
  }

  static async updateJobWorkProgress(actor: backendInterface, jobId: bigint, completedQty: number, remarks: string): Promise<any> {
    return executeRepository('Production', 'updateJobWorkProgress', actor, async () => {
      if ((actor as any).updateJobWorkProgress) {
        return (actor as any).updateJobWorkProgress(jobId, completedQty, remarks);
      }
      return null;
    });
  }

  static async deleteJobWork(actor: backendInterface, id: bigint): Promise<void> {
    return executeRepository('Production', 'deleteJobWork', actor, async () => {
      if ((actor as any).deleteJobWork) {
        return (actor as any).deleteJobWork(id);
      }
    });
  }

  static async getEmployeePayments(actor: backendInterface): Promise<EmployeePayment[]> {
    return executeRepository('Production', 'getEmployeePayments', actor, () => actor.getEmployeePayments(), { fallbackValue: [] });
  }

  static async saveEmployeePayment(actor: backendInterface, data: any): Promise<bigint> {
    return executeRepository('Production', 'saveEmployeePayment', actor, () =>
      actor.saveEmployeePayment(
        data.employeeName || data.karigarName || '',
        data.amountPaid || data.paymentAmount || 0,
        data.paymentMode || '',
        data.remarks || data.note || ''
      )
    );
  }

  static async editEmployeePayment(actor: backendInterface, paymentId: bigint, amountPaid: number, paymentMode: string, remarks: string): Promise<any> {
    return executeRepository('Production', 'editEmployeePayment', actor, async () => {
      if ((actor as any).editEmployeePayment) {
        return (actor as any).editEmployeePayment(paymentId, amountPaid, paymentMode, remarks);
      }
      return null;
    });
  }

  static async deleteEmployeePayment(actor: backendInterface, paymentId: bigint): Promise<void> {
    return executeRepository('Production', 'deleteEmployeePayment', actor, () => actor.deleteEmployeePayment(paymentId));
  }

  static async getEmployeeDashboardStats(actor: backendInterface): Promise<EmployeeDashboardStats> {
    return executeRepository('Production', 'getEmployeeDashboardStats', actor, () => actor.getEmployeeDashboardStats());
  }

  static async getCustomerOrderLinks(actor: backendInterface): Promise<CustomerOrderLink[]> {
    return executeRepository('Production', 'getCustomerOrderLinks', actor, async () => {
      if ((actor as any).getCustomerOrderLinks) {
        return (actor as any).getCustomerOrderLinks();
      }
      return [];
    }, { fallbackValue: [] });
  }

  static async saveCustomerOrderLink(actor: backendInterface, link: CustomerOrderLink): Promise<string> {
    return executeRepository('Production', 'saveCustomerOrderLink', actor, async () => {
      if ((actor as any).saveCustomerOrderLink) {
        return (actor as any).saveCustomerOrderLink(link);
      }
      return '';
    });
  }

  static async getKarigarCollections(actor: backendInterface): Promise<KarigarCollection[]> {
    return executeRepository('Production', 'getKarigarCollections', actor, () => actor.getCollections(), { fallbackValue: [] });
  }

  static async getCollections(actor: backendInterface): Promise<KarigarCollection[]> {
    return executeRepository('Production', 'getCollections', actor, () => actor.getCollections(), { fallbackValue: [] });
  }

  static async saveKarigarCollection(actor: backendInterface, col: KarigarCollection): Promise<string> {
    return executeRepository('Production', 'saveKarigarCollection', actor, async () => {
      if ((actor as any).saveKarigarCollection) {
        return (actor as any).saveKarigarCollection(col);
      }
      return '';
    });
  }

  static async saveCollectionEntry(actor: backendInterface, data: any): Promise<any> {
    return executeRepository('Production', 'saveCollectionEntry', actor, async () => {
      if ((actor as any).saveCollectionEntry) {
        return (actor as any).saveCollectionEntry(data);
      }
      return null;
    });
  }

  static async editCollectionEntry(actor: backendInterface, data: any): Promise<any> {
    return executeRepository('Production', 'editCollectionEntry', actor, async () => {
      if ((actor as any).editCollectionEntry) {
        return (actor as any).editCollectionEntry(data);
      }
      return null;
    });
  }

  static async deleteCollectionEntry(actor: backendInterface, collectionId: bigint): Promise<any> {
    return executeRepository('Production', 'deleteCollectionEntry', actor, async () => {
      if ((actor as any).deleteCollectionEntry) {
        return (actor as any).deleteCollectionEntry(collectionId);
      }
      return null;
    });
  }

  static async approveCollection(actor: backendInterface, id: bigint): Promise<void> {
    return executeRepository('Production', 'approveCollection', actor, async () => {
      if ((actor as any).approveCollection) {
        return (actor as any).approveCollection(id);
      }
    });
  }

  static async rejectCollection(actor: backendInterface, id: bigint, reason: string): Promise<void> {
    return executeRepository('Production', 'rejectCollection', actor, async () => {
      if ((actor as any).rejectCollection) {
        return (actor as any).rejectCollection(id, reason);
      }
    });
  }

  static async getKarigarLedger(actor: backendInterface, employeeName?: string): Promise<EmployeeLedgerEntry[]> {
    return executeRepository('Production', 'getKarigarLedger', actor, () => actor.getKarigarLedger(employeeName || ""), { fallbackValue: [] });
  }

  static async getSalesOrders(actor: backendInterface): Promise<SalesOrder[]> {
    return executeRepository('Production', 'getSalesOrders', actor, () => actor.getSalesOrders(), { fallbackValue: [] });
  }

  static async saveSalesOrder(actor: backendInterface, so: SalesOrder): Promise<void> {
    return executeRepository('Production', 'saveSalesOrder', actor, () => actor.saveSalesOrder(so));
  }

  static async deleteSalesOrder(actor: backendInterface, id: string): Promise<void> {
    return executeRepository('Production', 'deleteSalesOrder', actor, async () => {
      if ((actor as any).deleteSalesOrder) {
        return (actor as any).deleteSalesOrder(id);
      }
    });
  }

  static async reserveStockForOrder(actor: backendInterface, orderId: string): Promise<any> {
    return executeRepository('Production', 'reserveStockForOrder', actor, async () => {
      if ((actor as any).reserveStockForOrder) {
        return (actor as any).reserveStockForOrder(orderId);
      }
      return null;
    });
  }

  static async getProductionRequirements(actor: backendInterface): Promise<ProductionRequirement[]> {
    return executeRepository('Production', 'getProductionRequirements', actor, () => actor.getProductionRequirements(), { fallbackValue: [] });
  }

  static async saveProductionRequirement(actor: backendInterface, req: ProductionRequirement): Promise<void> {
    return executeRepository('Production', 'saveProductionRequirement', actor, () => actor.saveProductionRequirement(req));
  }

  static async completeProductionPlan(actor: backendInterface, requirementId: string, completedQty: number): Promise<void> {
    return executeRepository('Production', 'completeProductionPlan', actor, () => actor.completeProductionPlan(requirementId, completedQty));
  }

  static async getPurchaseRequirements(actor: backendInterface): Promise<PurchaseRequirement[]> {
    return executeRepository('Production', 'getPurchaseRequirements', actor, () => actor.getPurchaseRequirements(), { fallbackValue: [] });
  }

  static async savePurchaseRequirement(actor: backendInterface, req: PurchaseRequirement): Promise<void> {
    return executeRepository('Production', 'savePurchaseRequirement', actor, () => actor.savePurchaseRequirement(req));
  }

  static async receivePurchaseRequirement(actor: backendInterface, requirementId: string, qty: number): Promise<any> {
    return executeRepository('Production', 'receivePurchaseRequirement', actor, async () => {
      if ((actor as any).receivePurchaseRequirement) {
        return (actor as any).receivePurchaseRequirement(requirementId, qty);
      }
      return null;
    });
  }

  static async getMRPRecords(actor: backendInterface): Promise<MRPRecord[]> {
    return executeRepository('Production', 'getMRPRecords', actor, () => actor.getMRPRecords(), { fallbackValue: [] });
  }

  static async runMRP(actor: backendInterface, productionRequirementId: string): Promise<MRPRecord> {
    return executeRepository('Production', 'runMRP', actor, () => actor.runMRP(productionRequirementId));
  }
}
