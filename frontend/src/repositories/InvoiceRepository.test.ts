import { describe, it, expect, vi } from 'vitest';
import { InvoiceRepository } from './InvoiceRepository';
import type { backendInterface, Invoice } from '../backend';

describe('InvoiceRepository unit tests', () => {
  it('calls actor.getInvoices and maps the result', async () => {
    const mockInvoice: Invoice = {
      id: BigInt(1),
      invoiceNumber: 'INV-001',
      date: BigInt(1000),
      businessInfo: '',
      customerInfo: { name: 'Customer A', taxId: '', businessAddress: '' },
      totalAmount: 500,
      paidAmount: 500,
      products: [],
      creatorPrincipal: '',
      creatorName: '',
    };

    const mockActor = {
      getInvoices: vi.fn().mockResolvedValue([mockInvoice]),
    } as unknown as backendInterface;

    const result = await InvoiceRepository.getInvoices(mockActor);
    expect(mockActor.getInvoices).toHaveBeenCalledOnce();
    expect(result).toHaveLength(1);
    expect(result[0].invoiceNumber).toBe('INV-001');
  });

  it('calls actor.getNextInvoiceNumber', async () => {
    const mockActor = {
      getNextInvoiceNumber: vi.fn().mockResolvedValue('INV-002'),
    } as unknown as backendInterface;

    const result = await InvoiceRepository.getNextInvoiceNumber(mockActor);
    expect(mockActor.getNextInvoiceNumber).toHaveBeenCalledOnce();
    expect(result).toBe('INV-002');
  });
});
