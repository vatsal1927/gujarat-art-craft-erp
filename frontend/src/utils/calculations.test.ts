import { describe, it, expect } from 'vitest';
import {
  calculateSubtotal,
  applyDiscount,
  calculateGST,
  calculateGrandTotal,
  roundOffAmount,
  calculateCustomerPreviousBalance,
  formatERPDate,
  formatERPDateTime,
  safeQty,
  isJobDelayed,
} from './calculations';
import { ProductRow } from '../types/invoice';
import type { Invoice, Payment, JobWork } from '../backend';

describe('calculations.ts unit tests', () => {
  describe('calculateSubtotal', () => {
    it('returns 0 for empty product array', () => {
      expect(calculateSubtotal([])).toBe(0);
    });

    it('correctly calculates subtotal for multiple product rows', () => {
      const products: ProductRow[] = [
        { id: '1', vigat: 'Item 1', qty: 2, rate: 150 },
        { id: '2', vigat: 'Item 2', qty: 5, rate: 50 },
      ];
      expect(calculateSubtotal(products)).toBe(550);
    });

    it('handles decimal quantities and rates', () => {
      const products: ProductRow[] = [
        { id: '1', vigat: 'Item 1', qty: 1.5, rate: 100 },
      ];
      expect(calculateSubtotal(products)).toBe(150);
    });
  });

  describe('applyDiscount', () => {
    it('subtracts discount from subtotal', () => {
      expect(applyDiscount(1000, 100)).toBe(900);
      expect(applyDiscount(500, 0)).toBe(500);
    });
  });

  describe('calculateGST', () => {
    it('calculates GST amount correctly', () => {
      expect(calculateGST(1000, 18)).toBe(180);
      expect(calculateGST(500, 5)).toBe(25);
      expect(calculateGST(1000, 0)).toBe(0);
    });
  });

  describe('calculateGrandTotal', () => {
    it('calculates grand total without rounding off', () => {
      expect(calculateGrandTotal(100, 10, 18, false)).toBe(106.2);
    });

    it('calculates grand total with rounding off', () => {
      expect(calculateGrandTotal(100, 10, 18, true)).toBe(106);
    });
  });

  describe('roundOffAmount', () => {
    it('rounds numbers to nearest integer', () => {
      expect(roundOffAmount(10.4)).toBe(10);
      expect(roundOffAmount(10.5)).toBe(11);
      expect(roundOffAmount(10.6)).toBe(11);
    });
  });

  describe('calculateCustomerPreviousBalance', () => {
    it('returns default zero values if customerId is empty or whitespace', () => {
      const result = calculateCustomerPreviousBalance('', undefined, [], [], 1000, 200);
      expect(result).toEqual({
        previousDue: 0,
        advanceBalance: 0,
        currentGrandTotal: 1000,
        totalPayable: 1000,
        currentPaidAmount: 200,
        finalDueAmount: 800,
      });
    });

    it('calculates previous due amount from unpaid previous invoices', () => {
      const invoices: Invoice[] = [
        {
          id: BigInt(1),
          invoiceNumber: 'INV-001',
          date: BigInt(1600000000000),
          customerInfo: { name: 'Customer A', taxId: '', businessAddress: '' },
          businessInfo: '',
          totalAmount: 1000,
          paidAmount: 400,
          products: [],
          creatorPrincipal: '',
          creatorName: '',
        },
      ];
      const payments: Payment[] = [];

      const result = calculateCustomerPreviousBalance('Customer A', BigInt(2), invoices, payments, 500, 100);
      expect(result.previousDue).toBe(600);
      expect(result.advanceBalance).toBe(0);
      expect(result.totalPayable).toBe(1100);
      expect(result.finalDueAmount).toBe(1000);
    });

    it('calculates advance balance if payments exceed total invoice dues', () => {
      const invoices: Invoice[] = [
        {
          id: BigInt(1),
          invoiceNumber: 'INV-001',
          date: BigInt(1600000000000),
          customerInfo: { name: 'Customer B', taxId: '', businessAddress: '' },
          businessInfo: '',
          totalAmount: 500,
          paidAmount: 500,
          products: [],
          creatorPrincipal: '',
          creatorName: '',
        },
      ];
      const payments: Payment[] = [
        {
          id: BigInt(10),
          date: BigInt(1600000000000),
          customerId: 'Customer B',
          amount: 800,
          invoiceNumber: 'INV-001',
          notes: 'Advance',
        },
      ];

      const result = calculateCustomerPreviousBalance('Customer B', BigInt(2), invoices, payments, 1000, 0);
      expect(result.previousDue).toBe(0);
      expect(result.advanceBalance).toBe(300);
      expect(result.totalPayable).toBe(700);
      expect(result.finalDueAmount).toBe(700);
    });
  });

  describe('formatERPDate', () => {
    it('returns "-" for empty/null/undefined inputs', () => {
      expect(formatERPDate(null)).toBe('-');
      expect(formatERPDate(undefined)).toBe('-');
      expect(formatERPDate('')).toBe('-');
    });

    it('formats JavaScript Date objects correctly', () => {
      const date = new Date(2026, 7, 2); // August 2, 2026
      expect(formatERPDate(date)).toBe('02/08/2026');
    });

    it('formats Motoko optional array format [Date]', () => {
      const date = new Date(2026, 0, 15);
      expect(formatERPDate([date])).toBe('15/01/2026');
      expect(formatERPDate([])).toBe('-');
    });

    it('handles numeric timestamp inputs in milliseconds', () => {
      const ts = new Date(2025, 5, 20).getTime();
      expect(formatERPDate(ts)).toBe('20/06/2025');
    });

    it('handles BigInt timestamp inputs in nanoseconds', () => {
      const tsNs = BigInt(new Date(2025, 5, 20).getTime()) * BigInt(1000000);
      expect(formatERPDate(tsNs)).toBe('20/06/2025');
    });
  });

  describe('formatERPDateTime', () => {
    it('returns "-" for empty/null/undefined inputs', () => {
      expect(formatERPDateTime(null)).toBe('-');
      expect(formatERPDateTime(undefined)).toBe('-');
      expect(formatERPDateTime('')).toBe('-');
    });

    it('formats JavaScript Date objects with time correctly', () => {
      const date = new Date(2026, 7, 2, 14, 30, 45);
      expect(formatERPDateTime(date)).toBe('02/08/2026 14:30:45');
    });
  });

  describe('safeQty', () => {
    it('returns valid positive number or fallback', () => {
      expect(safeQty(10)).toBe(10);
      expect(safeQty('5')).toBe(5);
      expect(safeQty(null, 2)).toBe(2);
      expect(safeQty(-10)).toBe(0);
      expect(safeQty([15])).toBe(15);
      expect(safeQty([], 4)).toBe(4);
      expect(safeQty('invalid', 0)).toBe(0);
    });
  });

  describe('isJobDelayed', () => {
    const createMockJobWork = (status: string, expectedReturnDate: bigint): JobWork => ({
      id: BigInt(1),
      jobDate: BigInt(1000),
      employeeName: 'Karigar 1',
      mobileNumber: '',
      workType: 'Crafting',
      productName: 'Product 1',
      productCode: 'P01',
      hsnCode: '',
      qtyGiven: 10,
      qtyAssigned: 10,
      ratePerPiece: 50,
      expectedReturnDate,
      expectedCompletionDate: expectedReturnDate,
      status,
      remarks: '',
      collectedQty: 0,
      completedQty: 0,
      rejectedQty: 0,
      acceptedQty: 0,
      customerOrderLink: null,
    });

    it('returns false if job is Completed or Collected', () => {
      const pastTimeNs = BigInt(Date.now() - 86400000) * BigInt(1000000);
      const job = createMockJobWork('Completed', pastTimeNs);
      expect(isJobDelayed(job)).toBe(false);
    });

    it('returns true if expectedReturnDate is in the past and job is pending', () => {
      const pastTimeNs = BigInt(Date.now() - 86400000) * BigInt(1000000); // 1 day ago in nanoseconds
      const job = createMockJobWork('Issued', pastTimeNs);
      expect(isJobDelayed(job)).toBe(true);
    });

    it('returns false if expectedReturnDate is in the future', () => {
      const futureTimeNs = BigInt(Date.now() + 86400000) * BigInt(1000000); // 1 day in future in nanoseconds
      const job = createMockJobWork('Issued', futureTimeNs);
      expect(isJobDelayed(job)).toBe(false);
    });
  });
});
