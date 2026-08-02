import type { backendInterface, Invoice, CustomerInfo } from '../backend';
import { mapCandidInvoice, mapCandidInvoices } from '../utils/candidMappers';

export class InvoiceRepository {
  static async getInvoices(actor: backendInterface): Promise<Invoice[]> {
    const res = await actor.getInvoices();
    return mapCandidInvoices(res);
  }

  static async getInvoiceById(actor: backendInterface, id: bigint): Promise<Invoice> {
    const res = await actor.getInvoiceById(id);
    return mapCandidInvoice(res);
  }

  static async getNextInvoiceNumber(actor: backendInterface): Promise<string> {
    return actor.getNextInvoiceNumber();
  }

  static async saveInvoice(
    actor: backendInterface,
    data: {
      businessInfo: any;
      customerInfo: CustomerInfo;
      products: any[];
      totalAmount: number;
      paidAmount: number;
    }
  ): Promise<string> {
    return actor.saveInvoice(
      data.businessInfo,
      data.customerInfo,
      data.products,
      data.totalAmount,
      data.paidAmount
    );
  }

  static async updateInvoice(
    actor: backendInterface,
    data: {
      id: bigint;
      businessInfo: any;
      customerInfo: CustomerInfo;
      products: any[];
      totalAmount: number;
      paidAmount: number;
    }
  ): Promise<void> {
    return actor.updateInvoice(
      data.id,
      data.businessInfo,
      data.customerInfo,
      data.products,
      data.totalAmount,
      data.paidAmount
    );
  }

  static async deleteInvoice(actor: backendInterface, id: bigint): Promise<void> {
    return actor.deleteInvoice(id);
  }
}
