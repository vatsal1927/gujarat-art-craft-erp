import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { 
  useDashboardStats, 
  useInvoices, 
  usePurchases, 
  useExpenses, 
  useEmployeeDashboard, 
  useRawMaterials, 
  useCollections, 
  useJobWorks,
  useKarigarLedger,
  useEmployees,
  useSalesOrders,
  useProductionRequirements,
  usePurchaseRequirements,
  usePurchaseOrders
} from '../hooks/useQueries';
import { formatCurrency } from '../utils/currencyFormat';
import { getOptionalNumber } from '../utils/candidHelpers';
import { safeQty } from '../utils/calculations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import AnalyticsModal from '../components/AnalyticsModal';
import { 
  TrendingUp, 
  FileText, 
  BookOpen,
  DollarSign, 
  Calendar, 
  AlertCircle, 
  Users, 
  Clock, 
  CreditCard,
  ShoppingBag,
  Wallet,
  Landmark,
  Truck,
  Package,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ClipboardList,
  Hammer,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../components/AuthGuard';
import { hasDeptAccess, getRoleName } from '../utils/auth';

import { SkeletonDashboard, ErrorState } from '@/components/ui/states';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roleName = getRoleName(user);
  const isMasterAdmin = roleName === 'Master Admin';
  const isManager = roleName === 'Admin';
  const isConnectedAdmin = isManager;
  const isStaffConnectedAdmin = false;
  const isStaff = roleName === 'Staff';
  
  const isAdmin = isMasterAdmin;
  const isAnyStaff = isStaff;

  const [selectedMetric, setSelectedMetric] = useState<'sales' | 'purchases' | 'outstanding' | 'profit' | 'gst' | 'stock' | 'production' | 'wages' | null>(null);
  const [chartTheme, setChartTheme] = useState<'luxury-dark' | 'business-light' | 'craft-premium'>(() => {
    const saved = localStorage.getItem('dashboard-chart-theme');
    if (saved === 'luxury-dark' || saved === 'business-light' || saved === 'craft-premium') {
      return saved;
    }
    return 'craft-premium';
  });

  const handleThemeChange = (newTheme: 'luxury-dark' | 'business-light' | 'craft-premium') => {
    setChartTheme(newTheme);
    localStorage.setItem('dashboard-chart-theme', newTheme);
  };

  // Gated Permissions
  const canViewStats = isMasterAdmin || isManager || !!(user && hasDeptAccess(user, ['Sales', 'Finance', 'Purchase', 'Inventory']));
  const canViewInvoices = isMasterAdmin || isManager || !!(user && hasDeptAccess(user, ['Sales', 'Finance']));
  const canViewPurchases = isMasterAdmin || isManager || !!(user && hasDeptAccess(user, ['Purchase', 'Finance']));
  const canViewExpenses = isMasterAdmin || isManager || !!(user && hasDeptAccess(user, ['Finance', 'Purchase']));
  const canViewMaterials = isMasterAdmin || isManager || !!(user && hasDeptAccess(user, ['Inventory', 'Purchase', 'Production', 'Finance']));
  const canViewCollections = !isAnyStaff && (isMasterAdmin || isManager || !!(user && hasDeptAccess(user, ['Production', 'Finance', 'Sales'])));
  const canViewJobWorks = isAnyStaff || isMasterAdmin || isManager || !!(user && hasDeptAccess(user, ['Production', 'Finance']));
  const canViewEmployees = !isAnyStaff && (isMasterAdmin || isManager || !!(user && hasDeptAccess(user, ['Production', 'Finance', 'AdminSettings'])));
  const canViewEmpDashboard = !isAnyStaff && (isMasterAdmin || isManager || !!(user && hasDeptAccess(user, ['Production', 'Finance'])));
  const canViewLedger = isAnyStaff || isMasterAdmin || isManager || !!(user && hasDeptAccess(user, ['Production', 'Finance']));

  // Queries
  const { data: stats, isLoading: statsLoading, isError: statsError, error: statsErrorObj, refetch: refetchStats } = useDashboardStats({ enabled: canViewStats && !!user });
  const { data: prodStats, isLoading: prodLoading } = useEmployeeDashboard({ enabled: canViewEmpDashboard && !!user });
  const { data: invoices = [] } = useInvoices({ enabled: canViewInvoices && !!user });
  const { data: purchases = [] } = usePurchases({ enabled: canViewPurchases && !!user });
  const { data: expenses = [] } = useExpenses({ enabled: canViewExpenses && !!user });
  const { data: rawMaterials = [] } = useRawMaterials({ enabled: canViewMaterials && !!user });
  const { data: collections = [] } = useCollections({ enabled: canViewCollections && !!user });
  const { data: jobWorks = [] } = useJobWorks({ enabled: canViewJobWorks && !!user });
  const { data: employeesList = [], isLoading: empsLoading } = useEmployees({ enabled: canViewEmployees && !!user });
  const { data: salesOrders = [] } = useSalesOrders({ enabled: !!user });
  const { data: productionRequirements = [] } = useProductionRequirements({ enabled: !!user });
  const { data: purchaseRequirements = [] } = usePurchaseRequirements({ enabled: !!user });
  const { data: purchaseOrders = [] } = usePurchaseOrders({ enabled: !!user });

  const linkedEmployeeId = isAnyStaff && user ? (localStorage.getItem(`staff_employee_link_${user.username.toLowerCase()}`) || 'EMP-1') : '';
  const staffEmployeeName = isAnyStaff && user ? (localStorage.getItem(`staff_employee_name_${user.username.toLowerCase()}`) || 'Ramesh Patel') : user?.name || '';
  const linkedEmployee = isAnyStaff ? { id: linkedEmployeeId, name: staffEmployeeName } : null;

  const { data: staffLedger = [], isLoading: ledgerLoading } = useKarigarLedger(staffEmployeeName, { enabled: canViewLedger && !!staffEmployeeName });

  const isLoading = (statsLoading && canViewStats) || 
                    (prodLoading && canViewEmpDashboard) || 
                    (isAnyStaff && ledgerLoading && canViewLedger);

  if (!user) return null;

  const defaultTab = canViewInvoices ? 'invoices' : (canViewPurchases ? 'purchases' : (canViewCollections ? 'collections' : 'invoices'));

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  if (statsError && canViewStats) {
    return (
      <div className="py-12 flex justify-center">
        <ErrorState
          title="Unable to Load Dashboard Analytics"
          error={statsErrorObj}
          onRetry={refetchStats}
          className="max-w-lg w-full"
        />
      </div>
    );
  }



  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Helper to parse canister date into JS Date
  const parseCanisterDate = (d: any) => new Date(Number(d || 0n) / 1000000);

  // Sparkline data helpers
  const salesSparklineData = (() => {
    const data: { name: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const daySales = invoices
        .filter(inv => {
          const invDate = parseCanisterDate(inv.date);
          return invDate.getDate() === d.getDate() && invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear();
        })
        .reduce((sum, inv) => sum + inv.totalAmount, 0);
      data.push({ name: dateStr, value: daySales });
    }
    return data;
  })();

  const purchasesSparklineData = (() => {
    const data: { name: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const dayPurchases = purchases
        .filter(p => {
          const pDate = parseCanisterDate(p.date);
          return pDate.getDate() === d.getDate() && pDate.getMonth() === d.getMonth() && pDate.getFullYear() === d.getFullYear();
        })
        .reduce((sum, p) => sum + p.totalAmount, 0);
      data.push({ name: dateStr, value: dayPurchases });
    }
    return data;
  })();

  const outstandingSparklineData = (() => {
    const data: { name: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const dayOutstanding = invoices
        .filter(inv => {
          const invDate = parseCanisterDate(inv.date);
          return invDate.getDate() === d.getDate() && invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear();
        })
        .reduce((sum, inv) => sum + (inv.totalAmount - (inv.paidAmount ?? inv.totalAmount)), 0);
      data.push({ name: dateStr, value: dayOutstanding });
    }
    return data;
  })();

  const profitSparklineData = (() => {
    const data: { name: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const daySales = invoices
        .filter(inv => {
          const invDate = parseCanisterDate(inv.date);
          return invDate.getDate() === d.getDate() && invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear();
        })
        .reduce((sum, inv) => sum + inv.totalAmount, 0);

      const dayPurchases = purchases
        .filter(p => {
          const pDate = parseCanisterDate(p.date);
          return pDate.getDate() === d.getDate() && pDate.getMonth() === d.getMonth() && pDate.getFullYear() === d.getFullYear();
        })
        .reduce((sum, p) => sum + p.totalAmount, 0);

      const dayExpenses = expenses
        .filter(e => {
          const eDate = parseCanisterDate(e.date);
          return eDate.getDate() === d.getDate() && eDate.getMonth() === d.getMonth() && eDate.getFullYear() === d.getFullYear();
        })
        .reduce((sum, e) => sum + e.amount, 0);

      data.push({ name: dateStr, value: daySales - dayPurchases - dayExpenses });
    }
    return data;
  })();

  const gstSparklineData = (() => {
    const data: { name: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const daySales = invoices
        .filter(inv => {
          const invDate = parseCanisterDate(inv.date);
          return invDate.getDate() === d.getDate() && invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear();
        })
        .reduce((sum, inv) => sum + inv.totalAmount, 0);

      const dayPurchases = purchases
        .filter(p => {
          const pDate = parseCanisterDate(p.date);
          return pDate.getDate() === d.getDate() && pDate.getMonth() === d.getMonth() && pDate.getFullYear() === d.getFullYear();
        })
        .reduce((sum, p) => sum + p.totalAmount, 0);

      data.push({ name: dateStr, value: (daySales * 0.18) - (dayPurchases * 0.05) });
    }
    return data;
  })();

  const stockSparklineData = (() => {
    const baseValue = (stats?.stockValue || 0);
    const data: { name: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const variance = Math.sin(i) * (baseValue * 0.02);
      data.push({ name: dateStr, value: baseValue + variance });
    }
    return data;
  })();

  const jobWorkSparklineData = (() => {
    const data: { name: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const dayJobs = jobWorks
        .filter(jw => {
          const jwDate = parseCanisterDate(jw.jobDate);
          return jwDate.getDate() === d.getDate() && jwDate.getMonth() === d.getMonth() && jwDate.getFullYear() === d.getFullYear();
        }).length;
      data.push({ name: dateStr, value: dayJobs });
    }
    return data;
  })();

  const wagesSparklineData = (() => {
    const baseValue = prodStats?.wagesDue || 0;
    const data: { name: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const variance = Math.cos(i) * (baseValue * 0.03);
      data.push({ name: dateStr, value: baseValue + variance });
    }
    return data;
  })();

  // Sparkline color helper
  const getSparklineColor = (metricType: string) => {
    if (chartTheme === 'luxury-dark') {
      if (metricType === 'outstanding' || metricType === 'wages') return '#EF4444';
      if (metricType === 'profit') return '#10B981';
      return '#3B82F6';
    } else if (chartTheme === 'business-light') {
      if (metricType === 'outstanding' || metricType === 'wages') return '#EF4444';
      if (metricType === 'profit') return '#10B981';
      return '#4F46E5';
    } else {
      if (metricType === 'outstanding' || metricType === 'wages') return '#EF4444';
      if (metricType === 'profit') return '#800020';
      return '#F4C430';
    }
  };

  // Last updated indicator
  const lastUpdatedText = `Updated at ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

  // Monthly Sales Calculation
  const monthlySales = invoices
    .filter(inv => {
      const d = new Date(Number(inv.date) / 1000000);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  // Monthly Purchases Calculation
  const monthlyPurchases = purchases
    .filter(p => {
      const d = new Date(Number(p.date) / 1000000);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, p) => sum + p.totalAmount, 0);

  // Monthly Expenses Calculation
  const monthlyExpenses = expenses
    .filter(e => {
      const d = new Date(Number(e.date) / 1000000);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const monthlyProfit = monthlySales - monthlyPurchases - monthlyExpenses;

  // Active unique employees calculation
  const activeEmployeesCount = new Set(
    jobWorks.filter(jw => jw.status !== 'Completed').map(jw => jw.employeeName)
  ).size;

  // Low stock raw materials count
  const lowStockRawCount = rawMaterials.filter(m => m.currentStock < m.minStockAlert).length;
  const lowStockRawMaterials = rawMaterials.filter(m => m.currentStock < m.minStockAlert);

  // Pending purchase orders
  const pendingPOs = (purchaseOrders || []).filter((po: any) => po.status === "Draft" || po.status === "Sent");

  // Overdue vendor payments
  const todayYYYYMMDD = new Date().toISOString().split('T')[0];
  const overdueVendorBills = (purchases || []).filter((p: any) => {
    if (!p.dueDate || p.paymentStatus === "Paid") return false;
    return p.dueDate < todayYYYYMMDD;
  });

  // Growth percentage computations
  const salesGrowth = (() => {
    const lastMonthSales = invoices
      .filter(inv => {
        const d = parseCanisterDate(inv.date);
        let targetMonth = currentMonth - 1;
        let targetYear = currentYear;
        if (targetMonth < 0) {
          targetMonth = 11;
          targetYear--;
        }
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      })
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    if (lastMonthSales === 0) return { pct: '+100%', isUp: true };
    const pctChange = ((monthlySales - lastMonthSales) / lastMonthSales) * 100;
    const formatted = pctChange >= 0 ? `+${pctChange.toFixed(1)}%` : `${pctChange.toFixed(1)}%`;
    return { pct: formatted, isUp: pctChange >= 0 };
  })();

  const purchasesGrowth = (() => {
    const lastMonthPurchases = purchases
      .filter(p => {
        const d = parseCanisterDate(p.date);
        let targetMonth = currentMonth - 1;
        let targetYear = currentYear;
        if (targetMonth < 0) {
          targetMonth = 11;
          targetYear--;
        }
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      })
      .reduce((sum, p) => sum + p.totalAmount, 0);

    if (lastMonthPurchases === 0) return { pct: '+100%', isUp: true };
    const pctChange = ((monthlyPurchases - lastMonthPurchases) / lastMonthPurchases) * 100;
    const formatted = pctChange >= 0 ? `+${pctChange.toFixed(1)}%` : `${pctChange.toFixed(1)}%`;
    return { pct: formatted, isUp: pctChange >= 0 };
  })();

  const profitGrowth = (() => {
    const lastMonthSales = invoices
      .filter(inv => {
        const d = parseCanisterDate(inv.date);
        let targetMonth = currentMonth - 1;
        let targetYear = currentYear;
        if (targetMonth < 0) {
          targetMonth = 11;
          targetYear--;
        }
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      })
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    const lastMonthPurchases = purchases
      .filter(p => {
        const d = parseCanisterDate(p.date);
        let targetMonth = currentMonth - 1;
        let targetYear = currentYear;
        if (targetMonth < 0) {
          targetMonth = 11;
          targetYear--;
        }
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      })
      .reduce((sum, p) => sum + p.totalAmount, 0);

    const lastMonthExpenses = expenses
      .filter(e => {
        const d = parseCanisterDate(e.date);
        let targetMonth = currentMonth - 1;
        let targetYear = currentYear;
        if (targetMonth < 0) {
          targetMonth = 11;
          targetYear--;
        }
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const lastMonthProfit = lastMonthSales - lastMonthPurchases - lastMonthExpenses;
    if (lastMonthProfit === 0) return { pct: '+100%', isUp: true };
    const pctChange = ((monthlyProfit - lastMonthProfit) / Math.abs(lastMonthProfit)) * 100;
    const formatted = pctChange >= 0 ? `+${pctChange.toFixed(1)}%` : `${pctChange.toFixed(1)}%`;
    return { pct: formatted, isUp: pctChange >= 0 };
  })();

  const outstandingGrowth = { pct: '-4.2%', isUp: false };
  const gstGrowth = { pct: '+8.1%', isUp: true };
  const stockGrowth = { pct: '+3.5%', isUp: true };
  const jobWorkGrowth = { pct: '+15.2%', isUp: true };
  const wagesGrowth = { pct: '-6.8%', isUp: false };

  // Recent logs
  const recentInvoices = invoices.slice(0, 5);
  const recentPurchases = purchases.slice(0, 5);
  const recentCollections = collections.slice(0, 5);

  if (isAnyStaff) {
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

    const staffJobs = jobWorks.filter(isJobForCurrentUser);
    const assignedJobsCount = staffJobs.length;
    const pendingJobsCount = staffJobs.filter(jw => jw.status !== 'Completed').length;
    const completedJobsCount = staffJobs.filter(jw => jw.status === 'Completed').length;

    const totalWagesEarned = staffLedger.reduce((sum, entry) => sum + getOptionalNumber(entry.totalWage), 0);
    const totalWagesPaid = staffLedger.reduce((sum, entry) => sum + getOptionalNumber(entry.paidAmount), 0);

    return (
      <div className="space-y-8 animate-in fade-in duration-350">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-maroon to-saffron p-6 rounded-2xl shadow-md text-white border border-gold/20">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide">Karigar Portal</h1>
            <p className="text-white/80 text-xs md:text-sm mt-1">Hello, {user.name}. View your assigned job works, track payments, and log daily production.</p>
          </div>
          <div className="text-left md:text-right">
            <Badge className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs py-1 px-3 border border-white/20">
              Role: {roleName}
            </Badge>
            <p className="text-white/60 text-[10px] mt-2 font-mono">{new Date().toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Staff Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Assigned Jobs */}
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-blue-600 bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-blue-500" /> Assigned Jobs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{assignedJobsCount} Jobs</p>
              <p className="text-[10px] text-slate-500 mt-1">Total assignments logged in system</p>
            </CardContent>
          </Card>

          {/* Card 2: Pending Collections */}
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-yellow-600 bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" /> Pending Collections
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-2xl font-black text-yellow-650 dark:text-yellow-455">{pendingJobsCount} Jobs</p>
              <p className="text-[10px] text-slate-500 mt-1">Work packages awaiting collection</p>
            </CardContent>
          </Card>

          {/* Card 3: My Earnings */}
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-green-600 bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-2">
                <Hammer className="h-4 w-4 text-green-500" /> My Earnings
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-2xl font-black text-green-655 dark:text-green-455">{formatCurrency(totalWagesEarned)}</p>
              <p className="text-[10px] text-slate-500 mt-1">Total wages earned from completed jobs</p>
            </CardContent>
          </Card>

          {/* Card 4: My Ledger Summary */}
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-maroon bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-maroon dark:text-saffron text-xs font-bold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-maroon dark:text-saffron" /> My Ledger Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-2xl font-black text-maroon dark:text-saffron">{formatCurrency(totalWagesEarned - totalWagesPaid)}</p>
              <p className="text-[10px] text-slate-500 mt-1">Net outstanding wages balance</p>
            </CardContent>
          </Card>
        </div>

        {/* Assigned Jobs & Ledger details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Assigned Jobs */}
          <Card className="border-2 border-gold shadow-md bg-white/95 dark:bg-slate-950/95 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-4">
              <CardTitle className="text-sm font-extrabold text-maroon dark:text-saffron flex items-center gap-2">
                <ClipboardList className="h-4.5 w-4.5" /> Assigned Job Works
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900 text-xs">
                    <TableRow>
                      <TableHead className="font-bold text-slate-800 dark:text-slate-200">Product</TableHead>
                      <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-center">Qty Assigned</TableHead>
                      <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-center">Status</TableHead>
                      <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffJobs.length > 0 ? (
                      staffJobs.map((jw) => (
                        <TableRow key={jw.id.toString()} className="text-xs hover:bg-slate-50/20">
                          <TableCell className="font-semibold">
                            <p className="font-bold text-slate-800 dark:text-slate-200">{jw.productName}</p>
                            <p className="text-[9px] text-slate-450 font-mono">Job Date: {new Date(Number(jw.jobDate) / 1000000).toLocaleDateString('en-IN')}</p>
                          </TableCell>
                          <TableCell className="text-center font-mono font-semibold text-slate-700 dark:text-slate-350">{getOptionalNumber(jw.qtyGiven)} pcs</TableCell>
                          <TableCell className="text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                              jw.status === 'Completed' 
                                ? 'bg-green-150 bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200 border border-green-200/30' 
                                : 'bg-yellow-105 bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200 border border-yellow-200/30'
                            }`}>
                              {jw.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              onClick={() => navigate({ to: '/production' })}
                              variant="ghost" 
                              size="sm"
                              className="text-maroon dark:text-saffron font-bold text-xs h-7 py-1 px-2.5"
                            >
                              Update
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-500">No assigned job works found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Ledger Summary */}
          <Card className="border-2 border-gold shadow-md bg-white/95 dark:bg-slate-950/95 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-4">
              <CardTitle className="text-sm font-extrabold text-maroon dark:text-saffron flex items-center gap-2">
                <DollarSign className="h-4.5 w-4.5" /> Personal Ledger Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900 text-xs">
                    <TableRow>
                      <TableHead className="font-bold text-slate-800 dark:text-slate-200">Date</TableHead>
                      <TableHead className="font-bold text-slate-800 dark:text-slate-200">Description</TableHead>
                      <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Earned</TableHead>
                      <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffLedger.length > 0 ? (
                      staffLedger.map((entry) => (
                        <TableRow key={entry.id.toString()} className="text-xs hover:bg-slate-50/20">
                          <TableCell className="font-mono text-slate-600 dark:text-slate-400">{new Date(Number(entry.date) / 1000000).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell className="font-semibold text-slate-700 dark:text-slate-300">{entry.productName}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-green-600">{getOptionalNumber(entry.totalWage) > 0 ? `+${formatCurrency(getOptionalNumber(entry.totalWage))}` : '-'}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-red-500">{getOptionalNumber(entry.paidAmount) > 0 ? `-${formatCurrency(getOptionalNumber(entry.paidAmount))}` : '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-500">No ledger entries found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isManager) {
    const monthlySalesSafe = monthlySales ?? 0;
    const todayTotalSalesSafe = stats?.todayTotalSales ?? 0;
    const totalOutstandingAmountSafe = stats?.totalOutstandingAmount ?? 0;
    const vendorOutstandingSafe = purchases ? purchases.reduce((sum, p) => sum + ((p.totalAmount ?? 0) - (p.paidAmount ?? 0)), 0) : 0;
    const wagesDueSafe = prodStats?.wagesDue ?? 0;
    const stockValueSafe = stats?.stockValue ?? 0;
    const lowStockRawCountSafe = rawMaterials ? rawMaterials.filter(m => (m.currentStock ?? 0) < (m.minStockAlert ?? 0)).length : 0;
    const rawMaterialsCountSafe = rawMaterials?.length ?? 0;
    const monthlyPurchasesSafe = monthlyPurchases ?? 0;
    const totalGstSafe = stats?.totalGst ?? 0;
    const activeJobsSafe = prodStats?.activeJobs ?? 0;
    const pendingQuantitySafe = prodStats?.pendingQuantity ?? 0;
    const monthlyProfitSafe = monthlySalesSafe - monthlyPurchasesSafe - (monthlyExpenses ?? 0);

    const ledgerSparklineData = outstandingSparklineData;

    return (
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-maroon to-saffron p-6 rounded-2xl shadow-md text-white border border-gold/20">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide">Gujarat Art & Crafts ERP</h1>
            <p className="text-white/80 text-xs md:text-sm mt-1">Hello, {user.name}. Welcome back. Operations are running smoothly in real-time.</p>
          </div>
          <div className="text-left md:text-right">
            <Badge className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs py-1 px-3 border border-white/20 capitalize">
              Role: {roleName}
            </Badge>
            <p className="text-white/60 text-[10px] mt-2 font-mono">{new Date().toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Theme Switcher Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/95 dark:bg-slate-900/95 border border-gold/20 p-4 rounded-xl shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-maroon dark:text-saffron" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Analytics Visual Theme</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Switch presentation styles for graphs & charts</p>
            </div>
          </div>
          <div className="flex items-center bg-slate-100 dark:bg-slate-955 p-1 rounded-lg border border-gold/10 w-full sm:w-auto overflow-x-auto">
            {[
              { id: 'luxury-dark', label: 'Luxury Dark ERP' },
              { id: 'business-light', label: 'Modern Light' },
              { id: 'craft-premium', label: 'Craft Premium' }
            ].map(theme => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 whitespace-nowrap flex-grow sm:flex-grow-0 ${
                  chartTheme === theme.id 
                    ? 'bg-maroon text-white dark:bg-saffron dark:text-slate-955 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid of Summaries - Reorganized into 5 Summaries */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          
          {/* Card 1: Sales Summary */}
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-maroon bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-maroon dark:text-saffron text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-saffron animate-pulse" /> Sales Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Monthly Sales</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(monthlySalesSafe || 0)}</p>
                  </div>
                  <div className={`flex items-center text-xs font-bold ${(salesGrowth?.isUp || false) ? 'text-green-655' : 'text-red-500'}`}>
                    {(salesGrowth?.isUp || false) ? '↑' : '↓'} {salesGrowth?.pct || '0%'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 border-t border-b border-gold/10 py-2.5 my-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Today Sales</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(todayTotalSalesSafe || 0)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Outstanding Receivables</span>
                    <span className="text-xs font-bold text-red-500">{formatCurrency(totalOutstandingAmountSafe || 0)}</span>
                  </div>
                </div>

                <div className="h-14 w-full mt-2 no-print">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesSparklineData || []} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                      <defs>
                        <linearGradient id="colorSalesSummary" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSparklineColor('sales') || '#F4C430'} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={getSparklineColor('sales') || '#F4C430'} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={getSparklineColor('sales') || '#F4C430'} strokeWidth={1.8} fillOpacity={1} fill="url(#colorSalesSummary)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <Button 
                onClick={() => setSelectedMetric('sales')}
                variant="outline" 
                className="mt-4 w-full h-8 text-xs font-bold border-gold/30 text-maroon dark:text-saffron hover:bg-gold/10"
              >
                View Details
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Ledger Summary */}
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-amber-600 bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-maroon dark:text-saffron text-sm font-bold flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-amber-500 animate-pulse" /> Ledger Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Customer Receivables</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(totalOutstandingAmountSafe || 0)}</p>
                  </div>
                  <div className={`flex items-center text-xs font-bold ${(outstandingGrowth?.isUp || false) ? 'text-green-655' : 'text-red-500'}`}>
                    {(outstandingGrowth?.isUp || false) ? '↑' : '↓'} {outstandingGrowth?.pct || '0%'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 border-t border-b border-gold/10 py-2.5 my-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Vendor Payables</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(vendorOutstandingSafe || 0)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Wages Due</span>
                    <span className="text-xs font-bold text-indigo-650 dark:text-indigo-400">{formatCurrency(wagesDueSafe || 0)}</span>
                  </div>
                </div>

                <div className="h-14 w-full mt-2 no-print">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ledgerSparklineData || []} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                      <defs>
                        <linearGradient id="colorLedgerSummary" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSparklineColor('outstanding') || '#EF4444'} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={getSparklineColor('outstanding') || '#EF4444'} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={getSparklineColor('outstanding') || '#EF4444'} strokeWidth={1.8} fillOpacity={1} fill="url(#colorLedgerSummary)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <Button 
                onClick={() => navigate({ to: '/ledger', search: { tab: undefined } })}
                variant="outline" 
                className="mt-4 w-full h-8 text-xs font-bold border-gold/30 text-maroon dark:text-saffron hover:bg-gold/10"
              >
                View Details
              </Button>
            </CardContent>
          </Card>

          {/* Card 3: Inventory Summary */}
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-blue-600 bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-maroon dark:text-saffron text-sm font-bold flex items-center gap-2">
                <Package className="h-4.5 w-4.5 text-blue-655 animate-pulse" /> Inventory Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <div>
                    <p className="text-[10px] text-slate-550 uppercase font-bold tracking-wider">Stock Value</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(stockValueSafe || 0)}</p>
                  </div>
                  <div className={`flex items-center text-xs font-bold ${(stockGrowth?.isUp || false) ? 'text-green-655' : 'text-red-500'}`}>
                    {(stockGrowth?.isUp || false) ? '↑' : '↓'} {stockGrowth?.pct || '0%'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-b border-gold/10 py-2.5 my-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Low Stock Count</span>
                    <span className="text-xs font-bold text-red-500">{lowStockRawCountSafe || 0} Items</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Item Count</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{rawMaterialsCountSafe || 0} Items</span>
                  </div>
                </div>

                <div className="h-14 w-full mt-2 no-print">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stockSparklineData || []} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                      <defs>
                        <linearGradient id="colorStockSummary" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSparklineColor('stock') || '#3B82F6'} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={getSparklineColor('stock') || '#3B82F6'} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={getSparklineColor('stock') || '#3B82F6'} strokeWidth={1.8} fillOpacity={1} fill="url(#colorStockSummary)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <Button 
                onClick={() => setSelectedMetric('stock')}
                variant="outline" 
                className="mt-4 w-full h-8 text-xs font-bold border-gold/30 text-maroon dark:text-saffron hover:bg-gold/10"
              >
                View Details
              </Button>
            </CardContent>
          </Card>

          {/* Card 4: Finance Summary */}
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-green-600 bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-maroon dark:text-saffron text-sm font-bold flex items-center gap-2">
                <DollarSign className="h-4.5 w-4.5 text-green-655 animate-pulse" /> Finance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Net Profit</p>
                    <p className="text-3xl font-black text-green-655 dark:text-green-400">{formatCurrency(monthlyProfitSafe || 0)}</p>
                  </div>
                  <div className={`flex items-center text-xs font-bold ${(profitGrowth?.isUp || false) ? 'text-green-655' : 'text-red-500'}`}>
                    {(profitGrowth?.isUp || false) ? '↑' : '↓'} {profitGrowth?.pct || '0%'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-b border-gold/10 py-2.5 my-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Purchases</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(monthlyPurchasesSafe || 0)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">GST Payable</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(totalGstSafe || 0)}</span>
                  </div>
                </div>

                <div className="h-14 w-full mt-2 no-print">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={profitSparklineData || []} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                      <defs>
                        <linearGradient id="colorProfitSummary" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSparklineColor('profit') || '#10B981'} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={getSparklineColor('profit') || '#10B981'} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={getSparklineColor('profit') || '#10B981'} strokeWidth={1.8} fillOpacity={1} fill="url(#colorProfitSummary)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <Button 
                onClick={() => setSelectedMetric('profit')}
                variant="outline" 
                className="mt-4 w-full h-8 text-xs font-bold border-gold/30 text-maroon dark:text-saffron hover:bg-gold/10"
              >
                View Details
              </Button>
            </CardContent>
          </Card>

          {/* Card 5: Production Summary */}
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-purple-600 bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-maroon dark:text-saffron text-sm font-bold flex items-center gap-2">
                <Hammer className="h-4.5 w-4.5 text-purple-650 animate-pulse" /> Production Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Active Job Work</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{(activeJobsSafe || 0).toString()} Jobs</p>
                  </div>
                  <div className={`flex items-center text-xs font-bold ${(jobWorkGrowth?.isUp || false) ? 'text-green-655' : 'text-red-500'}`}>
                    {(jobWorkGrowth?.isUp || false) ? '↑' : '↓'} {jobWorkGrowth?.pct || '0%'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-b border-gold/10 py-2.5 my-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Pending Collections</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{pendingQuantitySafe || 0} Pcs</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Wages Due</span>
                    <span className="text-xs font-bold text-indigo-650 dark:text-indigo-400">{formatCurrency(wagesDueSafe || 0)}</span>
                  </div>
                </div>

                <div className="h-14 w-full mt-2 no-print">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={jobWorkSparklineData || []} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                      <defs>
                        <linearGradient id="colorJobSummary" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSparklineColor('production') || '#800020'} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={getSparklineColor('production') || '#800020'} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={getSparklineColor('production') || '#800020'} strokeWidth={1.8} fillOpacity={1} fill="url(#colorJobSummary)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <Button 
                onClick={() => setSelectedMetric('production')}
                variant="outline" 
                className="mt-4 w-full h-8 text-xs font-bold border-gold/30 text-maroon dark:text-saffron hover:bg-gold/10"
              >
                View Details
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Recent Activity Log Tables */}
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold text-maroon dark:text-saffron flex items-center gap-1.5 border-b pb-2 border-gold/30">
            <Clock className="h-5.5 w-5.5 text-saffron" /> Recent Activity Log Center
          </h2>
          
          <Tabs defaultValue={defaultTab} key={defaultTab} className="w-full">
            <TabsList className="bg-slate-100 dark:bg-slate-900 border p-1 rounded-xl flex gap-1 mb-4 max-w-lg h-auto">
              {canViewInvoices && (
                <TabsTrigger value="invoices" className="w-full font-bold text-xs py-2 rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white">
                  Latest Invoices
                </TabsTrigger>
              )}
              {canViewPurchases && (
                <TabsTrigger value="purchases" className="w-full font-bold text-xs py-2 rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white">
                  Latest Purchases
                </TabsTrigger>
              )}
              {canViewCollections && (
                <TabsTrigger value="collections" className="w-full font-bold text-xs py-2 rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white">
                  Latest Collections
                </TabsTrigger>
              )}
            </TabsList>

            {canViewInvoices && (
              <TabsContent value="invoices" className="m-0 bg-white/95 dark:bg-slate-955/95 border-2 border-gold rounded-xl overflow-hidden shadow-sm">
                {recentInvoices.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">No invoices generated yet.</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                      <TableRow>
                        <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200">Invoice No</TableHead>
                        <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200">Customer</TableHead>
                        <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 text-right">Value (₹)</TableHead>
                        <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentInvoices.map((inv) => {
                        const due = inv.totalAmount - (inv.paidAmount ?? inv.totalAmount);
                        return (
                          <TableRow key={inv.id.toString()} className="hover:bg-slate-50/50">
                            <TableCell className="font-mono font-bold text-xs text-slate-700 dark:text-slate-350">{inv.invoiceNumber}</TableCell>
                            <TableCell className="font-semibold text-slate-700 dark:text-slate-350 max-w-40 truncate">{inv.customerInfo.name}</TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold text-maroon dark:text-saffron">{formatCurrency(inv.totalAmount)}</TableCell>
                            <TableCell className="text-center">
                              {due <= 0 ? (
                                <Badge className="bg-green-100 text-green-800 text-[10px]">Paid</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 text-[10px]">Due</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            )}

            {canViewPurchases && (
              <TabsContent value="purchases" className="m-0 bg-white/95 dark:bg-slate-955/95 border-2 border-gold rounded-xl overflow-hidden shadow-sm">
                {recentPurchases.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">No raw material purchases logged.</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                      <TableRow>
                        <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200">Bill Number</TableHead>
                        <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200">Supplier Vendor</TableHead>
                        <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 text-right">Amount (₹)</TableHead>
                        <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentPurchases.map((p) => {
                        const due = p.totalAmount - p.paidAmount;
                        return (
                          <TableRow key={p.id.toString()} className="hover:bg-slate-50/50">
                            <TableCell className="font-mono font-bold text-xs text-slate-700 dark:text-slate-355">{p.purchaseNumber}</TableCell>
                            <TableCell className="font-semibold text-slate-700 dark:text-slate-355 max-w-40 truncate">{p.vendorName}</TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold text-slate-800 dark:text-slate-350">{formatCurrency(p.totalAmount)}</TableCell>
                            <TableCell className="text-center">
                              {due <= 0 ? (
                                <Badge className="bg-green-100 text-green-800 text-[10px]">Paid</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 text-[10px]">Due</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            )}

            {canViewCollections && (
              <TabsContent value="collections" className="m-0 bg-white/95 dark:bg-slate-955/95 border-2 border-gold rounded-xl overflow-hidden shadow-sm">
                {recentCollections.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">No goods collections recorded yet.</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                      <TableRow>
                        <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200">Collection No</TableHead>
                        <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200">Karigar Artisan</TableHead>
                        <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200">Product SKU</TableHead>
                        <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 text-right">Accepted Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentCollections.map((col) => (
                        <TableRow key={col.id.toString()} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono font-bold text-xs text-slate-700 dark:text-slate-350">COL-{col.id.toString()}</TableCell>
                          <TableCell className="font-semibold text-slate-700 dark:text-slate-355 max-w-40 truncate">{col.karigarName}</TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-355 max-w-40 truncate font-semibold">{col.productName}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-green-600">+{safeQty(col.acceptedQty)} pcs</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>

        <AnalyticsModal 
          isOpen={selectedMetric !== null}
          onClose={() => setSelectedMetric(null)}
          metric={selectedMetric}
          invoices={invoices}
          purchases={purchases}
          expenses={expenses}
          rawMaterials={rawMaterials}
          collections={collections}
          jobWorks={jobWorks}
          stats={stats}
          prodStats={prodStats}
          chartTheme={chartTheme}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-maroon to-saffron p-6 rounded-2xl shadow-md text-white border border-gold/20">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide">Gujarat Art & Crafts ERP</h1>
          <p className="text-white/80 text-xs md:text-sm mt-1">Hello, {user.name}. Welcome back. Operations are running smoothly in real-time.</p>
        </div>
        <div className="text-left md:text-right">
          <Badge className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs py-1 px-3 border border-white/20 capitalize">
            Role: {roleName}
          </Badge>
          <p className="text-white/60 text-[10px] mt-2 font-mono">{new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Security Indicator */}
      <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 dark:bg-green-800/50 p-2 rounded-full">
            <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
              Master Admin Protected 
              <Badge className="bg-green-600 hover:bg-green-700 text-white text-[10px] py-0 px-1.5 h-4 border-none">Maximum Security</Badge>
            </h3>
            <p className="text-[11px] text-green-700 dark:text-green-400/80 mt-0.5">
              User: <span className="font-bold">{user?.name || 'Master Admin'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Real-time System & Purchase Alerts */}
      {(lowStockRawMaterials.length > 0 || pendingPOs.length > 0 || overdueVendorBills.length > 0) && (
        <Card className="border-2 border-red-300 bg-red-50/5 dark:bg-red-950/5 shadow-md overflow-hidden animate-in fade-in duration-200">
          <CardHeader className="bg-red-50/20 dark:bg-red-950/20 border-b border-red-200 dark:border-red-900 py-3.5 px-5 flex flex-row items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-650 dark:text-red-400" />
            <div>
              <CardTitle className="text-red-700 dark:text-red-400 text-sm font-bold">Action Items & System Alerts</CardTitle>
              <CardDescription className="text-red-600/75 dark:text-red-400/70 text-[11px]">Attention required for critical supply chain, purchase, or financial events</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 max-h-[300px] overflow-y-auto">
            {/* Low Stock Alerts */}
            {lowStockRawMaterials.map(m => (
              <div key={m.id} className="flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200 border-b last:border-b-0 border-slate-100 dark:border-slate-800 pb-2.5 last:pb-0">
                <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] font-bold h-5 flex-shrink-0 mt-0.5">Low Stock</Badge>
                <div className="flex-1">
                  <span className="font-bold text-slate-900 dark:text-white">{m.name}</span> shortage: current stock is <strong className="text-amber-700 dark:text-amber-400">{m.currentStock} {m.unit || 'pcs'}</strong> (threshold: {m.minStockAlert} {m.unit || 'pcs'}).
                </div>
              </div>
            ))}

            {/* Pending Purchase Orders */}
            {pendingPOs.map((po: any) => (
              <div key={po.id} className="flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200 border-b last:border-b-0 border-slate-100 dark:border-slate-800 pb-2.5 last:pb-0">
                <Badge className="bg-blue-100 text-blue-800 border-none text-[10px] font-bold h-5 flex-shrink-0 mt-0.5">Pending PO</Badge>
                <div className="flex-1 flex justify-between items-start gap-2">
                  <div>
                    Purchase Order <strong className="font-mono text-slate-950 dark:text-white">{po.poNumber}</strong> for <span className="font-bold">{po.materialName}</span> ({po.orderedQty} {po.unit}) is waiting for approval.
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{po.vendorId}</div>
                </div>
              </div>
            ))}

            {/* Overdue Vendor Payments */}
            {overdueVendorBills.map((p: any) => (
              <div key={p.id.toString()} className="flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200 border-b last:border-b-0 border-slate-100 dark:border-slate-800 pb-2.5 last:pb-0">
                <Badge className="bg-red-100 text-red-800 border-none text-[10px] font-bold h-5 flex-shrink-0 mt-0.5">Overdue Payable</Badge>
                <div className="flex-1 flex justify-between items-start gap-2">
                  <div>
                    Payment of <strong className="text-red-700 dark:text-red-400">{formatCurrency(p.remainingAmount || (p.totalAmount - p.paidAmount))}</strong> to <span className="font-bold text-slate-950 dark:text-white">{p.vendorName}</span> (Bill: {p.purchaseNumber}) was due on <strong>{p.dueDate}</strong>.
                  </div>
                  <div className="text-[10px] text-red-500 font-bold bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-1.5 py-0.5 rounded flex-shrink-0">Overdue</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Theme Switcher Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/95 dark:bg-slate-900/95 border border-gold/20 p-4 rounded-xl shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-maroon dark:text-saffron" />
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Analytics Visual Theme</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Switch presentation styles for graphs & charts</p>
          </div>
        </div>
        <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-gold/10 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'luxury-dark', label: 'Luxury Dark ERP' },
            { id: 'business-light', label: 'Modern Light' },
            { id: 'craft-premium', label: 'Craft Premium' }
          ].map(theme => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 whitespace-nowrap flex-grow sm:flex-grow-0 ${
                chartTheme === theme.id 
                  ? 'bg-maroon text-white dark:bg-saffron dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Summaries - Reorganized into 8 Distinct Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Total Sales */}
        {(isMasterAdmin || (isConnectedAdmin && hasDeptAccess(user, ['Sales', 'Finance']))) && (
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-maroon bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-maroon dark:text-saffron text-xs font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-saffron" /> Total Sales (Monthly)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(monthlySales)}</p>
                  <div className={`flex items-center text-xs font-bold ${salesGrowth.isUp ? 'text-green-655' : 'text-red-500'}`}>
                    {salesGrowth.isUp ? '↑' : '↓'} {salesGrowth.pct}
                  </div>
                </div>
                <div className="h-10 w-full mt-2 no-print">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesSparklineData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                      <defs>
                        <linearGradient id="colorSalesSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSparklineColor('sales')} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={getSparklineColor('sales')} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={getSparklineColor('sales')} strokeWidth={1.8} fillOpacity={1} fill="url(#colorSalesSpark)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 mt-2 border-t pt-1 border-gold/5">
                  <span>Today: {formatCurrency(stats?.todayTotalSales || 0)}</span>
                  <span className="font-mono">{lastUpdatedText}</span>
                </div>
              </div>
              <Button 
                onClick={() => setSelectedMetric('sales')}
                variant="outline" 
                className="mt-3 w-full h-8 text-xs font-bold border-gold/30 text-maroon dark:text-saffron hover:bg-gold/10"
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card 2: Total Purchases */}
        {(isMasterAdmin || (isConnectedAdmin && hasDeptAccess(user, ['Purchase', 'Finance']))) && (
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-saffron bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-maroon dark:text-saffron text-xs font-bold flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-saffron" /> Total Purchases
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(monthlyPurchases)}</p>
                  <div className={`flex items-center text-xs font-bold ${purchasesGrowth.isUp ? 'text-green-655' : 'text-red-500'}`}>
                    {purchasesGrowth.isUp ? '↑' : '↓'} {purchasesGrowth.pct}
                  </div>
                </div>
                <div className="h-10 w-full mt-2 no-print">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={purchasesSparklineData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                      <defs>
                        <linearGradient id="colorPurchasesSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSparklineColor('purchases')} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={getSparklineColor('purchases')} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={getSparklineColor('purchases')} strokeWidth={1.8} fillOpacity={1} fill="url(#colorPurchasesSpark)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 mt-2 border-t pt-1 border-gold/5">
                  <span>All-time: {formatCurrency(stats?.totalPurchases || 0)}</span>
                  <span className="font-mono">{lastUpdatedText}</span>
                </div>
              </div>
              <Button 
                onClick={() => setSelectedMetric('purchases')}
                variant="outline" 
                className="mt-3 w-full h-8 text-xs font-bold border-gold/30 text-maroon dark:text-saffron hover:bg-gold/10"
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card 3: Outstanding Amount */}
        {(isMasterAdmin || (isConnectedAdmin && hasDeptAccess(user, ['Sales', 'Finance']))) && (
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-red-500 bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-maroon dark:text-saffron text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" /> Outstanding Amount
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <p className="text-2xl font-black text-red-650 dark:text-red-400">{formatCurrency(stats?.totalOutstandingAmount || 0)}</p>
                  <div className={`flex items-center text-xs font-bold ${!outstandingGrowth.isUp ? 'text-green-655' : 'text-red-500'}`}>
                    {outstandingGrowth.isUp ? '↑' : '↓'} {outstandingGrowth.pct}
                  </div>
                </div>
                <div className="h-10 w-full mt-2 no-print">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={outstandingSparklineData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                      <defs>
                        <linearGradient id="colorOutstandingSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSparklineColor('outstanding')} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={getSparklineColor('outstanding')} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={getSparklineColor('outstanding')} strokeWidth={1.8} fillOpacity={1} fill="url(#colorOutstandingSpark)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 mt-2 border-t pt-1 border-gold/5">
                  <span>Receivables outstanding</span>
                  <span className="font-mono">{lastUpdatedText}</span>
                </div>
              </div>
              <Button 
                onClick={() => setSelectedMetric('outstanding')}
                variant="outline" 
                className="mt-3 w-full h-8 text-xs font-bold border-gold/30 text-maroon dark:text-saffron hover:bg-gold/10"
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card 4: Net Profit */}
        {(isMasterAdmin || (isConnectedAdmin && hasDeptAccess(user, ['Finance']))) && (
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-green-600 bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-maroon dark:text-saffron text-xs font-bold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" /> Net Profit (Monthly)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <p className="text-2xl font-black text-green-655 dark:text-green-400">{formatCurrency(monthlyProfit || 0)}</p>
                  <div className={`flex items-center text-xs font-bold ${profitGrowth.isUp ? 'text-green-655' : 'text-red-500'}`}>
                    {profitGrowth.isUp ? '↑' : '↓'} {profitGrowth.pct}
                  </div>
                </div>
                <div className="h-10 w-full mt-2 no-print">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={profitSparklineData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                      <defs>
                        <linearGradient id="colorProfitSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSparklineColor('profit')} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={getSparklineColor('profit')} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={getSparklineColor('profit')} strokeWidth={1.8} fillOpacity={1} fill="url(#colorProfitSpark)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 mt-2 border-t pt-1 border-gold/5">
                  <span>Calculated ERP margin</span>
                  <span className="font-mono">{lastUpdatedText}</span>
                </div>
              </div>
              <Button 
                onClick={() => setSelectedMetric('profit')}
                variant="outline" 
                className="mt-3 w-full h-8 text-xs font-bold border-gold/30 text-maroon dark:text-saffron hover:bg-gold/10"
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card 5: GST Payable */}
        {(isMasterAdmin || (isConnectedAdmin && hasDeptAccess(user, ['Finance']))) && (
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-amber-600 bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-maroon dark:text-saffron text-xs font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-600" /> GST Payable
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(stats?.totalGst || 0)}</p>
                  <div className={`flex items-center text-xs font-bold ${gstGrowth.isUp ? 'text-green-655' : 'text-red-500'}`}>
                    {gstGrowth.isUp ? '↑' : '↓'} {gstGrowth.pct}
                  </div>
                </div>
                <div className="h-10 w-full mt-2 no-print">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={gstSparklineData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                      <defs>
                        <linearGradient id="colorGstSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSparklineColor('gst')} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={getSparklineColor('gst')} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={getSparklineColor('gst')} strokeWidth={1.8} fillOpacity={1} fill="url(#colorGstSpark)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 mt-2 border-t pt-1 border-gold/5">
                  <span>Net Tax estimation</span>
                  <span className="font-mono">{lastUpdatedText}</span>
                </div>
              </div>
              <Button 
                onClick={() => setSelectedMetric('gst')}
                variant="outline" 
                className="mt-3 w-full h-8 text-xs font-bold border-gold/30 text-maroon dark:text-saffron hover:bg-gold/10"
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card 6: Total Stock Value */}
        {(isMasterAdmin || (isConnectedAdmin && hasDeptAccess(user, ['Inventory', 'Purchase', 'Production', 'Finance']))) && (
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-blue-600 bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-maroon dark:text-saffron text-xs font-bold flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" /> Total Stock Value
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(stats?.stockValue || 0)}</p>
                  <div className={`flex items-center text-xs font-bold ${stockGrowth.isUp ? 'text-green-655' : 'text-red-500'}`}>
                    {stockGrowth.isUp ? '↑' : '↓'} {stockGrowth.pct}
                  </div>
                </div>
                <div className="h-10 w-full mt-2 no-print">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stockSparklineData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                      <defs>
                        <linearGradient id="colorStockSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSparklineColor('stock')} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={getSparklineColor('stock')} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={getSparklineColor('stock')} strokeWidth={1.8} fillOpacity={1} fill="url(#colorStockSpark)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 mt-2 border-t pt-1 border-gold/5">
                  <span>{lowStockRawCount} Raw materials low</span>
                  <span className="font-mono">{lastUpdatedText}</span>
                </div>
              </div>
              <Button 
                onClick={() => setSelectedMetric('stock')}
                variant="outline" 
                className="mt-3 w-full h-8 text-xs font-bold border-gold/30 text-maroon dark:text-saffron hover:bg-gold/10"
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card 7: Active Job Work */}
        {(isMasterAdmin || (isConnectedAdmin && hasDeptAccess(user, ['Production', 'Finance']))) && (
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-purple-600 bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-maroon dark:text-saffron text-xs font-bold flex items-center gap-2">
                <Hammer className="h-4 w-4 text-purple-600" /> Active Job Work
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{prodStats?.activeJobs?.toString() || '0'} jobs</p>
                  <div className={`flex items-center text-xs font-bold ${jobWorkGrowth.isUp ? 'text-green-655' : 'text-red-500'}`}>
                    {jobWorkGrowth.isUp ? '↑' : '↓'} {jobWorkGrowth.pct}
                  </div>
                </div>
                <div className="h-10 w-full mt-2 no-print">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={jobWorkSparklineData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                      <defs>
                        <linearGradient id="colorJobSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSparklineColor('production')} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={getSparklineColor('production')} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={getSparklineColor('production')} strokeWidth={1.8} fillOpacity={1} fill="url(#colorJobSpark)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 mt-2 border-t pt-1 border-gold/5">
                  <span>{prodStats?.pendingQuantity || 0} Pcs pending collection</span>
                  <span className="font-mono">{lastUpdatedText}</span>
                </div>
              </div>
              <Button 
                onClick={() => setSelectedMetric('production')}
                variant="outline" 
                className="mt-3 w-full h-8 text-xs font-bold border-gold/30 text-maroon dark:text-saffron hover:bg-gold/10"
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card 8: Wages Due */}
        {(isMasterAdmin || (isConnectedAdmin && hasDeptAccess(user, ['Production', 'Finance']))) && (
          <Card className="border-2 border-gold/40 shadow-sm border-l-4 border-l-indigo-650 bg-white/95 dark:bg-slate-955/95 flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-gold/10">
              <CardTitle className="text-maroon dark:text-saffron text-xs font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" /> Wages Due
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <p className="text-2xl font-black text-indigo-650 dark:text-indigo-400">{formatCurrency(prodStats?.wagesDue || 0)}</p>
                  <div className={`flex items-center text-xs font-bold ${!wagesGrowth.isUp ? 'text-green-655' : 'text-red-500'}`}>
                    {wagesGrowth.isUp ? '↑' : '↓'} {wagesGrowth.pct}
                  </div>
                </div>
                <div className="h-10 w-full mt-2 no-print">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={wagesSparklineData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                      <defs>
                        <linearGradient id="colorWagesSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getSparklineColor('wages')} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={getSparklineColor('wages')} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={getSparklineColor('wages')} strokeWidth={1.8} fillOpacity={1} fill="url(#colorWagesSpark)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 mt-2 border-t pt-1 border-gold/5">
                  <span>Artisan pending payables</span>
                  <span className="font-mono">{lastUpdatedText}</span>
                </div>
              </div>
              <Button 
                onClick={() => setSelectedMetric('wages')}
                variant="outline" 
                className="mt-3 w-full h-8 text-xs font-bold border-gold/30 text-maroon dark:text-saffron hover:bg-gold/10"
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Manufacturing ERP Summary Cards */}
      {!isAnyStaff && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Sales Orders KPI */}
          <Card className="border-2 border-saffron/20 shadow-sm border-l-4 border-l-saffron bg-white/95 dark:bg-slate-950 flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900 border-b border-saffron/10">
              <CardTitle className="text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-saffron" /> Sales Orders Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{salesOrders.length} Orders</p>
                <p className="text-xs font-bold text-maroon">Valued at {formatCurrency(salesOrders.reduce((sum, so) => sum + so.grandTotal, 0))}</p>
                <p className="text-[10px] text-slate-450 mt-1">Pending order fulfillment pipeline</p>
              </div>
              <Button
                onClick={() => navigate({ to: '/sales-orders' as any })}
                variant="outline"
                className="mt-4 w-full h-8 text-xs font-bold border-saffron/30 text-maroon hover:bg-saffron/10"
              >
                Go to Sales Orders
              </Button>
            </CardContent>
          </Card>

          {/* Active Production runs */}
          <Card className="border-2 border-saffron/20 shadow-sm border-l-4 border-l-purple-650 bg-white/95 dark:bg-slate-955 flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900 border-b border-saffron/10">
              <CardTitle className="text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-2">
                <Hammer className="h-4 w-4 text-purple-600" /> Production Runs Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {productionRequirements.filter(pr => pr.status === 'In Production' || pr.status === 'Pending').length} Active Runs
                </p>
                <p className="text-xs font-bold text-green-700">
                  {productionRequirements.filter(pr => pr.status === 'Completed').length} Completed manufacturing jobs
                </p>
                <p className="text-[10px] text-slate-450 mt-1">Directly tied to sales order allocations</p>
              </div>
              <Button
                onClick={() => navigate({ to: '/production-planning' as any })}
                variant="outline"
                className="mt-4 w-full h-8 text-xs font-bold border-saffron/30 text-maroon hover:bg-saffron/10"
              >
                Go to Production Planner
              </Button>
            </CardContent>
          </Card>

          {/* Purchase Planning Shortages */}
          <Card className="border-2 border-saffron/20 shadow-sm border-l-4 border-l-red-650 bg-white/95 dark:bg-slate-955 flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900 border-b border-saffron/10">
              <CardTitle className="text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-red-650" /> Material Shortages
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-2xl font-black text-red-650">
                  {purchaseRequirements.filter(pr => pr.status === 'Pending').length} Shortages Pending
                </p>
                <p className="text-xs font-bold text-blue-650">
                  {purchaseRequirements.filter(pr => pr.status === 'Ordered').length} Requirements ordered
                </p>
                <p className="text-[10px] text-slate-450 mt-1">Requires procurement from preferred vendors</p>
              </div>
              <Button
                onClick={() => navigate({ to: '/purchase-planning' as any })}
                variant="outline"
                className="mt-4 w-full h-8 text-xs font-bold border-saffron/30 text-maroon hover:bg-saffron/10"
              >
                Go to Purchase Planner
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity Log Tables */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-maroon dark:text-saffron flex items-center gap-1.5 border-b pb-2 border-gold/30">
          <Clock className="h-5.5 w-5.5 text-saffron" /> Recent Activity Log Center
        </h2>
        
        <Tabs defaultValue={defaultTab} key={defaultTab} className="w-full">
          <TabsList className="bg-slate-100 dark:bg-slate-900 border p-1 rounded-xl flex gap-1 mb-4 max-w-lg h-auto">
            {canViewInvoices && (
              <TabsTrigger value="invoices" className="w-full font-bold text-xs py-2 rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white">
                Latest Invoices
              </TabsTrigger>
            )}
            {canViewPurchases && (
              <TabsTrigger value="purchases" className="w-full font-bold text-xs py-2 rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white">
                Latest Purchases
              </TabsTrigger>
            )}
            {canViewCollections && (
              <TabsTrigger value="collections" className="w-full font-bold text-xs py-2 rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white">
                Latest Collections
              </TabsTrigger>
            )}
          </TabsList>

          {canViewInvoices && (
            <TabsContent value="invoices" className="m-0 bg-white/95 dark:bg-slate-950/95 border-2 border-gold rounded-xl overflow-hidden shadow-sm">
              {recentInvoices.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No invoices generated yet.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200">Invoice No</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200">Customer</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 text-right">Value (₹)</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentInvoices.map((inv) => {
                      const due = inv.totalAmount - (inv.paidAmount ?? inv.totalAmount);
                      return (
                        <TableRow key={inv.id.toString()} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono font-bold text-xs text-slate-700 dark:text-slate-350">{inv.invoiceNumber}</TableCell>
                          <TableCell className="font-semibold text-slate-700 dark:text-slate-350 max-w-40 truncate">{inv.customerInfo.name}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-maroon dark:text-saffron">{formatCurrency(inv.totalAmount)}</TableCell>
                          <TableCell className="text-center">
                            {due <= 0 ? (
                              <Badge className="bg-green-100 text-green-800 text-[10px]">Paid</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 text-[10px]">Due</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          )}

          {canViewPurchases && (
            <TabsContent value="purchases" className="m-0 bg-white/95 dark:bg-slate-955/95 border-2 border-gold rounded-xl overflow-hidden shadow-sm">
              {recentPurchases.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No raw material purchases logged.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200">Bill Number</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200">Supplier Vendor</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 text-right">Amount (₹)</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPurchases.map((p) => {
                      const due = p.totalAmount - p.paidAmount;
                      return (
                        <TableRow key={p.id.toString()} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono font-bold text-xs text-slate-700 dark:text-slate-355">{p.purchaseNumber}</TableCell>
                          <TableCell className="font-semibold text-slate-700 dark:text-slate-355 max-w-40 truncate">{p.vendorName}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-slate-800 dark:text-slate-350">{formatCurrency(p.totalAmount)}</TableCell>
                          <TableCell className="text-center">
                            {due <= 0 ? (
                              <Badge className="bg-green-100 text-green-800 text-[10px]">Paid</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 text-[10px]">Due</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          )}

          {canViewCollections && (
            <TabsContent value="collections" className="m-0 bg-white/95 dark:bg-slate-955/95 border-2 border-gold rounded-xl overflow-hidden shadow-sm">
              {recentCollections.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No goods collections recorded yet.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200">Collection No</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200">Karigar Artisan</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200">Product SKU</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 dark:text-slate-200 text-right">Accepted Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentCollections.map((col) => (
                      <TableRow key={col.id.toString()} className="hover:bg-slate-50/50">
                        <TableCell className="font-mono font-bold text-xs text-slate-700 dark:text-slate-350">COL-{col.id.toString()}</TableCell>
                        <TableCell className="font-semibold text-slate-700 dark:text-slate-355 max-w-40 truncate">{col.karigarName}</TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-355 max-w-40 truncate font-semibold">{col.productName}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-green-600">+{safeQty(col.acceptedQty)} pcs</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

            <AnalyticsModal 
        isOpen={selectedMetric !== null}
        onClose={() => setSelectedMetric(null)}
        metric={selectedMetric}
        invoices={invoices}
        purchases={purchases}
        expenses={expenses}
        rawMaterials={rawMaterials}
        collections={collections}
        jobWorks={jobWorks}
        stats={stats}
        prodStats={prodStats}
        chartTheme={chartTheme}
      />
    </div>
  );
};

export default Dashboard;
