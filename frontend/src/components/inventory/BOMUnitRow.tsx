import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash, Check, ChevronDown, Package } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { UnitType, UnitConfig } from '../../types/inventoryUnits';
import { getDefaultStep } from '../../utils/unitConfig';

interface BOMUnitRowProps {
  index: number;
  row: {
    materialId: string;
    qtyPerUnit: number;
    unitConfig: UnitConfig;
  };
  rawMaterials: any[];
  onUpdate: (index: number, updatedFields: Partial<{ materialId: string; qtyPerUnit: number; unitConfig: UnitConfig }>) => void;
  onRemove: (index: number) => void;
  layout?: 'table-row' | 'mobile-card';
  portalContainer?: HTMLElement | null;
}

export const BOMUnitRow: React.FC<BOMUnitRowProps> = ({
  index,
  row,
  rawMaterials,
  onUpdate,
  onRemove,
  layout = 'table-row',
  portalContainer,
}) => {
  const handleMaterialChange = (materialId: string) => {
    const mat = rawMaterials.find(m => m.id === materialId);
    const legacyUnit = mat ? mat.unit : 'pcs';
    const inferredType = inferUnitTypeFromLegacy(legacyUnit);
    onUpdate(index, {
      materialId,
      unitConfig: {
        label: legacyUnit === 'kg' ? 'Kilogram' : legacyUnit === 'meters' ? 'Meter' : legacyUnit === 'pcs' ? 'Pieces' : legacyUnit || 'Piece',
        type: inferredType,
        symbol: legacyUnit === 'meters' ? 'm' : legacyUnit || 'pcs',
        conversionToBase: 1
      }
    });
  };

  const handleConfigChange = (key: keyof UnitConfig, value: any) => {
    onUpdate(index, {
      unitConfig: {
        ...row.unitConfig,
        [key]: value
      }
    });
  };

  const step = getDefaultStep(row.unitConfig.type);

  if (layout === 'table-row') {
    return (
      <tr className="hover:bg-amber-50/15 dark:hover:bg-slate-900/40 transition-colors border-b border-[#EBD9A6]/40 last:border-b-0">
        <td className="p-3 align-middle">
          <SearchableMaterialSelect 
            value={row.materialId} 
            onChange={handleMaterialChange} 
            rawMaterials={rawMaterials} 
            portalContainer={portalContainer}
          />
        </td>
        <td className="p-3 align-middle">
          <Input
            type="text"
            value={row.unitConfig.label || ''}
            onChange={(e) => handleConfigChange('label', e.target.value)}
            placeholder="e.g. Kilogram"
            className="border-[#E6C36A] text-base h-12 bg-white dark:bg-slate-955 px-3.5 rounded-[12px] focus-visible:ring-1 focus-visible:ring-[#D4A017] focus-visible:border-[#D4A017]"
            minLength={2}
            maxLength={24}
            required
          />
        </td>
        <td className="p-3 align-middle">
          <Select 
            value={row.unitConfig.type} 
            onValueChange={(val: UnitType) => handleConfigChange('type', val)}
          >
            <SelectTrigger className="border-[#E6C36A] text-base bg-white dark:bg-slate-950 h-12 px-3.5 rounded-[12px] focus:ring-1 focus:ring-[#D4A017] focus:border-[#D4A017] w-full text-left">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
              <SelectItem value="weight" className="text-xs">Weight</SelectItem>
              <SelectItem value="length" className="text-xs">Length</SelectItem>
              <SelectItem value="count" className="text-xs">Count</SelectItem>
              <SelectItem value="area" className="text-xs">Area</SelectItem>
              <SelectItem value="volume" className="text-xs">Volume</SelectItem>
              <SelectItem value="time" className="text-xs">Time</SelectItem>
              <SelectItem value="other" className="text-xs">Other</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="p-3 align-middle">
          <Input
            type="text"
            value={row.unitConfig.symbol || ''}
            onChange={(e) => handleConfigChange('symbol', e.target.value)}
            placeholder="e.g. kg"
            className="border-[#E6C36A] text-base h-12 bg-white dark:bg-slate-955 px-3.5 rounded-[12px] focus-visible:ring-1 focus-visible:ring-[#D4A017] focus-visible:border-[#D4A017]"
            minLength={1}
            maxLength={8}
            required
          />
        </td>
        <td className="p-3 align-middle">
          <Input
            type="number"
            step={step}
            min="0.0001"
            value={row.qtyPerUnit || ''}
            onChange={(e) => onUpdate(index, { qtyPerUnit: parseFloat(e.target.value) || 0 })}
            placeholder="Qty"
            className="border-[#E6C36A] text-center text-base h-12 bg-white dark:bg-slate-950 font-bold rounded-[12px] focus-visible:ring-1 focus-visible:ring-[#D4A017] focus-visible:border-[#D4A017]"
            required
          />
        </td>
        <td className="p-3 text-center align-middle">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 h-12 w-12 rounded-[12px] transition-colors"
          >
            <Trash className="h-5 w-5" />
          </Button>
        </td>
      </tr>
    );
  }

  // Mobile card stacked layout
  return (
    <div className="border border-gold/20 rounded-xl p-4 bg-white dark:bg-slate-955 space-y-3 shadow-xs">
      <div className="flex justify-between items-center border-b border-gold/10 pb-2">
        <span className="text-xs font-bold text-maroon">Material Item #{index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="text-slate-400 hover:text-red-500 h-7 w-7 p-0"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-[10px] font-bold text-slate-400 uppercase">Raw Material</Label>
          <SearchableMaterialSelect 
            value={row.materialId} 
            onChange={handleMaterialChange} 
            rawMaterials={rawMaterials} 
            portalContainer={portalContainer}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] font-bold text-slate-400 uppercase">Unit Label</Label>
            <Input
              type="text"
              value={row.unitConfig.label || ''}
              onChange={(e) => handleConfigChange('label', e.target.value)}
              placeholder="e.g. Kilogram"
              className="border-gold/50 text-xs h-9"
              minLength={2}
              maxLength={24}
              required
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold text-slate-400 uppercase">Unit Type</Label>
            <Select 
              value={row.unitConfig.type} 
              onValueChange={(val: UnitType) => handleConfigChange('type', val)}
            >
              <SelectTrigger className="border-gold/50 text-xs h-9">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                <SelectItem value="weight" className="text-xs">Weight</SelectItem>
                <SelectItem value="length" className="text-xs">Length</SelectItem>
                <SelectItem value="count" className="text-xs">Count</SelectItem>
                <SelectItem value="area" className="text-xs">Area</SelectItem>
                <SelectItem value="volume" className="text-xs">Volume</SelectItem>
                <SelectItem value="time" className="text-xs">Time</SelectItem>
                <SelectItem value="other" className="text-xs">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] font-bold text-slate-400 uppercase">Unit Symbol</Label>
            <Input
              type="text"
              value={row.unitConfig.symbol || ''}
              onChange={(e) => handleConfigChange('symbol', e.target.value)}
              placeholder="e.g. kg"
              className="border-gold/50 text-xs h-9"
              minLength={1}
              maxLength={8}
              required
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold text-slate-400 uppercase">Qty / Unit</Label>
            <Input
              type="number"
              step={step}
              min="0.0001"
              value={row.qtyPerUnit || ''}
              onChange={(e) => onUpdate(index, { qtyPerUnit: parseFloat(e.target.value) || 0 })}
              placeholder="Qty"
              className="border-gold/50 text-center text-xs h-9 font-bold"
              required
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Searchable custom Combobox using Radix Popover and Portal to avoid clipping
export const SearchableMaterialSelect: React.FC<{
  value: string;
  onChange: (val: string) => void;
  rawMaterials: any[];
  portalContainer?: HTMLElement | null;
}> = ({ value, onChange, rawMaterials, portalContainer }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedMaterial = rawMaterials.find(m => m.id === value);

  const renderThumbnail = (mat: any) => {
    const imageUrl = mat?.photoUrl || '';
    
    return (
      <div className="w-8 h-8 rounded-[6px] bg-[#FFFDF8] dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-[#E6C36A]/45">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={mat?.name}
            className="w-full h-full object-cover aspect-square"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                // Clear contents and insert fallback Package icon SVG
                parent.innerHTML = '';
                const fallbackContainer = document.createElement('div');
                fallbackContainer.className = 'w-full h-full flex items-center justify-center bg-[#FDFBF7] text-[#7A0019]';
                fallbackContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-[#7A0019]"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
                parent.appendChild(fallbackContainer);
              }
            }}
          />
        ) : (
          <Package className="h-4 w-4 text-[#7A0019] dark:text-gold" />
        )}
      </div>
    );
  };

  const filteredMaterials = rawMaterials.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex items-center justify-between border border-[#E6C36A] rounded-[12px] px-3.5 text-base bg-white dark:bg-slate-950 h-12 cursor-pointer w-full text-left focus:outline-none focus:ring-1 focus:ring-[#D4A017] focus:border-[#D4A017]"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {selectedMaterial ? (
              <>
                {renderThumbnail(selectedMaterial)}
                <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                  {selectedMaterial.name}
                </span>
              </>
            ) : (
              <span className="text-slate-400">Select Raw Material</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-slate-500 shrink-0 ml-1" />
        </button>
      </PopoverTrigger>
      
      <PopoverContent className="p-0 w-80 bg-white dark:bg-slate-900 border border-gold/30 rounded-md shadow-xl z-[9999]" align="start" container={portalContainer}>
        <div className="p-2 border-b border-slate-100 dark:border-slate-800">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search raw material..."
            className="w-full px-3 py-2 text-xs border border-gold/20 rounded-md outline-none bg-slate-50 dark:bg-slate-955 font-medium h-9"
          />
        </div>
        
        <div 
          className="max-h-[280px] overflow-y-auto overscroll-contain touch-pan-y divide-y divide-slate-50 dark:divide-slate-800/40"
          onWheel={(e) => {
            e.stopPropagation();
          }}
        >
          {filteredMaterials.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 italic text-center">No materials found</div>
          ) : (
            filteredMaterials.map(m => (
              <div
                key={m.id}
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                  setSearch('');
                }}
                className={`flex items-center gap-3 px-3 py-2 text-xs hover:bg-slate-100/70 dark:hover:bg-slate-800/50 cursor-pointer ${m.id === value ? 'bg-amber-50/30 dark:bg-slate-800/40 font-bold' : ''}`}
              >
                {renderThumbnail(m)}
                <span className="font-medium text-slate-700 dark:text-slate-200">{m.name}</span>
                {m.id === value && <Check className="ml-auto h-3.5 w-3.5 text-green-600 shrink-0" />}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

function inferUnitTypeFromLegacy(unit: string): UnitType {
  const normalized = (unit || '').toLowerCase().trim();
  if (normalized === 'kg' || normalized === 'gram' || normalized === 'g' || normalized === 'kilogram' || normalized === 'weight') {
    return 'weight';
  }
  if (normalized === 'm' || normalized === 'meter' || normalized === 'meters' || normalized === 'cm' || normalized === 'centimeter' || normalized === 'length') {
    return 'length';
  }
  if (normalized === 'pcs' || normalized === 'piece' || normalized === 'pieces' || normalized === 'count' || normalized === 'dozen' || normalized === 'bundle') {
    return 'count';
  }
  if (normalized === 'sqm' || normalized === 'sqft' || normalized === 'area') {
    return 'area';
  }
  if (normalized === 'l' || normalized === 'ml' || normalized === 'litre' || normalized === 'volume') {
    return 'volume';
  }
  if (normalized === 'hr' || normalized === 'min' || normalized === 'time') {
    return 'time';
  }
  return 'other';
}
