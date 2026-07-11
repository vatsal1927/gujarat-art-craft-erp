import { ProductRow } from '../types/invoice';
import type { Invoice, Payment, JobWork } from '../backend';

export function calculateSubtotal(products: ProductRow[]): number {
  return products.reduce((sum, product) => {
    return sum + (product.qty * product.rate);
  }, 0);
}

export function applyDiscount(subtotal: number, discount: number): number {
  return subtotal - discount;
}

export function calculateGST(amount: number, gstPercent: number): number {
  return (amount * gstPercent) / 100;
}

export function calculateGrandTotal(
  subtotal: number, 
  discount: number, 
  gstPercent: number, 
  roundOff: boolean
): number {
  const discountedAmount = applyDiscount(subtotal, discount);
  const gstAmount = calculateGST(discountedAmount, gstPercent);
  const total = discountedAmount + gstAmount;
  
  return roundOff ? Math.round(total) : total;
}

export function roundOffAmount(amount: number): number {
  return Math.round(amount);
}

/**
 * Calculates a customer's previous outstanding balance and advances.
 * 
 * @important
 * For backward compatibility with existing invoice history stored on the canister, 
 * multiple customer attributes and invoice transaction snapshots are serialized in the 
 * customer's `taxId` string using a pipe-delimited format:
 * `phone|gstNo|taxType|dcNo|dcDate|transport|prevDue|advBal|total|payable|paid|due`
 * 
 * Specifically, the elements at the following indexes map to snapshot data:
 * - Index 6: previousDue
 * - Index 7: advanceBalance
 * - Index 8: currentGrandTotal
 * - Index 9: totalPayable
 * - Index 10: paidAmount
 * - Index 11: finalDueAmount
 * 
 * Modifying this formatting behavior will break outstanding balance calculations and historical 
 * GST reports. Ensure that any client-side changes respect this legacy layout.
 */
export function calculateCustomerPreviousBalance(
  customerId: string,
  currentInvoiceId: string | bigint | undefined,
  invoices: Invoice[],
  payments: Payment[],
  currentGrandTotal: number,
  currentPaidAmount: number,
  currentInvoiceDate?: bigint | number
) {
  if (!customerId || customerId.trim() === '') {
    return {
      previousDue: 0,
      advanceBalance: 0,
      currentGrandTotal,
      totalPayable: currentGrandTotal,
      currentPaidAmount,
      finalDueAmount: Math.max(0, currentGrandTotal - currentPaidAmount)
    };
  }

  const lowercaseCustomerName = customerId.trim().toLowerCase();
  const maxDate = currentInvoiceDate !== undefined ? BigInt(currentInvoiceDate) : undefined;

  // Filter invoices for this customer, excluding the current invoice and any future invoices
  const prevInvoices = invoices.filter(inv => {
    const isSameCustomer = inv.customerInfo.name.trim().toLowerCase() === lowercaseCustomerName;
    const isCurrent = currentInvoiceId !== undefined && (
      inv.id.toString() === currentInvoiceId.toString() ||
      inv.invoiceNumber === currentInvoiceId.toString()
    );
    const isBefore = maxDate !== undefined ? BigInt(inv.date) < maxDate : true;
    return isSameCustomer && !isCurrent && isBefore;
  });

  // Calculate previous due from invoices
  const prevInvoicesDue = prevInvoices.reduce((sum, inv) => {
    const paid = inv.paidAmount !== undefined ? inv.paidAmount : inv.totalAmount;
    return sum + (inv.totalAmount - paid);
  }, 0);

  // Filter payments for this customer, excluding payments for the current invoice and any future payments
  const prevPayments = payments.filter(p => {
    const isSameCustomer = p.customerId.trim().toLowerCase() === lowercaseCustomerName;
    const isCurrentInvoicePayment = currentInvoiceId !== undefined && (
      p.invoiceNumber === currentInvoiceId.toString()
    );
    const isBefore = maxDate !== undefined ? BigInt(p.date) < maxDate : true;
    return isSameCustomer && !isCurrentInvoicePayment && isBefore;
  });

  // Check if there is any unapplied/advance payment in the payments list.
  const totalPaymentsAmount = prevPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaidOnPrevInvoices = prevInvoices.reduce((sum, inv) => {
    const paid = inv.paidAmount !== undefined ? inv.paidAmount : inv.totalAmount;
    return sum + paid;
  }, 0);

  const unappliedAdvance = Math.max(0, totalPaymentsAmount - totalPaidOnPrevInvoices);

  // Final previous balance
  let previousDue = 0;
  let advanceBalance = 0;

  const netPreviousBalance = prevInvoicesDue - unappliedAdvance;

  if (netPreviousBalance > 0) {
    previousDue = netPreviousBalance;
  } else if (netPreviousBalance < 0) {
    advanceBalance = Math.abs(netPreviousBalance);
  }

  const totalPayable = currentGrandTotal + previousDue - advanceBalance;
  const finalDueAmount = Math.max(0, totalPayable - currentPaidAmount);

  return {
    previousDue,
    advanceBalance,
    currentGrandTotal,
    totalPayable,
    currentPaidAmount,
    finalDueAmount
  };
}

