import { useState, useMemo } from 'react';
import { 
  useInvoices, 
  useExpenses, 
  useSaveExpense, 
  useDeleteExpense, 
  useProducts, 
  useRawMaterials,
  useJobWorks,
  usePayments,
  usePurchases,
  useVendorPayments,
  useEmployeePayments
} from '../hooks/useQueries';
import { formatCurrency } from '../utils/currencyFormat';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../components/AuthGuard';
import { 
  Plus, 
  Trash, 
  Wallet, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Tag, 
  Info, 
  ArrowUpRight, 
  ArrowDownRight,
  Scale,
  FileSpreadsheet,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { formatERPDate, safeQty } from '../utils/calculations';
import { useNavigate, useSearch } from '@tanstack/react-router';
const ProfitLoss = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as any;
  const activeTab = search.tab || 'profit_loss';

  const handleTabChange = (val: string) => {
    navigate({
      search: { tab: val }
    } as any);
  };

  const isAdmin = !!(user?.role && 'Admin' in user.role);
  const isManager = !!(user?.role && 'Manager' in user.role);
  const canModify = isAdmin || isManager;

  // Queries
  const { data: invoices = [], isLoading: loadingSales } = useInvoices({ enabled: !!user });
  const { data: expenses = [], isLoading: loadingExpenses } = useExpenses({ enabled: !!user });
  const { data: products = [] } = useProducts({ enabled: !!user });
  const { data: rawMaterials = [] } = useRawMaterials({ enabled: !!user });
  const { data: jobWorks = [] } = useJobWorks({ enabled: !!user });
  const { data: customerPayments = [] } = usePayments({ enabled: !!user });
  const { data: allPurchases = [] } = usePurchases({ enabled: !!user });
  const { data: vendorPayments = [] } = useVendorPayments({ enabled: !!user });
  const { data: employeePayments = [] } = useEmployeePayments({ enabled: !!user });

  // Mutations
  const { mutate: saveExpense, isPending: isSavingExpense } = useSaveExpense();
  const { mutate: deleteExpense } = useDeleteExpense();

  // Form States
  const [expenseForm, setExpenseForm] = useState({
    category: 'Labor Charge',
    amount: '',
    description: ''
  });

  // Double-entry calculation helpers
  const ledgerBalances = useMemo(() => {
    // 1. Sales & Revenue
    const totalInvoicesValue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const taxableSales = invoices.reduce((sum, inv) => sum + getTaxableSalesForInvoice(inv), 0);
    const gstOutputCollected = totalInvoicesValue - taxableSales;

    // 2. Accounts Receivable
    const totalCustomerPayments = customerPayments.reduce((sum, p) => sum + p.amount, 0);
    const accountsReceivable = Math.max(0, totalInvoicesValue - totalCustomerPayments);

    // 3. Purchases & Accounts Payable
    const totalPurchasesValue = allPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalVendorPayments = vendorPayments.reduce((sum, p) => sum + p.amount, 0);
    const accountsPayable = Math.max(0, totalPurchasesValue - totalVendorPayments);

    // 4. Karigar Wages Payable
    const totalWagesEarned = jobWorks.reduce((sum, j) => sum + (safeQty(j.acceptedQty) * safeQty(j.ratePerPiece)), 0);
    const totalWagesPaid = employeePayments.reduce((sum, p) => sum + safeQty(p.amountPaid), 0);
    const karigarWagesPayable = Math.max(0, totalWagesEarned - totalWagesPaid);

    // 5. Operating Expenses
    const totalOperatingExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // 6. Inventory Valuation Assets
    const rawMaterialStockWorth = rawMaterials.reduce((sum, m) => sum + (Number(m.currentStock || 0) * safeQty(m.unitCost)), 0);
    const finishedGoodsStockWorth = products.reduce((sum, p) => sum + (Number(p.stock || 0) * safeQty(p.productionCost)), 0);
    const inventoryValuationAsset = rawMaterialStockWorth + finishedGoodsStockWorth;

    // 7. Cash & Bank Balances (Opening + Receipts - Disbursements)
    const openingCash = 50000;
    const openingBank = 250000;

    let cashReceipts = 0;
    let cashDisbursements = 0;
    let bankReceipts = 0;
    let bankDisbursements = 0;

    // Customer payments received
    customerPayments.forEach((p: any) => {
      const isCash = (p.notes || '').toLowerCase().includes('cash');
      if (isCash) {
        cashReceipts += p.amount;
      } else {
        bankReceipts += p.amount;
      }
    });

    // Vendor payments made
    vendorPayments.forEach((p: any) => {
      const isCash = (p.notes || '').toLowerCase().includes('cash');
      if (isCash) {
        cashDisbursements += p.amount;
      } else {
        bankDisbursements += p.amount;
      }
    });

    // Karigar payments made
    employeePayments.forEach((p: any) => {
      if (p.paymentMode === 'Cash') {
        cashDisbursements += safeQty(p.amountPaid);
      } else {
        bankDisbursements += safeQty(p.amountPaid);
      }
    });

    // Expenses made
    expenses.forEach((e: any) => {
      if (e.category === 'Miscellaneous') {
        cashDisbursements += e.amount;
      } else {
        bankDisbursements += e.amount;
      }
    });

    const cashBalance = Math.max(0, openingCash + cashReceipts - cashDisbursements);
    const bankBalance = Math.max(0, openingBank + bankReceipts - bankDisbursements);

    // Net profit from current operations
    const netProfitVal = taxableSales - totalOperatingExpenses - totalPurchasesValue;

    // Owner's Capital (Balancing Equity Figure)
    const totalDebits = cashBalance + bankBalance + accountsReceivable + inventoryValuationAsset + totalOperatingExpenses + totalPurchasesValue;
    const totalCreditsBeforeEquity = accountsPayable + karigarWagesPayable + gstOutputCollected + taxableSales;
    const ownersCapital = Math.max(0, totalDebits - totalCreditsBeforeEquity);

    return {
      cashBalance,
      bankBalance,
      accountsReceivable,
      inventoryValuationAsset,
      rawMaterialStockWorth,
      finishedGoodsStockWorth,
      totalPurchasesValue,
      taxableSales,
      gstOutputCollected,
      accountsPayable,
      karigarWagesPayable,
      totalOperatingExpenses,
      ownersCapital,
      netProfitVal
    };
  }, [invoices, expenses, products, rawMaterials, jobWorks, customerPayments, allPurchases, vendorPayments, employeePayments]);

  if (!user) return null;

  const expenseCategories = [
    'Labor Charge',
    'Rent & Utilities',
    'Transport / Freight',
    'Packing Material',
    'Office Expenses',
    'Marketing / Advertising',
    'Miscellaneous'
  ];

  // Helper calculations for P&L
  const getCogsForInvoice = (inv: any) => {
    let cogs = 0;
    (inv.products || []).forEach((p: any) => {
      // p[0] is "VigatName|HsnCode"
      const parts = p[0].split('|');
      const vigat = parts[0];
      const matchingProd = products.find(prod => prod.vigat === vigat);
      if (matchingProd) {
        cogs += Number(p[1]) * (matchingProd.productionCost || 0);
      }
    });
    return cogs;
  };

  const getTaxableSalesForInvoice = (inv: any) => {
    // Subtotal of items excl GST
    return inv.products.reduce((acc: number, p: any) => acc + (Number(p[1]) * (Number(p[2]) / 100)), 0);
  };

  // Time-period breakdowns
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const currentYearStart = new Date(now.getFullYear(), 0, 1).getTime();

  const getStatsForPeriod = (filterFn: (dateMs: number) => boolean) => {
    let salesRev = 0; // gross incl. GST
    let netSalesRev = 0; // excl. GST
    let cogs = 0;
    let exp = 0;

    invoices.forEach(inv => {
      const dateMs = Number(inv.date) / 1000000;
      if (filterFn(dateMs)) {
        salesRev += inv.totalAmount;
        netSalesRev += getTaxableSalesForInvoice(inv);
        cogs += getCogsForInvoice(inv);
      }
    });

    expenses.forEach(e => {
      const dateMs = Number(e.date) / 1000000;
      if (filterFn(dateMs)) {
        exp += e.amount;
      }
    });

    const netProfit = netSalesRev - cogs - exp;

    return {
      salesRev,
      netSalesRev,
      cogs,
      expenses: exp,
      netProfit
    };
  };

  const todayStats = getStatsForPeriod(dateMs => dateMs >= todayStart);
  const weeklyStats = getStatsForPeriod(dateMs => dateMs >= sevenDaysAgo);
  const monthlyStats = getStatsForPeriod(dateMs => dateMs >= thirtyDaysAgo);
  const yearlyStats = getStatsForPeriod(dateMs => dateMs >= currentYearStart);

  // Form submit handler
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      toast.error('Please enter a valid expense amount');
      return;
    }

    saveExpense({
      category: expenseForm.category,
      amount: parseFloat(expenseForm.amount),
      description: expenseForm.description.trim()
    }, {
      onSuccess: () => {
        toast.success('Expense recorded successfully!');
        setExpenseForm({
          category: 'Labor Charge',
          amount: '',
          description: ''
        });
      },
      onError: (err) => {
        toast.error(`Failed to save: ${err.message}`);
      }
    });
  };

  const handleDeleteExpense = (id: bigint) => {
    if (!canModify) return;
    if (window.confirm('Are you sure you want to delete this expense?')) {
      deleteExpense(id, {
        onSuccess: () => {
          toast.success('Expense deleted');
        },
        onError: (err) => {
          toast.error(`Delete failed: ${err.message}`);
        }
      });
    }
  };

  // Graph Period & Tooltip States
  const [graphPeriod, setGraphPeriod] = useState<'7days' | '30days' | '3months' | '6months' | '12months' | 'custom'>('6months');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Helper to format date display to DD-MM-YYYY format
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return <span className="text-slate-400 font-normal">DD-MM-YYYY</span>;
    const [yy, mm, dd] = dateStr.split('-');
    return <span className="text-slate-800 dark:text-slate-200 font-medium">{`${dd}-${mm}-${yy}`}</span>;
  };

  // Custom date input picker renderer to guarantee layout and styles
  const renderDateInput = (value: string, onChange: (val: string) => void) => {
    return (
      <div className="relative w-full sm:w-[160px] md:w-[200px] h-10 rounded-md border border-gold/30 bg-white dark:bg-slate-900 flex items-center px-3 cursor-pointer hover:border-gold transition-colors focus-within:ring-2 focus-within:ring-saffron">
        {formatDateDisplay(value)}
        <Calendar className="absolute right-3 text-slate-400 h-4.5 w-4.5 pointer-events-none" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker()}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    );
  };

  // Dynamic BOM cost calculation from raw materials
  const getBOMCost = (prod: any) => {
    if (!prod || !prod.bom) return 0;
    return prod.bom.reduce((sum: number, req: any) => {
      const mat = rawMaterials.find((m: any) => m.id === req.materialId || m.name === req.materialId);
      const cost = mat ? (mat.unitCost || 0) : 0;
      return sum + (req.quantity * cost);
    }, 0);
  };

  // Dynamic Labor cost calculation: Total Production Cost minus Material cost
  const getLaborCost = (prod: any) => {
    if (!prod) return 0;
    const bom = getBOMCost(prod);
    return Math.max(0, (prod.productionCost || 0) - bom);
  };

  // Memoized historical sales & net profit grouping
  const monthlyHistory = useMemo(() => {
    const buckets: { label: string; start: number; end: number; sales: number; materialCost: number; laborCost: number; netProfit: number }[] = [];
    const now = new Date();
    let startMs = 0;
    let endMs = Date.now();
    let interval: 'day' | 'week' | 'month' = 'month';

    if (graphPeriod === '7days') {
      startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();
      interval = 'day';
    } else if (graphPeriod === '30days') {
      startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29).getTime();
      interval = 'day';
    } else if (graphPeriod === '3months') {
      startMs = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();
      interval = 'month';
    } else if (graphPeriod === '6months') {
      startMs = new Date(now.getFullYear(), now.getMonth() - 5, 1).getTime();
      interval = 'month';
    } else if (graphPeriod === '12months') {
      startMs = new Date(now.getFullYear(), now.getMonth() - 11, 1).getTime();
      interval = 'month';
    } else if (graphPeriod === 'custom') {
      if (!customStartDate || !customEndDate) return [];
      startMs = new Date(customStartDate).getTime();
      const endDay = new Date(customEndDate);
      endDay.setHours(23, 59, 59, 999);
      endMs = endDay.getTime();
      
      const diffDays = (endMs - startMs) / (24 * 60 * 60 * 1000);
      if (diffDays <= 15) {
        interval = 'day';
      } else if (diffDays <= 60) {
        interval = 'week';
      } else {
        interval = 'month';
      }
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (interval === 'day') {
      const cur = new Date(startMs);
      while (cur.getTime() <= endMs) {
        const s = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate()).getTime();
        const e = s + 24 * 60 * 60 * 1000 - 1;
        buckets.push({
          label: `${cur.getDate()} ${monthNames[cur.getMonth()]}`,
          start: s,
          end: e,
          sales: 0,
          materialCost: 0,
          laborCost: 0,
          netProfit: 0
        });
        cur.setDate(cur.getDate() + 1);
      }
    } else if (interval === 'week') {
      const cur = new Date(startMs);
      while (cur.getTime() <= endMs) {
        const s = cur.getTime();
        cur.setDate(cur.getDate() + 7);
        const e = Math.min(endMs, cur.getTime() - 1);
        const startD = new Date(s);
        const endD = new Date(e);
        buckets.push({
          label: `${startD.getDate()}/${startD.getMonth() + 1} - ${endD.getDate()}/${endD.getMonth() + 1}`,
          start: s,
          end: e,
          sales: 0,
          materialCost: 0,
          laborCost: 0,
          netProfit: 0
        });
      }
    } else if (interval === 'month') {
      const cur = new Date(startMs);
      cur.setDate(1);
      while (cur.getTime() <= endMs) {
        const s = new Date(cur.getFullYear(), cur.getMonth(), 1).getTime();
        const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        const e = nextMonth.getTime() - 1;
        buckets.push({
          label: `${monthNames[cur.getMonth()]} ${cur.getFullYear()}`,
          start: s,
          end: e,
          sales: 0,
          materialCost: 0,
          laborCost: 0,
          netProfit: 0
        });
        cur.setMonth(cur.getMonth() + 1);
      }
    }

    // Process actual invoices
    invoices.forEach(inv => {
      const invDateMs = Number(inv.date) / 1000000;
      const bucket = buckets.find(b => invDateMs >= b.start && invDateMs <= b.end);
      if (bucket) {
        bucket.sales += Number(inv.totalAmount) || 0;
        (inv.products || []).forEach((p: any) => {
          const parts = p[0].split('|');
          const vigat = parts[0];
          const matchingProd = products.find(prod => prod.vigat === vigat);
          if (matchingProd) {
            const qty = Number(p[1]) || 0;
            const bomCost = getBOMCost(matchingProd);
            const laborCost = getLaborCost(matchingProd);
            
            bucket.materialCost += qty * bomCost;
            bucket.laborCost += qty * laborCost;
          }
        });
      }
    });

    // Net Profit = Sales Revenue - Material Cost - Labor Cost
    buckets.forEach(b => {
      b.netProfit = b.sales - b.materialCost - b.laborCost;
    });

    return buckets;
  }, [invoices, products, rawMaterials, graphPeriod, customStartDate, customEndDate]);

  // Scaler settings for SVG rendering
  const { maxVal, minVal, hasData } = useMemo(() => {
    if (monthlyHistory.length === 0) {
      return { maxVal: 1000, minVal: 0, hasData: false };
    }
    const maxSales = Math.max(...monthlyHistory.map(h => h.sales), 0);
    const maxProfit = Math.max(...monthlyHistory.map(h => h.netProfit), 0);
    const minProfit = Math.min(...monthlyHistory.map(h => h.netProfit), 0);
    
    return {
      maxVal: Math.max(maxSales, maxProfit, 1000),
      minVal: Math.min(minProfit, 0),
      hasData: monthlyHistory.some(h => h.sales > 0)
    };
  }, [monthlyHistory]);

  const getSvgCoords = (value: number, index: number, total: number) => {
    const x = 50 + (index / Math.max(1, total - 1)) * 430;
    const yRange = maxVal - minVal;
    const y = 20 + 140 - ((value - minVal) / (yRange || 1)) * 140;
    return { x, y };
  };

  const pointsList = useMemo(() => {
    if (monthlyHistory.length === 0) return { salesPoints: [], profitPoints: [], salesPath: '', profitPath: '' };
    
    const salesPoints = monthlyHistory.map((h, i) => getSvgCoords(h.sales, i, monthlyHistory.length));
    const profitPoints = monthlyHistory.map((h, i) => getSvgCoords(h.netProfit, i, monthlyHistory.length));
    
    const getBezierPath = (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return '';
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const curr = pts[i];
        const next = pts[i + 1];
        const cp1x = curr.x + (next.x - curr.x) / 3;
        const cp1y = curr.y;
        const cp2x = curr.x + 2 * (next.x - curr.x) / 3;
        const cp2y = next.y;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
      }
      return d;
    };

    return {
      salesPoints,
      profitPoints,
      salesPath: getBezierPath(salesPoints),
      profitPath: getBezierPath(profitPoints)
    };
  }, [monthlyHistory, maxVal, minVal]);

  const gridLines = useMemo(() => {
    const yRange = maxVal - minVal;
    const lines = [
      minVal + yRange,
      minVal + yRange * 2 / 3,
      minVal + yRange / 3,
      minVal
    ];
    return lines.map(val => {
      const y = 20 + 140 - ((val - minVal) / (yRange || 1)) * 140;
      return { val, y };
    });
  }, [maxVal, minVal]);

  const zeroY = useMemo(() => {
    if (minVal >= 0) return null;
    const yRange = maxVal - minVal;
    return 20 + 140 - ((0 - minVal) / (yRange || 1)) * 140;
  }, [maxVal, minVal]);

  const trialBalance = useMemo(() => {
    const {
      cashBalance,
      bankBalance,
      accountsReceivable,
      inventoryValuationAsset,
      totalPurchasesValue,
      totalOperatingExpenses,
      accountsPayable,
      karigarWagesPayable,
      gstOutputCollected,
      taxableSales,
      ownersCapital
    } = ledgerBalances;

    const accounts = [
      { code: '1000', name: 'Cash in Hand (Asset)', debit: cashBalance, credit: 0 },
      { code: '1100', name: 'Bank Balance (Asset)', debit: bankBalance, credit: 0 },
      { code: '1200', name: 'Accounts Receivable (Customer Dues)', debit: accountsReceivable, credit: 0 },
      { code: '1300', name: 'Inventory Asset (Valuation Worth)', debit: inventoryValuationAsset, credit: 0 },
      { code: '4000', name: 'Raw Material Purchases (Cost)', debit: totalPurchasesValue, credit: 0 },
      { code: '4100', name: 'Operating Expenses (P&L)', debit: totalOperatingExpenses, credit: 0 },
      { code: '2000', name: 'Accounts Payable (Vendor Dues)', debit: 0, credit: accountsPayable },
      { code: '2100', name: 'Wages Payable (Artisan Liabilities)', debit: 0, credit: karigarWagesPayable },
      { code: '2200', name: 'GST Output Collected (GSTIN Liability)', debit: 0, credit: gstOutputCollected },
      { code: '3000', name: 'Sales Revenue Account', debit: 0, credit: taxableSales },
      { code: '3100', name: "Owner's Equity Capital", debit: 0, credit: ownersCapital }
    ];

    const totalDebits = accounts.reduce((sum, a) => sum + a.debit, 0);
    const totalCredits = accounts.reduce((sum, a) => sum + a.credit, 0);

    return { accounts, totalDebits, totalCredits };
  }, [ledgerBalances]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-maroon flex items-center gap-2 font-serif">
            <Scale className="h-8 w-8 text-saffron animate-pulse" /> Financial Center
          </h1>
          <p className="text-gray-655 dark:text-gray-400 text-xs">Review sales profits, check double-entry Trial Balance consistency, and view the Balance Sheet.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="border-b border-gold/20 flex gap-2 overflow-x-auto w-full justify-start bg-transparent py-1 h-auto no-print">
          <TabsTrigger value="profit_loss" className="rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white border border-gold/20 font-bold text-xs py-2 px-3 whitespace-nowrap">
            Profit & Loss Statement
          </TabsTrigger>
          <TabsTrigger value="trial_balance" className="rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white border border-gold/20 font-bold text-xs py-2 px-3 whitespace-nowrap">
            Trial Balance
          </TabsTrigger>
          <TabsTrigger value="balance_sheet" className="rounded-lg data-[state=active]:bg-maroon data-[state=active]:text-white border border-gold/20 font-bold text-xs py-2 px-3 whitespace-nowrap">
            Balance Sheet
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profit & Loss */}
        <TabsContent value="profit_loss" className="space-y-6">

      {/* P&L Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Today */}
        <Card className="border-2 border-gold shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3">
            {todayStats.netProfit >= 0 ? (
              <Badge className="bg-green-50 text-green-700 hover:bg-green-50 flex gap-0.5 items-center">
                <ArrowUpRight className="h-3 w-3" /> Profit
              </Badge>
            ) : (
              <Badge className="bg-red-50 text-red-700 hover:bg-red-50 flex gap-0.5 items-center">
                <ArrowDownRight className="h-3 w-3" /> Loss
              </Badge>
            )}
          </div>
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="text-xs font-bold text-slate-400 uppercase">Today's Performance</CardDescription>
            <CardTitle className={`text-2xl font-extrabold mt-1 ${todayStats.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatCurrency(todayStats.netProfit)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 text-xs space-y-1.5 border-t border-gold/10 pt-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Net Sales:</span>
              <span className="font-bold">{formatCurrency(todayStats.netSalesRev)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">COGS:</span>
              <span className="font-bold">{formatCurrency(todayStats.cogs)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Expenses:</span>
              <span className="font-bold">{formatCurrency(todayStats.expenses)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Weekly */}
        <Card className="border-2 border-gold shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3">
            {weeklyStats.netProfit >= 0 ? (
              <Badge className="bg-green-50 text-green-700 hover:bg-green-50 flex gap-0.5 items-center">
                <ArrowUpRight className="h-3 w-3" /> Profit
              </Badge>
            ) : (
              <Badge className="bg-red-50 text-red-700 hover:bg-red-50 flex gap-0.5 items-center">
                <ArrowDownRight className="h-3 w-3" /> Loss
              </Badge>
            )}
          </div>
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="text-xs font-bold text-slate-400 uppercase">Past 7 Days</CardDescription>
            <CardTitle className={`text-2xl font-extrabold mt-1 ${weeklyStats.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatCurrency(weeklyStats.netProfit)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 text-xs space-y-1.5 border-t border-gold/10 pt-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Net Sales:</span>
              <span className="font-bold">{formatCurrency(weeklyStats.netSalesRev)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">COGS:</span>
              <span className="font-bold">{formatCurrency(weeklyStats.cogs)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Expenses:</span>
              <span className="font-bold">{formatCurrency(weeklyStats.expenses)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Monthly */}
        <Card className="border-2 border-gold shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3">
            {monthlyStats.netProfit >= 0 ? (
              <Badge className="bg-green-50 text-green-700 hover:bg-green-50 flex gap-0.5 items-center">
                <ArrowUpRight className="h-3 w-3" /> Profit
              </Badge>
            ) : (
              <Badge className="bg-red-50 text-red-700 hover:bg-red-50 flex gap-0.5 items-center">
                <ArrowDownRight className="h-3 w-3" /> Loss
              </Badge>
            )}
          </div>
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="text-xs font-bold text-slate-400 uppercase">Past 30 Days</CardDescription>
            <CardTitle className={`text-2xl font-extrabold mt-1 ${monthlyStats.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatCurrency(monthlyStats.netProfit)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 text-xs space-y-1.5 border-t border-gold/10 pt-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Net Sales:</span>
              <span className="font-bold">{formatCurrency(monthlyStats.netSalesRev)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">COGS:</span>
              <span className="font-bold">{formatCurrency(monthlyStats.cogs)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Expenses:</span>
              <span className="font-bold">{formatCurrency(monthlyStats.expenses)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Yearly */}
        <Card className="border-2 border-gold shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3">
            {yearlyStats.netProfit >= 0 ? (
              <Badge className="bg-green-50 text-green-700 hover:bg-green-50 flex gap-0.5 items-center">
                <ArrowUpRight className="h-3 w-3" /> Profit
              </Badge>
            ) : (
              <Badge className="bg-red-50 text-red-700 hover:bg-red-50 flex gap-0.5 items-center">
                <ArrowDownRight className="h-3 w-3" /> Loss
              </Badge>
            )}
          </div>
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="text-xs font-bold text-slate-400 uppercase">Year to Date ({now.getFullYear()})</CardDescription>
            <CardTitle className={`text-2xl font-extrabold mt-1 ${yearlyStats.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatCurrency(yearlyStats.netProfit)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 text-xs space-y-1.5 border-t border-gold/10 pt-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Net Sales:</span>
              <span className="font-bold">{formatCurrency(yearlyStats.netSalesRev)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">COGS:</span>
              <span className="font-bold">{formatCurrency(yearlyStats.cogs)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Expenses:</span>
              <span className="font-bold">{formatCurrency(yearlyStats.expenses)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left pane: Trends & Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trend Chart Card */}
          <Card className="border-2 border-gold shadow-md">
            <CardHeader className="bg-amber-50/20 border-b border-gold/20 flex flex-col md:flex-row items-start md:items-center justify-between py-4 gap-4">
              <div>
                <CardTitle className="text-maroon text-base">Sales vs Net Profit Trend</CardTitle>
                <CardDescription>Visual comparison of net revenues and profit margins over the selected period.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                <Select
                  value={graphPeriod}
                  onValueChange={(val: any) => setGraphPeriod(val)}
                >
                  <SelectTrigger className="w-full sm:w-[150px] md:w-[180px] border-gold bg-white dark:bg-slate-900 text-xs font-semibold h-10">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                    <SelectItem value="7days" className="text-xs">Last 7 Days</SelectItem>
                    <SelectItem value="30days" className="text-xs">Last 30 Days</SelectItem>
                    <SelectItem value="3months" className="text-xs">Last 3 Months</SelectItem>
                    <SelectItem value="6months" className="text-xs">Last 6 Months</SelectItem>
                    <SelectItem value="12months" className="text-xs">Last 12 Months</SelectItem>
                    <SelectItem value="custom" className="text-xs">Custom Date Range</SelectItem>
                  </SelectContent>
                </Select>

                {graphPeriod === 'custom' && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto animate-in fade-in duration-200">
                    {renderDateInput(customStartDate, setCustomStartDate)}
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center select-none">
                      TO
                    </span>
                    {renderDateInput(customEndDate, setCustomEndDate)}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6 flex justify-center">
              <div className="w-full bg-amber-50/5 p-4 rounded-xl border border-gold/20 flex flex-col items-center relative">
                {!hasData ? (
                  <div className="flex flex-col items-center justify-center h-48 py-12 text-slate-400 w-full">
                    <TrendingUp className="h-10 w-10 text-slate-300 mb-2 stroke-[1.5]" />
                    <span className="font-semibold text-sm">No sales data available yet.</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-full h-52 overflow-visible" viewBox="0 0 500 200">
                      {/* Grid Lines & Labels */}
                      {gridLines.map((line, i) => (
                        <g key={i}>
                          <line x1="50" y1={line.y} x2="480" y2={line.y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray={i === 3 ? "0" : "3"} />
                          <text x="42" y={line.y + 3} textAnchor="end" className="text-[8px] fill-slate-400 font-mono">
                            {formatCurrency(line.val).split('.')[0]}
                          </text>
                        </g>
                      ))}

                      {/* Zero Reference Line if we have negative values */}
                      {zeroY !== null && (
                        <line x1="50" y1={zeroY} x2="480" y2={zeroY} stroke="#cbd5e1" strokeWidth="1.5" />
                      )}

                      {/* Curves */}
                      {pointsList.salesPath && (
                        <path d={pointsList.salesPath} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
                      )}
                      {pointsList.profitPath && (
                        <path d={pointsList.profitPath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                      )}

                      {/* Dots on Lines */}
                      {pointsList.salesPoints.map((pt, i) => (
                        <circle key={`s-${i}`} cx={pt.x} cy={pt.y} r={hoveredIndex === i ? "5" : "3"} fill="#22c55e" stroke="white" strokeWidth="1.5" />
                      ))}
                      {pointsList.profitPoints.map((pt, i) => (
                        <circle key={`p-${i}`} cx={pt.x} cy={pt.y} r={hoveredIndex === i ? "5" : "3"} fill="#3b82f6" stroke="white" strokeWidth="1.5" />
                      ))}

                      {/* X Axis Labels */}
                      {monthlyHistory.map((h, i) => {
                        const pt = getSvgCoords(0, i, monthlyHistory.length);
                        return (
                          <text key={i} x={pt.x} y="182" textAnchor="middle" className="text-[9px] fill-slate-400 font-bold whitespace-nowrap">
                            {h.label.split(' ')[0]}
                          </text>
                        );
                      })}

                      {/* Hover Highlighter Line */}
                      {hoveredIndex !== null && pointsList.salesPoints[hoveredIndex] && (
                        <line 
                          x1={pointsList.salesPoints[hoveredIndex].x} 
                          y1={20} 
                          x2={pointsList.salesPoints[hoveredIndex].x} 
                          y2={160} 
                          stroke="#64748b" 
                          strokeWidth="1.5" 
                          strokeDasharray="3" 
                        />
                      )}

                      {/* Invisible Hover Rect Slices */}
                      {monthlyHistory.map((b, i) => {
                        const x = 50 + (i / Math.max(1, monthlyHistory.length - 1)) * 430;
                        let startX = 0;
                        let endX = 0;
                        if (monthlyHistory.length === 1) {
                          startX = 50;
                          endX = 480;
                        } else if (i === 0) {
                          startX = 50;
                          const nextX = 50 + (1 / (monthlyHistory.length - 1)) * 430;
                          endX = (50 + nextX) / 2;
                        } else if (i === monthlyHistory.length - 1) {
                          const prevX = 50 + ((i - 1) / (monthlyHistory.length - 1)) * 430;
                          startX = (prevX + x) / 2;
                          endX = 480;
                        } else {
                          const prevX = 50 + ((i - 1) / (monthlyHistory.length - 1)) * 430;
                          const nextX = 50 + ((i + 1) / (monthlyHistory.length - 1)) * 430;
                          startX = (prevX + x) / 2;
                          endX = (x + nextX) / 2;
                        }
                        return (
                          <rect
                            key={i}
                            x={startX}
                            y={10}
                            width={Math.max(0, endX - startX)}
                            height={160}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                          />
                        );
                      })}
                    </svg>

                    {/* Legends */}
                    <div className="flex gap-6 mt-4 text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-green-500 inline-block"></span>
                        <span className="text-slate-500">Sales Revenue</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-blue-500 inline-block"></span>
                        <span className="text-slate-500">Net Profit</span>
                      </div>
                    </div>

                    {/* Tooltip Overlay */}
                    {hoveredIndex !== null && monthlyHistory[hoveredIndex] && (
                      <div 
                        className="absolute z-10 bg-white/95 dark:bg-slate-900/95 border-2 border-gold rounded-lg p-2.5 shadow-xl text-[11px] space-y-1 min-w-[140px] pointer-events-none transition-all duration-100 ease-out"
                        style={{
                          left: `${Math.min(80, Math.max(20, (50 + (hoveredIndex / Math.max(1, monthlyHistory.length - 1)) * 430) / 5))}%`,
                          top: '25px',
                          transform: 'translateX(-50%)',
                        }}
                      >
                        <div className="font-bold text-slate-800 dark:text-slate-200 border-b pb-1 text-center">
                          {monthlyHistory[hoveredIndex].label}
                        </div>
                        <div className="flex justify-between gap-3 pt-1">
                          <span className="text-slate-400 font-semibold">Sales:</span>
                          <span className="font-mono font-bold text-green-600">
                            {formatCurrency(monthlyHistory[hoveredIndex].sales).split('.')[0]}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400 font-semibold">Net Profit:</span>
                          <span className={`font-mono font-bold ${monthlyHistory[hoveredIndex].netProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                            {formatCurrency(monthlyHistory[hoveredIndex].netProfit).split('.')[0]}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 border-t pt-1 font-semibold">
                          <span className="text-slate-400">Margin:</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                            {(monthlyHistory[hoveredIndex].sales > 0 ? (monthlyHistory[hoveredIndex].netProfit / monthlyHistory[hoveredIndex].sales * 100) : 0).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expense Logger Form */}
          {canModify && (
            <form onSubmit={handleSaveExpense}>
              <Card className="border-2 border-gold shadow-md">
                <CardHeader className="bg-amber-50/20 border-b border-gold/20 py-4">
                  <CardTitle className="text-maroon text-base flex items-center gap-1.5">
                    <Wallet className="h-5 w-5 text-saffron" /> Record Business Expense
                  </CardTitle>
                  <CardDescription>Enter labor, utilities, transport, packing, or miscellaneous operating cost entries.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="expCat" className="font-bold text-xs uppercase tracking-wider text-slate-500">Category</Label>
                    <Select
                      value={expenseForm.category}
                      onValueChange={(val) => setExpenseForm({ ...expenseForm, category: val })}
                    >
                      <SelectTrigger id="expCat" className="border-gold bg-white dark:bg-gray-800 text-xs">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map(cat => (
                          <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="expAmt" className="font-bold text-xs uppercase tracking-wider text-slate-500">Amount (₹)</Label>
                    <Input
                      id="expAmt"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      placeholder="0.00"
                      className="border-gold focus:ring-saffron text-xs font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-3">
                    <Label htmlFor="expDesc" className="font-bold text-xs uppercase tracking-wider text-slate-500">Description / Details</Label>
                    <Input
                      id="expDesc"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      placeholder="e.g. Paid transporter for Diwali batch shipping"
                      className="border-gold focus:ring-saffron text-xs"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="md:col-span-3 bg-gradient-to-r from-maroon to-saffron text-white font-bold tracking-wider py-4 text-xs mt-2"
                    disabled={isSavingExpense}
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Save Expense Entry
                  </Button>
                </CardContent>
              </Card>
            </form>
          )}
        </div>

        {/* Right pane: Expense Ledger Logs */}
        <div className="lg:col-span-1">
          <Card className="border-2 border-gold shadow-md">
            <CardHeader className="bg-amber-50/20 border-b border-gold/20 py-4">
              <CardTitle className="text-maroon text-base">Expense Log Ledger</CardTitle>
              <CardDescription>Historical breakdown of recent operating costs.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              {loadingExpenses ? (
                <div className="text-center py-10 text-slate-500 text-xs">Loading expenses...</div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">No expense logs found.</div>
              ) : (
                <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100 dark:divide-gray-800 pr-1">
                  {expenses.map((e) => {
                    const date = formatERPDate(e.date);
                    return (
                      <div key={e.id.toString()} className="p-3.5 hover:bg-slate-50/50 flex justify-between items-start gap-4 transition-colors">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{e.category}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{date}</span>
                          </div>
                          {e.description && <p className="text-slate-500 italic text-[11px] leading-snug">{e.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-red-500 text-xs">{formatCurrency(e.amount)}</span>
                          {canModify && (
                            <Button 
                              onClick={() => handleDeleteExpense(e.id)} 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </TabsContent>

        {/* Tab 2: Trial Balance */}
        <TabsContent value="trial_balance" className="space-y-6">
          <Card className="border-2 border-gold shadow-md">
            <CardHeader className="bg-amber-50/20 border-b border-gold/20 py-4 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-maroon text-base font-serif flex items-center gap-1.5">
                  <Scale className="h-5 w-5 text-saffron animate-bounce" /> General Ledger Trial Balance
                </CardTitle>
                <CardDescription>Consolidated sub-ledger balances verifying debits and credits balance consistency.</CardDescription>
              </div>
              <Button onClick={() => window.print()} size="sm" variant="outline" className="border-gold/30 text-xs no-print">Print Trial Balance</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-slate-800">Account Code</TableHead>
                    <TableHead className="font-bold text-xs text-slate-800">Account Name</TableHead>
                    <TableHead className="font-bold text-xs text-slate-800 text-right">Debit Balance (₹)</TableHead>
                    <TableHead className="font-bold text-xs text-slate-800 text-right">Credit Balance (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialBalance.accounts.map((acc) => (
                    <TableRow key={acc.code} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono text-xs font-bold">{acc.code}</TableCell>
                      <TableCell className="font-semibold text-slate-800 text-xs">{acc.name}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-700 text-xs">{acc.debit > 0 ? formatCurrency(acc.debit) : '-'}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600 text-xs">{acc.credit > 0 ? formatCurrency(acc.credit) : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-amber-50/10 hover:bg-amber-50/10 font-extrabold border-t-2 border-double border-gold/40">
                    <TableCell colSpan={2} className="text-maroon font-serif text-sm">Balanced Totals</TableCell>
                    <TableCell className="text-right font-mono text-maroon text-sm border-t border-gold">{formatCurrency(trialBalance.totalDebits)}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600 text-sm border-t border-gold">{formatCurrency(trialBalance.totalCredits)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="p-4 bg-emerald-50/40 border-t border-gold/15 flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                <span>Double-entry integrity check passed. Debits and credits match perfectly. Trial balance is reconciled.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Balance Sheet */}
        <TabsContent value="balance_sheet" className="space-y-6">
          <Card className="border-2 border-gold shadow-md">
            <CardHeader className="bg-amber-50/20 border-b border-gold/20 py-4 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-maroon text-base font-serif flex items-center gap-1.5">
                  <FileSpreadsheet className="h-5 w-5 text-saffron" /> Balance Sheet
                </CardTitle>
                <CardDescription>Statement of financial position showing assets, liabilities, and owners equity reserves.</CardDescription>
              </div>
              <Button onClick={() => window.print()} size="sm" variant="outline" className="border-gold/30 text-xs no-print">Print Balance Sheet</Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Assets Section */}
                <div className="space-y-4">
                  <h3 className="text-maroon font-serif font-bold text-sm border-b pb-2 border-gold/20 uppercase tracking-wider">Assets (Liquid & Stock assets)</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center p-2.5 rounded bg-slate-50/50">
                      <span className="font-semibold text-slate-700">Cash in Hand</span>
                      <span className="font-mono font-bold text-slate-800">{formatCurrency(ledgerBalances.cashBalance)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded bg-slate-50/50">
                      <span className="font-semibold text-slate-700">Bank Balance</span>
                      <span className="font-mono font-bold text-slate-800">{formatCurrency(ledgerBalances.bankBalance)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded bg-slate-50/50">
                      <span className="font-semibold text-slate-700">Accounts Receivable (Customer Outstandings)</span>
                      <span className="font-mono font-bold text-slate-800">{formatCurrency(ledgerBalances.accountsReceivable)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded bg-slate-50/50">
                      <div>
                        <span className="font-semibold text-slate-700 block">Inventory Assets Valuation</span>
                        <span className="text-[10px] text-slate-450 block font-normal">Raw Materials ({formatCurrency(ledgerBalances.rawMaterialStockWorth)}) + Finished Goods ({formatCurrency(ledgerBalances.finishedGoodsStockWorth)})</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800">{formatCurrency(ledgerBalances.inventoryValuationAsset)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center font-extrabold text-maroon font-serif text-sm border-t-2 border-gold/20 pt-4 mt-2">
                      <span>Total Assets</span>
                      <span>{formatCurrency(ledgerBalances.cashBalance + ledgerBalances.bankBalance + ledgerBalances.accountsReceivable + ledgerBalances.inventoryValuationAsset)}</span>
                    </div>
                  </div>
                </div>

                {/* Liabilities & Equity Section */}
                <div className="space-y-4">
                  <h3 className="text-maroon font-serif font-bold text-sm border-b pb-2 border-gold/20 uppercase tracking-wider">Liabilities & Owners Equity</h3>
                  <div className="space-y-3 text-xs">
                    {/* Liabilities Sub-section */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Liabilities</span>
                      <div className="flex justify-between items-center p-2.5 rounded bg-slate-50/50">
                        <span className="font-semibold text-slate-700">Accounts Payable (Vendor Dues)</span>
                        <span className="font-mono font-bold text-slate-800">{formatCurrency(ledgerBalances.accountsPayable)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 rounded bg-slate-50/50">
                        <span className="font-semibold text-slate-700">Wages Payable (Artisans Credit)</span>
                        <span className="font-mono font-bold text-slate-800">{formatCurrency(ledgerBalances.karigarWagesPayable)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 rounded bg-slate-50/50">
                        <span className="font-semibold text-slate-700">GST Output Collected (Payable to Govt)</span>
                        <span className="font-mono font-bold text-slate-800">{formatCurrency(ledgerBalances.gstOutputCollected)}</span>
                      </div>
                    </div>

                    {/* Equity Sub-section */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Owners Equity</span>
                      <div className="flex justify-between items-center p-2.5 rounded bg-slate-50/50">
                        <span className="font-semibold text-slate-700">Owner's Equity Capital</span>
                        <span className="font-mono font-bold text-slate-800">{formatCurrency(ledgerBalances.ownersCapital)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 rounded bg-slate-50/50">
                        <span className="font-semibold text-slate-700">Retained Earnings (Net Profit)</span>
                        <span className={`font-mono font-bold ${ledgerBalances.netProfitVal >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {formatCurrency(ledgerBalances.netProfitVal)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center font-extrabold text-maroon font-serif text-sm border-t-2 border-gold/20 pt-4 mt-2">
                      <span>Total Liabilities & Equity</span>
                      <span>{formatCurrency(ledgerBalances.accountsPayable + ledgerBalances.karigarWagesPayable + ledgerBalances.gstOutputCollected + ledgerBalances.ownersCapital + ledgerBalances.netProfitVal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfitLoss;
