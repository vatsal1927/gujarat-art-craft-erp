import type { backendInterface, CustomerItem, Payment } from '../backend';
import { executeRepository, executeRepositoryResult } from './base/repositoryRunner';
import type { ApiResult } from '../utils/apiResult';

export class CustomerRepository {
  static async getCustomers(actor: backendInterface): Promise<CustomerItem[]> {
    return executeRepository('Customer', 'getCustomers', actor, () => actor.getCustomers(), { fallbackValue: [] });
  }

  static async getCustomersResult(actor: backendInterface): Promise<ApiResult<CustomerItem[]>> {
    return executeRepositoryResult('Customer', 'getCustomers', actor, () => actor.getCustomers(), { fallbackValue: [] });
  }

  static async saveCustomer(
    actor: backendInterface,
    data: { id: string; name: string; businessAddress: string; phone: string; gstNo: string }
  ): Promise<void> {
    return executeRepository('Customer', 'saveCustomer', actor, () =>
      actor.saveCustomer(data.id, data.name, data.businessAddress, data.phone, data.gstNo)
    );
  }

  static async saveCustomerResult(
    actor: backendInterface,
    data: { id: string; name: string; businessAddress: string; phone: string; gstNo: string }
  ): Promise<ApiResult<void>> {
    return executeRepositoryResult('Customer', 'saveCustomer', actor, () =>
      actor.saveCustomer(data.id, data.name, data.businessAddress, data.phone, data.gstNo)
    );
  }

  static async deleteCustomer(actor: backendInterface, id: string): Promise<void> {
    return executeRepository('Customer', 'deleteCustomer', actor, () => actor.deleteCustomer(id));
  }

  static async deleteCustomerResult(actor: backendInterface, id: string): Promise<ApiResult<void>> {
    return executeRepositoryResult('Customer', 'deleteCustomer', actor, () => actor.deleteCustomer(id));
  }

  static async collectPayment(
    actor: backendInterface,
    data: { customerId: string; amount: number; notes: string }
  ): Promise<void> {
    return executeRepository('Customer', 'collectPayment', actor, () =>
      actor.collectPayment(data.customerId, data.amount, data.notes)
    );
  }

  static async collectPaymentResult(
    actor: backendInterface,
    data: { customerId: string; amount: number; notes: string }
  ): Promise<ApiResult<void>> {
    return executeRepositoryResult('Customer', 'collectPayment', actor, () =>
      actor.collectPayment(data.customerId, data.amount, data.notes)
    );
  }

  static async getPayments(actor: backendInterface): Promise<Payment[]> {
    return executeRepository('Customer', 'getPayments', actor, () => actor.getPayments(), { fallbackValue: [] });
  }

  static async getPaymentsResult(actor: backendInterface): Promise<ApiResult<Payment[]>> {
    return executeRepositoryResult('Customer', 'getPayments', actor, () => actor.getPayments(), { fallbackValue: [] });
  }

  static async getPaymentsByCustomer(actor: backendInterface, customerId: string): Promise<Payment[]> {
    return executeRepository('Customer', 'getPaymentsByCustomer', actor, () => actor.getPaymentsByCustomer(customerId), { fallbackValue: [] });
  }

  static async getPaymentsByCustomerResult(actor: backendInterface, customerId: string): Promise<ApiResult<Payment[]>> {
    return executeRepositoryResult('Customer', 'getPaymentsByCustomer', actor, () => actor.getPaymentsByCustomer(customerId), { fallbackValue: [] });
  }
}
