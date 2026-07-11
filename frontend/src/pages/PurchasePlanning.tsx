import { useState, useMemo } from 'react';
import { 
  usePurchaseRequirements, 
  useSavePurchaseRequirement, 
  useRawMaterials, 
  usePurchaseOrders, 
  useSavePurchaseOrder, 
  useDeletePurchaseOrder, 
  useGRNs, 
  useReceivePOItem,
  useVendors,
  usePurchases
} from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../components/AuthGuard';
import { ShoppingBag, CheckCircle, PackageOpen, Search, Clock, ShieldAlert, Truck, XCircle, Plus, FileText, ClipboardCheck, ArrowUpRight, Ban, Send, Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../utils/currencyFormat';
import { formatERPDate } from '../utils/calculations';
import { formatSafeDate } from '../utils/masterData';

const PurchasePlanning = () => {
  const { user } = useAuth();
  
  // Queries & Mutations
  const { data: requirements = [], isLoading: loadingReqs } = usePurchaseRequirements();
  const { mutate: saveReq } = useSavePurchaseRequirement();
  
  const { data: purchaseOrders = [], isLoading: loadingPOs } = usePurchaseOrders();
  const { mutate: savePO } = useSavePurchaseOrder();
  const { mutate: deletePO } = useDeletePurchaseOrder();
  
  const { data: grns = [], isLoading: loadingGRNs } = useGRNs();
  const { mutate: receivePO, isPending: isReceivingPO } = useReceivePOItem();

  const { data: allRawMaterials = [] } = useRawMaterials();
  const { data: purchasesList = [] } = usePurchases();

  const roleName = user?.role && 'Admin' in user.role ? 'Admin' : (user?.role && 'Manager' in user.role ? 'Manager' : 'Staff');
  const isReadOnly = roleName === 'Staff';

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [poFilter, setPoFilter] = useState('All');

  // Unified Submitting State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create PO Modal State
  const [poModalReq, setPoModalReq] = useState<any | null>(null);
  const [poVendor, setPoVendor] = useState('');
  const [poRate, setPoRate] = useState<number>(0);
  const [poQty, setPoQty] = useState<number>(0);
  const [poGst, setPoGst] = useState<number>(18);
  const [poStatus, setPoStatus] = useState<"Draft" | "Approved">("Draft");

  // Receive PO (GRN) Modal State
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [receivedPOQty, setReceivedPOQty] = useState<number>(0);
  const [invoiceNoInput, setInvoiceNoInput] = useState('');
  const [expiryDateInput, setExpiryDateInput] = useState('');
  const [remarksInput, setRemarksInput] = useState('');

  const getMaterialUnit = (req: any) => {
    if (!req) return 'pcs';
    const rawMaterial = allRawMaterials.find(m => m.id === req.materialId || m.name === req.materialName);
    return rawMaterial?.unit || (rawMaterial as any)?.unitLabel || (rawMaterial as any)?.stockUnit || (rawMaterial as any)?.measurementUnit || req.unit || 'pcs';
  };

  // Dynamically query vendor names from Vendor master data
  const { data: vendorsList = [] } = useVendors();
  const vendorOptions = useMemo(() => {
    const list = vendorsList.map((v: any) => v.name);
    if (!list.includes("General Vendor")) {
      list.unshift("General Vendor");
    }
    return list;
  }, [vendorsList]);

  const selectedVendorDetails = useMemo(() => {
    return vendorsList.find((v: any) => v.name === poVendor);
  }, [vendorsList, poVendor]);

  const vendorOutstanding = useMemo(() => {
    if (!poVendor) return 0;
    const openingBal = Number(selectedVendorDetails?.openingBalance) || 0;
    const vendorPurchases = purchasesList.filter((p: any) =>
      p.vendorName.trim().toLowerCase() === poVendor.trim().toLowerCase()
    );
    const totalPurchasesAmount = vendorPurchases.reduce((sum: number, p: any) => sum + p.totalAmount, 0);
    const totalPaidPurchases = vendorPurchases.reduce((sum: number, p: any) => sum + p.paidAmount, 0);
    return Math.max(0, openingBal + totalPurchasesAmount - totalPaidPurchases);
  }, [poVendor, selectedVendorDetails, purchasesList]);

  // Requirements Handlers
  const handleOpenCreatePOModal = (req: any) => {
    if (isReadOnly) {
      toast.error("Read-only access: Staff cannot create purchase orders");
      return;
    }
    const rawMat = allRawMaterials.find(m => m.id === req.materialId || m.name === req.materialName);
    const defaultVendor = req.vendorId || rawMat?.preferredVendor || 'General Vendor';
    const resolvedRate = rawMat?.unitCost || (rawMat as any)?.lastPurchaseRate || 0;

    setPoModalReq(req);
    setPoVendor(defaultVendor);
    setPoQty(req.shortageQty);
    setPoRate(resolvedRate);
    setPoGst(18);
    setPoStatus("Draft");
  };

  const handleCreatePurchaseOrderSubmit = () => {
    if (!poVendor.trim()) {
      toast.error("Please enter or select a vendor");
      return;
    }
    if (poQty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (poRate <= 0) {
      toast.error("Please enter a valid rate");
      return;
    }

    const nextPONo = `PO-${Math.floor(10000 + Math.random() * 90000)}`;
    const subtotal = poQty * poRate;
    const gstAmt = subtotal * (poGst / 100);
    const grandTotal = subtotal + gstAmt;

    const newPO = {
      id: `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      poNumber: nextPONo,
      mrpId: poModalReq.mrpId || "",
      materialId: poModalReq.materialId,
      materialName: poModalReq.materialName,
      requiredQty: poModalReq.shortageQty,
      orderedQty: poQty,
      unit: getMaterialUnit(poModalReq),
      rate: poRate,
      gstPercent: poGst,
      totalAmount: grandTotal,
      vendorId: poVendor,
      status: poStatus,
      createdAt: new Date().toISOString(),
      purchaseRequirementId: poModalReq.id
    };

    savePO(newPO as any, {
      onSuccess: () => {
        toast.success(`Purchase Order ${nextPONo} created successfully in status: ${poStatus}!`);
        
        if (poStatus === "Approved") {
          const updatedReq = {
            ...poModalReq,
            status: 'Ordered'
          };
          saveReq(updatedReq);
        }

        setPoModalReq(null);
      },
      onError: (err: any) => {
        toast.error(`Failed to create PO: ${err.message}`);
      }
    });
  };

  // PO State Handlers
  const handleApprovePO = (po: any) => {
    const updated = {
      ...po,
      status: 'Approved',
      approvedAt: new Date().toISOString(),
      approvedBy: user?.name || 'System'
    };
    savePO(updated, {
      onSuccess: () => {
        toast.success(`Purchase Order ${po.poNumber} has been Approved!`);
      }
    });
  };

  const handleCancelPO = (po: any) => {
    if (window.confirm(`Are you sure you want to cancel Purchase Order ${po.poNumber}?`)) {
      const updated = {
        ...po,
        status: 'Cancelled'
      };
      savePO(updated, {
        onSuccess: () => {
          toast.success(`Purchase Order ${po.poNumber} has been Cancelled!`);
        }
      });
    }
  };

  const handleSendPO = (po: any) => {
    const updated = {
      ...po,
      status: 'Sent'
    };
    savePO(updated, {
      onSuccess: () => {
        toast.success(`Purchase Order ${po.poNumber} status updated to Sent!`);
      }
    });
  };

  const handleDeletePO = (id: string) => {
    if (window.confirm("Are you sure you want to delete this Purchase Order?")) {
      deletePO(id, {
        onSuccess: () => {
          toast.success("Purchase Order deleted.");
        }
      });
    }
  };

  // GRN Receipt Handlers
  const handleOpenReceivePOModal = (po: any) => {
    const totalReceivedPO = po.receiptHistory?.reduce((sum: number, h: any) => sum + h.qty, 0) || 0;
    const remainingPO = Math.max(0, po.orderedQty - totalReceivedPO);

    setSelectedPO(po);
    setReceivedPOQty(remainingPO);
    setInvoiceNoInput(`PI-${Math.floor(10000 + Math.random() * 90000)}`);
    setExpiryDateInput('');
    setRemarksInput('');
  };

  const handleReceivePOItemSubmit = () => {
    if (receivedPOQty <= 0) {
      toast.error("Please enter a valid received quantity");
      return;
    }
    if (!invoiceNoInput.trim()) {
      toast.error("Please enter the Supplier Invoice Number");
      return;
    }

    setIsSubmitting(true);
    receivePO({
      poId: selectedPO.id,
      qty: receivedPOQty,
      invoiceNo: invoiceNoInput.trim(),
      expiryDate: expiryDateInput || undefined,
      remarks: remarksInput.trim() || undefined
    }, {
      onSuccess: () => {
        toast.success(`Goods received successfully! GRN recorded & Purchase Invoice ${invoiceNoInput} generated.`);
        setSelectedPO(null);
      },
      onError: (err: any) => {
        toast.error(`Receipt confirmation failed: ${err.message}`);
      },
      onSettled: () => {
        setIsSubmitting(false);
      }
    });
  };

  // WhatsApp Alert helper
  const handleSendWhatsAppShortageAlert = (req: any) => {
    const settingsStored = localStorage.getItem('mock_settings');
    const settings = settingsStored ? JSON.parse(settingsStored) : {};
    const whatsappRaw = settings?.whatsappAlertNumbers || '';
    const defaultRecipient = whatsappRaw ? whatsappRaw.split(',')[0].trim() : '91';

    const message = `🚨 Gujarat Art & Craft ERP Raw Material Purchase Shortage Alert\n\n` +
                    `Material: ${req.materialName}\n` +
                    `Required Purchase: ${req.shortageQty} ${getMaterialUnit(req)}\n` +
                    `MRP Plan Ref: ${req.mrpId}\n` +
                    `Preferred Vendor: ${req.vendorId || 'Default Vendor'}\n\n` +
                    `Please supply the required materials to execute the production run.\n\n` +
                    `- Gujarat Art & Craft ERP`;

    const cleanNum = defaultRecipient.replace(/\D/g, "");
    const formattedNum = cleanNum.length === 10 ? "91" + cleanNum : cleanNum;

    const url = `https://wa.me/${formattedNum}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    toast.success("Opened WhatsApp draft for material shortage!");
  };

  const getStatusBadgeColor = (s: string) => {
    switch (s) {
      case 'Pending':
      case 'Draft': return 'bg-yellow-100 text-yellow-805 border-yellow-200';
      case 'Sent': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Ordered':
      case 'Approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Partial': return 'bg-orange-100 text-orange-850 border-orange-200';
      case 'Received':
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-150 text-gray-800';
    }
  };

  // Filtering
  const filteredReqs = requirements.filter(r => {
    const matchesSearch = r.materialName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.mrpId.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesStatus = false;
    if (statusFilter === 'All') {
      matchesStatus = true;
    } else if (statusFilter === 'Partial') {
      matchesStatus = r.status === 'Partial' || r.status === 'Partially Received';
    } else if (statusFilter === 'Completed') {
      matchesStatus = r.status === 'Completed' || r.status === 'Received';
    } else {
      matchesStatus = r.status === statusFilter;
    }
    return matchesSearch && matchesStatus;
  });

  const filteredPOs = (purchaseOrders || []).filter(po => {
    const matchesSearch = po.materialName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          po.vendorId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = poFilter === 'All' || po.status === poFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-maroon flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-saffron" />
            <span>Enterprise Purchase Planning</span>
          </h1>
          <p className="text-sm text-slate-500">Create purchase orders from shortages, log goods receipts (GRNs), and track supplier invoices.</p>
        </div>
      </div>

      <Tabs defaultValue="requirements" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg gap-2 mb-6">
          <TabsTrigger value="requirements" className="font-bold text-xs py-2 px-4 rounded-md data-[state=active]:bg-white data-[state=active]:text-maroon dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-saffron">
            Shortage Requirements
            {requirements.filter((r: any) => r.status === 'Pending').length > 0 && (
              <Badge className="ml-2 bg-red-100 text-red-800 border-none text-[10px] py-0 px-1.5 font-bold">
                {requirements.filter((r: any) => r.status === 'Pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders" className="font-bold text-xs py-2 px-4 rounded-md data-[state=active]:bg-white data-[state=active]:text-maroon dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-saffron">
            Purchase Orders (POs)
            {purchaseOrders.filter((po: any) => po.status === 'Draft' || po.status === 'Sent').length > 0 && (
              <Badge className="ml-2 bg-blue-100 text-blue-800 border-none text-[10px] py-0 px-1.5 font-bold">
                {purchaseOrders.filter((po: any) => po.status === 'Draft' || po.status === 'Sent').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="grn" className="font-bold text-xs py-2 px-4 rounded-md data-[state=active]:bg-white data-[state=active]:text-maroon dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-saffron">
            GRN History Log
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Shortage Requirements */}
        <TabsContent value="requirements">
          <Card className="border-2 border-saffron/20 shadow-md">
            <CardHeader className="bg-slate-50/50 p-4 border-b border-saffron/10 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">Shortage Purchase Requirements</CardTitle>
                <CardDescription className="text-xs">Automatically generated when raw material shortages exist during production calculations</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search raw material or plan..."
                    className="pl-8 text-xs h-9 w-60 border-slate-200"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className="text-xs border border-slate-200 rounded-md px-3 h-9 bg-white"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Ordered">Ordered</option>
                  <option value="Partial">Partial</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingReqs ? (
                <div className="text-center py-10 text-slate-500 text-xs">Loading requirements...</div>
              ) : filteredReqs.length === 0 ? (
                <div className="text-center py-10 text-slate-455 text-xs">No purchase planning requirements generated.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70">
                      <TableHead className="font-bold text-xs text-slate-700">Raw Material</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-right">Required Qty</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-right">Available Qty</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-right text-red-650">Shortage Qty</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Preferred Vendor</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Status</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReqs.map(req => (
                      <TableRow key={req.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-semibold text-xs text-slate-800">
                          <div>{req.materialName}</div>
                          <div className="text-[10px] text-slate-450 mt-0.5">MRP Reference: {req.mrpId}</div>
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          <div>{req.requiredQty} {getMaterialUnit(req)}</div>
                          {((req as any).completedQty || 0) > 0 && (
                            <div className="text-[10px] text-slate-500 mt-0.5 font-bold">Recv: {(req as any).completedQty} {getMaterialUnit(req)}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold text-green-700">{req.availableQty} {getMaterialUnit(req)}</TableCell>
                        <TableCell className="text-xs text-right font-bold text-red-650 bg-red-50/10">{req.shortageQty} {getMaterialUnit(req)}</TableCell>
                        <TableCell className="text-xs font-semibold text-slate-700">{req.vendorId || 'Default Vendor'}</TableCell>
                        <TableCell className="text-xs">
                          <Badge className={`text-[10px] px-2 py-0.5 border ${getStatusBadgeColor(req.status)}`}>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1.5 justify-end">
                            {((req as any).receiptHistory && (req as any).receiptHistory.length > 0) ? (
                              <div className="flex flex-col items-end gap-1 mb-1">
                                {(req as any).receiptHistory.map((hist: any, hIdx: number) => (
                                  <span key={hIdx} className="text-[9px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    PI: {hist.invoiceNo} ({hist.qty} {getMaterialUnit(req)})
                                  </span>
                                ))}
                              </div>
                            ) : (req as any).purchaseInvoiceNo && (
                              <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mr-1">
                                Invoice: {(req as any).purchaseInvoiceNo}
                              </span>
                            )}
                            <div className="flex justify-end items-center gap-1.5">
                              {req.status === 'Pending' && !isReadOnly && (
                                <>
                                  <Button
                                    size="sm"
                                    className="h-7 text-[10px] px-2 bg-maroon hover:bg-maroon/90 text-white font-bold"
                                    onClick={() => handleOpenCreatePOModal(req)}
                                  >
                                    <Plus className="h-3 w-3 mr-0.5" /> Create PO
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[10px] px-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 font-bold"
                                    onClick={() => handleSendWhatsAppShortageAlert(req)}
                                  >
                                    WhatsApp
                                  </Button>
                                </>
                              )}
                              {(req.status === 'Ordered' || req.status === 'Partially Received' || req.status === 'Partial') && !isReadOnly && (
                                <span className="text-xs text-slate-505 italic">PO Created</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Purchase Orders */}
        <TabsContent value="orders">
          <Card className="border-2 border-gold/30 shadow-md">
            <CardHeader className="bg-slate-50/50 p-4 border-b border-gold/10 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">Purchase Orders Registry</CardTitle>
                <CardDescription className="text-xs">Manage commercial purchase drafts, send orders to vendors, and authorize stock arrivals</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search PO number or material..."
                    className="pl-8 text-xs h-9 w-60 border-slate-200"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className="text-xs border border-slate-200 rounded-md px-3 h-9 bg-white"
                  value={poFilter}
                  onChange={(e) => setPoFilter(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Approved">Approved</option>
                  <option value="Partial">Partial</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPOs ? (
                <div className="text-center py-10 text-slate-500 text-xs">Loading Purchase Orders...</div>
              ) : filteredPOs.length === 0 ? (
                <div className="text-center py-10 text-slate-455 text-xs">No Purchase Orders found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70">
                      <TableHead className="font-bold text-xs text-slate-700">PO Number</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Date</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Material Description</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-right">Ordered Qty</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-right">Rate</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-right">Grand Total</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Supplier</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Status</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPOs.map((po: any) => {
                      const totalReceived = po.receiptHistory?.reduce((sum: number, h: any) => sum + h.qty, 0) || 0;
                      return (
                        <TableRow key={po.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-bold text-xs font-mono">{po.poNumber}</TableCell>
                          <TableCell className="text-xs text-slate-650">{formatSafeDate(po)}</TableCell>
                          <TableCell className="font-semibold text-xs text-slate-800">
                            <div>{po.materialName}</div>
                            {po.mrpId && <div className="text-[10px] text-slate-450 mt-0.5">MRP Ref: {po.mrpId}</div>}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            <span className="font-bold text-slate-800">{po.orderedQty} {po.unit}</span>
                            {totalReceived > 0 && (
                              <div className="text-[9px] text-slate-550 font-semibold mt-0.5">Recv: {totalReceived} {po.unit}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium">{formatCurrency(po.rate)}</TableCell>
                          <TableCell className="text-xs text-right font-bold text-maroon">{formatCurrency(po.totalAmount)}</TableCell>
                          <TableCell className="text-xs font-semibold text-slate-700">{po.vendorId}</TableCell>
                          <TableCell className="text-xs">
                            <Badge className={`text-[10px] px-2 py-0.5 border ${getStatusBadgeColor(po.status)}`}>
                              {po.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1.5 justify-end">
                              {po.receiptHistory && po.receiptHistory.length > 0 && (
                                <div className="flex flex-col items-end gap-0.5 mb-1.5">
                                  {po.receiptHistory.map((hist: any, hIdx: number) => (
                                    <span key={hIdx} className="text-[9px] text-slate-500 font-bold bg-slate-50 border border-slate-200 px-1.5 py-0.2 rounded font-mono">
                                      GRN: {hist.grnNo} / Invoice: {hist.invoiceNo} (+{hist.qty})
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex justify-end items-center gap-1.5">
                                {po.status === 'Draft' && !isReadOnly && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[10px] px-2 text-purple-700 border-purple-200 hover:bg-purple-50 font-bold"
                                      onClick={() => handleSendPO(po)}
                                    >
                                      <Send className="h-3 w-3 mr-0.5" /> Send
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-7 text-[10px] px-2 bg-green-600 hover:bg-green-700 text-white font-bold"
                                      onClick={() => handleApprovePO(po)}
                                    >
                                      <Check className="h-3 w-3 mr-0.5" /> Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-[10px] px-2 text-red-500 hover:bg-red-50 font-bold"
                                      onClick={() => handleDeletePO(po.id)}
                                    >
                                      Delete
                                    </Button>
                                  </>
                                )}
                                {po.status === 'Sent' && !isReadOnly && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="h-7 text-[10px] px-2 bg-green-600 hover:bg-green-700 text-white font-bold"
                                      onClick={() => handleApprovePO(po)}
                                    >
                                      <Check className="h-3 w-3 mr-0.5" /> Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[10px] px-2 text-red-650 border-red-200 hover:bg-red-50 font-bold"
                                      onClick={() => handleCancelPO(po)}
                                    >
                                      <Ban className="h-3 w-3 mr-0.5" /> Cancel
                                    </Button>
                                  </>
                                )}
                                {(po.status === 'Approved' || po.status === 'Partial') && !isReadOnly && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="h-7 text-[10px] px-2 bg-green-600 hover:bg-green-700 text-white font-bold"
                                      onClick={() => handleOpenReceivePOModal(po)}
                                    >
                                      <PackageOpen className="h-3 w-3 mr-0.5" /> Log GRN
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[10px] px-2 text-red-650 border-red-200 hover:bg-red-50 font-bold"
                                      onClick={() => handleCancelPO(po)}
                                    >
                                      <Ban className="h-3 w-3 mr-0.5" /> Cancel
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: GRN History Log */}
        <TabsContent value="grn">
          <Card className="border-2 border-gold/30 shadow-md">
            <CardHeader className="bg-slate-50/50 p-4 border-b border-gold/10">
              <CardTitle className="text-sm font-bold text-slate-800">Goods Receipt Notes (GRN) History</CardTitle>
              <CardDescription className="text-xs">Full legal registry of raw materials delivered, inspected, and added to current inventory</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingGRNs ? (
                <div className="text-center py-10 text-slate-500 text-xs">Loading GRNs...</div>
              ) : grns.length === 0 ? (
                <div className="text-center py-10 text-slate-455 text-xs">No goods receipts registered yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70">
                      <TableHead className="font-bold text-xs text-slate-700">GRN No.</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Date Received</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 font-mono">PO Ref</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Material Invoiced</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-right">Received Qty</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Batch Assignment</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Expiry Date</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Recipient</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grns.map((grn: any) => (
                      <TableRow key={grn.grnNo} className="hover:bg-slate-50/50">
                        <TableCell className="font-bold text-xs font-mono text-slate-900">{grn.grnNo}</TableCell>
                        <TableCell className="text-xs">{formatSafeDate(grn)}</TableCell>
                        <TableCell className="text-xs font-mono font-bold text-slate-600">{grn.poNumber}</TableCell>
                        <TableCell className="text-xs font-semibold">
                          <div>{grn.items[0]?.materialName}</div>
                          {grn.invoiceNo && <div className="text-[10px] text-slate-450 mt-0.5">Invoice Ref: {grn.invoiceNo}</div>}
                        </TableCell>
                        <TableCell className="text-xs text-right font-black text-slate-800">{grn.items[0]?.quantity} {grn.items[0]?.unit}</TableCell>
                        <TableCell className="text-[10px] font-mono text-slate-650">{grn.items[0]?.batchNo || "N/A"}</TableCell>
                        <TableCell className="text-xs text-slate-700 font-medium">{grn.items[0]?.expiryDate ? grn.items[0].expiryDate : "None"}</TableCell>
                        <TableCell className="text-xs text-slate-500 font-semibold">{grn.receivedBy}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Purchase Order Modal */}
      {poModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#FDFBF7] dark:bg-slate-900 border-2 border-gold rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-maroon text-[#F8F2E8] p-4 flex justify-between items-center">
              <div>
                <h3 className="font-serif font-black text-sm text-[#F8F2E8] tracking-wide">Generate Purchase Order</h3>
                <p className="text-[10px] text-[#F8F2E8]/80 mt-0.5">Material: {poModalReq.materialName}</p>
              </div>
              <button 
                onClick={() => setPoModalReq(null)}
                className="text-[#F8F2E8]/80 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-350">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Shortage Outstanding</Label>
                  <div className="p-2 border bg-slate-50 rounded text-slate-850 font-black">
                    {poModalReq.shortageQty} {getMaterialUnit(poModalReq)}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">MRP Reference</Label>
                  <div className="p-2 border bg-slate-50 rounded text-slate-650 font-mono">
                    {poModalReq.mrpId || "N/A"}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="poVendorSelect" className="text-xs font-bold text-slate-800">Select Vendor</Label>
                <select
                  id="poVendorSelect"
                  className="w-full border border-slate-200 rounded px-2.5 h-9 bg-white text-slate-800"
                  value={poVendor}
                  onChange={(e) => setPoVendor(e.target.value)}
                >
                  {vendorOptions.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>

                {selectedVendorDetails && (
                  <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 rounded text-[11px] space-y-1.5">
                    <div className="grid grid-cols-2 gap-2 text-slate-650">
                      <div>
                        <span className="font-semibold block text-[9px] uppercase text-slate-400">Quality Rating</span>
                        <span className="font-bold text-amber-500">{"⭐".repeat(selectedVendorDetails.rating || 5)}</span>
                      </div>
                      <div>
                        <span className="font-semibold block text-[9px] uppercase text-slate-400">Credit Days / Terms</span>
                        <span className="font-bold text-slate-800">{selectedVendorDetails.creditDays || 30} Days</span>
                      </div>
                      <div>
                        <span className="font-semibold block text-[9px] uppercase text-slate-400">Credit Limit</span>
                        <span className="font-bold text-slate-800">{formatCurrency(selectedVendorDetails.creditLimit || 100000)}</span>
                      </div>
                      <div>
                        <span className="font-semibold block text-[9px] uppercase text-slate-400">Live Outstanding</span>
                        <span className={`font-bold ${vendorOutstanding > 0 ? 'text-red-500' : 'text-slate-600'}`}>
                          {formatCurrency(vendorOutstanding)}
                        </span>
                      </div>
                    </div>

                    {/* Credit Limit & Rating Warnings */}
                    {vendorOutstanding + (poQty * poRate) > (selectedVendorDetails.creditLimit || 100000) && (
                      <div className="p-1.5 bg-red-50 text-red-700 border border-red-200 rounded font-semibold text-[10px] flex items-center gap-1">
                        ⚠️ Warning: Order value exceeds Credit Limit of {formatCurrency(selectedVendorDetails.creditLimit || 100000)}!
                      </div>
                    )}
                    {(selectedVendorDetails.rating || 5) <= 3 && (
                      <div className="p-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-semibold text-[10px] flex items-center gap-1">
                        ⚠️ Alert: This vendor has a low quality rating ({selectedVendorDetails.rating || 5}/5 Stars).
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="poQtyInput" className="text-xs font-bold text-slate-800">Order Quantity</Label>
                  <Input
                    id="poQtyInput"
                    type="number"
                    min="1"
                    className="border-slate-200 h-9"
                    value={poQty || ''}
                    onChange={(e) => setPoQty(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="poRateInput" className="text-xs font-bold text-slate-800">Purchase Rate (Excl. GST)</Label>
                  <Input
                    id="poRateInput"
                    type="number"
                    min="0"
                    step="0.01"
                    className="border-slate-200 h-9 font-bold"
                    value={poRate || ''}
                    onChange={(e) => setPoRate(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="poGstInput" className="text-xs font-bold text-slate-800">GST Percent (%)</Label>
                  <Input
                    id="poGstInput"
                    type="number"
                    min="0"
                    className="border-slate-200 h-9"
                    value={poGst || ''}
                    onChange={(e) => setPoGst(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="poStatusSelect" className="text-xs font-bold text-slate-800">Initial PO State</Label>
                  <select
                    id="poStatusSelect"
                    className="w-full border border-slate-200 rounded px-2.5 h-9 bg-white text-slate-800"
                    value={poStatus}
                    onChange={(e) => setPoStatus(e.target.value as any)}
                  >
                    <option value="Draft">Draft Order</option>
                    <option value="Approved">Direct Approved</option>
                  </select>
                </div>
              </div>

              <div className="bg-amber-50/20 border border-gold/25 p-3.5 rounded-lg space-y-1.5 text-[11px] text-slate-650">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(poQty * poRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Amount ({poGst}%):</span>
                  <span>{formatCurrency(poQty * poRate * (poGst / 100))}</span>
                </div>
                <div className="flex justify-between border-t border-gold/15 pt-1.5 font-bold text-maroon text-xs">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(poQty * poRate * (1 + poGst / 100))}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#FDFBF7] p-4 border-t border-gold/10 flex justify-end gap-2">
              <Button
                variant="outline"
                className="text-xs h-9 border-gold text-[#7A0019]"
                onClick={() => setPoModalReq(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePurchaseOrderSubmit}
                className="bg-maroon hover:bg-maroon/90 text-white text-xs h-9 font-bold border border-gold/20"
              >
                Save Purchase Order
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Receive PO Item Modal (GRN Entry Modal) */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border-2 border-saffron/30 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-maroon text-[#F8F2E8] p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Goods Receipt Note (GRN): {selectedPO.poNumber}</h3>
                <p className="text-[10px] text-[#F8F2E8]/80 mt-0.5">Supplier: {selectedPO.vendorId} / Material: {selectedPO.materialName}</p>
              </div>
              <button 
                onClick={() => setSelectedPO(null)}
                className="text-[#F8F2E8]/80 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-350">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Ordered Quantity:</span>
                  <strong className="text-xs text-slate-800 dark:text-white block">{selectedPO.orderedQty} {selectedPO.unit}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Receipt Mode:</span>
                  {receivedPOQty >= selectedPO.orderedQty ? (
                    <Badge className="bg-green-100 text-green-800 border-none text-[9px] font-bold">Full PO Receipt</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 border-none text-[9px] font-bold">Partial PO Receipt</Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="receivedPOQtyInput" className="text-xs font-bold text-slate-800">Quantity Received</Label>
                  <Input
                    id="receivedPOQtyInput"
                    type="number"
                    className="border-slate-200 h-9 font-bold"
                    value={receivedPOQty || ''}
                    onChange={(e) => setReceivedPOQty(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5 font-mono">
                  <Label htmlFor="invoiceNoInput" className="text-xs font-bold text-slate-800">Supplier Invoice No.</Label>
                  <Input
                    id="invoiceNoInput"
                    className="border-slate-200 h-9 font-bold"
                    placeholder="e.g. PI-72938"
                    value={invoiceNoInput}
                    onChange={(e) => setInvoiceNoInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="expiryDateInput" className="text-xs font-bold text-slate-800">Batch Expiry Date</Label>
                  <Input
                    id="expiryDateInput"
                    type="date"
                    className="border-slate-200 h-9"
                    value={expiryDateInput}
                    onChange={(e) => setExpiryDateInput(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="remarksInput" className="text-xs font-bold text-slate-800">Remarks / Inspection Notes</Label>
                  <Input
                    id="remarksInput"
                    className="border-slate-200 h-9"
                    placeholder="e.g. In good condition"
                    value={remarksInput}
                    onChange={(e) => setRemarksInput(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2">
              <Button
                variant="outline"
                className="text-xs h-9"
                onClick={() => setSelectedPO(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReceivePOItemSubmit}
                className="bg-green-600 hover:bg-green-750 text-white text-xs h-9 font-bold"
                disabled={isReceivingPO || isSubmitting}
              >
                {isSubmitting ? "Confirming..." : "Confirm Receipt & Log GRN"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasePlanning;
