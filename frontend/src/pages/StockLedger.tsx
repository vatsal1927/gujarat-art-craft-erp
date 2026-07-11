import { useState, useMemo } from 'react';
import { useProducts, useFinishedGoodsLogs } from '../hooks/useQueries';
import { formatCurrency } from '../utils/currencyFormat';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, RefreshCw, BarChart2, TrendingUp, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const StockLedger = () => {
  const { data: products = [], isLoading: loadingProducts, refetch: refetchProducts } = useProducts();
  const { data: finishedLogs = [], isLoading: loadingLogs, refetch: refetchLogs } = useFinishedGoodsLogs();

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const refetchAll = () => {
    refetchProducts();
    refetchLogs();
    toast.success('Stock Ledger updated!');
  };

  // Filter logs based on date range
  const filteredLogs = useMemo(() => {
    let list = [...finishedLogs];
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      list = list.filter(l => (Number(l.date) / 1000000) >= startMs);
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
      list = list.filter(l => (Number(l.date) / 1000000) <= endMs);
    }
    return list;
  }, [finishedLogs, startDate, endDate]);

  const getProductMetrics = (productVigat: string, currentStock: number) => {
    const productLogs = filteredLogs.filter(l => l.productName === productVigat);
    
    let productionQty = 0;
    let salesQty = 0;
    let returnedQty = 0;
    let damagedQty = 0;

    productLogs.forEach(log => {
      const q = Number(log.quantity);
      if (log.logType === 'Produced') productionQty += q;
      else if (log.logType === 'Sold') salesQty += q;
      else if (log.logType === 'Returned') returnedQty += q;
      else if (log.logType === 'Damaged') damagedQty += q;
    });

    // Opening Stock = Current - Produced - Returned + Sold + Damaged
    const openingStock = currentStock - productionQty - returnedQty + salesQty + damagedQty;

    return {
      openingStock,
      productionQty,
      salesQty,
      returnedQty,
      damagedQty,
      currentStock
    };
  };

  const filteredProducts = products.filter(p =>
    p.vigat.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalProduced = useMemo(() => {
    return filteredLogs.filter(l => l.logType === 'Produced').reduce((sum, l) => sum + Number(l.quantity), 0);
  }, [filteredLogs]);

  const totalSold = useMemo(() => {
    return filteredLogs.filter(l => l.logType === 'Sold').reduce((sum, l) => sum + Number(l.quantity), 0);
  }, [filteredLogs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-maroon dark:text-saffron flex items-center gap-2">
            <BarChart2 className="h-8 w-8 text-saffron" /> Finished Goods Stock Ledger
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">View complete stock movement ledger tracing opening, production, sales, returns, and damages.</p>
        </div>
        <div>
          <Button onClick={refetchAll} variant="outline" className="border-gold text-maroon hover:bg-gold/10">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-maroon border-gold/40 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Products Tracked</p>
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">{products.length} Products</h3>
              </div>
              <Layers className="h-10 w-10 text-maroon opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 border-gold/40 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produced (This Period)</p>
                <h3 className="text-2xl font-extrabold text-green-600 mt-1">
                  {totalProduced} Pcs
                </h3>
              </div>
              <TrendingUp className="h-10 w-10 text-green-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 border-gold/40 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sold (This Period)</p>
                <h3 className="text-2xl font-extrabold text-blue-600 mt-1">
                  {totalSold} Pcs
                </h3>
              </div>
              <TrendingUp className="h-10 w-10 text-blue-500 opacity-75" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-gold shadow-md">
        <CardHeader className="bg-amber-50/20 border-b border-gold/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
          <div>
            <CardTitle className="text-maroon text-lg">Stock Summary Ledger</CardTitle>
            <CardDescription>Consolidated stock counts showing all audit balance changes.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center border border-gold/40 rounded bg-white dark:bg-gray-800 px-3 py-1.5 text-xs">
              <Search className="h-4 w-4 text-slate-400 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search product code/name..."
                className="outline-none bg-transparent w-40 md:w-56"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-medium text-slate-400">Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gold/40 rounded px-2 py-1 bg-white dark:bg-gray-800 text-xs h-9 text-slate-700 dark:text-slate-300"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gold/40 rounded px-2 py-1 bg-white dark:bg-gray-800 text-xs h-9 text-slate-700 dark:text-slate-300"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingProducts || loadingLogs ? (
            <div className="text-center py-10 text-slate-500">Loading stock ledger records...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No products found.</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-gray-900 border-b border-gold/20">
                <TableRow>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200">Product Code</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200">Product Name</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Opening Stock</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Purchase Stock</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Production Stock</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Sales Stock</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Returned Stock</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Damaged Stock</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Current Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p) => {
                  const m = getProductMetrics(p.vigat, Number(p.stock));
                  return (
                    <TableRow key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30">
                      <TableCell className="font-mono text-xs font-bold">{p.id}</TableCell>
                      <TableCell className="font-bold text-slate-800 dark:text-slate-200">{p.vigat}</TableCell>
                      <TableCell className="text-right text-xs font-semibold text-slate-600">{m.openingStock} Pcs</TableCell>
                      <TableCell className="text-right text-xs font-semibold text-slate-400">0 Pcs</TableCell>
                      <TableCell className="text-right text-xs font-bold text-green-600">+{m.productionQty} Pcs</TableCell>
                      <TableCell className="text-right text-xs font-bold text-blue-600">-{m.salesQty} Pcs</TableCell>
                      <TableCell className="text-right text-xs font-bold text-amber-500">+{m.returnedQty} Pcs</TableCell>
                      <TableCell className="text-right text-xs font-bold text-red-500">-{m.damagedQty} Pcs</TableCell>
                      <TableCell className="text-right text-xs font-extrabold text-slate-900 dark:text-slate-100">{m.currentStock} Pcs</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockLedger;
