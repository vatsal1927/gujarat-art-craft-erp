import type { backendInterface, CustomerItem, Payment } from '../backend';

export class CustomerRepository {
  static async getCustomers(actor: backendInterface): Promise<CustomerItem[]> {
    return actor.getCustomers();
  }

  static async saveCustomer(
    actor: backendInterface,
    data: { id: string; name: string; businessAddress: string; phone: string; gstNo: string }
  ): Promise<void> {
    return actor.saveCustomer(data.id, data.name, data.businessAddress, data.phone, data.gstNo);
  }

  static async deleteCustomer(actor: backendInterface, id: string): Promise<void> {
    return actor.deleteCustomer(id);
  }

  static async collectPayment(
    actor: backendInterface,
    data: { customerId: string; amount: number; notes: string }
  ): Promise<void> {
    return actor.collectPayment(data.customerId, data.amount, data.notes);
  }

  static async getPayments(actor: backendInterface): Promise<Payment[]> {
    return actor.getPayments();
  }

  static async getPaymentsByCustomer(actor: backendInterface, customerId: string): Promise<Payment[]> {
    return actor.getPaymentsByCustomer(customerId);
  }
}
