import type { backendInterface, Purchase, PurchaseItem, PurchaseOrder, GRN } from '../backend';

export class PurchaseRepository {
  static async getPurchases(actor: backendInterface): Promise<Purchase[]> {
    return actor.getPurchases();
  }

  static async savePurchase(
    actor: backendInterface,
    data: any
  ): Promise<string> {
    return actor.savePurchase(
      data.purchaseNumber || '',
      data.vendorName || '',
      data.vendorMobile || '',
      data.vendorGstNumber || '',
      data.vendorAddress || '',
      data.items || [],
      data.totalAmount || 0,
      data.paidAmount || 0
    );
  }

  static async deletePurchase(actor: backendInterface, id: bigint): Promise<void> {
    return actor.deletePurchase(id);
  }

  static async getPurchaseInvoices(actor: backendInterface): Promise<any[]> {
    return (actor as any).getPurchaseInvoices ? (actor as any).getPurchaseInvoices() : [];
  }

  static async getPurchaseInvoiceById(actor: backendInterface, id: string): Promise<any> {
    return (actor as any).getPurchaseInvoiceById ? (actor as any).getPurchaseInvoiceById(id) : null;
  }

  static async recordPurchasePayment(
    actor: backendInterface,
    data: { invoiceId: string; paymentData: any }
  ): Promise<any> {
    return (actor as any).recordPurchasePayment ? (actor as any).recordPurchasePayment(data.invoiceId, data.paymentData) : null;
  }

  static async cancelPurchaseInvoice(actor: backendInterface, invoiceId: string): Promise<any> {
    return (actor as any).cancelPurchaseInvoice ? (actor as any).cancelPurchaseInvoice(invoiceId) : null;
  }

  static async getPurchaseOrders(actor: backendInterface): Promise<PurchaseOrder[]> {
    return actor.getPurchaseOrders();
  }

  static async savePurchaseOrder(actor: backendInterface, po: PurchaseOrder): Promise<void> {
    return actor.savePurchaseOrder(po);
  }

  static async deletePurchaseOrder(actor: backendInterface, id: string): Promise<void> {
    return actor.deletePurchaseOrder(id);
  }

  static async getGRNs(actor: backendInterface): Promise<GRN[]> {
    return actor.getGRNs();
  }

  static async saveGRN(actor: backendInterface, grn: GRN): Promise<void> {
    return actor.saveGRN(grn);
  }

  static async receivePOItem(
    actor: backendInterface,
    data: { poId: string; qty: number; invoiceNo?: string; expiryDate?: string; remarks?: string }
  ): Promise<void> {
    return actor.receivePOItem(data.poId, data.qty, data.invoiceNo || '', data.expiryDate, data.remarks);
  }
}
