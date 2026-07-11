import React from 'react';
import { formatCurrency } from '../utils/currencyFormat';
import { formatERPDate } from '../utils/calculations';

interface PurchaseInvoicePrintProps {
  invoice: any; // Normalized purchase invoice
}

export const PurchaseInvoicePrint: React.FC<PurchaseInvoicePrintProps> = ({ invoice }) => {
  if (!invoice) return null;

  // Format dates nicely
  const invoiceDateStr = invoice.date ? formatERPDate(new Date(invoice.date).getTime()) : 'N/A';
  const dueDateStr = invoice.dueDate ? formatERPDate(new Date(invoice.dueDate).getTime()) : 'N/A';

  return (
    <div id="purchase-invoice-print-area" className="hidden print:block bg-white text-black p-8 font-sans w-full max-w-[800px] mx-auto text-xs">
      {/* Header */}
      <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
        <h1 className="text-2xl font-bold tracking-wider uppercase text-slate-900">GUJARAT ART & CRAFT</h1>
        <p className="text-[10px] text-slate-500 uppercase font-semibold">Mfg. of : TORAN, LATKAN, HANGING</p>
        <p className="text-[9px] text-slate-500">
          A/26-27, Shreeram Park, Nr. Amikunj Society, Thakkarnagar, Ahmedabad-382350.
        </p>
        <div className="mt-3 font-bold text-sm tracking-wide text-slate-800 uppercase">
          PURCHASE INVOICE
        </div>
      </div>

      {/* Vendor & Invoice Metadata */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-300">
        <div>
          <h3 className="font-bold text-[10px] text-slate-500 uppercase mb-1">SUPPLIER (FROM)</h3>
          <p className="font-bold text-sm text-slate-800">{invoice.vendorName}</p>
          {invoice.vendorId && (
            <p className="text-slate-600">Mobile / ID: {invoice.vendorId}</p>
          )}
        </div>
        <div className="text-right">
          <h3 className="font-bold text-[10px] text-slate-500 uppercase mb-1">INVOICE DETAILS</h3>
          <p className="font-bold"><span className="text-slate-500">Invoice No:</span> {invoice.invoiceNumber}</p>
          <p><span className="text-slate-500">Invoice Date:</span> {invoiceDateStr}</p>
          <p><span className="text-slate-500">Due Date:</span> {dueDateStr}</p>
          <p className="mt-1 font-bold">
            <span className="text-slate-500">Payment Status:</span>{' '}
            <span className={
              invoice.paymentStatus === 'Paid' ? 'text-green-700' :
              invoice.paymentStatus === 'Partial' ? 'text-blue-700' :
              invoice.paymentStatus === 'Overdue' ? 'text-red-700' :
              invoice.paymentStatus === 'Cancelled' ? 'text-slate-500' : 'text-amber-700'
            }>
              {invoice.paymentStatus}
            </span>
          </p>
        </div>
      </div>

      {/* Source Order details */}
      {(invoice.poNumber || invoice.grnNumber || invoice.sourceRequirementId) && (
        <div className="bg-slate-50 p-2 rounded mb-4 border border-slate-200 grid grid-cols-3 gap-2 text-[10px]">
          {invoice.poNumber && (
            <div><span className="font-semibold text-slate-500">PO Number:</span> {invoice.poNumber}</div>
          )}
          {invoice.grnNumber && (
            <div><span className="font-semibold text-slate-500">GRN Number:</span> {invoice.grnNumber}</div>
          )}
          {invoice.sourceRequirementId && (
            <div><span className="font-semibold text-slate-500">MRP ID:</span> {invoice.sourceRequirementId}</div>
          )}
        </div>
      )}

      {/* Items Table */}
      <table className="w-full text-left border-collapse border border-slate-300 mb-4">
        <thead>
          <tr className="bg-slate-100 text-[10px] font-bold border-b border-slate-300">
            <th className="p-2 border-r border-slate-300">No.</th>
            <th className="p-2 border-r border-slate-300">Material Name</th>
            <th className="p-2 text-right border-r border-slate-300">Quantity</th>
            <th className="p-2 text-right border-r border-slate-300">Rate</th>
            <th className="p-2 text-right border-r border-slate-300">GST %</th>
            <th className="p-2 text-right border-r border-slate-300">GST Amount</th>
            <th className="p-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items && invoice.items.map((item: any, idx: number) => (
            <tr key={idx} className="border-b border-slate-300">
              <td className="p-2 border-r border-slate-300 text-center">{idx + 1}</td>
              <td className="p-2 border-r border-slate-300 font-semibold">{item.name}</td>
              <td className="p-2 text-right border-r border-slate-300">{item.quantity}</td>
              <td className="p-2 text-right border-r border-slate-300">{formatCurrency(item.rate)}</td>
              <td className="p-2 text-right border-r border-slate-300">{item.gstPercent}%</td>
              <td className="p-2 text-right border-r border-slate-300">{formatCurrency(item.gstAmount || 0)}</td>
              <td className="p-2 text-right font-semibold">{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Section */}
      <div className="flex justify-end mb-6">
        <div className="w-[280px] space-y-1.5 border border-slate-300 p-3 rounded">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal:</span>
            <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">GST Total:</span>
            <span className="font-semibold">{formatCurrency(invoice.gstAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-300 pt-1.5 font-bold text-slate-800 text-[13px]">
            <span>Grand Total:</span>
            <span>{formatCurrency(invoice.grandTotal)}</span>
          </div>
          <div className="flex justify-between text-green-700 font-semibold text-[11px] pt-1">
            <span>Total Paid:</span>
            <span>{formatCurrency(invoice.paidAmount)}</span>
          </div>
          <div className="flex justify-between text-red-650 font-bold text-[12px]">
            <span>Remaining Due:</span>
            <span>{formatCurrency(invoice.remainingAmount)}</span>
          </div>
        </div>
      </div>

      {/* Payment History Section */}
      {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
        <div className="mb-6">
          <h4 className="font-bold text-[10px] text-slate-500 uppercase mb-2">PAYMENT HISTORY</h4>
          <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-300 font-bold">
                <th className="p-1.5 border-r border-slate-300">Date</th>
                <th className="p-1.5 border-r border-slate-300">Payment Method</th>
                <th className="p-1.5 border-r border-slate-300">Reference No</th>
                <th className="p-1.5 border-r border-slate-300 text-right">Amount</th>
                <th className="p-1.5">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {invoice.paymentHistory.map((pmt: any, idx: number) => (
                <tr key={pmt.id || idx} className="border-b border-slate-300">
                  <td className="p-1.5 border-r border-slate-300">{formatERPDate(new Date(pmt.date).getTime())}</td>
                  <td className="p-1.5 border-r border-slate-300">{pmt.method}</td>
                  <td className="p-1.5 border-r border-slate-300 font-mono">{pmt.referenceNumber || 'N/A'}</td>
                  <td className="p-1.5 border-r border-slate-300 text-right font-bold text-green-800">{formatCurrency(pmt.amount)}</td>
                  <td className="p-1.5 text-slate-600">{pmt.remarks || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer / Signatures */}
      <div className="mt-12 flex justify-between items-end pt-8 border-t border-dashed border-slate-400">
        <div>
          <div className="h-10"></div>
          <div className="border-t border-slate-500 w-[150px] text-center pt-1 font-semibold text-slate-500">Receiver's Signature</div>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-800">For, GUJARAT ART & CRAFT</p>
          <div className="h-10"></div>
          <div className="border-t border-slate-500 w-[180px] text-center pt-1 font-semibold text-slate-500 ml-auto">Authorized Signatory</div>
        </div>
      </div>
    </div>
  );
};
