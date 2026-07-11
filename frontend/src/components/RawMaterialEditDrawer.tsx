import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useRawMaterialForm } from '../hooks/useRawMaterialForm';
import { 
  X, 
  Upload, 
  Trash2, 
  FileText, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  Truck, 
  Image as ImageIcon,
  Loader2,
  Calendar,
  MapPin
} from 'lucide-react';
import { formatCurrency } from '../utils/currencyFormat';
import { toast } from 'sonner';

interface RawMaterialEditDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  materialId: string | null; // null means adding a new material
  canDelete?: boolean;
  onDelete?: (id: string, name: string) => void;
}

export default function RawMaterialEditDrawer({
  isOpen,
  onOpenChange,
  materialId,
  canDelete = false,
  onDelete,
}: RawMaterialEditDrawerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const onClose = () => {
    onOpenChange(false);
  };

  const {
    formData,
    errors,
    isUploading,
    uploadError,
    onChange,
    onBlur,
    onFileChange,
    onRemoveFile,
    onSubmit,
    availableSuppliers,
    addCustomSupplier,
  } = useRawMaterialForm(materialId, onClose);

  // Dropdown / Searchable Selector State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on open
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const stockValue = (formData.openingStock || 0) * (formData.unitCost || 0);
  const categories = ['General', 'Beads', 'Fabric', 'Mirrors', 'Thread', 'Lace', 'Zari', 'Others'];

  const handleDelete = () => {
    if (materialId && onDelete) {
      onDelete(materialId, formData.name);
      onClose();
    }
  };

  // Filter suppliers in autocomplete
  const filteredSuppliers = availableSuppliers.filter(s =>
    s.vendorName.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const handleSelectSupplier = (s: typeof availableSuppliers[0]) => {
    onChange('supplier', s.vendorName);
    onChange('vendorId', s.vendorId || s.vendorMobile || s.vendorName);
    onChange('vendorMobile', s.vendorMobile && s.vendorMobile !== 'N/A' ? s.vendorMobile : '');
    onChange('vendorGSTIN', s.vendorGstNumber && s.vendorGstNumber !== 'N/A' ? s.vendorGstNumber : '');
    setIsDropdownOpen(false);
    setSupplierSearch('');
    setFocusedIndex(-1);
  };

  const handleAddNewSupplier = (name: string) => {
    if (!name.trim()) return;
    const newSupplier = {
      vendorName: name.trim(),
      vendorId: name.trim(),
      vendorMobile: '',
      vendorGstNumber: '',
      vendorAddress: ''
    };
    addCustomSupplier(newSupplier);
    setIsDropdownOpen(false);
    setSupplierSearch('');
    setFocusedIndex(-1);
    toast.success(`Added and selected new supplier: "${name.trim()}"`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev + 1) % (filteredSuppliers.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev - 1 + (filteredSuppliers.length || 1)) % (filteredSuppliers.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && filteredSuppliers[focusedIndex]) {
        handleSelectSupplier(filteredSuppliers[focusedIndex]);
      } else if (supplierSearch.trim()) {
        handleAddNewSupplier(supplierSearch);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        showCloseButton={false}
        className="max-w-none w-[min(920px,94vw)] max-h-[90vh] bg-[#FDFBF7] border-2 border-[#C89B3C] p-0 flex flex-col overflow-hidden rounded-2xl shadow-2xl duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header Section */}
        <DialogHeader className="bg-[#7B0F1A] text-[#F8F2E8] p-5 flex flex-row items-start justify-between border-b-2 border-[#C89B3C] flex-shrink-0 relative">
          <div className="space-y-1 pr-10">
            <DialogTitle id="modal-title" className="text-xl font-bold tracking-wider text-[#D4A017] uppercase flex items-center gap-2">
              <Package className="h-5 w-5 text-[#D4A017]" />
              {materialId ? 'Edit Raw Material' : 'Create Raw Material'}
            </DialogTitle>
            <DialogDescription className="text-[#F8F2E8]/80 text-xs">
              {materialId ? `Modify properties and tracking rules for Code: ${formData.id}` : 'Register a new raw material item to your ERP inventory ledger.'}
            </DialogDescription>
          </div>
          <Button 
            type="button"
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-[#F8F2E8] hover:bg-white/10 rounded-full h-9 w-9 p-0 flex items-center justify-center absolute top-5 right-5"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        {/* Form Container wrapping body + footer */}
        <form onSubmit={onSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6 bg-[#FDFBF7]">
            
            {/* Card 1: Basic Information */}
            <div className="bg-[#F8F2E8] border border-[#C89B3C]/30 rounded-2xl p-5 md:p-6 shadow-sm space-y-4 w-full">
              <h3 className="text-sm font-extrabold text-[#7B0F1A] uppercase tracking-wider border-b border-[#C89B3C]/20 pb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#D4A017]" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Material Name */}
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="rm-name" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">
                    Material Name <span className="text-red-600 ml-0.5">*</span>
                  </Label>
                  <Input
                    id="rm-name"
                    value={formData.name}
                    onChange={(e) => onChange('name', e.target.value)}
                    onBlur={() => onBlur('name')}
                    placeholder="e.g. Premium Silk Thread"
                    className={`h-11 rounded-xl border border-[#C89B3C] px-3 text-sm bg-white text-[#3A1F12] focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#D4A017] focus:border-transparent w-full min-w-0 transition-all ${errors.name ? 'border-red-500 focus-visible:ring-red-500 focus:ring-red-500' : ''}`}
                    aria-required="true"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "rm-name-error" : undefined}
                  />
                  {errors.name && (
                    <span id="rm-name-error" className="text-xs text-red-500 font-semibold block mt-0.5">
                      {errors.name}
                    </span>
                  )}
                </div>

                {/* Material Code */}
                <div className="space-y-1">
                  <Label htmlFor="rm-code" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">
                    Material Code (ID) <span className="text-[#D4A017] font-normal lowercase">(Read-only)</span>
                  </Label>
                  <Input
                    id="rm-code"
                    value={formData.id}
                    disabled
                    className="h-11 rounded-xl border border-[#C89B3C] px-3 text-sm bg-white/60 text-[#3A1F12] cursor-not-allowed opacity-80 w-full min-w-0"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <Label htmlFor="rm-category" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">Category</Label>
                  <select
                    id="rm-category"
                    value={formData.category}
                    onChange={(e) => onChange('category', e.target.value)}
                    className="w-full rounded-xl border border-[#C89B3C] bg-white px-3 py-2 text-sm text-[#3A1F12] focus:outline-none focus:ring-2 focus:ring-[#D4A017] focus:border-transparent h-11 min-w-0 transition-all"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit of Measure */}
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="rm-unit" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">Unit of Measure</Label>
                  <Input
                    id="rm-unit"
                    value={formData.unit}
                    onChange={(e) => onChange('unit', e.target.value)}
                    placeholder="e.g. meters, pcs, kgs"
                    className="h-11 rounded-xl border border-[#C89B3C] px-3 text-sm bg-white text-[#3A1F12] focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#D4A017] focus:border-transparent w-full min-w-0 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Storage & Logistics Location */}
            <div className="bg-[#F8F2E8] border border-[#C89B3C]/30 rounded-2xl p-5 md:p-6 shadow-sm space-y-4 w-full">
              <h3 className="text-sm font-extrabold text-[#7B0F1A] uppercase tracking-wider border-b border-[#C89B3C]/20 pb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#D4A017]" />
                Warehouse Storage Location
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Warehouse */}
                <div className="space-y-1">
                  <Label htmlFor="rm-warehouse" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">Warehouse</Label>
                  <select
                    id="rm-warehouse"
                    value={formData.warehouse}
                    onChange={(e) => onChange('warehouse', e.target.value)}
                    className="w-full rounded-xl border border-[#C89B3C] bg-white px-3 py-2 text-sm text-[#3A1F12] focus:outline-none focus:ring-2 focus:ring-[#D4A017] focus:border-transparent h-11 min-w-0 transition-all"
                  >
                    <option value="Main Warehouse">Main Warehouse</option>
                    <option value="Raw Materials Shed">Raw Materials Shed</option>
                    <option value="Assembly Floor Store">Assembly Floor Store</option>
                    <option value="Secured Vault">Secured Vault</option>
                  </select>
                </div>

                {/* Storage Rack */}
                <div className="space-y-1">
                  <Label htmlFor="rm-storagerack" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">Storage Rack</Label>
                  <Input
                    id="rm-storagerack"
                    value={formData.storageRack}
                    onChange={(e) => onChange('storageRack', e.target.value)}
                    placeholder="e.g. Rack A-1"
                    className="h-11 rounded-xl border border-[#C89B3C] px-3 text-sm bg-white text-[#3A1F12] focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#D4A017] focus:border-transparent w-full min-w-0 transition-all"
                  />
                </div>

                {/* Bin Location */}
                <div className="space-y-1">
                  <Label htmlFor="rm-binlocation" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">Bin Location</Label>
                  <Input
                    id="rm-binlocation"
                    value={formData.binLocation}
                    onChange={(e) => onChange('binLocation', e.target.value)}
                    placeholder="e.g. Bin 01"
                    className="h-11 rounded-xl border border-[#C89B3C] px-3 text-sm bg-white text-[#3A1F12] focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#D4A017] focus:border-transparent w-full min-w-0 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Stock & Pricing */}
            <div className="bg-[#F8F2E8] border border-[#C89B3C]/30 rounded-2xl p-5 md:p-6 shadow-sm space-y-4 w-full">
              <h3 className="text-sm font-extrabold text-[#7B0F1A] uppercase tracking-wider border-b border-[#C89B3C]/20 pb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[#D4A017]" />
                Stock & Pricing
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opening Stock */}
                <div className="space-y-1">
                  <Label htmlFor="rm-opening-stock" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">Opening Stock</Label>
                  <Input
                    id="rm-opening-stock"
                    type="number"
                    min="0"
                    step="any"
                    value={formData.openingStock === 0 ? '' : formData.openingStock}
                    onChange={(e) => onChange('openingStock', parseFloat(e.target.value) || 0)}
                    onBlur={() => onBlur('openingStock')}
                    placeholder="0"
                    className={`h-11 rounded-xl border border-[#C89B3C] px-3 text-sm bg-white text-[#3A1F12] focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#D4A017] focus:border-transparent w-full min-w-0 transition-all ${errors.openingStock ? 'border-red-500' : ''}`}
                    aria-invalid={!!errors.openingStock}
                    aria-describedby={errors.openingStock ? "rm-opening-stock-error" : undefined}
                  />
                  {errors.openingStock && (
                    <span id="rm-opening-stock-error" className="text-xs text-red-500 font-semibold block mt-0.5">
                      {errors.openingStock}
                    </span>
                  )}
                </div>

                {/* Unit Cost */}
                <div className="space-y-1">
                  <Label htmlFor="rm-unit-cost" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">Unit Cost (₹)</Label>
                  <Input
                    id="rm-unit-cost"
                    type="number"
                    min="0"
                    step="any"
                    value={formData.unitCost === 0 ? '' : formData.unitCost}
                    onChange={(e) => onChange('unitCost', parseFloat(e.target.value) || 0)}
                    onBlur={() => onBlur('unitCost')}
                    placeholder="₹ 0.00"
                    className={`h-11 rounded-xl border border-[#C89B3C] px-3 text-sm bg-white text-[#3A1F12] focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#D4A017] focus:border-transparent w-full min-w-0 transition-all ${errors.unitCost ? 'border-red-500' : ''}`}
                    aria-invalid={!!errors.unitCost}
                    aria-describedby={errors.unitCost ? "rm-unit-cost-error" : undefined}
                  />
                  {errors.unitCost && (
                    <span id="rm-unit-cost-error" className="text-xs text-red-500 font-semibold block mt-0.5">
                      {errors.unitCost}
                    </span>
                  )}
                </div>

                {/* Current Stock */}
                <div className="space-y-1">
                  <Label htmlFor="rm-current-stock" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">
                    Current Stock <span className="text-[#D4A017] font-normal lowercase">(Read-only)</span>
                  </Label>
                  <Input
                    id="rm-current-stock"
                    type="number"
                    value={formData.currentStock}
                    disabled
                    className="h-11 rounded-xl border border-[#C89B3C] px-3 text-sm bg-white/60 text-[#3A1F12] cursor-not-allowed opacity-80 w-full min-w-0"
                  />
                </div>

                {/* Stock Value */}
                <div className="space-y-1">
                  <Label htmlFor="rm-stock-value" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">
                    Stock Value (Calculated) <span className="text-[#D4A017] font-normal lowercase">(Read-only)</span>
                  </Label>
                  <Input
                    id="rm-stock-value"
                    value={formatCurrency(stockValue)}
                    disabled
                    className="h-11 rounded-xl border border-[#C89B3C] px-3 text-sm bg-white/60 text-[#3A1F12] font-semibold cursor-not-allowed opacity-80 w-full min-w-0"
                  />
                </div>

                {/* Purchase Rate */}
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="rm-purchase-rate" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">Purchase Rate (₹)</Label>
                  <Input
                    id="rm-purchase-rate"
                    type="number"
                    min="0"
                    step="any"
                    value={formData.purchaseRate === 0 ? '' : formData.purchaseRate}
                    onChange={(e) => onChange('purchaseRate', parseFloat(e.target.value) || 0)}
                    onBlur={() => onBlur('purchaseRate')}
                    placeholder="₹ 0.00"
                    className={`h-11 rounded-xl border border-[#C89B3C] px-3 text-sm bg-white text-[#3A1F12] focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#D4A017] focus:border-transparent w-full min-w-0 transition-all ${errors.purchaseRate ? 'border-red-500' : ''}`}
                    aria-invalid={!!errors.purchaseRate}
                    aria-describedby={errors.purchaseRate ? "rm-purchase-rate-error" : undefined}
                  />
                  {errors.purchaseRate && (
                    <span id="rm-purchase-rate-error" className="text-xs text-red-500 font-semibold block mt-0.5">
                      {errors.purchaseRate}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: Alerts & Reorder */}
            <div className="bg-[#F8F2E8] border border-[#C89B3C]/30 rounded-2xl p-5 md:p-6 shadow-sm space-y-4 w-full">
              <h3 className="text-sm font-extrabold text-[#7B0F1A] uppercase tracking-wider border-b border-[#C89B3C]/20 pb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#D4A017]" />
                Alerts & Reorder
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Min Alert Stock */}
                <div className="space-y-1">
                  <Label htmlFor="rm-min-alert-stock" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">Min Alert Stock</Label>
                  <Input
                    id="rm-min-alert-stock"
                    type="number"
                    min="0"
                    value={formData.minStockAlert === 0 ? '' : formData.minStockAlert}
                    onChange={(e) => onChange('minStockAlert', parseInt(e.target.value) || 0)}
                    onBlur={() => onBlur('minStockAlert')}
                    placeholder="100"
                    className={`h-11 rounded-xl border border-[#C89B3C] px-3 text-sm bg-white text-[#3A1F12] focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#D4A017] focus:border-transparent w-full min-w-0 transition-all ${errors.minStockAlert ? 'border-red-500' : ''}`}
                    aria-invalid={!!errors.minStockAlert}
                    aria-describedby={errors.minStockAlert ? "rm-min-alert-error" : undefined}
                  />
                  {errors.minStockAlert && (
                    <span id="rm-min-alert-error" className="text-xs text-red-500 font-semibold block mt-0.5">
                      {errors.minStockAlert}
                    </span>
                  )}
                </div>

                {/* Reorder Level */}
                <div className="space-y-1">
                  <Label htmlFor="rm-reorder-level" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">Reorder Level</Label>
                  <Input
                    id="rm-reorder-level"
                    type="number"
                    min="0"
                    value={formData.reorderLevel === 0 ? '' : formData.reorderLevel}
                    onChange={(e) => onChange('reorderLevel', parseInt(e.target.value) || 0)}
                    onBlur={() => onBlur('reorderLevel')}
                    placeholder="150"
                    className={`h-11 rounded-xl border border-[#C89B3C] px-3 text-sm bg-white text-[#3A1F12] focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#D4A017] focus:border-transparent w-full min-w-0 transition-all ${errors.reorderLevel ? 'border-red-500' : ''}`}
                    aria-invalid={!!errors.reorderLevel}
                    aria-describedby={errors.reorderLevel ? "rm-reorder-level-error" : undefined}
                  />
                  {errors.reorderLevel && (
                    <span id="rm-reorder-level-error" className="text-xs text-red-500 font-semibold block mt-0.5">
                      {errors.reorderLevel}
                    </span>
                  )}
                </div>

                {/* Minimum Stock */}
                <div className="space-y-1">
                  <Label htmlFor="rm-minimum-stock" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">Minimum Stock</Label>
                  <Input
                    id="rm-minimum-stock"
                    type="number"
                    min="0"
                    value={formData.minimumStock === 0 ? '' : formData.minimumStock}
                    onChange={(e) => onChange('minimumStock', parseInt(e.target.value) || 0)}
                    onBlur={() => onBlur('minimumStock')}
                    placeholder="50"
                    className={`h-11 rounded-xl border border-[#C89B3C] px-3 text-sm bg-white text-[#3A1F12] focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#D4A017] focus:border-transparent w-full min-w-0 transition-all ${errors.minimumStock ? 'border-red-500' : ''}`}
                    aria-invalid={!!errors.minimumStock}
                    aria-describedby={errors.minimumStock ? "rm-minimum-stock-error" : undefined}
                  />
                  {errors.minimumStock && (
                    <span id="rm-minimum-stock-error" className="text-xs text-red-500 font-semibold block mt-0.5">
                      {errors.minimumStock}
                    </span>
                  )}
                </div>

                {/* Max Stock Level */}
                <div className="space-y-1">
                  <Label htmlFor="rm-max-stock-level" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">Max Stock Level <span className="text-[#D4A017] font-normal lowercase">(Optional)</span></Label>
                  <Input
                    id="rm-max-stock-level"
                    type="number"
                    min="0"
                    value={formData.maxStockLevel === 0 ? '' : formData.maxStockLevel}
                    onChange={(e) => onChange('maxStockLevel', parseInt(e.target.value) || 0)}
                    onBlur={() => onBlur('maxStockLevel')}
                    placeholder="e.g. 1000"
                    className={`h-11 rounded-xl border border-[#C89B3C] px-3 text-sm bg-white text-[#3A1F12] focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#D4A017] focus:border-transparent w-full min-w-0 transition-all ${errors.maxStockLevel ? 'border-red-500' : ''}`}
                    aria-invalid={!!errors.maxStockLevel}
                    aria-describedby={errors.maxStockLevel ? "rm-max-stock-error" : undefined}
                  />
                  {errors.maxStockLevel && (
                    <span id="rm-max-stock-error" className="text-xs text-red-500 font-semibold block mt-0.5">
                      {errors.maxStockLevel}
                    </span>
                  )}
                </div>

                {/* Low-Stock Alert Toggle */}
                <div className="flex items-center justify-between border border-[#C89B3C]/40 rounded-xl p-3 bg-white h-11 md:col-span-2 mt-2">
                  <span className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider">Enable WhatsApp Alert Notifications</span>
                  <Switch
                    id="rm-low-stock-alert"
                    checked={formData.lowStockAlert}
                    onCheckedChange={(checked) => onChange('lowStockAlert', checked)}
                    className="data-[state=checked]:bg-[#7B0F1A] data-[state=unchecked]:bg-[#3A1F12]/20"
                  />
                </div>
              </div>
            </div>

            {/* Card 4: Supplier Information (Searchable Autocomplete Dropdown) */}
            <div className="bg-[#F8F2E8] border border-[#C89B3C]/30 rounded-2xl p-5 md:p-6 shadow-sm space-y-4 w-full">
              <h3 className="text-sm font-extrabold text-[#7B0F1A] uppercase tracking-wider border-b border-[#C89B3C]/20 pb-2 flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#D4A017]" />
                Supplier Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Searchable Supplier Dropdown */}
                <div className="space-y-1 relative" ref={dropdownRef}>
                  <div className="flex justify-between items-center mb-1.5">
                    <Label className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block">
                      Preferred Vendor
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        const name = prompt("Enter new supplier name:");
                        if (name && name.trim()) {
                          handleAddNewSupplier(name.trim());
                        }
                      }}
                      className="text-[10px] text-[#7B0F1A] font-extrabold hover:underline uppercase tracking-wider"
                      aria-label="Add new supplier manually"
                    >
                      + Add New Supplier
                    </button>
                  </div>
                  
                  <div 
                    onClick={() => setIsDropdownOpen(prev => !prev)}
                    className="w-full h-11 rounded-xl border border-[#C89B3C] px-3 bg-white text-[#3A1F12] flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-[#D4A017] transition-all"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setIsDropdownOpen(true);
                      }
                    }}
                  >
                    <span className="text-sm font-medium">
                      {formData.supplier || 'Select preferred vendor'}
                    </span>
                    <Truck className="h-4 w-4 text-[#D4A017]" />
                  </div>

                  {isDropdownOpen && (
                    <div 
                      className="absolute left-0 right-0 z-50 mt-1.5 bg-[#FDFBF7] border-2 border-[#C89B3C] rounded-2xl shadow-2xl overflow-hidden flex flex-col w-full max-h-[300px]"
                      role="listbox"
                    >
                      {/* Search Input */}
                      <div className="p-2 border-b border-[#C89B3C]/20 bg-[#F8F2E8]">
                        <input
                          type="text"
                          ref={searchInputRef}
                          value={supplierSearch}
                          onChange={(e) => {
                            setSupplierSearch(e.target.value);
                            setFocusedIndex(-1);
                          }}
                          onKeyDown={handleKeyDown}
                          placeholder="Search or add supplier..."
                          className="w-full h-9 rounded-lg border border-[#C89B3C] px-3 text-xs bg-white text-[#3A1F12] focus:outline-none focus:ring-1 focus:ring-[#D4A017] focus:border-[#D4A017]"
                        />
                      </div>

                      {/* Dropdown Options */}
                      <div className="flex-1 overflow-y-auto max-h-[220px] p-1 space-y-0.5 scrollbar-thin">
                        {filteredSuppliers.map((sup, idx) => {
                          const isSelected = formData.supplier.trim().toLowerCase() === sup.vendorName.trim().toLowerCase();
                          const isFocused = idx === focusedIndex;
                          return (
                            <div
                              key={sup.vendorName}
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => handleSelectSupplier(sup)}
                              onMouseEnter={() => setFocusedIndex(idx)}
                              className={`p-2.5 rounded-xl cursor-pointer transition-colors text-left ${
                                isSelected 
                                  ? 'bg-[#7B0F1A] text-white' 
                                  : isFocused 
                                    ? 'bg-[#7B0F1A]/10 text-[#7B0F1A] font-medium' 
                                    : 'hover:bg-slate-100 text-[#3A1F12]'
                              }`}
                            >
                              <div className="text-xs font-bold uppercase tracking-wider">
                                {sup.vendorName}
                              </div>
                              {(sup.vendorMobile || sup.vendorGstNumber) && (
                                <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-[#F8F2E8]/80' : 'text-slate-500'}`}>
                                  {sup.vendorMobile && sup.vendorMobile !== 'N/A' && `Mob: ${sup.vendorMobile}`}
                                  {sup.vendorMobile && sup.vendorMobile !== 'N/A' && sup.vendorGstNumber && sup.vendorGstNumber !== 'N/A' && ' | '}
                                  {sup.vendorGstNumber && sup.vendorGstNumber !== 'N/A' && `GSTIN: ${sup.vendorGstNumber}`}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {filteredSuppliers.length === 0 && (
                          <div className="p-1">
                            <div 
                              onClick={() => handleAddNewSupplier(supplierSearch)}
                              className="p-3 text-xs text-[#7B0F1A] font-bold hover:bg-[#7B0F1A]/5 cursor-pointer text-center border-2 border-dashed border-[#C89B3C]/30 rounded-xl m-1"
                            >
                              No supplier found. Add "{supplierSearch}" as new supplier?
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Vendor Mobile */}
                <div className="space-y-1">
                  <Label htmlFor="rm-vendor-mobile" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">
                    Vendor Mobile <span className="text-[#D4A017] font-normal lowercase">(Read-only)</span>
                  </Label>
                  <Input
                    id="rm-vendor-mobile"
                    value={formData.vendorMobile || 'N/A'}
                    disabled
                    readOnly
                    className="h-11 rounded-xl border border-[#C89B3C] px-3 text-sm bg-white/60 text-[#3A1F12] cursor-not-allowed opacity-80 w-full min-w-0"
                  />
                </div>

                {/* Vendor GSTIN */}
                <div className="space-y-1">
                  <Label htmlFor="rm-vendor-gstin" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">
                    Vendor GSTIN <span className="text-[#D4A017] font-normal lowercase">(Read-only)</span>
                  </Label>
                  <Input
                    id="rm-vendor-gstin"
                    value={formData.vendorGSTIN || 'N/A'}
                    disabled
                    readOnly
                    className="h-11 rounded-xl border border-[#C89B3C] px-3 text-sm bg-white/60 text-[#3A1F12] cursor-not-allowed opacity-80 w-full min-w-0"
                  />
                </div>

                {/* Last Purchase Date */}
                <div className="space-y-1">
                  <Label htmlFor="rm-last-purchase-date" className="text-xs font-extrabold text-[#3A1F12] uppercase tracking-wider block mb-1.5">
                    Last Purchase Date <span className="text-[#D4A017] font-normal lowercase">(Read-only)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="rm-last-purchase-date"
                      value={formData.lastPurchaseDate ? new Date(formData.lastPurchaseDate).toLocaleDateString() : 'No purchases recorded'}
                      disabled
                      readOnly
                      className="h-11 rounded-xl border border-[#C89B3C] pl-10 pr-3 text-sm bg-white/60 text-[#3A1F12] cursor-not-allowed opacity-80 w-full min-w-0 font-medium"
                    />
                    <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Photo with fallback */}
            <div className="bg-[#F8F2E8] border border-[#C89B3C]/30 rounded-2xl p-5 md:p-6 shadow-sm space-y-4 w-full">
              <h3 className="text-sm font-extrabold text-[#7B0F1A] uppercase tracking-wider border-b border-[#C89B3C]/20 pb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[#D4A017]" />
                Photo Attachment
              </h3>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Current image preview */}
                {formData.imageUrl ? (
                  <div className="w-28 h-28 rounded-xl border border-[#C89B3C]/30 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
                    <img 
                      src={formData.imageUrl} 
                      alt="Raw Material Preview" 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  /* Fallback placeholder */
                  <div className="w-28 h-28 rounded-xl border-2 border-dashed border-[#C89B3C]/30 bg-white/40 flex flex-col items-center justify-center shrink-0 shadow-sm text-slate-400">
                    <ImageIcon className="h-8 w-8 mb-1 text-slate-300" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">No Photo</span>
                  </div>
                )}

                {/* Control Actions */}
                <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="bg-[#7B0F1A] hover:bg-[#7B0F1A]/90 text-white text-xs font-bold h-9 px-3 border border-[#C89B3C] rounded-xl transition-all"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          Change Photo
                        </>
                      )}
                    </Button>

                    {formData.imageUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onRemoveFile}
                        className="border-red-500 text-red-600 hover:bg-red-50 text-xs font-bold h-9 px-3 rounded-xl transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Remove Photo
                      </Button>
                    )}
                  </div>
                  
                  <p className="text-[10px] text-slate-500">
                    Supports JPEG, PNG. Max file size 2MB. Drag and drop or browse files.
                  </p>

                  {uploadError && (
                    <p className="text-xs text-red-500 font-bold mt-1">
                      {uploadError}
                    </p>
                  )}
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                accept="image/png, image/jpeg"
                className="hidden"
              />
            </div>

          </div>

          {/* Sticky Footer actions (Responsive Stack / Horizontal layout) */}
          <div className="bg-[#F8F2E8] border-t-2 border-[#C89B3C] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 flex-shrink-0 w-full shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <div className="flex justify-center md:justify-start">
              {materialId && canDelete && (
                <Button
                  type="button"
                  onClick={handleDelete}
                  variant="outline"
                  className="border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626]/5 font-bold h-11 px-5 rounded-xl w-full md:w-auto flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Material
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-[#7B0F1A] text-[#7B0F1A] hover:bg-[#7B0F1A]/5 font-bold h-11 px-5 rounded-xl w-full sm:w-auto transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#7B0F1A] hover:bg-[#7B0F1A]/90 text-[#F8F2E8] border border-[#C89B3C] font-bold h-11 px-6 rounded-xl w-full sm:w-auto shadow-md transition-colors"
              >
                Save Changes
              </Button>
            </div>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
