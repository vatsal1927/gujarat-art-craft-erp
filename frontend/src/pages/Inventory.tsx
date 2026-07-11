import { useState, useEffect, useRef, useMemo } from 'react';
import { useRawMaterials, useSaveRawMaterial, useDeleteRawMaterial, useProducts, useSaveProduct, useDeleteProduct, useConsumptionLogs, usePurchases, useJobWorks, useCollections, useLogUserAction, useActivityLogs } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { formatCurrency } from '../utils/currencyFormat';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../components/AuthGuard';
import { Plus, Trash, Edit, Settings, FileSpreadsheet, Package, AlertTriangle, CheckCircle, Search, Layers, RefreshCw, Hammer, Eye, Calendar, User, DollarSign, Upload, Image, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { formatERPDate, formatERPDateTime, safeQty } from '../utils/calculations';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { hasDeptAccess } from '../utils/auth';
import Unauthorized from './Unauthorized';
import { RawMaterial, ProductItem } from '../backend';
import { inferUnitTypeFromLegacy, createUnitConfig, validateUnitConfig, applyUnitToBOM } from '../utils/unitConfig';
import { BOMUnitRow } from '../components/inventory/BOMUnitRow';
import { CompactBOMCard } from '../components/inventory/CompactBOMCard';
import { StockAlertModal, maskPhoneNumber } from '../components/StockAlertModal';
import RawMaterialEditDrawer from '../components/RawMaterialEditDrawer';
import { parseWhatsAppNumbers, buildWhatsAppUrl, openWhatsAppLink, buildStockAlertMessage, StockAlert } from '../utils/whatsapp';
import { checkAndCreateStockAlerts, markStockAlertOpened, getStockAlertsFromStorage, saveStockAlertsToStorage } from '../services/stockAlertService';


interface BOMRow {
  materialId: string;
  quantity: number;
  qtyPerUnit?: number;
  unitConfig?: any;
  schemaVersion?: number;
}

const RawMaterialCardComponent = ({
  material: m,
  isStaff,
  canEdit,
  canDelete,
  imageUrl,
  vendorName,
  lastPurchaseDate,
  isLow,
  isOut,
  statusColor,
  statusText,
  formatCurrency,
  handleSendWhatsAppAlert,
  handleViewRawDetails,
  handleAddStockQuick,
  handleOpenRawModal,
  handleDeleteRaw,
  handleOpenAdjustStock
}: any) => {
  const [imgError, setImgError] = useState(false);

  // Resolved unit label resolution order:
  const unit = m.unit || (m as any).unitLabel || (m as any).stockUnit || (m as any).measurementUnit || 'pcs';

  // Resolved image resolution order:
  const imageSrc = m.imageUrl || m.image || m.photo || "";
  const finalImage = imgError ? "" : (imageUrl || imageSrc);

  return (
    <div key={m.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gold/20 shadow-sm hover:shadow-md hover:border-gold/60 transition-all overflow-hidden flex flex-col h-full">
      {/* Image Frame */}
      <div className="relative w-full h-[220px] bg-[#F5F1E8] flex flex-col items-center justify-center overflow-hidden">
        {finalImage ? (
          <img
            src={finalImage}
            alt={m.name}
            onError={() => setImgError(true)}
            className="w-full h-[220px] object-cover object-center"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 space-y-2 select-none">
            <Package className="h-10 w-10 text-slate-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">No Material Photo</span>
          </div>
        )}
        <Badge className={`absolute top-3 right-3 ${statusColor} border-none`}>
          {statusText}
        </Badge>
        <Badge variant="secondary" className="absolute bottom-3 left-3 bg-black/60 text-white border-none text-[10px]">
          {m.category}
        </Badge>
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">{m.name}</h4>
            <p className="text-xs text-slate-400 font-mono mt-1">ID: {m.id}</p>
          </div>

          {/* Raw Material Low Stock Warning Card */}
          {(isLow || isOut) && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-250 dark:border-yellow-900/50 rounded-lg p-3 text-yellow-800 dark:text-yellow-400 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span>⚠ Raw Material Low Stock</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                <strong>{m.name}</strong> is below the alert threshold (Stock: {m.currentStock} {unit}).
              </p>
              <Button 
                type="button"
                onClick={() => handleSendWhatsAppAlert({ id: m.id, name: m.name, currentStock: m.currentStock, minStockAlert: m.minStockAlert, unit: unit, photoUrl: m.photoUrl })}
                className="w-full mt-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-[11px] h-7 font-bold flex items-center justify-center gap-1 border-none rounded-md"
              >
                <MessageSquare className="h-3 w-3" /> Send WhatsApp Alert
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs border-t border-b border-slate-100 dark:border-slate-700 py-3">
            <div>
              <span className="text-slate-400 block font-medium">Current Stock</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">{m.currentStock} {unit}</span>
            </div>
            {isStaff ? (
              <div>
                <span className="text-slate-400 block font-medium">Min Level Alert</span>
                <span className="font-medium text-slate-600 dark:text-slate-400">{m.minStockAlert} {unit}</span>
              </div>
            ) : (
              <>
                <div>
                  <span className="text-slate-400 block font-medium">Purchase Rate</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(m.unitCost)} / {unit}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Stock Value</span>
                  <span className="font-extrabold text-maroon dark:text-saffron">{formatCurrency(m.currentStock * m.unitCost)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Min Level Alert</span>
                  <span className="font-medium text-slate-600 dark:text-slate-400">{m.minStockAlert} {unit}</span>
                </div>
              </>
            )}
          </div>

          {!isStaff && (
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Supplier:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{vendorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Last Purchase:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{lastPurchaseDate}</span>
              </div>
            </div>
          )}
        </div>

        {/* Buttons at bottom */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <Button type="button" onClick={() => handleViewRawDetails(m)} variant="outline" className="flex-1 text-[11px] h-8 px-2 border-gold text-maroon hover:bg-gold/10">
            View Details
          </Button>
          {canEdit && !isStaff && (
            <div className="flex gap-1.5">
              <Button type="button" onClick={() => handleAddStockQuick(m)} variant="outline" className="text-[10px] h-8 px-1.5 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20">
                + Stock
              </Button>
              <Button 
                type="button" 
                onClick={() => handleOpenAdjustStock(m)} 
                variant="outline" 
                className="text-[10px] h-8 px-1.5 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                title="Manual Stock Reconciliation / Adjust"
              >
                Audit
              </Button>
            </div>
          )}
          {canEdit && !isStaff && (
            <Button type="button" onClick={() => handleOpenRawModal(m)} variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600">
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canDelete && !isStaff && (
            <Button type="button" onClick={() => handleDeleteRaw(m.id, m.name)} variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-650">
              <Trash className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const Inventory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as any;
  const { actor } = useActor();

  const isBomUnitV2Enabled = import.meta.env.VITE_FEATURE_BOM_UNIT_V2 !== 'false';
  const isStaff = !!(user?.role && 'Staff' in user.role);
  const isAdmin = !!(user?.role && 'Admin' in user.role);
  const isManager = !!(user?.role && 'Manager' in user.role);

  const canViewInventory = !!(user && (isStaff || hasDeptAccess(user, ['Inventory', 'Purchase', 'Production', 'Finance'])));
  const canCreate = !!(user && !isStaff && hasDeptAccess(user, ['Inventory', 'Purchase', 'Production', 'Finance'], 'canCreate'));
  const canEdit = !!(user && !isStaff && hasDeptAccess(user, ['Inventory', 'Purchase', 'Production', 'Finance'], 'canEdit'));
  const canDelete = !!(user && !isStaff && hasDeptAccess(user, ['Inventory', 'Purchase', 'Production', 'Finance'], 'canDelete'));

  const [activeTab, setActiveTab] = useState(search.tab || 'raw-materials');

  useEffect(() => {
    if (search.tab) {
      setActiveTab(search.tab);
    }
    if (search.search) {
      setProductSearch(search.search);
    }

    // Unsplash broken images migration to trigger fallback properly
    const rawMaterialsStored = localStorage.getItem('mock_raw_materials');
    if (rawMaterialsStored) {
      try {
        let changed = false;
        const items = JSON.parse(rawMaterialsStored);
        const updated = items.map((m: any) => {
          if ((m.id === 'RM-3' || m.name === 'Silk Thread') && m.photoUrl && m.photoUrl.includes('1605810230434-7631ac76ec81')) {
            m.photoUrl = '';
            m.imageUrl = '';
            m.image = '';
            m.photo = '';
            changed = true;
          }
          if ((m.id === 'RM-4' || m.name === 'Decorative Flowers') && m.photoUrl && m.photoUrl.includes('1526047932273-341f2a7631f9')) {
            m.photoUrl = '';
            m.imageUrl = '';
            m.image = '';
            m.photo = '';
            changed = true;
          }
          return m;
        });
        if (changed) {
          localStorage.setItem('mock_raw_materials', JSON.stringify(updated));
          refetchRaw();
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [search.tab, search.search]);

  // Image storage helper
  const getImageUrl = (id: string, fallbackUrl?: string) => {
    const customImages = JSON.parse(localStorage.getItem('mock_uploaded_images') || '{}');
    return customImages[id] || fallbackUrl || 'https://images.unsplash.com/photo-1530087965147-7a72d733c56a?w=1200&h=800&fit=crop&q=90&fm=jpg';
  };

  // Queries
  const { data: rawMaterialsQuery = [], isLoading: loadingRaw, refetch: refetchRaw } = useRawMaterials({ enabled: canViewInventory && !isStaff });
  const { data: productsQuery = [], isLoading: loadingProducts, refetch: refetchProducts } = useProducts({ enabled: canViewInventory && !isStaff });
  const { data: consumptionLogs = [], isLoading: loadingLogs, refetch: refetchLogs } = useConsumptionLogs({ enabled: canViewInventory && !isStaff });
  const { data: purchases = [], isLoading: loadingPurchases } = usePurchases({ enabled: canViewInventory && !isStaff });
  const { data: jobWorks = [] } = useJobWorks({ enabled: canViewInventory && !isStaff });
  const { data: collections = [] } = useCollections({ enabled: canViewInventory && !isStaff });
  const { mutate: logUserAction } = useLogUserAction();
  const { data: activityLogs = [] } = useActivityLogs({ enabled: canViewInventory && !isStaff });

  const rawMaterials = isStaff ? ([
    { id: 'RM-1', name: 'Golden Beads', category: 'Beads', openingStock: 1000, purchasedQty: 0, consumedQty: 0, currentStock: 1000, unitCost: 0.50, unit: 'pcs', minStockAlert: 200, photoUrl: '' },
    { id: 'RM-2', name: 'Decorative Mirrors', category: 'Mirrors', openingStock: 500, purchasedQty: 0, consumedQty: 0, currentStock: 500, unitCost: 2.00, unit: 'pcs', minStockAlert: 100, photoUrl: '' },
    { id: 'RM-3', name: 'Silk Thread', category: 'Threads', openingStock: 200, purchasedQty: 0, consumedQty: 0, currentStock: 200, unitCost: 5.00, unit: 'meters', minStockAlert: 50, photoUrl: '' }
  ] as RawMaterial[]) : rawMaterialsQuery;

  const products = isStaff ? ([
    { id: 'PRD-1', vigat: 'Premium Toran', rate: 150, hsnCode: '5705', stock: 45n, productionCost: 100, bom: [], photoUrl: '' }
  ] as ProductItem[]) : productsQuery;

  const stockSignature = useMemo(() => {
    const safeP = Array.isArray(products) ? products : [];
    const safeR = Array.isArray(rawMaterials) ? rawMaterials : [];
    return [
      ...safeP.map(p => `${p.id}:${p.stock?.toString() || '0'}:${(p as any).shortageQty || 0}`),
      ...safeR.map(r => `${r.id}:${r.currentStock || 0}:${r.minStockAlert || 0}`)
    ].join("|");
  }, [products, rawMaterials]);

  const hasCheckedAlertsRef = useRef(false);

  useEffect(() => {
    if (hasCheckedAlertsRef.current) return;

    const safeP = Array.isArray(products) ? products : [];
    const safeR = Array.isArray(rawMaterials) ? rawMaterials : [];

    if (safeP.length > 0) {
      hasCheckedAlertsRef.current = true;
      checkAndCreateStockAlerts(actor, safeP, safeR).then((resolvedAlerts) => {
        setStockAlertsList(prev => {
          const next = Array.isArray(resolvedAlerts) ? resolvedAlerts : [];
          if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
          return next;
        });
      }).catch(err => {
        console.error('Failed to check and create stock alerts:', err);
      }).finally(() => {
        hasCheckedAlertsRef.current = false;
      });
    } else {
      const resolved = getStockAlertsFromStorage();
      setStockAlertsList(prev => {
        const next = Array.isArray(resolved) ? resolved : [];
        if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        return next;
      });
    }
  }, [stockSignature, actor]);

  // Mutations
  const { mutate: saveRawMaterial, isPending: isSavingRaw } = useSaveRawMaterial();
  const { mutate: deleteRawMaterial } = useDeleteRawMaterial();
  const { mutate: saveProduct, isPending: isSavingProduct } = useSaveProduct();
  const { mutate: deleteProduct } = useDeleteProduct();

  // Search & Filter States
  const [rawSearch, setRawSearch] = useState('');
  const [rawStatusFilter, setRawStatusFilter] = useState('All');
  const [rawCategoryFilter, setRawCategoryFilter] = useState('All');

  const [productSearch, setProductSearch] = useState('');
  const [productBOMFilter, setProductBOMFilter] = useState('All');
  const [productAvailabilityFilter, setProductAvailabilityFilter] = useState('All');
  const [productLimitingFilter, setProductLimitingFilter] = useState('All');
  const [simQuantity, setSimQuantity] = useState<number>(1);

  const [logSearch, setLogSearch] = useState('');
  const [logProductFilter, setLogProductFilter] = useState('All');
  const [logMaterialFilter, setLogMaterialFilter] = useState('All');
  const [logEmployeeFilter, setLogEmployeeFilter] = useState('All');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState('All');

  // Modals / Form States
  const [isRawModalOpen, setIsRawModalOpen] = useState(false);
  const [selectedEditMaterialId, setSelectedEditMaterialId] = useState<string | null>(null);
  const [rawForm, setRawForm] = useState({
    id: '',
    name: '',
    category: 'General',
    openingStock: 0,
    unitCost: 0,
    unit: 'pcs',
    minStock: 0,
    photoUrl: '',
    reorderLevel: 0,
    minimumStock: 0,
    preferredVendor: ''
  });
  const [isEditRaw, setIsEditRaw] = useState(false);
  
  // Quick View details and stock states
  const [isViewRawOpen, setIsViewRawOpen] = useState(false);
  const [selectedRaw, setSelectedRaw] = useState<any>(null);
  
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [addStockAmount, setAddStockAmount] = useState<number>(0);
  const [selectedRawForStock, setSelectedRawForStock] = useState<any>(null);

  // Manual Stock Adjustment States
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [adjustMaterial, setAdjustMaterial] = useState<any | null>(null);
  const [adjustNewStock, setAdjustNewStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Physical Audit Discrepancy');
  const [adjustNotes, setAdjustNotes] = useState<string>('');

  // FIFO Valuation Mappers
  const getFIFOBatches = (materialId: string, openingStock: number, unitCost: number) => {
    const batches: { qty: number; cost: number; date: any; source: string }[] = [];
    
    // Add opening stock batch
    if (openingStock > 0) {
      batches.push({
        qty: openingStock,
        cost: unitCost,
        date: 0,
        source: 'Opening Stock Setup'
      });
    }

    // Add purchase batches
    const matName = rawMaterials.find(m => m.id === materialId)?.name?.trim().toLowerCase();
    purchases.forEach((p: any) => {
      const matchItem = (p.items || []).find((item: any) => 
        item.materialId === materialId || 
        (item.materialName && item.materialName.trim().toLowerCase() === matName)
      );
      if (matchItem) {
        batches.push({
          qty: Number(matchItem.quantity) || 0,
          cost: Number(matchItem.rate) || 0,
          date: Number(p.date) || Date.parse(p.date) || Date.now(),
          source: `Purchase Bill No: ${p.purchaseNumber}`
        });
      }
    });

    // Sort batches chronologically
    batches.sort((a, b) => a.date - b.date);

    // Sum up total consumption logs for this material
    const totalConsumed = consumptionLogs
      .filter((c: any) => c.rawMaterialName === materialId || (c.rawMaterialName && matName && c.rawMaterialName.trim().toLowerCase() === matName))
      .reduce((sum: number, c: any) => sum + (Number(c.quantityUsed) || 0), 0);

    // Reconcile consumption against batches using FIFO
    let remainingConsumption = totalConsumed;
    const finalBatches = batches.map(b => ({ ...b }));
    
    for (let i = 0; i < finalBatches.length; i++) {
      if (remainingConsumption <= 0) break;
      const b = finalBatches[i];
      if (b.qty <= remainingConsumption) {
        remainingConsumption -= b.qty;
        b.qty = 0;
      } else {
        b.qty -= remainingConsumption;
        remainingConsumption = 0;
      }
    }

    // Return remaining batches with active quantities
    return finalBatches.filter(b => b.qty > 0);
  };

  const calculateFIFOWorth = (materialId: string, openingStock: number, unitCost: number) => {
    const activeBatches = getFIFOBatches(materialId, openingStock, unitCost);
    return activeBatches.reduce((sum, b) => sum + (b.qty * b.cost), 0);
  };

  // Reserved Stock calculations based on active Job Works BOM requirements
  const getReservedStock = (materialId: string) => {
    let reserved = 0;
    const matName = rawMaterials.find(m => m.id === materialId)?.name?.trim().toLowerCase();
    
    // Find active job works (not completed / progress < 100)
    jobWorks.forEach((job: any) => {
      const isCompleted = job.status === 'Received' || job.status === 'Completed';
      if (!isCompleted) {
        // Find corresponding product for this job work
        const product = products.find((p: any) => p.name === job.productName || p.id === job.productId);
        if (product && product.bom) {
          const bomItem = (product.bom || []).find((b: any) => 
            b.materialId === materialId || 
            (b.materialName && matName && b.materialName.trim().toLowerCase() === matName)
          );
          if (bomItem) {
            // Pending quantity to produce
            const qtyGiven = Number(job.qtyGiven || job.quantity || 0);
            const qtyReceived = Number(job.qtyReceived || 0);
            const pendingQty = Math.max(0, qtyGiven - qtyReceived);
            
            // Required quantity per product unit
            const rate = Number(bomItem.quantity) || 0;
            reserved += pendingQty * rate;
          }
        }
      }
    });

    return reserved;
  };

  // Finished Good Product Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isEditProduct, setIsEditProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    id: '',
    vigat: '',
    rate: 0,
    hsnCode: '5609',
    stock: 0,
    productionCost: 0,
    photoUrl: ''
  });

  // Dynamic View BOM Details state
  const [isViewBOMOpen, setIsViewBOMOpen] = useState(false);
  const [selectedProductForBOM, setSelectedProductForBOM] = useState<any>(null);

  // BOM Configurator Modal State
  const [isBOMModalOpen, setIsBOMModalOpen] = useState(false);
  const [bomProduct, setBomProduct] = useState<any>(null);
  const [bomRows, setBomRows] = useState<BOMRow[]>([]);

  const [laborCostInput, setLaborCostInput] = useState<number>(0);
  const [bomPortalContainer, setBomPortalContainer] = useState<HTMLDivElement | null>(null);

  // WhatsApp Alert selection states
  const [waAlertNumbers, setWaAlertNumbers] = useState<string[]>([]);
  const [waSelectedAlert, setWaSelectedAlert] = useState<StockAlert | null>(null);
  const [isWaNumberSelectOpen, setIsWaNumberSelectOpen] = useState(false);
  const [stockAlertsList, setStockAlertsList] = useState<StockAlert[]>([]);

  const stockAlertsArray = Array.isArray(stockAlertsList) ? stockAlertsList : [];

  const deriveAlertScope = (alert: any): "RAW_MATERIAL" | "FINISHED_GOODS" => {
    if (!alert) return "FINISHED_GOODS";
    if (alert.alertScope) return alert.alertScope;
    if (alert.alertType && alert.alertType.startsWith("RAW_MATERIAL")) return "RAW_MATERIAL";
    if (alert.productId && alert.productId.startsWith("RM-")) return "RAW_MATERIAL";
    return "FINISHED_GOODS";
  };

  const rawMaterialAlerts = stockAlertsArray.filter(alert => {
    if (!alert) return false;
    return deriveAlertScope(alert) === "RAW_MATERIAL" && alert.status === "PENDING";
  });

  const finishedGoodsAlerts = stockAlertsArray.filter(alert => {
    if (!alert) return false;
    return deriveAlertScope(alert) === "FINISHED_GOODS" && alert.status === "PENDING";
  });

  console.log(`[StockAlerts] raw alerts count: ${stockAlertsArray.length}`);
  console.log(`[StockAlerts] visible alerts count (Raw Materials): ${rawMaterialAlerts.length}`);
  console.log(`[StockAlerts] visible alerts count (Finished Goods): ${finishedGoodsAlerts.length}`);

  if (!user) return null;
  if (!canViewInventory) {
    return <Unauthorized />;
  }

  const getProductExtraCosts = (productId: string) => {
    const defaults: { [key: string]: { laborCost: number } } = {
      '1': { laborCost: 30 }, // Premium Toran
      '2': { laborCost: 50 }, // Royal Toran
    };
    const stored = JSON.parse(localStorage.getItem('mock_product_extra_costs') || '{}');
    return stored[productId] || defaults[productId] || { laborCost: 0 };
  };

  const calculateProductLaborCost = (productId: string, productName: string) => {
    const productCollections = collections.filter((c: any) => c.productName === productName);
    const settingsStored = localStorage.getItem('mock_settings');
    const settings = settingsStored ? JSON.parse(settingsStored) : { enableRejectedWage: false };
    
    let totalWages = 0;
    let totalAccepted = 0;
    
    productCollections.forEach((c: any) => {
      const j = jobWorks.find((job: any) => job.id.toString() === c.jobWorkNo.toString());
      const rate = j ? safeQty(j.ratePerPiece) : 0;
      const accepted = safeQty(c.acceptedQty);
      const rejected = safeQty(c.rejectedQty);
      
      const wageBase = settings.enableRejectedWage ? (accepted + rejected) : accepted;
      totalWages += wageBase * rate;
      totalAccepted += accepted;
    });
    
    if (totalAccepted > 0) {
      return totalWages / totalAccepted;
    }
    
    const productJobs = jobWorks.filter((j: any) => j.productName === productName);
    if (productJobs.length > 0) {
      const latestJob = [...productJobs].sort((a: any, b: any) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0))[0];
      return safeQty(latestJob.ratePerPiece);
    }
    
    const stored = JSON.parse(localStorage.getItem('mock_product_extra_costs') || '{}');
    if (stored[productId] && typeof stored[productId].laborCost === 'number') {
      return stored[productId].laborCost;
    }
    
    const defaults: { [key: string]: number } = {
      'PRD-1': 30,
      'PRD-2': 50,
      '1': 30,
      '2': 50
    };
    return defaults[productId] || defaults[productId.replace('PRD-', '')] || 0;
  };


  // Raw Material Actions
  const handleOpenRawModal = (editMat?: any) => {
    const isAllowed = editMat ? canEdit : canCreate;
    if (!isAllowed) return;
    if (editMat) {
      setSelectedEditMaterialId(editMat.id);
      setIsEditRaw(true);
      setRawForm({
        id: editMat.id,
        name: editMat.name,
        category: editMat.category,
        openingStock: editMat.openingStock,
        unitCost: editMat.unitCost,
        unit: editMat.unit,
        minStock: editMat.minStockAlert,
        photoUrl: getImageUrl(editMat.id, editMat.photoUrl) || '',
        reorderLevel: editMat.reorderLevel || 0,
        minimumStock: editMat.minimumStock || 0,
        preferredVendor: editMat.preferredVendor || ''
      });
    } else {
      setSelectedEditMaterialId(null);
      setIsEditRaw(false);
      const nextId = `RM-${rawMaterials.length + 1}`;
      setRawForm({
        id: nextId,
        name: '',
        category: 'General',
        openingStock: 0,
        unitCost: 0,
        unit: 'pcs',
        minStock: 100,
        photoUrl: '',
        reorderLevel: 150,
        minimumStock: 50,
        preferredVendor: ''
      });
    }
    setIsRawModalOpen(true);
  };

  const handleViewRawDetails = (mat: any) => {
    setSelectedRaw(mat);
    setIsViewRawOpen(true);
  };

  const handleExecuteSendAlert = async (phone: string) => {
    if (!waSelectedAlert) return;

    await markStockAlertOpened(actor, waSelectedAlert.id, phone);
    openWhatsAppLink(phone, waSelectedAlert.message);
    setStockAlertsList(getStockAlertsFromStorage());
  };

  const handleExecuteSendToAll = async () => {
    if (!waSelectedAlert || waAlertNumbers.length === 0) return;

    waAlertNumbers.forEach(phone => {
      openWhatsAppLink(phone, waSelectedAlert.message);
    });

    await markStockAlertOpened(actor, waSelectedAlert.id, waAlertNumbers[0]);
    setStockAlertsList(getStockAlertsFromStorage());
  };

  const handleSendWhatsAppAlert = async (product: any) => {
    const settingsStored = localStorage.getItem('mock_settings');
    const settingsObj = settingsStored ? JSON.parse(settingsStored) : null;
    let ownerPhoneStr = '';
    if (settingsObj && settingsObj.businessInfo) {
      const parts = settingsObj.businessInfo.split('|');
      ownerPhoneStr = parts[2] || '';
    }

    if (!ownerPhoneStr) {
      toast.error('Please configure WhatsApp alert numbers in Settings.');
      return;
    }

    const numbers = parseWhatsAppNumbers(ownerPhoneStr);
    if (numbers.length === 0) {
      toast.error('Please configure a valid WhatsApp alert number in Settings.');
      return;
    }

    // Try finding existing alert for this product/raw material
    let alert = stockAlertsList.find(a => a.productId === product.id);

    if (!alert) {
      const currentStock = Number(product.stock !== undefined ? product.stock : (product.currentStock || 0));
      const shortageQty = Number(product.shortageQty || 0);
      const isRaw = product.minStockAlert !== undefined;
      const alertType = isRaw ? 'RAW_MATERIAL_LOW_STOCK' : (shortageQty > 0 ? 'SHORTAGE' : (currentStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'));

      alert = {
        id: `MANUAL-ALERT-${Date.now()}`,
        productId: product.id,
        productName: product.vigat || product.name,
        productCode: product.id,
        productImage: product.photoUrl || '',
        alertScope: isRaw ? 'RAW_MATERIAL' : 'FINISHED_GOODS',
        alertType,
        currentStock,
        minStockLevel: isRaw ? Number(product.minStockAlert) : undefined,
        shortageQty: shortageQty > 0 ? shortageQty : undefined,
        productionRequiredQty: shortageQty > 0 ? shortageQty : undefined,
        unit: product.unit || 'pcs',
        message: '',
        recipients: numbers,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      alert.message = buildStockAlertMessage(alert);
    }

    setWaAlertNumbers(numbers);
    setWaSelectedAlert(alert);
    setIsWaNumberSelectOpen(true);
  };

  const handleAddStockQuick = (mat: any) => {
    setSelectedRawForStock(mat);
    setAddStockAmount(0);
    setIsAddStockOpen(true);
  };

  const handleSaveQuickStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error('Permission denied: You do not have permission to adjust stock');
      return;
    }
    if (!selectedRawForStock || addStockAmount <= 0) {
      toast.error('Please enter a valid stock quantity to add');
      return;
    }

    const currentOpening = Number(selectedRawForStock.openingStock || 0);
    const newOpening = currentOpening + addStockAmount;

    saveRawMaterial({
      id: selectedRawForStock.id,
      name: selectedRawForStock.name,
      category: selectedRawForStock.category,
      openingStock: newOpening,
      unitCost: Number(selectedRawForStock.unitCost),
      unit: selectedRawForStock.unit,
      minStock: Number(selectedRawForStock.minStockAlert)
    }, {
      onSuccess: () => {
        toast.success(`Successfully added ${addStockAmount} ${selectedRawForStock.unit} to stock!`);
        setIsAddStockOpen(false);
        setAddStockAmount(0);
        setSelectedRawForStock(null);
        refetchRaw();
      },
      onError: (err) => {
        toast.error(`Failed to add stock: ${err.message}`);
      }
    });
  };

  const handleSaveStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error('Permission denied: You do not have permission to adjust stock');
      return;
    }
    if (!adjustMaterial) {
      toast.error('No raw material selected');
      return;
    }

    const mat = adjustMaterial;
    const oldStock = Number(mat.currentStock) || 0;
    const delta = adjustNewStock - oldStock;
    const purchased = Number(mat.purchasedQty) || 0;
    const consumed = Number(mat.consumedQty) || 0;
    
    // Recalculate opening stock to satisfy equation: adjustNewStock = newOpening + purchased - consumed
    const newOpening = adjustNewStock - purchased + consumed;

    saveRawMaterial({
      id: mat.id,
      name: mat.name,
      category: mat.category,
      openingStock: newOpening,
      unitCost: Number(mat.unitCost),
      unit: mat.unit,
      minStock: Number(mat.minStockAlert)
    }, {
      onSuccess: () => {
        // Log manual adjustment audit action
        logUserAction({
          action: `Manual Stock Adjustment (${adjustReason})`,
          details: `Adjusted stock of ${mat.name} (${mat.id}) from ${oldStock.toFixed(2)} to ${adjustNewStock.toFixed(2)} (delta: ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}). Reason: ${adjustReason}. Notes: ${adjustNotes || 'None'}`
        });

        toast.success(`Successfully adjusted stock count to ${adjustNewStock} ${mat.unit}!`);
        setIsAdjustStockOpen(false);
        setAdjustMaterial(null);
        setAdjustNewStock(0);
        setAdjustNotes('');
        refetchRaw();
      },
      onError: (err) => {
        toast.error(`Adjustment failed: ${err.message}`);
      }
    });
  };

  const handleOpenAdjustStock = (mat: any) => {
    setAdjustMaterial(mat);
    setAdjustNewStock(mat.currentStock);
    setAdjustReason('Physical Audit Discrepancy');
    setAdjustNotes('');
    setIsAdjustStockOpen(true);
  };

  const handleGenerateDemo = async () => {
    if (!actor) return;
    const toastId = toast.loading('Generating demo consumption logs...');
    try {
      const msg = await (actor as any).generateDemoConsumptionLogs();
      toast.success(msg, { id: toastId });
      refetchRaw();
      refetchProducts();
      refetchLogs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate demo logs', { id: toastId });
    }
  };

  const handleSaveRaw = (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = isEditRaw;
    const isAllowed = isEditing ? canEdit : canCreate;
    if (!isAllowed) {
      toast.error(`Permission denied: You do not have permission to ${isEditing ? 'edit' : 'create'} raw materials`);
      return;
    }
    if (!rawForm.id.trim() || !rawForm.name.trim()) {
      toast.error('Material ID and Name are required');
      return;
    }

    // Save image to localStorage mapping
    const customImages = JSON.parse(localStorage.getItem('mock_uploaded_images') || '{}');
    if (rawForm.photoUrl) {
      customImages[rawForm.id] = rawForm.photoUrl;
    } else {
      delete customImages[rawForm.id];
    }
    localStorage.setItem('mock_uploaded_images', JSON.stringify(customImages));

    saveRawMaterial({
      id: rawForm.id,
      name: rawForm.name,
      category: rawForm.category,
      openingStock: Number(rawForm.openingStock),
      unitCost: Number(rawForm.unitCost),
      unit: rawForm.unit,
      minStock: Number(rawForm.minStock),
      reorderLevel: Number((rawForm as any).reorderLevel || 0),
      minimumStock: Number((rawForm as any).minimumStock || 0),
      preferredVendor: (rawForm as any).preferredVendor || ''
    }, {
      onSuccess: () => {
        toast.success(`Raw Material ${rawForm.name} saved successfully!`);
        setIsRawModalOpen(false);
        refetchRaw();
      },
      onError: (err) => {
        toast.error(`Failed to save: ${err.message}`);
      }
    });
  };

  const handleDeleteRaw = (id: string, name: string) => {
    if (!canDelete) return;
    if (window.confirm(`Are you sure you want to delete raw material "${name}"?`)) {
      deleteRawMaterial(id, {
        onSuccess: () => {
          toast.success(`Deleted raw material "${name}"`);
          refetchRaw();
        },
        onError: (err) => {
          toast.error(`Failed to delete: ${err.message}`);
        }
      });
    }
  };

  // Finished Product Actions
  const handleOpenProductModal = (editProd?: any) => {
    const isAllowed = editProd ? canEdit : canCreate;
    if (!isAllowed) return;
    if (editProd) {
      setIsEditProduct(true);
      setProductForm({
        id: editProd.id,
        vigat: editProd.vigat,
        rate: editProd.rate,
        hsnCode: editProd.hsnCode,
        stock: Number(editProd.stock),
        productionCost: editProd.productionCost || 0,
        photoUrl: getImageUrl(editProd.id, editProd.photoUrl) || ''
      });
    } else {
      setIsEditProduct(false);
      const nextId = (products.reduce((max, p) => Math.max(max, parseInt(p.id) || 0), 0) + 1).toString();
      setProductForm({
        id: nextId,
        vigat: '',
        rate: 0,
        hsnCode: '5609',
        stock: 0,
        productionCost: 0,
        photoUrl: ''
      });
    }
    setIsProductModalOpen(true);
  };

  const handleViewBOMDetails = (product: any) => {
    setSelectedProductForBOM(product);
    setIsViewBOMOpen(true);
  };

  const handleRunConsumptionTest = async (product: any) => {
    if (!actor) return;
    const toastId = toast.loading(`Running BOM consumption test for ${product.vigat}...`);
    try {
      const msg = await (actor as any).runProductConsumptionTest(product.id, product.vigat);
      toast.success(msg, { id: toastId });
      refetchRaw();
      refetchProducts();
      refetchLogs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to run consumption test', { id: toastId });
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = isEditProduct;
    const isAllowed = isEditing ? canEdit : canCreate;
    if (!isAllowed) {
      toast.error(`Permission denied: You do not have permission to ${isEditing ? 'edit' : 'create'} products`);
      return;
    }
    if (!productForm.id.trim() || !productForm.vigat.trim()) {
      toast.error('Product Code and Name (Vigat) are required');
      return;
    }

    // Save image to localStorage mapping
    if (productForm.photoUrl) {
      const customImages = JSON.parse(localStorage.getItem('mock_uploaded_images') || '{}');
      customImages[productForm.id] = productForm.photoUrl;
      localStorage.setItem('mock_uploaded_images', JSON.stringify(customImages));
    }

    // Keep existing BOM if editing
    const existing = products.find(p => p.id === productForm.id);
    const bom = existing ? existing.bom : [];

    saveProduct({
      id: productForm.id,
      vigat: productForm.vigat,
      rate: Number(productForm.rate),
      hsnCode: productForm.hsnCode,
      stock: BigInt(productForm.stock),
      productionCost: Number(productForm.productionCost),
      bom: bom
    }, {
      onSuccess: () => {
        toast.success(`Finished Good "${productForm.vigat}" saved!`);
        setIsProductModalOpen(false);
        refetchProducts();
      },
      onError: (err) => {
        toast.error(`Failed to save: ${err.message}`);
      }
    });
  };

  const handleDeleteProduct = (id: string, vigat: string) => {
    if (!canDelete) return;
    if (window.confirm(`Are you sure you want to delete finished product "${vigat}"?`)) {
      deleteProduct(id, {
        onSuccess: () => {
          toast.success(`Deleted finished good "${vigat}"`);
          refetchProducts();
        },
        onError: (err) => {
          toast.error(`Failed to delete: ${err.message}`);
        }
      });
    }
  };

  // BOM Configuration Actions
  const handleOpenBOM = (prod: any) => {
    if (!canEdit) return;
    setBomProduct(prod);
    
    if (isBomUnitV2Enabled) {
      setBomRows(prod.bom.map((b: any) => {
        const isV2 = b.schemaVersion === 2;
        const mat = rawMaterials.find((m: any) => m.id === b.materialId);
        const legacyUnit = b.legacyUnit || mat?.unit || 'pcs';
        const inferredType = inferUnitTypeFromLegacy(legacyUnit);
        
        return {
          materialId: b.materialId,
          quantity: b.quantity || 0,
          qtyPerUnit: isV2 && b.qtyPerUnit !== undefined ? b.qtyPerUnit : b.quantity,
          unitConfig: isV2 && b.unitConfig ? b.unitConfig : {
            label: legacyUnit || 'Piece',
            type: inferredType,
            symbol: legacyUnit || 'pcs',
            conversionToBase: 1
          },
          schemaVersion: 2
        };
      }));
    } else {
      setBomRows(prod.bom.map((b: any) => ({ materialId: b.materialId, quantity: b.quantity })));
    }
    
    // Load extra costs or calculate from production
    const prodLaborCost = calculateProductLaborCost(prod.id, prod.vigat);
    setLaborCostInput(prodLaborCost);
    
    setIsBOMModalOpen(true);
  };

  const handleAddBOMRow = () => {
    if (isBomUnitV2Enabled) {
      setBomRows([...bomRows, {
        materialId: '',
        quantity: 0,
        qtyPerUnit: 0,
        unitConfig: {
          label: 'Piece',
          type: 'count',
          symbol: 'pcs',
          conversionToBase: 1
        },
        schemaVersion: 2
      }]);
    } else {
      setBomRows([...bomRows, { materialId: '', quantity: 0 }]);
    }
  };

  const handleRemoveBOMRow = (index: number) => {
    setBomRows(bomRows.filter((_, idx) => idx !== index));
  };

  const handleUpdateBOMRow = (index: number, updates: Partial<BOMRow>) => {
    setBomRows(bomRows.map((row, idx) => idx === index ? { ...row, ...updates } : row));
  };

  const handleSaveBOM = () => {
    if (!bomProduct) return;
    
    const matIds = bomRows.map(r => r.materialId).filter(Boolean);
    const hasDuplicates = new Set(matIds).size !== matIds.length;
    if (hasDuplicates) {
      toast.error('Duplicate raw material entries are not allowed');
      return;
    }

    let invalid = false;
    let validationError: string | undefined;
    let finalBOM: any[] = bomRows;

    if (isBomUnitV2Enabled) {
      finalBOM = bomRows.map(row => {
        const mat = rawMaterials.find(m => m.id === row.materialId);
        if (!mat) {
          invalid = true;
          return row;
        }
        
        if (!row.qtyPerUnit || row.qtyPerUnit <= 0) {
          validationError = `Quantity for material ${mat.name} must be greater than 0`;
          invalid = true;
        }
        
        if (!row.unitConfig?.label || row.unitConfig.label.length < 2 || row.unitConfig.label.length > 24) {
          validationError = `Unit Label for ${mat.name} must be between 2 and 24 characters`;
          invalid = true;
        }

        if (!row.unitConfig?.symbol || row.unitConfig.symbol.length < 1 || row.unitConfig.symbol.length > 8) {
          validationError = `Unit Symbol for ${mat.name} must be between 1 and 8 characters`;
          invalid = true;
        }

        const valRes = validateUnitConfig(row.unitConfig, mat.unit, mat.id);
        if (!valRes.allowed) {
          validationError = `${mat.name}: ${valRes.error}`;
          invalid = true;
        }

        return applyUnitToBOM(row, mat, row.unitConfig, row.qtyPerUnit || 0);
      });

      if (invalid) {
        toast.error(validationError || 'All BOM items must have valid configurator properties configured');
        return;
      }
    } else {
      invalid = bomRows.some(row => !row.materialId || row.quantity <= 0);
      if (invalid) {
        toast.error('All BOM items must have a valid raw material selected and quantity > 0');
        return;
      }
    }

    // Save extra costs to localStorage
    const stored = JSON.parse(localStorage.getItem('mock_product_extra_costs') || '{}');
    stored[bomProduct.id] = {
      laborCost: laborCostInput
    };
    localStorage.setItem('mock_product_extra_costs', JSON.stringify(stored));

    saveProduct({
      id: bomProduct.id,
      vigat: bomProduct.vigat,
      rate: bomProduct.rate,
      hsnCode: bomProduct.hsnCode,
      stock: bomProduct.stock,
      productionCost: laborCostInput,
      bom: finalBOM
    }, {
      onSuccess: () => {
        toast.success(`Bill of Materials updated for ${bomProduct.vigat}`);
        setIsBOMModalOpen(false);
        refetchProducts();
      },
      onError: (err) => {
        toast.error(`Failed to save BOM: ${err.message}`);
      }
    });
  };

  const handleAddMaterialToBOM = (prod: any) => {
    setBomProduct(prod);
    
    const initialRows = isBomUnitV2Enabled ? prod.bom.map((b: any) => {
      const isV2 = b.schemaVersion === 2;
      const mat = rawMaterials.find((m: any) => m.id === b.materialId);
      const legacyUnit = b.legacyUnit || mat?.unit || 'pcs';
      const inferredType = inferUnitTypeFromLegacy(legacyUnit);
      
      return {
        materialId: b.materialId,
        quantity: b.quantity || 0,
        qtyPerUnit: isV2 && b.qtyPerUnit !== undefined ? b.qtyPerUnit : b.quantity,
        unitConfig: isV2 && b.unitConfig ? b.unitConfig : {
          label: legacyUnit || 'Piece',
          type: inferredType,
          symbol: legacyUnit || 'pcs',
          conversionToBase: 1
        },
        schemaVersion: 2
      };
    }) : prod.bom.map((b: any) => ({ materialId: b.materialId, quantity: b.quantity }));

    if (isBomUnitV2Enabled) {
      setBomRows([...initialRows, {
        materialId: '',
        quantity: 0,
        qtyPerUnit: 0,
        unitConfig: {
          label: 'Piece',
          type: 'count',
          symbol: 'pcs',
          conversionToBase: 1
        },
        schemaVersion: 2
      }]);
    } else {
      setBomRows([...initialRows, { materialId: '', quantity: 0 }]);
    }
    
    const prodLaborCost = calculateProductLaborCost(prod.id, prod.vigat);
    setLaborCostInput(prodLaborCost);
    
    setIsBOMModalOpen(true);
  };

  const getProductAvailability = (p: ProductItem) => {
    if (!p.bom || p.bom.length === 0) {
      return {
        status: 'No BOM',
        maxProducible: 0,
        limitingMaterial: null,
        bomCost: 0,
        materials: []
      };
    }

    let maxProducible = Infinity;
    let limitingMaterial: any = null;
    let bomCost = 0;
    const materials = p.bom.map((req: any) => {
      const mat = rawMaterials.find(m => m.id === req.materialId);
      const currentStock = mat ? mat.currentStock : 0;
      const baseUnit = mat ? mat.unit : 'pcs';
      const unitCost = mat ? mat.unitCost : 0;
      
      const isV2 = req.schemaVersion === 2;
      const conversion = isV2 && req.unitConfig?.conversionToBase ? req.unitConfig.conversionToBase : 1;
      
      const reqQtyBase = isV2 && req.qtyPerUnitBase !== undefined ? req.qtyPerUnitBase : req.quantity;
      const reqQtyDisplay = isV2 && req.qtyPerUnit !== undefined ? req.qtyPerUnit : req.quantity;
      const customSymbol = isV2 && req.unitConfig ? req.unitConfig.symbol : baseUnit;
      const customLabel = isV2 && req.unitConfig ? req.unitConfig.label : baseUnit;

      bomCost += reqQtyBase * unitCost;

      const producible = reqQtyBase > 0 ? Math.floor(currentStock / reqQtyBase) : Infinity;

      if (producible < maxProducible) {
        maxProducible = producible;
        limitingMaterial = mat;
      }

      const isShort = currentStock < reqQtyBase;
      const isLow = mat ? (currentStock <= mat.minStockAlert) : false;

      let matStatus: 'Enough' | 'Low' | 'Short' = 'Enough';
      if (isShort) {
        matStatus = 'Short';
      } else if (isLow) {
        matStatus = 'Low';
      }

      const displayAvailable = currentStock / conversion;

      return {
        id: req.materialId,
        name: mat ? mat.name : req.materialId,
        required: reqQtyDisplay,
        available: displayAvailable,
        unit: customSymbol,
        unitCost,
        status: matStatus,
        producible
      };
    });

    if (maxProducible === Infinity) {
      maxProducible = 0;
    }

    const hasShortage = materials.some(m => m.status === 'Short');
    const hasLowStock = materials.some(m => m.status === 'Low');

    let status: 'Ready' | 'Low Stock' | 'Insufficient Materials' = 'Ready';
    if (hasShortage || maxProducible === 0) {
      status = 'Insufficient Materials';
    } else if (hasLowStock || maxProducible < 5) {
      status = 'Low Stock';
    }

    return {
      status,
      maxProducible,
      limitingMaterial,
      bomCost,
      materials
    };
  };

  const getCustomSymbolAndQty = (productName: string, rawMaterialName: string, quantityUsed: number, fallbackUnit: string) => {
    if (!isBomUnitV2Enabled) return { symbol: fallbackUnit, qty: quantityUsed };
    const prod = products.find((p: any) => p.vigat === productName);
    if (prod && prod.bom) {
      const req = prod.bom.find((b: any) => {
        const mat = rawMaterials.find(m => m.id === b.materialId);
        return (mat && mat.name === rawMaterialName) || b.materialId === rawMaterialName;
      });
      if (req && req.schemaVersion === 2 && req.unitConfig) {
        const conversion = req.unitConfig.conversionToBase || 1;
        return {
          symbol: req.unitConfig.symbol,
          qty: quantityUsed / conversion
        };
      }
    }
    return { symbol: fallbackUnit, qty: quantityUsed };
  };

  const getLogMaterialInfo = (rawMaterialName: string, quantityUsed: number) => {
    const mat = rawMaterials.find(m => m.name === rawMaterialName);
    const currentStock = mat ? mat.currentStock : 0;
    const minAlert = mat ? mat.minStockAlert : 0;
    const unit = mat ? mat.unit : 'pcs';

    const stockAfter = currentStock;
    const stockBefore = currentStock + quantityUsed;

    let status: 'Enough' | 'Low' | 'Short' = 'Enough';
    if (stockAfter < 0) {
      status = 'Short';
    } else if (stockAfter <= minAlert) {
      status = 'Low';
    }

    return {
      unit,
      stockBefore,
      stockAfter,
      status
    };
  };

  const handleSimulateConsumption = (product: any) => {
    setSelectedProductForBOM(product);
    setSimQuantity(10); // default simulation of 10 items
    setIsViewBOMOpen(true);
  };

  // Material vendor lookup
  const getMaterialVendorInfo = (materialId: string) => {
    let vendorName = '';
    let lastPurchaseDate = '';

    const materialPurchases = [...purchases]
      .filter(p => p.items.some(item => item.materialId === materialId))
      .sort((a, b) => Number(b.date - a.date));

    if (materialPurchases.length > 0) {
      const lastP = materialPurchases[0];
      vendorName = lastP.vendorName;
      lastPurchaseDate = formatERPDate(lastP.date);
    } else {
      if (materialId === 'RM-1') {
        vendorName = 'Ambika Beads';
        lastPurchaseDate = '06/05/2026';
      } else if (materialId === 'RM-2') {
        vendorName = 'Karan Mirror House';
        lastPurchaseDate = '10/05/2026';
      } else if (materialId === 'RM-3') {
        vendorName = 'Gujarat Threads';
        lastPurchaseDate = '15/05/2026';
      } else if (materialId === 'RM-4') {
        vendorName = 'Rajlaxmi Flowers';
        lastPurchaseDate = '20/05/2026';
      } else {
        vendorName = 'General Vendor';
        lastPurchaseDate = 'N/A';
      }
    }

    return { vendorName, lastPurchaseDate };
  };

  // Log grouping helper
  interface GroupedConsumptionLog {
    key: string;
    productName: string;
    productId?: string;
    productPhotoUrl?: string;
    jobWorkNo: string;
    batchNo: string;
    date: string;
    employee: string;
    status: string;
    acceptedQty: number;
    rawMaterials: Array<{
      rawMaterialName: string;
      quantityUsed: number;
      unit: string;
      unitCost: number;
      cost: number;
    }>;
    totalCost: number;
    totalQuantityUsed: number;
  }

  const groupConsumptionLogs = (logs: any[]): GroupedConsumptionLog[] => {
    const groups: { [key: string]: GroupedConsumptionLog } = {};

    logs.forEach(log => {
      const batch = log.batchNo || 'N/A';
      const job = log.jobWorkNo || 'N/A';
      const prod = log.productName || 'Unknown Product';
      const key = `${prod}-${batch}-${job}`;

      if (!groups[key]) {
        const matchingProduct = products.find(p => p.vigat === log.productName || p.id === log.productName);
        const productId = matchingProduct ? matchingProduct.id : undefined;
        const productPhotoUrl = matchingProduct ? getImageUrl(matchingProduct.id, matchingProduct.photoUrl) : undefined;

        groups[key] = {
          key,
          productName: prod,
          productId,
          productPhotoUrl,
          jobWorkNo: job,
          batchNo: batch,
          date: log.date.toString(),
          employee: log.employee || 'System',
          status: log.status || 'Stock Updated',
          acceptedQty: safeQty(log.acceptedQty),
          rawMaterials: [],
          totalCost: 0,
          totalQuantityUsed: 0
        };
      }

      const qtyUsed = safeQty(log.quantityUsed);
      const logCost = safeQty(log.cost);
      const unitCost = safeQty(log.unitCost, qtyUsed > 0 ? logCost / qtyUsed : 0);

      groups[key].rawMaterials.push({
        rawMaterialName: log.rawMaterialName,
        quantityUsed: qtyUsed,
        unit: log.unit,
        unitCost,
        cost: logCost
      });

      groups[key].totalCost += logCost;
      groups[key].totalQuantityUsed += qtyUsed;

      if (safeQty(log.acceptedQty) > 0 && !groups[key].acceptedQty) {
        groups[key].acceptedQty = safeQty(log.acceptedQty);
      }
    });

    return Object.values(groups).sort((a, b) => Number(b.date) - Number(a.date));
  };

  // Search filter lists
  const filteredRaw = rawMaterials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(rawSearch.toLowerCase()) ||
      m.category.toLowerCase().includes(rawSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(rawSearch.toLowerCase());
      
    const matchesCategory = rawCategoryFilter === 'All' || m.category === rawCategoryFilter;
    
    let matchesStatus = true;
    const isLow = m.currentStock <= m.minStockAlert && m.currentStock > 0;
    const isOut = m.currentStock <= 0;
    if (rawStatusFilter === 'In Stock') {
      matchesStatus = !isLow && !isOut;
    } else if (rawStatusFilter === 'Low Stock') {
      matchesStatus = isLow;
    } else if (rawStatusFilter === 'Out of Stock') {
      matchesStatus = isOut;
    }
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.vigat.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(productSearch.toLowerCase());
      
    const hasBOM = p.bom && p.bom.length > 0;
    let matchesBOM = true;
    if (productBOMFilter === 'Configured') {
      matchesBOM = hasBOM;
    } else if (productBOMFilter === 'Not Configured') {
      matchesBOM = !hasBOM;
    }
    
    if (!matchesSearch || !matchesBOM) return false;

    const avail = getProductAvailability(p);

    if (productAvailabilityFilter !== 'All') {
      if (productAvailabilityFilter === 'Ready' && avail.status !== 'Ready') return false;
      if (productAvailabilityFilter === 'Low Stock' && avail.status !== 'Low Stock') return false;
      if (productAvailabilityFilter === 'Insufficient Materials' && avail.status !== 'Insufficient Materials') return false;
    }

    if (productLimitingFilter !== 'All') {
      if (!avail.limitingMaterial) return false;
      const limitingName = avail.limitingMaterial.name.toLowerCase();
      if (!limitingName.includes(productLimitingFilter.toLowerCase())) return false;
    }

    return true;
  });

  const groupedLogs = groupConsumptionLogs(consumptionLogs);

  const filteredGroupedLogs = groupedLogs.filter(group => {
    const matchesSearch = logSearch === '' || 
      group.productName.toLowerCase().includes(logSearch.toLowerCase()) ||
      group.employee.toLowerCase().includes(logSearch.toLowerCase()) ||
      group.jobWorkNo.toLowerCase().includes(logSearch.toLowerCase()) ||
      group.batchNo.toLowerCase().includes(logSearch.toLowerCase()) ||
      group.rawMaterials.some(m => m.rawMaterialName.toLowerCase().includes(logSearch.toLowerCase()));

    const matchesProduct = logProductFilter === 'All' || group.productName === logProductFilter;
    const matchesEmployee = logEmployeeFilter === 'All' || group.employee === logEmployeeFilter;
    
    const matchesMaterial = logMaterialFilter === 'All' || 
      group.rawMaterials.some(m => m.rawMaterialName === logMaterialFilter);
      
    let matchesStatus = true;
    if (logStatusFilter !== 'All') {
      matchesStatus = group.status === logStatusFilter;
    }

    let matchesDate = true;
    const logTimeMs = Number(group.date) / 1000000;
    if (logStartDate) {
      const startMs = new Date(logStartDate).getTime();
      if (logTimeMs < startMs) matchesDate = false;
    }
    if (logEndDate) {
      const endMs = new Date(logEndDate).getTime() + 24 * 60 * 60 * 1000 - 1;
      if (logTimeMs > endMs) matchesDate = false;
    }

    return matchesSearch && matchesProduct && matchesEmployee && matchesMaterial && matchesStatus && matchesDate;
  });

  // Valuation sums
  const rawValuation = rawMaterials.reduce((sum, m) => sum + (m.currentStock * m.unitCost), 0);
  const finishedValuation = products.reduce((sum, p) => sum + (Number(p.stock) * p.productionCost), 0);

  // Distinct Filter values lists
  const distinctRawCategories = ['All', ...Array.from(new Set(rawMaterials.map(m => m.category))).filter(Boolean)];
  const distinctLogProducts = ['All', ...Array.from(new Set(consumptionLogs.map(log => log.productName))).filter(Boolean)];
  const distinctLogMaterials = ['All', ...Array.from(new Set(consumptionLogs.map(log => log.rawMaterialName))).filter(Boolean)];
  const distinctLogEmployees = ['All', ...Array.from(new Set(consumptionLogs.map(log => log.employee))).filter(Boolean)];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-maroon flex items-center gap-2">
            <Package className="h-8 w-8 text-saffron" /> Stock & Inventory Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Manage raw material requirements, configure Bill of Materials (BOM), and audit consumption patterns.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              refetchRaw();
              refetchProducts();
              refetchLogs();
              toast.success('Inventory state reloaded!');
            }}
            variant="outline" 
            className="border-gold text-maroon"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className={`grid grid-cols-1 ${isStaff ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-6`}>
        <Card className="border-l-4 border-l-maroon border-gold/40 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Raw Material Stock</p>
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                  {rawMaterials.length} Items
                </h3>
              </div>
              <Layers className="h-10 w-10 text-maroon opacity-75" />
            </div>
            {!isStaff && (
              <p className="text-xs text-slate-500 mt-2">Valuation: <strong>{formatCurrency(rawValuation)}</strong></p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-saffron border-gold/40 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Finished Goods Stock</p>
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                  {products.length} Items
                </h3>
              </div>
              <Package className="h-10 w-10 text-saffron opacity-75" />
            </div>
            {!isStaff && (
              <p className="text-xs text-slate-500 mt-2">Valuation: <strong>{formatCurrency(finishedValuation)}</strong></p>
            )}
          </CardContent>
        </Card>

        {!isStaff && (
          <Card className="border-l-4 border-l-green-500 border-gold/40 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Combined Valuation</p>
                  <h3 className="text-2xl font-extrabold text-green-700 dark:text-green-400 mt-1">
                    {formatCurrency(rawValuation + finishedValuation)}
                  </h3>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500 opacity-75" />
              </div>
              <p className="text-xs text-slate-500 mt-2">All warehouse goods estimated at cost.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        navigate({ search: { tab: value } as any });
      }} className="space-y-4">
        <TabsList className="bg-amber-50/50 dark:bg-gray-900 border border-gold/30 p-1 rounded-lg">
          <TabsTrigger value="raw-materials" className="data-[state=active]:bg-maroon data-[state=active]:text-white transition-all font-semibold px-4 py-2">
            Raw Materials Registry
          </TabsTrigger>
          <TabsTrigger value="finished-goods" className="data-[state=active]:bg-maroon data-[state=active]:text-white transition-all font-semibold px-4 py-2">
            Finished Goods (BOM)
          </TabsTrigger>
          {!isStaff && (
            <TabsTrigger value="consumption-logs" className="data-[state=active]:bg-maroon data-[state=active]:text-white transition-all font-semibold px-4 py-2">
              Consumption Logs
            </TabsTrigger>
          )}
          {!isStaff && (
            <TabsTrigger value="reports-audits" className="data-[state=active]:bg-maroon data-[state=active]:text-white transition-all font-semibold px-4 py-2">
              Reports & Audits
            </TabsTrigger>
          )}
        </TabsList>

        {/* --- Raw Materials Tab --- */}
        <TabsContent value="raw-materials" className="space-y-4">
          <Card className="border-2 border-gold shadow-md">
            <CardHeader className="bg-amber-50/20 border-b border-gold/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
              <div>
                <CardTitle className="text-maroon text-lg">Raw Material Inventory</CardTitle>
                <CardDescription>View opening, purchased, consumed stocks, and unit valuations.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center border border-gold/40 rounded bg-white dark:bg-gray-800 px-3 py-1.5 text-xs">
                  <Search className="h-4 w-4 text-slate-400 mr-2" />
                  <input
                    type="text"
                    value={rawSearch}
                    onChange={(e) => setRawSearch(e.target.value)}
                    placeholder="Search materials..."
                    className="outline-none bg-transparent w-40"
                  />
                </div>
                <Select value={rawCategoryFilter} onValueChange={setRawCategoryFilter}>
                  <SelectTrigger className="border-gold/40 w-32 h-9 text-xs bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {distinctRawCategories.map(cat => (
                      <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={rawStatusFilter} onValueChange={setRawStatusFilter}>
                  <SelectTrigger className="border-gold/40 w-32 h-9 text-xs bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All" className="text-xs">All Statuses</SelectItem>
                    <SelectItem value="In Stock" className="text-xs">In Stock</SelectItem>
                    <SelectItem value="Low Stock" className="text-xs">Low Stock</SelectItem>
                    <SelectItem value="Out of Stock" className="text-xs">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
                {canCreate && (
                  <Button onClick={() => handleOpenRawModal()} className="bg-maroon hover:bg-maroon/90 text-white font-bold text-xs h-9">
                    <Plus className="h-4 w-4 mr-1" /> Add Material
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Raw Material Stock Alerts */}
              {!loadingRaw && rawMaterialAlerts.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900 rounded-xl p-4 space-y-3 mb-6">
                  <h3 className="text-red-800 dark:text-red-400 font-bold text-sm flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-650 animate-pulse" />
                    <span>Raw Material Stock Alerts ({rawMaterialAlerts.length} Alert(s) Pending Action)</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {rawMaterialAlerts.map(a => {
                      const badgeColor = a.alertType === 'RAW_MATERIAL_OUT_OF_STOCK' || a.alertType === 'RAW_MATERIAL_SHORTAGE' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
                      return (
                        <div key={a.id} className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/50 rounded-lg p-3 flex justify-between items-center text-xs">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{a.productName}</span>
                            <div className="flex gap-1.5 flex-wrap">
                              <Badge className={`text-[9px] px-1 h-4 border-none ${badgeColor}`}>
                                {a.alertType.replace(/_/g, ' ')}
                              </Badge>
                              <span className="text-[10px] text-slate-455">Stock: {a.currentStock} {a.unit}</span>
                              {a.minStockLevel !== undefined && (
                                <span className="text-[10px] text-slate-400">Min: {a.minStockLevel} {a.unit}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              handleSendWhatsAppAlert({ id: a.productId, name: a.productName, currentStock: a.currentStock, minStockAlert: a.minStockLevel, unit: a.unit, photoUrl: a.productImage });
                            }}
                            className="bg-[#25D366] hover:bg-[#20ba5a] text-white text-[10px] h-7 font-bold flex items-center justify-center gap-1 border-none rounded-md px-2"
                          >
                            <MessageSquare className="h-3 w-3" /> WhatsApp
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {loadingRaw ? (
                <div className="text-center py-10 text-slate-500">Loading raw materials...</div>
              ) : filteredRaw.length === 0 ? (
                <div className="text-center py-10 text-slate-500">No raw materials found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRaw.map((m) => {
                    const isLow = m.currentStock <= m.minStockAlert && m.currentStock > 0;
                    const isOut = m.currentStock <= 0;
                    
                    let statusColor = "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400";
                    let statusText = "In Stock";
                    if (isOut) {
                      statusColor = "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400";
                      statusText = "Out of Stock";
                    } else if (isLow) {
                      statusColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400";
                      statusText = "Low Stock";
                    }

                    const imageUrl = getImageUrl(m.id, m.photoUrl);
                    const { vendorName, lastPurchaseDate } = getMaterialVendorInfo(m.id);
                    return (
                      <RawMaterialCardComponent
                        key={m.id}
                        material={m}
                        isStaff={isStaff}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        imageUrl={imageUrl}
                        vendorName={vendorName}
                        lastPurchaseDate={lastPurchaseDate}
                        isLow={isLow}
                        isOut={isOut}
                        statusColor={statusColor}
                        statusText={statusText}
                        formatCurrency={formatCurrency}
                        handleSendWhatsAppAlert={handleSendWhatsAppAlert}
                        handleViewRawDetails={handleViewRawDetails}
                        handleAddStockQuick={handleAddStockQuick}
                        handleOpenRawModal={handleOpenRawModal}
                        handleDeleteRaw={handleDeleteRaw}
                        handleOpenAdjustStock={handleOpenAdjustStock}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Finished Goods Tab --- */}
        <TabsContent value="finished-goods" className="space-y-4">
          <Card className="border-2 border-gold shadow-md">
            <CardHeader className="bg-amber-50/20 border-b border-gold/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
              <div>
                <CardTitle className="text-maroon text-lg">Finished Products & BOM Configurator</CardTitle>
                <CardDescription>Setup production costs, margins, and configure formulas to auto-deduct raw materials.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center border border-gold/40 rounded bg-white dark:bg-gray-800 px-3 py-1.5 text-xs">
                  <Search className="h-4 w-4 text-slate-400 mr-2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search finished products..."
                    className="outline-none bg-transparent w-40"
                  />
                </div>
                <Select value={productBOMFilter} onValueChange={setProductBOMFilter}>
                  <SelectTrigger className="border-gold/40 w-36 h-9 text-xs bg-white dark:bg-gray-800">
                    <SelectValue placeholder="BOM Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All" className="text-xs">All BOM Config</SelectItem>
                    <SelectItem value="Configured" className="text-xs">BOM Configured</SelectItem>
                    <SelectItem value="Not Configured" className="text-xs">BOM Missing</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={productAvailabilityFilter} onValueChange={setProductAvailabilityFilter}>
                  <SelectTrigger className="border-gold/40 w-36 h-9 text-xs bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All" className="text-xs">All Availability</SelectItem>
                    <SelectItem value="Ready" className="text-xs">Ready to Produce</SelectItem>
                    <SelectItem value="Low Stock" className="text-xs">Low Stock / Warning</SelectItem>
                    <SelectItem value="Insufficient Materials" className="text-xs">Insufficient Materials</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={productLimitingFilter} onValueChange={setProductLimitingFilter}>
                  <SelectTrigger className="border-gold/40 w-36 h-9 text-xs bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Limiting Input" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All" className="text-xs">All Limiting Inputs</SelectItem>
                    <SelectItem value="Beads" className="text-xs">Limited by Beads</SelectItem>
                    <SelectItem value="Mirrors" className="text-xs">Limited by Mirrors</SelectItem>
                    <SelectItem value="Threads" className="text-xs">Limited by Threads</SelectItem>
                  </SelectContent>
                </Select>
                {canCreate && (
                  <Button onClick={() => handleOpenProductModal()} className="bg-maroon hover:bg-maroon/90 text-white font-bold text-xs h-9">
                    <Plus className="h-4 w-4 mr-1" /> Add Product
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {finishedGoodsAlerts.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900 rounded-xl p-4 space-y-3">
                  <h3 className="text-red-800 dark:text-red-400 font-bold text-sm flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-650 animate-pulse" />
                    <span>Finished Goods Stock Alerts ({finishedGoodsAlerts.length} Alert(s) Pending Action)</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {finishedGoodsAlerts.map(a => {
                      const badgeColor = a.alertType === 'OUT_OF_STOCK' || a.alertType === 'SHORTAGE' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
                      return (
                        <div key={a.id} className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/50 rounded-lg p-3 flex justify-between items-center text-xs">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{a.productName}</span>
                            <div className="flex gap-1.5 flex-wrap">
                              <Badge className={`text-[9px] px-1 h-4 border-none ${badgeColor}`}>
                                {a.alertType.replace(/_/g, ' ')}
                              </Badge>
                              {a.shortageQty && (
                                <span className="text-[10px] text-slate-455">Shortage: {a.shortageQty} {a.unit}</span>
                              )}
                              {!a.shortageQty && (
                                <span className="text-[10px] text-slate-455">Stock: {a.currentStock} {a.unit}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              const prod = products.find(p => p.id === a.productId) || { id: a.productId, vigat: a.productName, photoUrl: a.productImage };
                              handleSendWhatsAppAlert(prod);
                            }}
                            className="bg-[#25D366] hover:bg-[#20ba5a] text-white text-[10px] h-7 font-bold flex items-center justify-center gap-1 border-none rounded-md px-2"
                          >
                            <MessageSquare className="h-3 w-3" /> WhatsApp
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {loadingProducts ? (
                <div className="text-center py-10 text-slate-500">Loading finished products...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-10 text-slate-500">No products found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((p) => {
                    const avail = getProductAvailability(p);
                    const sell = p.rate;
                    const laborCost = calculateProductLaborCost(p.id, p.vigat);
                    const totalCost = avail.bomCost + laborCost;
                    const marginAbs = sell - totalCost;
                    const marginPct = sell > 0 ? (marginAbs / sell) * 100 : 0;
                    const imageUrl = getImageUrl(p.id, p.photoUrl);
                    const currentStockNum = Math.max(0, Number(p.stock));
                    const shortageNum = (p as any).shortageQty || 0;
                    
                    const settingsStored = localStorage.getItem('mock_settings');
                    const settings = settingsStored ? JSON.parse(settingsStored) : {};
                    const threshold = settings.lowStockAlertThreshold !== undefined ? Number(settings.lowStockAlertThreshold) : 10;
                    
                    const todayStr = new Date().toISOString().split('T')[0];
                    const alertSentToday = stockAlertsList.some(
                      a => a.productId === p.id && a.createdAt.startsWith(todayStr) && (a.status === 'OPENED' || a.status === 'SENT_MANUAL')
                    );
                    
                    let statusText = "In Stock";
                    let statusColor = "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400";
                    
                    if (shortageNum > 0) {
                      statusText = "Production Required";
                      statusColor = "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400";
                    } else if (currentStockNum === 0) {
                      statusText = "Out of Stock";
                      statusColor = "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400";
                    } else if (currentStockNum <= threshold) {
                      statusText = "Low Stock";
                      statusColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400";
                    }

                    return (
                      <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gold/20 shadow-sm hover:shadow-md hover:border-gold/60 transition-all overflow-hidden flex flex-col">
                        <div className="relative h-40 bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                          <img src={imageUrl} alt={p.vigat} className="w-full h-full object-cover" />
                          <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                            <Badge className={`${statusColor} border-none font-bold text-xs shadow-sm`}>
                              {statusText}
                            </Badge>
                            {alertSentToday && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400 border-none font-bold text-[10px] shadow-sm flex items-center gap-0.5">
                                ✓ Alert Sent Today
                              </Badge>
                            )}
                          </div>
                          <Badge variant="secondary" className="absolute bottom-3 left-3 bg-black/60 text-white border-none text-[10px]">
                            HSN: {p.hsnCode}
                          </Badge>
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <div>
                              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">{p.vigat}</h4>
                              <p className="text-xs text-slate-400 font-mono mt-1">Code: {p.id}</p>
                            </div>

                            {/* Shortage Alert Red Card */}
                            {shortageNum > 0 && (
                              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg p-3 text-red-800 dark:text-red-400 text-xs space-y-2">
                                <div className="flex items-center gap-1.5 font-bold">
                                  <AlertTriangle className="h-4 w-4 text-red-650" />
                                  <span>⚠ Stock Shortage Alert</span>
                                </div>
                                <p className="text-[11px] leading-relaxed">
                                  <strong>{p.vigat}</strong> requires <strong>{shortageNum} pcs</strong> production.
                                </p>
                                <div className="flex justify-between text-[10px] font-semibold border-t border-red-200/50 pt-1.5 mt-1.5">
                                  <span>Current Stock: 0 pcs</span>
                                  <span>Shortage: {shortageNum} pcs</span>
                                </div>
                                <Button 
                                  type="button"
                                  onClick={() => handleSendWhatsAppAlert(p)}
                                  className="w-full mt-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-[11px] h-7 font-bold flex items-center justify-center gap-1 border-none rounded-md"
                                >
                                  <MessageSquare className="h-3 w-3" /> Send WhatsApp Alert
                                </Button>
                              </div>
                            )}

                            {/* Low Stock or Out of Stock Alert Card */}
                            {shortageNum <= 0 && (currentStockNum === 0 || currentStockNum <= threshold) && (
                              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-250 dark:border-yellow-900/50 rounded-lg p-3 text-yellow-800 dark:text-yellow-400 text-xs space-y-2">
                                <div className="flex items-center gap-1.5 font-bold">
                                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                  <span>⚠ Low Stock Warning</span>
                                </div>
                                <p className="text-[11px] leading-relaxed">
                                  <strong>{p.vigat}</strong> is below the alert threshold (Stock: {currentStockNum} pcs).
                                </p>
                                <Button 
                                  type="button"
                                  onClick={() => handleSendWhatsAppAlert(p)}
                                  className="w-full mt-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-[11px] h-7 font-bold flex items-center justify-center gap-1 border-none rounded-md"
                                >
                                  <MessageSquare className="h-3 w-3" /> Send WhatsApp Alert
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* KPI Section */}
                          <div className="grid grid-cols-3 gap-2 text-[10px] border-t border-slate-100 dark:border-slate-700 pt-3">
                            <div>
                              <span className="text-slate-400 block font-medium">Total Stock</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{currentStockNum} pcs</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Reserved</span>
                              <span className="font-bold text-blue-600">{Number(p.reservedStock || 0)} pcs</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Available</span>
                              <span className="font-bold text-green-700">{Number(p.availableToSell !== undefined ? p.availableToSell : (currentStockNum - Number(p.reservedStock || 0)))} pcs</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-100 dark:border-slate-700 pb-3 mt-2">
                            {shortageNum > 0 ? (
                              <div>
                                <span className="text-slate-400 block font-medium text-red-500">Shortage</span>
                                <span className="font-bold text-red-650 dark:text-red-400">{shortageNum} pcs</span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-slate-400 block font-medium">Selling Price</span>
                                <span className="font-bold text-slate-800 dark:text-slate-205">{formatCurrency(sell)}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-slate-400 block font-medium">BOM Cost / Piece</span>
                              <span className="font-bold text-slate-650 dark:text-slate-405 text-sm">{formatCurrency(avail.bomCost)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Max Producible Now</span>
                              <span className={`font-extrabold text-sm ${avail.maxProducible > 0 ? 'text-green-655 dark:text-green-455' : 'text-red-500'}`}>
                                {avail.maxProducible} pcs
                              </span>
                            </div>
                          </div>

                          {/* Limiting Material Section */}
                          <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                            {avail.limitingMaterial ? (
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="text-slate-400 block text-[10px]">Limiting Input</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-350">{avail.limitingMaterial.name}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-slate-400 block text-[10px]">Can Produce</span>
                                  <span className="font-extrabold text-maroon dark:text-saffron">{avail.maxProducible} pcs</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-550 italic text-center py-1">
                                No limiting materials (no BOM recipe configured)
                              </div>
                            )}
                          </div>

                          {/* BOM Preview Section (top 3 key raw materials) */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">BOM Preview (Top Materials)</span>
                            {p.bom && p.bom.length > 0 ? (
                              <div className="space-y-1 bg-amber-50/10 p-2.5 rounded-lg border border-gold/10">
                                {avail.materials.slice(0, 3).map((m: any) => {
                                  let badgeColor = "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400";
                                  if (m.status === 'Short') {
                                    badgeColor = "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400";
                                  } else if (m.status === 'Low') {
                                    badgeColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400";
                                  }
                                  return (
                                    <div key={m.id} className="flex justify-between items-center text-xs text-slate-655 dark:text-slate-300">
                                      <span className="truncate max-w-[120px]">• {m.name}</span>
                                      <span className="font-semibold text-slate-500">Req: {m.required} {m.unit} / pc</span>
                                      <Badge className={`${badgeColor} text-[9px] px-1.5 py-0 border-none`}>
                                        {m.available} {m.unit}
                                      </Badge>
                                    </div>
                                  );
                                })}
                                {p.bom.length > 3 && (
                                  <div className="text-[10px] text-slate-400 text-center font-medium mt-1">
                                    + {p.bom.length - 3} more material(s) (click View BOM to see all)
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-100 dark:border-red-950/30 flex items-center gap-1.5 font-medium">
                                <AlertTriangle className="h-4 w-4" /> BOM not configured for this product.
                              </div>
                            )}
                          </div>

                          {/* Expandable detailed BOM / Actions */}
                          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex gap-2">
                              <Button type="button" onClick={() => handleViewBOMDetails(p)} variant="outline" className="flex-1 text-[11px] h-8 px-2 border-gold text-maroon hover:bg-gold/10">
                                View BOM
                              </Button>
                              <Button 
                                type="button" 
                                onClick={() => handleSimulateConsumption(p)} 
                                variant="outline" 
                                className="flex-1 text-[11px] h-8 px-2 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                              >
                                Simulate
                              </Button>
                              <Button 
                                type="button" 
                                onClick={() => navigate({ to: '/production' })} 
                                className="flex-1 text-[11px] h-8 px-2 bg-maroon text-white hover:bg-maroon/90 font-bold"
                              >
                                Produce
                              </Button>
                            </div>

                            <div className="flex gap-2 w-full pt-1 justify-center">
                              {canEdit && (
                                <Button type="button" onClick={() => handleOpenBOM(p)} variant="ghost" size="sm" className="text-[11px] text-slate-500 hover:text-maroon h-7">
                                  Edit Recipe
                                </Button>
                              )}
                              {canEdit && (
                                <Button type="button" onClick={() => handleOpenProductModal(p)} variant="ghost" size="sm" className="text-[11px] text-blue-500 hover:text-blue-600 h-7">
                                  <Edit className="h-3 w-3 mr-1" /> Edit Product
                                </Button>
                              )}
                              {canDelete && (
                                <Button type="button" onClick={() => handleDeleteProduct(p.id, p.vigat)} variant="ghost" size="sm" className="text-[11px] text-red-500 hover:text-red-650 h-7">
                                  <Trash className="h-3 w-3 mr-1" /> Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Consumption Logs Tab --- */}
        {!isStaff && (
        <TabsContent value="consumption-logs" className="space-y-4">
          <Card className="border-2 border-gold shadow-md">
            <CardHeader className="bg-amber-50/20 border-b border-gold/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
              <div>
                <CardTitle className="text-maroon text-lg">Material Consumption History</CardTitle>
                <CardDescription>Track and manage raw materials consumed during artisan manufacturing cycles.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {import.meta.env.DEV && (
                  <Button onClick={handleGenerateDemo} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9">
                    Generate Demo Consumption Logs
                  </Button>
                )}
                <div className="flex items-center border border-gold/40 rounded bg-white dark:bg-gray-800 px-3 py-1.5 text-xs">
                  <Search className="h-4 w-4 text-slate-400 mr-2" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Search logs..."
                    className="outline-none bg-transparent w-40"
                  />
                </div>
                <Select value={logProductFilter} onValueChange={setLogProductFilter}>
                  <SelectTrigger className="border-gold/40 w-36 h-9 text-xs bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Product" />
                  </SelectTrigger>
                  <SelectContent>
                    {distinctLogProducts.map(p => (
                      <SelectItem key={p} value={p} className="text-xs">{p === 'All' ? 'All Products' : p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={logMaterialFilter} onValueChange={setLogMaterialFilter}>
                  <SelectTrigger className="border-gold/40 w-36 h-9 text-xs bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Raw Material" />
                  </SelectTrigger>
                  <SelectContent>
                    {distinctLogMaterials.map(m => (
                      <SelectItem key={m} value={m} className="text-xs">{m === 'All' ? 'All Materials' : m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={logEmployeeFilter} onValueChange={setLogEmployeeFilter}>
                  <SelectTrigger className="border-gold/40 w-36 h-9 text-xs bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Karigar/Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {distinctLogEmployees.map(emp => (
                      <SelectItem key={emp} value={emp} className="text-xs">{emp === 'All' ? 'All Employees' : emp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={logStatusFilter} onValueChange={setLogStatusFilter}>
                  <SelectTrigger className="border-gold/40 w-36 h-9 text-xs bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All" className="text-xs">All Statuses</SelectItem>
                    <SelectItem value="Completed" className="text-xs">Consumption Generated</SelectItem>
                    <SelectItem value="Stock Updated" className="text-xs">Stock Updated</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-medium text-slate-400">Date:</span>
                  <input
                    type="date"
                    value={logStartDate}
                    onChange={(e) => setLogStartDate(e.target.value)}
                    className="border border-gold/40 rounded px-2 py-1 bg-white dark:bg-gray-800 text-xs h-9 text-slate-700 dark:text-slate-300"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={logEndDate}
                    onChange={(e) => setLogEndDate(e.target.value)}
                    className="border border-gold/40 rounded px-2 py-1 bg-white dark:bg-gray-800 text-xs h-9 text-slate-700 dark:text-slate-300"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loadingLogs ? (
                <div className="text-center py-10 text-slate-500">Loading consumption records...</div>
              ) : filteredGroupedLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-amber-50/10 border-2 border-dashed border-gold/40 rounded-xl space-y-4 shadow-sm max-w-lg mx-auto my-8">
                  <div className="bg-amber-100 p-3 rounded-full">
                    <AlertTriangle className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No consumption logs yet</h3>
                  <p className="text-sm text-slate-500 max-w-sm">
                    Complete finished goods collection to automatically generate consumption logs.
                  </p>
                  {import.meta.env.DEV && (
                    <Button onClick={handleGenerateDemo} className="bg-maroon hover:bg-maroon/90 text-white font-bold text-xs">
                      Generate Demo Consumption Log
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGroupedLogs.map((group) => {
                    const imageUrl = getImageUrl(group.productId || group.productName, group.productPhotoUrl);
                    
                    // Calculate if there are shortages or low stock after consumption
                    let hasShortage = false;
                    let hasWarning = false;
                    const materialsWithInfo = group.rawMaterials.map(mat => {
                      const info = getLogMaterialInfo(mat.rawMaterialName, mat.quantityUsed);
                      if (info.status === 'Short') hasShortage = true;
                      if (info.status === 'Low') hasWarning = true;
                      return {
                        ...mat,
                        ...info
                      };
                    });

                    let statusText = "Consumption Generated";
                    let statusColor = "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400";
                    if (hasShortage) {
                      statusText = "Warning (Shortage)";
                      statusColor = "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400";
                    } else if (hasWarning) {
                      statusText = "Stock Posted (Low)";
                      statusColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400";
                    } else if (group.status === 'Stock Updated') {
                      statusText = "Stock Posted";
                      statusColor = "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400";
                    }

                    const handleLinkToBOM = () => {
                      setActiveTab('finished-goods');
                      setProductSearch(group.productName);
                      navigate({ search: { tab: 'finished-goods' } as any });
                    };

                    return (
                      <div key={group.key} className="bg-white dark:bg-gray-800 rounded-xl border border-gold/20 shadow-sm hover:shadow-md hover:border-gold/60 transition-all overflow-hidden flex flex-col">
                        <div className="relative h-40 bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                          <img src={imageUrl} alt={group.productName} className="w-full h-full object-cover" />
                          <Badge className={`absolute top-3 right-3 ${statusColor} border-none font-bold text-[10px]`}>
                            {statusText}
                          </Badge>
                          <Badge variant="secondary" className="absolute bottom-3 left-3 bg-black/60 text-white border-none text-[10px]">
                            Job: #{group.jobWorkNo}
                          </Badge>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight truncate">{group.productName}</h4>
                            <div className="flex justify-between items-center text-xs text-slate-400 font-mono mt-1">
                              <span>Collection: #{group.batchNo}</span>
                              <span>{formatERPDateTime(group.date)}</span>
                            </div>
                          </div>

                          {/* KPI Row */}
                          <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                            <div>
                              <span className="text-slate-400 block text-[9px] font-medium">Accepted Qty</span>
                              <span className="font-extrabold text-slate-850 dark:text-slate-200 text-xs">{group.acceptedQty} pcs</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px] font-medium">Cost / pc</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                                {formatCurrency(group.totalCost / (group.acceptedQty || 1))}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[9px] font-medium">Total Value</span>
                              <span className="font-extrabold text-red-500 text-xs">-{formatCurrency(group.totalCost)}</span>
                            </div>
                          </div>

                          {/* Material Breakdown Section */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Raw Material Breakdown</span>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {materialsWithInfo.map((mat, idx) => {
                                const reqPerItem = mat.quantityUsed / (group.acceptedQty || 1);
                                let matStatusColor = "text-green-600 dark:text-green-400";
                                if (mat.status === 'Short') {
                                  matStatusColor = "text-red-500 font-bold";
                                } else if (mat.status === 'Low') {
                                  matStatusColor = "text-yellow-600 dark:text-yellow-400 font-semibold";
                                }

                                const custom = getCustomSymbolAndQty(group.productName, mat.rawMaterialName, mat.quantityUsed, mat.unit);
                                const scale = mat.quantityUsed > 0 ? (custom.qty / mat.quantityUsed) : 1;
                                const reqPerItemCustom = reqPerItem * scale;

                                return (
                                  <div key={idx} className="bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col gap-1 text-xs">
                                    <div className="flex justify-between items-center font-bold text-slate-705 dark:text-slate-300">
                                      <span>{mat.rawMaterialName}</span>
                                      <span className="text-red-500 font-bold">-{custom.qty.toFixed(custom.qty % 1 === 0 ? 0 : 2)} {custom.symbol}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-455 mt-0.5 border-t border-slate-100/50 dark:border-slate-800/50 pt-1">
                                      <div>Req: {reqPerItemCustom.toFixed(reqPerItemCustom % 1 === 0 ? 0 : 2)} {custom.symbol}/pc</div>
                                      <div className="text-right">Rate: {formatCurrency(mat.unitCost)} (Total: {formatCurrency(mat.cost)})</div>
                                      <div>Stock Before: {(mat.stockBefore * scale).toFixed((mat.stockBefore * scale) % 1 === 0 ? 0 : 2)} {custom.symbol}</div>
                                      <div className="text-right">Stock After: {(mat.stockAfter * scale).toFixed((mat.stockAfter * scale) % 1 === 0 ? 0 : 2)} {custom.symbol}</div>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] mt-1 pt-1 border-t border-dotted border-slate-200 dark:border-slate-700">
                                      <span className="text-slate-400">Stock Status:</span>
                                      <span className={matStatusColor}>{mat.status}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Footer Summary / Link */}
                          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between items-center text-[11px] text-slate-500">
                              <span className="font-medium">Artisan: <strong>{group.employee}</strong></span>
                              <span>Total Items: <strong>{group.totalQuantityUsed}</strong></span>
                            </div>

                            {/* Warnings for low-stock materials */}
                            {hasWarning && (
                              <div className="text-[10px] text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 px-2 py-1 rounded border border-yellow-100 dark:border-yellow-950/30 font-medium">
                                ⚠️ Attention: One or more raw materials are below minimum levels.
                              </div>
                            )}
                            {hasShortage && (
                              <div className="text-[10px] text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded border border-red-100 dark:border-red-950/30 font-bold">
                                ❌ Warning: Negative stock shortage occurred for this posting.
                              </div>
                            )}

                            <Button 
                              type="button" 
                              onClick={handleLinkToBOM} 
                              variant="ghost" 
                              className="w-full text-xs text-maroon hover:bg-gold/10 font-bold h-8 mt-1 border border-gold/30 hover:border-gold"
                            >
                              Link to BOM Product Card
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* --- Reports & Audits Tab --- */}
        {!isStaff && (
        <TabsContent value="reports-audits" className="space-y-4">
          <Card className="border-2 border-gold shadow-md">
            <CardHeader className="bg-amber-50/20 border-b border-gold/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
              <div>
                <CardTitle className="text-maroon text-lg">Inventory Valuation & Audits</CardTitle>
                <CardDescription>Compare stock book values against FIFO batch costs, and review manual audit reconciliations.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Metrics Cards */}
              {(() => {
                const totalBookValue = rawMaterials.reduce((sum, m) => sum + (m.currentStock * m.unitCost), 0);
                const totalFIFOValue = rawMaterials.reduce((sum, m) => sum + calculateFIFOWorth(m.id, m.openingStock, m.unitCost), 0);
                const variance = totalFIFOValue - totalBookValue;
                const totalItems = rawMaterials.length;
                const lowStockCount = rawMaterials.filter(m => m.currentStock <= m.minStockAlert).length;
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-[#FFFDF8] border border-gold/30 rounded-xl p-4 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Book Cost Valuation</span>
                      <h4 className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(totalBookValue)}</h4>
                      <span className="text-[9px] text-slate-400">Total assets based on unit cost</span>
                    </div>
                    <div className="bg-amber-50/10 border border-gold/45 rounded-xl p-4 shadow-xs">
                      <span className="text-[10px] text-amber-700 font-bold uppercase block">FIFO Valuation</span>
                      <h4 className="text-lg font-bold text-maroon mt-1">{formatCurrency(totalFIFOValue)}</h4>
                      <span className="text-[9px] text-amber-600">Calculated from purchase batches</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Valuation Variance</span>
                      <h4 className={`text-lg font-bold mt-1 ${variance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                      </h4>
                      <span className="text-[9px] text-slate-400">FIFO vs Book Cost difference</span>
                    </div>
                    <div className="bg-red-50/15 border border-red-200 rounded-xl p-4 shadow-xs">
                      <span className="text-[10px] text-red-700 font-bold uppercase block">Low Stock Alert Items</span>
                      <h4 className="text-lg font-bold text-red-800 mt-1">{lowStockCount} / {totalItems}</h4>
                      <span className="text-[9px] text-red-500">Require immediate reorder</span>
                    </div>
                  </div>
                );
              })()}

              {/* FIFO Valuation Breakdown Table */}
              <div className="space-y-2">
                <h3 className="text-sm font-extrabold text-[#7B0F1A] uppercase tracking-wider flex items-center gap-1">
                  <span>FIFO Material Valuation Report</span>
                </h3>
                
                <div className="border border-[#EBD9A6] rounded-xl overflow-x-auto bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-amber-50/30 border-b border-gold/20 text-[10px] text-slate-600 uppercase tracking-wider">
                        <th className="p-3 font-bold">Material</th>
                        <th className="p-3 font-bold">Warehouse Coordinates</th>
                        <th className="p-3 font-bold text-right">In Stock</th>
                        <th className="p-3 font-bold text-right">Reserved Qty</th>
                        <th className="p-3 font-bold text-right">Available Qty</th>
                        <th className="p-3 font-bold text-right">Avg Unit Cost</th>
                        <th className="p-3 font-bold text-right">FIFO Valuation</th>
                        <th className="p-3 font-bold text-right">Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawMaterials.map((m: any) => {
                        const fifoValue = calculateFIFOWorth(m.id, m.openingStock, m.unitCost);
                        const bookValue = m.currentStock * m.unitCost;
                        const variance = fifoValue - bookValue;
                        
                        const metadata = JSON.parse(localStorage.getItem('mock_raw_materials_metadata') || '{}');
                        const custom = metadata[m.id] || {};
                        const warehouse = custom.warehouse || m.warehouse || 'Main Warehouse';
                        const rack = custom.storageRack || m.storageRack || 'Rack A-1';
                        const bin = custom.binLocation || m.binLocation || 'Bin 01';

                        const reserved = getReservedStock(m.id);
                        const available = Math.max(0, m.currentStock - reserved);

                        return (
                          <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-3">
                              <span className="font-bold text-slate-800 block">{m.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">{m.id}</span>
                            </td>
                            <td className="p-3">
                              <span className="block font-semibold text-slate-700">{warehouse}</span>
                              <span className="text-[10px] text-slate-400">Rack: {rack} | Bin: {bin}</span>
                            </td>
                            <td className="p-3 text-right font-bold text-slate-800">{m.currentStock} {m.unit}</td>
                            <td className="p-3 text-right font-semibold text-purple-650">{reserved.toFixed(2)} {m.unit}</td>
                            <td className="p-3 text-right font-semibold text-emerald-650">{available.toFixed(2)} {m.unit}</td>
                            <td className="p-3 text-right font-semibold text-slate-700">{formatCurrency(m.unitCost)}</td>
                            <td className="p-3 text-right font-extrabold text-maroon">{formatCurrency(fifoValue)}</td>
                            <td className={`p-3 text-right font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {variance >= 0 ? '+' : ''}{variance.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audit Reconciliation Log */}
              <div className="space-y-2">
                <h3 className="text-sm font-extrabold text-[#7B0F1A] uppercase tracking-wider">
                  Physical Audit Reconciliation Trail
                </h3>
                
                <div className="border border-[#EBD9A6] rounded-xl overflow-hidden bg-[#FFFDF8]">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-amber-50/20 border-b border-gold/20 text-[10px] text-slate-600 uppercase tracking-wider sticky top-0">
                          <th className="p-3 font-bold">Timestamp / Date</th>
                          <th className="p-3 font-bold">Action / Event</th>
                          <th className="p-3 font-bold">Details</th>
                          <th className="p-3 font-bold">Auditor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const adjustLogs = activityLogs
                            .filter((log: any) => 
                              log.action?.includes('Manual Stock Adjustment') || 
                              log.details?.includes('Manual Stock Adjustment')
                            )
                            .sort((a: any, b: any) => {
                              const tA = Number(a.timestamp) || 0;
                              const tB = Number(b.timestamp) || 0;
                              return tB - tA;
                            });

                          if (adjustLogs.length === 0) {
                            return (
                              <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-400 bg-white">
                                  No manual reconciliation logs recorded in the system audit trail yet.
                                </td>
                              </tr>
                            );
                          }

                          return adjustLogs.map((log: any, idx: number) => {
                            const timestampStr = log.timestamp 
                              ? new Date(Number(log.timestamp) / 1000000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                              : 'N/A';
                            
                            return (
                              <tr key={idx} className="border-b border-slate-100 bg-white hover:bg-slate-50">
                                <td className="p-3 whitespace-nowrap text-slate-500 font-medium">
                                  {timestampStr}
                                </td>
                                <td className="p-3">
                                  <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                                    {log.action}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-700 font-medium leading-relaxed max-w-sm">
                                  {log.details}
                                </td>
                                <td className="p-3 text-slate-600 font-bold whitespace-nowrap">
                                  {log.username || 'System Admin'}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>

      {/* Side Drawer: Add/Edit Raw Material */}
      <RawMaterialEditDrawer
        isOpen={isRawModalOpen}
        onOpenChange={setIsRawModalOpen}
        materialId={selectedEditMaterialId}
        canDelete={canDelete}
        onDelete={handleDeleteRaw}
      />

      {/* Modal 2: Add/Edit Finished Product */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="sm:max-w-[425px] border-2 border-gold shadow-lg">
          <form onSubmit={handleSaveProduct}>
            <DialogHeader>
              <DialogTitle className="text-maroon text-lg">{isEditProduct ? 'Edit Finished Product' : 'Add New Finished Product'}</DialogTitle>
              <DialogDescription>Register a finished product item for sales invoicing.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prodId" className="text-right font-semibold">Product Code</Label>
                <Input
                  id="prodId"
                  value={productForm.id}
                  onChange={(e) => setProductForm({ ...productForm, id: e.target.value })}
                  placeholder="e.g. 101"
                  className="col-span-3 border-gold"
                  disabled={isEditProduct}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prodName" className="text-right font-semibold">Name (Vigat)</Label>
                <Input
                  id="prodName"
                  value={productForm.vigat}
                  onChange={(e) => setProductForm({ ...productForm, vigat: e.target.value })}
                  placeholder="e.g. Toran"
                  className="col-span-3 border-gold"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prodHsn" className="text-right font-semibold">HSN Code</Label>
                <Input
                  id="prodHsn"
                  value={productForm.hsnCode}
                  onChange={(e) => setProductForm({ ...productForm, hsnCode: e.target.value })}
                  className="col-span-3 border-gold"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prodCost" className="text-right font-semibold">Production Cost</Label>
                <Input
                  id="prodCost"
                  type="number"
                  step="0.01"
                  value={productForm.productionCost || ''}
                  onChange={(e) => setProductForm({ ...productForm, productionCost: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="col-span-3 border-gold"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prodRate" className="text-right font-semibold">Selling Price</Label>
                <Input
                  id="prodRate"
                  type="number"
                  step="0.01"
                  value={productForm.rate || ''}
                  onChange={(e) => setProductForm({ ...productForm, rate: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="col-span-3 border-gold"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prodStock" className="text-right font-semibold">Opening Stock</Label>
                <Input
                  id="prodStock"
                  type="number"
                  value={productForm.stock || ''}
                  onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="col-span-3 border-gold"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="prodPhoto" className="text-right font-semibold pt-2">Product Photo</Label>
                <div className="col-span-3 space-y-2">
                  {productForm.photoUrl ? (
                    <div className="space-y-2">
                      <div className="relative h-32 w-full rounded border border-gold/40 overflow-hidden bg-slate-50 flex items-center justify-center">
                        <img src={productForm.photoUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => setProductForm({ ...productForm, photoUrl: '' })}
                          className="absolute top-1 right-1 h-6 w-6"
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {productForm.photoUrl.startsWith('data:') ? 'Base64 Image Uploaded' : productForm.photoUrl}
                      </span>
                    </div>
                  ) : (
                    <Input
                      id="prodPhoto"
                      value=""
                      onChange={(e) => setProductForm({ ...productForm, photoUrl: e.target.value })}
                      placeholder="Paste Image URL"
                      className="border-gold text-xs"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProductForm({ ...productForm, photoUrl: reader.result as string });
                            toast.success('Product image uploaded successfully!');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="border-gold text-xs h-9 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-maroon hover:bg-maroon/90 text-white" disabled={isSavingProduct}>
                {isSavingProduct ? 'Saving...' : 'Save Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: BOM Configurator */}
      <Dialog open={isBOMModalOpen} onOpenChange={setIsBOMModalOpen}>
        <DialogContent className="w-[calc(100vw-32px)] sm:w-[min(1380px,70vw)] sm:min-w-[1180px] max-w-[calc(100vw-32px)] h-[min(90vh,980px)] max-h-[90vh] border-2 border-[#D4A017] shadow-2xl bg-[#FDFBF7] dark:bg-slate-900 rounded-[20px] sm:rounded-[24px] overflow-hidden flex flex-col p-0 gap-0">
          <div ref={setBomPortalContainer} className="relative w-0 h-0" />
          <DialogHeader className="pt-[28px] px-[32px] pb-[16px] border-b border-[#E8D7A5] bg-[#FDFBF7] flex-shrink-0 text-left">
            <DialogTitle className="text-[#7A0019] text-2xl flex items-center gap-2 font-bold font-serif">
              <Layers className="h-6 w-6 text-saffron animate-pulse" /> BOM Configurator: {bomProduct?.vigat}
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm mt-1">
              Define the raw materials required to produce one unit of this item. When sold, these materials will automatically stock-out.
            </DialogDescription>
          </DialogHeader>

          {/* Modal Body with internal scrolling */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-[32px] pb-[24px] pt-0 flex flex-col gap-5 bg-[#FDFBF7] min-h-0">
            {isBomUnitV2Enabled ? (
              <>
                {/* Desktop Table View inside a bordered main card */}
                <div className="hidden md:block border border-[#EBD9A6] rounded-[18px] bg-[#FFFDF8] dark:bg-slate-955 shadow-xs overflow-x-auto overflow-y-visible flex flex-col">
                  <div className="overflow-visible rounded-[18px]">
                    <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
                      <colgroup>
                        <col style={{ width: '34%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '17%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '5%' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#FFFDF8] dark:bg-amber-955/5 border-b border-[#EBD9A6] text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          <th className="p-4 font-sans font-semibold text-slate-500 tracking-wider">RAW MATERIAL</th>
                          <th className="p-4 font-sans font-semibold text-slate-500 tracking-wider">UNIT LABEL</th>
                          <th className="p-4 font-sans font-semibold text-slate-500 tracking-wider">UNIT TYPE</th>
                          <th className="p-4 font-sans font-semibold text-slate-500 tracking-wider">UNIT SYMBOL</th>
                          <th className="p-4 text-center font-sans font-semibold text-slate-500 tracking-wider">QTY / UNIT</th>
                          <th className="p-4 text-center font-sans font-semibold text-slate-500 tracking-wider">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EBD9A6]/40 dark:divide-slate-800">
                        {bomRows.map((row, index) => (
                          <BOMUnitRow
                            key={index}
                            index={index}
                            row={row as any}
                            rawMaterials={rawMaterials}
                            onUpdate={handleUpdateBOMRow}
                            onRemove={handleRemoveBOMRow}
                            layout="table-row"
                            portalContainer={bomPortalContainer}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Stacked Cards View */}
                <div className="md:hidden space-y-4">
                  {bomRows.map((row, index) => (
                    <BOMUnitRow
                      key={index}
                      index={index}
                      row={row as any}
                      rawMaterials={rawMaterials}
                      onUpdate={handleUpdateBOMRow}
                      onRemove={handleRemoveBOMRow}
                      layout="mobile-card"
                      portalContainer={bomPortalContainer}
                    />
                  ))}
                </div>
              </>
            ) : (
              // Legacy BOM rendering fallback
              <div className="space-y-3">
                {bomRows.map((row, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Select
                        value={row.materialId}
                        onValueChange={(val) => handleUpdateBOMRow(index, { materialId: val })}
                      >
                        <SelectTrigger className="border-gold/60 text-xs h-12">
                          <SelectValue placeholder="Select Raw Material" />
                        </SelectTrigger>
                        <SelectContent>
                          {rawMaterials.map(m => (
                            <SelectItem key={m.id} value={m.id} className="text-xs">
                              {m.name} ({m.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        step="any"
                        value={row.quantity || ''}
                        onChange={(e) => handleUpdateBOMRow(index, { quantity: parseFloat(e.target.value) || 0 })}
                        placeholder="Qty"
                        className="border-gold/60 text-center text-xs h-12"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveBOMRow(index)}
                      className="text-slate-400 hover:text-red-500 h-12 w-12"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {bomRows.length === 0 && (
              <div className="text-center py-12 text-sm text-slate-400 bg-white/50 dark:bg-slate-955/20 rounded-[18px] border border-dashed border-[#EBD9A6]">
                No materials configured. Click "Add Material Link" below to begin.
              </div>
            )}
          </div>

          {/* Modal Sticky Footer */}
          <div className="flex-shrink-0 border-t border-[#EBD9A6] bg-[#FDFBF7] dark:bg-slate-900 px-[28px] py-[20px] flex items-center justify-between gap-6 flex-wrap md:flex-nowrap shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
            <div className="flex flex-wrap items-center gap-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddBOMRow}
                className="border-[#E6C36A] text-[#7A0019] bg-[#FFFDF8] hover:bg-[#FFFDF8]/80 text-sm font-semibold h-12 px-5 rounded-lg border flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4 text-[#7A0019]" /> Add Material Link
              </Button>

              <div className="flex items-center gap-2">
                <Label htmlFor="bomLaborCost" className="text-sm font-semibold text-slate-500 whitespace-nowrap">Labor Cost (₹)</Label>
                <Input
                  id="bomLaborCost"
                  type="number"
                  step="0.01"
                  value={laborCostInput || ''}
                  onChange={(e) => setLaborCostInput(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="border-[#E6C36A] text-sm h-12 w-[180px] text-center font-bold bg-white dark:bg-slate-950 rounded-lg focus-visible:ring-1 focus-visible:ring-gold"
                />
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsBOMModalOpen(false)} 
                className="text-sm h-12 px-5 font-semibold rounded-lg border border-[#E6C36A] text-slate-700 bg-[#FFFDF8] hover:bg-slate-50 dark:hover:bg-slate-955"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleSaveBOM} 
                className="bg-[#8B1020] hover:bg-[#8B1020]/90 text-white font-bold text-sm h-12 px-6 rounded-lg shadow-md transition-colors"
              >
                Save Formula
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 4: View Raw Material Details */}
      <Dialog open={isViewRawOpen} onOpenChange={setIsViewRawOpen}>
        <DialogContent className="max-w-xl bg-white border-2 border-gold shadow-xl">
          <DialogHeader className="border-b border-gold/15 pb-2">
            <DialogTitle className="text-maroon text-lg">Raw Material Details</DialogTitle>
            <DialogDescription>Detailed logistics location, stock reservations, and FIFO valuation batches.</DialogDescription>
          </DialogHeader>
          {selectedRaw && (() => {
            const reserved = getReservedStock(selectedRaw.id);
            const available = Math.max(0, selectedRaw.currentStock - reserved);
            
            const metadata = JSON.parse(localStorage.getItem('mock_raw_materials_metadata') || '{}');
            const custom = metadata[selectedRaw.id] || {};
            const warehouse = custom.warehouse || (selectedRaw as any).warehouse || 'Main Warehouse';
            const rack = custom.storageRack || (selectedRaw as any).storageRack || 'Rack A-1';
            const bin = custom.binLocation || (selectedRaw as any).binLocation || 'Bin 01';

            const fifoValuation = calculateFIFOWorth(selectedRaw.id, selectedRaw.openingStock, selectedRaw.unitCost);
            const activeBatches = getFIFOBatches(selectedRaw.id, selectedRaw.openingStock, selectedRaw.unitCost);

            return (
              <div className="space-y-4 py-4 text-xs">
                {/* Photo Frame */}
                <div className="h-32 w-full rounded-lg bg-slate-100 dark:bg-slate-900 overflow-hidden border border-gold/20 flex items-center justify-center">
                  <img src={getImageUrl(selectedRaw.id, selectedRaw.photoUrl)} alt={selectedRaw.name} className="w-full h-full object-cover" />
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Material Name</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{selectedRaw.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Material Code</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">{selectedRaw.id}</p>
                  </div>
                </div>

                {/* Warehouse Location Info Box */}
                <div className="p-3 bg-amber-50/15 border border-gold/15 rounded-lg space-y-1.5 col-span-2">
                  <span className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">Warehouse Storage Coordinates</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block">Warehouse</span>
                      <span className="font-semibold text-slate-800">{warehouse}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block">Storage Rack</span>
                      <span className="font-semibold text-slate-800">{rack}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block">Bin Location</span>
                      <span className="font-semibold text-slate-800">{bin}</span>
                    </div>
                  </div>
                </div>

                {/* Stock Quantities breakdown */}
                <div className="col-span-2 border-t border-slate-100 dark:border-slate-855 pt-3">
                  <span className="font-bold text-slate-700 block uppercase tracking-wider text-[9px] mb-2">Stock Balance & Reservation Breakdown</span>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[9px] text-slate-450 block font-semibold">Opening Stock</span>
                      <span className="font-bold text-slate-750">{selectedRaw.openingStock} {selectedRaw.unit}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[9px] text-slate-455 block font-semibold">Total Purchased</span>
                      <span className="font-bold text-blue-600">+{selectedRaw.purchasedQty} {selectedRaw.unit}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[9px] text-slate-450 block font-semibold">Total Consumed</span>
                      <span className="font-bold text-red-500">-{selectedRaw.consumedQty} {selectedRaw.unit}</span>
                    </div>
                    <div className="bg-teal-50/20 p-2 rounded border border-teal-100">
                      <span className="text-[9px] text-teal-700 block font-bold">Current Stock</span>
                      <span className="font-extrabold text-teal-800">{selectedRaw.currentStock} {selectedRaw.unit}</span>
                    </div>
                    <div className="bg-purple-50/20 p-2 rounded border border-purple-100">
                      <span className="text-[9px] text-purple-700 block font-bold">Reserved Stock</span>
                      <span className="font-extrabold text-purple-800">{reserved.toFixed(2)} {selectedRaw.unit}</span>
                    </div>
                    <div className="bg-emerald-50/20 p-2 rounded border border-emerald-100">
                      <span className="text-[9px] text-emerald-700 block font-bold">Available Stock</span>
                      <span className="font-extrabold text-emerald-800">{available.toFixed(2)} {selectedRaw.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Valuation comparisons */}
                {!isStaff && (
                  <div className="col-span-2 border-t border-slate-100 dark:border-slate-855 pt-3 grid grid-cols-2 gap-3">
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-[9px] text-slate-450 block font-semibold">Average Cost Valuation</span>
                      <span className="font-extrabold text-slate-800 text-sm">{formatCurrency(selectedRaw.currentStock * selectedRaw.unitCost)}</span>
                      <span className="block text-[8px] text-slate-400 mt-0.5">Rate: {formatCurrency(selectedRaw.unitCost)} / {selectedRaw.unit}</span>
                    </div>
                    <div className="p-2 bg-amber-50/20 border border-gold/25 rounded">
                      <span className="text-[9px] text-amber-700 block font-bold">FIFO Valuation</span>
                      <span className="font-extrabold text-maroon text-sm">{formatCurrency(fifoValuation)}</span>
                      <span className="block text-[8px] text-amber-600 mt-0.5">FIFO Average Rate: {formatCurrency(selectedRaw.currentStock > 0 ? fifoValuation / selectedRaw.currentStock : selectedRaw.unitCost)}</span>
                    </div>
                  </div>
                )}

                {/* FIFO Batches Details Box */}
                {!isStaff && activeBatches.length > 0 && (
                  <div className="col-span-2 border-t border-slate-100 dark:border-slate-855 pt-3 space-y-1.5">
                    <span className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">FIFO Active Batches Trace</span>
                    <div className="max-h-24 overflow-y-auto border border-slate-100 rounded bg-slate-50/50">
                      <table className="w-full text-left text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                            <th className="p-1 px-2">Batch Source / Date</th>
                            <th className="p-1 text-right">Remaining Qty</th>
                            <th className="p-1 text-right">Batch Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeBatches.map((b, idx) => (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="p-1 px-2 text-slate-600 font-semibold">{b.source}</td>
                              <td className="p-1 text-right font-bold text-slate-800">{b.qty} {selectedRaw.unit}</td>
                              <td className="p-1 text-right font-semibold text-slate-750">{formatCurrency(b.cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!isStaff && (
                  <div className="col-span-2 border-t border-slate-100 dark:border-slate-855 pt-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Supplier:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{getMaterialVendorInfo(selectedRaw.id).vendorName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Last Purchase Date:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{getMaterialVendorInfo(selectedRaw.id).lastPurchaseDate}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button type="button" onClick={() => setIsViewRawOpen(false)} className="bg-maroon text-white hover:bg-maroon/90">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Quick Add Stock */}
      <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
        <DialogContent className="sm:max-w-[400px] border-2 border-gold shadow-lg">
          <form onSubmit={handleSaveQuickStock}>
            <DialogHeader>
              <DialogTitle className="text-maroon text-lg">Quick Add Stock: {selectedRawForStock?.name}</DialogTitle>
              <DialogDescription>Increment the warehouse stock level for this raw material.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="addQty" className="text-right font-semibold">Qty to Add</Label>
                <Input
                  id="addQty"
                  type="number"
                  step="any"
                  value={addStockAmount || ''}
                  onChange={(e) => setAddStockAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 500"
                  className="col-span-3 border-gold"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddStockOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-maroon hover:bg-maroon/90 text-white">Add Stock</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 5.5: Manual Stock Reconciliation & Adjustment */}
      <Dialog open={isAdjustStockOpen} onOpenChange={setIsAdjustStockOpen}>
        <DialogContent className="sm:max-w-[450px] border-2 border-gold shadow-lg bg-white">
          <form onSubmit={handleSaveStockAdjustment}>
            <DialogHeader className="border-b border-gold/15 pb-2">
              <DialogTitle className="text-maroon text-lg">Physical Stock Audit Reconciliation</DialogTitle>
              <DialogDescription>
                Record discrepancies between physical counts and system bookkeeping.
              </DialogDescription>
            </DialogHeader>
            {adjustMaterial && (
              <div className="space-y-4 py-4 text-xs">
                <div className="p-3 bg-amber-50/15 border border-gold/15 rounded-lg space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Material Name:</span>
                    <span className="font-bold text-slate-800">{adjustMaterial.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Material ID:</span>
                    <span className="font-mono text-slate-700">{adjustMaterial.id}</span>
                  </div>
                  <div className="flex justify-between border-t border-gold/10 pt-1 mt-1 font-semibold text-slate-800">
                    <span>Book Stock Quantity:</span>
                    <span>{adjustMaterial.currentStock} {adjustMaterial.unit}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjustNewStock" className="font-bold text-slate-700">Actual Counted Stock ({adjustMaterial.unit})</Label>
                  <Input
                    id="adjustNewStock"
                    type="number"
                    step="any"
                    value={adjustNewStock === 0 ? '' : adjustNewStock}
                    onChange={(e) => setAdjustNewStock(parseFloat(e.target.value) || 0)}
                    placeholder="Enter physical stock count"
                    className="border-gold text-sm h-10 w-full"
                    required
                  />
                  <p className="text-[10px] text-slate-400 font-medium">
                    Discrepancy Variance Delta: <span className={`font-bold ${adjustNewStock - adjustMaterial.currentStock >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {adjustNewStock - adjustMaterial.currentStock >= 0 ? '+' : ''}
                      {(adjustNewStock - adjustMaterial.currentStock).toFixed(2)} {adjustMaterial.unit}
                    </span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjustReason" className="font-bold text-slate-700">Audit Discrepancy Reason</Label>
                  <select
                    id="adjustReason"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full rounded-md border border-gold/40 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gold h-10"
                  >
                    <option value="Physical Audit Discrepancy">Physical Audit Discrepancy</option>
                    <option value="Damaged / Spoiled Items">Damaged / Spoiled Items</option>
                    <option value="Reconciliation Adjustment">Reconciliation Adjustment</option>
                    <option value="Wastage / Spill log">Wastage / Spill log</option>
                    <option value="Production Overages">Production Overages</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjustNotes" className="font-bold text-slate-700">Auditor Notes</Label>
                  <textarea
                    id="adjustNotes"
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    placeholder="Explain the cause of variance (e.g. wet silks discarded, missing beads from box 2)"
                    className="w-full rounded-md border border-gold/40 bg-white p-2 text-xs focus:outline-none focus:ring-1 focus:ring-gold min-h-16 resize-none"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button type="button" variant="outline" onClick={() => setIsAdjustStockOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#7B0F1A] hover:bg-[#7B0F1A]/95 text-white">Save Reconciliation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 6: View BOM Details */}
      <Dialog open={isViewBOMOpen} onOpenChange={setIsViewBOMOpen}>
        <DialogContent className="border-2 border-gold shadow-lg w-[min(760px,calc(100vw-24px))] max-h-[min(88vh,920px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-maroon text-lg">BOM Details & Margins</DialogTitle>
            <DialogDescription>Formula and cost analysis of configured bill of materials.</DialogDescription>
          </DialogHeader>
          {selectedProductForBOM && (
            isBomUnitV2Enabled ? (
              <CompactBOMCard
                product={selectedProductForBOM}
                rawMaterials={rawMaterials}
                simQuantity={simQuantity}
                setSimQuantity={setSimQuantity}
                getProductAvailability={getProductAvailability}
                formatCurrency={formatCurrency}
                getImageUrl={getImageUrl}
                calculateProductLaborCost={calculateProductLaborCost}
              />
            ) : (() => {
              const hasBOM = selectedProductForBOM.bom && selectedProductForBOM.bom.length > 0;
              const avail = getProductAvailability(selectedProductForBOM);
              const bomCost = selectedProductForBOM.bom ? selectedProductForBOM.bom.reduce((sum: number, req: any) => {
                const mat = rawMaterials.find(m => m.id === req.materialId);
                const cost = mat ? mat.unitCost : 0;
                return sum + (req.quantity * cost);
              }, 0) : 0;
              
              const sell = selectedProductForBOM.rate;
              const laborCost = calculateProductLaborCost(selectedProductForBOM.id, selectedProductForBOM.vigat);
              const totalCost = bomCost + laborCost;
              const marginAbs = sell - totalCost;
              const marginPct = sell > 0 ? (marginAbs / sell) * 100 : 0;

              return (
                <div className="space-y-4 py-4 text-sm">
                  <div className="h-40 w-full rounded-lg bg-gradient-to-br from-[#122e1f] to-[#e5ded4] shadow-[inset_0_4px_20px_rgba(0,0,0,0.35)] border border-gold/20 flex items-center justify-center overflow-hidden p-2">
                    <img src={getImageUrl(selectedProductForBOM.id, selectedProductForBOM.photoUrl)} alt={selectedProductForBOM.vigat} className="max-w-full max-h-full w-auto h-auto object-contain object-center" />
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">{selectedProductForBOM.vigat} (Code: {selectedProductForBOM.id})</h4>
                      <p className="text-xs text-slate-400">HSN: {selectedProductForBOM.hsnCode}</p>
                    </div>
                    <Badge className={`border-none ${avail.status === 'Insufficient Materials' ? 'bg-red-100 text-red-800' : avail.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {avail.status}
                    </Badge>
                  </div>

                  {/* Simulation input */}
                  <div className="bg-amber-50/20 dark:bg-amber-955/10 p-3 rounded-lg border border-gold/20 flex justify-between items-center gap-4">
                    <div>
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-350">Simulate Production Quantity</Label>
                      <p className="text-[10px] text-slate-450 mt-0.5 font-medium">Verify stock feasibility for bulk orders</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input 
                        type="number" 
                        min="1" 
                        value={simQuantity} 
                        onChange={(e) => setSimQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-8 text-xs border-gold/40 w-20 bg-white dark:bg-gray-800 text-center font-bold"
                      />
                      <span className="text-xs font-semibold text-slate-500">pcs</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-455 dark:text-slate-400">Selling Price (1 pc):</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-250">{formatCurrency(sell)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-455 dark:text-slate-400">Net Cost (1 pc):</span>
                      <span className="font-semibold text-slate-750 dark:text-slate-250">{formatCurrency(totalCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-455 dark:text-slate-400">Estimated Margin (1 pc):</span>
                      <span className="font-bold text-green-600">{formatCurrency(marginAbs)} ({marginPct.toFixed(1)}%)</span>
                    </div>
                    <div className="border-t border-dashed my-2"></div>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-850 dark:text-slate-200">Simulated Total Cost ({simQuantity} pcs):</span>
                      <span className="text-maroon dark:text-saffron">{formatCurrency(totalCost * simQuantity)}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-2">
                    <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Required Ingredients & Cost Breakdown:</span>
                    {hasBOM ? (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {selectedProductForBOM.bom.map((req: any) => {
                          const mat = rawMaterials.find(m => m.id === req.materialId);
                          const rate = mat ? mat.unitCost : 0;
                          const currentStock = mat ? mat.currentStock : 0;
                          const unit = mat ? mat.unit : 'pcs';

                          const reqPerPiece = req.quantity;
                          const reqTotal = reqPerPiece * simQuantity;
                          const shortage = Math.max(0, reqTotal - currentStock);
                          const lineValue = reqTotal * rate;

                          let statusLabel = "Sufficient";
                          let statusColor = "text-green-600 dark:text-green-450";
                          if (shortage > 0) {
                            statusLabel = `Shortage: ${shortage} ${unit}`;
                            statusColor = "text-red-500 font-bold";
                          } else if (currentStock <= (mat?.minStockAlert || 0)) {
                            statusLabel = "Low Stock Alert";
                            statusColor = "text-yellow-600 dark:text-yellow-405 font-medium";
                          }

                          return (
                            <div key={req.materialId} className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-slate-705 dark:text-slate-300">{mat ? mat.name : req.materialId}</p>
                                  <p className="text-[10px] text-slate-400">
                                    Req per pc: {reqPerPiece} {unit} • Cost rate: {formatCurrency(rate)} / {unit}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold block text-slate-700 dark:text-slate-350">{formatCurrency(lineValue)}</span>
                                  <span className="text-[10px] text-slate-450 block">Est. Value</span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-450 border-t border-slate-100/50 dark:border-slate-800/50 pt-1">
                                <div>Stock: <strong>{currentStock} {unit}</strong></div>
                                <div className="text-center">Required: <strong>{reqTotal} {unit}</strong></div>
                                <div className={`text-right ${statusColor}`}>{statusLabel}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-red-500 italic">BOM formula is not configured yet.</p>
                    )}
                  </div>
                </div>
              );
            })()
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setIsViewBOMOpen(false)} className="bg-maroon text-white hover:bg-maroon/90">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 7: StockAlertModal */}
      <StockAlertModal
        isOpen={isWaNumberSelectOpen}
        onClose={() => setIsWaNumberSelectOpen(false)}
        alert={waSelectedAlert}
        imageUrl={waSelectedAlert ? getImageUrl(waSelectedAlert.productId, waSelectedAlert.productImage) : ''}
        onSendAlert={handleExecuteSendAlert}
        onSendToAll={handleExecuteSendToAll}
      />
    </div>
  );
};

export default Inventory;
