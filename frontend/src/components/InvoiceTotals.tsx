import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductRow } from '../types/invoice';
import { calculateSubtotal, calculateGrandTotal } from '../utils/calculations';
import { formatCurrency } from '../utils/currencyFormat';

interface InvoiceTotalsProps {
  products: ProductRow[];
  discount: number;
  gstPercent: number;
  roundOff: boolean;
  taxType: string;
  paidAmount: number;
  previousDue?: number;
  advanceBalance?: number;
  onDiscountChange: (value: number) => void;
  onGstPercentChange: (value: number) => void;
  onRoundOffChange: (value: boolean) => void;
  onTaxTypeChange: (value: string) => void;
  onPaidAmountChange: (value: number) => void;
}

const InvoiceTotals = ({
  products,
  discount,
  gstPercent,
  roundOff,
  taxType,
  paidAmount,
  previousDue = 0,
  advanceBalance = 0,
  onDiscountChange,
  onGstPercentChange,
  onRoundOffChange,
  onTaxTypeChange,
  onPaidAmountChange
}: InvoiceTotalsProps) => {
  const subtotal = calculateSubtotal(products);
  const discountedAmount = subtotal - discount;
  const gstAmount = (discountedAmount * gstPercent) / 100;
  const currentGrandTotal = calculateGrandTotal(subtotal, discount, gstPercent, roundOff);
  
  const totalPayable = currentGrandTotal + previousDue - advanceBalance;
  const finalDueAmount = Math.max(0, totalPayable - paidAmount);

  const roundDiff = currentGrandTotal - (discountedAmount + gstAmount);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-maroon no-print">Calculation Summary</h2>
      
      <div className="bg-amber-50 dark:bg-gray-700 p-6 rounded-lg border-2 border-gold space-y-4 print:border-none print:bg-white print:p-0">
        
        {/* Interactive Controls (Screen Only) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
          <div className="space-y-2">
            <Label htmlFor="discount" className="text-maroon font-semibold">Discount (₹)</Label>
            <Input
              id="discount"
              type="number"
              min="0"
              step="0.01"
              value={discount || ''}
              onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="border-gold focus:ring-saffron"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gst" className="text-maroon font-semibold">GST (%)</Label>
            <Input
              id="gst"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={gstPercent || ''}
              onChange={(e) => onGstPercentChange(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="border-gold focus:ring-saffron"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxType" className="text-maroon font-semibold">GST Tax Type</Label>
            <Select value={taxType} onValueChange={onTaxTypeChange}>
              <SelectTrigger id="taxType" className="w-full border-gold focus:ring-saffron bg-white dark:bg-gray-800">
                <SelectValue placeholder="Select Tax Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CGST_SGST">Local (CGST + SGST)</SelectItem>
                <SelectItem value="IGST">Inter-state (IGST)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAmount" className="text-maroon font-semibold">Paid Amount (₹)</Label>
            <Input
              id="paidAmount"
              type="number"
              min="0"
              step="0.01"
              value={paidAmount || ''}
              onChange={(e) => onPaidAmountChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="border-gold focus:ring-saffron"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between no-print pt-2 border-t border-gold/20">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="roundOff"
              checked={roundOff}
              onCheckedChange={(checked) => onRoundOffChange(checked as boolean)}
            />
            <Label htmlFor="roundOff" className="text-maroon font-semibold cursor-pointer">
              Round Off to nearest rupee
            </Label>
          </div>
        </div>

        {/* Dynamic Calculation Results (Screen & Print) */}
        <div className="border-t-2 border-gold print:border-t-0 pt-4 mt-4 space-y-1.5 text-sm font-semibold text-maroon">
          <div className="flex justify-between items-center text-slate-700 dark:text-slate-350 print:text-black">
            <span>Sub Total:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between items-center text-red-600 print:text-black">
              <span>Discount:</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}

          {gstPercent > 0 && (
            taxType === 'IGST' ? (
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-350 print:text-black">
                <span>IGST ({gstPercent}%):</span>
                <span>{formatCurrency(gstAmount)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-350 print:text-black">
                  <span>CGST ({gstPercent / 2}%):</span>
                  <span>{formatCurrency(gstAmount / 2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-350 print:text-black">
                  <span>SGST ({gstPercent / 2}%):</span>
                  <span>{formatCurrency(gstAmount / 2)}</span>
                </div>
              </>
            )
          )}

          <div className="flex justify-between items-center text-slate-700 dark:text-slate-350 print:text-black">
            <span>Round Off:</span>
            <span>{formatCurrency(roundDiff)}</span>
          </div>

          <div className="border-t border-dashed border-gold/30 print:border-black/20 my-2" />

          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 print:text-black">
            <span>{advanceBalance > 0 ? 'Advance Balance:' : 'Previous Balance:'}</span>
            <span>
              {advanceBalance > 0 
                ? `-${formatCurrency(advanceBalance)}` 
                : formatCurrency(previousDue)}
            </span>
          </div>
          
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 print:text-black">
            <span>Current Invoice Total:</span>
            <span>{formatCurrency(currentGrandTotal)}</span>
          </div>
          
          <div className="flex justify-between items-center text-lg font-bold border-t border-gold/20 print:border-black/20 pt-1.5 text-maroon print:text-black">
            <span>Total Payable:</span>
            <span>{formatCurrency(totalPayable)}</span>
          </div>
          
          <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 print:text-black">
            <span>Paid Amount:</span>
            <span>{formatCurrency(paidAmount)}</span>
          </div>
          
          <div className="flex justify-between items-center text-xl font-bold border-t border-gold/20 print:border-black/20 pt-1.5 text-saffron print:text-black">
            <span>Due Amount:</span>
            <span>{formatCurrency(finalDueAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTotals;
