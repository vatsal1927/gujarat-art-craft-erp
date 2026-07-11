import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  useRawMaterials, useSaveRawMaterial, useDeleteRawMaterial, 
  useVendors, useLogUserAction, useActivityLogs,
  usePurchases, useGRNs, useConsumptionLogs
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
  Save, Trash2, Edit, Search, Sparkles, Plus, Image, 
  FileText, Eye, History, AlertTriangle, X 
} from 'lucide-react';
import { formatCurrency } from '../../utils/currencyFormat';
import { toast } from 'sonner';
import { useAuth } from '../AuthGuard';
import { exportToCSV, parseCSV, formatSafeDate } from '../../utils/masterData';
import { Download, Upload } from 'lucide-react';

const METADATA_KEY = 'mock_raw_materials_metadata';
const IMAGES_KEY = 'mock_uploaded_images';

export default function RawMaterialsInventory() {
  const { user: currentUser } = useAuth();
  const isAdmin = !!(currentUser?.role && 'Admin' in currentUser.role);
  const isManager = !!(currentUser?.role && 'Manager' in currentUser.role);
  const canDelete = isAdmin; // Only Master Admin can delete

  const { data: rawMaterials = [], isLoading: isLoadingRaw } = useRawMaterials();
  const { data: vendors = [] } = useVendors();
  const { mutate: saveRawMaterial, isPending: isSaving } = useSaveRawMaterial();
  const { mutate: deleteRawMaterial } = useDeleteRawMaterial();
  const { mutate: logUserAction } = useLogUserAction();
  const { data: activityLogs = [] } = useActivityLogs();
  const { data: purchases = [] } = usePurchases();
  const { data: grns = [] } = useGRNs();
  const { data: consumptionLogs = [] } = useConsumptionLogs();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected materials?`)) return;
    let completed = 0;
    selectedIds.forEach((id) => {
      deleteRawMaterial(id, {
        onSuccess: () => {
          completed++;
          if (completed === selectedIds.length) {
            toast.success('Selected materials deleted successfully.');
            setSelectedIds([]);
          }
        }
      });
    });
  };

  const handleExport = () => {
    const allMeta = JSON.parse(localStorage.getItem(METADATA_KEY) || '{}');
    const data = (rawMaterials || []).map(m => {
      const meta = allMeta[m.id] || {};
      return {
        id: m.id,
        name: m.name,
        category: m.category,
        unit: m.unit,
        openingStock: m.openingStock,
        currentStock: m.currentStock || m.openingStock,
        minStock: m.minStockAlert,
        reorderLevel: m.reorderLevel,
        preferredVendor: m.preferredVendor,
        unitCost: m.unitCost,
        purchaseRate: meta.purchaseRate || m.unitCost || 0,
        maxStockLevel: meta.maxStockLevel || 100,
        hsnCode: meta.hsnCode || '5609',
        gstPercent: meta.gstPercent || 5,
        storageRack: meta.storageRack || 'N/A',
        warehouse: meta.warehouse || 'N/A',
        status: meta.status || 'Active',
        notes: meta.notes || ''
      };
    });
    exportToCSV(data, [
      'id', 'name', 'category', 'unit', 'openingStock', 'currentStock', 
      'minStock', 'reorderLevel', 'preferredVendor', 'unitCost', 
      'purchaseRate', 'maxStockLevel', 'hsnCode', 'gstPercent', 
      'storageRack', 'warehouse', 'status', 'notes'
    ], 'raw_materials_master');
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
          const dup = (rawMaterials || []).some(m => m.id === id);
          if (dup) {
            skipCount++;
            return;
          }
          
          const prefVendor = String(item.preferredVendor || 'General Vendor').trim();
          const vendorExists = (vendors || []).some(
            (v: any) => v.name.trim().toLowerCase() === prefVendor.toLowerCase()
          );
          if (!vendorExists) {
            skipCount++;
            return;
          }

          saveRawMaterial({
            id,
            name,
            category: String(item.category || 'Threads').trim(),
            openingStock: Number(item.openingStock) || 0,
            unitCost: Number(item.unitCost) || 0,
            minStock: Number(item.minStock) || 5,
            reorderLevel: Number(item.reorderLevel) || 10,
            minimumStock: Number(item.minStock) || 5,
            preferredVendor: prefVendor,
            unit: String(item.unit || 'meters').trim()
          });

          const allMeta = JSON.parse(localStorage.getItem(METADATA_KEY) || '{}');
          allMeta[id] = {
            purchaseRate: Number(item.purchaseRate || item.unitCost) || 0,
            maxStockLevel: Number(item.maxStockLevel) || 100,
            hsnCode: String(item.hsnCode || '5609').trim(),
            gstPercent: Number(item.gstPercent) || 5,
            storageRack: String(item.storageRack || 'N/A').trim(),
            warehouse: String(item.warehouse || 'N/A').trim(),
            status: String(item.status || 'Active').trim(),
            notes: String(item.notes || '').trim()
          };
          localStorage.setItem(METADATA_KEY, JSON.stringify(allMeta));
          
          count++;
        });

        toast.success(`Imported ${count} materials. Skipped ${skipCount} duplicates/invalid entries.`);
      } catch (err) {
        toast.error("Failed to parse import file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Form states
  const [materialCode, setMaterialCode] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [category, setCategory] = useState('Threads');
  const [unit, setUnit] = useState('meters');
  const [openingStock, setOpeningStock] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [purchaseRate, setPurchaseRate] = useState<number>(0);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(5);
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  const [maximumStock, setMaximumStock] = useState<number>(100);
  const [preferredVendor, setPreferredVendor] = useState('General Vendor');
  const [hsnCode, setHsnCode] = useState('5609');
  const [gstPercent, setGstPercent] = useState('5');
  const [storageRack, setStorageRack] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [notes, setNotes] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Dialog states
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);
  const [historyMaterial, setHistoryMaterial] = useState<any | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate code
  useEffect(() => {
    if (!editingId && rawMaterials) {
      const nextNum = rawMaterials.length + 1;
      setMaterialCode(`RM-${String(nextNum).padStart(3, '0')}`);
    }
  }, [rawMaterials, editingId]);

  // Load custom metadata when editing
  const loadMetadataForEdit = (id: string, baseMaterial: any) => {
    try {
      const allMeta = JSON.parse(localStorage.getItem(METADATA_KEY) || '{}');
      const meta = allMeta[id] || {};
      
      const customImages = JSON.parse(localStorage.getItem(IMAGES_KEY) || '{}');
      const img = customImages[id] || '';

      setMaterialCode(baseMaterial.id);
      setMaterialName(baseMaterial.name);
      setCategory(baseMaterial.category || 'Threads');
      setUnit(baseMaterial.unit || 'meters');
      setOpeningStock(Number(baseMaterial.openingStock) || 0);
      setCurrentStock(Number(baseMaterial.currentStock || baseMaterial.openingStock) || 0);
      setPurchaseRate(meta.purchaseRate || baseMaterial.unitCost || 0);
      setUnitCost(baseMaterial.unitCost || 0);
      setMinStock(baseMaterial.minStock || baseMaterial.minStockAlert || 5);
      setReorderLevel(baseMaterial.reorderLevel || 10);
      setMaximumStock(meta.maxStockLevel || 100);
      setPreferredVendor(baseMaterial.preferredVendor || 'General Vendor');
      setHsnCode(meta.hsnCode || '5609');
      setGstPercent(String(meta.gstPercent || 5));
      setStorageRack(meta.storageRack || '');
      setWarehouse(meta.warehouse || '');
      setStatus(meta.status || 'Active');
      setNotes(meta.notes || '');
      setPhotoBase64(img);
      setEditingId(id);
    } catch (e) {
      console.error('Error loading material metadata for edit', e);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setMaterialName('');
    setCategory('Threads');
    setUnit('meters');
    setOpeningStock(0);
    setCurrentStock(0);
    setPurchaseRate(0);
    setUnitCost(0);
    setMinStock(5);
    setReorderLevel(10);
    setMaximumStock(100);
    setPreferredVendor('General Vendor');
    setHsnCode('5609');
    setGstPercent('5');
    setStorageRack('');
    setWarehouse('');
    setStatus('Active');
    setNotes('');
    setPhotoBase64('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    // Auto-generate code for next item
    const nextNum = (rawMaterials?.length || 0) + 1;
    setMaterialCode(`RM-${String(nextNum).padStart(3, '0')}`);
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error('Material photo must be less than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoBase64(reader.result as string);
      toast.success('Material image attached!');
    };
    reader.readAsDataURL(file);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!materialCode.trim()) {
      toast.error('Material Code is required');
      return;
    }
    if (!materialName.trim()) {
      toast.error('Material Name is required');
      return;
    }

    // Check duplicate code
    if (!editingId) {
      const isDuplicate = rawMaterials.some(
        (m) => m.id.toLowerCase().trim() === materialCode.toLowerCase().trim()
      );
      if (isDuplicate) {
        toast.error(`Material Code "${materialCode}" is already in use.`);
        return;
      }
    }

    // Check preferred vendor exists in master list
    const vendorExists = vendors.some(
      (v: any) => v.name.trim().toLowerCase() === preferredVendor.trim().toLowerCase()
    );
    if (!vendorExists) {
      toast.error(`Preferred Supplier "${preferredVendor}" is not a registered Vendor Account.`);
      return;
    }

    // Prevents negative numbers
    if (openingStock < 0) {
      toast.error('Opening Stock cannot be negative');
      return;
    }
    if (purchaseRate < 0) {
      toast.error('Purchase Rate cannot be negative');
      return;
    }
    if (unitCost < 0) {
      toast.error('Unit Cost cannot be negative');
      return;
    }
    if (minStock < 0) {
      toast.error('Minimum Stock cannot be negative');
      return;
    }
    if (reorderLevel < 0) {
      toast.error('Reorder Level cannot be negative');
      return;
    }
    if (maximumStock < 0) {
      toast.error('Maximum Stock cannot be negative');
      return;
    }

    saveRawMaterial({
      id: materialCode.trim(),
      name: materialName.trim(),
      category: category.trim(),
      openingStock: Number(openingStock),
      unitCost: Number(unitCost),
      unit: unit.trim(),
      minStock: Number(minStock),
      reorderLevel: Number(reorderLevel),
      minimumStock: Number(minStock),
      preferredVendor: preferredVendor
    }, {
      onSuccess: () => {
        // Save extra metadata locally
        try {
          const allMeta = JSON.parse(localStorage.getItem(METADATA_KEY) || '{}');
          allMeta[materialCode.trim()] = {
            purchaseRate: Number(purchaseRate),
            maxStockLevel: Number(maximumStock),
            lowStockAlert: true,
            hsnCode: hsnCode.trim(),
            gstPercent: Number(gstPercent),
            storageRack: storageRack.trim(),
            warehouse: warehouse.trim(),
            status: status,
            notes: notes.trim()
          };
          localStorage.setItem(METADATA_KEY, JSON.stringify(allMeta));

          // Save photo
          if (photoBase64) {
            const customImages = JSON.parse(localStorage.getItem(IMAGES_KEY) || '{}');
            customImages[materialCode.trim()] = photoBase64;
            localStorage.setItem(IMAGES_KEY, JSON.stringify(customImages));
          }
        } catch (err) {
          console.error('Error saving local metadata', err);
        }

        // Log user action
        logUserAction({
          action: editingId ? 'Update Material' : 'Create Material',
          details: `${editingId ? 'Updated' : 'Created'} raw material: ${materialName} (${materialCode})`
        });

        toast.success(editingId ? 'Material updated successfully!' : 'Material added successfully!');
        resetForm();
      },
      onError: (err: any) => {
        toast.error(`Error saving material: ${err.message}`);
      }
    });
  };

  // Delete Handler
  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete raw material "${name}" (${id})?`)) {
      return;
    }

    deleteRawMaterial(id, {
      onSuccess: () => {
        // Clean up metadata
        try {
          const allMeta = JSON.parse(localStorage.getItem(METADATA_KEY) || '{}');
          delete allMeta[id];
          localStorage.setItem(METADATA_KEY, JSON.stringify(allMeta));

          const customImages = JSON.parse(localStorage.getItem(IMAGES_KEY) || '{}');
          delete customImages[id];
          localStorage.setItem(IMAGES_KEY, JSON.stringify(customImages));
        } catch {}

        // Log user action
        logUserAction({
          action: 'Delete Material',
          details: `Deleted raw material: ${name} (${id})`
        });

        toast.success('Raw material deleted successfully!');
      },
      onError: (err: any) => {
        toast.error(`Failed to delete material: ${err.message}`);
      }
    });
  };

  // Filtered List
  const filteredMaterials = useMemo(() => {
    return rawMaterials.filter((m) => {
      const matchesSearch = 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        categoryFilter === 'All' || 
        m.category.toLowerCase() === categoryFilter.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [rawMaterials, searchQuery, categoryFilter]);

  // Categories list
  const categoriesList = useMemo(() => {
    const set = new Set(rawMaterials.map((m) => m.category));
    return ['All', ...Array.from(set)];
  }, [rawMaterials]);

  // Load Metadata for specific material
  const getMaterialDetails = (m: any) => {
    try {
      const allMeta = JSON.parse(localStorage.getItem(METADATA_KEY) || '{}');
      const meta = allMeta[m.id] || {};
      
      const customImages = JSON.parse(localStorage.getItem(IMAGES_KEY) || '{}');
      const img = customImages[m.id] || '';

      return {
        ...m,
        purchaseRate: meta.purchaseRate || m.unitCost || 0,
        maxStockLevel: meta.maxStockLevel || 100,
        hsnCode: meta.hsnCode || '5609',
        gstPercent: meta.gstPercent || 5,
        storageRack: meta.storageRack || 'N/A',
        warehouse: meta.warehouse || 'N/A',
        status: meta.status || 'Active',
        notes: meta.notes || 'N/A',
        imageUrl: img || m.photoUrl || ''
      };
    } catch {
      return { ...m, purchaseRate: m.unitCost, maxStockLevel: 100, hsnCode: '5609', gstPercent: 5, storageRack: 'N/A', warehouse: 'N/A', status: 'Active', notes: 'N/A', imageUrl: '' };
    }
  };

  // Filter audit logs for specific material
  const materialAuditLogs = useMemo(() => {
    if (!historyMaterial) return [];
    return activityLogs.filter((log: any) => 
      log.action.includes(historyMaterial.id) ||
      log.details.includes(historyMaterial.id) ||
      log.details.includes(historyMaterial.name)
    );
  }, [activityLogs, historyMaterial]);

  const materialHistory = useMemo(() => {
    if (!historyMaterial) return [];
    
    const historyList: any[] = [];
    const matId = historyMaterial.id;
    const matName = historyMaterial.name.trim().toLowerCase();
    
    // 1. Initial Opening Balance
    historyList.push({
      date: historyMaterial.createdAt || Date.now(),
      user: 'System',
      action: 'Opening Balance Set',
      qtyDelta: Number(historyMaterial.openingStock) || 0,
      oldValue: 0,
      newValue: Number(historyMaterial.openingStock) || 0,
      sourceModule: 'Master Data',
      refNo: matId,
      remarks: 'Initial inventory setup',
      timestamp: 0
    });
    
    // 2. Purchases (incoming stock)
    purchases.forEach((p: any) => {
      const matchItem = (p.items || []).find((item: any) => 
        item.materialId === matId || 
        (item.materialName && item.materialName.trim().toLowerCase() === matName)
      );
      if (matchItem) {
        historyList.push({
          date: p.date,
          user: p.createdByName || 'Purchaser',
          action: 'Purchase Inflow',
          qtyDelta: Number(matchItem.quantity) || 0,
          sourceModule: 'Purchases',
          refNo: p.purchaseNumber,
          remarks: `Bought from vendor: ${p.vendorName}`,
          timestamp: Number(p.date) || Date.parse(p.date) || Date.now()
        });
      }
    });
    
    // 3. GRNs (Goods Received)
    grns.forEach((g: any) => {
      const matchItem = (g.items || []).find((item: any) => 
        item.materialId === matId || 
        (item.materialName && item.materialName.trim().toLowerCase() === matName)
      );
      if (matchItem) {
        historyList.push({
          date: g.receivedDate || g.date,
          user: g.receivedBy || 'Storekeeper',
          action: 'Goods Received',
          qtyDelta: Number(matchItem.quantity) || 0,
          sourceModule: 'GRN Receipts',
          refNo: g.grnNo,
          remarks: `Received items against PO: ${g.poNumber}`,
          timestamp: Date.parse(g.receivedDate || g.date) || Date.now()
        });
      }
    });
    
    // 4. Consumption Logs (reductions)
    consumptionLogs.forEach((c: any) => {
      const isMatch = c.rawMaterialName && (
        c.rawMaterialName === matId || 
        c.rawMaterialName.trim().toLowerCase() === matName
      );
      if (isMatch) {
        historyList.push({
          date: c.date,
          user: c.employee || 'Worker',
          action: 'Material Consumption',
          qtyDelta: -(Number(c.quantityUsed) || 0),
          sourceModule: 'Production/MRP',
          refNo: c.jobWorkNo ? `JW-${c.jobWorkNo}` : 'N/A',
          remarks: `Consumed for batch: ${c.batchNo} (${c.productName})`,
          timestamp: Number(c.date) || Date.parse(c.date) || Date.now()
        });
      }
    });
    
    // 5. System Audit Logs / Manual Adjustments
    activityLogs.forEach((log: any) => {
      const matchesMat = log.details.includes(matId) || log.details.includes(historyMaterial.name);
      if (matchesMat && (log.action.includes('Adjust') || log.action.includes('Reconcil') || log.action.includes('Update') || log.action.includes('Import'))) {
        let oldVal = 0;
        let newVal = 0;
        const matchesVal = log.details.match(/from\s+([\d.]+)\s+to\s+([\d.]+)/i);
        if (matchesVal) {
          oldVal = parseFloat(matchesVal[1]) || 0;
          newVal = parseFloat(matchesVal[2]) || 0;
        } else {
          // If no specific delta, treat opening/current stock values
          newVal = Number(historyMaterial.currentStock) || 0;
          oldVal = Number(historyMaterial.openingStock) || 0;
        }
        
        historyList.push({
          date: log.timestamp,
          user: log.userName || 'Admin',
          action: log.action,
          qtyDelta: newVal - oldVal,
          oldValue: oldVal,
          newValue: newVal,
          sourceModule: 'Audit Trails',
          refNo: 'Log ID: ' + (log.id ? log.id.toString() : 'N/A'),
          remarks: log.details,
          timestamp: Number(log.timestamp) || Date.parse(log.timestamp) || Date.now()
        });
      }
    });
    
    const sorted = historyList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    let currentBal = 0;
    const finalHistory = sorted.map((entry) => {
      if (entry.action === 'Opening Balance Set') {
        currentBal = entry.newValue;
        return entry;
      }
      
      if (entry.oldValue === undefined) {
        entry.oldValue = currentBal;
        entry.newValue = currentBal + entry.qtyDelta;
        currentBal = entry.newValue;
      } else {
        currentBal = entry.newValue;
      }
      
      return entry;
    });
    
    return [...finalHistory].reverse();
  }, [historyMaterial, purchases, grns, consumptionLogs, activityLogs]);

  return (
    <div className="space-y-6">
      <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
        <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
          <CardTitle className="text-maroon dark:text-saffron flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-saffron" />
              Raw Materials Inventory
            </span>
            {editingId && (
              <Button size="sm" variant="ghost" onClick={resetForm} className="text-red-500 hover:text-red-700">
                <X className="h-4 w-4 mr-1" /> Cancel Edit
              </Button>
            )}
          </CardTitle>
          <CardDescription>Configure raw material SKU codes, categories, landed unit costs, reorder warning thresholds, and storage metadata.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          
          {/* Create / Edit Form */}
          <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-cream/30 border border-gold/15 space-y-4">
            <h3 className="font-bold text-sm text-maroon flex items-center gap-1.5 uppercase tracking-wide">
              <span>{editingId ? 'Update Material Details' : 'Add New Raw Material SKU'}</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="materialCode" className="text-xs font-semibold text-slate-700">Material Code</Label>
                <div className="relative">
                  <Input
                    id="materialCode"
                    value={materialCode}
                    onChange={(e) => setMaterialCode(e.target.value.toUpperCase())}
                    placeholder="e.g. RM-001"
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
                <Label htmlFor="materialName" className="text-xs font-semibold text-slate-700">Material Name / Description</Label>
                <Input
                  id="materialName"
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  placeholder="e.g. Red Beaded Threads (100m)"
                  className="border-gold bg-white dark:bg-slate-900 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-semibold text-slate-700">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="border-gold bg-white dark:bg-slate-900 text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Threads">Threads</SelectItem>
                    <SelectItem value="Beads">Beads</SelectItem>
                    <SelectItem value="Mirrors">Mirrors</SelectItem>
                    <SelectItem value="Laces">Laces</SelectItem>
                    <SelectItem value="Bangles">Bangles</SelectItem>
                    <SelectItem value="Packaging">Packaging</SelectItem>
                    <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="unit" className="text-xs font-semibold text-slate-700">Unit of Measure (UoM)</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger id="unit" className="border-gold bg-white dark:bg-slate-900 text-xs">
                    <SelectValue placeholder="Select Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meters">Meters (mtr)</SelectItem>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                    <SelectItem value="bags">Bags (bag)</SelectItem>
                    <SelectItem value="rolls">Rolls (roll)</SelectItem>
                    <SelectItem value="box">Boxes (box)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="openingStock" className="text-xs font-semibold text-slate-700">Opening Stock</Label>
                <Input
                  id="openingStock"
                  type="number"
                  min="0"
                  value={openingStock}
                  onChange={(e) => setOpeningStock(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="border-gold bg-white dark:bg-slate-900 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="purchaseRate" className="text-xs font-semibold text-slate-700">Purchase Rate (₹ excl. GST)</Label>
                <Input
                  id="purchaseRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={purchaseRate || ''}
                  onChange={(e) => setPurchaseRate(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="border-gold bg-white dark:bg-slate-900 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unitCost" className="text-xs font-semibold text-slate-700">Avg Landed Cost (₹ incl. GST)</Label>
                <Input
                  id="unitCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitCost || ''}
                  onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="border-gold bg-white dark:bg-slate-900 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="minStock" className="text-xs font-semibold text-slate-700">Min Alert Threshold</Label>
                <Input
                  id="minStock"
                  type="number"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(Number(e.target.value) || 0)}
                  className="border-gold bg-white dark:bg-slate-900 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reorderLevel" className="text-xs font-semibold text-slate-700">Reorder Level</Label>
                <Input
                  id="reorderLevel"
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(Number(e.target.value) || 0)}
                  className="border-gold bg-white dark:bg-slate-900 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="maximumStock" className="text-xs font-semibold text-slate-700">Max Stock Cap</Label>
                <Input
                  id="maximumStock"
                  type="number"
                  min="0"
                  value={maximumStock}
                  onChange={(e) => setMaximumStock(Number(e.target.value) || 0)}
                  className="border-gold bg-white dark:bg-slate-900 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="preferredVendor" className="text-xs font-semibold text-slate-700">Preferred Supplier</Label>
                <Select value={preferredVendor} onValueChange={setPreferredVendor}>
                  <SelectTrigger id="preferredVendor" className="border-gold bg-white dark:bg-slate-900 text-xs">
                    <SelectValue placeholder="Preferred Vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.length > 0 ? (
                      vendors.map((v: any) => (
                        <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="General Vendor">General Vendor</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="hsnCode" className="text-xs font-semibold text-slate-700">HSN Code</Label>
                <Input
                  id="hsnCode"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  className="border-gold bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gstPercent" className="text-xs font-semibold text-slate-700">GST Slab (%)</Label>
                <Select value={gstPercent} onValueChange={setGstPercent}>
                  <SelectTrigger id="gstPercent" className="border-gold bg-white dark:bg-slate-900 text-xs">
                    <SelectValue placeholder="GST Slab" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Nil)</SelectItem>
                    <SelectItem value="5">5% (Standard)</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="storageRack" className="text-xs font-semibold text-slate-700">Storage Rack No.</Label>
                <Input
                  id="storageRack"
                  value={storageRack}
                  onChange={(e) => setStorageRack(e.target.value)}
                  placeholder="e.g. A-12"
                  className="border-gold bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="warehouse" className="text-xs font-semibold text-slate-700">Warehouse Section</Label>
                <Input
                  id="warehouse"
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                  placeholder="e.g. Finished Goods A"
                  className="border-gold bg-white dark:bg-slate-900 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">Storage Notes / Instructions</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add handling details, packaging specifications, etc."
                  rows={2}
                  className="border-gold bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-semibold text-slate-700">Status</Label>
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

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 block">Attach Image</Label>
                <div className="flex gap-2 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-gold text-maroon hover:bg-gold/10 text-xs h-9 w-full flex items-center justify-center gap-1.5"
                  >
                    <Image className="h-4 w-4" /> Upload
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  {photoBase64 && (
                    <div className="h-9 w-9 rounded border border-gold overflow-hidden shrink-0 relative group">
                      <img src={photoBase64} alt="Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoBase64('')}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
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
                {editingId ? 'Update Material' : 'Add Material SKU'}
              </Button>
            </div>
          </form>

          {/* Search, Filter, Table Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search code or description..."
                  className="pl-9 border-gold bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="flex gap-2 items-center w-full sm:w-auto">
                <Label htmlFor="catFilter" className="text-xs font-semibold text-slate-600 shrink-0">Filter by Category:</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger id="catFilter" className="border-gold bg-white dark:bg-slate-900 text-xs w-full sm:w-40">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesList.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                    id="import-raw-file" 
                  />
                  <Label 
                    htmlFor="import-raw-file"
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

            {/* Materials Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800 max-h-[350px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                    <TableHead className="w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="h-3.5 w-3.5 rounded border-gold accent-maroon"
                        checked={selectedIds.length > 0 && selectedIds.length === filteredMaterials.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredMaterials.map(m => m.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="font-bold text-maroon text-xs w-16">Photo</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Material Code</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Material Name</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Category</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-center">Stock</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-center">Unit</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-right">Landed Cost</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Pref Supplier</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-center">Status</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingRaw ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-xs text-gray-500">Loading catalog data...</TableCell>
                    </TableRow>
                  ) : filteredMaterials.length > 0 ? (
                    filteredMaterials.map((m) => {
                      const details = getMaterialDetails(m);
                      const isLowStock = Number(details.currentStock) <= Number(details.minStock);
                      return (
                        <TableRow key={m.id} className="hover:bg-amber-50/20 text-xs">
                          <TableCell className="text-center">
                            <input 
                              type="checkbox" 
                              className="h-3.5 w-3.5 rounded border-gold accent-maroon"
                              checked={selectedIds.includes(m.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(prev => [...prev, m.id]);
                                } else {
                                  setSelectedIds(prev => prev.filter(id => id !== m.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-center py-2">
                            {details.imageUrl ? (
                              <img src={details.imageUrl} alt={m.name} className="h-8 w-8 object-cover rounded border border-gold/20 mx-auto" />
                            ) : (
                              <div className="h-8 w-8 bg-slate-100 rounded flex items-center justify-center border border-slate-200 mx-auto">
                                <Image className="h-4 w-4 text-slate-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-bold font-mono text-slate-800 dark:text-slate-200">{m.id}</TableCell>
                          <TableCell className="font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate">{m.name}</TableCell>
                          <TableCell className="text-slate-600 font-medium">{m.category}</TableCell>
                          <TableCell className="text-center font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              isLowStock ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'
                            }`}>
                              {details.currentStock.toString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-medium text-slate-600">{m.unit}</TableCell>
                          <TableCell className="text-right font-semibold text-slate-900">{formatCurrency(details.unitCost)}</TableCell>
                          <TableCell className="font-medium text-slate-650 max-w-32 truncate">{details.preferredVendor}</TableCell>
                          <TableCell className="text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              details.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-300/40' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {details.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedMaterial(details)}
                                className="text-slate-500 hover:bg-slate-100 h-7 w-7"
                                title="View Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => loadMetadataForEdit(m.id, m)}
                                className="text-saffron hover:bg-saffron/10 h-7 w-7"
                                title="Edit Material"
                              >
                                <Edit className="h-3.5 w-3.5 text-saffron" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setHistoryMaterial(details);
                                  logUserAction({ action: 'RAW_MATERIAL_STOCK_HISTORY_VIEWED', details: `Viewed stock history for raw material ${details.name} (${details.id})` });
                                  logUserAction({ action: 'RAW_MATERIAL_STOCK_LEDGER_SYNC_CHECKED', details: `Checked raw material stock ledger sync for ${details.name} (${details.id})` });
                                }}
                                className="text-blue-500 hover:bg-blue-50 h-7 w-7"
                                title="Audit History"
                              >
                                <History className="h-3.5 w-3.5 text-blue-500" />
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(m.id, m.name)}
                                  className="text-red-600 hover:bg-red-50 h-7 w-7"
                                  title="Delete SKU"
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
                      <TableCell colSpan={11} className="text-center py-8 text-gray-500 text-xs">No matching raw material items in database.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Details View Modal */}
      <Dialog open={!!selectedMaterial} onOpenChange={() => setSelectedMaterial(null)}>
        <DialogContent className="max-w-md bg-white border border-gold/45 shadow-xl">
          <DialogHeader className="border-b border-gold/15 pb-2">
            <DialogTitle className="text-maroon flex items-center gap-2">
              <Eye className="h-5 w-5 text-saffron" />
              <span>SKU Details: {selectedMaterial?.id}</span>
            </DialogTitle>
            <DialogDescription>Full audit attributes sheet for raw material.</DialogDescription>
          </DialogHeader>
          {selectedMaterial && (
            <div className="space-y-4 pt-3 text-xs">
              <div className="flex justify-center mb-4">
                {selectedMaterial.imageUrl ? (
                  <img src={selectedMaterial.imageUrl} alt={selectedMaterial.name} className="h-28 w-28 object-cover rounded border border-gold shadow" />
                ) : (
                  <div className="h-28 w-28 bg-slate-50 border border-slate-200 rounded flex items-center justify-center">
                    <Image className="h-10 w-10 text-slate-400" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Material Name</span>
                  <span className="font-semibold text-slate-800 text-xs">{selectedMaterial.name}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Category</span>
                  <span className="font-semibold text-slate-800 text-xs">{selectedMaterial.category}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">UoM</span>
                  <span className="font-semibold text-slate-800 text-xs">{selectedMaterial.unit}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">HSN Code</span>
                  <span className="font-mono font-semibold text-slate-800 text-xs">{selectedMaterial.hsnCode}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Current Stock</span>
                  <span className="font-semibold text-slate-800 text-xs">{selectedMaterial.currentStock.toString()} {selectedMaterial.unit}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Stock Valuation</span>
                  <span className="font-semibold text-maroon text-xs">
                    {formatCurrency(Number(selectedMaterial.currentStock) * selectedMaterial.unitCost)}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Purchase Rate</span>
                  <span className="font-semibold text-slate-800 text-xs">{formatCurrency(selectedMaterial.purchaseRate)}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Avg Landed Cost</span>
                  <span className="font-semibold text-slate-800 text-xs">{formatCurrency(selectedMaterial.unitCost)}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">GST Slab</span>
                  <span className="font-semibold text-slate-800 text-xs">{selectedMaterial.gstPercent}%</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Preferred Vendor</span>
                  <span className="font-semibold text-slate-800 text-xs">{selectedMaterial.preferredVendor}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Location / Storage</span>
                  <span className="font-semibold text-slate-850 text-xs">Rack: {selectedMaterial.storageRack || 'N/A'}, Section: {selectedMaterial.warehouse || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Status</span>
                  <span className={`font-bold text-[10px] ${selectedMaterial.status === 'Active' ? 'text-green-600' : 'text-slate-500'}`}>{selectedMaterial.status}</span>
                </div>
              </div>
              
              <div className="border-t border-gold/10 pt-2">
                <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Description & Handling Notes</span>
                <p className="text-slate-700 italic leading-relaxed">{selectedMaterial.notes || 'No description notes provided.'}</p>
              </div>

              <div className="flex justify-end pt-3">
                <Button size="sm" onClick={() => setSelectedMaterial(null)} className="bg-maroon text-white hover:bg-maroon/90">
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Audit Logs Modal */}
      <Dialog open={!!historyMaterial} onOpenChange={() => setHistoryMaterial(null)}>
        <DialogContent className="max-w-4xl bg-white border border-gold/45 shadow-xl">
          <DialogHeader className="border-b border-gold/15 pb-2">
            <DialogTitle className="text-maroon flex items-center gap-2">
              <History className="h-5 w-5 text-blue-500" />
              <span>Stock Ledger History: {historyMaterial?.name} ({historyMaterial?.id})</span>
            </DialogTitle>
            <DialogDescription>Comprehensive stock ledger showing opening balance, purchases, receipts, consumption, and manual adjustments.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-3 text-xs">
            <div className="overflow-y-auto max-h-80 border border-slate-100 rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 sticky top-0">
                    <TableHead className="font-bold text-maroon text-xs">Date</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">User</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Action</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-right">Old Value</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-right">New Value</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Source Module</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Reference No</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materialHistory.length > 0 ? (
                    materialHistory.map((h: any, idx: number) => {
                      const formattedDate = formatSafeDate(h);
                      return (
                        <TableRow key={idx} className="hover:bg-slate-50 text-[11px]">
                          <TableCell className="font-mono text-slate-500 whitespace-nowrap">{formattedDate}</TableCell>
                          <TableCell className="font-semibold text-slate-700">@{h.user}</TableCell>
                          <TableCell className="font-bold text-maroon whitespace-nowrap">{h.action}</TableCell>
                          <TableCell className="text-right text-slate-500">{(Number(h.oldValue) || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-bold text-slate-800">{(Number(h.newValue) || 0).toFixed(2)}</TableCell>
                          <TableCell className="font-semibold text-teal-600">{h.sourceModule}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-650">{h.refNo}</TableCell>
                          <TableCell className="text-slate-650 max-w-[200px] break-words">{h.remarks}</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-slate-450 italic">No ledger transaction history found for this item.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setHistoryMaterial(null)} className="bg-maroon text-white hover:bg-maroon/90">
                Dismiss
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
