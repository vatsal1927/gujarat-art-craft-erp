import { useState } from 'react';
import { useEmployees, useJobWorks, useEmployeePayments, useSaveEmployeePayment, useKarigarLedger } from '../hooks/useQueries';
import ProductionLayout from '../components/ProductionLayout';
import { useAuth } from '../components/AuthGuard';
import Unauthorized from './Unauthorized';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, DollarSign, Wallet, Check, Landmark, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../utils/currencyFormat';
import { formatERPDate, formatERPDateTime, safeQty } from '../utils/calculations';
import { toast } from 'sonner';

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer'];

const EmployeePayments = () => {
  const { user } = useAuth();
  const isStaff = !!(user?.role && 'Staff' in user.role);

  const { data: employees = [], isLoading: empsLoading } = useEmployees({ enabled: !isStaff && !!user });
  const { data: jobWorks = [] } = useJobWorks();
  const { data: payments = [], isLoading: paymentsLoading } = useEmployeePayments({ enabled: !isStaff && !!user });
  const savePaymentMutation = useSaveEmployeePayment();

  const linkedEmployeeId = isStaff && user ? (localStorage.getItem(`staff_employee_link_${user.username.toLowerCase()}`) || 'EMP-1') : '';
  const staffEmployeeName = isStaff && user ? (localStorage.getItem(`staff_employee_name_${user.username.toLowerCase()}`) || 'Ramesh Patel') : user?.name || '';
  const linkedEmployee = isStaff ? { id: linkedEmployeeId, name: staffEmployeeName } : null;

  const { data: staffLedger = [], isLoading: ledgerLoading } = useKarigarLedger(staffEmployeeName, { enabled: isStaff && !!staffEmployeeName });

  const paymentsLoadingFinal = isStaff ? ledgerLoading : paymentsLoading;

  // Form State
  const [employeeName, setEmployeeName] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [remarks, setRemarks] = useState('');

  if (!user) return null;

  const userPayments = isStaff 
    ? staffLedger
        .filter((entry: any) => Number(entry.paidAmount || 0) > 0)
        .map((entry: any) => ({
          id: entry.id,
          paymentDate: entry.date,
          employeeName: entry.employeeName,
          amountPaid: Number(entry.paidAmount || 0),
          paymentMode: 'UPI',
          remarks: entry.productName || 'Wages payment disbursement'
        }))
    : payments;

  const activeEmployees = employees.filter(e => e.status === 'Active');

  // Handle default selection
  if (!employeeName && activeEmployees.length > 0) {
    setEmployeeName(activeEmployees[0].name);
  }

  // Calculate current outstanding for selected employee
  const getOutstandingBalance = (name: string): number => {
    if (!name) return 0;
    
    const earned = jobWorks
      .filter(j => j.employeeName === name)
      .reduce((sum, j) => sum + (safeQty(j.acceptedQty) * safeQty(j.ratePerPiece)), 0);
      
    // Paid
    const paid = payments
      .filter(p => p.employeeName === name)
      .reduce((sum, p) => sum + safeQty(p.amountPaid), 0);

    return safeQty(earned - paid);
  };

  const currentOutstanding = getOutstandingBalance(employeeName);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName || !amountPaid) {
      toast.error('Please enter payment amount');
      return;
    }

    const amtVal = parseFloat(amountPaid);
    if (isNaN(amtVal) || amtVal <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    if (amtVal > currentOutstanding) {
      if (!confirm(`Warning: You are paying ₹${amtVal}, which is greater than the artisan outstanding balance (₹${currentOutstanding}). Proceed?`)) {
        return;
      }
    }

    try {
      await savePaymentMutation.mutateAsync({
        employeeName,
        amountPaid: amtVal,
        paymentMode,
        remarks: remarks || `Salary disbursed via ${paymentMode}`
      });
      toast.success(`Disbursed payout of ₹${amtVal} to ${employeeName} successfully!`);
      setAmountPaid('');
      setRemarks('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to register artisan payout');
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'Cash':
        return 'bg-amber-100 text-amber-800';
      case 'UPI':
        return 'bg-blue-100 text-blue-800';
      case 'Bank Transfer':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-slate-100';
    }
  };

  return (
    <ProductionLayout title="Artisan Payouts Drawer">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Payment Entry Form */}
        {!isStaff && (
          <div className="lg:col-span-1">
            <Card className="border-2 border-gold shadow-sm sticky top-20 bg-white dark:bg-slate-900">
              <CardHeader className="bg-amber-50/10 border-b border-gold/20 py-4">
                <CardTitle className="text-maroon text-base flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-saffron" /> Process Artisan Payout
                </CardTitle>
                <CardDescription>Record wage distributions to employees.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handlePay} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-500 font-bold text-xs">Select Artisan *</Label>
                    <Select value={employeeName} onValueChange={setEmployeeName}>
                      <SelectTrigger className="border-gold/30 focus:ring-maroon">
                        <SelectValue placeholder="Select Artisan" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                        {activeEmployees.map(e => (
                          <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Outstanding Indicator */}
                  {employeeName && (
                    <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-200/50 p-3 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Outstanding Dues</span>
                        <span className="text-lg font-black text-red-500">{formatCurrency(currentOutstanding)}</span>
                      </div>
                      <Wallet className="h-8 w-8 text-red-300" />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="amount" className="text-slate-500 font-semibold text-xs">Amount to Pay (₹) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 500"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="border-gold/30 focus-visible:ring-maroon font-bold text-base font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-500 font-semibold text-xs">Payment Mode *</Label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger className="border-gold/30 focus:ring-maroon">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                        {PAYMENT_MODES.map(mode => (
                          <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="remarks" className="text-slate-500 font-semibold text-xs">Remarks / Trans Reference</Label>
                    <Input
                      id="remarks"
                      placeholder="UPI Txn ID or notes..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="border-gold/30 focus-visible:ring-maroon"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-maroon hover:bg-maroon/90 text-white font-bold flex items-center justify-center gap-1.5 pt-2.5 pb-2.5">
                    <Check className="h-4.5 w-4.5" /> Disburse Payment
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payments History List */}
        <div className={isStaff ? "lg:col-span-3" : "lg:col-span-2"}>
          <Card className="border-2 border-gold shadow-sm bg-white dark:bg-slate-900">
            <CardHeader className="bg-amber-50/10 border-b border-gold/20 py-4">
              <CardTitle className="text-maroon text-base flex items-center gap-2">
                <Landmark className="h-5 w-5 text-saffron" /> Wages Payment History
              </CardTitle>
              <CardDescription>All recorded salaries and payout distributions made to craft artisans.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {paymentsLoadingFinal ? (
                <div className="text-center py-12 text-slate-500">Loading payout records...</div>
              ) : userPayments.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No salary payment disbursements registered.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-800">Trans ID</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Date</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Artisan Employee</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-center">Payment Mode</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Amount Paid</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...userPayments].reverse().map((pay) => {
                      const payDateStr = formatERPDateTime(pay.paymentDate);
                      return (
                        <TableRow key={pay.id.toString()} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono font-bold text-xs text-slate-600">PAY-{pay.id.toString()}</TableCell>
                          <TableCell className="text-xs text-slate-500">{payDateStr}</TableCell>
                          <TableCell className="font-semibold text-slate-800">{pay.employeeName}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${getModeColor(pay.paymentMode)} text-[10px]`}>{pay.paymentMode}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-green-600 text-xs">
                            {formatCurrency(safeQty(pay.amountPaid))}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 max-w-40 truncate">{pay.remarks}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </ProductionLayout>
  );
};

export default EmployeePayments;
