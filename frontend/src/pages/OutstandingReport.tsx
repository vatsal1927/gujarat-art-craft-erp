import { useState } from 'react';
import { useCustomers, useInvoices, usePayments, useCollectPayment, useLogUserAction } from '../hooks/useQueries';
import { formatCurrency } from '../utils/currencyFormat';
import { calculateCustomerPreviousBalance } from '../utils/calculations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, RefreshCw, AlertCircle, IndianRupee, Wallet, Download, Printer, Eye, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Link } from '@tanstack/react-router';

const OutstandingReport = () => {
  const { data: customers = [], isLoading: loadingCustomers, refetch: refetchCustomers } = useCustomers();
  const { data: invoices = [], isLoading: loadingInvoices, refetch: refetchInvoices } = useInvoices();
  const { data: payments = [], isLoading: loadingPayments, refetch: refetchPayments } = usePayments();

  const { mutate: collectPayment, isPending } = useCollectPayment();
  const { mutate: logUserAction } = useLogUserAction();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  
  // Payment Collection fields
  const [collectAmount, setCollectAmount] = useState(0);
  const [collectNotes, setCollectNotes] = useState('');

  const refetchAll = () => {
    refetchCustomers();
    refetchInvoices();
    refetchPayments();
    toast.success('Outstanding reports updated!');
  };

  const getCustomerMetrics = (customerName: string) => {
    const custInvoices = invoices.filter(inv => inv.customerInfo.name === customerName);
    const totalBilled = custInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    const balanceData = calculateCustomerPreviousBalance(
      customerName,
      undefined,
      invoices,
      payments,
      0,
      0
    );
    const outstanding = balanceData.previousDue - balanceData.advanceBalance;

    return {
      totalBilled,
      totalPaidOnInvoices: totalBilled - outstanding,
      outstanding
    };
  };

  const handleOpenCollectModal = (cust: any, outstanding: number) => {
    setSelectedCustomer(cust);
    setCollectAmount(outstanding);
    setCollectNotes(`Payment for outstanding balance of ₹${outstanding}`);
    setIsCollectModalOpen(true);
  };

  const handleCollectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || collectAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    collectPayment({
      customerId: selectedCustomer.name,
      amount: collectAmount,
      notes: collectNotes
    }, {
      onSuccess: () => {
        try {
          const sessionStr = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
          const session = sessionStr ? JSON.parse(sessionStr) : null;
          const username = session?.name || session?.username || 'System';

          const metrics = getCustomerMetrics(selectedCustomer.name);
          const oldOutstanding = metrics.outstanding;
          const newOutstanding = oldOutstanding - collectAmount;
          const prevDue = newOutstanding > 0 ? newOutstanding : 0;
          const advBal = newOutstanding < 0 ? Math.abs(newOutstanding) : 0;

          logUserAction({
            action: "OUTSTANDING_RECALCULATED",
            details: JSON.stringify({
              invoiceNumber: "N/A",
              customerName: selectedCustomer.name,
              previousBalance: oldOutstanding > 0 ? oldOutstanding : 0,
              advanceBalance: oldOutstanding < 0 ? Math.abs(oldOutstanding) : 0,
              finalDue: prevDue,
              timestamp: Date.now(),
              user: username
            })
          });
        } catch (e) {
          console.error('Error logging payment collection in outstanding report:', e);
        }

        toast.success(`Payment of ₹${collectAmount} successfully collected from ${selectedCustomer.name}`);
        setIsCollectModalOpen(false);
        refetchAll();
      },
      onError: (err) => {
        toast.error(`Failed to collect payment: ${err.message}`);
      }
    });
  };

  const customersWithMetrics = customers.map(c => {
    const metrics = getCustomerMetrics(c.name);
    return {
      ...c,
      ...metrics
    };
  }).filter(c => c.outstanding > 0);

  const filteredCustomers = customersWithMetrics.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.gstNo && c.gstNo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleExportCSV = () => {
    let csv = 'Customer Name,Phone,Address,GSTIN,Total Billed (Rs.),Total Paid (Rs.),Outstanding Balance (Rs.)\n';
    filteredCustomers.forEach(c => {
      csv += `"${c.name}","${c.phone || ''}","${c.businessAddress || ''}","${c.gstNo || ''}",${c.totalBilled.toFixed(2)},${c.totalPaidOnInvoices.toFixed(2)},${c.outstanding.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Outstanding_Balances_Report.csv`);
    document.body.appendChild(link);
    link.click();
    toast.success('Outstanding report exported successfully!');
  };

  const totalOutstandingSum = customersWithMetrics.reduce((sum, c) => sum + c.outstanding, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-maroon dark:text-saffron flex items-center gap-2">
            <Wallet className="h-8 w-8 text-saffron" /> Outstanding Balance Report
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">View and collect outstanding invoice balances from active customers.</p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <Button onClick={handleExportCSV} variant="outline" className="border-gold text-maroon hover:bg-gold/10">
            <Download className="h-4 w-4 mr-1.5" /> Export Excel (CSV)
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="border-gold text-maroon hover:bg-gold/10">
            <Printer className="h-4 w-4 mr-1.5" /> Print Report (PDF)
          </Button>
          <Button onClick={refetchAll} variant="outline" className="border-gold text-maroon hover:bg-gold/10">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-red-500 border-gold/40 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Outstanding Receivable</p>
                <h3 className="text-3xl font-extrabold text-red-600 mt-1">{formatCurrency(totalOutstandingSum)}</h3>
              </div>
              <IndianRupee className="h-10 w-10 text-red-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 border-gold/40 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customers With Due Balance</p>
                <h3 className="text-3xl font-extrabold text-amber-600 mt-1">{customersWithMetrics.length} Customers</h3>
              </div>
              <AlertCircle className="h-10 w-10 text-amber-500 opacity-75" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-gold shadow-md">
        <CardHeader className="bg-amber-50/20 border-b border-gold/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
          <div>
            <CardTitle className="text-maroon text-lg">Due Balances Ledger</CardTitle>
            <CardDescription>Accounts receivable metrics and payment collection triggers.</CardDescription>
          </div>
          <div className="flex items-center border border-gold/40 rounded bg-white dark:bg-gray-800 px-3 py-1.5 text-xs">
            <Search className="h-4 w-4 text-slate-400 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer name/phone..."
              className="outline-none bg-transparent w-40 md:w-56"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingCustomers || loadingInvoices ? (
            <div className="text-center py-10 text-slate-500">Loading outstanding records...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No outstanding customer balances found.</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-gray-900 border-b border-gold/20">
                <TableRow>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200">Customer Name</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200">Contact Details</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200">GSTIN</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Total Billed</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Total Paid</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Outstanding Balance</TableHead>
                  <TableHead className="w-48 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((c) => (
                  <TableRow key={c.name} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30">
                    <TableCell className="font-bold text-slate-800 dark:text-slate-200">{c.name}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      <div>{c.phone || 'No phone'}</div>
                      <div className="truncate max-w-[200px]" title={c.businessAddress}>{c.businessAddress}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">{c.gstNo || '-'}</TableCell>
                    <TableCell className="text-right text-xs font-mono font-semibold">{formatCurrency(c.totalBilled)}</TableCell>
                    <TableCell className="text-right text-xs font-mono font-semibold text-green-600">{formatCurrency(c.totalPaidOnInvoices)}</TableCell>
                    <TableCell className="text-right text-xs font-mono font-extrabold text-red-600">{formatCurrency(c.outstanding)}</TableCell>
                    <TableCell className="text-center flex justify-center gap-2">
                      <Button onClick={() => handleOpenCollectModal(c, c.outstanding)} size="sm" className="bg-maroon hover:bg-maroon/90 text-white font-bold text-xs h-8">
                        Collect
                      </Button>
                      <Link to="/ledger" search={{ tab: 'customers', customerName: c.name } as any} className="inline-flex items-center justify-center rounded-md border border-gold/30 hover:border-gold px-2.5 text-maroon hover:bg-gold/15 text-xs font-bold h-8">
                        <BookOpen className="h-3.5 w-3.5 mr-1" /> Ledger
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Collect Payment Modal */}
      <Dialog open={isCollectModalOpen} onOpenChange={setIsCollectModalOpen}>
        <DialogContent className="sm:max-w-[400px] border-2 border-gold shadow-lg">
          <form onSubmit={handleCollectSubmit}>
            <DialogHeader>
              <DialogTitle className="text-maroon text-lg">Collect Customer Payment</DialogTitle>
              <DialogDescription>Record a payment collection to lower outstanding customer balances.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold">Customer</Label>
                <div className="col-span-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                  {selectedCustomer?.name}
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="collectAmount" className="text-right font-semibold">Amount (₹)</Label>
                <Input
                  id="collectAmount"
                  type="number"
                  step="any"
                  value={collectAmount || ''}
                  onChange={(e) => setCollectAmount(parseFloat(e.target.value) || 0)}
                  className="col-span-3 border-gold"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="collectNotes" className="text-right font-semibold">Remarks</Label>
                <Input
                  id="collectNotes"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder="e.g. Bank transfer ref #1234"
                  className="col-span-3 border-gold"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCollectModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-maroon hover:bg-maroon/90 text-white font-bold" disabled={isPending}>
                {isPending ? 'Processing...' : 'Collect Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OutstandingReport;
