import { describe, it, expect } from 'vitest';
import { queryKeys } from './queryKeys';

describe('queryKeys factory unit tests', () => {
  it('generates consistent key arrays for simple domain resources', () => {
    expect(queryKeys.dashboardStats()).toEqual(['dashboardStats']);
    expect(queryKeys.invoices()).toEqual(['invoices']);
    expect(queryKeys.nextInvoiceNumber()).toEqual(['nextInvoiceNumber']);
    expect(queryKeys.settings()).toEqual(['settings']);
    expect(queryKeys.userSelf()).toEqual(['userSelf']);
    expect(queryKeys.users()).toEqual(['users']);
    expect(queryKeys.products()).toEqual(['products']);
    expect(queryKeys.customers()).toEqual(['customers']);
    expect(queryKeys.rawMaterials()).toEqual(['rawMaterials']);
    expect(queryKeys.purchases()).toEqual(['purchases']);
    expect(queryKeys.vendors()).toEqual(['vendors']);
  });

  it('generates parameterized key arrays correctly', () => {
    expect(queryKeys.actor('principal-123')).toEqual(['actor', 'principal-123']);
    expect(queryKeys.invoice(101)).toEqual(['invoice', '101']);
    expect(queryKeys.invoice(BigInt(500))).toEqual(['invoice', '500']);
    expect(queryKeys.payments('CUST-1')).toEqual(['payments', 'CUST-1']);
    expect(queryKeys.payments()).toEqual(['payments']);
    expect(queryKeys.karigarLedger('Karigar 1')).toEqual(['karigarLedger', 'Karigar 1']);
    expect(queryKeys.karigarLedger()).toEqual(['karigarLedger']);
  });
});
