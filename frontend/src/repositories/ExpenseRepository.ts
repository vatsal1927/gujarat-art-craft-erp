import type { backendInterface, Expense, VendorPayment } from '../backend';

export class ExpenseRepository {
  static async getExpenses(actor: backendInterface): Promise<Expense[]> {
    return actor.getExpenses();
  }

  static async saveExpense(
    actor: backendInterface,
    data: { category: string; amount: number; description: string }
  ): Promise<bigint> {
    return actor.saveExpense(data.category, data.amount, data.description);
  }

  static async deleteExpense(actor: backendInterface, id: bigint): Promise<void> {
    return actor.deleteExpense(id);
  }

  static async getVendorPayments(actor: backendInterface): Promise<VendorPayment[]> {
    return actor.getVendorPayments();
  }

  static async saveVendorPayment(
    actor: backendInterface,
    data: { vendorName: string; amount: number; paymentMode: string; remarks: string }
  ): Promise<any> {
    return (actor as any).saveVendorPayment ? (actor as any).saveVendorPayment(data.vendorName, data.amount, data.paymentMode, data.remarks) : Promise.resolve();
  }

  static async collectVendorPayment(
    actor: backendInterface,
    data: { vendorName: string; amount: number; notes: string }
  ): Promise<any> {
    return (actor as any).collectVendorPayment ? (actor as any).collectVendorPayment(data.vendorName, data.amount, data.notes) : Promise.resolve();
  }
}
