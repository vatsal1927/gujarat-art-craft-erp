import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProductionRequirements, useSaveProductionRequirement, useCompleteProductionPlan, useMRPRecords, useRunMRP, useProducts, useRawMaterials } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '../components/AuthGuard';
import { Hammer, Play, CheckCircle, AlertTriangle, FileText, Search, Clock, Award, Package, ShieldCheck, ChevronRight, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const calculateMRPForRequirement = (req: any, products: any[], rawMaterials: any[]) => {
  if (!req) return { requiredMaterials: [], status: 'Ready' };

  // Fallback matching: productId, finishedGoodId, itemId, productName/name
  const targetId = req.productId || req.finishedGoodId || req.itemId;
  const targetName = req.productName || req.name;

  const product = products.find(p => 
    (p.id && targetId && p.id === targetId) ||
    (p.finishedGoodId && targetId && p.finishedGoodId === targetId) ||
    (p.itemId && targetId && p.itemId === targetId) ||
    (p.productId && targetId && p.productId === targetId) ||
    (p.id && req.productId && p.id === req.productId) ||
    (p.vigat && targetName && p.vigat.toLowerCase() === targetName.toLowerCase()) ||
    (p.name && targetName && p.name.toLowerCase() === targetName.toLowerCase())
  );

  if (!product) {
    console.warn(`[MRPModal] Product not found for requirement`, req.productName || req.name);
    // Try to pull existing purchase requirements from localStorage for this req
    const purchaseReqsStored = localStorage.getItem('mock_purchase_requirements');
    const allPurchaseReqs = purchaseReqsStored ? JSON.parse(purchaseReqsStored) : [];
    const filteredPurchaseReqs = allPurchaseReqs.filter((pr: any) => 
      (pr.mrpId === req.id || pr.productionRequirementId === req.id || pr.planId === req.id) &&
      pr.status !== 'Cancelled'
    );

    const requiredMaterials: any[] = filteredPurchaseReqs.map((pr: any) => {
      const isFulfilled = pr.status === 'Completed' || pr.status === 'Received' || pr.status === 'Approved';
      return {
        materialId: pr.materialId || pr.rawMaterialId,
        rawMaterialId: pr.materialId || pr.rawMaterialId,
        materialName: pr.materialName || pr.rawMaterialName,
        rawMaterialName: pr.materialName || pr.rawMaterialName,
        name: pr.materialName || pr.rawMaterialName,
        requiredQty: pr.requiredQty || 0,
        requiredQuantity: pr.requiredQty || 0,
        availableQty: pr.availableQty || 0,
        availableStock: pr.availableQty || 0,
        currentStock: pr.availableQty || 0,
        shortageQty: isFulfilled ? 0 : (pr.shortageQty || 0),
        shortage: isFulfilled ? 0 : (pr.shortageQty || 0),
        preferredVendor: pr.vendorId || pr.preferredVendor || 'General Vendor',
        vendorName: pr.vendorId || pr.preferredVendor || 'General Vendor',
        unit: pr.unit || 'pcs'
      };
    });

    const hasShortage = requiredMaterials.some(m => m.shortageQty > 0);
    return {
      id: `MRP-${req.id}`,
      productionRequirementId: req.id,
      productId: req.productId,
      productName: req.productName,
      requiredMaterials,
      status: hasShortage ? 'Partially Available' : 'Ready',
      createdAt: new Date().toISOString()
    };
  }

  // BOM keys: bom, bomMaterials, materials, bomItems
  const bomRequirements = product.bom || product.bomMaterials || product.materials || product.bomItems || [];
  const neededQty = req.plannedQty || req.requiredQty || 0;
  const requiredMaterials: any[] = [];
  let hasShortage = false;
  let allUnavailable = true;

  // Load purchase requirements from localStorage to check for real-time status of shortages
  const purchaseReqsStored = localStorage.getItem('mock_purchase_requirements');
  const allPurchaseReqs = purchaseReqsStored ? JSON.parse(purchaseReqsStored) : [];
  const filteredPurchaseReqs = allPurchaseReqs.filter((pr: any) => 
    (pr.mrpId === req.id || pr.productionRequirementId === req.id || pr.planId === req.id) &&
    pr.status !== 'Cancelled'
  );

  for (const bom of bomRequirements) {
    const matIdOrName = bom.materialId || bom.rawMaterialId || bom.materialName || bom.rawMaterialName || bom.name;
    const material = rawMaterials.find(m => 
      (m.id && matIdOrName && m.id === matIdOrName) || 
      (m.name && matIdOrName && m.name.toLowerCase() === matIdOrName.toLowerCase()) ||
      (bom.materialId && m.id === bom.materialId) ||
      (bom.rawMaterialId && m.id === bom.rawMaterialId) ||
      (bom.materialName && m.name === bom.materialName) ||
      (bom.rawMaterialName && m.name === bom.rawMaterialName) ||
      (bom.name && m.name === bom.name)
    );

    if (material) {
      const bomQty = Number(bom.quantity ?? bom.qty ?? bom.qtyPerUnit ?? bom.qtyPerUnitBase ?? 0);
      const requiredQty = bomQty * neededQty;
      const availableQty = material.currentStock || 0;
      
      const matchingPurchReqs = filteredPurchaseReqs.filter((pr: any) => pr.materialId === material.id || pr.rawMaterialId === material.id);
      const isAnyPurchCompleted = matchingPurchReqs.some((pr: any) => pr.status === 'Completed' || pr.status === 'Received' || pr.status === 'Approved');

      let shortageQty = Math.max(0, requiredQty - availableQty);
      if (isAnyPurchCompleted) {
        shortageQty = 0;
      }

      if (shortageQty > 0) {
        hasShortage = true;
      }
      if (availableQty > 0) {
        allUnavailable = false;
      }

      requiredMaterials.push({
        materialId: material.id,
        rawMaterialId: material.id,
        materialName: material.name,
        rawMaterialName: material.name,
        name: material.name,
        requiredQty,
        requiredQuantity: requiredQty,
        availableQty,
        availableStock: availableQty,
        currentStock: availableQty,
        shortageQty,
        shortage: shortageQty,
        preferredVendor: material.preferredVendor || 'General Vendor',
        vendorName: material.preferredVendor || 'General Vendor',
        unit: material.unit || (material as any).unitLabel || (material as any).stockUnit || (material as any).measurementUnit || 'pcs'
      });
    }
  }

  // Add purchase requirements for materials that are NOT in the BOM if they exist in localStorage
  filteredPurchaseReqs.forEach((pr: any) => {
    const matId = pr.materialId || pr.rawMaterialId;
    const exists = requiredMaterials.some(m => m.materialId === matId);
    if (!exists) {
      const isFulfilled = pr.status === 'Completed' || pr.status === 'Received' || pr.status === 'Approved';
      const shortage = isFulfilled ? 0 : (pr.shortageQty || 0);
      if (shortage > 0) {
        hasShortage = true;
      }
      requiredMaterials.push({
        materialId: matId,
        rawMaterialId: matId,
        materialName: pr.materialName || pr.rawMaterialName || 'Unknown Material',
        rawMaterialName: pr.materialName || pr.rawMaterialName || 'Unknown Material',
        name: pr.materialName || pr.rawMaterialName || 'Unknown Material',
        requiredQty: pr.requiredQty || 0,
        requiredQuantity: pr.requiredQty || 0,
        availableQty: pr.availableQty || 0,
        availableStock: pr.availableQty || 0,
        currentStock: pr.availableQty || 0,
        shortageQty: shortage,
        shortage: shortage,
        preferredVendor: pr.vendorId || pr.preferredVendor || 'General Vendor',
        vendorName: pr.vendorId || pr.preferredVendor || 'General Vendor',
        unit: pr.unit || 'pcs'
      });
    }
  });

  let status = 'Ready';
  if (hasShortage) {
    status = allUnavailable ? 'Insufficient Materials' : 'Partially Available';
  }

  return {
    id: `MRP-${req.id}`,
    productionRequirementId: req.id,
    productId: req.productId,
    productName: req.productName,
    requiredMaterials,
    status,
    createdAt: new Date().toISOString()
  };
};

const ProductionPlanning = () => {
  const { user } = useAuth();
  const { data: requirements = [], isLoading: loadingReqs } = useProductionRequirements();
  const { data: mrpRecords = [] } = useMRPRecords();
  const { data: allProducts = [] } = useProducts();
  const { data: allRawMaterials = [] } = useRawMaterials();

  const { mutate: saveReq } = useSaveProductionRequirement();
  const { mutate: completePlan, isPending: isCompleting } = useCompleteProductionPlan();
  const { mutate: runMRP, isPending: isRunningMRP } = useRunMRP();

  const roleName = user?.role && 'Admin' in user.role ? 'Admin' : (user?.role && 'Manager' in user.role ? 'Manager' : 'Staff');
  const isReadOnly = roleName === 'Staff';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [selectedMRP, setSelectedMRP] = useState<any | null>(null);
  const [completedQtyInput, setCompletedQtyInput] = useState<number>(0);

  const queryClient = useQueryClient();
  useEffect(() => {
    if (!selectedReq) return;

    const calculated = calculateMRPForRequirement(selectedReq, allProducts, allRawMaterials);
    
    // Auto-create purchase requirements locally if shortages exist and are not already pending/existing
    const purchaseReqsStored = localStorage.getItem('mock_purchase_requirements');
    let purchaseReqs = purchaseReqsStored ? JSON.parse(purchaseReqsStored) : [];
    let updated = false;

    calculated.requiredMaterials.forEach((mat: any) => {
      if (mat.shortageQty > 0) {
        const existing = purchaseReqs.find((pr: any) => 
          (pr.materialId === mat.materialId || pr.rawMaterialId === mat.materialId) && 
          (pr.mrpId === selectedReq.id || pr.productionRequirementId === selectedReq.id) &&
          pr.status !== 'Cancelled'
        );

        if (!existing) {
          const newPurch = {
            id: `PURCH-REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            mrpId: selectedReq.id,
            productionRequirementId: selectedReq.id,
            materialId: mat.materialId,
            rawMaterialId: mat.materialId,
            materialName: mat.materialName,
            rawMaterialName: mat.materialName,
            requiredQty: mat.requiredQty,
            availableQty: mat.availableQty,
            shortageQty: mat.shortageQty,
            vendorId: mat.preferredVendor || 'Default Vendor',
            status: 'Pending',
            createdAt: new Date().toISOString()
          };
          purchaseReqs.push(newPurch);
          updated = true;
        }
      }
    });

    if (updated) {
      localStorage.setItem('mock_purchase_requirements', JSON.stringify(purchaseReqs));
      console.log("Generated Purchase Requirements", purchaseReqs);
      queryClient.invalidateQueries({ queryKey: ['purchaseRequirements'] });
    }

    const associatedMRP = mrpRecords.find(m => m.productionRequirementId === selectedReq.id);
    if (associatedMRP && associatedMRP.requiredMaterials && associatedMRP.requiredMaterials.length > 0) {
      const mergedReqMaterials = calculated.requiredMaterials.map(calculatedMat => {
        const foundMat = associatedMRP.requiredMaterials.find((m: any) => (m.materialId || m.rawMaterialId) === calculatedMat.materialId);
        if (foundMat) {
          return { ...calculatedMat, ...foundMat };
        }
        return calculatedMat;
      });
      setSelectedMRP({
        ...associatedMRP,
        requiredMaterials: mergedReqMaterials.length > 0 ? mergedReqMaterials : associatedMRP.requiredMaterials
      });
    } else {
      setSelectedMRP(calculated);
    }
  }, [selectedReq, mrpRecords, allProducts, allRawMaterials]);
  const handleStartProduction = (req: any) => {
    if (isReadOnly) {
      toast.error("Read-only access: Staff cannot start production");
      return;
    }
    const updated = {
      ...req,
      status: 'In Production'
    };
    saveReq(updated, {
      onSuccess: () => {
        toast.success("Production run started!");
        if (selectedReq && selectedReq.id === req.id) {
          setSelectedReq(updated);
        }
      }
    });
  };

  const handleCompleteProductionRun = (req: any) => {
    if (isReadOnly) {
      toast.error("Read-only access: Staff cannot complete production");
      return;
    }
    if (completedQtyInput <= 0) {
      toast.error("Please enter a valid quantity to complete");
      return;
    }
    
    completePlan({
      requirementId: req.id,
      completedQty: completedQtyInput
    }, {
      onSuccess: () => {
        toast.success(`Logged ${completedQtyInput} units completed! Raw materials consumed, finished stock updated.`);
        setSelectedReq(null);
        setCompletedQtyInput(0);
      },
      onError: (err) => {
        toast.error("Failed to complete production run");
        console.error(err);
      }
    });
  };

  const handleRunMRPAnalysis = (req: any) => {
    const calculated = calculateMRPForRequirement(req, allProducts, allRawMaterials);
    setSelectedMRP(calculated);

    // Auto-create purchase requirements locally if shortages exist
    const purchaseReqsStored = localStorage.getItem('mock_purchase_requirements');
    let purchaseReqs = purchaseReqsStored ? JSON.parse(purchaseReqsStored) : [];
    let updated = false;

    calculated.requiredMaterials.forEach((mat: any) => {
      if (mat.shortageQty > 0) {
        const existing = purchaseReqs.find((pr: any) => 
          (pr.materialId === mat.materialId || pr.rawMaterialId === mat.materialId) && 
          (pr.mrpId === req.id || pr.productionRequirementId === req.id) &&
          pr.status !== 'Cancelled'
        );

        if (!existing) {
          const newPurch = {
            id: `PURCH-REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            mrpId: req.id,
            productionRequirementId: req.id,
            materialId: mat.materialId,
            rawMaterialId: mat.materialId,
            materialName: mat.materialName,
            rawMaterialName: mat.materialName,
            requiredQty: mat.requiredQty,
            availableQty: mat.availableQty,
            shortageQty: mat.shortageQty,
            vendorId: mat.preferredVendor || 'Default Vendor',
            status: 'Pending',
            createdAt: new Date().toISOString()
          };
          purchaseReqs.push(newPurch);
          updated = true;
        }
      }
    });

    if (updated) {
      localStorage.setItem('mock_purchase_requirements', JSON.stringify(purchaseReqs));
      console.log("Generated Purchase Requirements", purchaseReqs);
      queryClient.invalidateQueries({ queryKey: ['purchaseRequirements'] });
    }

    runMRP(req.id, {
      onSuccess: (data) => {
        toast.success("MRP calculation updated.");
        queryClient.invalidateQueries({ queryKey: ['mrpRecords'] });
        queryClient.invalidateQueries({ queryKey: ['productionRequirements'] });
        queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        
        if (data && data.requiredMaterials && data.requiredMaterials.length > 0) {
          const mergedReqMaterials = calculated.requiredMaterials.map(calculatedMat => {
            const foundMat = data.requiredMaterials.find((m: any) => (m.materialId || m.rawMaterialId) === calculatedMat.materialId);
            if (foundMat) {
              return { ...calculatedMat, ...foundMat };
            }
            return calculatedMat;
          });
          setSelectedMRP({
            ...data,
            requiredMaterials: mergedReqMaterials.length > 0 ? mergedReqMaterials : data.requiredMaterials
          });
        }
      },
      onError: (err) => {
        console.error("Backend MRP calculation error, using local fallback", err);
        toast.success("MRP calculation updated (local).");
        queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
      }
    });
  };

  const handleSendWhatsAppMRPMaterialShortage = (req: any, mat: any) => {
    const settingsStored = localStorage.getItem('mock_settings');
    const settings = settingsStored ? JSON.parse(settingsStored) : {};
    const whatsappRaw = settings?.whatsappAlertNumbers || '';
    const defaultRecipient = whatsappRaw ? whatsappRaw.split(',')[0].trim() : '91';

    const rawMaterial = allRawMaterials.find(m => m.id === mat.materialId || m.name === mat.materialName);
    const unit = rawMaterial?.unit || (rawMaterial as any)?.unitLabel || (rawMaterial as any)?.stockUnit || (rawMaterial as any)?.measurementUnit || mat.unit || 'pcs';

    const message = `🚨 Gujarat Art & Craft ERP MRP Production Shortage Alert\n\n` +
                    `Production Run for: ${req.productName}\n` +
                    `Material Shortage: ${mat.materialName}\n` +
                    `Shortage Quantity: ${mat.shortageQty} ${unit}\n` +
                    `Preferred Vendor: ${mat.preferredVendor || 'Default Vendor'}\n\n` +
                    `This raw material shortage is blocking production fulfillment.\n\n` +
                    `- Gujarat Art & Craft ERP`;

    const cleanNum = defaultRecipient.replace(/\D/g, "");
    const formattedNum = cleanNum.length === 10 ? "91" + cleanNum : cleanNum;

    const url = `https://wa.me/${formattedNum}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    toast.success("Opened WhatsApp shortage alert!");
  };

  const handlePriorityChange = (req: any, priority: string) => {
    if (isReadOnly) {
      toast.error("Read-only access: Staff cannot change priority");
      return;
    }
    const updated = { ...req, priority };
    saveReq(updated, {
      onSuccess: () => {
        toast.success(`Priority updated to ${priority}`);
      }
    });
  };

  const getPriorityBadgeColor = (p: string) => {
    switch (p) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-250';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (s: string) => {
    switch (s) {
      case 'Pending': return 'bg-gray-100 text-gray-850';
      case 'Planned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Production': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReqs = requirements.filter(r => {
    const matchesSearch = r.productName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.salesOrderId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-maroon flex items-center gap-2">
            <Hammer className="h-6 w-6 text-saffron" />
            <span>Production Planning & Queue</span>
          </h1>
          <p className="text-sm text-slate-500">Track raw material shortages, monitor MRP requirements, and execute production collections</p>
        </div>
      </div>

      <Card className="border-2 border-saffron/20 shadow-md">
        <CardHeader className="bg-slate-50/50 p-4 border-b border-saffron/10 flex flex-col md:flex-row justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-bold text-slate-800">Production Queue</CardTitle>
            <CardDescription className="text-xs">Schedule and complete manufacturing runs for confirmed orders</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search product or order..."
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
              <option value="Planned">Planned</option>
              <option value="In Production">In Production</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingReqs ? (
            <div className="text-center py-10 text-slate-500 text-xs">Loading queue...</div>
          ) : filteredReqs.length === 0 ? (
            <div className="text-center py-10 text-slate-450 text-xs">No production plans in the queue.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70">
                  <TableHead className="font-bold text-xs text-slate-700">Product</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Sales Order</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 text-right">Required Qty</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 text-right">Completed Qty</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 text-right">Pending Qty</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Priority</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Status</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReqs.map(req => {
                  const pendingQty = Math.max(0, req.requiredQty - req.completedQty);
                  const completionRate = Math.min(100, Math.round((req.completedQty / req.requiredQty) * 100));
                  
                  const currentMRP = calculateMRPForRequirement(req, allProducts, allRawMaterials);
                  const hasBOM = currentMRP.requiredMaterials.length > 0;
                  const totalShortagesForReq = currentMRP.requiredMaterials.reduce((sum: number, item: any) => sum + (item.shortageQty || 0), 0);
                  const hasShortagesForReq = totalShortagesForReq > 0;

                  let displayStatus = req.status;
                  if (req.status !== 'Completed' && req.status !== 'Cancelled' && req.status !== 'In Production') {
                    if (hasBOM && !hasShortagesForReq) {
                      displayStatus = 'Ready To Produce';
                    } else if (hasShortagesForReq) {
                      displayStatus = 'Material Shortage';
                    }
                  }
                  
                  return (
                    <TableRow key={req.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-semibold text-xs text-slate-800">
                        <div>{req.productName}</div>
                        <div className="text-[10px] text-slate-450 mt-0.5">Created: {new Date(req.createdAt).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-maroon">{req.salesOrderId.split('-')[0] + '-' + (req.salesOrderId.split('-')[1] || '')}</TableCell>
                      <TableCell className="text-xs text-right font-medium">{req.requiredQty} pcs</TableCell>
                      <TableCell className="text-xs text-right font-bold text-green-700">{req.completedQty} pcs</TableCell>
                      <TableCell className="text-xs text-right font-bold text-orange-700">{pendingQty} pcs</TableCell>
                      <TableCell className="text-xs">
                        <select
                          className={`text-[11px] border rounded px-1.5 py-0.5 font-bold ${getPriorityBadgeColor(req.priority)}`}
                          value={req.priority}
                          onChange={(e) => handlePriorityChange(req, e.target.value)}
                          disabled={isReadOnly}
                        >
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-1">
                          <Badge className={`text-[10px] px-2 py-0.5 w-max border ${getStatusBadgeColor(displayStatus)}`}>
                            {displayStatus}
                          </Badge>
                          {hasBOM && !hasShortagesForReq && (
                            <Badge className="text-[9px] bg-green-100 text-green-800 border-none font-bold mt-0.5 w-max">
                              ✓ Materials Available
                            </Badge>
                          )}
                          <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-green-600 h-full" style={{ width: `${completionRate}%` }}></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] px-2 border-slate-200"
                            onClick={() => {
                              setSelectedReq(req);
                            }}
                          >
                            MRP & Fulfill
                          </Button>
                          {(req.status === 'Pending' || displayStatus === 'Ready To Produce') && !isReadOnly && (
                            <Button
                              size="sm"
                              className="h-7 text-[10px] px-2 bg-maroon hover:bg-maroon/90 text-white font-bold"
                              onClick={() => handleStartProduction(req)}
                            >
                              <Play className="h-3 w-3 mr-0.5" /> Start
                            </Button>
                          )}
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

      {/* Details / MRP Side Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border-2 border-saffron/30 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-maroon text-[#F8F2E8] p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Production Requirement: {selectedReq.productName}</h3>
                <p className="text-[11px] text-[#F8F2E8]/80">Plan ID: {selectedReq.id} | Needed: {selectedReq.requiredQty} pcs</p>
              </div>
              <button 
                onClick={() => {
                  setSelectedReq(null);
                  setSelectedMRP(null);
                }}
                className="text-[#F8F2E8]/80 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
             <div className="p-6 space-y-6 overflow-y-auto flex-grow">
               {/* Actions Section */}
               {selectedReq.status !== 'Completed' && !isReadOnly && (() => {
                 const currentMRPDetails = calculateMRPForRequirement(selectedReq, allProducts, allRawMaterials).requiredMaterials;
                 const hasBOM = currentMRPDetails.length > 0;
                 const totalShortages = currentMRPDetails.reduce((sum: number, item: any) => sum + (item.shortageQty || 0), 0);
                 const isCompleteRunDisabled = !hasBOM || totalShortages > 0;

                 return (
                   <div className="space-y-3">
                     <div className="bg-slate-50 p-4 border border-saffron/10 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
                       <div className="space-y-1">
                         <span className="text-xs font-bold text-slate-800 block">Collect Finished Goods / Complete Run</span>
                         <span className="text-[10px] text-slate-450">Enter quantities produced to automatically deduct raw material stocks and fulfill stock reservations.</span>
                       </div>
                       <div className="flex gap-2 w-full md:w-auto">
                         <Input
                           type="number"
                           placeholder="Qty..."
                           className="text-xs h-9 w-24 border-slate-200"
                           value={completedQtyInput || ''}
                           onChange={(e) => setCompletedQtyInput(parseInt(e.target.value) || 0)}
                         />
                         <Button
                           onClick={() => handleCompleteProductionRun(selectedReq)}
                           className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs h-9"
                           disabled={isCompleting || isCompleteRunDisabled}
                         >
                           Complete Run
                         </Button>
                       </div>
                     </div>
                     {totalShortages > 0 && (
                       <div className="bg-red-50 text-red-800 p-3 rounded-lg border border-red-200 text-xs flex items-center gap-2 font-medium">
                         <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                         <span>Materials are not fully available. Please complete purchase receipts before completing production.</span>
                       </div>
                     )}
                   </div>
                 );
               })()}

               {/* MRP records details */}
               <div className="space-y-3">
                 <div className="flex justify-between items-center">
                   <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                     <Package className="h-4 w-4 text-saffron" />
                     <span>Material Requirement Planning (MRP) Status</span>
                   </h4>
                   <Button
                     size="sm"
                     variant="outline"
                     className="h-7 text-[10px] px-2 text-maroon border-maroon/20"
                     onClick={() => handleRunMRPAnalysis(selectedReq)}
                     disabled={isRunningMRP}
                   >
                     Recalculate MRP
                   </Button>
                 </div>

                 {(() => {
                   const currentMRP = calculateMRPForRequirement(selectedReq, allProducts, allRawMaterials);
                   const safeMrpDetails = currentMRP.requiredMaterials;
                   console.log('[MRPModal] mrpDetails count', safeMrpDetails.length);

                   if (safeMrpDetails.length > 0) {
                     return (
                       <div className="border border-slate-100 rounded-lg overflow-hidden">
                         <Table>
                           <TableHeader className="bg-slate-50">
                             <TableRow>
                               <TableHead className="font-bold text-xs">Raw Material</TableHead>
                               <TableHead className="font-bold text-xs text-right">Required Qty</TableHead>
                               <TableHead className="font-bold text-xs text-right">Available Stock</TableHead>
                               <TableHead className="font-bold text-xs text-right text-red-650">Shortage Qty</TableHead>
                               <TableHead className="font-bold text-xs">Preferred Vendor</TableHead>
                               <TableHead className="font-bold text-xs">MRP Status</TableHead>
                             </TableRow>
                           </TableHeader>
                           <TableBody>
                             {safeMrpDetails.map((row: any, index: number) => {
                               const materialId = row.materialId || row.rawMaterialId || `row-${index}`;
                               const materialName = row.materialName || row.rawMaterialName || row.name || 'Unknown';
                               const requiredQty = row.requiredQty || row.requiredQuantity || 0;
                               const availableQty = row.availableQty || row.availableStock || row.currentStock || 0;
                               const shortageQty = row.shortageQty || row.shortage || 0;
                               const preferredVendor = row.preferredVendor || row.vendorName || 'Not Set';
                               const rawMaterial = allRawMaterials.find(m => m.id === materialId || m.name === materialName);
                               const unit = rawMaterial?.unit 
                                 || (rawMaterial as any)?.unitLabel 
                                 || (rawMaterial as any)?.stockUnit 
                                 || (rawMaterial as any)?.measurementUnit 
                                 || row.unit 
                                 || 'pcs';

                               return (
                                 <TableRow key={materialId}>
                                   <TableCell className="text-xs font-semibold">{materialName}</TableCell>
                                   <TableCell className="text-xs text-right">{requiredQty} {unit}</TableCell>
                                   <TableCell className="text-xs text-right font-medium text-green-700">{availableQty} {unit}</TableCell>
                                   <TableCell className="text-xs text-right font-bold text-red-650 bg-red-50/20">{shortageQty} {unit}</TableCell>
                                   <TableCell className="text-xs text-slate-500">{preferredVendor}</TableCell>
                                   <TableCell className="text-xs">
                                     {shortageQty > 0 ? (
                                       <div className="flex items-center gap-1.5">
                                         <Badge className="text-[9px] bg-red-100 text-red-800 border-none">Purchase Req Generated</Badge>
                                         <Button
                                           size="sm"
                                           variant="ghost"
                                           className="h-6 w-6 p-0 text-[#25D366] hover:bg-[#25D366]/10"
                                           onClick={() => handleSendWhatsAppMRPMaterialShortage(selectedReq, {
                                             materialName,
                                             shortageQty,
                                             preferredVendor
                                           })}
                                           title="Send WhatsApp Alert"
                                         >
                                           WA
                                         </Button>
                                       </div>
                                     ) : (
                                       <Badge className="text-[9px] bg-green-100 text-green-800 border-none">In Stock</Badge>
                                     )}
                                   </TableCell>
                                 </TableRow>
                               );
                             })}
                           </TableBody>
                         </Table>
                       </div>
                     );
                   } else {
                     return (
                       <div className="text-center py-6 text-slate-450 text-xs bg-slate-50/50 rounded-lg">
                         No MRP material details found. Please configure BOM for this product and click Recalculate MRP.
                       </div>
                     );
                   }
                 })()}
               </div>
             </div>

            <div className="bg-slate-50/80 p-4 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                className="text-xs h-9"
                onClick={() => {
                  setSelectedReq(null);
                  setSelectedMRP(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionPlanning;
