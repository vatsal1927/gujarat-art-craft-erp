import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { usePurchases, useSavePurchase, useRawMaterials, useDeletePurchase } from '../hooks/useQueries';
import { SmartDetailDropdown, DropdownItem } from '../components/SmartDetailDropdown';
import { formatCurrency } from '../utils/currencyFormat';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../components/AuthGuard';
import { Plus, Trash, Save, ShoppingBag, History, Calendar, Search, Smartphone, MapPin, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { formatERPDate } from '../utils/calculations';
import { formatSafeDate } from '../utils/masterData';

interface PurchaseRow {
  id: string;
  materialId: string; // raw material name/ID
  category: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number; // cost rate excl. GST
  gstPercent: number;
}

const Purchases = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = !!(user?.role && 'Admin' in user.role);
  const isManager = !!(user?.role && 'Manager' in user.role);
  const canDelete = isAdmin || isManager;

  const { data: purchasesList = [], isLoading: loadingPurchases } = usePurchases({ enabled: !!user });
  const { data: rawMaterialsList = [] } = useRawMaterials({ enabled: !!user });
  const { mutate: savePurchase, isPending: isSaving } = useSavePurchase();
  const { mutate: deletePurchase } = useDeletePurchase();

  const [purchaseNo, setPurchaseNo] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorMobile, setVendorMobile] = useState('');
  const [vendorGst, setVendorGst] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [paidAmount, setPaidAmount] = useState(0);

  const [items, setItems] = useState<PurchaseRow[]>([
    { id: '1', materialId: '', category: 'General', hsnCode: '5609', quantity: 0, unit: 'pcs', rate: 0, gstPercent: 5 }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);

  if (!user) return null;

  const localVendors = (() => {
    try {
      return JSON.parse(localStorage.getItem('mock_vendors') || '[]');
    } catch {
      return [];
    }
  })();

  const vendorsList = Array.from(new Set([
    ...purchasesList.map(p => p.vendorName),
    ...localVendors.map((v: any) => v.name)
  ])).map(name => {
    const purchaseMatch = purchasesList.find(p => p.vendorName === name);
    const localMatch = localVendors.find((v: any) => v.name === name);
    return {
      name,
      phone: localMatch?.phone || purchaseMatch?.vendorMobile || '',
      gstNo: localMatch?.gstin || purchaseMatch?.vendorGstNumber || '',
      businessAddress: localMatch?.businessAddress || purchaseMatch?.vendorAddress || ''
    };
  });

  const handleSelectVendorName = (v: typeof vendorsList[0]) => {
    setVendorName(v.name);
    setVendorMobile(v.phone);
    setVendorGst(v.gstNo);
    setVendorAddress(v.businessAddress);
  };

  const getVendorOutstandingAmount = (name: string) => {
    const vendorPurchases = purchasesList.filter(p =>
      p.vendorName.trim().toLowerCase() === name.trim().toLowerCase()
    );
    const totalPurchasesAmount = vendorPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalPaidPurchases = vendorPurchases.reduce((sum, p) => sum + p.paidAmount, 0);
    return Math.max(0, totalPurchasesAmount - totalPaidPurchases);
  };

  // Auto-generate purchase number
  useEffect(() => {
    if (purchasesList) {
      const nextId = purchasesList.length + 1;
      setPurchaseNo(`PUR-${nextId}`);
    }
  }, [purchasesList]);

  const handleAddItemRow = () => {
    const newId = (Math.max(...items.map(i => parseInt(i.id) || 0), 0) + 1).toString();
    setItems([...items, { id: newId, materialId: '', category: 'General', hsnCode: '5609', quantity: 0, unit: 'pcs', rate: 0, gstPercent: 5 }]);
  };

  const handleUpdateItemRow = (id: string, updates: Partial<PurchaseRow>) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        // If materialId changes, check if it matches an existing raw material to autofill
        if (updates.materialId) {
          const match = rawMaterialsList.find(m => m.name.toLowerCase() === updates.materialId?.toLowerCase());
          if (match) {
            updated.category = match.category;
            updated.unit = match.unit;
            updated.rate = match.unitCost;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const handleSelectMaterial = (selected: any, rowId: string) => {
    handleUpdateItemRow(rowId, {
      materialId: selected.name,
      category: selected.category,
      unit: selected.unit,
      rate: selected.unitCost
    });
  };

  const handleDeleteItemRow = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  // Calculations
  const calculateRowTotal = (row: PurchaseRow) => {
    const qty = Number(row.quantity) || 0;
    const rate = Number(row.rate) || 0;
    const gstPct = Number(row.gstPercent) || 0;
    const sub = qty * rate;
    const gst = sub * gstPct / 100;
    return sub + gst;
  };

  const subtotal = items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.rate) || 0)), 0);
  const gstAmount = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const gstPct = Number(item.gstPercent) || 0;
    return sum + (qty * rate * gstPct / 100);
  }, 0);
  const grandTotal = subtotal + gstAmount;
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      toast.error('Vendor Name is required');
      return;
    }
    const invalidItem = items.some(i => !i.materialId.trim() || i.quantity <= 0 || i.rate <= 0);
    if (invalidItem) {
      toast.error('Please fill in material description, valid quantity, and rate for all items');
      return;
    }

    const payloadItems = items.map(i => ({
      materialId: i.materialId,
      quantity: Number(i.quantity),
      unit: i.unit,
      rate: Number(i.rate),
      gstPercent: Number(i.gstPercent),
      amount: calculateRowTotal(i)
    }));

    savePurchase({
      purchaseNumber: purchaseNo,
      vendorName,
      vendorMobile,
      vendorGstNumber: vendorGst,
      vendorAddress,
      items: payloadItems,
      totalAmount: grandTotal,
      paidAmount: paidAmount
    }, {
      onSuccess: () => {
        toast.success(`Purchase ${purchaseNo} saved successfully!`);
        // Reset form
        setVendorName('');
        setVendorMobile('');
        setVendorGst('');
        setVendorAddress('');
        setPaidAmount(0);
        setItems([{ id: '1', materialId: '', category: 'General', hsnCode: '5609', quantity: 0, unit: 'pcs', rate: 0, gstPercent: 5 }]);
      },
      onError: (err) => {
        toast.error(`Failed to save purchase: ${err.message}`);
      }
    });
  };

  const handleDelete = (id: bigint, purchaseNum: string) => {
    if (window.confirm(`Are you sure you want to delete purchase ${purchaseNum}? Raw material stocks will be reverted.`)) {
      deletePurchase(id, {
        onSuccess: () => {
          toast.success(`Purchase ${purchaseNum} deleted successfully`);
          if (selectedPurchase?.id === id) {
            setSelectedPurchase(null);
          }
        },
        onError: (err) => {
          toast.error(`Delete failed: ${err.message}`);
        }
      });
    }
  };

  // Sort purchases list by date descending (most recent first)
  const sortedPurchases = [...purchasesList].sort((a, b) => {
    const timeA = typeof a.date === 'bigint' ? Number(a.date) : Number(a.date || 0);
    const timeB = typeof b.date === 'bigint' ? Number(b.date) : Number(b.date || 0);
    return timeB - timeA;
  });

  const filteredPurchases = sortedPurchases.filter(p =>
    p.purchaseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedPurchases = filteredPurchases.slice(0, 8);

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

  const selectedVendorInfo = vendorsList.find(
    v => v.name.trim().toLowerCase() === vendorName.trim().toLowerCase()
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-maroon">Purchase Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Record raw material purchase bills, update inventory, and manage supplier outstanding balances.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase Creation Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave}>
            <Card className="border-2 border-gold shadow-md">
              <CardHeader className="bg-amber-50/40 dark:bg-gray-900/50 border-b border-gold/30">
                <CardTitle className="text-maroon text-lg flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-saffron" /> Record Purchase Entry
                </CardTitle>
                <CardDescription>Enter details from the supplier's raw material invoice.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Vendor details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchaseNo" className="text-maroon font-semibold">Purchase/Bill Number</Label>
                    <Input
                      id="purchaseNo"
                      value={purchaseNo}
                      onChange={(e) => setPurchaseNo(e.target.value)}
                      placeholder="e.g. PUR-01"
                      className="border-gold focus:ring-saffron"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendorName" className="text-maroon font-semibold">Vendor/Supplier Name</Label>
                    <SmartDetailDropdown
                      id="vendorName"
                      value={vendorName}
                      onChange={setVendorName}
                      onSelect={handleSelectVendorName}
                      items={(() => {
                        const filtered = vendorsList.filter(v => 
                          v.name.toLowerCase().includes(vendorName.toLowerCase())
                        );
                        return filtered.map(v => {
                          const payable = getVendorOutstandingAmount(v.name);
                          return {
                            id: v.name,
                            title: v.name,
                            subtitle: payable > 0 ? (
                              <span className="text-[10px] px-2 py-0.5 rounded font-bold border bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900 flex-shrink-0">
                                Payable: {formatCurrency(payable)}
                              </span>
                            ) : undefined,
                            details: [
                              { label: 'City', value: extractCity(v.businessAddress) }
                            ],
                            rawData: v
                          };
                        });
                      })()}
                      placeholder="Enter supplier name"
                      required
                    />
                  </div>

                  {selectedVendorInfo && (
                    <div className="md:col-span-2 bg-[#F8F4E8] border-2 border-[#D4A017] rounded-xl p-4 shadow-md space-y-2.5 animate-in fade-in duration-200 text-xs">
                      <div className="flex justify-between items-center border-b border-[#C89B3C]/30 pb-2">
                        <span className="font-serif font-black text-sm text-[#7A0019]">Supplier Record: {selectedVendorInfo.name}</span>
                        {getVendorOutstandingAmount(selectedVendorInfo.name) > 0 ? (
                          <span className="bg-amber-50 border border-amber-200 text-amber-700 font-bold px-2 py-0.5 rounded text-[10px] dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50">
                            Liability: {formatCurrency(getVendorOutstandingAmount(selectedVendorInfo.name))}
                          </span>
                        ) : (
                          <span className="bg-green-50 border border-green-200 text-green-700 font-bold px-2 py-0.5 rounded text-[10px] dark:bg-green-950/40 dark:text-green-400 dark:border-[#D4A017]/50">
                            Cleared
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[#3A1F12] font-semibold">
                        <div>
                          <span className="text-slate-500 font-medium block">Phone / Mobile</span>
                          <span>{selectedVendorInfo.phone || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium block">GSTIN</span>
                          <span className="font-mono">{selectedVendorInfo.gstNo || 'N/A'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 font-medium block">Supplier Address</span>
                          <span>{selectedVendorInfo.businessAddress || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="vendorMobile" className="text-maroon font-semibold">Vendor Mobile</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="vendorMobile"
                        value={vendorMobile}
                        onChange={(e) => setVendorMobile(e.target.value)}
                        placeholder="10-digit number"
                        className="border-gold focus:ring-saffron pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 font-mono">
                    <Label htmlFor="vendorGst" className="text-maroon font-semibold">Vendor GSTIN</Label>
                    <Input
                      id="vendorGst"
                      value={vendorGst}
                      onChange={(e) => setVendorGst(e.target.value.toUpperCase())}
                      placeholder="15-character GSTIN"
                      maxLength={15}
                      className="border-gold focus:ring-saffron uppercase font-bold"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="vendorAddress" className="text-maroon font-semibold">Vendor Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="vendorAddress"
                        value={vendorAddress}
                        onChange={(e) => setVendorAddress(e.target.value)}
                        placeholder="Supplier business address"
                        className="border-gold focus:ring-saffron pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-gold/30 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-amber-50/30 dark:bg-gray-900/30 border-b border-gold/20">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-maroon font-bold w-1/3">Raw Material Name</TableHead>
                        <TableHead className="text-maroon font-bold text-center w-24">Quantity</TableHead>
                        <TableHead className="text-maroon font-bold text-center w-20">Unit</TableHead>
                        <TableHead className="text-maroon font-bold text-right w-28">Rate (₹)</TableHead>
                        <TableHead className="text-maroon font-bold text-center w-24">GST %</TableHead>
                        <TableHead className="text-maroon font-bold text-right w-28">Total (₹)</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((row) => (
                        <TableRow key={row.id} className="border-b border-slate-100 dark:border-gray-800 last:border-b-0">
                          <TableCell className="p-2">
                            <SmartDetailDropdown
                              id={`material-${row.id}`}
                              value={row.materialId}
                              onChange={(val) => handleUpdateItemRow(row.id, { materialId: val })}
                              onSelect={(selected) => handleSelectMaterial(selected, row.id)}
                              items={(() => {
                                const filtered = rawMaterialsList.filter(m => 
                                  m.name.toLowerCase().includes(row.materialId.toLowerCase())
                                );
                                return filtered.map(m => ({
                                  id: m.id,
                                  title: m.name,
                                  details: [
                                    { label: 'Unit', value: m.unit },
                                    { label: 'Current Stock', value: m.currentStock.toString() },
                                    { label: 'Purchase Rate', value: formatCurrency(m.unitCost) }
                                  ],
                                  rawData: m
                                }));
                              })()}
                              placeholder="e.g. Beads, Thread"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              type="number"
                              min="0.01"
                              step="any"
                              value={row.quantity || ''}
                              onChange={(e) => handleUpdateItemRow(row.id, { quantity: parseFloat(e.target.value) || 0 })}
                              className="text-center border-gold/40 focus:ring-saffron h-9 text-xs"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              value={row.unit}
                              onChange={(e) => handleUpdateItemRow(row.id, { unit: e.target.value })}
                              placeholder="pcs"
                              className="text-center border-gold/40 focus:ring-saffron h-9 text-xs"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.rate || ''}
                              onChange={(e) => handleUpdateItemRow(row.id, { rate: parseFloat(e.target.value) || 0 })}
                              className="text-right border-gold/40 focus:ring-saffron h-9 text-xs font-semibold"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={row.gstPercent || ''}
                              onChange={(e) => handleUpdateItemRow(row.id, { gstPercent: parseFloat(e.target.value) || 0 })}
                              className="text-center border-gold/40 focus:ring-saffron h-9 text-xs"
                            />
                          </TableCell>
                          <TableCell className="p-2 text-right text-xs font-bold text-maroon">
                            {formatCurrency(calculateRowTotal(row))}
                          </TableCell>
                          <TableCell className="p-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItemRow(row.id)}
                              className="text-slate-400 hover:text-red-500 h-8 w-8"
                              disabled={items.length <= 1}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleAddItemRow}
                    className="border-gold text-maroon hover:bg-gold/10 font-semibold"
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Add Material Row
                  </Button>
                </div>

                {/* Calculation breakdown card */}
                <div className="bg-amber-50/20 dark:bg-gray-900/30 p-4 border border-gold/30 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3 justify-center flex flex-col">
                    <div className="space-y-1.5">
                      <Label htmlFor="paidAmount" className="text-maroon font-bold text-xs uppercase tracking-wider">Paid Amount (₹)</Label>
                      <Input
                        id="paidAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={paidAmount || ''}
                        onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="border-gold focus:ring-saffron max-w-xs font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 border-t md:border-t-0 md:border-l border-gold/20 pt-4 md:pt-0 md:pl-6 text-sm font-semibold">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal (Excl. GST):</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Input GST Credits:</span>
                      <span>{formatCurrency(gstAmount)}</span>
                    </div>
                    <div className="flex justify-between text-maroon text-base border-t border-gold/10 pt-2 font-bold">
                      <span>Grand Total:</span>
                      <span>{formatCurrency(grandTotal)}</span>
                    </div>
                    <div className="flex justify-between text-red-500 font-bold border-t border-gold/10 pt-1">
                      <span>Outstanding Due:</span>
                      <span>{formatCurrency(dueAmount)}</span>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-maroon to-saffron hover:from-maroon/90 hover:to-saffron/90 text-white font-bold tracking-wide py-6 text-base"
                  disabled={isSaving}
                >
                  <Save className="h-5 w-5 mr-2" />
                  {isSaving ? 'Saving Purchase Entry...' : 'Save Purchase Invoice'}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Purchase History Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-2 border-gold shadow-md">
            <CardHeader className="bg-amber-50/40 dark:bg-gray-900/50 border-b border-gold/30 py-4">
              <CardTitle className="text-maroon text-lg flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-saffron" /> Purchase Logs
                </div>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => navigate({ to: '/finance/purchase-invoices' })}
                  className="text-saffron hover:text-maroon p-0 font-semibold text-xs flex items-center gap-1 h-auto"
                >
                  View Full History &rarr;
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center border border-gold/30 rounded-md bg-white dark:bg-gray-800 px-3 py-1 text-xs">
                <Search className="h-4 w-4 text-slate-400 mr-1.5 flex-shrink-0" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by Supplier or Bill No..."
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 bg-transparent w-full h-8"
                />
              </div>

              {loadingPurchases ? (
                <div className="text-center py-6 text-xs text-slate-500">Loading purchases...</div>
              ) : displayedPurchases.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">No purchases found.</div>
              ) : (
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {displayedPurchases.map((p) => {
                    const date = formatSafeDate(p);
                    const due = p.totalAmount - p.paidAmount;
                    return (
                      <div 
                        key={p.id.toString()}
                        onClick={() => setSelectedPurchase(selectedPurchase?.id === p.id ? null : p)}
                        className={`p-3 border rounded-lg cursor-pointer hover:border-maroon/60 transition-all text-xs font-semibold ${
                          selectedPurchase?.id === p.id 
                            ? 'border-maroon bg-amber-50/20 dark:bg-gray-900/40 shadow-sm' 
                            : 'border-gold/30'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{p.purchaseNumber}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {date}
                          </span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 mt-1 truncate">
                          Supplier: <strong className="text-maroon">{p.vendorName}</strong>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-gray-800">
                          <div>
                            <span className="text-slate-400">Amt:</span> {formatCurrency(p.totalAmount)}
                          </div>
                          <div>
                            {due <= 0 ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-300">Paid</Badge>
                            ) : p.paidAmount > 0 ? (
                              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-300">Partial</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-300">Unpaid</Badge>
                            )}
                          </div>
                        </div>

                        {selectedPurchase?.id === p.id && (
                          <div className="mt-3 pt-3 border-t border-gold/20 space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
                            {p.vendorMobile && <p>📞 Phone: {p.vendorMobile}</p>}
                            {p.vendorGstNumber && <p>GST: {p.vendorGstNumber}</p>}
                            {p.vendorAddress && <p>📍 Address: {p.vendorAddress}</p>}
                            <div className="mt-2 bg-white dark:bg-gray-900 p-2 rounded border border-gold/10">
                              <p className="font-bold text-maroon text-[10px] uppercase mb-1">Raw Materials Invoiced:</p>
                              {p.items.map((it: any, index: number) => (
                                <div key={index} className="flex justify-between border-b last:border-0 border-slate-100 dark:border-gray-800 py-1">
                                  <span>{it.materialId} ({it.quantity} {it.unit})</span>
                                  <span className="font-mono">{formatCurrency(it.amount)}</span>
                                </div>
                              ))}
                            </div>
                            {canDelete && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(p.id, p.purchaseNumber);
                                }}
                                className="w-full mt-2 text-xs py-1 h-8"
                              >
                                Delete Purchase Entry
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Purchases;
