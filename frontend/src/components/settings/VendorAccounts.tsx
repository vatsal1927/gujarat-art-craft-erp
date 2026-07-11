import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { 
  useVendors, useSaveVendor, useDeleteVendor, 
  usePurchases, useLogUserAction, useActivityLogs,
  usePurchaseInvoices
} from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Save, Trash2, Edit, Search, Sparkles, Plus, 
  Building2, Eye, History, X, Check, ArrowUpRight, ShoppingBag, Download, Upload 
} from 'lucide-react';
import { formatCurrency } from '../../utils/currencyFormat';
import { toast } from 'sonner';
import { useAuth } from '../AuthGuard';
import { exportToCSV, parseCSV, formatSafeDate, getPurchasePaymentStatus } from '../../utils/masterData';
import { PurchaseInvoiceDetailsModal } from '../PurchaseInvoiceDetailsModal';

export default function VendorAccounts() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isAdmin = !!(currentUser?.role && 'Admin' in currentUser.role);
  const canDelete = isAdmin; // Only Master Admin can delete

  const { data: vendors = [], isLoading: isLoadingVendors } = useVendors();
  const { data: purchases = [] } = usePurchases();
  const { data: purchaseInvoices = [] } = usePurchaseInvoices();
  const { mutate: saveVendor, isPending: isSaving } = useSaveVendor();
  const { mutate: deleteVendor } = useDeleteVendor();
  const { mutate: logUserAction } = useLogUserAction();
  const { data: activityLogs = [] } = useActivityLogs();

  const [detailInvoice, setDetailInvoice] = useState<any | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected vendors?`)) return;
    let completed = 0;
    selectedIds.forEach((id) => {
      deleteVendor(id, {
        onSuccess: () => {
          completed++;
          if (completed === selectedIds.length) {
            toast.success('Selected vendors deleted successfully.');
            setSelectedIds([]);
          }
        }
      });
    });
  };

  const handleExport = () => {
    const data = (vendors || []).map(v => ({
      id: v.id,
      name: v.name,
      phone: v.phone || '',
      gstin: v.gstin || '',
      businessAddress: v.businessAddress || '',
      openingBalance: v.openingBalance || 0,
      bankName: v.bankName || '',
      bankBranch: v.bankBranch || '',
      accountNumber: v.accountNumber || '',
      ifscCode: v.ifscCode || '',
      panNumber: v.panNumber || v.PAN || '',
      status: v.status || 'Active',
      notes: v.notes || '',
      creditLimit: v.creditLimit || 100000,
      creditDays: v.creditDays || 30,
      rating: v.rating || 5
    }));
    exportToCSV(data, [
      'id', 'name', 'phone', 'gstin', 'businessAddress', 'openingBalance',
      'bankName', 'bankBranch', 'accountNumber', 'ifscCode', 'panNumber',
      'status', 'notes', 'creditLimit', 'creditDays', 'rating'
    ], 'vendors_master');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let imported: any[] = [];
        if (file.name.endsWith('.json')) {
          imported = JSON.parse(text);
        } else {
          imported = parseCSV(text);
        }

        let count = 0;
        let skipCount = 0;
        imported.forEach((item: any) => {
          const id = String(item.id || '').trim();
          const name = String(item.name || '').trim();
          if (!id || !name) {
            skipCount++;
            return;
          }
          const dup = (vendors || []).some(v => v.id === id || v.name.trim().toLowerCase() === name.toLowerCase());
          if (dup) {
            skipCount++;
            return;
          }

          saveVendor({
            id,
            name,
            phone: String(item.phone || '').trim(),
            gstin: String(item.gstin || '').trim(),
            businessAddress: String(item.businessAddress || '').trim(),
            openingBalance: Number(item.openingBalance) || 0,
            bankName: String(item.bankName || '').trim(),
            bankBranch: String(item.bankBranch || '').trim(),
            accountNumber: String(item.accountNumber || '').trim(),
            ifscCode: String(item.ifscCode || '').trim(),
            panNumber: String(item.panNumber || item.PAN || '').trim(),
            status: String(item.status || 'Active').trim() as any,
            notes: String(item.notes || '').trim(),
            creditLimit: Number(item.creditLimit) || 100000,
            creditDays: Number(item.creditDays) || 30,
            rating: Number(item.rating) || 5
          });
          count++;
        });

        toast.success(`Imported ${count} vendors successfully. Skipped ${skipCount} duplicates/invalid entries.`);
      } catch (err) {
        toast.error("Failed to parse import file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Form states
  const [vendorCode, setVendorCode] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [notes, setNotes] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(100000);
  const [creditDays, setCreditDays] = useState<number>(30);
  const [rating, setRating] = useState<number>(5);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
  const [historyVendor, setHistoryVendor] = useState<any | null>(null);
  const [purchaseHistoryVendor, setPurchaseHistoryVendor] = useState<any | null>(null);

  // Auto-generate code
  useEffect(() => {
    if (!editingId && vendors) {
      const nextNum = vendors.length + 1;
      setVendorCode(`VND-${String(nextNum).padStart(3, '0')}`);
    }
  }, [vendors, editingId]);

  const loadVendorForEdit = (v: any) => {
    setVendorCode(v.id);
    setVendorName(v.name);
    setPhone(v.phone === 'N/A' ? '' : v.phone || '');
    setGstin(v.gstin === 'N/A' ? '' : v.gstin || '');
    setBusinessAddress(v.businessAddress === 'N/A' ? '' : v.businessAddress || '');
    setOpeningBalance(Number(v.openingBalance) || 0);
    setBankName(v.bankName || '');
    setBankBranch(v.bankBranch || '');
    setAccountNumber(v.accountNumber || '');
    setIfscCode(v.ifscCode || '');
    setPanNumber(v.panNumber || v.PAN || '');
    setStatus(v.status || 'Active');
    setNotes(v.notes || '');
    setCreditLimit(Number(v.creditLimit) || 100000);
    setCreditDays(Number(v.creditDays) || 30);
    setRating(Number(v.rating) || 5);
    setEditingId(v.id);
  };

  const resetForm = () => {
    setEditingId(null);
    setVendorName('');
    setPhone('');
    setGstin('');
    setBusinessAddress('');
    setOpeningBalance(0);
    setBankName('');
    setBankBranch('');
    setAccountNumber('');
    setIfscCode('');
    setPanNumber('');
    setStatus('Active');
    setNotes('');
    setCreditLimit(100000);
    setCreditDays(30);
    setRating(5);

    // Auto-generate code for next item
    const nextNum = (vendors?.length || 0) + 1;
    setVendorCode(`VND-${String(nextNum).padStart(3, '0')}`);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorCode.trim()) {
      toast.error('Vendor Code is required');
      return;
    }
    if (!vendorName.trim()) {
      toast.error('Vendor Name is required');
      return;
    }

    // Check duplicate code or name
    const isDuplicateCode = vendors.some(
      (v: any) => v.id !== editingId && v.id.toLowerCase().trim() === vendorCode.toLowerCase().trim()
    );
    if (isDuplicateCode) {
      toast.error(`Vendor Code "${vendorCode}" is already registered.`);
      return;
    }

    const isDuplicateName = vendors.some(
      (v: any) => v.name.toLowerCase().trim() === vendorName.toLowerCase().trim() && v.id !== editingId
    );
    if (isDuplicateName) {
      toast.error(`Vendor name "${vendorName}" is already registered.`);
      return;
    }

    // Check duplicate Phone
    if (phone.trim() && phone.trim() !== 'N/A') {
      const duplicatePhoneVendor = vendors.find(
        (v: any) => v.id !== editingId && v.phone && v.phone.trim() === phone.trim()
      );
      if (duplicatePhoneVendor) {
        toast.error(`Mobile number "${phone}" is already registered to vendor "${duplicatePhoneVendor.name}" (${duplicatePhoneVendor.id}).`);
        return;
      }
    }

    // Check duplicate GSTIN
    if (gstin.trim() && gstin.trim().toUpperCase() !== 'N/A') {
      const duplicateGstinVendor = vendors.find(
        (v: any) => v.id !== editingId && v.gstin && v.gstin.trim().toUpperCase() === gstin.trim().toUpperCase()
      );
      if (duplicateGstinVendor) {
        toast.error(`GSTIN "${gstin.toUpperCase()}" is already registered to vendor "${duplicateGstinVendor.name}" (${duplicateGstinVendor.id}).`);
        return;
      }
    }

    // Validate opening balance
    if (openingBalance < 0) {
      toast.error('Opening Balance cannot be negative');
      return;
    }

    // Validate Phone (10 digits if provided)
    if (phone.trim() && phone.trim() !== 'N/A' && !/^[6-9]\d{9}$/.test(phone.trim())) {
      toast.error('Mobile Number must be a valid 10-digit Indian mobile number');
      return;
    }

    // Validate GSTIN (15 characters if provided)
    if (gstin.trim() && gstin.trim().toUpperCase() !== 'N/A' && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase())) {
      toast.error('GSTIN must be a valid 15-character Indian tax ID format (e.g. 24AAAAA1111A1Z1)');
      return;
    }

    // Validate PAN (10 characters if provided)
    if (panNumber.trim() && panNumber.trim().toUpperCase() !== 'N/A' && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.trim().toUpperCase())) {
      toast.error('PAN Number must be a valid 10-character alphanumeric code');
      return;
    }

    // Validate IFSC (11 characters if provided)
    if (ifscCode.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim().toUpperCase())) {
      toast.error('IFSC Code must be a valid 11-character Indian banking routing code');
      return;
    }

    saveVendor({
      id: vendorCode.trim(),
      name: vendorName.trim(),
      phone: phone.trim() || 'N/A',
      gstin: gstin.trim().toUpperCase() || 'N/A',
      businessAddress: businessAddress.trim() || 'N/A',
      openingBalance: Number(openingBalance),
      bankName: bankName.trim(),
      bankBranch: bankBranch.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      panNumber: panNumber.trim().toUpperCase(),
      PAN: panNumber.trim().toUpperCase() || 'N/A',
      status: status,
      notes: notes.trim(),
      creditLimit: Number(creditLimit),
      creditDays: Number(creditDays),
      rating: Number(rating)
    }, {
      onSuccess: () => {
        // Log user action
        logUserAction({
          action: editingId ? 'Update Vendor' : 'Create Vendor',
          details: `${editingId ? 'Updated' : 'Created'} vendor: ${vendorName} (${vendorCode})`
        });

        toast.success(editingId ? 'Vendor profile updated successfully!' : 'Vendor profile added successfully!');
        resetForm();
      },
      onError: (err: any) => {
        toast.error(`Error saving vendor: ${err.message}`);
      }
    });
  };

  // Delete Handler
  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete vendor "${name}" (${id})?`)) {
      return;
    }

    deleteVendor(id, {
      onSuccess: () => {
        // Log user action
        logUserAction({
          action: 'Delete Vendor',
          details: `Deleted vendor profile: ${name} (${id})`
        });

        toast.success('Vendor profile deleted successfully!');
      },
      onError: (err: any) => {
        toast.error(`Failed to delete vendor: ${err.message}`);
      }
    });
  };

  // Get vendor outstanding ledger info
  const getVendorOutstanding = (vendorName: string, opBalance: number = 0) => {
    const vendorPurchases = purchases.filter(p =>
      p.vendorName.trim().toLowerCase() === vendorName.trim().toLowerCase()
    );
    const totalPurchasesAmount = vendorPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalPaidPurchases = vendorPurchases.reduce((sum, p) => sum + p.paidAmount, 0);
    return Math.max(0, opBalance + totalPurchasesAmount - totalPaidPurchases);
  };

  // Filtered List
  const filteredVendors = useMemo(() => {
    return vendors.filter((v: any) => {
      return (
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.phone && v.phone.includes(searchQuery))
      );
    });
  }, [vendors, searchQuery]);

  // Filter audit logs for specific vendor
  const vendorAuditLogs = useMemo(() => {
    if (!historyVendor) return [];
    return activityLogs.filter((log: any) => 
      log.action.includes(historyVendor.id) ||
      log.details.includes(historyVendor.id) ||
      log.details.includes(historyVendor.name)
    );
  }, [activityLogs, historyVendor]);

  // Filter purchases for specific vendor
  const vendorPurchases = useMemo(() => {
    if (!purchaseHistoryVendor) return [];
    return purchaseInvoices.filter((p: any) => 
      p.vendorName.trim().toLowerCase() === purchaseHistoryVendor.name.trim().toLowerCase()
    );
  }, [purchaseInvoices, purchaseHistoryVendor]);

  const vendorPurchasesSummary = useMemo(() => {
    if (!vendorPurchases || !vendorPurchases.length) {
      return {
        totalPurchases: 0,
        totalPaid: 0,
        outstanding: 0,
        invoiceCount: 0,
        lastPurchaseDate: 'N/A'
      };
    }
    const invoiceCount = vendorPurchases.length;
    const totalPurchases = vendorPurchases.reduce((sum: number, p: any) => sum + (Number(p.totalAmount) || 0), 0);
    const totalPaid = vendorPurchases.reduce((sum: number, p: any) => sum + (Number(p.paidAmount) || 0), 0);
    const outstanding = Math.max(0, totalPurchases - totalPaid);
    
    let lastDateObj: Date | null = null;
    let lastPurchaseDate = 'N/A';
    vendorPurchases.forEach((p: any) => {
      const dStr = formatSafeDate(p);
      const parsed = Date.parse(dStr);
      if (!isNaN(parsed)) {
        const d = new Date(parsed);
        if (!lastDateObj || d > lastDateObj) {
          lastDateObj = d;
          lastPurchaseDate = dStr;
        }
      }
    });
    
    return {
      totalPurchases,
      totalPaid,
      outstanding,
      invoiceCount,
      lastPurchaseDate
    };
  }, [vendorPurchases]);

  return (
    <div className="space-y-6">
      <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
        <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
          <CardTitle className="text-maroon dark:text-saffron flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-saffron" />
              Vendor & Supplier Accounts
            </span>
            {editingId && (
              <Button size="sm" variant="ghost" onClick={resetForm} className="text-red-500 hover:text-red-700">
                <X className="h-4 w-4 mr-1" /> Cancel Edit
              </Button>
            )}
          </CardTitle>
          <CardDescription>Register merchant details, credit terms, bank routing parameters, opening outstanding balances, and GST registry cards.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          
          {/* Create / Edit Form */}
          <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-cream/30 border border-gold/15 space-y-4">
            <h3 className="font-bold text-sm text-maroon flex items-center gap-1.5 uppercase tracking-wide">
              <span>{editingId ? 'Update Supplier Account' : 'Register New Vendor Account'}</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="vendorCode" className="text-xs font-semibold text-slate-700">Vendor Code</Label>
                <div className="relative">
                  <Input
                    id="vendorCode"
                    value={vendorCode}
                    onChange={(e) => setVendorCode(e.target.value.toUpperCase())}
                    placeholder="e.g. VND-001"
                    disabled={!!editingId}
                    className="border-gold bg-white dark:bg-slate-900 pr-8 text-xs font-mono"
                    required
                  />
                  {!editingId && (
                    <Sparkles className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-gold animate-pulse pointer-events-none" />
                  )}
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="vendorName" className="text-xs font-semibold text-slate-700">Vendor Business Name</Label>
                <Input
                  id="vendorName"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. Gujarat Craft Fabrics Ltd."
                  className="border-gold bg-white dark:bg-slate-900 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">Mobile Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit number"
                  className="border-gold bg-white dark:bg-slate-900 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="gstin" className="text-xs font-semibold text-slate-700">GSTIN No. (15-char)</Label>
                <Input
                  id="gstin"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="24AAAAA1111A1Z1"
                  className="border-gold bg-white dark:bg-slate-900 text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="panNumber" className="text-xs font-semibold text-slate-700">PAN Card No. (10-char)</Label>
                <Input
                  id="panNumber"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  placeholder="ABCDE1234F"
                  className="border-gold bg-white dark:bg-slate-900 text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="openingBalance" className="text-xs font-semibold text-slate-700">Opening Credit Balance (₹)</Label>
                <Input
                  id="openingBalance"
                  type="number"
                  min="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="border-gold bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-semibold text-slate-700">Account Status</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger id="status" className="border-gold bg-white dark:bg-slate-900 text-xs">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Credit Rules & Vendor Quality Rating Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-amber-50/15 dark:bg-slate-900/30 rounded-lg border border-gold/15">
              <div className="space-y-1.5">
                <Label htmlFor="creditLimit" className="text-xs font-semibold text-slate-700">Credit Limit (₹)</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  min="0"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(Number(e.target.value) || 0)}
                  placeholder="100000"
                  className="border-gold bg-white dark:bg-slate-900 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="creditDays" className="text-xs font-semibold text-slate-700">Credit Terms (Days)</Label>
                <Input
                  id="creditDays"
                  type="number"
                  min="0"
                  value={creditDays}
                  onChange={(e) => setCreditDays(Number(e.target.value) || 0)}
                  placeholder="30"
                  className="border-gold bg-white dark:bg-slate-900 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rating" className="text-xs font-semibold text-slate-700">Vendor Quality Rating</Label>
                <Select value={String(rating)} onValueChange={(val) => setRating(Number(val) || 5)}>
                  <SelectTrigger id="rating" className="border-gold bg-white dark:bg-slate-900 text-xs font-semibold">
                    <SelectValue placeholder="Select Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">⭐ (1 Star - Poor / Late)</SelectItem>
                    <SelectItem value="2">⭐⭐ (2 Star - Below Average)</SelectItem>
                    <SelectItem value="3">⭐⭐⭐ (3 Star - Average / Reliable)</SelectItem>
                    <SelectItem value="4">⭐⭐⭐⭐ (4 Star - Good Supplier)</SelectItem>
                    <SelectItem value="5">⭐⭐⭐⭐⭐ (5 Star - Preferred Partner)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bank details subsection */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200/50 space-y-3">
              <h4 className="text-xs font-bold text-slate-750 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Supplier Settlement Bank Details</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bankName" className="text-xs font-medium text-slate-600">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="SBI, HDFC, etc."
                    className="bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bankBranch" className="text-xs font-medium text-slate-600">Branch Location</Label>
                  <Input
                    id="bankBranch"
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    placeholder="Ahmedabad Branch"
                    className="bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="accountNumber" className="text-xs font-medium text-slate-600">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter bank account no."
                    className="bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ifscCode" className="text-xs font-medium text-slate-600">IFSC Code (11-char)</Label>
                  <Input
                    id="ifscCode"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    placeholder="SBIN0001234"
                    className="bg-white dark:bg-slate-900 text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="businessAddress" className="text-xs font-semibold text-slate-700">Billing & Business Address</Label>
                <Textarea
                  id="businessAddress"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="Billing address for purchases and invoice logs"
                  rows={2}
                  className="border-gold bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">Additional Terms & Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Credit threshold warnings, shipment schedules, general notes..."
                  rows={2}
                  className="border-gold bg-white dark:bg-slate-900 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gold/10 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="border-gold text-maroon hover:bg-gold/10 text-xs"
              >
                Reset Form
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-maroon hover:bg-maroon/90 text-white font-semibold border border-gold/30 shadow-sm text-xs"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {editingId ? 'Update Profile' : 'Save Supplier'}
              </Button>
            </div>
          </form>

          {/* Search Table Section */}
          <div className="space-y-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vendor code, name, or phone..."
                className="pl-9 border-gold bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center justify-between pb-3 border-b border-gold/10">
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExport}
                  className="border-gold text-maroon hover:bg-gold/10 h-8 text-xs font-semibold"
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
                </Button>
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".csv,.json" 
                    onChange={handleImport} 
                    className="hidden" 
                    id="import-vendors-file" 
                  />
                  <Label 
                    htmlFor="import-vendors-file"
                    className="inline-flex items-center justify-center h-8 rounded-md px-3 text-xs font-semibold border border-gold text-maroon hover:bg-gold/10 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" /> Import CSV/JSON
                  </Label>
                </div>
              </div>
              {canDelete && selectedIds.length > 0 && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleBulkDelete}
                  className="h-8 text-xs font-semibold"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Bulk Delete ({selectedIds.length})
                </Button>
              )}
            </div>

            {/* Vendors Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800 max-h-[350px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                    <TableHead className="w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="h-3.5 w-3.5 rounded border-gold accent-maroon"
                        checked={selectedIds.length > 0 && selectedIds.length === filteredVendors.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredVendors.map(v => v.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Vendor Code</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Vendor Name</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Mobile Phone</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">GSTIN No.</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-right">Active Outstanding</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-center">Status</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingVendors ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-xs text-gray-500">Loading suppliers registry...</TableCell>
                    </TableRow>
                  ) : filteredVendors.length > 0 ? (
                    filteredVendors.map((v: any) => {
                      const outstanding = getVendorOutstanding(v.name, Number(v.openingBalance) || 0);
                      return (
                        <TableRow key={v.id} className="hover:bg-amber-50/20 text-xs">
                          <TableCell className="text-center">
                            <input 
                              type="checkbox" 
                              className="h-3.5 w-3.5 rounded border-gold accent-maroon"
                              checked={selectedIds.includes(v.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(prev => [...prev, v.id]);
                                } else {
                                  setSelectedIds(prev => prev.filter(id => id !== v.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-bold font-mono text-slate-800 dark:text-slate-200">{v.id}</TableCell>
                          <TableCell className="font-semibold text-slate-800 dark:text-slate-200">{v.name}</TableCell>
                          <TableCell className="font-mono text-slate-600">{v.phone || 'N/A'}</TableCell>
                          <TableCell className="font-mono text-slate-600 uppercase">{v.gstin || 'N/A'}</TableCell>
                          <TableCell className="text-right font-bold text-red-655 text-xs">
                            {outstanding > 0 ? formatCurrency(outstanding) : '₹0.00'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              v.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-300/40' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {v.status || 'Active'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedVendor(v)}
                                className="text-slate-500 hover:bg-slate-100 h-7 w-7"
                                title="View Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => loadVendorForEdit(v)}
                                className="text-saffron hover:bg-saffron/10 h-7 w-7"
                                title="Edit Vendor"
                              >
                                <Edit className="h-3.5 w-3.5 text-saffron" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  logUserAction({ action: 'VENDOR_LEDGER_OPENED', details: `Opened ledger for vendor ${v.name} (${v.id})` });
                                  logUserAction({ action: 'VENDOR_LEDGER_SYNC_CHECKED', details: `Checked vendor ledger sync for ${v.name} (${v.id})` });
                                  navigate({ to: '/ledger', search: { tab: 'vendors', vendorName: v.name } });
                                }}
                                className="text-teal-600 hover:bg-teal-50 h-7 w-7"
                                title="Open Ledger"
                              >
                                <ArrowUpRight className="h-3.5 w-3.5 text-teal-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setPurchaseHistoryVendor(v);
                                  logUserAction({ action: 'VENDOR_PURCHASE_HISTORY_VIEWED', details: `Viewed purchase history for vendor ${v.name} (${v.id})` });
                                }}
                                className="text-blue-600 hover:bg-blue-50 h-7 w-7"
                                title="Purchase History"
                              >
                                <ShoppingBag className="h-3.5 w-3.5 text-blue-600" />
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(v.id, v.name)}
                                  className="text-red-600 hover:bg-red-50 h-7 w-7"
                                  title="Delete Profile"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500 text-xs">No matching vendor accounts in database.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Details View Modal */}
      <Dialog open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
        <DialogContent className="max-w-md bg-white border border-gold/45 shadow-xl">
          <DialogHeader className="border-b border-gold/15 pb-2">
            <DialogTitle className="text-maroon flex items-center gap-2">
              <Eye className="h-5 w-5 text-saffron" />
              <span>Vendor Registry: {selectedVendor?.name}</span>
            </DialogTitle>
            <DialogDescription>Full settlement details, registry cards, and outstanding status.</DialogDescription>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-4 pt-3 text-xs">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Vendor Code</span>
                  <span className="font-semibold text-slate-800 text-xs">{selectedVendor.id}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Vendor Name</span>
                  <span className="font-semibold text-slate-800 text-xs">{selectedVendor.name}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Phone Number</span>
                  <span className="font-mono font-semibold text-slate-800 text-xs">{selectedVendor.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">GSTIN</span>
                  <span className="font-mono font-semibold text-slate-800 text-xs uppercase">{selectedVendor.gstin || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">PAN Card</span>
                  <span className="font-mono font-semibold text-slate-800 text-xs uppercase">{selectedVendor.panNumber || selectedVendor.PAN || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Opening Balance</span>
                  <span className="font-semibold text-slate-800 text-xs">{formatCurrency(Number(selectedVendor.openingBalance) || 0)}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Live Outstanding</span>
                  <span className="font-bold text-red-600 text-xs">
                    {formatCurrency(getVendorOutstanding(selectedVendor.name, Number(selectedVendor.openingBalance) || 0))}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Account Status</span>
                  <span className={`font-bold text-[10px] ${selectedVendor.status === 'Active' ? 'text-green-600' : 'text-slate-500'}`}>{selectedVendor.status || 'Active'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Credit Limit</span>
                  <span className="font-semibold text-slate-800 text-xs">{formatCurrency(Number(selectedVendor.creditLimit) || 100000)}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Credit Terms</span>
                  <span className="font-semibold text-slate-800 text-xs">{selectedVendor.creditDays || 30} Days</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Quality Rating</span>
                  <span className="font-semibold text-amber-500 text-xs">{"⭐".repeat(selectedVendor.rating || 5)}</span>
                </div>
              </div>

              {/* Settlement Bank Details Box */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 col-span-2">
                <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px] mb-1">Payment Settlement Bank Attributes</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-450 font-semibold block text-[9px] uppercase">Bank Name</span>
                    <span className="font-bold text-slate-800">{selectedVendor.bankName || 'Not Set'}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 font-semibold block text-[9px] uppercase">Branch Location</span>
                    <span className="font-bold text-slate-800">{selectedVendor.bankBranch || 'Not Set'}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 font-semibold block text-[9px] uppercase">Account Number</span>
                    <span className="font-mono font-bold text-slate-800">{selectedVendor.accountNumber || 'Not Set'}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 font-semibold block text-[9px] uppercase">IFSC Routing Code</span>
                    <span className="font-mono font-bold text-slate-800 uppercase">{selectedVendor.ifscCode || 'Not Set'}</span>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gold/10 pt-2">
                <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Business Address</span>
                <p className="text-slate-700 leading-normal">{selectedVendor.businessAddress || 'No address registered.'}</p>
              </div>

              <div className="border-t border-gold/10 pt-2">
                <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Additional Notes / Terms</span>
                <p className="text-slate-700 italic leading-relaxed">{selectedVendor.notes || 'No custom notes provided.'}</p>
              </div>

              <div className="flex justify-end pt-3">
                <Button size="sm" onClick={() => setSelectedVendor(null)} className="bg-maroon text-white hover:bg-maroon/90">
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Audit Logs Modal */}
      <Dialog open={!!historyVendor} onOpenChange={() => setHistoryVendor(null)}>
        <DialogContent className="max-w-xl bg-white border border-gold/45 shadow-xl">
          <DialogHeader className="border-b border-gold/15 pb-2">
            <DialogTitle className="text-maroon flex items-center gap-2">
              <History className="h-5 w-5 text-blue-500" />
              <span>Audit History: {historyVendor?.name} ({historyVendor?.id})</span>
            </DialogTitle>
            <DialogDescription>System audit trail tracking purchases, vendor payments, and configuration edits.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-3 text-xs">
            <div className="overflow-y-auto max-h-80 border border-slate-100 rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 sticky top-0">
                    <TableHead className="font-bold text-maroon text-xs">Timestamp</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">User</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Action</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorAuditLogs.length > 0 ? (
                    vendorAuditLogs.map((log: any, idx: number) => {
                      const logDate = formatSafeDate(log);
                      return (
                        <TableRow key={idx} className="hover:bg-slate-50 text-[11px]">
                          <TableCell className="font-mono text-slate-500 whitespace-nowrap">{logDate}</TableCell>
                          <TableCell className="font-semibold text-slate-700">@{log.userName || 'System'}</TableCell>
                          <TableCell className="font-bold text-maroon whitespace-nowrap">{log.action}</TableCell>
                          <TableCell className="text-slate-600 leading-normal">{log.details}</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-slate-450 italic">No logged events found for this vendor.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setHistoryVendor(null)} className="bg-maroon text-white hover:bg-maroon/90">
                Dismiss
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Purchase History Modal */}
      <Dialog open={!!purchaseHistoryVendor} onOpenChange={() => setPurchaseHistoryVendor(null)}>
        <DialogContent className="max-w-3xl bg-white border border-gold/45 shadow-xl">
          <DialogHeader className="border-b border-gold/15 pb-2">
            <DialogTitle className="text-maroon flex items-center gap-2">
              <Building2 className="h-5 w-5 text-maroon" />
              <span>Purchase History: {purchaseHistoryVendor?.name}</span>
            </DialogTitle>
            <DialogDescription>Chronological list of all purchase invoices, amounts, and payment status.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-3 text-xs">
            {/* Summary Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-gold/20 rounded-lg">
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Invoice Count</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{vendorPurchasesSummary.invoiceCount}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-gold/20 rounded-lg">
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Total Purchases</span>
                <span className="text-sm font-bold text-maroon dark:text-saffron">{formatCurrency(vendorPurchasesSummary.totalPurchases)}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-gold/20 rounded-lg">
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Total Paid</span>
                <span className="text-sm font-bold text-green-700">{formatCurrency(vendorPurchasesSummary.totalPaid)}</span>
              </div>
              <div className="p-3 bg-red-50/30 dark:bg-red-950/20 border border-red-200 rounded-lg">
                <span className="text-[9px] font-bold text-red-500 block uppercase tracking-wider">Outstanding</span>
                <span className="text-sm font-bold text-red-700">{formatCurrency(vendorPurchasesSummary.outstanding)}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-gold/20 rounded-lg">
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Last Purchase</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate mt-1">{vendorPurchasesSummary.lastPurchaseDate}</span>
              </div>
            </div>

            <div className="overflow-y-auto max-h-80 border border-slate-100 rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 sticky top-0">
                    <TableHead className="font-bold text-maroon text-xs">Bill No.</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Date</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-right">Total Amount</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-right">Paid Amount</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-right">Outstanding</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorPurchases.length > 0 ? (
                    vendorPurchases.map((p: any) => {
                      const billDate = formatSafeDate(p);
                      const status = getPurchasePaymentStatus(p);
                      const outstanding = Math.max(0, (Number(p.totalAmount) || 0) - (Number(p.paidAmount) || 0));
                      return (
                        <TableRow key={p.id} className="hover:bg-slate-50 text-[11px]">
                          <TableCell 
                            className="font-mono font-bold text-[#7B0F1A] dark:text-saffron hover:underline cursor-pointer"
                            onClick={() => {
                              setDetailInvoice(p);
                              logUserAction({ 
                                action: 'PURCHASE_INVOICE_OPENED_FROM_VENDOR_HISTORY', 
                                details: `Opened invoice details for ${p.purchaseNumber} from vendor purchase history` 
                              });
                            }}
                          >
                            {p.purchaseNumber}
                          </TableCell>
                          <TableCell className="text-slate-650">{billDate}</TableCell>
                          <TableCell className="text-right font-semibold text-slate-900">{formatCurrency(p.totalAmount)}</TableCell>
                          <TableCell className="text-right text-green-700">{formatCurrency(p.paidAmount)}</TableCell>
                          <TableCell className="text-right font-bold text-red-655">{formatCurrency(outstanding)}</TableCell>
                          <TableCell className="text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              status === 'Paid' ? 'bg-green-50 text-green-700 border border-green-200' :
                              status === 'Partially Paid' || status === 'Partial' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              status === 'Overdue' ? 'bg-red-100 text-red-800 border border-red-200' :
                              'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {status}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-slate-450 italic">No purchase records registered for this vendor.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setPurchaseHistoryVendor(null)} className="bg-maroon text-white hover:bg-maroon/90">
                Dismiss
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PurchaseInvoiceDetailsModal 
        isOpen={!!detailInvoice}
        onClose={() => setDetailInvoice(null)}
        invoice={detailInvoice}
        isAdminOrMaster={isAdmin}
      />
    </div>
  );
}
