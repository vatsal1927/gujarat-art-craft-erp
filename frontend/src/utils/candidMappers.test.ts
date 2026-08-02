import { describe, it, expect } from 'vitest';
import { Principal } from '@dfinity/principal';
import {
  unwrapOptional,
  unwrapOptionalNumber,
  unwrapOptionalText,
  unwrapOptionalBoolean,
  unwrapOptionalBigInt,
  mapCandidInvoice,
  mapCandidInvoices,
  mapCandidUser,
  mapCandidUsers,
} from './candidMappers';
import type { Invoice, User } from '../backend';

describe('candidMappers.ts unit tests', () => {
  describe('unwrapOptional', () => {
    it('unwraps array optional [value] and returns value', () => {
      expect(unwrapOptional(['test'], 'fallback')).toBe('test');
      expect(unwrapOptional([100], 0)).toBe(100);
    });

    it('returns fallback for empty array [] or null/undefined', () => {
      expect(unwrapOptional([], 'fallback')).toBe('fallback');
      expect(unwrapOptional(null, 'fallback')).toBe('fallback');
      expect(unwrapOptional(undefined, 'fallback')).toBe('fallback');
    });

    it('returns direct value if not an array', () => {
      expect(unwrapOptional('direct', 'fallback')).toBe('direct');
    });
  });

  describe('unwrapOptionalNumber', () => {
    it('unwraps numeric optionals', () => {
      expect(unwrapOptionalNumber([42])).toBe(42);
      expect(unwrapOptionalNumber(['99'])).toBe(99);
      expect(unwrapOptionalNumber([], 10)).toBe(10);
      expect(unwrapOptionalNumber(null, 5)).toBe(5);
    });
  });

  describe('unwrapOptionalText', () => {
    it('unwraps string optionals', () => {
      expect(unwrapOptionalText(['hello'])).toBe('hello');
      expect(unwrapOptionalText([], 'default')).toBe('default');
      expect(unwrapOptionalText(null, 'fallback')).toBe('fallback');
    });
  });

  describe('unwrapOptionalBoolean', () => {
    it('unwraps boolean optionals', () => {
      expect(unwrapOptionalBoolean([true])).toBe(true);
      expect(unwrapOptionalBoolean([false])).toBe(false);
      expect(unwrapOptionalBoolean([], true)).toBe(true);
      expect(unwrapOptionalBoolean(null, false)).toBe(false);
    });
  });

  describe('unwrapOptionalBigInt', () => {
    it('unwraps BigInt optionals', () => {
      expect(unwrapOptionalBigInt([BigInt(100)])).toBe(BigInt(100));
      expect(unwrapOptionalBigInt(BigInt(50))).toBe(BigInt(50));
      expect(unwrapOptionalBigInt('200')).toBe(BigInt(200));
      expect(unwrapOptionalBigInt([], BigInt(10))).toBe(BigInt(10));
      expect(unwrapOptionalBigInt(null, BigInt(0))).toBe(BigInt(0));
    });
  });

  describe('mapCandidInvoice & mapCandidInvoices', () => {
    it('enriches invoice object with snapshot attributes if taxId contains snapshot data', () => {
      const inv: Invoice = {
        id: BigInt(1),
        invoiceNumber: 'INV-100',
        date: BigInt(1600000000),
        businessInfo: '',
        customerInfo: {
          name: 'Acme Corp',
          businessAddress: '',
          taxId: 'phone|gst|type|dcNo|dcDate|transport|150|50|1000|1100|200|900',
        },
        totalAmount: 1000,
        paidAmount: 200,
        products: [],
        creatorPrincipal: '',
        creatorName: '',
      };

      const mapped = mapCandidInvoice(inv);
      expect(mapped.previousBalanceAtCreation).toBe(150);
      expect(mapped.advanceBalanceAtCreation).toBe(50);
      expect(mapped.currentInvoiceTotalAtCreation).toBe(1000);
      expect(mapped.totalPayableAtCreation).toBe(1100);
      expect(mapped.paidAmountAtCreation).toBe(200);
      expect(mapped.finalDueAtCreation).toBe(900);
    });

    it('handles mapCandidInvoices correctly for null or array input', () => {
      expect(mapCandidInvoices(null)).toEqual([]);
      expect(mapCandidInvoices([])).toEqual([]);
    });
  });

  describe('mapCandidUser & mapCandidUsers', () => {
    it('unwraps optional needsPasswordChange field on User object', () => {
      const candidUser: User = {
        principalId: Principal.fromText('2vxsx-fae'),
        username: 'admin',
        role: { Admin: null } as any,
        name: 'Master Admin',
        email: 'admin@example.com',
        mobile: '1234567890',
        createdAt: BigInt(1000),
        needsPasswordChange: [true] as any,
      };

      const mapped = mapCandidUser(candidUser);
      expect(mapped).not.toBeNull();
      expect(mapped?.needsPasswordChange).toBe(true);
    });

    it('handles mapCandidUsers correctly', () => {
      expect(mapCandidUsers(null)).toEqual([]);
    });
  });
});
