import { useState } from 'react';
import { SmartDetailDropdown, DropdownItem } from './SmartDetailDropdown';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { ProductRow } from '../types/invoice';
import { formatCurrency } from '../utils/currencyFormat';
import { useAuth } from '../components/AuthGuard';

interface ProductItem {
  id: string;
  vigat: string;
  rate: number;
  hsnCode: string;
  stock: bigint;
}

interface ProductTableProps {
  products: ProductRow[];
  productsList?: ProductItem[];
  onUpdateProduct: (id: string, fieldOrUpdates: keyof ProductRow | Partial<ProductRow>, value?: string | number) => void;
  onDeleteProduct: (id: string) => void;
  onAddRow: () => void;
}

const ProductTable = ({ products, productsList = [], onUpdateProduct, onDeleteProduct, onAddRow }: ProductTableProps) => {
  const { user } = useAuth();
  const isAdmin = !!(user?.role && 'Admin' in user.role);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  const handleVigatChange = (id: string, val: string) => {
    const trimmedVal = val.trim().toLowerCase();
    const found = productsList.find(p => p.vigat.trim().toLowerCase() === trimmedVal);
    if (found) {
      onUpdateProduct(id, { vigat: val, rate: found.rate, hsnCode: found.hsnCode });
    } else {
      onUpdateProduct(id, 'vigat', val);
    }
  };

  const handleSelect = (selected: ProductItem, rowId: string) => {
    onUpdateProduct(rowId, {
      vigat: selected.vigat,
      rate: selected.rate,
      hsnCode: selected.hsnCode
    });
  };

  const renderStockBadge = (stockVal: bigint) => {
    const stock = Number(stockVal);
    if (stock > 20) {
      return (
        <span className="inline-flex items-center rounded-md bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50 mt-1">
          Stock: {stock} pcs (Available)
        </span>
      );
    } else if (stock >= 1) {
      return (
        <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 mt-1">
          Stock: {stock} pcs (Low)
        </span>
      );
    } else if (stock === 0) {
      return (
        <span className="inline-flex items-center rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50 mt-1">
          Out of Stock
        </span>
      );
    } else {
      // Negative stock
      if (isAdmin) {
        return (
          <span className="inline-flex items-center rounded-md bg-red-100 border border-red-300 px-2.5 py-0.5 text-[10px] font-bold text-red-800 dark:bg-red-950/35 dark:text-red-400 dark:border-red-900 animate-pulse mt-1">
            Stock Mismatch Detected. Contact Administrator.
          </span>
        );
      }
      return (
        <span className="inline-flex items-center rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50 mt-1">
          Out of Stock
        </span>
      );
    }
  };

  const getDropdownStockValue = (stockVal: bigint) => {
    const stock = Number(stockVal);
    if (stock >= 0) return `${stock} pcs`;
    if (isAdmin) return 'Stock Mismatch Detected. Contact Administrator.';
    return '0 pcs';
  };

  return (
    <div className="space-y-4 product-details-container" style={{ position: 'relative', overflow: 'visible' }}>
      <h2 className="text-xl font-bold text-[#7A0019] font-serif">Product Details</h2>
      
      <div className="overflow-visible border-2 border-[#D4A017] rounded-xl bg-white dark:bg-gray-900/50 shadow-sm" style={{ position: 'relative', overflow: 'visible' }}>
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-[#7A0019]/5 via-[#D4A017]/5 to-[#7A0019]/5 hover:bg-transparent border-b border-[#D4A017]/20">
              <TableHead className="w-12 text-center font-bold text-[#7A0019]">No</TableHead>
              <TableHead className="font-bold text-[#7A0019]">Vigat (Item Description)</TableHead>
              <TableHead className="w-24 text-center font-bold text-[#7A0019]">Qty</TableHead>
              <TableHead className="w-32 text-center font-bold text-[#7A0019]">Rate (₹)</TableHead>
              <TableHead className="w-32 text-right pr-4 font-bold text-[#7A0019]">Amount (₹)</TableHead>
              <TableHead className="w-12 no-print"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, index) => {
              const amount = product.qty * product.rate;
              const filterText = (product.vigat || '').toLowerCase().trim();
              const filtered = productsList.filter(p => 
                p.vigat.toLowerCase().includes(filterText)
              );

              const dropdownItems: DropdownItem[] = filtered.map(p => ({
                id: p.id,
                title: p.vigat,
                subtitle: (
                  <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                    SKU: {p.id} {p.hsnCode ? `| HSN: ${p.hsnCode}` : ''}
                  </span>
                ),
                details: [],
                detailsLine: (isSelected) => (
                  <div className="flex items-center gap-3">
                    <span>Rate: <strong className={isSelected ? 'text-white font-bold' : 'text-[#7A0019] dark:text-[#D4A017] font-bold'}>{formatCurrency(p.rate)}</strong></span>
                    <span className={isSelected ? 'text-white/40' : 'text-slate-300'}>|</span>
                    <span>Stock: <strong className={isSelected ? 'text-white font-bold' : 'text-slate-700 dark:text-slate-350 font-bold'}>{getDropdownStockValue(p.stock)}</strong></span>
                  </div>
                ),
                rawData: p
              }));

              const matchedProductItem = productsList.find(
                p => p.vigat.trim().toLowerCase() === product.vigat.trim().toLowerCase()
              );

              return (
                <TableRow 
                  key={product.id} 
                  className="hover:bg-amber-50/50 dark:hover:bg-gray-800/50 border-b border-[#D4A017]/10 last:border-b-0"
                  style={{
                    position: 'relative',
                    overflow: 'visible',
                    zIndex: activeRowId === product.id ? 50 : 1,
                  }}
                >
                  <TableCell className="text-center font-semibold text-slate-650">{index + 1}</TableCell>
                  <TableCell style={{ overflow: 'visible', position: 'relative' }}>
                    <SmartDetailDropdown
                      id={`vigat-${product.id}`}
                      value={product.vigat}
                      onChange={(val) => handleVigatChange(product.id, val)}
                      onSelect={(selected) => {
                        handleSelect(selected, product.id);
                        setActiveRowId(null);
                      }}
                      onFocus={() => setActiveRowId(product.id)}
                      onBlur={() => {
                        // Delay clearing to allow click events to register
                        setTimeout(() => {
                          setActiveRowId(prev => prev === product.id ? null : prev);
                        }, 200);
                      }}
                      items={dropdownItems}
                      placeholder="e.g., Beaded Toran, Designer Jummar"
                    />
                    {matchedProductItem && renderStockBadge(matchedProductItem.stock)}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={product.qty || ''}
                      onChange={(e) => onUpdateProduct(product.id, 'qty', parseFloat(e.target.value) || 0)}
                      className="text-center border-gold/50 focus:ring-[#7A0019] h-9 focus-visible:ring-[#7A0019]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.rate || ''}
                      onChange={(e) => onUpdateProduct(product.id, 'rate', parseFloat(e.target.value) || 0)}
                      className="text-center border-gold/50 focus:ring-[#7A0019] h-9 font-semibold focus-visible:ring-[#7A0019]"
                    />
                  </TableCell>
                  <TableCell className="text-right font-bold text-[#7A0019] pr-4">
                    {formatCurrency(amount)}
                  </TableCell>
                  <TableCell className="no-print text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteProduct(product.id)}
                      disabled={products.length === 1}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 w-8 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Button 
        onClick={onAddRow}
        className="no-print bg-[#7A0019] hover:bg-[#7A0019]/90 text-white font-bold rounded-xl border border-[#D4A017]/30 shadow-md"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Row
      </Button>
    </div>
  );
};

export default ProductTable;