export function formatERPDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '-';
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Handle Motoko optional type [value] or []
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    return formatERPDate((value as unknown[])[0]);
  }

  try {
    let num: number;
    if (typeof value === 'bigint') {
      num = Number(value);
    } else if (typeof value === 'number') {
      num = value;
    } else if (typeof value === 'string') {
      const parsed = Date.parse(value);
      if (!isNaN(parsed)) {
        num = parsed;
      } else {
        num = Number(value);
      }
    } else {
      num = Number(value);
    }
    
    if (isNaN(num) || num <= 0) return '-';

    // standard date checks: 10^17+ is nanoseconds, 10^14+ is microseconds, 10^11+ is milliseconds, 10^8+ is seconds.
    let dateObj: Date;
    if (num > 1e17) {
      // Nanoseconds -> Milliseconds
      dateObj = new Date(Math.round(num / 1000000));
    } else if (num > 1e14) {
      // Microseconds -> Milliseconds
      dateObj = new Date(Math.round(num / 1000));
    } else if (num > 1e11) {
      // Milliseconds
      dateObj = new Date(num);
    } else if (num > 1e8) {
      // Seconds -> Milliseconds
      dateObj = new Date(num * 1000);
    } else {
      dateObj = new Date(num);
    }

    if (isNaN(dateObj.getTime())) return '-';

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return '-';
  }
}

export function formatERPDateTime(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';

  let dateObj: Date;
  if (value instanceof Date) {
    dateObj = value;
  } else if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    return formatERPDateTime((value as unknown[])[0]);
  } else {
    try {
      let num: number;
      if (typeof value === 'bigint') {
        num = Number(value);
      } else if (typeof value === 'number') {
        num = value;
      } else if (typeof value === 'string') {
        const parsed = Date.parse(value);
        if (!isNaN(parsed)) {
          num = parsed;
        } else {
          num = Number(value);
        }
      } else {
        num = Number(value);
      }
      
      if (isNaN(num) || num <= 0) return '-';

      // standard date checks: 10^17+ is nanoseconds, 10^14+ is microseconds, 10^11+ is milliseconds, 10^8+ is seconds.
      if (num > 1e17) {
        // Nanoseconds -> Milliseconds
        dateObj = new Date(Math.round(num / 1000000));
      } else if (num > 1e14) {
        // Microseconds -> Milliseconds
        dateObj = new Date(Math.round(num / 1000));
      } else if (num > 1e11) {
        // Milliseconds
        dateObj = new Date(num);
      } else if (num > 1e8) {
        // Seconds -> Milliseconds
        dateObj = new Date(num * 1000);
      } else {
        dateObj = new Date(num);
      }
    } catch (e) {
      return '-';
    }
  }

  if (isNaN(dateObj.getTime())) return '-';

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export function safeQty(value: unknown, fallback = 0): number {
  const safeFallback = (fallback === null || fallback === undefined || isNaN(Number(fallback)) || !isFinite(Number(fallback))) ? 0 : Math.max(0, Number(fallback));
  
  if (value === null || value === undefined || value === '') return safeFallback;
  if (Array.isArray(value)) {
    if (value.length === 0) return safeFallback;
    return safeQty((value as unknown[])[0], safeFallback);
  }
  
  let num = Number(value);
  if (isNaN(num) || !isFinite(num)) return safeFallback;
  return Math.max(0, num);
}

export function isJobDelayed(job: JobWork): boolean {
  if (!job) return false;
  const status = job.status || '';
  if (status === 'Completed' || status === 'COMPLETED' || status === 'Collected') {
    return false;
  }
  const expectedVal = job.expectedReturnDate;
  if (!expectedVal) return false;
  
  try {
    let num = typeof expectedVal === 'bigint' ? Number(expectedVal) : Number(expectedVal);
    if (Array.isArray(expectedVal)) {
      if (expectedVal.length === 0) return false;
      const v = (expectedVal as unknown[])[0];
      num = typeof v === 'bigint' ? Number(v) : Number(v);
    }
    
    if (isNaN(num) && typeof expectedVal === 'string') {
      const parsed = Date.parse(expectedVal);
      if (!isNaN(parsed)) num = parsed;
    }
    
    if (isNaN(num) || num <= 0) return false;
    
    let targetMs: number;
    if (num > 1e15) {
      targetMs = Math.round(num / 1000000);
    } else if (num > 1e12) {
      targetMs = Math.round(num / 1000);
    } else {
      targetMs = num;
    }
    
    return Date.now() > targetMs;
  } catch (e) {
    return false;
  }
}


