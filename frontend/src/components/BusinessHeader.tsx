import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BusinessHeaderProps {
  address: string;
  phone: string;
  gstNumber: string;
  onAddressChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onGstChange: (value: string) => void;
}

const BusinessHeader = ({
  address,
  phone,
  gstNumber,
  onAddressChange,
  onPhoneChange,
  onGstChange,
}: BusinessHeaderProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50 dark:bg-gray-700 p-4 rounded-lg border-2 border-gold">
      <div className="space-y-2">
        <Label htmlFor="address" className="text-maroon font-semibold">Business Address</Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Enter your business address"
          className="border-gold focus:ring-saffron"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-maroon font-semibold">Phone Number</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="Enter phone number"
          className="border-gold focus:ring-saffron"
        />
      </div>
      
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="gst" className="text-maroon font-semibold">GST Number (Optional)</Label>
        <Input
          id="gst"
          value={gstNumber}
          onChange={(e) => onGstChange(e.target.value)}
          placeholder="Enter GST number (optional)"
          className="border-gold focus:ring-saffron"
        />
      </div>
    </div>
  );
};

export default BusinessHeader;
