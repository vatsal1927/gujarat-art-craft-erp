import React, { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { BOMEntryV2, UnitConfig } from '../../types/inventoryUnits';
import { Package } from 'lucide-react';

interface CompactBOMCardProps {
  product: any;
  rawMaterials: any[];
  simQuantity: number;
  setSimQuantity: (val: number) => void;
  getProductAvailability: (prod: any) => any;
  formatCurrency: (val: number) => string;
  getImageUrl: (id: string, fallbackUrl?: string) => string;
  calculateProductLaborCost: (id: string, vigat: string) => number;
}

export const CompactBOMCard: React.FC<CompactBOMCardProps> = ({
  product,
  rawMaterials,
  simQuantity,
  setSimQuantity,
  getProductAvailability,
  formatCurrency,
  getImageUrl,
  calculateProductLaborCost,
}) => {
  useEffect(() => {
    // Dev-only logs
    console.log(`[CompactBOMCard] productId=${product.id}, imageAspect=1:1`);
  }, [product.id]);

  const hasBOM = product.bom && product.bom.length > 0;
  const avail = getProductAvailability(product);
  
  // Calculate BOM Cost using conversion to base units if present
  const bomCost = product.bom ? product.bom.reduce((sum: number, req: any) => {
    const mat = rawMaterials.find(m => m.id === req.materialId);
    const rate = mat ? mat.unitCost : 0;
    
    // Support V2 qtyPerUnitBase or V1 quantity
    const quantityRequired = req.schemaVersion === 2
      ? (req.qtyPerUnitBase !== undefined ? req.qtyPerUnitBase : req.qtyPerUnit)
      : (req.quantity || 0);

    return sum + (quantityRequired * rate);
  }, 0) : 0;

  const sell = product.rate || 0;
  const laborCost = calculateProductLaborCost(product.id, product.vigat);
  const totalCost = bomCost + laborCost;
  const marginAbs = sell - totalCost;
  const marginPct = sell > 0 ? (marginAbs / sell) * 100 : 0;

  return (
    <div className="space-y-4 py-2 text-sm max-w-full">
      {/* 2-column layout on Desktop, stacked on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left side: Aspect ratio 1:1 Square Image */}
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-[#122e1f] to-[#e5ded4] rounded-lg border border-gold/20 shadow-[inset_0_4px_20px_rgba(0,0,0,0.35)] overflow-hidden aspect-square w-full max-w-[280px] mx-auto md:max-w-none">
          <img 
            src={getImageUrl(product.id, product.photoUrl)} 
            alt={product.vigat} 
            className="w-full h-full object-cover object-center aspect-square" 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = '';
                const fallbackContainer = document.createElement('div');
                fallbackContainer.className = 'w-full h-full flex items-center justify-center bg-[#FDFBF7] text-[#7A0019]';
                fallbackContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-12 w-12 text-[#7A0019]"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
                parent.appendChild(fallbackContainer);
              }
            }}
          />
        </div>

        {/* Right side: Summary & Status */}
        <div className="flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between items-start gap-2">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base leading-tight">{product.vigat}</h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Code: {product.id} • HSN: {product.hsnCode}</p>
              </div>
              <Badge className={`border-none shrink-0 ${avail.status === 'Insufficient Materials' ? 'bg-red-100 text-red-800' : avail.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                {avail.status}
              </Badge>
            </div>

            {/* Pricing Details */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Selling Price:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-250">{formatCurrency(sell)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Net Cost (1 pc):</span>
                <span className="font-semibold text-slate-700 dark:text-slate-250">{formatCurrency(totalCost)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Profit Margin:</span>
                <span className="font-bold text-green-600">{formatCurrency(marginAbs)} ({marginPct.toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          {/* Simulator Panel */}
          <div className="bg-amber-50/20 dark:bg-amber-955/10 p-3 rounded-lg border border-gold/20 space-y-2">
            <div className="flex justify-between items-center gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Simulate Production</Label>
                <p className="text-[9px] text-slate-450 mt-0.5 leading-none">Verify stock sufficiency for batch</p>
              </div>
              <div className="flex items-center gap-1">
                <Input 
                  type="number" 
                  min="1" 
                  value={simQuantity} 
                  onChange={(e) => setSimQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-8 text-xs border-gold/40 w-16 bg-white dark:bg-gray-800 text-center font-bold"
                />
                <span className="text-xs text-slate-500 font-semibold">pcs</span>
              </div>
            </div>
            <div className="border-t border-gold/10 pt-1.5 flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <span>Simulated Cost:</span>
              <span className="text-maroon dark:text-saffron">{formatCurrency(totalCost * simQuantity)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Required Ingredients Section */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
        <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Required Ingredients & Cost Breakdown:</span>
        {hasBOM ? (
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
            {product.bom.map((req: any) => {
              const mat = rawMaterials.find(m => m.id === req.materialId);
              const rate = mat ? mat.unitCost : 0;
              const currentStock = mat ? mat.currentStock : 0;
              
              // Support V2 qtyPerUnit/unitConfig details or fallback to legacy pcs
              const isV2 = req.schemaVersion === 2;
              const symbol = isV2 && req.unitConfig ? req.unitConfig.symbol : (mat?.unit || 'pcs');
              const qtyPerUnit = isV2 ? req.qtyPerUnit : (req.quantity || 0);
              
              const conversion = isV2 && req.unitConfig?.conversionToBase ? req.unitConfig.conversionToBase : 1;
              const reqTotal = qtyPerUnit * simQuantity;
              const reqTotalBase = reqTotal * conversion;
              const shortageBase = Math.max(0, reqTotalBase - currentStock);

              const lineValue = reqTotalBase * rate;

              let statusLabel = "Sufficient";
              let statusColor = "text-green-600 dark:text-green-450";
              if (shortageBase > 0) {
                const shortageDisplay = shortageBase / conversion;
                statusLabel = `Short: ${shortageDisplay.toFixed(1)} ${symbol}`;
                statusColor = "text-red-500 font-bold";
              } else if (currentStock <= (mat?.minStockAlert || 0)) {
                statusLabel = "Low Stock Alert";
                statusColor = "text-yellow-600 dark:text-yellow-405 font-medium";
              }

              return (
                <div key={req.materialId} className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-705 dark:text-slate-300" title={isV2 ? req.unitConfig?.label : undefined}>
                        {mat ? mat.name : req.materialId}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Req: {qtyPerUnit} {symbol} / pc • Rate: {formatCurrency(rate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold block text-slate-700 dark:text-slate-350">{formatCurrency(lineValue)}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-450 border-t border-slate-100/50 dark:border-slate-800/50 pt-1">
                    <div>Stock: <strong>{currentStock} {mat?.unit || 'pcs'}</strong></div>
                    <div className="text-center">Req Total: <strong>{reqTotal} {symbol}</strong></div>
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
};
