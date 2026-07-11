import React, { useState } from 'react';
import { useCustomers, useSaveCustomer, useDeleteCustomer } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Edit, Trash2, Users } from 'lucide-react';
import { useAuth } from '../AuthGuard';
import { toast } from 'sonner';

export default function CustomerAccounts() {
  const { user: currentUser } = useAuth();
  const isAdmin = !!(currentUser?.role && 'Admin' in currentUser.role);

  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomers();
  const { mutate: saveCustomer, isPending: isSavingCustomer } = useSaveCustomer();
  const { mutate: deleteCustomer } = useDeleteCustomer();

  // Form states
  const [custId, setCustId] = useState('');
  const [custName, setCustName] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custGst, setCustGst] = useState('');
  const [editingCust, setEditingCust] = useState<string | null>(null);

  const handleSaveCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) {
      toast.error('Customer Name is required');
      return;
    }
    if (!custAddress.trim()) {
      toast.error('Customer Address is required');
      return;
    }

    const phoneTrim = custPhone.trim();
    if (!phoneTrim) {
      toast.error('Phone Number is required');
      return;
    }

    // 10-digit Indian mobile validation
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(phoneTrim)) {
      toast.error('Please enter a valid 10-digit Indian Mobile Number');
      return;
    }

    // GSTIN format validation (if entered)
    const gstTrim = custGst.trim();
    if (gstTrim) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
      if (!gstRegex.test(gstTrim)) {
        toast.error('Please enter a valid 15-character GSTIN');
        return;
      }
    }

    // Deduplication checks: check if phone or GSTIN is already used by another customer
    const duplicatePhone = customers.find(c => c.id !== custId && c.phone === phoneTrim);
    if (duplicatePhone) {
      toast.error(`Deduplication Alert: Phone number ${phoneTrim} is already registered to customer "${duplicatePhone.name}"`);
      return;
    }

    if (gstTrim) {
      const duplicateGst = customers.find(c => c.id !== custId && c.gstNo?.toUpperCase() === gstTrim.toUpperCase());
      if (duplicateGst) {
        toast.error(`Deduplication Alert: GSTIN ${gstTrim} is already registered to customer "${duplicateGst.name}"`);
        return;
      }
    }

    const targetId = custId || custName.trim();

    saveCustomer({
      id: targetId,
      name: custName.trim(),
      businessAddress: custAddress.trim(),
      phone: phoneTrim,
      gstNo: gstTrim
    }, {
      onSuccess: () => {
        toast.success(editingCust ? 'Customer updated successfully' : 'Customer added successfully');
        handleResetForm();
      },
      onError: (err) => {
        toast.error('Failed to save customer: ' + err.message);
      }
    });
  };

  const handleEditCustomer = (cust: any) => {
    setCustId(cust.id);
    setCustName(cust.name);
    setCustAddress(cust.businessAddress);
    setCustPhone(cust.phone);
    setCustGst(cust.gstNo || '');
    setEditingCust(cust.id);
  };

  const handleDeleteCustomer = (id: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this customer? This action cannot be undone.");
    if (!confirmDelete) return;

    deleteCustomer(id, {
      onSuccess: () => {
        toast.success('Customer deleted successfully from directory');
      },
      onError: (err) => {
        toast.error('Failed to delete customer: ' + err.message);
      }
    });
  };

  const handleResetForm = () => {
    setCustId('');
    setCustName('');
    setCustAddress('');
    setCustPhone('');
    setCustGst('');
    setEditingCust(null);
  };

  if (isLoadingCustomers) {
    return <div className="py-8 text-center text-xs text-gray-500">Loading Customer Accounts...</div>;
  }

  return (
    <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
      <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
        <CardTitle className="text-maroon dark:text-saffron flex items-center gap-2">
          <Users className="h-5 w-5" />
          <span>Customer Accounts</span>
        </CardTitle>
        <CardDescription>View and manage client profiles and contact directories.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <form onSubmit={handleSaveCustomerSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="custName" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Customer Name</Label>
              <Input
                id="custName"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder="e.g. Rohan Shah"
                className="border-gold focus:ring-saffron"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custPhone" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Phone Number</Label>
              <Input
                id="custPhone"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                placeholder="e.g. 9824092261"
                className="border-gold focus:ring-saffron"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custAddress" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Business Address</Label>
            <Input
              id="custAddress"
              value={custAddress}
              onChange={(e) => setCustAddress(e.target.value)}
              placeholder="e.g. C-45, Vastrapur, Ahmedabad"
              className="border-gold focus:ring-saffron"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="custGst" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">GSTIN Number</Label>
            <Input
              id="custGst"
              value={custGst}
              onChange={(e) => setCustGst(e.target.value)}
              placeholder="e.g. 24APYPP8111N1Z4"
              className="border-gold focus:ring-saffron"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gold/10">
            {editingCust && (
              <Button
                type="button"
                variant="outline"
                onClick={handleResetForm}
                className="border-gold text-maroon hover:bg-gold/10"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSavingCustomer}
              className="bg-maroon hover:bg-maroon/90 text-white font-semibold border border-gold/30 shadow-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {editingCust ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </form>

        <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800 max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                <TableHead className="font-bold text-maroon">Name</TableHead>
                <TableHead className="font-bold text-maroon">Phone / GST</TableHead>
                <TableHead className="font-bold text-maroon text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers && customers.length > 0 ? (
                customers.map((c) => (
                  <TableRow key={c.id} className="hover:bg-amber-50/20 text-xs">
                    <TableCell className="font-semibold text-slate-800 dark:text-slate-100">
                      <p className="font-bold">{c.name}</p>
                      <p className="text-[10px] text-slate-500 font-normal leading-tight">{c.businessAddress}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold font-mono">{c.phone || 'N/A'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">GST: {c.gstNo || 'N/A'}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditCustomer(c)}
                          className="text-saffron hover:bg-saffron/10 h-7 w-7"
                        >
                          <Edit className="h-3.5 w-3.5 text-saffron" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCustomer(c.id)}
                            className="text-red-600 hover:bg-red-50 h-7 w-7"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-gray-500">No customers in directory.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
