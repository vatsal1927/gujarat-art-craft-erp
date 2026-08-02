import type { backendInterface, Expense, VendorPayment } from '../backend';
import { executeRepository, executeRepositoryResult } from './base/repositoryRunner';
import type { ApiResult } from '../utils/apiResult';

export class ExpenseRepository {
  static async getExpenses(actor: backendInterface): Promise<Expense[]> {
    return executeRepository('Expense', 'getExpenses', actor, () => actor.getExpenses(), { fallbackValue: [] });
  }

  static async getExpensesResult(actor: backendInterface): Promise<ApiResult<Expense[]>> {
    return executeRepositoryResult('Expense', 'getExpenses', actor, () => actor.getExpenses(), { fallbackValue: [] });
  }

  static async saveExpense(
    actor: backendInterface,
    data: { category: string; amount: number; description: string }
  ): Promise<bigint> {
    return executeRepository('Expense', 'saveExpense', actor, () =>
      actor.saveExpense(data.category, data.amount, data.description)
    );
  }

  static async saveExpenseResult(
    actor: backendInterface,
    data: { category: string; amount: number; description: string }
  ): Promise<ApiResult<bigint>> {
    return executeRepositoryResult('Expense', 'saveExpense', actor, () =>
      actor.saveExpense(data.category, data.amount, data.description)
    );
  }

  static async deleteExpense(actor: backendInterface, id: bigint): Promise<void> {
    return executeRepository('Expense', 'deleteExpense', actor, () => actor.deleteExpense(id));
  }

  static async deleteExpenseResult(actor: backendInterface, id: bigint): Promise<ApiResult<void>> {
    return executeRepositoryResult('Expense', 'deleteExpense', actor, () => actor.deleteExpense(id));
  }

  static async getVendorPayments(actor: backendInterface): Promise<VendorPayment[]> {
    return executeRepository('Expense', 'getVendorPayments', actor, () => actor.getVendorPayments(), { fallbackValue: [] });
  }

  static async getVendorPaymentsResult(actor: backendInterface): Promise<ApiResult<VendorPayment[]>> {
    return executeRepositoryResult('Expense', 'getVendorPayments', actor, () => actor.getVendorPayments(), { fallbackValue: [] });
  }

  static async saveVendorPayment(
    actor: backendInterface,
    data: { vendorName: string; amount: number; paymentMode: string; remarks: string }
  ): Promise<any> {
    return executeRepository('Expense', 'saveVendorPayment', actor, async () => {
      if ((actor as any).saveVendorPayment) {
        return (actor as any).saveVendorPayment(data.vendorName, data.amount, data.paymentMode, data.remarks);
      }
      return null;
    });
  }

  static async saveVendorPaymentResult(
    actor: backendInterface,
    data: { vendorName: string; amount: number; paymentMode: string; remarks: string }
  ): Promise<ApiResult<any>> {
    return executeRepositoryResult('Expense', 'saveVendorPayment', actor, async () => {
      if ((actor as any).saveVendorPayment) {
        return (actor as any).saveVendorPayment(data.vendorName, data.amount, data.paymentMode, data.remarks);
      }
      return null;
    });
  }

  static async collectVendorPayment(
    actor: backendInterface,
    data: { vendorName: string; amount: number; notes: string }
  ): Promise<any> {
    return executeRepository('Expense', 'collectVendorPayment', actor, async () => {
      if ((actor as any).collectVendorPayment) {
        return (actor as any).collectVendorPayment(data.vendorName, data.amount, data.notes);
      }
      return null;
    });
  }

  static async collectVendorPaymentResult(
    actor: backendInterface,
    data: { vendorName: string; amount: number; notes: string }
  ): Promise<ApiResult<any>> {
    return executeRepositoryResult('Expense', 'collectVendorPayment', actor, async () => {
      if ((actor as any).collectVendorPayment) {
        return (actor as any).collectVendorPayment(data.vendorName, data.amount, data.notes);
      }
      return null;
    });
  }
}
