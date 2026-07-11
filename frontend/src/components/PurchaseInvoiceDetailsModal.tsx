import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { X, Printer, Download, CreditCard, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/currencyFormat';
import { formatERPDate } from '../utils/calculations';
import { useCancelPurchaseInvoice, useLogPurchaseInvoiceAction } from '../hooks/useQueries';
import { PurchasePaymentModal } from './PurchasePaymentModal';
import { toast } from 'sonner';
import { formatDateForFilename } from '../utils/dateUtils';

interface PurchaseInvoiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any; // Normalized purchase invoice object
  isAdminOrMaster: boolean;
}

export const PurchaseInvoiceDetailsModal: React.FC<PurchaseInvoiceDetailsModalProps> = ({
  isOpen,
  onClose,
  invoice,
  isAdminOrMaster,
}) => {
  const cancelInvoice = useCancelPurchaseInvoice();
  const logAction = useLogPurchaseInvoiceAction();
  
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  React.useEffect(() => {
    if (isOpen && invoice) {
      logAction.mutate({ action: 'viewed', invoiceNumber: invoice.invoiceNumber });
    }
  }, [isOpen, invoice?.id]);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    logAction.mutate(
      { action: 'printed', invoiceNumber: invoice.invoiceNumber },
      {
        onSuccess: () => {
          window.print();
        },
        onError: () => {
          window.print();
        }
      }
    );
  };

  const handlePDF = () => {
    const filename = `PurchaseInvoice_${invoice.invoiceNumber}_${formatDateForFilename()}`;
    const message = `To save as PDF:\n\n1. In the print dialog, select "Save as PDF" or "Microsoft Print to PDF" as the printer\n2. Suggested filename: ${filename}.pdf\n3. Click Save/Print\n\nClick OK to open the print dialog.`;
    
    if (confirm(message)) {
      logAction.mutate(
        { action: 'pdf_downloaded', invoiceNumber: invoice.invoiceNumber },
        {
          onSuccess: () => {
            window.print();
          },
          onError: () => {
            window.print();
          }
        }
      );
    }
  };

  const handleCancel = () => {
    cancelInvoice.mutate(invoice.id, {
      onSuccess: () => {
        toast.success('Purchase invoice cancelled successfully');
        onClose();
      },
      onError: (err: any) => {
        toast.error(`Failed to cancel invoice: ${err.message}`);
      },
    });
  };

  const invoiceDateStr = invoice.date ? formatERPDate(new Date(invoice.date).getTime()) : 'N/A';
  const dueDateStr = invoice.dueDate ? formatERPDate(new Date(invoice.dueDate).getTime()) : 'N/A';
  const isCancelled = invoice.paymentStatus === 'Cancelled';
  const isPaid = invoice.paymentStatus === 'Paid';

  return (
    <>
      <div className="fixed inset-0 z-45 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto no-print">
        <div className="bg-white dark:bg-slate-900 border-2 border-gold rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-150">
          
          {/* Header */}
          <div className="bg-maroon text-[#F8F2E8] p-4 flex justify-between items-center flex-shrink-0">
            <div>
              <h2 className="text-base font-bold tracking-wide uppercase">Purchase Invoice Details</h2>
              <p className="text-[11px] text-[#F8F2E8]/80">Invoice ID: {invoice.id} | Source: {invoice.source}</p>
            </div>
            <button onClick={onClose} className="text-[#F8F2E8]/80 hover:text-white transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800 dark:text-slate-100">
            {/* Meta Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#F8F2E8]/30 dark:bg-slate-800/50 p-4 rounded-xl border border-gold/15">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Vendor details</span>
                <p className="font-bold text-maroon text-base">{invoice.vendorName}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Mobile / ID: {invoice.vendorId}</p>
              </div>

              <div className="space-y-1 md:border-l md:border-r border-gold/20 md:px-6">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Invoice Metadata</span>
                <p className="text-xs"><span className="font-semibold text-gray-600 dark:text-gray-400">Invoice No:</span> <span className="font-bold text-slate-800 dark:text-white">{invoice.invoiceNumber}</span></p>
                <p className="text-xs"><span className="font-semibold text-gray-600 dark:text-gray-400">Invoice Date:</span> {invoiceDateStr}</p>
                <p className="text-xs"><span className="font-semibold text-gray-600 dark:text-gray-400">Due Date:</span> {dueDateStr}</p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Status Information</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-650">Payment Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    invoice.paymentStatus === 'Paid' ? 'bg-green-150 text-green-800 border border-green-200' :
                    invoice.paymentStatus === 'Partial' ? 'bg-blue-150 text-blue-800 border border-blue-200' :
                    invoice.paymentStatus === 'Overdue' ? 'bg-red-150 text-red-800 border border-red-200 animate-pulse' :
                    invoice.paymentStatus === 'Cancelled' ? 'bg-gray-150 text-gray-800 border border-gray-200' :
                    'bg-amber-150 text-amber-800 border border-amber-200'
                  }`}>
                    {invoice.paymentStatus}
                  </span>
                </div>
                {invoice.status && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-650">Workflow Status:</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{invoice.status}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Document References */}
            {(invoice.poNumber || invoice.grnNumber || invoice.sourceRequirementId) && (
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {invoice.poNumber && (
                  <div><span className="font-semibold text-slate-500">PO Number:</span> <span className="font-mono text-slate-800 dark:text-white">{invoice.poNumber}</span></div>
                )}
                {invoice.grnNumber && (
                  <div><span className="font-semibold text-slate-500">GRN Number:</span> <span className="font-mono text-slate-800 dark:text-white">{invoice.grnNumber}</span></div>
                )}
                {invoice.sourceRequirementId && (
                  <div><span className="font-semibold text-slate-500">MRP Plan ID:</span> <span className="font-mono text-slate-800 dark:text-white">{invoice.sourceRequirementId}</span></div>
                )}
              </div>
            )}

            {/* Items Table */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs text-maroon uppercase tracking-wide">Purchase Items</h3>
              <div className="border border-gold/15 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F8F2E8]/20 dark:bg-slate-800">
                      <TableHead className="font-bold text-maroon text-xs">Material</TableHead>
                      <TableHead className="font-bold text-maroon text-xs text-right">Qty</TableHead>
                      <TableHead className="font-bold text-maroon text-xs text-right">Rate</TableHead>
                      <TableHead className="font-bold text-maroon text-xs text-right">GST %</TableHead>
                      <TableHead className="font-bold text-maroon text-xs text-right">GST Amount</TableHead>
                      <TableHead className="font-bold text-maroon text-xs text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items && invoice.items.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{item.name}</TableCell>
                        <TableCell className="text-right text-xs">{item.quantity}</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(item.rate)}</TableCell>
                        <TableCell className="text-right text-xs">{item.gstPercent}%</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(item.gstAmount || 0)}</TableCell>
                        <TableCell className="text-right font-bold text-maroon text-xs">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals Section */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start pt-4 border-t border-slate-100 dark:border-slate-800">
              {/* Payment History */}
              <div className="flex-1 w-full space-y-2">
                <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wide">Payment History</h4>
                {invoice.paymentHistory && invoice.paymentHistory.length > 0 ? (
                  <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-850">
                          <TableHead className="font-semibold text-[11px] p-2">Date</TableHead>
                          <TableHead className="font-semibold text-[11px] p-2">Method</TableHead>
                          <TableHead className="font-semibold text-[11px] p-2">Reference</TableHead>
                          <TableHead className="font-semibold text-[11px] p-2 text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.paymentHistory.map((pmt: any, idx: number) => (
                          <TableRow key={pmt.id || idx}>
                            <TableCell className="p-2">{formatERPDate(new Date(pmt.date).getTime())}</TableCell>
                            <TableCell className="p-2">{pmt.method}</TableCell>
                            <TableCell className="p-2 font-mono text-[10px] text-gray-500">{pmt.referenceNumber || 'N/A'}</TableCell>
                            <TableCell className="p-2 text-right font-bold text-green-700">{formatCurrency(pmt.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">No payments recorded yet.</p>
                )}
              </div>

              {/* Totals Box */}
              <div className="w-full md:w-[320px] bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">GST Amount:</span>
                  <span className="font-semibold">{formatCurrency(invoice.gstAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold text-[13px]">
                  <span className="text-slate-800 dark:text-white">Grand Total:</span>
                  <span className="text-maroon">{formatCurrency(invoice.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-green-700 font-semibold pt-1">
                  <span>Paid Amount:</span>
                  <span>{formatCurrency(invoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-red-650 font-bold text-[13px] border-t border-slate-200 dark:border-slate-700 pt-1">
                  <span>Outstanding Amount:</span>
                  <span>{formatCurrency(invoice.remainingAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 flex flex-wrap gap-2 justify-between border-t border-slate-100 dark:border-slate-850 flex-shrink-0">
            {/* Left side actions: Cancel invoice (Master Admin only) */}
            <div>
              {isAdminOrMaster && !isCancelled && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 text-xs h-9">
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Cancel Invoice
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Purchase Invoice</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel purchase invoice {invoice.invoiceNumber}?
                        This will set the remaining outstanding balance for this invoice to zero and create reversing vendor ledger entries.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Go Back</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
                        Cancel Invoice
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Right side actions: Pay, Print, PDF */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint} className="border-gold text-slate-700 dark:text-slate-300 hover:bg-amber-50/20 text-xs h-9">
                <Printer className="h-4 w-4 mr-1.5" />
                Print
              </Button>
              <Button variant="outline" onClick={handlePDF} className="border-gold text-slate-700 dark:text-slate-300 hover:bg-amber-50/20 text-xs h-9">
                <Download className="h-4 w-4 mr-1.5" />
                Download PDF
              </Button>
              {!isCancelled && !isPaid && (
                <Button
                  onClick={() => setIsPaymentOpen(true)}
                  className="bg-maroon hover:bg-maroon/90 text-white font-bold text-xs h-9"
                >
                  <CreditCard className="h-4 w-4 mr-1.5" />
                  Record Payment
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment recording modal */}
      <PurchasePaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          onClose(); // Close details modal too, so list reloads fresh
        }}
        invoice={invoice}
      />
    </>
  );
};
