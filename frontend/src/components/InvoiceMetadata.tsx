import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getTodayDate } from '../utils/dateUtils';

interface InvoiceMetadataProps {
  invoiceNumber: string | number;
}

const InvoiceMetadata = ({ invoiceNumber }: InvoiceMetadataProps) => {
  const [date, setDate] = useState(getTodayDate());

  useEffect(() => {
    setDate(getTodayDate());
  }, [invoiceNumber]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invoiceNo" className="text-maroon font-semibold">Invoice No.</Label>
        <Input
          id="invoiceNo"
          value={invoiceNumber}
          readOnly
          className="bg-gray-100 dark:bg-gray-600 font-bold text-lg border-gold"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="date" className="text-maroon font-semibold">Date</Label>
        <Input
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border-gold focus:ring-saffron"
        />
      </div>
    </div>
  );
};

export default InvoiceMetadata;
