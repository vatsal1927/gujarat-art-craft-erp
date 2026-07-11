import { useState } from 'react';
import { useJobWorks, useEmployees, useProducts, useSaveJobWork } from '../hooks/useQueries';
import ProductionLayout from '../components/ProductionLayout';
import { useAuth } from '../components/AuthGuard';
import Unauthorized from './Unauthorized';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ClipboardList, Plus, Search, Calendar, User, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { formatERPDate, safeQty, isJobDelayed } from '../utils/calculations';
const mapJobWorkRole = (role?: string | null): string | undefined => {
  if (!role) return undefined;
  const r = role.replace('#', '').toLowerCase();
  if (r === 'admin' || r === 'master admin') return 'Master Admin';
  if (r === 'manager') return 'Admin';
  if (r === 'staff') return 'Staff';
  return undefined;
};

const WORK_TYPES = [
  'Toran Making',
  'Jhumar Making',
  'Beading Work',
  'Packing Work',
  'Finishing Work'
];

const JobWork = () => {
  const { user } = useAuth();
  const isStaff = !!(user?.role && 'Staff' in user.role);

  const { data: jobWorks = [], isLoading: jobsLoading } = useJobWorks();
  const { data: employees = [] } = useEmployees({ enabled: !isStaff && !!user });
  const { data: products = [] } = useProducts({ enabled: !isStaff && !!user });
  const saveJobWorkMutation = useSaveJobWork();

  const linkedEmployeeId = isStaff && user ? (localStorage.getItem(`staff_employee_link_${user.username.toLowerCase()}`) || 'EMP-1') : '';
  const staffEmployeeName = isStaff && user ? (localStorage.getItem(`staff_employee_name_${user.username.toLowerCase()}`) || 'Ramesh Patel') : user?.name || '';
  const linkedEmployee = isStaff ? { id: linkedEmployeeId, name: staffEmployeeName } : null;

  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Form State
  const [jobDate, setJobDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeName, setEmployeeName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [workType, setWorkType] = useState('Toran Making');
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [qtyGiven, setQtyGiven] = useState('');
  const [ratePerPiece, setRatePerPiece] = useState('');
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [remarks, setRemarks] = useState('');
  
  // Customer Order Link State
  const [linkOrder, setLinkOrder] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  if (!user) return null;

  const resetForm = () => {
    setJobDate(new Date().toISOString().split('T')[0]);
    setEmployeeName('');
    setMobileNumber('');
    setWorkType('Toran Making');
    setProductName('');
    setProductCode('');
    setHsnCode('');
    setQtyGiven('');
    setRatePerPiece('');
    setExpectedDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setRemarks('');
    setLinkOrder(false);
    setCustomerName('');
    setOrderNumber('');
  };

  const handleOpenAdd = () => {
    resetForm();
    const activeEmps = employees.filter(e => e.status === 'Active');
    if (activeEmps.length > 0) {
      setEmployeeName(activeEmps[0].name);
      setMobileNumber(activeEmps[0].mobile || '');
    }
    if (products.length > 0) {
      setProductName(products[0].vigat);
      setProductCode(products[0].id || '');
      setHsnCode(products[0].hsnCode || '5609');
      setRatePerPiece(products[0].productionCost > 0 ? products[0].productionCost.toString() : (products[0].rate / 4).toString());
    }
    setIsOpen(true);
  };

  const handleEmployeeChange = (name: string) => {
    setEmployeeName(name);
    const emp = employees.find(e => e.name === name);
    if (emp) {
      setMobileNumber(emp.mobile || '');
    }
  };

  const handleProductChange = (prodVigat: string) => {
    setProductName(prodVigat);
    const prod = products.find(p => p.vigat === prodVigat);
    if (prod) {
      setProductCode(prod.id || '');
      setHsnCode(prod.hsnCode || '5609');
      setRatePerPiece(prod.productionCost > 0 ? prod.productionCost.toString() : (prod.rate / 4).toString());
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName || !productName || !qtyGiven || !ratePerPiece) {
      toast.error('Please fill in all required fields');
      return;
    }

    const qtyVal = parseFloat(qtyGiven);
    const rateVal = parseFloat(ratePerPiece);

    if (isNaN(qtyVal) || qtyVal <= 0) {
      toast.error('Quantity Given must be greater than 0');
      return;
    }
    if (isNaN(rateVal) || rateVal <= 0) {
      toast.error('Rate per piece must be greater than 0');
      return;
    }

    const jobDateNs = BigInt(new Date(jobDate).getTime()) * 1000000n;
    const expectedDateNs = BigInt(new Date(expectedDate).getTime()) * 1000000n;

    const customerOrderLink = linkOrder && customerName && orderNumber 
      ? { customerName, orderNumber } 
      : null;

    try {
      await saveJobWorkMutation.mutateAsync({
        jobDate: jobDateNs,
        employeeName,
        mobileNumber: mobileNumber.trim(),
        productName,
        productCode: productCode.trim(),
        hsnCode: hsnCode.trim(),
        qtyGiven: qtyVal,
        ratePerPiece: rateVal,
        expectedReturnDate: expectedDateNs,
        remarks,
        customerOrderLink
      });
      toast.success('Job Work assigned successfully!');
      setIsOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save job work assignment');
    }
  };

  const isJobForCurrentUser = (job: any) => {
    if (!job) return false;
    
    // 1. Match by linked employeeId
    if (linkedEmployee && linkedEmployee.id) {
      if (job.employeeId === linkedEmployee.id) return true;
      if (job.employeeName && job.employeeName.toLowerCase() === linkedEmployee.name.toLowerCase()) return true;
    }
    
    // 2. Match by artisanName / employeeName matching user.name
    if (job.employeeName && user.name && job.employeeName.toLowerCase() === user.name.toLowerCase()) {
      return true;
    }
    if (job.artisanName && user.name && job.artisanName.toLowerCase() === user.name.toLowerCase()) {
      return true;
    }
    
    // 3. Match by staffUserId or linked staff principal/userId in remarks or directly
    const username = user.username || '';
    const principalStr = user.principalId ? user.principalId.toString() : '';
    
    if (job.staffUserId === username || job.staffUserId === principalStr) {
      return true;
    }
    
    const remarks = job.remarks || '';
    if (remarks.includes(`StaffUID:${username}`) || (principalStr && remarks.includes(`StaffUID:${principalStr}`))) {
      return true;
    }
    
    return false;
  };

  const userJobWorks = isStaff ? jobWorks.filter(isJobForCurrentUser) : jobWorks;

  const filteredJobs = userJobWorks.filter(job => 
    job.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    job.productName.toLowerCase().includes(search.toLowerCase()) ||
    (job.productCode && job.productCode.toLowerCase().includes(search.toLowerCase())) ||
    `JW-${job.id}`.toLowerCase().includes(search.toLowerCase()) ||
    job.status.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (job: any) => {
    if (!job) return null;
    if (isJobDelayed(job)) {
      return <Badge className="bg-red-100 text-red-800 border border-red-200 font-bold uppercase text-[10px]">Delayed</Badge>;
    }
    const status = job.status;
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
    <ProductionLayout title="Job Work Registration">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search assignments by JW No, name, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-gold/40 focus-visible:ring-maroon"
          />
        </div>

        {!isStaff && (
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenAdd} className="bg-maroon hover:bg-maroon/90 text-white font-semibold flex items-center gap-1.5 w-full md:w-auto border border-gold/20 shadow-sm">
                <Plus className="h-4.5 w-4.5" /> Assign Job Work
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg border-2 border-gold bg-white dark:bg-slate-900 overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-maroon font-bold text-xl">
                  New Job Work Assignment
                </DialogTitle>
                <DialogDescription>
                  Assign raw components or unfinished crafts to artisans for home production.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="jobDate" className="text-slate-500 font-semibold text-xs">Job Date *</Label>
                    <Input
                      id="jobDate"
                      type="date"
                      value={jobDate}
                      onChange={(e) => setJobDate(e.target.value)}
                      className="border-gold/30 focus-visible:ring-maroon"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-500 font-semibold text-xs">Employee / Karigar *</Label>
                    <Select value={employeeName} onValueChange={handleEmployeeChange}>
                      <SelectTrigger className="border-gold/30 focus:ring-maroon">
                        <SelectValue placeholder="Select Employee" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                        {employees.filter(e => e.status === 'Active').map(e => (
                          <SelectItem key={e.id} value={e.name}>{e.name} ({e.skillType})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mobileNumber" className="text-slate-500 font-semibold text-xs">Mobile Number</Label>
                    <Input
                      id="mobileNumber"
                      type="text"
                      placeholder="Auto-filled mobile"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="border-gold/30 focus-visible:ring-maroon"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-500 font-semibold text-xs">Product (Finished Good SKU) *</Label>
                    <Select value={productName} onValueChange={handleProductChange}>
                      <SelectTrigger className="border-gold/30 focus:ring-maroon">
                        <SelectValue placeholder="Select Product" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.vigat}>{p.vigat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="productCode" className="text-slate-500 font-semibold text-xs">Product Code</Label>
                    <Input
                      id="productCode"
                      type="text"
                      placeholder="Product code"
                      value={productCode}
                      onChange={(e) => setProductCode(e.target.value)}
                      className="border-gold/30 focus-visible:ring-maroon"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="hsnCode" className="text-slate-500 font-semibold text-xs">HSN Code</Label>
                    <Input
                      id="hsnCode"
                      type="text"
                      placeholder="HSN code"
                      value={hsnCode}
                      onChange={(e) => setHsnCode(e.target.value)}
                      className="border-gold/30 focus-visible:ring-maroon"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="qtyGiven" className="text-slate-500 font-semibold text-xs">Quantity Given *</Label>
                    <Input
                      id="qtyGiven"
                      type="number"
                      placeholder="e.g. 100"
                      value={qtyGiven}
                      onChange={(e) => setQtyGiven(e.target.value)}
                      className="border-gold/30 focus-visible:ring-maroon font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ratePerPiece" className="text-slate-500 font-semibold text-xs">Rate Per Piece (₹) *</Label>
                    <Input
                      id="ratePerPiece"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 15.00"
                      value={ratePerPiece}
                      onChange={(e) => setRatePerPiece(e.target.value)}
                      className="border-gold/30 focus-visible:ring-maroon"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="expectedDate" className="text-slate-500 font-semibold text-xs">Expected Return Date</Label>
                    <Input
                      id="expectedDate"
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                      className="border-gold/30 focus-visible:ring-maroon"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-500 font-semibold text-xs">Work Segment</Label>
                    <Select value={workType} onValueChange={setWorkType}>
                      <SelectTrigger className="border-gold/30 focus:ring-maroon">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                        {WORK_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="remarks" className="text-slate-500 font-semibold text-xs">Remarks / Instructions</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Artisan instructions..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="border-gold/30 focus-visible:ring-maroon min-h-[50px]"
                  />
                </div>

                {/* Customer Order Linking Section */}
                <div className="border-t border-gold/20 pt-3">
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox 
                      id="linkOrder" 
                      checked={linkOrder} 
                      onCheckedChange={(checked) => setLinkOrder(!!checked)}
                      className="border-gold text-maroon focus-visible:ring-maroon"
                    />
                    <Label htmlFor="linkOrder" className="font-bold text-slate-700 text-xs cursor-pointer select-none">
                      Link with Customer Order
                    </Label>
                  </div>

                  {linkOrder && (
                    <div className="grid grid-cols-2 gap-4 bg-amber-50/20 p-3 rounded-lg border border-gold/20 animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <Label htmlFor="customerName" className="text-slate-500 font-semibold text-xs">Customer Name</Label>
                        <Input
                          id="customerName"
                          placeholder="Customer name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="border-gold/30 focus-visible:ring-maroon bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="orderNumber" className="text-slate-500 font-semibold text-xs">Order Number</Label>
                        <Input
                          id="orderNumber"
                          placeholder="e.g. ORD-1092"
                          value={orderNumber}
                          onChange={(e) => setOrderNumber(e.target.value)}
                          className="border-gold/30 focus-visible:ring-maroon bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="border-gold/30">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-maroon hover:bg-maroon/90 text-white font-semibold">
                    Dispatch Job
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-2 border-gold shadow-sm mt-4">
        <CardHeader className="bg-amber-50/10 border-b border-gold/20 py-4">
          <CardTitle className="text-maroon text-base flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-saffron" /> Work Dispatch Board
          </CardTitle>
          <CardDescription>All job assignments dispatched to home-working craft employees.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {jobsLoading ? (
            <div className="text-center py-12 text-slate-500">Loading assignments...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No job work assignments logged.</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-xs text-slate-800">Job No</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Job Date</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Artisan Name</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Mobile No</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Product SKU</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">SKU Code</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">HSN</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 text-right">Qty Given</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 text-right">Rate (₹)</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 text-center">Status</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Expected Return</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Created By</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Created Role</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Last Updated By</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Last Updated Role</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Last Action</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => {
                  const jobDateStr = formatERPDate(job.jobDate);
                  const returnDateStr = formatERPDate(job.expectedReturnDate);
                  const createdBy = job.createdByFullName || job.createdByUsername || "Legacy Record";
                  const createdRole = mapJobWorkRole(job.createdByRole) || "Legacy Record";
                  const updatedBy = job.updatedByFullName || job.updatedByUsername || "Legacy Record";
                  const updatedRole = mapJobWorkRole(job.updatedByRole) || "Legacy Record";
                  const lastAction = job.lastAction || "Legacy Record";
                  const lastUpdated = job.lastUpdated ? formatERPDate(job.lastUpdated) : "Legacy Record";
                  return (
                    <TableRow key={job.id.toString()} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono font-bold text-xs text-slate-700">JW-{job.id.toString()}</TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">{jobDateStr}</TableCell>
                      <TableCell className="font-semibold text-slate-800">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-slate-400" /> {job.employeeName}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-mono">{job.mobileNumber || '-'}</TableCell>
                      <TableCell className="text-slate-700 max-w-44 truncate font-medium">
                        <span className="flex items-center gap-1">
                          <ShoppingBag className="h-3.5 w-3.5 text-slate-400" /> {job.productName}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-mono">{job.productCode || '-'}</TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">{job.hsnCode || '-'}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-maroon">{safeQty(job.qtyGiven)}</TableCell>
                      <TableCell className="text-right font-mono text-slate-600">₹{safeQty(job.ratePerPiece).toFixed(2)}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(job)}</TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">{returnDateStr}</TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">{createdBy}</TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">{createdRole}</TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">{updatedBy}</TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">{updatedRole}</TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">{lastAction}</TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">{lastUpdated}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </ProductionLayout>
  );
};

export default JobWork;
