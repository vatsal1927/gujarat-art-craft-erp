import { useState } from 'react';
import { useInvoices, usePurchases, useSettings } from '../hooks/useQueries';
import { formatCurrency } from '../utils/currencyFormat';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Printer, Percent, Info, TrendingUp, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { formatERPDate } from '../utils/calculations';

const GstReports = () => {
  const { data: invoices = [], isLoading: loadingSales } = useInvoices();
  const { data: purchases = [], isLoading: loadingPurchases } = usePurchases();
  const { data: settings } = useSettings();

  // Filters
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedPeriodType, setSelectedPeriodType] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString()); // 1 to 12
  const [selectedQuarter, setSelectedQuarter] = useState('1'); // Q1-Q4

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  const months = [
    { label: 'January', value: '1' },
    { label: 'February', value: '2' },
    { label: 'March', value: '3' },
    { label: 'April', value: '4' },
    { label: 'May', value: '5' },
    { label: 'June', value: '6' },
    { label: 'July', value: '7' },
    { label: 'August', value: '8' },
    { label: 'September', value: '9' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' },
  ];
  const quarters = [
    { label: 'Q1 (Apr - Jun)', value: '1', months: [4, 5, 6] },
    { label: 'Q2 (Jul - Sep)', value: '2', months: [7, 8, 9] },
    { label: 'Q3 (Oct - Dec)', value: '3', months: [10, 11, 12] },
    { label: 'Q4 (Jan - Mar)', value: '4', months: [1, 2, 3] },
  ];

  // Helper to filter by selected period
  const filterByPeriod = (dateMs: number) => {
    const date = new Date(dateMs);
    const yr = date.getFullYear();

    if (yr.toString() !== selectedYear) return false;

    if (selectedPeriodType === 'monthly') {
      const mo = date.getMonth() + 1;
      return mo.toString() === selectedMonth;
    } else if (selectedPeriodType === 'quarterly') {
      const mo = date.getMonth() + 1;
      const q = quarters.find(q => q.value === selectedQuarter);
      return q ? q.months.includes(mo) : false;
    }

    return true; // Yearly matches year only
  };

  // GST rate default
  const defaultGstRate = settings ? Number(settings.defaultGstRate || 5) : 5;

  // 1. Process Sales GST
  const salesSummary = invoices
    .filter(inv => filterByPeriod(Number(inv.date) / 1000000))
    .map(inv => {
      // Parse details
      const taxIdParts = (inv.customerInfo.taxId || '').split('|');
      const gstNo = taxIdParts[1] || '';
      const taxType = taxIdParts[2] || 'CGST_SGST';
      const date = new Date(Number(inv.date) / 1000000);

      // Re-calculate subtotal
      const subtotal = inv.products.reduce((acc, p) => acc + (Number(p[1]) * (Number(p[2]) / 100)), 0);
      const gstAmt = inv.totalAmount - subtotal;
      const gstPercent = subtotal > 0 ? Math.round((gstAmt / subtotal) * 100) : defaultGstRate;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (gstAmt > 0) {
        if (taxType === 'IGST') {
          igst = gstAmt;
        } else {
          cgst = gstAmt / 2;
          sgst = gstAmt / 2;
        }
      }

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: formatERPDate(inv.date),
        customerName: inv.customerInfo.name,
        customerGst: gstNo,
        taxableValue: subtotal,
        gstRate: gstPercent,
        cgst,
        sgst,
        igst,
        gstAmount: gstAmt,
        totalValue: inv.totalAmount,
        type: taxType
      };
    });

  // 2. Process Purchase GST
  const purchaseSummary = purchases
    .filter(p => filterByPeriod(Number(p.date) / 1000000))
    .map(p => {
      const date = new Date(Number(p.date) / 1000000);
      // Auto detect IGST: if vendor GSTIN doesn't start with Gujarat code "24"
      const isIgst = p.vendorGstNumber && !p.vendorGstNumber.trim().startsWith('24');
      
      let taxableVal = 0;
      let totalGstAmt = 0;
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      p.items.forEach(it => {
        const itemTaxable = it.quantity * it.rate;
        const itemGst = itemTaxable * (it.gstPercent / 100);
        taxableVal += itemTaxable;
        totalGstAmt += itemGst;

        if (isIgst) {
          igst += itemGst;
        } else {
          cgst += itemGst / 2;
          sgst += itemGst / 2;
        }
      });

      return {
        id: p.id,
        purchaseNumber: p.purchaseNumber,
        date: formatERPDate(p.date),
        vendorName: p.vendorName,
        vendorGst: p.vendorGstNumber,
        taxableValue: taxableVal,
        cgst,
        sgst,
        igst,
        gstAmount: totalGstAmt,
        totalValue: p.totalAmount,
        isIgst
      };
    });

  // Totals calculations
  const totalTaxableSales = salesSummary.reduce((sum, s) => sum + s.taxableValue, 0);
  const totalSalesCgst = salesSummary.reduce((sum, s) => sum + s.cgst, 0);
  const totalSalesSgst = salesSummary.reduce((sum, s) => sum + s.sgst, 0);
  const totalSalesIgst = salesSummary.reduce((sum, s) => sum + s.igst, 0);
  const totalOutputGst = salesSummary.reduce((sum, s) => sum + s.gstAmount, 0);
  const totalSalesValue = salesSummary.reduce((sum, s) => sum + s.totalValue, 0);

  const totalTaxablePurchases = purchaseSummary.reduce((sum, p) => sum + p.taxableValue, 0);
  const totalPurchasesCgst = purchaseSummary.reduce((sum, p) => sum + p.cgst, 0);
  const totalPurchasesSgst = purchaseSummary.reduce((sum, p) => sum + p.sgst, 0);
  const totalPurchasesIgst = purchaseSummary.reduce((sum, p) => sum + p.igst, 0);
  const totalInputGst = purchaseSummary.reduce((sum, p) => sum + p.gstAmount, 0);
  const totalPurchasesValue = purchaseSummary.reduce((sum, p) => sum + p.totalValue, 0);

  const netGstPayable = totalOutputGst - totalInputGst;
  const isPayable = netGstPayable > 0;

  // Export functions
  const handleExportGstr1 = () => {
    let csv = 'Invoice Number,Date,Customer Name,Customer GSTIN,Taxable Value (Rs.),CGST (Rs.),SGST (Rs.),IGST (Rs.),Total Value (Rs.)\n';
    salesSummary.forEach(s => {
      csv += `"${s.invoiceNumber}","${s.date}","${s.customerName}","${s.customerGst}",${s.taxableValue.toFixed(2)},${s.cgst.toFixed(2)},${s.sgst.toFixed(2)},${s.igst.toFixed(2)},${s.totalValue.toFixed(2)}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `GSTR-1_${selectedPeriodType}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('GSTR-1 data exported successfully!');
  };

  const handleExportGstr3B = () => {
    let csv = 'GST Returns Form GSTR-3B Summary\n';
    csv += `Period,${selectedPeriodType === 'monthly' ? months.find(m => m.value === selectedMonth)?.label : selectedPeriodType === 'quarterly' ? 'Quarter ' + selectedQuarter : 'Full Year'} ${selectedYear}\n\n`;
    csv += 'Section,Taxable Value (Rs.),Integrated Tax (IGST) (Rs.),Central Tax (CGST) (Rs.),State Tax (SGST) (Rs.),Total Tax Amount (Rs.)\n';
    csv += `3.1 Outward supplies (Sales),${totalTaxableSales.toFixed(2)},${totalSalesIgst.toFixed(2)},${totalSalesCgst.toFixed(2)},${totalSalesSgst.toFixed(2)},${totalOutputGst.toFixed(2)}\n`;
    csv += `4. Eligible ITC (Purchases),${totalTaxablePurchases.toFixed(2)},${totalPurchasesIgst.toFixed(2)},${totalPurchasesCgst.toFixed(2)},${totalPurchasesSgst.toFixed(2)},${totalInputGst.toFixed(2)}\n\n`;
    csv += `Net Tax Payable / Refund, ,${(totalSalesIgst - totalPurchasesIgst).toFixed(2)},${(totalSalesCgst - totalPurchasesCgst).toFixed(2)},${(totalSalesSgst - totalPurchasesSgst).toFixed(2)},${netGstPayable.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `GSTR-3B_Summary_${selectedPeriodType}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('GSTR-3B summary exported successfully!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-maroon flex items-center gap-2">
            <Landmark className="h-8 w-8 text-saffron" /> GST Automation & Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Generate compliance metrics, GSTR-1, and GSTR-3B data sheets automatically.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" className="border-gold text-maroon">
            <Printer className="h-4 w-4 mr-1.5" /> Print Report
          </Button>
        </div>
      </div>

      {/* Report filters */}
      <Card className="border-2 border-gold shadow-sm print:hidden">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-maroon uppercase tracking-wide">Period Type</label>
            <Select 
              value={selectedPeriodType} 
              onValueChange={(val: any) => setSelectedPeriodType(val)}
            >
              <SelectTrigger className="border-gold bg-white dark:bg-gray-800">
                <SelectValue placeholder="Select period type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly Returns</SelectItem>
                <SelectItem value="quarterly">Quarterly Returns</SelectItem>
                <SelectItem value="yearly">Annual Returns</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-maroon uppercase tracking-wide">Filing Year</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="border-gold bg-white dark:bg-gray-800">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedPeriodType === 'monthly' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-maroon uppercase tracking-wide">Return Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="border-gold bg-white dark:bg-gray-800">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedPeriodType === 'quarterly' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-maroon uppercase tracking-wide">Filing Quarter</label>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger className="border-gold bg-white dark:bg-gray-800">
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  {quarters.map(q => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visual Aggregates Print Header */}
      <div className="hidden print:block text-center space-y-2 border-b-2 border-slate-300 pb-4">
        <h2 className="text-xl font-bold text-slate-800">GUJARAT ART & CRAFTS</h2>
        <p className="text-sm font-semibold">GST SUMMARY RETURNS REPORT</p>
        <p className="text-xs text-slate-500">
          Period: {selectedPeriodType === 'monthly' ? months.find(m => m.value === selectedMonth)?.label : selectedPeriodType === 'quarterly' ? 'Quarter ' + selectedQuarter : 'Full Year'} {selectedYear}
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 border-gold shadow-md">
          <CardHeader className="py-4 bg-amber-50/10 border-b border-gold/10">
            <CardTitle className="text-maroon text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-600" /> Outward Sales Liability
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Taxable Sales Value:</span>
              <span className="font-bold">{formatCurrency(totalTaxableSales)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">CGST (Local Out):</span>
              <span className="font-semibold">{formatCurrency(totalSalesCgst)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">SGST (Local Out):</span>
              <span className="font-semibold">{formatCurrency(totalSalesSgst)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">IGST (Inter-state Out):</span>
              <span className="font-semibold">{formatCurrency(totalSalesIgst)}</span>
            </div>
            <div className="flex justify-between text-maroon text-base pt-2 border-t border-gold/10 font-bold">
              <span>Total Output Tax:</span>
              <span>{formatCurrency(totalOutputGst)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gold shadow-md">
          <CardHeader className="py-4 bg-amber-50/10 border-b border-gold/10">
            <CardTitle className="text-maroon text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="h-4 w-4 text-blue-600" /> Input Tax Credits (ITC)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Taxable Purchase Value:</span>
              <span className="font-bold">{formatCurrency(totalTaxablePurchases)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">CGST (Local In):</span>
              <span className="font-semibold">{formatCurrency(totalPurchasesCgst)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">SGST (Local In):</span>
              <span className="font-semibold">{formatCurrency(totalPurchasesSgst)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">IGST (Inter-state In):</span>
              <span className="font-semibold">{formatCurrency(totalPurchasesIgst)}</span>
            </div>
            <div className="flex justify-between text-blue-600 text-base pt-2 border-t border-gold/10 font-bold">
              <span>Total Eligible ITC:</span>
              <span>{formatCurrency(totalInputGst)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 border-gold shadow-md ${isPayable ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-600'}`}>
          <CardHeader className="py-4 bg-amber-50/10 border-b border-gold/10">
            <CardTitle className="text-maroon text-sm font-bold uppercase tracking-wider">
              Net Returns Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase">Net Status</p>
              <h3 className={`text-2xl font-extrabold ${isPayable ? 'text-red-600' : 'text-green-600'}`}>
                {isPayable ? 'GST Payable' : 'ITC Receivable (Carry Forward)'}
              </h3>
            </div>
            <div className="flex justify-between items-center text-sm font-bold border-t border-gold/10 pt-3">
              <span>Net Tax Liability:</span>
              <span className={`text-base ${isPayable ? 'text-red-500' : 'text-green-600'}`}>
                {formatCurrency(Math.abs(netGstPayable))}
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-gray-900/50 p-2.5 rounded border border-gold/10 flex gap-1.5 text-[10px] text-slate-500 leading-normal">
              <Info className="h-4 w-4 text-maroon flex-shrink-0" />
              <span>Net liability is aggregates of Output sales taxes liability minus Input purchase tax credits.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Return sheets details */}
      <div className="grid grid-cols-1 gap-6">
        {/* GSTR-3B Return Statement */}
        <Card className="border-2 border-gold shadow-md">
          <CardHeader className="bg-amber-50/20 border-b border-gold/20 flex flex-col md:flex-row md:items-center md:justify-between py-4 print:py-2">
            <div>
              <CardTitle className="text-maroon text-base flex items-center gap-1.5">
                <FileText className="h-5 w-5 text-saffron" /> GSTR-3B Data Return Sheet
              </CardTitle>
              <CardDescription>Consolidated inward and outward tax summary required for filing Form GSTR-3B.</CardDescription>
            </div>
            <Button onClick={handleExportGstr3B} variant="outline" className="border-gold text-maroon text-xs h-8 print:hidden">
              <Download className="h-3.5 w-3.5 mr-1" /> Export GSTR-3B (CSV)
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-gray-900 border-b border-gold/20">
                <TableRow>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200">Return Section & Category</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Taxable Value (₹)</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Integrated Tax (IGST) (₹)</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Central Tax (CGST) (₹)</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">State Tax (SGST) (₹)</TableHead>
                  <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Total GST Amount (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="font-semibold text-slate-800">3.1 Outward Taxable Supplies (Output Sales)</TableCell>
                  <TableCell className="text-right font-mono font-bold">{formatCurrency(totalTaxableSales)}</TableCell>
                  <TableCell className="text-right font-mono text-slate-600">{formatCurrency(totalSalesIgst)}</TableCell>
                  <TableCell className="text-right font-mono text-slate-600">{formatCurrency(totalSalesCgst)}</TableCell>
                  <TableCell className="text-right font-mono text-slate-600">{formatCurrency(totalSalesSgst)}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-maroon">{formatCurrency(totalOutputGst)}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-transparent border-b">
                  <TableCell className="font-semibold text-slate-800">4. Eligible Input Tax Credit (ITC Purchases)</TableCell>
                  <TableCell className="text-right font-mono font-bold">{formatCurrency(totalTaxablePurchases)}</TableCell>
                  <TableCell className="text-right font-mono text-slate-600">{formatCurrency(totalPurchasesIgst)}</TableCell>
                  <TableCell className="text-right font-mono text-slate-600">{formatCurrency(totalPurchasesCgst)}</TableCell>
                  <TableCell className="text-right font-mono text-slate-600">{formatCurrency(totalPurchasesSgst)}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-blue-600">{formatCurrency(totalInputGst)}</TableCell>
                </TableRow>
                <TableRow className="bg-amber-50/10 dark:bg-gray-900/30 font-bold hover:bg-transparent">
                  <TableCell className="text-maroon">Net Settlement Liability</TableCell>
                  <TableCell className="text-right font-mono">-</TableCell>
                  <TableCell className="text-right font-mono text-slate-800 dark:text-slate-200">{formatCurrency(totalSalesIgst - totalPurchasesIgst)}</TableCell>
                  <TableCell className="text-right font-mono text-slate-800 dark:text-slate-200">{formatCurrency(totalSalesCgst - totalPurchasesCgst)}</TableCell>
                  <TableCell className="text-right font-mono text-slate-800 dark:text-slate-200">{formatCurrency(totalSalesSgst - totalPurchasesSgst)}</TableCell>
                  <TableCell className={`text-right font-mono text-base ${isPayable ? 'text-red-500' : 'text-green-600'}`}>
                    {formatCurrency(netGstPayable)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* GSTR-1 Sales Invoice Register */}
        <Card className="border-2 border-gold shadow-md">
          <CardHeader className="bg-amber-50/20 border-b border-gold/20 flex flex-col md:flex-row md:items-center md:justify-between py-4 print:py-2">
            <div>
              <CardTitle className="text-maroon text-base flex items-center gap-1.5">
                <FileText className="h-5 w-5 text-saffron" /> GSTR-1 Sales Invoice Register
              </CardTitle>
              <CardDescription>B2B and B2C sales invoice records required for Form GSTR-1 details upload.</CardDescription>
            </div>
            <Button onClick={handleExportGstr1} variant="outline" className="border-gold text-maroon text-xs h-8 print:hidden">
              <Download className="h-3.5 w-3.5 mr-1" /> Export GSTR-1 (CSV)
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingSales ? (
              <div className="text-center py-6 text-xs text-slate-500">Loading sales invoices...</div>
            ) : salesSummary.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">No sales recorded for this period.</div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-gray-900 border-b border-gold/20">
                  <TableRow>
                    <TableHead className="font-bold text-slate-800 dark:text-slate-200">Invoice No.</TableHead>
                    <TableHead className="font-bold text-slate-800 dark:text-slate-200">Date</TableHead>
                    <TableHead className="font-bold text-slate-800 dark:text-slate-200">Party Name</TableHead>
                    <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-center">Party GSTIN</TableHead>
                    <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Taxable Value (₹)</TableHead>
                    <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">CGST (₹)</TableHead>
                    <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">SGST (₹)</TableHead>
                    <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">IGST (₹)</TableHead>
                    <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-right">Invoice Value (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesSummary.map(s => (
                    <TableRow key={s.id.toString()} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono font-bold text-xs">{s.invoiceNumber}</TableCell>
                      <TableCell className="text-xs text-slate-500">{s.date}</TableCell>
                      <TableCell className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-40">{s.customerName}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-xs">
                        {s.customerGst ? (
                          <Badge variant="outline" className="border-gold font-bold text-[10px] uppercase">{s.customerGst}</Badge>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-semibold italic">Unregistered</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(s.taxableValue)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-600">{formatCurrency(s.cgst)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-600">{formatCurrency(s.sgst)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-600">{formatCurrency(s.igst)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-maroon">{formatCurrency(s.totalValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GstReports;
