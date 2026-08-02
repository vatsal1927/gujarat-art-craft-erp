import type { Invoice, User } from '../backend';

/**
 * Dedicated Candid / Domain Mapper Layer for Motoko & Candid data structures.
 */

/**
 * Unwraps a Candid optional value represented either as an array `[value]` / `[]` or a direct value.
 */
export function unwrapOptional<T>(value: T[] | T | null | undefined, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : fallback;
  }
  return value;
}

/**
 * Safely converts a Candid optional number to a JavaScript number.
 */
export function unwrapOptionalNumber(value: unknown, fallback = 0): number {
  if (Array.isArray(value)) {
    return value.length > 0 ? Number(value[0]) || 0 : Number(fallback) || 0;
  }
  return Number(value ?? fallback) || 0;
}

/**
 * Safely converts a Candid optional text to a JavaScript string.
 */
export function unwrapOptionalText(value: unknown, fallback = ''): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : fallback;
  }
  return value !== null && value !== undefined ? String(value) : fallback;
}

/**
 * Safely converts a Candid optional boolean to a JavaScript boolean.
 */
export function unwrapOptionalBoolean(value: unknown, fallback = false): boolean {
  if (Array.isArray(value)) {
    return value.length > 0 ? Boolean(value[0]) : fallback;
  }
  return value !== null && value !== undefined ? Boolean(value) : fallback;
}

/**
 * Safely converts a Candid optional BigInt to a JavaScript BigInt.
 */
export function unwrapOptionalBigInt(value: unknown, fallback = BigInt(0)): bigint {
  if (Array.isArray(value)) {
    return value.length > 0 ? BigInt(value[0]) : fallback;
  }
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' || typeof value === 'string') {
    try {
      return BigInt(value);
    } catch (e) {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Maps a Candid Invoice object, extracting snapshot attributes from legacy pipe-delimited taxId strings.
 */
export function mapCandidInvoice(inv: Invoice): Invoice {
  if (!inv) return inv;
  const taxIdParts = (inv.customerInfo?.taxId || '').split('|');
  const hasSnapshot = taxIdParts.length > 11 && taxIdParts[6] !== '' && !isNaN(Number(taxIdParts[6]));

  return {
    ...inv,
    previousBalanceAtCreation: hasSnapshot ? Number(taxIdParts[6]) : (inv.previousBalanceAtCreation !== undefined ? Number(inv.previousBalanceAtCreation) : undefined),
    advanceBalanceAtCreation: hasSnapshot ? Number(taxIdParts[7]) : (inv.advanceBalanceAtCreation !== undefined ? Number(inv.advanceBalanceAtCreation) : undefined),
    currentInvoiceTotalAtCreation: hasSnapshot ? Number(taxIdParts[8]) : (inv.currentInvoiceTotalAtCreation !== undefined ? Number(inv.currentInvoiceTotalAtCreation) : undefined),
    totalPayableAtCreation: hasSnapshot ? Number(taxIdParts[9]) : (inv.totalPayableAtCreation !== undefined ? Number(inv.totalPayableAtCreation) : undefined),
    paidAmountAtCreation: hasSnapshot ? Number(taxIdParts[10]) : (inv.paidAmountAtCreation !== undefined ? Number(inv.paidAmountAtCreation) : undefined),
    finalDueAtCreation: hasSnapshot ? Number(taxIdParts[11]) : (inv.finalDueAtCreation !== undefined ? Number(inv.finalDueAtCreation) : undefined),
  };
}

/**
 * Maps an array of Candid Invoice objects.
 */
export function mapCandidInvoices(invoices: Invoice[] | null | undefined): Invoice[] {
  if (!invoices || !Array.isArray(invoices)) return [];
  return invoices.map(mapCandidInvoice);
}

/**
 * Maps a Candid User object, unwrapping optional fields such as needsPasswordChange.
 */
export function mapCandidUser(u: User | null | undefined): User | null {
  if (!u) return null;
  return {
    ...u,
    needsPasswordChange: unwrapOptionalBoolean(u.needsPasswordChange, false),
  };
}

/**
 * Maps an array of Candid User objects.
 */
export function mapCandidUsers(users: User[] | null | undefined): User[] {
  if (!users || !Array.isArray(users)) return [];
  return users.map(u => {
    const mapped = mapCandidUser(u);
    return mapped || u;
  });
}
