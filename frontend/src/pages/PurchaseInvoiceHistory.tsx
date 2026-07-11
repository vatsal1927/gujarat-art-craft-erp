import React, { useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../components/AuthGuard';
import { usePurchaseInvoices } from '../hooks/useQueries';
import { formatCurrency } from '../utils/currencyFormat';
import { formatERPDate } from '../utils/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, X, Calendar, Filter, FileText, ArrowUpDown, Eye, Printer, Download, CreditCard, BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { PurchaseInvoiceDetailsModal } from '../components/PurchaseInvoiceDetailsModal';
import { formatSafeDate, getPurchasePaymentStatus } from '../utils/masterData';
import { PurchaseInvoicePrint } from '../components/PurchaseInvoicePrint';
import { PurchasePaymentModal } from '../components/PurchasePaymentModal';
import { formatDateForFilename } from '../utils/dateUtils';
import { useLogPurchaseInvoiceAction } from '../hooks/useQueries';

export const PurchaseInvoiceHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const logAction = useLogPurchaseInvoiceAction();

  // Role permissions
  const isMasterAdmin = !!(user?.role && 'Admin' in user.role);
  const isAdmin = !!(user?.role && 'Manager' in user.role);
  const isStaff = !!(user?.role && 'Staff' in user.role);

  // If staff, block access
  React.useEffect(() => {
    if (isStaff) {
      navigate({ to: '/unauthorized' });
    }
  }, [isStaff]);

  const { data: rawInvoices, isLoading, error } = usePurchaseInvoices({
    enabled: !isStaff && !!user
  });

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('All');
  const [vendorFilter, setVendorFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Sort State
  const [sortBy, setSortBy] = useState<'Date' | 'InvoiceNo' | 'Vendor' | 'Amount' | 'Outstanding'>('Date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal States
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<any>(null);

  // Clear filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setDateFilter('All');
    setVendorFilter('All');
    setStartDate('');
    setEndDate('');
  };

  // Get unique vendors list
  const uniqueVendors = useMemo(() => {
    if (!rawInvoices) return [];
    const vendors = rawInvoices.map((inv) => inv.vendorName).filter(Boolean);
    return Array.from(new Set(vendors)).sort();
  }, [rawInvoices]);

  // Filtered and Sorted Invoices
  const processedInvoices = useMemo(() => {
    if (!rawInvoices) return [];

    let filtered = [...rawInvoices];

    // 1. Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((inv) => {
        const matchesInvNo = inv.invoiceNumber?.toLowerCase().includes(searchLower);
        const matchesVendor = inv.vendorName?.toLowerCase().includes(searchLower);
        const matchesPo = inv.poNumber?.toLowerCase().includes(searchLower);
        const matchesGrn = inv.grnNumber?.toLowerCase().includes(searchLower);
        const matchesReq = inv.sourceRequirementId?.toLowerCase().includes(searchLower);
        return matchesInvNo || matchesVendor || matchesPo || matchesGrn || matchesReq;
      });
    }

    // 2. Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter((inv) => inv.paymentStatus === statusFilter);
    }

    // 3. Vendor filter
    if (vendorFilter !== 'All') {
      filtered = filtered.filter((inv) => inv.vendorName === vendorFilter);
    }

    // 4. Date filter
    const now = new Date();
    if (dateFilter === 'Today') {
      const todayStr = now.toISOString().split('T')[0];
      filtered = filtered.filter((inv) => inv.date?.startsWith(todayStr));
    } else if (dateFilter === 'This Week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((inv) => new Date(inv.date) >= oneWeekAgo);
    } else if (dateFilter === 'This Month') {
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      filtered = filtered.filter((inv) => {
        const d = new Date(inv.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    } else if (dateFilter === 'Custom' && (startDate || endDate)) {
      filtered = filtered.filter((inv) => {
        const invDate = new Date(inv.date);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (invDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (invDate > end) return false;
        }
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'Date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'InvoiceNo') {
        comparison = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
      } else if (sortBy === 'Vendor') {
        comparison = (a.vendorName || '').localeCompare(b.vendorName || '');
      } else if (sortBy === 'Amount') {
        comparison = a.grandTotal - b.grandTotal;
      } else if (sortBy === 'Outstanding') {
        comparison = a.remainingAmount - b.remainingAmount;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [rawInvoices, searchTerm, statusFilter, dateFilter, vendorFilter, startDate, endDate, sortBy, sortOrder]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const metrics = {
      totalValue: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      overdueCount: 0,
      unpaidCount: 0,
    };

    if (!processedInvoices) return metrics;

    processedInvoices.forEach((inv) => {
      // Exclude cancelled invoices from aggregates
      if (inv.paymentStatus !== 'Cancelled') {
        metrics.totalValue += inv.grandTotal;
        metrics.totalPaid += inv.paidAmount;
        metrics.totalOutstanding += inv.remainingAmount;
      }

      if (inv.paymentStatus === 'Overdue') {
        metrics.overdueCount++;
      } else if (inv.paymentStatus === 'Unpaid') {
        metrics.unpaidCount++;
      }
    });

    return metrics;
  }, [processedInvoices]);

  // Print single invoice
  const handlePrint = (invoice: any) => {
    setSelectedInvoice(invoice);
    logAction.mutate(
      { action: 'printed', invoiceNumber: invoice.invoiceNumber },
      {
        onSuccess: () => {
          setTimeout(() => {
            window.print();
          }, 150);
        },
        onError: () => {
          setTimeout(() => {
            window.print();
          }, 150);
        }
      }
    );
  };

  // PDF single invoice
  const handlePDF = (invoice: any) => {
    const filename = `PurchaseInvoice_${invoice.invoiceNumber}_${formatDateForFilename()}`;
    const message = `To save as PDF:\n\n1. In the print dialog, select "Save as PDF" or "Microsoft Print to PDF" as the printer\n2. Suggested filename: ${filename}.pdf\n3. Click Save/Print\n\nClick OK to open the print dialog.`;
    
    if (confirm(message)) {
      setSelectedInvoice(invoice);
      logAction.mutate(
        { action: 'pdf_downloaded', invoiceNumber: invoice.invoiceNumber },
        {
          onSuccess: () => {
            setTimeout(() => {
              window.print();
            }, 150);
          },
          onError: () => {
            setTimeout(() => {
              window.print();
            }, 150);
          }
        }
      );
    }
  };

  // CSV export
  const handleExportCSV = () => {
    try {
      if (processedInvoices.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      const headers = ['Invoice No', 'Date', 'Vendor', 'Grand Total', 'Paid Amount', 'Remaining Due', 'Payment Status', 'Due Date', 'PO Number', 'GRN Number', 'MRP Plan ID'];
      const rows = processedInvoices.map(inv => [
        inv.invoiceNumber,
        new Date(inv.date).toISOString().split('T')[0],
        inv.vendorName,
        inv.grandTotal,
        inv.paidAmount,
        inv.remainingAmount,
        inv.paymentStatus,
        inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : 'N/A',
        inv.poNumber || '',
        inv.grnNumber || '',
        inv.sourceRequirementId || ''
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `PurchaseInvoices_Export_${formatDateForFilename()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV exported successfully');
    } catch (e: any) {
      toast.error('Export failed: ' + e.message);
    }
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (isStaff) return null;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold text-maroon">Purchase Invoice History</h1>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="border-gold">
              <CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-gold">
          <CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-bold">Failed to load purchase invoices history</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-12">
      {/* Printable Sheet (hidden on screen, only visible for print layout) */}
      <PurchaseInvoicePrint invoice={selectedInvoice} />

      {/* Screen Area */}
      <div className="no-print space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-maroon">Purchase Invoice History</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Track supplier invoices, payments, due dates, and purchase transactions.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="border-gold text-slate-700 dark:text-slate-300 hover:bg-amber-50"
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-2 border-gold shadow-sm bg-gradient-to-br from-amber-50/20 to-white dark:from-slate-900 dark:to-slate-800">
            <CardContent className="p-4">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Purchases</span>
              <p className="text-xl font-black text-maroon mt-1">{formatCurrency(summaryMetrics.totalValue)}</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-gold shadow-sm bg-gradient-to-br from-green-50/20 to-white dark:from-slate-900 dark:to-slate-850">
            <CardContent className="p-4">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Paid</span>
              <p className="text-xl font-black text-green-700 mt-1">{formatCurrency(summaryMetrics.totalPaid)}</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-gold shadow-sm bg-gradient-to-br from-red-50/20 to-white dark:from-slate-900 dark:to-slate-850">
            <CardContent className="p-4">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Outstanding Dues</span>
              <p className="text-xl font-black text-red-600 mt-1">{formatCurrency(summaryMetrics.totalOutstanding)}</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-gold shadow-sm bg-gradient-to-br from-orange-50/20 to-white dark:from-slate-900 dark:to-slate-850">
            <CardContent className="p-4">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Overdue Bills</span>
              <p className="text-xl font-black text-orange-650 mt-1">{summaryMetrics.overdueCount}</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-gold shadow-sm bg-gradient-to-br from-amber-50/20 to-white dark:from-slate-900 dark:to-slate-850">
            <CardContent className="p-4">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Unpaid Bills</span>
              <p className="text-xl font-black text-amber-700 mt-1">{summaryMetrics.unpaidCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card className="border-2 border-gold shadow-md">
          <CardHeader className="pb-3 border-b border-gold/15 bg-gradient-to-r from-maroon/5 via-gold/5 to-maroon/5">
            <CardTitle className="text-maroon text-sm font-bold flex items-center gap-2">
              <Filter className="h-4 w-4" /> Search & Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-1">
                <Label htmlFor="search" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Search Invoices</Label>
                <div className="relative">
                  <Input
                    id="search"
                    placeholder="Search invoice, vendor, PO, GRN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-gold focus:ring-saffron text-xs pl-8 h-9"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-1">
                <Label htmlFor="statusFilter" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="statusFilter" className="border-gold text-xs h-9">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Vendor Filter */}
              <div className="space-y-1">
                <Label htmlFor="vendorFilter" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Supplier/Vendor</Label>
                <Select value={vendorFilter} onValueChange={setVendorFilter}>
                  <SelectTrigger id="vendorFilter" className="border-gold text-xs h-9">
                    <SelectValue placeholder="Select Vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Vendors</SelectItem>
                    {uniqueVendors.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Filter */}
              <div className="space-y-1">
                <Label htmlFor="dateFilter" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Date Range</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger id="dateFilter" className="border-gold text-xs h-9">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Dates</SelectItem>
                    <SelectItem value="Today">Today</SelectItem>
                    <SelectItem value="This Week">This Week</SelectItem>
                    <SelectItem value="This Month">This Month</SelectItem>
                    <SelectItem value="Custom">Custom Dates</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Dates Inputs */}
            {dateFilter === 'Custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <Label htmlFor="start" className="text-xs font-semibold">Start Date</Label>
                  <Input
                    id="start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border-gold text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="end" className="text-xs font-semibold">End Date</Label>
                  <Input
                    id="end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border-gold text-xs h-9"
                  />
                </div>
              </div>
            )}

            {(searchTerm || statusFilter !== 'All' || dateFilter !== 'All' || vendorFilter !== 'All' || startDate || endDate) && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="border-maroon text-maroon hover:bg-maroon hover:text-white text-xs h-8"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>

        {/* History Table */}
        <Card className="border-2 border-gold shadow-md">
          <CardContent className="p-0">
            {processedInvoices.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <FileText className="h-12 w-12 text-gold mx-auto stroke-1" />
                <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm">
                  {rawInvoices?.length === 0
                    ? 'No purchase invoices found. Purchase invoices will appear automatically after GRN or purchase receipt.'
                    : 'No purchase invoices match your filter criteria.'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-maroon/10 via-gold/10 to-maroon/10">
                        <TableHead className="font-bold text-maroon text-xs cursor-pointer" onClick={() => toggleSort('InvoiceNo')}>
                          <div className="flex items-center gap-1">Invoice No <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="font-bold text-maroon text-xs cursor-pointer" onClick={() => toggleSort('Date')}>
                          <div className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="font-bold text-maroon text-xs cursor-pointer" onClick={() => toggleSort('Vendor')}>
                          <div className="flex items-center gap-1">Vendor <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="font-bold text-maroon text-xs text-right cursor-pointer" onClick={() => toggleSort('Amount')}>
                          <div className="flex items-center gap-1 justify-end">Total <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="font-bold text-maroon text-xs text-right">Paid</TableHead>
                        <TableHead className="font-bold text-maroon text-xs text-right cursor-pointer" onClick={() => toggleSort('Outstanding')}>
                          <div className="flex items-center gap-1 justify-end">Due <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="font-bold text-maroon text-xs text-center">Status</TableHead>
                        <TableHead className="font-bold text-maroon text-xs text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedInvoices.map((inv) => {
                        const dateOnlyStr = formatSafeDate(inv);
                        const paymentStatus = inv.paymentStatus === 'Cancelled' ? 'Cancelled' : getPurchasePaymentStatus(inv);
                        const isCancelled = paymentStatus === 'Cancelled';
                        const isPaid = paymentStatus === 'Paid';

                        return (
                          <TableRow key={inv.id} className="hover:bg-amber-50/30 dark:hover:bg-slate-800/50">
                            <TableCell className="font-bold text-maroon text-xs">{inv.invoiceNumber}</TableCell>
                            <TableCell className="text-xs">{dateOnlyStr}</TableCell>
                            <TableCell className="font-semibold text-xs">{inv.vendorName}</TableCell>
                            <TableCell className="text-right font-semibold text-xs">{formatCurrency(inv.grandTotal)}</TableCell>
                            <TableCell className="text-right text-xs text-green-700 font-medium">{formatCurrency(inv.paidAmount)}</TableCell>
                            <TableCell className="text-right text-xs text-red-655 font-bold">{formatCurrency(inv.remainingAmount)}</TableCell>
                            <TableCell className="text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                paymentStatus === 'Paid' ? 'bg-green-100 text-green-800 border border-green-200' :
                                paymentStatus === 'Partial' || paymentStatus === 'Partially Paid' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                paymentStatus === 'Overdue' ? 'bg-red-100 text-red-800 border border-red-200' :
                                paymentStatus === 'Cancelled' ? 'bg-gray-100 text-gray-800 border border-gray-200' :
                                'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {paymentStatus}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setIsDetailsOpen(true);
                                  }}
                                  className="h-7 px-2 border-gold text-slate-700 dark:text-slate-300 text-[11px]"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" /> View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePrint(inv)}
                                  className="h-7 px-2 border-gold text-slate-700 dark:text-slate-300 text-[11px]"
                                >
                                  <Printer className="h-3.5 w-3.5 mr-1" /> Print
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePDF(inv)}
                                  className="h-7 px-2 border-gold text-slate-700 dark:text-slate-300 text-[11px]"
                                >
                                  <Download className="h-3.5 w-3.5 mr-1" /> PDF
                                </Button>
                                {!isCancelled && !isPaid && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setPaymentInvoice(inv);
                                      setIsPaymentOpen(true);
                                    }}
                                    className="h-7 px-2 border-green-600 text-green-700 hover:bg-green-50 text-[11px]"
                                  >
                                    <CreditCard className="h-3.5 w-3.5 mr-1" /> Pay
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate({ to: '/ledger', search: { tab: 'vendors', vendorName: inv.vendorName } as any })}
                                  className="h-7 px-2 border-slate-300 text-slate-700 dark:text-slate-300 text-[11px]"
                                >
                                  <BookOpen className="h-3.5 w-3.5 mr-1" /> Ledger
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden p-4 space-y-4">
                  {processedInvoices.map((inv) => {
                    const dateOnlyStr = formatSafeDate(inv);
                    const paymentStatus = inv.paymentStatus === 'Cancelled' ? 'Cancelled' : getPurchasePaymentStatus(inv);
                    const isCancelled = paymentStatus === 'Cancelled';
                    const isPaid = paymentStatus === 'Paid';

                    return (
                      <div key={inv.id} className="border-2 border-gold/15 rounded-xl p-4 space-y-3 bg-white dark:bg-slate-900 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-maroon text-sm">{inv.invoiceNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            paymentStatus === 'Paid' ? 'bg-green-100 text-green-800 border border-green-200' :
                            paymentStatus === 'Partial' || paymentStatus === 'Partially Paid' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            paymentStatus === 'Overdue' ? 'bg-red-100 text-red-800 border border-red-200' :
                            paymentStatus === 'Cancelled' ? 'bg-gray-100 text-gray-800 border border-gray-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {paymentStatus}
                          </span>
                        </div>

                        <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
                          <div><span className="font-semibold">Supplier:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{inv.vendorName}</span></div>
                          <div><span className="font-semibold">Date:</span> {dateOnlyStr}</div>
                          <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 text-xs">
                            <div>
                              <p className="text-[10px] text-gray-500">Grand Total</p>
                              <p className="font-semibold text-slate-800 dark:text-white">{formatCurrency(inv.grandTotal)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500">Paid</p>
                              <p className="font-semibold text-green-700">{formatCurrency(inv.paidAmount)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500">Outstanding</p>
                              <p className="font-bold text-red-650">{formatCurrency(inv.remainingAmount)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsDetailsOpen(true);
                            }}
                            className="h-8 px-2.5 border-gold text-slate-700 text-xs flex-1"
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(inv)}
                            className="h-8 px-2.5 border-gold text-slate-700 text-xs flex-1"
                          >
                            Print
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePDF(inv)}
                            className="h-8 px-2.5 border-gold text-slate-700 text-xs flex-1"
                          >
                            PDF
                          </Button>
                          {!isCancelled && !isPaid && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPaymentInvoice(inv);
                                setIsPaymentOpen(true);
                              }}
                              className="h-8 px-2.5 border-green-600 text-green-700 text-xs flex-1"
                            >
                              Pay
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate({ to: '/ledger', search: { tab: 'vendors', vendorName: inv.vendorName } as any })}
                            className="h-8 px-2.5 border-slate-300 text-slate-700 text-xs flex-1"
                          >
                            Ledger
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice Details Modal */}
      <PurchaseInvoiceDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        isAdminOrMaster={isMasterAdmin}
      />

      {/* Direct Payment Modal */}
      <PurchasePaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setPaymentInvoice(null);
        }}
        invoice={paymentInvoice}
      />
    </div>
  );
};
