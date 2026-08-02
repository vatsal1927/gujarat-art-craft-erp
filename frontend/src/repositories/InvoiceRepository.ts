import type { backendInterface, Invoice, CustomerInfo } from '../backend';
import { mapCandidInvoice, mapCandidInvoices } from '../utils/candidMappers';
import { executeRepository, executeRepositoryResult } from './base/repositoryRunner';
import type { ApiResult } from '../utils/apiResult';

export class InvoiceRepository {
  static async getInvoices(actor: backendInterface): Promise<Invoice[]> {
    return executeRepository('Invoice', 'getInvoices', actor, async () => {
      const res = await actor.getInvoices();
      return mapCandidInvoices(res);
    }, { fallbackValue: [] });
  }

  static async getInvoicesResult(actor: backendInterface): Promise<ApiResult<Invoice[]>> {
    return executeRepositoryResult('Invoice', 'getInvoices', actor, async () => {
      const res = await actor.getInvoices();
      return mapCandidInvoices(res);
    }, { fallbackValue: [] });
  }

  static async getInvoiceById(actor: backendInterface, id: bigint): Promise<Invoice> {
    return executeRepository('Invoice', 'getInvoiceById', actor, async () => {
      const res = await actor.getInvoiceById(id);
      return mapCandidInvoice(res);
    });
  }

  static async getInvoiceByIdResult(actor: backendInterface, id: bigint): Promise<ApiResult<Invoice>> {
    return executeRepositoryResult('Invoice', 'getInvoiceById', actor, async () => {
      const res = await actor.getInvoiceById(id);
      return mapCandidInvoice(res);
    });
  }

  static async getNextInvoiceNumber(actor: backendInterface): Promise<string> {
    return executeRepository('Invoice', 'getNextInvoiceNumber', actor, () => actor.getNextInvoiceNumber());
  }

  static async getNextInvoiceNumberResult(actor: backendInterface): Promise<ApiResult<string>> {
    return executeRepositoryResult('Invoice', 'getNextInvoiceNumber', actor, () => actor.getNextInvoiceNumber());
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
    return executeRepository('Invoice', 'saveInvoice', actor, () =>
      actor.saveInvoice(
        data.businessInfo,
        data.customerInfo,
        data.products,
        data.totalAmount,
        data.paidAmount
      )
    );
  }

  static async saveInvoiceResult(
    actor: backendInterface,
    data: {
      businessInfo: any;
      customerInfo: CustomerInfo;
      products: any[];
      totalAmount: number;
      paidAmount: number;
    }
  ): Promise<ApiResult<string>> {
    return executeRepositoryResult('Invoice', 'saveInvoice', actor, () =>
      actor.saveInvoice(
        data.businessInfo,
        data.customerInfo,
        data.products,
        data.totalAmount,
        data.paidAmount
      )
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
    return executeRepository('Invoice', 'updateInvoice', actor, () =>
      actor.updateInvoice(
        data.id,
        data.businessInfo,
        data.customerInfo,
        data.products,
        data.totalAmount,
        data.paidAmount
      )
    );
  }

  static async updateInvoiceResult(
    actor: backendInterface,
    data: {
      id: bigint;
      businessInfo: any;
      customerInfo: CustomerInfo;
      products: any[];
      totalAmount: number;
      paidAmount: number;
    }
  ): Promise<ApiResult<void>> {
    return executeRepositoryResult('Invoice', 'updateInvoice', actor, () =>
      actor.updateInvoice(
        data.id,
        data.businessInfo,
        data.customerInfo,
        data.products,
        data.totalAmount,
        data.paidAmount
      )
    );
  }

  static async deleteInvoice(actor: backendInterface, id: bigint): Promise<void> {
    return executeRepository('Invoice', 'deleteInvoice', actor, () => actor.deleteInvoice(id));
  }

  static async deleteInvoiceResult(actor: backendInterface, id: bigint): Promise<ApiResult<void>> {
    return executeRepositoryResult('Invoice', 'deleteInvoice', actor, () => actor.deleteInvoice(id));
  }
}
