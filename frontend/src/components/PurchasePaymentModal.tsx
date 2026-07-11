import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRecordPurchasePayment } from '../hooks/useQueries';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { formatCurrency } from '../utils/currencyFormat';

interface PurchasePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any; // Normalized purchase invoice object
}

export const PurchasePaymentModal: React.FC<PurchasePaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
}) => {
  const recordPayment = useRecordPurchasePayment();
  
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(invoice?.remainingAmount || 0);
  const [method, setMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque' | 'UPI'>('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  
  if (!isOpen || !invoice) return null;

  const remaining = invoice.remainingAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (amount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }
    
    if (amount > remaining) {
      toast.error(`Payment amount cannot exceed remaining due: ${formatCurrency(remaining)}`);
      return;
    }

    recordPayment.mutate(
      {
        invoiceId: invoice.id,
        paymentData: {
          date: new Date(paymentDate).toISOString(),
          amount,
          method,
          referenceNumber,
          remarks,
        },
      },
      {
        onSuccess: () => {
          toast.success('Payment recorded successfully');
          onClose();
        },
        onError: (err: any) => {
          toast.error(`Failed to record payment: ${err.message}`);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-2 border-gold rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-maroon text-[#F8F2E8] p-4 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm">Record Vendor Payment</h3>
            <p className="text-[11px] text-[#F8F2E8]/80">Invoice No: {invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="text-[#F8F2E8]/80 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-amber-50 dark:bg-slate-800 p-3 rounded-lg border border-gold/20 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Grand Total:</span>
              <span className="font-bold text-maroon">{formatCurrency(invoice.grandTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Already Paid:</span>
              <span className="font-bold text-green-700">{formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-gold/10 pt-1 mt-1">
              <span className="text-gray-600 dark:text-gray-400 font-semibold">Remaining Due:</span>
              <span className="font-bold text-red-600">{formatCurrency(remaining)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDate" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Date</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="border-gold focus:ring-saffron text-xs h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              required
              className="border-gold focus:ring-saffron text-xs h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Method</Label>
            <Select value={method} onValueChange={(val: any) => setMethod(val)}>
              <SelectTrigger id="method" className="border-gold text-xs h-9">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refNo" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Reference Number (Optional)</Label>
            <Input
              id="refNo"
              placeholder="e.g. Txn ID, UTR, Cheque No"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="border-gold focus:ring-saffron text-xs h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Remarks (Optional)</Label>
            <Input
              id="remarks"
              placeholder="Remarks or notes"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="border-gold focus:ring-saffron text-xs h-9"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs h-9 border-maroon text-maroon hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={recordPayment.isPending}
              className="bg-maroon hover:bg-maroon/90 text-white font-bold text-xs h-9"
            >
              {recordPayment.isPending ? 'Processing...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
