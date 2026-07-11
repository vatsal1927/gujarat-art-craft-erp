import { useState, useMemo } from 'react';
import { usePayments, useVendorPayments, useEmployeePayments, useExpenses } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../components/AuthGuard';
import { formatCurrency } from '../utils/currencyFormat';
import { formatERPDate } from '../utils/calculations';
import { Wallet, ArrowDownRight, ArrowUpRight, Search, FileText, Landmark } from 'lucide-react';
import Unauthorized from './Unauthorized';
import { hasDeptAccess } from '../utils/auth';

interface CashBankBookProps {
  type: 'cash' | 'bank';
}

const CashBankBook: React.FC<CashBankBookProps> = ({ type }) => {
  const { user } = useAuth();

  const isStaff = !!(user?.role && 'Staff' in user.role);
  const canViewFinance = user && (
    'Admin' in user.role || 
    'Manager' in user.role || 
    hasDeptAccess(user, ['Finance'], 'canView')
  );

  // Queries
  const { data: customerPayments = [], isLoading: loadingCust } = usePayments({ enabled: !!canViewFinance && !isStaff });
  const { data: vendorPayments = [], isLoading: loadingVend } = useVendorPayments({ enabled: !!canViewFinance && !isStaff });
  const { data: employeePayments = [], isLoading: loadingEmp } = useEmployeePayments({ enabled: !!canViewFinance && !isStaff });
  const { data: expenses = [], isLoading: loadingExp } = useExpenses({ enabled: !!canViewFinance && !isStaff });

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Helper to determine if a note indicates Cash or Bank
  const isTargetTransaction = (notes: string, paymentMode?: string): boolean => {
    const text = (notes + ' ' + (paymentMode || '')).toLowerCase();
    
    if (type === 'cash') {
      // If payment mode is explicitly UPI/Bank etc, it's not cash
      if (paymentMode && paymentMode.toLowerCase() !== 'cash') {
        return false;
      }
      // If notes say "bank" or "online" etc, it's bank
      if (text.includes('bank') || text.includes('upi') || text.includes('gpay') || text.includes('phonepe') || text.includes('cheque') || text.includes('check') || text.includes('online') || text.includes('neft') || text.includes('rtgs') || text.includes('card')) {
        return false;
      }
      return true; // Default to Cash
    } else {
      // For Bank book
      if (paymentMode && paymentMode.toLowerCase() !== 'cash') {
        return true;
      }
      if (text.includes('bank') || text.includes('upi') || text.includes('gpay') || text.includes('phonepe') || text.includes('cheque') || text.includes('check') || text.includes('online') || text.includes('neft') || text.includes('rtgs') || text.includes('card')) {
        return true;
      }
      return false; // Default to Cash, so not Bank
    }
  };

  // Compile and filter transactions
  const transactions = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      description: string;
      partyName: string;
      type: 'INFLOW' | 'OUTFLOW';
      amount: number;
      refNo: string;
      category: string;
    }> = [];

    // 1. Customer Payments (Inflows)
    customerPayments.forEach((p) => {
      if (isTargetTransaction(p.notes)) {
        list.push({
          id: `CUST-PAY-${p.id}`,
          date: p.date ? new Date(Number(p.date) / 1000000).toISOString() : new Date().toISOString(),
          description: p.notes || 'Payment from customer',
          partyName: p.customerId,
          type: 'INFLOW',
          amount: p.amount,
          refNo: p.invoiceNumber || `PAY-${p.id}`,
          category: 'Customer Receipt',
        });
      }
    });

    // 2. Vendor Payments (Outflows)
    vendorPayments.forEach((vp) => {
      if (isTargetTransaction(vp.notes)) {
        list.push({
          id: `VEND-PAY-${vp.id}`,
          date: vp.date ? new Date(Number(vp.date) / 1000000).toISOString() : new Date().toISOString(),
          description: vp.notes || 'Payment to vendor',
          partyName: vp.vendorName,
          type: 'OUTFLOW',
          amount: vp.amount,
          refNo: vp.purchaseNumber || `PAY-${vp.id}`,
          category: 'Vendor Payment',
        });
      }
    });

    // 3. Employee Payments (Outflows)
    employeePayments.forEach((ep) => {
      if (isTargetTransaction(ep.remarks, ep.paymentMode)) {
        list.push({
          id: `EMP-PAY-${ep.id}`,
          date: ep.paymentDate ? new Date(Number(ep.paymentDate) / 1000000).toISOString() : new Date().toISOString(),
          description: ep.remarks || 'Salary / Wage Disbursement',
          partyName: ep.employeeName,
          type: 'OUTFLOW',
          amount: ep.amountPaid,
          refNo: `EMP-${ep.id}`,
          category: 'Karigar Wage',
        });
      }
    });

    // 4. Expenses (Outflows)
    expenses.forEach((ex) => {
      if (isTargetTransaction(ex.description)) {
        list.push({
          id: `EXP-${ex.id}`,
          date: ex.date ? new Date(Number(ex.date) / 1000000).toISOString() : new Date().toISOString(),
          description: ex.description || 'General Expense',
          partyName: 'Various',
          type: 'OUTFLOW',
          amount: ex.amount,
          refNo: `EXP-${ex.id}`,
          category: ex.category || 'Expense',
        });
      }
    });

    // Apply filters
    let filtered = list;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.partyName.toLowerCase().includes(q) ||
          t.refNo.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter((t) => new Date(t.date) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => new Date(t.date) <= end);
    }

    // Sort by date ascending to compute running balances correctly
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return filtered;
  }, [customerPayments, vendorPayments, employeePayments, expenses, searchQuery, startDate, endDate, type]);

  // Totals calculations
  const totals = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;

    transactions.forEach((t) => {
      if (t.type === 'INFLOW') {
        totalInflow += t.amount;
      } else {
        totalOutflow += t.amount;
      }
    });

    return {
      totalInflow,
      totalOutflow,
      netBalance: totalInflow - totalOutflow,
    };
  }, [transactions]);

  if (!user || !canViewFinance) {
    return <Unauthorized />;
  }

  const isCash = type === 'cash';

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-maroon dark:text-saffron font-serif flex items-center gap-2">
            {isCash ? <Wallet className="h-6 w-6 text-maroon" /> : <Landmark className="h-6 w-6 text-maroon" />}
            {isCash ? 'Cash Book Ledger' : 'Bank Book Ledger'}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {isCash
              ? 'Real-time record of all cash receipts, payment disbursements, and vault cash reserves.'
              : 'Detailed transaction logs of all bank transfers, UPI receipts, and digital account statements.'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="border border-gold/20 shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Inflows (Receipts)</p>
                <h3 className="text-2xl font-extrabold text-green-700 mt-1">
                  {formatCurrency(totals.totalInflow)}
                </h3>
              </div>
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700">
                <ArrowDownRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gold/20 shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Outflows (Payments)</p>
                <h3 className="text-2xl font-extrabold text-maroon mt-1">
                  {formatCurrency(totals.totalOutflow)}
                </h3>
              </div>
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/20 text-maroon">
                <ArrowUpRight className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gold/20 shadow-md bg-white dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Book Balance</p>
                <h3 className={`text-2xl font-extrabold mt-1 ${totals.netBalance >= 0 ? 'text-green-700' : 'text-red-750'}`}>
                  {formatCurrency(totals.netBalance)}
                </h3>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-[#D4A017]">
                {isCash ? <Wallet className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main ledger list */}
      <Card className="border-2 border-gold shadow-md">
        <CardHeader className="bg-amber-50/20 border-b border-gold/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
          <div>
            <CardTitle className="text-maroon text-lg">Transaction Registry</CardTitle>
            <CardDescription>View, search, and verify inflows and outflows history.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex items-center border border-gold/40 rounded bg-white dark:bg-gray-800 px-3 py-1.5 text-xs">
              <Search className="h-4 w-4 text-slate-400 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="outline-none bg-transparent w-40 h-5"
              />
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gold/40 rounded px-2 py-1 text-xs outline-none bg-white dark:bg-gray-800"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gold/40 rounded px-2 py-1 text-xs outline-none bg-white dark:bg-gray-800"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(loadingCust || loadingVend || loadingEmp || loadingExp) ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Loading financial transaction ledger...
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No transactions recorded for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b border-gold/20">
                  <TableRow>
                    <TableHead className="font-bold text-maroon text-xs">Date</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Ref No</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Category</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Description</TableHead>
                    <TableHead className="font-bold text-maroon text-xs">Party Name</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-right">Inflow (Dr)</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-right">Outflow (Cr)</TableHead>
                    <TableHead className="font-bold text-maroon text-xs text-right">Running Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    let runningBal = 0;
                    return transactions.map((t) => {
                      if (t.type === 'INFLOW') {
                        runningBal += t.amount;
                      } else {
                        runningBal -= t.amount;
                      }

                      return (
                        <TableRow key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 text-xs">
                          <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                            {formatERPDate(t.date)}
                          </TableCell>
                          <TableCell className="font-mono text-slate-550">{t.refNo}</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] font-bold border-none px-2 py-0.5 ${
                              t.type === 'INFLOW' 
                                ? 'bg-green-50 text-green-700 dark:bg-green-950/20' 
                                : 'bg-red-50 text-red-700 dark:bg-red-950/20'
                            }`}>
                              {t.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate font-medium text-slate-800 dark:text-slate-200">
                            {t.description}
                          </TableCell>
                          <TableCell className="font-bold text-slate-650">{t.partyName}</TableCell>
                          <TableCell className="text-right text-green-700 font-bold">
                            {t.type === 'INFLOW' ? formatCurrency(t.amount) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-red-650 font-bold">
                            {t.type === 'OUTFLOW' ? formatCurrency(t.amount) : '-'}
                          </TableCell>
                          <TableCell className={`text-right font-black ${runningBal >= 0 ? 'text-green-700' : 'text-red-750'}`}>
                            {formatCurrency(runningBal)}
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CashBankBook;
