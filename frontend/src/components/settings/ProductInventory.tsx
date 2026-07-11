import React, { useState } from 'react';
import { useProducts, useSaveProduct, useDeleteProduct } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Edit, Trash2, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../utils/currencyFormat';
import { useAuth } from '../AuthGuard';
import { toast } from 'sonner';

export default function ProductInventory() {
  const { user: currentUser } = useAuth();
  const isAdmin = !!(currentUser?.role && 'Admin' in currentUser.role);

  const { data: products = [], isLoading: isLoadingProducts } = useProducts();
  const { mutate: saveProduct, isPending: isSavingProduct } = useSaveProduct();
  const { mutate: deleteProduct } = useDeleteProduct();

  // Form states
  const [prodId, setProdId] = useState('');
  const [prodVigat, setProdVigat] = useState('');
  const [prodRate, setProdRate] = useState(0);
  const [prodHsn, setProdHsn] = useState('5609');
  const [prodStock, setProdStock] = useState(0);
  const [editingProd, setEditingProd] = useState<string | null>(null);

  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodVigat.trim()) {
      toast.error('Product Description is required');
      return;
    }
    if (prodRate <= 0) {
      toast.error('Product Rate must be greater than 0');
      return;
    }
    if (prodStock < 0) {
      toast.error('Stock Count cannot be negative');
      return;
    }

    const targetId = prodId || Math.random().toString(36).substring(2, 9);
    const existing = products.find(p => p.id === targetId);
    const productionCost = existing ? existing.productionCost : 0;
    const bom = existing ? existing.bom : [];

    saveProduct({
      id: targetId,
      vigat: prodVigat.trim(),
      rate: prodRate,
      hsnCode: prodHsn.trim() || '5609',
      stock: BigInt(prodStock),
      productionCost,
      bom
    }, {
      onSuccess: () => {
        toast.success(editingProd ? 'Product updated successfully' : 'Product added successfully');
        handleResetForm();
      },
      onError: (err) => {
        toast.error('Failed to save product: ' + err.message);
      }
    });
  };

  const handleEditProduct = (prod: any) => {
    setProdId(prod.id);
    setProdVigat(prod.vigat);
    setProdRate(prod.rate);
    setProdHsn(prod.hsnCode);
    setProdStock(Number(prod.stock));
    setEditingProd(prod.id);
  };

  const handleDeleteProduct = (id: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this product? This action cannot be undone.");
    if (!confirmDelete) return;

    deleteProduct(id, {
      onSuccess: () => {
        toast.success('Product deleted successfully from catalog');
      },
      onError: (err) => {
        toast.error('Failed to delete product: ' + err.message);
      }
    });
  };

  const handleResetForm = () => {
    setProdId('');
    setProdVigat('');
    setProdRate(0);
    setProdHsn('5609');
    setProdStock(0);
    setEditingProd(null);
  };

  if (isLoadingProducts) {
    return <div className="py-8 text-center text-xs text-gray-500">Loading Product Catalog...</div>;
  }

  return (
    <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
      <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
        <CardTitle className="text-maroon dark:text-saffron flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <span>Product Inventory</span>
        </CardTitle>
        <CardDescription>Manage your product catalog, pricing, and stock levels.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <form onSubmit={handleSaveProductSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prodVigat" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Product Description</Label>
              <Input
                id="prodVigat"
                value={prodVigat}
                onChange={(e) => setProdVigat(e.target.value)}
                placeholder="e.g. Beaded Toran"
                className="border-gold focus:ring-saffron"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prodHsn" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">HSN Code</Label>
              <Input
                id="prodHsn"
                value={prodHsn}
                onChange={(e) => setProdHsn(e.target.value)}
                placeholder="e.g. 5609"
                className="border-gold focus:ring-saffron"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prodRate" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Rate (₹)</Label>
              <Input
                id="prodRate"
                type="number"
                min="0"
                step="0.01"
                value={prodRate || ''}
                onChange={(e) => setProdRate(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="border-gold focus:ring-saffron"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prodStock" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Stock Count</Label>
              <Input
                id="prodStock"
                type="number"
                min="0"
                value={prodStock || ''}
                onChange={(e) => setProdStock(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="border-gold focus:ring-saffron"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gold/10">
            {editingProd && (
              <Button
                type="button"
                variant="outline"
                onClick={handleResetForm}
                className="border-gold text-maroon hover:bg-gold/10"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSavingProduct}
              className="bg-maroon hover:bg-maroon/90 text-white font-semibold border border-gold/30 shadow-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {editingProd ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </form>

        <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800 max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                <TableHead className="font-bold text-maroon">Vigat</TableHead>
                <TableHead className="font-bold text-maroon text-center">Rate</TableHead>
                <TableHead className="font-bold text-maroon text-center">Stock</TableHead>
                <TableHead className="font-bold text-maroon text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products && products.length > 0 ? (
                products.map((p) => (
                  <TableRow key={p.id} className="hover:bg-amber-50/20 text-xs">
                    <TableCell className="font-semibold text-slate-800 dark:text-slate-100">
                      <p className="font-bold">{p.vigat}</p>
                      <p className="text-[10px] text-slate-500 font-mono">HSN: {p.hsnCode}</p>
                    </TableCell>
                    <TableCell className="text-center font-bold text-maroon">{formatCurrency(p.rate)}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        Number(p.stock) <= 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {p.stock.toString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditProduct(p)}
                          className="text-saffron hover:bg-saffron/10 h-7 w-7"
                        >
                          <Edit className="h-3.5 w-3.5 text-saffron" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteProduct(p.id)}
                            className="text-red-600 hover:bg-red-50 h-7 w-7"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-gray-500">No products in registry.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
