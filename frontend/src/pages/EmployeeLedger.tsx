import { useState } from 'react';
import { useEmployees, useKarigarLedger } from '../hooks/useQueries';
import ProductionLayout from '../components/ProductionLayout';
import { useAuth } from '../components/AuthGuard';
import Unauthorized from './Unauthorized';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '../utils/currencyFormat';
import { formatERPDate, safeQty } from '../utils/calculations';
import { BookOpen, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

const EmployeeLedger = () => {
  const { user } = useAuth();
  const isStaff = !!(user?.role && 'Staff' in user.role);

  const { data: employees = [], isLoading: empsLoading } = useEmployees({ enabled: !isStaff && !!user });
  const [selectedEmp, setSelectedEmp] = useState<string>('');
  const { data: ledgerEntries = [], isLoading: ledgerLoading } = useKarigarLedger(selectedEmp, { enabled: !!selectedEmp });

  if (!user) return null;

  const linkedEmployeeId = isStaff ? (localStorage.getItem(`staff_employee_link_${user.username.toLowerCase()}`) || 'EMP-1') : '';
  const staffEmployeeName = isStaff ? (localStorage.getItem(`staff_employee_name_${user.username.toLowerCase()}`) || 'Ramesh Patel') : user.name;
  const linkedEmployee = isStaff ? { id: linkedEmployeeId, name: staffEmployeeName } : null;

  const activeEmployees = employees.filter(e => e.status === 'Active');

  // Handle default selection
  if (isStaff) {
    if (selectedEmp !== staffEmployeeName) {
      setSelectedEmp(staffEmployeeName);
    }
  } else if (!selectedEmp && activeEmployees.length > 0) {
    setSelectedEmp(activeEmployees[0].name);
  }

  // Compute stats
  const totalWork = ledgerEntries.reduce((sum, entry) => sum + safeQty(entry.totalWage), 0);
  const totalPaid = ledgerEntries.reduce((sum, entry) => sum + safeQty(entry.paidAmount), 0);
  const balance = totalWork - totalPaid;

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
      case 'Deleted':
        return <Badge variant="destructive">Deleted</Badge>;
      case 'Paid':
        return <Badge className="bg-green-100 text-green-800 border border-green-200">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <ProductionLayout title="Karigar / Artisan Ledger">
      {!isStaff && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 border-2 border-gold rounded-2xl shadow-sm">
          <div className="space-y-1.5 w-full md:w-80">
            <Label className="text-slate-500 font-bold text-xs">Select Karigar / Employee</Label>
            <Select value={selectedEmp} onValueChange={setSelectedEmp}>
              <SelectTrigger className="border-gold/30 focus:ring-maroon">
                <SelectValue placeholder="Select Karigar" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-gold/30">
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.name}>{e.name} ({e.status})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            {selectedEmp && (
              <Badge className="bg-amber-50 text-maroon font-bold text-xs py-1 px-3 border border-gold/40">
                artisan: {selectedEmp}
              </Badge>
            )}
          </div>
        </div>
      )}

      {selectedEmp && (
        <div className="space-y-6 mt-4">
          {/* Totals Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-2 border-gold shadow-sm border-l-4 border-l-maroon">
              <CardHeader className="py-3">
                <CardTitle className="text-xs uppercase text-slate-400 font-bold tracking-wider">Total Wage Value</CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-4">
                <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">{formatCurrency(totalWork)}</div>
                <span className="text-[10px] text-slate-400">Wages earned from accepted products</span>
              </CardContent>
            </Card>

            <Card className="border-2 border-gold shadow-sm border-l-4 border-l-green-600">
              <CardHeader className="py-3">
                <CardTitle className="text-xs uppercase text-slate-400 font-bold tracking-wider">Total Paid Amount</CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-4">
                <div className="text-2xl font-extrabold text-green-600">{formatCurrency(totalPaid)}</div>
                <span className="text-[10px] text-slate-400">Total payout processed</span>
              </CardContent>
            </Card>

            <Card className={`border-2 shadow-sm border-l-4 ${balance > 0 ? 'border-l-red-500 border-gold' : 'border-l-slate-400 border-slate-200'}`}>
              <CardHeader className="py-3">
                <CardTitle className="text-xs uppercase text-slate-400 font-bold tracking-wider">Outstanding Balance</CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-4">
                <div className={`text-2xl font-extrabold ${balance > 0 ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}>{formatCurrency(balance)}</div>
                <span className="text-[10px] text-slate-400">Balance wages due to be paid</span>
              </CardContent>
            </Card>
          </div>

          {/* Ledger Table */}
          <Card className="border-2 border-gold shadow-sm">
            <CardHeader className="bg-amber-50/10 border-b border-gold/20 py-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-maroon text-base flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-saffron" /> Statement of Karigar Ledger Account
                </CardTitle>
                <CardDescription>Official transaction log of work completions and payout handovers.</CardDescription>
              </div>
              <Button onClick={() => window.print()} size="sm" variant="outline" className="border-gold/40 text-xs font-bold no-print">
                Print Ledger
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {ledgerLoading ? (
                <div className="text-center py-12 text-slate-500">Loading ledger account...</div>
              ) : ledgerEntries.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No ledger transactions logged for this employee.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-800">Job No</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Date</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Product SKU / Type</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Qty Given</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Accepted Qty</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Rejected Qty</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Pending Qty</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Rate</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Total Wage</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Paid Amount</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Balance Due</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntries.map((row: any) => {
                      const dateStr = formatERPDate(row.date);
                      const isPayment = row.jobWorkNo === '0' || row.totalWage === 0;

                      return (
                        <TableRow key={row.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono font-bold text-xs text-slate-600">
                            {row.jobWorkNo === '0' ? '-' : `JW-${row.jobWorkNo}`}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 whitespace-nowrap">{dateStr}</TableCell>
                          <TableCell className="text-xs font-semibold">
                            {isPayment ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <ArrowDownCircle className="h-3.5 w-3.5" /> {row.productName || 'Salary Paid'}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-maroon">
                                <ArrowUpCircle className="h-3.5 w-3.5" /> {row.productName}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">{row.jobWorkNo === '0' ? '-' : safeQty(row.qtyGiven)}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-green-600 font-semibold">{row.jobWorkNo === '0' ? '-' : safeQty(row.acceptedQty)}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-red-500">{row.jobWorkNo === '0' ? '-' : safeQty(row.rejectedQty)}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-slate-700">{row.jobWorkNo === '0' ? '-' : safeQty(row.pendingQty)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{row.jobWorkNo === '0' ? '-' : `₹${safeQty(row.rate).toFixed(2)}`}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-maroon text-xs">
                            {safeQty(row.totalWage) > 0 ? `+${formatCurrency(safeQty(row.totalWage))}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-green-600 text-xs">
                            {safeQty(row.paidAmount) > 0 ? `-${formatCurrency(safeQty(row.paidAmount))}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {formatCurrency(safeQty(row.balanceAmount))}
                          </TableCell>
                          <TableCell className="text-center">{getStatusBadge(row.status)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </ProductionLayout>
  );
};

export default EmployeeLedger;
