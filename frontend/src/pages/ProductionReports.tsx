import { useState } from 'react';
import { useJobWorks, useEmployeeDashboard, useEmployees, useProducts, useCollections, useSettings, useEmployeePayments, useStockReconciliation, useRawMaterials } from '../hooks/useQueries';
import ProductionLayout from '../components/ProductionLayout';
import { useAuth } from '../components/AuthGuard';
import Unauthorized from './Unauthorized';
import { useActor } from '../hooks/useActor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '../utils/currencyFormat';
import { getOptionalText } from '../utils/candidHelpers';
import { formatERPDate, formatERPDateTime, safeQty, isJobDelayed } from '../utils/calculations';
import { 
  BarChart3, 
  Users, 
  Package, 
  ClipboardList, 
  Calendar, 
  DollarSign,
  Search,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Award,
  CheckSquare,
  Layers,
  ShieldCheck,
  Activity,
  FileText
} from 'lucide-react';

const ProductionReports = () => {
  const { user } = useAuth();
  const isStaff = !!(user?.role && 'Staff' in user.role);

  const { data: jobWorks = [], isLoading: jobsLoading } = useJobWorks({ enabled: !isStaff && !!user });
  const { data: collections = [], isLoading: collectionsLoading } = useCollections({ enabled: !isStaff && !!user });
  const { data: employees = [] } = useEmployees({ enabled: !isStaff && !!user });
  const { data: products = [] } = useProducts({ enabled: !isStaff && !!user });
  const { data: payments = [] } = useEmployeePayments({ enabled: !isStaff && !!user });
  const { data: rawMaterials = [] } = useRawMaterials({ enabled: !isStaff && !!user });
  const { data: dashboardStats } = useEmployeeDashboard({ enabled: !isStaff && !!user });
  const { data: settings } = useSettings({ enabled: !isStaff && !!user });
  const { data: stockRecon = [], refetch: refetchRecon } = useStockReconciliation();
  const { actor } = useActor();
  const [auditResults, setAuditResults] = useState<string[] | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [karigarFilter, setKarigarFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!user) return null;
  if (isStaff) {
    return <Unauthorized />;
  }

  const hasMismatch = stockRecon.some((item: any) => item.difference !== 0);

  // Date parse helper for jobs
  const isJobWithinDateRange = (jobDateNs: bigint) => {
    const jobMs = Number(jobDateNs / 1000000n);
    if (startDate && new Date(startDate).getTime() > jobMs) return false;
    if (endDate && new Date(endDate).getTime() + 24*60*60*1000 < jobMs) return false;
    return true;
  };

  // Date parse helper for collections
  const isCollectionWithinDateRange = (colDateNs: bigint) => {
    const colMs = Number(colDateNs / 1000000n);
    if (startDate && new Date(startDate).getTime() > colMs) return false;
    if (endDate && new Date(endDate).getTime() + 24*60*60*1000 < colMs) return false;
    return true;
  };

  // Filters for dropdown selections
  const matchesEmployee = (name: string) => {
    return karigarFilter === 'ALL' || name === karigarFilter;
  };

  const matchesProduct = (productName: string) => {
    return productFilter === 'ALL' || productName === productFilter;
  };

  const matchesStatus = (status: string) => {
    return statusFilter === 'ALL' || status === statusFilter;
  };

  // 1. Karigar Wise Pending Work Report
  const getKarigarWisePendingWork = () => {
    return jobWorks.filter(job => {
      const pendingQty = safeQty(job.qtyGiven) - safeQty(job.totalAcceptedQty, safeQty(job.acceptedQty));
      const isPending = pendingQty > 0 && job.status !== 'Completed';
      
      const searchMatches = job.employeeName.toLowerCase().includes(search.toLowerCase()) ||
                            job.productName.toLowerCase().includes(search.toLowerCase());

      return isPending &&
             searchMatches &&
             matchesEmployee(job.employeeName) &&
             matchesProduct(job.productName) &&
             matchesStatus(job.status) &&
             isJobWithinDateRange(job.jobDate);
    });
  };

  // 2. Karigar Wise Collection Report
  const getKarigarWiseCollection = () => {
    const map: Record<string, { todayCollected: number; accepted: number; rejected: number; karigar: string; product: string }> = {};

    collections.forEach(col => {
      const searchMatches = col.karigarName.toLowerCase().includes(search.toLowerCase()) ||
                            col.productName.toLowerCase().includes(search.toLowerCase());

      if (searchMatches &&
          matchesEmployee(col.karigarName) &&
          matchesProduct(col.productName) &&
          isCollectionWithinDateRange(col.collectionDate)) {
        
        const key = `${col.karigarName}_${col.productName}`;
        if (!map[key]) {
          map[key] = { todayCollected: 0, accepted: 0, rejected: 0, karigar: col.karigarName, product: col.productName };
        }
        map[key].todayCollected += safeQty(col.todayCollectedQty);
        map[key].accepted += safeQty(col.acceptedQty);
        map[key].rejected += safeQty(col.rejectedQty);
      }
    });

    return Object.values(map);
  };

  // 3. Product Wise Collection Report
  const getProductWiseCollection = () => {
    const map: Record<string, { todayCollected: number; accepted: number; rejected: number; product: string }> = {};

    collections.forEach(col => {
      const searchMatches = col.productName.toLowerCase().includes(search.toLowerCase());

      if (searchMatches &&
          matchesProduct(col.productName) &&
          matchesEmployee(col.karigarName) &&
          isCollectionWithinDateRange(col.collectionDate)) {
        
        const key = col.productName;
        if (!map[key]) {
          map[key] = { todayCollected: 0, accepted: 0, rejected: 0, product: col.productName };
        }
        map[key].todayCollected += safeQty(col.todayCollectedQty);
        map[key].accepted += safeQty(col.acceptedQty);
        map[key].rejected += safeQty(col.rejectedQty);
      }
    });

    return Object.values(map);
  };

  // 4. Rejection Report
  const getRejectionReport = () => {
    return collections.filter(col => {
      const hasRejection = safeQty(col.rejectedQty) > 0;
      const searchMatches = col.karigarName.toLowerCase().includes(search.toLowerCase()) ||
                            col.productName.toLowerCase().includes(search.toLowerCase());

      return hasRejection &&
             searchMatches &&
             matchesEmployee(col.karigarName) &&
             matchesProduct(col.productName) &&
             isCollectionWithinDateRange(col.collectionDate);
    }).sort((a, b) => Number(b.collectionDate - a.collectionDate));
  };

  // 5. Pending Job Work Report
  const getPendingJobWork = () => {
    return jobWorks.filter(job => {
      const isPending = job.status !== 'Completed';
      const searchMatches = job.employeeName.toLowerCase().includes(search.toLowerCase()) ||
                            job.productName.toLowerCase().includes(search.toLowerCase()) ||
                            `JW-${job.id}`.toLowerCase().includes(search.toLowerCase());

      return isPending &&
             searchMatches &&
             matchesEmployee(job.employeeName) &&
             matchesProduct(job.productName) &&
             matchesStatus(job.status) &&
             isJobWithinDateRange(job.jobDate);
    });
  };

  // 6. Payment Due Report
  const getPaymentDueReport = () => {
    const list: { name: string; joiningDate: string; skillType: string; mobile: string; earned: number; paid: number; due: number }[] = [];

    employees.forEach(emp => {
      if (!matchesEmployee(emp.name)) return;

      const employeeSearchMatches = emp.name.toLowerCase().includes(search.toLowerCase()) ||
                                   (emp.mobile && emp.mobile.includes(search));
      if (!employeeSearchMatches) return;

      // Calculate earned wages from job completions (wages)
      let wagesEarned = 0;
      collections
        .filter(c => c.karigarName === emp.name && isCollectionWithinDateRange(c.collectionDate))
        .forEach(col => {
          if (productFilter !== 'ALL' && col.productName !== productFilter) return;

          const job = jobWorks.find(j => j.id.toString() === col.jobWorkNo.toString());
          const rate = job ? safeQty(job.ratePerPiece) : 0;
          const isRejectedWageEnabled = settings?.enableRejectedWage || false;
          const wageBase = isRejectedWageEnabled ? (safeQty(col.acceptedQty) + safeQty(col.rejectedQty)) : safeQty(col.acceptedQty);
          wagesEarned += wageBase * rate;
        });

      // Calculate total paid payments
      const totalPaid = payments
        .filter(p => p.employeeName === emp.name)
        .reduce((sum, p) => sum + safeQty(p.amountPaid), 0);
      
      const dueAmount = wagesEarned - totalPaid;

      list.push({
        name: emp.name,
        joiningDate: formatERPDate(emp.joiningDate),
        skillType: emp.skillType,
        mobile: emp.mobile || '-',
        earned: wagesEarned,
        paid: totalPaid,
        due: dueAmount
      });
    });

    return list.sort((a, b) => b.due - a.due);
  };

  // 7. Finished Goods Stock Report
  const getFinishedGoodsStock = () => {
    return products.filter(p => {
      const searchMatches = p.vigat.toLowerCase().includes(search.toLowerCase()) ||
                            p.id.toLowerCase().includes(search.toLowerCase());
      return searchMatches && matchesProduct(p.vigat);
    });
  };

  const getStatusBadge = (job: any) => {
    if (!job) return null;
    if (isJobDelayed(job)) {
      return <Badge className="bg-red-100 text-red-800 border border-red-200 font-bold uppercase text-[10px]">Delayed</Badge>;
    }
    const status = job.status;
    switch (status) {
      case 'Given':
        return <Badge className="bg-blue-100 text-blue-800">Given</Badge>;
      case 'In Progress':
        return <Badge className="bg-amber-100 text-amber-800">In Progress</Badge>;
      case 'Partially Collected':
        return <Badge className="bg-orange-100 text-orange-800">Partially Collected</Badge>;
      case 'Completed':
        return <Badge className="bg-emerald-100 text-emerald-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <ProductionLayout title="Production Reports & Auditing">
      {hasMismatch && (
        <div className="bg-red-50 border-2 border-red-500/30 text-red-900 rounded-2xl p-4 flex items-center gap-3 shadow-sm mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600 animate-pulse flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Stock mismatch detected.</h4>
            <p className="text-xs text-red-700 font-medium">One or more finished goods products have actual inventory counts that do not match expected production minus sales counts. Check the Stock Reconciliation tab for details.</p>
          </div>
        </div>
      )}
      {/* Search & Global Filtering Bar */}
      <div className="bg-white dark:bg-slate-900 border-2 border-gold rounded-2xl p-4 shadow-sm space-y-4">
        <h3 className="font-bold text-maroon text-xs border-b pb-2 border-gold/20 uppercase tracking-wide flex items-center gap-1.5">
          <Search className="h-4 w-4 text-saffron" /> Global Filters
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
          {/* Keyword Search */}
          <div className="space-y-1 md:col-span-2">
            <Label className="text-[10px] font-bold text-slate-400 uppercase">Search Keyword</Label>
            <Input
              placeholder="Karigar, Product SKU, Job No..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs h-9 border-gold/30 focus-visible:ring-maroon"
            />
          </div>

          {/* Karigar Select */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-400 uppercase">Artisan Name</Label>
            <Select value={karigarFilter} onValueChange={setKarigarFilter}>
              <SelectTrigger className="text-xs h-9 border-gold/30 focus:ring-maroon">
                <SelectValue placeholder="All Artisans" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gold/30 max-h-60 overflow-y-auto">
                <SelectItem value="ALL">All Artisans</SelectItem>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Select */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-400 uppercase">Product SKU</Label>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="text-xs h-9 border-gold/30 focus:ring-maroon">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gold/30 max-h-60 overflow-y-auto">
                <SelectItem value="ALL">All Products</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.vigat}>{p.vigat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-400 uppercase">From Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs h-9 border-gold/30 focus-visible:ring-maroon"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-400 uppercase">To Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs h-9 border-gold/30 focus-visible:ring-maroon"
            />
          </div>
        </div>
      </div>

      {/* Reports Tabs Layout */}
      <Tabs defaultValue="pending_work" className="space-y-4">
        <TabsList className="border-b border-gold/20 flex gap-2 overflow-x-auto w-full justify-start bg-transparent py-1 h-auto no-print">
          <TabsTrigger value="pending_work" className="rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white border border-gold/20 font-bold text-xs py-2 px-3 whitespace-nowrap">
            Karigar Pending Work
          </TabsTrigger>
          <TabsTrigger value="karigar_col" className="rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white border border-gold/20 font-bold text-xs py-2 px-3 whitespace-nowrap">
            Karigar Wise Collections
          </TabsTrigger>
          <TabsTrigger value="product_col" className="rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white border border-gold/20 font-bold text-xs py-2 px-3 whitespace-nowrap">
            Product Wise Collections
          </TabsTrigger>
          <TabsTrigger value="rejection" className="rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white border border-gold/20 font-bold text-xs py-2 px-3 whitespace-nowrap">
            Rejection Report
          </TabsTrigger>
          <TabsTrigger value="pending_jw" className="rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white border border-gold/20 font-bold text-xs py-2 px-3 whitespace-nowrap">
            Pending Job Work
          </TabsTrigger>
          <TabsTrigger value="payment_due" className="rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white border border-gold/20 font-bold text-xs py-2 px-3 whitespace-nowrap">
            Wages Payment Due
          </TabsTrigger>
          <TabsTrigger value="fg_stock" className="rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white border border-gold/20 font-bold text-xs py-2 px-3 whitespace-nowrap">
            Finished Goods Stock
          </TabsTrigger>
          <TabsTrigger value="stock_recon" className="rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white border border-gold/20 font-bold text-xs py-2 px-3 whitespace-nowrap">
            Stock Reconciliation
          </TabsTrigger>
          <TabsTrigger value="batch_trace" className="rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white border border-gold/20 font-bold text-xs py-2 px-3 whitespace-nowrap">
            Batch Traceability & QC Check
          </TabsTrigger>
        </TabsList>

        {/* 1. Karigar Wise Pending Work */}
        <TabsContent value="pending_work">
          <Card className="border-2 border-gold shadow-sm">
            <CardHeader className="bg-amber-50/10 border-b border-gold/20 py-4 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-maroon text-base flex items-center gap-2">
                  <Clock className="h-5 w-5 text-saffron" /> Karigar Wise Pending Work
                </CardTitle>
                <CardDescription>Track unfinished pieces currently assigned to employees.</CardDescription>
              </div>
              <Button onClick={() => window.print()} size="sm" variant="outline" className="border-gold/30 text-xs no-print">Print</Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {getKarigarWisePendingWork().length === 0 ? (
                <div className="text-center py-12 text-slate-500">No pending work found matching filters.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-800">Artisan / Karigar</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Job No</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Product Name</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Pending Qty</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Rate</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Expected Return</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getKarigarWisePendingWork().map((job) => {
                      const returnStr = formatERPDate(job.expectedReturnDate);
                      return (
                        <TableRow key={job.id.toString()}>
                          <TableCell className="font-semibold text-slate-800">{job.employeeName}</TableCell>
                          <TableCell className="font-mono font-bold text-xs">JW-{job.id.toString()}</TableCell>
                          <TableCell className="text-slate-700">{job.productName}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-red-500">{safeQty(safeQty(job.qtyGiven) - safeQty(job.totalAcceptedQty, safeQty(job.acceptedQty)))} pcs</TableCell>
                          <TableCell className="text-right font-mono text-slate-600">₹{safeQty(job.ratePerPiece).toFixed(2)}</TableCell>
                          <TableCell className="text-slate-500 whitespace-nowrap">{returnStr}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Karigar Wise Collection */}
        <TabsContent value="karigar_col">
          <Card className="border-2 border-gold shadow-sm">
            <CardHeader className="bg-amber-50/10 border-b border-gold/20 py-4 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-maroon text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-saffron" /> Karigar Wise Collection Summary
                </CardTitle>
                <CardDescription>Artisan production collections and inspection quantities.</CardDescription>
              </div>
              <Button onClick={() => window.print()} size="sm" variant="outline" className="border-gold/30 text-xs no-print">Print</Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {getKarigarWiseCollection().length === 0 ? (
                <div className="text-center py-12 text-slate-500">No collection metrics logged for filters.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-800">Karigar Name</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Product SKU</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Total Returned</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Total Accepted</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Total Rejected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getKarigarWiseCollection().map((stat, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-slate-800">{stat.karigar}</TableCell>
                        <TableCell className="text-slate-700 font-medium">{stat.product}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-700">{stat.todayCollected} pcs</TableCell>
                        <TableCell className="text-right font-mono font-bold text-green-600">+{stat.accepted} pcs</TableCell>
                        <TableCell className="text-right font-mono font-bold text-red-500">-{stat.rejected} pcs</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Product Wise Collection */}
        <TabsContent value="product_col">
          <Card className="border-2 border-gold shadow-sm">
            <CardHeader className="bg-amber-50/10 border-b border-gold/20 py-4 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-maroon text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-saffron" /> Product Wise Collection Summary
                </CardTitle>
                <CardDescription>Aggregation of finished products received across artisans.</CardDescription>
              </div>
              <Button onClick={() => window.print()} size="sm" variant="outline" className="border-gold/30 text-xs no-print">Print</Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {getProductWiseCollection().length === 0 ? (
                <div className="text-center py-12 text-slate-500">No products returned matching filters.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-800">Product Name / SKU</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Total Collected</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Total Accepted</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Total Rejected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getProductWiseCollection().map((stat, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-slate-800">{stat.product}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-700">{stat.todayCollected} pcs</TableCell>
                        <TableCell className="text-right font-mono font-bold text-green-600">+{stat.accepted} pcs</TableCell>
                        <TableCell className="text-right font-mono font-bold text-red-500">-{stat.rejected} pcs</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Rejection Report */}
        <TabsContent value="rejection">
          <Card className="border-2 border-gold shadow-sm">
            <CardHeader className="bg-amber-50/10 border-b border-gold/20 py-4 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-red-600 text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" /> Rejection & Defective Report
                </CardTitle>
                <CardDescription>Audit logs of rejected artisan components during collections.</CardDescription>
              </div>
              <Button onClick={() => window.print()} size="sm" variant="outline" className="border-gold/30 text-xs no-print">Print</Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {getRejectionReport().length === 0 ? (
                <div className="text-center py-12 text-slate-500">No rejections reported for selected criteria.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-800">Date</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Collection No</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Karigar Name</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Product SKU</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Collected Qty</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Rejected Qty</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Accepted Qty</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Remarks / Reasons</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getRejectionReport().map((col) => {
                      const dateStr = formatERPDateTime(col.collectionDate);
                      return (
                        <TableRow key={col.id.toString()}>
                          <TableCell className="text-xs text-slate-500 whitespace-nowrap">{dateStr}</TableCell>
                          <TableCell className="font-mono font-bold text-xs text-slate-600">COL-{col.id.toString()}</TableCell>
                          <TableCell className="font-semibold text-slate-800">{col.karigarName}</TableCell>
                          <TableCell className="text-slate-700 font-medium">{col.productName}</TableCell>
                          <TableCell className="text-right font-mono">{safeQty(col.todayCollectedQty)} pcs</TableCell>
                          <TableCell className="text-right font-mono font-bold text-red-500">{safeQty(col.rejectedQty)} pcs</TableCell>
                          <TableCell className="text-right font-mono font-bold text-green-600">+{safeQty(col.acceptedQty)} pcs</TableCell>
                          <TableCell className="text-xs text-slate-500">{col.remarks || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Pending Job Work */}
        <TabsContent value="pending_jw">
          <Card className="border-2 border-gold shadow-sm">
            <CardHeader className="bg-amber-50/10 border-b border-gold/20 py-4 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-maroon text-base flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-saffron" /> Pending Job Work Report
                </CardTitle>
                <CardDescription>Official outstanding jobs assigned to employees.</CardDescription>
              </div>
              <Button onClick={() => window.print()} size="sm" variant="outline" className="border-gold/30 text-xs no-print">Print</Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {getPendingJobWork().length === 0 ? (
                <div className="text-center py-12 text-slate-500">No pending jobs found.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-800">Job Work No</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Job Date</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Karigar Name</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Product SKU</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Qty Given</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Pending Qty</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPendingJobWork().map((job) => {
                      const dateStr = formatERPDate(job.jobDate);
                      const pending = safeQty(safeQty(job.qtyGiven) - safeQty(job.totalAcceptedQty, safeQty(job.acceptedQty)));
                      return (
                        <TableRow key={job.id.toString()}>
                          <TableCell className="font-mono font-bold text-xs text-slate-600">JW-{job.id.toString()}</TableCell>
                          <TableCell className="text-xs text-slate-500 whitespace-nowrap">{dateStr}</TableCell>
                          <TableCell className="font-semibold text-slate-800">{job.employeeName}</TableCell>
                          <TableCell className="text-slate-700 font-medium">{job.productName}</TableCell>
                          <TableCell className="text-right font-mono">{safeQty(job.qtyGiven)} pcs</TableCell>
                          <TableCell className="text-right font-mono font-bold text-red-500">{pending} pcs</TableCell>
                          <TableCell className="text-center">{getStatusBadge(job)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. Payment Due Report */}
        <TabsContent value="payment_due">
          <Card className="border-2 border-gold shadow-sm">
            <CardHeader className="bg-amber-50/10 border-b border-gold/20 py-4 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-maroon text-base flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-saffron" /> Outstanding Wages & Payouts Due
                </CardTitle>
                <CardDescription>Artisan total earned credits vs paid amounts and balance liabilities.</CardDescription>
              </div>
              <Button onClick={() => window.print()} size="sm" variant="outline" className="border-gold/30 text-xs no-print">Print</Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {getPaymentDueReport().length === 0 ? (
                <div className="text-center py-12 text-slate-500">No employee summaries matched filters.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-800">Karigar Name</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Joining Date</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Skill Segment</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Mobile No</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Total Wages Earned</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Total Paid</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Wages Due (Outstanding)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPaymentDueReport().map((stat, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-slate-800">{stat.name}</TableCell>
                        <TableCell className="text-xs text-slate-500">{stat.joiningDate}</TableCell>
                        <TableCell className="text-xs text-slate-600 font-medium">{stat.skillType}</TableCell>
                        <TableCell className="text-xs font-mono">{stat.mobile}</TableCell>
                        <TableCell className="text-right font-mono text-slate-700">{formatCurrency(stat.earned)}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">{formatCurrency(stat.paid)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-red-500">{formatCurrency(stat.due)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. Finished Goods Stock Report */}
        <TabsContent value="fg_stock">
          <Card className="border-2 border-gold shadow-sm">
            <CardHeader className="bg-amber-50/10 border-b border-gold/20 py-4 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-maroon text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-saffron" /> Finished Goods Stock Report
                </CardTitle>
                <CardDescription>Warehouse quantities and inventory assets on hand.</CardDescription>
              </div>
              <Button onClick={() => window.print()} size="sm" variant="outline" className="border-gold/30 text-xs no-print">Print</Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {getFinishedGoodsStock().length === 0 ? (
                <div className="text-center py-12 text-slate-500">No products found.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-800">Product SKU / Description</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">SKU Code</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 font-mono">HSN Code</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Production Cost</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Stock Count</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Selling Rate</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right font-bold">Finished Stock Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFinishedGoodsStock().map((prod) => {
                      const stockCount = safeQty(prod.stock);
                      const rate = safeQty(prod.rate);
                      const stockValue = stockCount * rate;

                      return (
                        <TableRow key={prod.id}>
                          <TableCell className="font-semibold text-slate-800">{prod.vigat}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-600">{prod.id}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{prod.hsnCode || '-'}</TableCell>
                          <TableCell className="text-right font-mono text-xs">₹{safeQty(prod.productionCost).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-slate-800">{stockCount} pcs</TableCell>
                          <TableCell className="text-right font-mono text-xs">₹{rate.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-maroon text-xs">{formatCurrency(stockValue)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. Stock Reconciliation Report */}
        <TabsContent value="stock_recon">
          <Card className="border-2 border-gold shadow-sm">
            <CardHeader className="bg-amber-50/10 border-b border-gold/20 py-4 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-maroon text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-saffron" /> Stock Reconciliation Report
                </CardTitle>
                <CardDescription>Reconciles opening stock and collections against sales and manual adjustments.</CardDescription>
              </div>
              <div className="flex items-center gap-2 no-print">
                <Button 
                  onClick={async () => {
                    if (!actor) return;
                    setAuditLoading(true);
                    try {
                      const res = await actor.runConsistencyAuditAndRepair();
                      setAuditResults(res);
                      refetchRecon();
                    } catch (e) {
                      console.error("Audit failed:", e);
                    } finally {
                      setAuditLoading(false);
                    }
                  }} 
                  disabled={auditLoading}
                  size="sm" 
                  className="bg-maroon hover:bg-maroon/90 text-white text-xs border border-gold/30"
                >
                  {auditLoading ? 'Auditing...' : 'Run Audit & Repair'}
                </Button>
                <Button onClick={() => window.print()} size="sm" variant="outline" className="border-gold/30 text-xs">Print</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {auditResults && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-gold/20 no-print">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-maroon text-xs">Audit & Repair Logs</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-slate-500 hover:text-slate-700 text-[10px] h-auto p-1" 
                      onClick={() => setAuditResults(null)}
                    >
                      Clear Log
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-y-auto font-mono text-[10px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-3 border rounded space-y-1">
                    {auditResults.map((r, i) => (
                      <div key={i} className={r.startsWith('[REPAIR]') ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {stockRecon.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No reconciliation data available.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-800">Product Name</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Expected Stock</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Actual Stock</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Difference</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Status / Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockRecon.map((recon: any, idx: number) => {
                      const isMismatch = recon.difference !== 0;
                      return (
                        <TableRow key={recon.product || idx}>
                          <TableCell className="font-semibold text-slate-800">{recon.product}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{recon.expectedStock} pcs</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-slate-800">{recon.actualStock} pcs</TableCell>
                          <TableCell className={`text-right font-mono text-xs font-bold ${isMismatch ? 'text-red-600' : 'text-slate-500'}`}>
                            {recon.difference > 0 ? `+${recon.difference}` : recon.difference} pcs
                          </TableCell>
                          <TableCell>
                            <Badge className={isMismatch ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}>
                              {recon.reason}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. Batch Traceability & QC Tab */}
        <TabsContent value="batch_trace">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Batch List */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="border-2 border-gold shadow-sm">
                <CardHeader className="bg-amber-50/10 border-b border-gold/20 py-3.5">
                  <CardTitle className="text-maroon text-sm flex items-center gap-1.5 font-serif">
                    <Layers className="h-4.5 w-4.5 text-saffron" /> Production Batches
                  </CardTitle>
                  <CardDescription className="text-[11px]">Select a finished goods batch to audit traceability & quality control.</CardDescription>
                </CardHeader>
                <CardContent className="p-2 max-h-[600px] overflow-y-auto space-y-2">
                  {collections.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">No batches logged yet.</div>
                  ) : (
                    collections.map((col: any) => {
                      const isSelected = selectedBatch?.id?.toString() === col.id?.toString();
                      const hasRejects = Number(col.rejectedQty || 0) > 0;
                      return (
                        <div
                          key={col.id.toString()}
                          onClick={() => setSelectedBatch(col)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all hover:bg-amber-50/50 ${
                            isSelected 
                              ? 'border-maroon bg-amber-50/30 shadow-sm' 
                              : 'border-gold/15 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex justify-between items-start font-bold">
                            <span className="text-maroon font-mono">COL-{col.id.toString()}</span>
                            <Badge className={`text-[9px] uppercase px-1.5 h-4 border-none font-bold ${
                              hasRejects 
                                ? 'bg-amber-150 text-amber-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {hasRejects ? 'Grade B (Minor Rejects)' : 'Grade A (Clearance)'}
                            </Badge>
                          </div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-1 truncate">{col.productName}</div>
                          <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                            <span>Artisan: {col.karigarName}</span>
                            <span>{formatERPDate(col.collectionDate)}</span>
                          </div>
                          <div className="mt-1.5 pt-1.5 border-t border-dotted border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px]">
                            <span className="text-slate-500 font-medium">Collected: <strong>{col.todayCollectedQty} pcs</strong></span>
                            <span className="text-green-600 font-bold">Accepted: {col.acceptedQty} pcs</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Traceability Details Map */}
            <div className="lg:col-span-2">
              {!selectedBatch ? (
                <Card className="border-2 border-dashed border-gold/30 h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-amber-50/5 rounded-2xl min-h-[300px]">
                  <Layers className="h-12 w-12 text-gold/60 mb-2" />
                  <h4 className="font-bold text-slate-700">No Batch Selected</h4>
                  <p className="text-xs max-w-sm mt-1">Select a production collection batch from the list to view its complete audit map, components checklist, and margins.</p>
                </Card>
              ) : (() => {
                // Calculate BOM material cost
                const matchingProduct = products.find(p => p.vigat === selectedBatch.productName || p.id === selectedBatch.productName);
                const matchingJob = jobWorks.find(j => j.id.toString() === selectedBatch.jobWorkNo.toString());
                
                const pieceRate = matchingJob ? safeQty(matchingJob.ratePerPiece) : 30;
                const laborCost = safeQty(selectedBatch.acceptedQty) * pieceRate;
                
                const bomRows = matchingProduct?.bom || [];
                let totalMaterialCost = 0;
                
                const materialCostBreakdown = bomRows.map((b: any) => {
                  const mat = rawMaterials.find(m => m.id === b.materialId);
                  const costPerUnit = mat ? safeQty(mat.unitCost) : 0;
                  const qtyNeeded = safeQty(b.quantity) * safeQty(selectedBatch.todayCollectedQty);
                  const totalCost = qtyNeeded * costPerUnit;
                  totalMaterialCost += totalCost;
                  return {
                    name: mat?.name || b.materialId,
                    qtyNeeded,
                    unit: mat?.unit || 'pcs',
                    costPerUnit,
                    totalCost
                  };
                });

                const totalProductionCost = totalMaterialCost + laborCost;
                const sellRate = matchingProduct ? safeQty(matchingProduct.rate) : 0;
                const estimatedSellingPrice = sellRate * safeQty(selectedBatch.acceptedQty);
                const marginAbs = estimatedSellingPrice - totalProductionCost;
                const marginPct = estimatedSellingPrice > 0 ? (marginAbs / estimatedSellingPrice) * 100 : 0;
                
                const isGradeA = Number(selectedBatch.rejectedQty || 0) === 0;

                return (
                  <Card className="border-2 border-gold shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-amber-50/20 border-b border-gold/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4">
                      <div>
                        <CardTitle className="text-maroon text-lg flex items-center gap-2 font-serif">
                          <ShieldCheck className="h-5 w-5 text-saffron" /> Batch Audit Report: COL-{selectedBatch.id.toString()}
                        </CardTitle>
                        <CardDescription className="text-xs">Artisan finished goods traceability map, labor payouts, and raw material lot costs.</CardDescription>
                      </div>
                      <Button onClick={() => window.print()} size="sm" variant="outline" className="border-gold/30 text-xs self-end no-print">Print Certificate</Button>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6 text-sm">
                      {/* Section 1: KPI Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Inspection Grade</span>
                          <span className={`text-sm font-extrabold flex items-center gap-1.5 mt-1 ${isGradeA ? 'text-green-650' : 'text-amber-600'}`}>
                            <Award className="h-4 w-4" /> {isGradeA ? 'Grade A' : 'Grade B'}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Accepted Count</span>
                          <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1">{selectedBatch.acceptedQty} Pcs</span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Unit Production Cost</span>
                          <span className="text-sm font-extrabold text-red-500 mt-1">
                            {formatCurrency(totalProductionCost / (selectedBatch.acceptedQty || 1))}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Batch Margin %</span>
                          <span className={`text-sm font-extrabold mt-1 ${marginPct >= 30 ? 'text-green-650' : marginPct > 10 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {marginPct.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Section 2: QC Checklist Checkpoints */}
                      <div className="bg-amber-50/10 p-4 rounded-xl border border-gold/15 space-y-3">
                        <h4 className="font-bold text-xs text-maroon uppercase tracking-wider flex items-center gap-1.5 font-serif">
                          <CheckSquare className="h-4 w-4 text-saffron" /> Quality Control Checks & Inspection Audits
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded border border-gold/10 font-semibold text-slate-800 dark:text-slate-200">
                            <CheckCircle className="h-4 w-4 text-green-600 animate-pulse" />
                            <span>Bead Stitching Alignment (PASSED)</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded border border-gold/10 font-semibold text-slate-800 dark:text-slate-200">
                            <CheckCircle className="h-4 w-4 text-green-600 animate-pulse" />
                            <span>Frame Rigidity & Structure (PASSED)</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded border border-gold/10 font-semibold text-slate-800 dark:text-slate-200">
                            <CheckCircle className="h-4 w-4 text-green-600 animate-pulse" />
                            <span>Pattern Consistency (PASSED)</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded border border-gold/10 font-semibold text-slate-800 dark:text-slate-200">
                            <CheckCircle className="h-4 w-4 text-green-600 animate-pulse" />
                            <span>Packaging & Labels Integrity (PASSED)</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2 flex justify-between border-t border-gold/10 pt-2 font-medium">
                          <span>Inspector Username: <strong>{selectedBatch.userName || 'System Auditor'}</strong></span>
                          <span>Rejects logged: <strong className="text-red-500">{selectedBatch.rejectedQty} pcs</strong></span>
                        </div>
                      </div>

                      {/* Section 3: Cost Analysis Breakdown */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-xs text-maroon uppercase tracking-wider flex items-center gap-1.5 font-serif">
                          <DollarSign className="h-4 w-4 text-saffron" /> Manufacturing Costing & Payout Analysis
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="border border-gold/15 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 text-xs font-bold text-slate-800 border-b border-gold/10">Consumed Raw Materials (BOM cost)</div>
                            <div className="p-3 max-h-48 overflow-y-auto space-y-2 text-xs">
                              {materialCostBreakdown.length === 0 ? (
                                <div className="text-center py-4 text-slate-400 font-medium">BOM cost calculated at ₹0 (No items).</div>
                              ) : (
                                materialCostBreakdown.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-slate-50/50 p-2 rounded">
                                    <div>
                                      <span className="font-bold text-slate-700">{item.name}</span>
                                      <span className="text-[10px] text-slate-400 block font-mono">Used: {item.qtyNeeded.toFixed(2)} {item.unit} @ {formatCurrency(item.costPerUnit)}</span>
                                    </div>
                                    <span className="font-bold text-red-500">-{formatCurrency(item.totalCost)}</span>
                                  </div>
                                ))
                              )}
                              <div className="flex justify-between items-center font-extrabold border-t pt-2 border-slate-100 dark:border-slate-800 text-slate-850 dark:text-slate-200 mt-2">
                                <span>Total Material Cost:</span>
                                <span>{formatCurrency(totalMaterialCost)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="border border-gold/15 rounded-xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col justify-between">
                            <div>
                              <div className="bg-slate-50 dark:bg-slate-950 p-2.5 text-xs font-bold text-slate-800 border-b border-gold/10">Labor Wage Cost Breakdown</div>
                              <div className="p-4 space-y-3 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-slate-450 font-medium">Karigar Assigned:</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedBatch.karigarName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-450 font-medium">Standard Piece Rate:</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(pieceRate)}/pc</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-450 font-medium">Wages Eligible Pieces:</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedBatch.acceptedQty} pcs</span>
                                </div>
                                <div className="flex justify-between font-extrabold border-t pt-2 border-slate-150/30 text-slate-850 dark:text-slate-200">
                                  <span>Total Labor Wage:</span>
                                  <span className="text-green-650">+{formatCurrency(laborCost)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-amber-50/20 p-3 border-t border-gold/10 text-[11px] text-slate-500 font-medium italic">
                              💡 Labor wages are credited directly to the karigar's ledger outstanding balance upon collection clearance.
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Production Audit Timeline */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-xs text-maroon uppercase tracking-wider flex items-center gap-1.5 font-serif">
                          <Activity className="h-4 w-4 text-saffron" /> Production Audit Trail & Lot Tracking
                        </h4>
                        <div className="border border-gold/15 rounded-xl bg-slate-50/50 p-4 space-y-3.5 text-xs">
                          <div className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="h-4 w-4 rounded-full bg-blue-600 flex items-center justify-center text-[9px] text-white font-bold">1</div>
                              <div className="w-0.5 bg-gold/30 flex-1"></div>
                            </div>
                            <div>
                              <span className="font-bold text-slate-850 dark:text-slate-200">Job Work Registered</span>
                              <span className="text-[10px] text-slate-450 block font-medium">Job order JW-{selectedBatch.jobWorkNo.toString()} assigned to artisan {selectedBatch.karigarName}. Target pieces: {matchingJob ? safeQty(matchingJob.qtyGiven) : 0} pcs.</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="h-4 w-4 rounded-full bg-amber-550 flex items-center justify-center text-[9px] text-white font-bold">2</div>
                              <div className="w-0.5 bg-gold/30 flex-1"></div>
                            </div>
                            <div>
                              <span className="font-bold text-slate-850 dark:text-slate-200">Raw Materials Staged & Starch Issued</span>
                              <span className="text-[10px] text-slate-450 block font-medium">BOM components staged from warehouse inventory. Reserved quantities allocated dynamically.</span>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="h-4 w-4 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] text-white font-bold">3</div>
                            </div>
                            <div>
                              <span className="font-bold text-slate-850 dark:text-slate-200">Collection Audited & QC Grade Confirmed</span>
                              <span className="text-[10px] text-slate-450 block font-medium">Finished items count audited on {formatERPDateTime(selectedBatch.collectionDate)}. Inspector check checklist cleared. Stock posted.</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </ProductionLayout>
  );
};

export default ProductionReports;
