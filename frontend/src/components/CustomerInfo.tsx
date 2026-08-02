import { SmartDetailDropdown, DropdownItem } from './SmartDetailDropdown';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInvoices, usePayments } from '../hooks/useQueries';
import { formatCurrency } from '../utils/currencyFormat';
import { calculateCustomerPreviousBalance } from '../utils/calculations';

interface CustomerItem {
  id: string;
  name: string;
  businessAddress: string;
  phone: string;
  gstNo: string;
}

interface CustomerInfoProps {
  customerName: string;
  customerPhone: string;
  customerGstNo: string;
  customerBusinessAddress: string;
  transport: string;
  customersList?: CustomerItem[];
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
  onCustomerGstNoChange: (value: string) => void;
  onCustomerBusinessAddressChange: (value: string) => void;
  onTransportChange: (value: string) => void;
}

const CustomerInfo = ({ 
  customerName, 
  customerPhone,
  customerGstNo,
  customerBusinessAddress,
  transport,
  customersList = [],
  onCustomerNameChange, 
  onCustomerPhoneChange,
  onCustomerGstNoChange,
  onCustomerBusinessAddressChange,
  onTransportChange
}: CustomerInfoProps) => {
  const { data: allInvoices = [] } = useInvoices();
  const { data: paymentsList = [] } = usePayments();
 
  const getOutstanding = (name: string) => {
    const balanceData = calculateCustomerPreviousBalance(
      name,
      undefined,
      allInvoices,
      paymentsList,
      0,
      0
    );
    return balanceData.previousDue - balanceData.advanceBalance;
  };

  const handleNameChange = (val: string) => {
    onCustomerNameChange(val);
    const trimmedVal = val.trim().toLowerCase();
    const found = customersList.find(c => c.name.trim().toLowerCase() === trimmedVal);
    if (found) {
      onCustomerBusinessAddressChange(found.businessAddress);
      onCustomerPhoneChange(found.phone);
      onCustomerGstNoChange(found.gstNo);
    }
  };

  const handleSelect = (selected: CustomerItem) => {
    onCustomerNameChange(selected.name);
    onCustomerBusinessAddressChange(selected.businessAddress);
    onCustomerPhoneChange(selected.phone);
    onCustomerGstNoChange(selected.gstNo);
  };

  const extractCity = (address: string): string => {
    if (!address) return 'N/A';
    const parts = address.split(',');
    const lastPart = parts[parts.length - 1].trim();
    const cityWithNoZip = lastPart.replace(/[-]?\s*\d+/g, '').replace(/[.\s]+$/g, '').trim();
    if (cityWithNoZip.toLowerCase() === 'gujarat' && parts.length > 1) {
      const nextLastPart = parts[parts.length - 2].trim();
      return nextLastPart.replace(/[-]?\s*\d+/g, '').replace(/[.\s]+$/g, '').trim();
    }
    return cityWithNoZip || 'N/A';
  };

  const filterText = (customerName || '').toLowerCase().trim();
  const filtered = customersList.filter(c => 
    c.name.toLowerCase().includes(filterText)
  );

  const dropdownItems: DropdownItem[] = filtered.map(c => {
    const outstanding = getOutstanding(c.name);
    return {
      id: c.id,
      title: c.name,
      subtitle: outstanding > 0 ? (
        <span className="text-[10px] px-2 py-0.5 rounded font-bold border bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900 flex-shrink-0">
          Due: {formatCurrency(outstanding)}
        </span>
      ) : outstanding < 0 ? (
        <span className="text-[10px] px-2 py-0.5 rounded font-bold border bg-green-50 border-green-200 text-green-700 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900 flex-shrink-0">
          Advance: {formatCurrency(Math.abs(outstanding))}
        </span>
      ) : (
        <span className="text-[10px] px-2 py-0.5 rounded font-bold border bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-900/40 dark:text-gray-400 dark:border-gray-900 flex-shrink-0">
          Settled
        </span>
      ),
      details: [
        { label: 'Phone', value: c.phone || 'N/A' }
      ],
      rawData: c
    };
  });

  const selectedCustomerInfo = customersList.find(
    c => c.name.trim().toLowerCase() === customerName.trim().toLowerCase()
  );
  const outstandingVal = selectedCustomerInfo ? getOutstanding(selectedCustomerInfo.name) : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customerName" className="text-maroon font-semibold">Customer Name</Label>
        <SmartDetailDropdown
          id="customerName"
          value={customerName}
          onChange={handleNameChange}
          onSelect={handleSelect}
          items={dropdownItems}
          placeholder="Enter customer name"
        />
      </div>

      {selectedCustomerInfo && (
        <div className="bg-[#F8F4E8] border-2 border-[#D4A017] rounded-xl p-4 shadow-md space-y-2.5 animate-in fade-in duration-200 text-xs">
          <div className="flex justify-between items-center border-b border-[#C89B3C]/30 pb-2">
            <span className="font-serif font-black text-sm text-[#7A0019]">Customer File: {selectedCustomerInfo.name}</span>
            {outstandingVal > 0 ? (
              <span className="bg-red-50 border border-red-200 text-red-700 font-bold px-2 py-0.5 rounded text-[10px] dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50">
                Due: {formatCurrency(outstandingVal)}
              </span>
            ) : outstandingVal < 0 ? (
              <span className="bg-green-50 border border-green-200 text-green-700 font-bold px-2 py-0.5 rounded text-[10px] dark:bg-green-950/40 dark:text-green-400 dark:border-[#D4A017]/50">
                Advance: {formatCurrency(Math.abs(outstandingVal))}
              </span>
            ) : (
              <span className="bg-green-50 border border-green-200 text-green-700 font-bold px-2 py-0.5 rounded text-[10px] dark:bg-green-950/40 dark:text-green-400 dark:border-[#D4A017]/50">
                Settled / No Due
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[#3A1F12] font-semibold">
            <div>
              <span className="text-slate-500 font-medium block">Mobile Number</span>
              <span>{selectedCustomerInfo.phone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-550 font-medium block">GSTIN</span>
              <span className="font-mono">{selectedCustomerInfo.gstNo || 'N/A'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 font-medium block">Billing Address</span>
              <span>{selectedCustomerInfo.businessAddress || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="border-t border-[#D4A017]/30 pt-4 mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customerBusinessAddress" className="text-[#7A0019] font-semibold">Business Address</Label>
          <Input
            id="customerBusinessAddress"
            value={customerBusinessAddress}
            onChange={(e) => onCustomerBusinessAddressChange(e.target.value)}
            placeholder="e.g. A-21, Madhavpura Market, Ahmedabad"
            className="border-[#D4A017] focus:ring-[#7A0019] focus-visible:ring-[#7A0019] h-9"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="transport" className="text-[#7A0019] font-semibold">Transport / Dispatch Via</Label>
          <Input
            id="transport"
            value={transport}
            onChange={(e) => onTransportChange(e.target.value)}
            placeholder="e.g. Local, Road Transport"
            className="border-[#D4A017] focus:ring-[#7A0019] focus-visible:ring-[#7A0019] h-9"
          />
        </div>
      </div>
    </div>
  );
};

export default CustomerInfo;
