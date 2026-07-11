import { useState } from 'react';
import { useFinishedGoodsLogs, useSaveFinishedGoodsLog, useProducts } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Calendar, RefreshCw, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../components/AuthGuard';
import { getOptionalNumber } from '../utils/candidHelpers';
import { formatERPDateTime } from '../utils/calculations';

const FinishedGoodsLogs = () => {
  const { user } = useAuth();
  const isAdmin = !!(user?.role && 'Admin' in user.role);
  const isManager = !!(user?.role && 'Manager' in user.role);
  const canModify = isAdmin || isManager;

  const { data: finishedLogs = [], isLoading, refetch } = useFinishedGoodsLogs();
  const { data: products = [] } = useProducts();
  const { mutate: saveFinishedGoodsLog, isPending } = useSaveFinishedGoodsLog();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [logType, setLogType] = useState('Damaged'); // "Returned" | "Damaged" manually
  const [reason, setReason] = useState('');

  if (!user) return null;

  const handleOpenModal = () => {
    if (!canModify) return;
    setProductName('');
    setQuantity(0);
    setLogType('Damaged');
    setReason('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || quantity <= 0 || !reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    saveFinishedGoodsLog({
      productName,
      quantity,
      logType,
      reason
    }, {
      onSuccess: () => {
        toast.success(`Recorded finished goods ${logType.toLowerCase()} log successfully!`);
        setIsModalOpen(false);
      },
      onError: (err) => {
        toast.error(`Failed to save: ${err.message}`);
      }
    });
  };

  const getLogTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'Produced':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Sold':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Returned':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Damaged':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const filteredLogs = finishedLogs.filter(log =>
    log.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.logType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-maroon dark:text-saffron flex items-center gap-2">
            <Layers className="h-8 w-8 text-saffron" /> Finished Goods Consumption Logs
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Audit trail of finished goods produced, sold, returned, or damaged.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" className="border-gold text-maroon hover:bg-gold/10">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
          {canModify && (
            <Button onClick={handleOpenModal} className="bg-maroon hover:bg-maroon/90 text-white font-bold">
              <Plus className="h-4 w-4 mr-1.5" /> Log Adjustment
            </Button>
          )}
        </div>
      </div>

      <Card className="border-2 border-gold shadow-md">
        <CardHeader className="bg-amber-50/20 border-b border-gold/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
          <div>
            <CardTitle className="text-maroon text-lg">Finished Goods Ledger</CardTitle>
            <CardDescription>Comprehensive audit history of all finished inventory items.</CardDescription>
          </div>
          <div className="flex items-center border border-gold/40 rounded bg-white dark:bg-gray-800 px-3 py-1.5 text-xs">
            <Search className="h-4 w-4 text-slate-400 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search finished logs..."
              className="outline-none bg-transparent w-40 md:w-56"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-10 text-slate-500">Loading records...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No finished goods logs found.</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-gray-900 border-b border-gold/20">
                <TableRow>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200">Date</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200">Product</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-center">Type</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Quantity</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200">Reason</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200">Logged By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const logDate = formatERPDateTime(log.date);
                  const quantityPrefix = (log.logType === 'Produced' || log.logType === 'Returned') ? '+' : '-';
                  const quantityColor = (log.logType === 'Produced' || log.logType === 'Returned') ? 'text-green-600' : 'text-red-500';

                  return (
                    <TableRow key={log.id.toString()} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30">
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">{logDate}</TableCell>
                      <TableCell className="font-bold text-slate-800 dark:text-slate-200">{log.productName}</TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${getLogTypeBadgeClass(log.logType)}`}>
                          {log.logType}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right text-xs font-bold font-mono ${quantityColor}`}>
                        {quantityPrefix}{getOptionalNumber(log.quantity)} pcs
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">{log.reason}</TableCell>
                      <TableCell className="text-xs text-slate-500">{log.userName}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manual log modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] border-2 border-gold shadow-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-maroon text-lg">Log Finished Goods Adjustments</DialogTitle>
              <DialogDescription>Record returns or damages that impact finished product levels.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold">Product</Label>
                <Select value={productName} onValueChange={setProductName}>
                  <SelectTrigger className="col-span-3 border-gold bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.vigat}>{p.vigat} ({p.stock.toString()} in stock)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold">Adjustment Type</Label>
                <Select value={logType} onValueChange={setLogType}>
                  <SelectTrigger className="col-span-3 border-gold bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Returned">Returned (+ Stock)</SelectItem>
                    <SelectItem value="Damaged">Damaged (- Stock)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right font-semibold">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="col-span-3 border-gold"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reason" className="text-right font-semibold">Reason</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Return from Thakkarnagar outlet"
                  className="col-span-3 border-gold"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-maroon hover:bg-maroon/90 text-white font-bold" disabled={isPending}>
                {isPending ? 'Logging...' : 'Confirm adjustment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinishedGoodsLogs;
