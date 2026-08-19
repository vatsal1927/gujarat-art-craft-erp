import { useState } from 'react';
import { useCollections, useJobWorks, useSaveCollection, useEditCollection, useDeleteCollection, useSettings, useProducts } from '../hooks/useQueries';
import ProductionLayout from '../components/ProductionLayout';
import { useAuth } from '../components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PackageCheck, ArrowDown, Plus, Search, Edit2, Trash2, Check, AlertTriangle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { formatERPDate, formatERPDateTime, safeQty } from '../utils/calculations';

const Collections = () => {
  const { user } = useAuth();
  const isStaff = !!(user?.role && 'Staff' in user.role);
  const isAdmin = !!(user?.role && 'Admin' in user.role);
  const isAdminOrManager = !!(user?.role && ('Admin' in user.role || 'Manager' in user.role));

  const { data: collections = [], isLoading: collectionsLoading } = useCollections();
  const { data: jobWorks = [], isLoading: jobsLoading } = useJobWorks();
  const { data: settings } = useSettings({ enabled: !isStaff && !!user });
  const { data: productsQuery = [] } = useProducts({ enabled: !isStaff && !!user });
  const products = isStaff ? ([] as any[]) : productsQuery;

  const saveCollectionMutation = useSaveCollection();
  const editCollectionMutation = useEditCollection();
  const deleteCollectionMutation = useDeleteCollection();

  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form State for Add
  const [selectedJobId, setSelectedJobId] = useState('');
  const [todayCollectedQty, setTodayCollectedQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('0');
  const [remarks, setRemarks] = useState('');

  // Form State for Edit
  const [editingCollection, setEditingCollection] = useState<any | null>(null);
  const [editTodayCollectedQty, setEditTodayCollectedQty] = useState('');
  const [editRejectedQty, setEditRejectedQty] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  // Delete Collection target
  const [deletingCollectionId, setDeletingCollectionId] = useState<bigint | null>(null);

  if (!user) return null;

  const selectedJob = jobWorks.find(j => j.id.toString() === selectedJobId);
  const product = products.find(p => p.vigat === selectedJob?.productName);
  const hasBOM = product && product.bom && product.bom.length > 0;

  // Math for Add Dialog
  const givenQty = selectedJob ? safeQty(selectedJob.qtyGiven) : 0;
  const prevCollected = selectedJob ? safeQty(selectedJob.collectedQty) : 0;
  const prevAccepted = selectedJob ? safeQty(selectedJob.acceptedQty) : 0;
  const pendingQty = selectedJob ? safeQty(givenQty - prevAccepted) : 0;

  const inputCol = parseFloat(todayCollectedQty) || 0;
  const inputRej = parseFloat(rejectedQty) || 0;
  const acceptedQty = safeQty(inputCol - inputRej);
  const remainingPendingQty = safeQty(pendingQty - acceptedQty);

  // Math for Edit Dialog
  const getEditDetails = () => {
    if (!editingCollection) return { given: 0, prevAccepted: 0, pending: 0, accepted: 0 };
    const job = jobWorks.find(j => j.id.toString() === editingCollection.jobWorkNo.toString());
    if (!job) return { given: safeQty(editingCollection.qtyGiven), prevAccepted: 0, pending: 0, accepted: 0 };

    const given = safeQty(job.qtyGiven);
    // When editing, the current collection's accepted qty is reverted, so we subtract it from job.acceptedQty
    const prevAcceptedTotal = safeQty(safeQty(job.acceptedQty) - safeQty(editingCollection.acceptedQty));
    const pending = safeQty(given - prevAcceptedTotal);

    const colVal = parseFloat(editTodayCollectedQty) || 0;
    const rejVal = parseFloat(editRejectedQty) || 0;
    const accepted = safeQty(colVal - rejVal);

    return { given, prevAccepted: prevAcceptedTotal, pending, accepted };
  };

  const editDetails = getEditDetails();
  const editingProduct = products.find(p => p.vigat === editingCollection?.productName);
  const hasEditingBOM = editingProduct && editingProduct.bom && editingProduct.bom.length > 0;

  const allowStaffCollection = settings?.allowStaffCollection !== false;
  const canAddCollection = !isStaff || allowStaffCollection;

  const handleOpenAdd = (jobId = '') => {
    setSelectedJobId(jobId);
    setTodayCollectedQty('');
    setRejectedQty('0');
    setRemarks('');
    setIsAddOpen(true);
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) {
      toast.error('Please select a Job Work');
      return;
    }
    const colVal = parseFloat(todayCollectedQty);
    const rejVal = parseFloat(rejectedQty) || 0;

    if (isNaN(colVal) || colVal <= 0) {
      toast.error('Today Collected Qty must be greater than 0');
      return;
    }
    if (isNaN(rejVal) || rejVal < 0) {
      toast.error('Rejected Qty cannot be negative');
      return;
    }
    const acceptedVal = Math.max(0, colVal - rejVal);
    if (!isAdmin) {
      if (acceptedVal > pendingQty) {
        toast.error(`Accepted Qty (${acceptedVal}) cannot be greater than Pending Qty (${pendingQty})`);
        return;
      }
    }
    if (rejVal > colVal) {
      toast.error('Rejected Qty cannot be greater than Today Collected Qty');
      return;
    }

    try {
      await saveCollectionMutation.mutateAsync({
        jobWorkNo: BigInt(selectedJobId),
        todayCollectedQty: colVal,
        rejectedQty: rejVal,
        remarks: remarks.trim()
      });
      if (!hasBOM) {
        toast.warning('BOM not configured for this product.');
      }
      toast.success('Collection saved and finished goods stock updated successfully.');
      setIsAddOpen(false);
      setSelectedJobId('');
      setTodayCollectedQty('');
      setRejectedQty('0');
      setRemarks('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save collection');
    }
  };

  const handleOpenEdit = (col: any) => {
    if (!isAdminOrManager) {
      toast.error('Unauthorized: Only Admin/Manager can edit collection entries');
      return;
    }
    setEditingCollection(col);
    setEditTodayCollectedQty(col.todayCollectedQty.toString());
    setEditRejectedQty(col.rejectedQty.toString());
    setEditRemarks(col.remarks || '');
    setIsEditOpen(true);
  };

  const handleEditCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollection) return;

    const colVal = parseFloat(editTodayCollectedQty);
    const rejVal = parseFloat(editRejectedQty) || 0;

    if (isNaN(colVal) || colVal <= 0) {
      toast.error('Today Collected Qty must be greater than 0');
      return;
    }
    if (isNaN(rejVal) || rejVal < 0) {
      toast.error('Rejected Qty cannot be negative');
      return;
    }
    const acceptedVal = Math.max(0, colVal - rejVal);
    if (!isAdmin) {
      if (acceptedVal > editDetails.pending) {
        toast.error(`New Accepted Qty (${acceptedVal}) cannot be greater than Pending Qty (${editDetails.pending})`);
        return;
      }
    }
    if (rejVal > colVal) {
      toast.error('Rejected Qty cannot be greater than Today Collected Qty');
      return;
    }

    try {
      await editCollectionMutation.mutateAsync({
        collectionId: editingCollection.id,
        todayCollectedQty: colVal,
        rejectedQty: rejVal,
        remarks: editRemarks.trim()
      });
      if (!hasEditingBOM) {
        toast.warning('BOM not configured for this product.');
      }
      toast.success('Collection updated and stock adjusted successfully.');
      setIsEditOpen(false);
      setEditingCollection(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update collection');
    }
  };

  const handleOpenDelete = (id: bigint) => {
    if (!isAdminOrManager) {
      toast.error('Unauthorized: Only Admin/Manager can delete collection entries');
      return;
    }
    setDeletingCollectionId(id);
    setIsDeleteOpen(true);
  };

  const handleDeleteCollection = async () => {
    if (deletingCollectionId === null) return;
    try {
      await deleteCollectionMutation.mutateAsync(deletingCollectionId);
      toast.success('Collection deleted and stock reversed successfully.');
      setIsDeleteOpen(false);
      setDeletingCollectionId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete collection');
    }
  };

  const linkedEmployeeId = (isStaff && user?.username) ? (localStorage.getItem(`staff_employee_link_${user.username.toLowerCase()}`) || 'EMP-1') : '';
  const staffEmployeeName = (isStaff && user?.username) ? (localStorage.getItem(`staff_employee_name_${user.username.toLowerCase()}`) || 'Ramesh Patel') : (user?.name || '');

  // Filter collections and jobs
  const userCollections = isStaff
    ? collections.filter(c => c.karigarName.toLowerCase() === staffEmployeeName.toLowerCase())
    : collections;

  const filteredCollections = userCollections.filter(c =>
    c.karigarName.toLowerCase().includes(search.toLowerCase()) ||
    c.productName.toLowerCase().includes(search.toLowerCase()) ||
    `COL-${c.id}`.toLowerCase().includes(search.toLowerCase()) ||
    `JW-${c.jobWorkNo}`.toLowerCase().includes(search.toLowerCase())
  );

  const userJobWorks = isStaff 
    ? jobWorks.filter(j => j.employeeName.toLowerCase() === staffEmployeeName.toLowerCase())
    : jobWorks;

  const pendingJobWorks = userJobWorks.filter(j => safeQty(j.acceptedQty) < safeQty(j.qtyGiven));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Given':
        return <Badge className="bg-blue-100 text-blue-800 border border-blue-200">Given</Badge>;
      case 'In Progress':
        return <Badge className="bg-amber-100 text-amber-800 border border-amber-200">In Progress</Badge>;
      case 'Partially Collected':
        return <Badge className="bg-orange-100 text-orange-800 border border-orange-200">Partially Collected</Badge>;
      case 'Completed':
        return <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <ProductionLayout title="Karigar Goods Collection Screen">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search collections by Artisan, SKU, COL No..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-gold/40 focus-visible:ring-maroon"
          />
        </div>

        {/* Action Button */}
        {canAddCollection ? (
          <Button onClick={() => handleOpenAdd()} className="bg-maroon hover:bg-maroon/90 text-white font-semibold flex items-center gap-1.5 w-full md:w-auto border border-gold/20 shadow-sm">
            <Plus className="h-4.5 w-4.5" /> Log Goods Collection
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200 font-semibold">
            <ShieldAlert className="h-4 w-4" /> Staff Collection is Disabled by Admin
          </div>
        )}
      </div>

      {/* Grid of Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-4">
        {/* Left Side: Recent Collections Log */}
        <Card className="xl:col-span-2 border-2 border-gold shadow-sm">
          <CardHeader className="bg-amber-50/10 border-b border-gold/20 py-4">
            <CardTitle className="text-maroon text-base flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-saffron" /> Goods Collections Log
            </CardTitle>
            <CardDescription>Chronological list of artisan finished items collected, inspected, and stocked.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {collectionsLoading ? (
              <div className="text-center py-12 text-slate-500">Loading collections log...</div>
            ) : filteredCollections.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No collection records found.</div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-slate-800">Col No</TableHead>
                    <TableHead className="font-bold text-xs text-slate-800">Date</TableHead>
                    <TableHead className="font-bold text-xs text-slate-800">Job No</TableHead>
                    <TableHead className="font-bold text-xs text-slate-800">Artisan</TableHead>
                    <TableHead className="font-bold text-xs text-slate-800">Product SKU</TableHead>
                    <TableHead className="font-bold text-xs text-slate-800 text-right">Collected</TableHead>
                    <TableHead className="font-bold text-xs text-slate-800 text-right">Rejected</TableHead>
                    <TableHead className="font-bold text-xs text-slate-800 text-right">Accepted</TableHead>
                    <TableHead className="font-bold text-xs text-slate-800">Remarks</TableHead>
                    {isAdminOrManager && <TableHead className="font-bold text-xs text-slate-800 text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCollections.map((col) => {
                    const dateStr = formatERPDateTime(col.collectionDate);
                    return (
                      <TableRow key={col.id.toString()} className="hover:bg-slate-50/50">
                        <TableCell className="font-mono font-bold text-xs text-slate-700">COL-{col.id.toString()}</TableCell>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">{dateStr}</TableCell>
                        <TableCell className="font-mono font-bold text-xs text-slate-600">JW-{col.jobWorkNo.toString()}</TableCell>
                        <TableCell className="font-semibold text-slate-800 text-xs">{col.karigarName}</TableCell>
                        <TableCell className="text-xs text-slate-700 max-w-36 truncate font-medium">{col.productName}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-xs">{col.todayCollectedQty}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-red-500 font-semibold">{col.rejectedQty > 0 ? `-${col.rejectedQty}` : '0'}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-green-600 font-bold">+{col.acceptedQty}</TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-28 truncate">{col.remarks || '-'}</TableCell>
                        {isAdminOrManager && (
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(col)} className="h-7 w-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(col.id)} className="h-7 w-7 text-red-600 hover:text-red-800 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Right Side: Active Pending Jobs */}
        <Card className="border-2 border-gold shadow-sm">
          <CardHeader className="bg-amber-50/10 border-b border-gold/20 py-4">
            <CardTitle className="text-maroon text-base flex items-center gap-2">
              <Plus className="h-5 w-5 text-saffron" /> Active Job Works
            </CardTitle>
            <CardDescription>Select any active artisan job below to quickly collect finished craft pieces.</CardDescription>
          </CardHeader>
          <CardContent className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
            {jobsLoading ? (
              <div className="text-center py-6 text-slate-500 text-xs">Loading active jobs...</div>
            ) : pendingJobWorks.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">No active assignments to collect.</div>
            ) : (
              pendingJobWorks.map((job) => {
                const pendingCount = safeQty(safeQty(job.qtyGiven) - safeQty(job.acceptedQty));
                const progressPct = safeQty(job.qtyGiven) > 0 ? Math.min(100, Math.max(0, Math.round((safeQty(job.acceptedQty) / safeQty(job.qtyGiven)) * 100))) : 0;

                return (
                  <div key={job.id.toString()} className="border border-gold/20 rounded-lg p-3 space-y-2 hover:bg-amber-50/5 transition-all text-xs bg-white dark:bg-slate-950">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-slate-800">JW-{job.id.toString()}</span>
                      {getStatusBadge(job.status)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{job.employeeName}</p>
                      <p className="text-slate-500 font-medium">{job.productName}</p>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 border-t border-dashed pt-1">
                      <span>Given: <strong>{safeQty(job.qtyGiven)}</strong></span>
                      <span>Collected: <strong>{safeQty(job.collectedQty)}</strong></span>
                      <span>Pending: <strong className="text-maroon">{pendingCount}</strong></span>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Progress</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-maroon h-1.5 rounded-full" style={{ width: `${progressPct}%` }}></div>
                      </div>
                    </div>

                    {canAddCollection && (
                      <Button
                        onClick={() => handleOpenAdd(job.id.toString())}
                        disabled={safeQty(job.acceptedQty) >= safeQty(job.qtyGiven)}
                        size="sm"
                        className="w-full bg-maroon hover:bg-maroon/90 text-white text-[11px] h-7 font-bold flex items-center justify-center gap-1 mt-1 border border-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="h-3 w-3" /> Collect Returns
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md border-2 border-gold bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-maroon font-bold text-xl flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-saffron" /> Collect Finished Goods
            </DialogTitle>
            <DialogDescription>
              Record returned pieces from artisan. Accepted quantities automatically stock-in.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCollection} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-500 font-semibold text-xs">Select Job Work *</Label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger className="border-gold/30 focus:ring-maroon">
                  <SelectValue placeholder="Select Job Work" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                  {jobWorks.filter(j => {
                    const isCompleted = safeQty(j.acceptedQty) >= safeQty(j.qtyGiven);
                    const canSelect = !isCompleted || isAdmin;
                    return (j.status === 'Completed' || j.status === 'Partially Collected' || j.status === 'Given' || j.status === 'In Progress' || j.status === 'Near Completion') && canSelect;
                  }).map(j => (
                    <SelectItem key={j.id.toString()} value={j.id.toString()}>
                      JW-{j.id.toString()} - {j.employeeName} ({j.productName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedJob && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {!hasBOM && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-500 shrink-0" />
                    BOM not configured for this product.
                  </div>
                )}
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border text-xs space-y-1.5 font-medium text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Artisan:</span>
                    <span className="font-semibold">{selectedJob.employeeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Product:</span>
                    <span className="font-semibold max-w-44 truncate">{selectedJob.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quantity Given:</span>
                    <span className="font-mono font-semibold">{givenQty} pcs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Previous Collected:</span>
                    <span className="font-mono">{prevCollected} pcs</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1 font-bold">
                    <span className="text-maroon">Current Pending Qty:</span>
                    <span className="font-mono text-maroon">{pendingQty} pcs</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="todayCollectedQty" className="text-slate-500 font-semibold text-xs">Today Collected *</Label>
                    <Input
                      id="todayCollectedQty"
                      type="number"
                      placeholder="e.g. 50"
                      value={todayCollectedQty}
                      onChange={(e) => setTodayCollectedQty(e.target.value)}
                      className="border-gold/30 focus-visible:ring-maroon font-bold font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rejectedQty" className="text-red-500 font-semibold text-xs">Rejected Qty</Label>
                    <Input
                      id="rejectedQty"
                      type="number"
                      placeholder="e.g. 2"
                      value={rejectedQty}
                      onChange={(e) => setRejectedQty(e.target.value)}
                      className="border-red-200 focus-visible:ring-red-600 text-red-500 font-bold font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-2.5 rounded-lg border border-dashed text-xs text-slate-800">
                  <div>
                    <span className="text-slate-400">Accepted Qty:</span>
                    <p className="font-mono font-bold text-sm text-green-600">+{acceptedQty} pcs</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Remaining Pending:</span>
                    <p className="font-mono font-bold text-sm text-maroon">{remainingPendingQty} pcs</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="remarks" className="text-slate-500 font-semibold text-xs">Remarks</Label>
                  <Textarea
                    id="remarks"
                    placeholder="E.g. Collected beaded border beaded toran..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="border-gold/30 focus-visible:ring-maroon min-h-[40px]"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="border-gold/30">
                Cancel
              </Button>
              <Button type="submit" disabled={!selectedJob} className="bg-maroon hover:bg-maroon/90 text-white font-semibold">
                Save & Update Stock
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md border-2 border-gold bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-maroon font-bold text-xl flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-saffron" /> Edit Goods Collection
            </DialogTitle>
            <DialogDescription>
              Modify collection numbers. Previous stock increment will automatically reverse.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCollection} className="space-y-4 pt-2">
            {editingCollection && (
              <div className="space-y-4">
                {!hasEditingBOM && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-500 shrink-0" />
                    BOM not configured for this product.
                  </div>
                )}
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border text-xs space-y-1.5 font-medium text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Collection No:</span>
                    <span className="font-mono font-bold">COL-{editingCollection.id.toString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Artisan:</span>
                    <span className="font-semibold">{editingCollection.karigarName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Product:</span>
                    <span className="font-semibold max-w-44 truncate">{editingCollection.productName}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1 font-bold">
                    <span className="text-maroon">Calculated Pending Qty:</span>
                    <span className="font-mono text-maroon">{editDetails.pending} pcs</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="editTodayCollectedQty" className="text-slate-500 font-semibold text-xs">Today Collected *</Label>
                    <Input
                      id="editTodayCollectedQty"
                      type="number"
                      value={editTodayCollectedQty}
                      onChange={(e) => setEditTodayCollectedQty(e.target.value)}
                      className="border-gold/30 focus-visible:ring-maroon font-bold font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="editRejectedQty" className="text-red-500 font-semibold text-xs">Rejected Qty</Label>
                    <Input
                      id="editRejectedQty"
                      type="number"
                      value={editRejectedQty}
                      onChange={(e) => setEditRejectedQty(e.target.value)}
                      className="border-red-200 focus-visible:ring-red-600 text-red-500 font-bold font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-2.5 rounded-lg border border-dashed text-xs text-slate-800">
                  <div>
                    <span className="text-slate-400">New Accepted Qty:</span>
                    <p className="font-mono font-bold text-sm text-green-600">+{editDetails.accepted} pcs</p>
                  </div>
                  <div>
                    <span className="text-slate-400">New Remaining Pending:</span>
                    <p className="font-mono font-bold text-sm text-maroon">{Math.max(0, editDetails.pending - editDetails.accepted)} pcs</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editRemarks" className="text-slate-500 font-semibold text-xs">Remarks</Label>
                  <Textarea
                    id="editRemarks"
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    className="border-gold/30 focus-visible:ring-maroon min-h-[40px]"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="border-gold/30">
                Cancel
              </Button>
              <Button type="submit" className="bg-maroon hover:bg-maroon/90 text-white font-semibold">
                Save & Update Stock
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm border-2 border-gold bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-red-600 font-bold text-lg flex items-center gap-1.5">
              <AlertTriangle className="h-5 w-5" /> Reverse Collection Stock?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this collection entry? This will reverse the Finished Goods stock increase and add the quantities back to the artisan pending balance. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} className="border-gold/30">
              Cancel
            </Button>
            <Button type="button" onClick={handleDeleteCollection} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </ProductionLayout>
  );
};

export default Collections;
