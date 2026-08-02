import type { backendInterface, Purchase, PurchaseOrder, GRN } from '../backend';
import { executeRepository, executeRepositoryResult } from './base/repositoryRunner';
import type { ApiResult } from '../utils/apiResult';

export class PurchaseRepository {
  static async getPurchases(actor: backendInterface): Promise<Purchase[]> {
    return executeRepository('Purchase', 'getPurchases', actor, () => actor.getPurchases(), { fallbackValue: [] });
  }

  static async getPurchasesResult(actor: backendInterface): Promise<ApiResult<Purchase[]>> {
    return executeRepositoryResult('Purchase', 'getPurchases', actor, () => actor.getPurchases(), { fallbackValue: [] });
  }

  static async savePurchase(
    actor: backendInterface,
    data: any
  ): Promise<string> {
    return executeRepository('Purchase', 'savePurchase', actor, () =>
      actor.savePurchase(
        data.purchaseNumber || '',
        data.vendorName || '',
        data.vendorMobile || '',
        data.vendorGstNumber || '',
        data.vendorAddress || '',
        data.items || [],
        data.totalAmount || 0,
        data.paidAmount || 0
      )
    );
  }

  static async deletePurchase(actor: backendInterface, id: bigint): Promise<void> {
    return executeRepository('Purchase', 'deletePurchase', actor, () => actor.deletePurchase(id));
  }

  static async getPurchaseInvoices(actor: backendInterface): Promise<any[]> {
    return executeRepository('Purchase', 'getPurchaseInvoices', actor, async () => {
      if ((actor as any).getPurchaseInvoices) {
        return (actor as any).getPurchaseInvoices();
      }
      return [];
    }, { fallbackValue: [] });
  }

  static async getPurchaseInvoiceById(actor: backendInterface, id: string): Promise<any> {
    return executeRepository('Purchase', 'getPurchaseInvoiceById', actor, async () => {
      if ((actor as any).getPurchaseInvoiceById) {
        return (actor as any).getPurchaseInvoiceById(id);
      }
      return null;
    });
  }

  static async recordPurchasePayment(
    actor: backendInterface,
    data: { invoiceId: string; paymentData: any }
  ): Promise<any> {
    return executeRepository('Purchase', 'recordPurchasePayment', actor, async () => {
      if ((actor as any).recordPurchasePayment) {
        return (actor as any).recordPurchasePayment(data.invoiceId, data.paymentData);
      }
      return null;
    });
  }

  static async cancelPurchaseInvoice(actor: backendInterface, invoiceId: string): Promise<any> {
    return executeRepository('Purchase', 'cancelPurchaseInvoice', actor, async () => {
      if ((actor as any).cancelPurchaseInvoice) {
        return (actor as any).cancelPurchaseInvoice(invoiceId);
      }
      return null;
    });
  }

  static async getPurchaseOrders(actor: backendInterface): Promise<PurchaseOrder[]> {
    return executeRepository('Purchase', 'getPurchaseOrders', actor, () => actor.getPurchaseOrders(), { fallbackValue: [] });
  }

  static async savePurchaseOrder(actor: backendInterface, po: PurchaseOrder): Promise<void> {
    return executeRepository('Purchase', 'savePurchaseOrder', actor, () => actor.savePurchaseOrder(po));
  }

  static async deletePurchaseOrder(actor: backendInterface, id: string): Promise<void> {
    return executeRepository('Purchase', 'deletePurchaseOrder', actor, () => actor.deletePurchaseOrder(id));
  }

  static async getGRNs(actor: backendInterface): Promise<GRN[]> {
    return executeRepository('Purchase', 'getGRNs', actor, () => actor.getGRNs(), { fallbackValue: [] });
  }

  static async saveGRN(actor: backendInterface, grn: GRN): Promise<void> {
    return executeRepository('Purchase', 'saveGRN', actor, () => actor.saveGRN(grn));
  }

  static async receivePOItem(
    actor: backendInterface,
    data: { poId: string; qty: number; invoiceNo?: string; expiryDate?: string; remarks?: string }
  ): Promise<void> {
    return executeRepository('Purchase', 'receivePOItem', actor, () =>
      actor.receivePOItem(data.poId, data.qty, data.invoiceNo || '', data.expiryDate, data.remarks)
    );
  }
}
