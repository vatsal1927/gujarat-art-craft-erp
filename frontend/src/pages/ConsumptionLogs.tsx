import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useConsumptionLogs, useProducts, useRawMaterials } from '../hooks/useQueries';
import { formatCurrency } from '../utils/currencyFormat';
import { formatERPDateTime } from '../utils/calculations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCw, FileSpreadsheet, AlertTriangle, Calendar, User } from 'lucide-react';
import { useActor } from '../hooks/useActor';
import { toast } from 'sonner';

const ConsumptionLogs = () => {
  const { actor } = useActor();
  const { data: consumptionLogs = [], isLoading, refetch } = useConsumptionLogs();
  const { data: products = [] } = useProducts();
  const { data: rawMaterials = [] } = useRawMaterials();

  const navigate = useNavigate();

  const isBomUnitV2Enabled = import.meta.env.VITE_FEATURE_BOM_UNIT_V2 !== 'false';

  const getCustomSymbolAndQty = (productName: string, rawMaterialName: string, quantityUsed: number, fallbackUnit: string) => {
    if (!isBomUnitV2Enabled) return { symbol: fallbackUnit, qty: quantityUsed };
    const prodName = productName?.trim().toLowerCase();
    const rawName = rawMaterialName?.trim().toLowerCase();
    const prod = products.find(p => p.vigat?.trim().toLowerCase() === prodName);
    if (prod && prod.bom) {
      const req = prod.bom.find((b: any) => {
        const mat = rawMaterials.find((m: any) => m.id?.trim().toLowerCase() === b.materialId?.trim().toLowerCase());
        const matName = mat ? mat.name?.trim().toLowerCase() : '';
        const bomMatId = b.materialId?.trim().toLowerCase();
        return matName === rawName || bomMatId === rawName;
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
    const searchName = rawMaterialName?.trim().toLowerCase();
    const mat = rawMaterials.find(m => 
      m.name?.trim().toLowerCase() === searchName || 
      m.id?.trim().toLowerCase() === searchName
    );
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

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [logProductFilter, setLogProductFilter] = useState('All');
  const [logMaterialFilter, setLogMaterialFilter] = useState('All');
  const [logEmployeeFilter, setLogEmployeeFilter] = useState('All');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState('All');

  // Image storage helper
  const getImageUrl = (id: string, fallbackUrl?: string) => {
    const customImages = JSON.parse(localStorage.getItem('mock_uploaded_images') || '{}');
    return customImages[id] || fallbackUrl || 'https://images.unsplash.com/photo-1530087965147-7a72d733c56a?w=1200&h=800&fit=crop&q=90&fm=jpg';
  };

  const handleGenerateDemo = async () => {
    if (!actor) return;
    const toastId = toast.loading('Generating demo consumption logs...');
    try {
      const msg = await (actor as any).generateDemoConsumptionLogs();
      toast.success(msg, { id: toastId });
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate demo logs', { id: toastId });
    }
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
          acceptedQty: log.acceptedQty !== undefined ? Number(log.acceptedQty) : 0,
          rawMaterials: [],
          totalCost: 0,
          totalQuantityUsed: 0
        };
      }

      const unitCost = log.unitCost !== undefined 
        ? Number(log.unitCost) 
        : (Number(log.quantityUsed) > 0 ? Number(log.cost) / Number(log.quantityUsed) : 0);

      groups[key].rawMaterials.push({
        rawMaterialName: log.rawMaterialName,
        quantityUsed: Number(log.quantityUsed),
        unit: log.unit,
        unitCost,
        cost: Number(log.cost)
      });

      groups[key].totalCost += Number(log.cost);
      groups[key].totalQuantityUsed += Number(log.quantityUsed);

      if (log.acceptedQty && !groups[key].acceptedQty) {
        groups[key].acceptedQty = Number(log.acceptedQty);
      }
    });

    return Object.values(groups).sort((a, b) => Number(b.date) - Number(a.date));
  };

  const groupedLogs = groupConsumptionLogs(consumptionLogs);

  const filteredGroupedLogs = groupedLogs.filter(group => {
    const matchesSearch = searchQuery === '' || 
      group.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.employee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.jobWorkNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.rawMaterials.some(m => m.rawMaterialName.toLowerCase().includes(searchQuery.toLowerCase()));

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

  // Distinct Filter lists
  const distinctLogProducts = ['All', ...Array.from(new Set(consumptionLogs.map(log => log.productName))).filter(Boolean)];
  const distinctLogMaterials = ['All', ...Array.from(new Set(consumptionLogs.map(log => log.rawMaterialName))).filter(Boolean)];
  const distinctLogEmployees = ['All', ...Array.from(new Set(consumptionLogs.map(log => log.employee))).filter(Boolean)];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-maroon dark:text-saffron flex items-center gap-2">
            <FileSpreadsheet className="h-8 w-8 text-saffron" /> Production Consumption Logs
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Track and manage raw materials consumed during artisan manufacturing cycles.</p>
        </div>
        <div className="flex gap-2">
          {import.meta.env.DEV && (
            <Button onClick={handleGenerateDemo} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9">
              Generate Demo Consumption Logs
            </Button>
          )}
          <Button onClick={() => refetch()} variant="outline" className="border-gold text-maroon hover:bg-gold/10">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      <Card className="border-2 border-gold shadow-md">
        <CardHeader className="bg-amber-50/20 border-b border-gold/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
          <div>
            <CardTitle className="text-maroon text-lg">Consumption Records</CardTitle>
            <CardDescription>Material consumption ledger containing collection, job work, and employee details.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center border border-gold/40 rounded bg-white dark:bg-gray-800 px-3 py-1.5 text-xs">
              <Search className="h-4 w-4 text-slate-400 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
          {isLoading ? (
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
                          <span className="font-bold text-slate-700 dark:text-slate-350 text-xs">
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
                                <div className="flex justify-between items-center font-bold text-slate-705 dark:text-slate-305 font-bold">
                                  <span>{mat.rawMaterialName}</span>
                                  <span className="text-red-500 font-bold">-{custom.qty.toFixed(custom.qty % 1 === 0 ? 0 : 2)} {custom.symbol}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-450 mt-0.5 border-t border-slate-100/50 dark:border-slate-800/50 pt-1">
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
                          <div className="text-[10px] text-red-650 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded border border-red-100 dark:border-red-950/30 font-bold">
                            ❌ Warning: Negative stock shortage occurred for this posting.
                          </div>
                        )}

                        <Button 
                          type="button" 
                          onClick={() => navigate({ to: '/inventory', search: { tab: 'finished-goods', search: group.productName } as any })} 
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
    </div>
  );
};

export default ConsumptionLogs;
