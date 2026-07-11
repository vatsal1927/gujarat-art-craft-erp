import { useState, useEffect } from 'react';
import { SmartDetailDropdown, DropdownItem } from '../components/SmartDetailDropdown';
import { 
  useCustomers, 
  useInvoices, 
  usePaymentsByCustomer, 
  usePayments,
  useCollectPayment,
  usePurchases,
  useVendorPayments,
  useCollectVendorPayment,
  useDashboardStats,
  useLogUserAction
} from '../hooks/useQueries';
import { formatCurrency } from '../utils/currencyFormat';
import { calculateCustomerPreviousBalance, formatERPDate } from '../utils/calculations';
import { formatSafeDate } from '../utils/masterData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Search, 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  FileText, 
  History, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Phone,
  MapPin,
  Truck,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAuth } from '../components/AuthGuard';
import { hasDeptAccess } from '../utils/auth';
import Unauthorized from './Unauthorized';

const Ledger = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as any;
  const { user } = useAuth();

  const canViewSales = hasDeptAccess(user, ['Sales', 'Finance']);
  const canViewPurchase = hasDeptAccess(user, ['Purchase', 'Finance']);
  const canViewStats = hasDeptAccess(user, ['Sales', 'Purchase', 'Finance', 'Inventory']);

  if (!canViewSales && !canViewPurchase) {
    return <Unauthorized />;
  }

  const extractCity = (address: string): string => {
    if (!address) return 'N/A';
    const parts = address.split(',');
    const lastPart = parts[parts.length - 1].trim();
    const cityWithNoZip = lastPart.replace(/[-]?\s*\d+/g, '').replace(/[.\s]+$/g, '').trim();
    if (cityWithNoZip.toLowerCase() === 'gujarat' && parts.length > 1) {
      const nextLastPart = parts[parts.length - 2].trim();
      return nextLastPart.replace(/[-]?\s*\d+/g, '').replace(/[.\s]+$/g, '').trim();
    }
    return cityWithNoZip || 'N/A';
  };

  // ==========================================
  // VENDOR LEDGER STATE & HOOKS (Moved to top to prevent temporal dead zone)
  // ==========================================
  const [vendorNameSearch, setVendorNameSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<{
    name: string;
    phone: string;
    gstNo: string;
    businessAddress: string;
  } | null>(null);

  const { data: allPurchases = [] } = usePurchases({ enabled: canViewPurchase });
  const { data: customersList = [] } = useCustomers({ enabled: canViewSales });

  const localVendors = (() => {
    try {
      return JSON.parse(localStorage.getItem('mock_vendors') || '[]');
    } catch {
      return [];
    }
  })();

  const vendorsList = Array.from(new Set([
    ...allPurchases.map(p => p.vendorName),
    ...localVendors.map((v: any) => v.name)
  ])).map(name => {
    const purchaseMatch = allPurchases.find(p => p.vendorName === name);
    const localMatch = localVendors.find((v: any) => v.name === name);
    return {
      name,
      phone: localMatch?.phone || purchaseMatch?.vendorMobile || '',
      gstNo: localMatch?.gstin || purchaseMatch?.vendorGstNumber || '',
      businessAddress: localMatch?.businessAddress || purchaseMatch?.vendorAddress || ''
    };
  });

  const { data: stats } = useDashboardStats({ enabled: canViewStats });

  // Top-level ledger selector
  const [ledgerType, setLedgerType] = useState<'customer' | 'vendor'>(
    (search.tab === 'vendors' || !canViewSales) ? 'vendor' : 'customer'
  );

  useEffect(() => {
    if (search.tab === 'vendors') {
      setLedgerType('vendor');
      logUserAction({ action: 'VENDOR_LEDGER_OPENED', details: 'Opened vendor ledger view' });
      logUserAction({ action: 'VENDOR_LEDGER_SYNC_CHECKED', details: 'Checked vendor ledger sync status' });
      if (search.vendorName && vendorsList.length > 0) {
        const found = vendorsList.find(v => v.name.trim().toLowerCase() === search.vendorName.trim().toLowerCase());
        if (found) {
          setSelectedVendor(found);
          setVendorNameSearch(found.name);
          logUserAction({ action: 'VENDOR_LEDGER_OPENED', details: `Opened ledger statement for vendor: ${found.name}` });
          logUserAction({ action: 'VENDOR_LEDGER_SYNC_CHECKED', details: `Verified ledger sync for vendor: ${found.name}` });
        }
      }
    } else if (search.tab === 'customers') {
      setLedgerType('customer');
      if (search.customerName && customersList.length > 0) {
        const found = customersList.find(c => c.name.trim().toLowerCase() === search.customerName.trim().toLowerCase());
        if (found) {
          setSelectedCustomer(found);
          setCustomerName(found.name);
        }
      }
    }
  }, [search.tab, search.vendorName, search.customerName, vendorsList.length, customersList.length]);

  // ==========================================
  // CUSTOMER LEDGER STATE & HOOKS
  // ==========================================
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<{
    name: string;
    phone: string;
    gstNo: string;
    businessAddress: string;
  } | null>(null);

  const getCustomerOutstandingAmount = (name: string) => {
    const balanceData = calculateCustomerPreviousBalance(
      name,
      undefined,
      allInvoices,
      paymentsList,
      0,
      0
    );
    return balanceData.previousDue - balanceData.advanceBalance;
  };

  const getVendorOutstandingAmount = (name: string) => {
    const vendorPurchases = allPurchases.filter(p =>
      p.vendorName.trim().toLowerCase() === name.trim().toLowerCase()
    );
    const totalPurchasesAmount = vendorPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalPaidPurchases = vendorPurchases.reduce((sum, p) => sum + p.paidAmount, 0);

    let openingBalance = 0;
    try {
      const mockVendors = JSON.parse(localStorage.getItem('mock_vendors') || '[]');
      const match = mockVendors.find((v: any) => v.name.trim().toLowerCase() === name.trim().toLowerCase());
      if (match && match.openingBalance) {
        openingBalance = Number(match.openingBalance) || 0;
      }
    } catch {}

    return Math.max(0, openingBalance + totalPurchasesAmount - totalPaidPurchases);
  };

  const [customerPaymentAmount, setCustomerPaymentAmount] = useState('');
  const [customerPaymentNotes, setCustomerPaymentNotes] = useState('');

  const { data: allInvoices = [] } = useInvoices({ enabled: canViewSales });
  const { data: paymentsList = [] } = usePayments({ enabled: canViewSales });
  const { data: customerPayments = [], isLoading: loadingCustomerPayments } = usePaymentsByCustomer(selectedCustomer?.name || '', { enabled: canViewSales && !!selectedCustomer });
  const { mutate: collectCustomerPayment, isPending: isCollectingCustomer } = useCollectPayment();
  const { mutate: logUserAction } = useLogUserAction();

  // Filter invoices for selected customer
  const customerInvoices = allInvoices.filter(inv =>
    selectedCustomer && inv.customerInfo.name.trim().toLowerCase() === selectedCustomer.name.trim().toLowerCase()
  );

  const selectedCustomerBalanceData = calculateCustomerPreviousBalance(
    selectedCustomer?.name || '',
    undefined,
    allInvoices,
    paymentsList,
    0,
    0
  );

  const totalSales = customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaidSales = customerInvoices.reduce((sum, inv) => {
    const paid = inv.paidAmount !== undefined ? inv.paidAmount : inv.totalAmount;
    return sum + paid;
  }, 0);
  const totalCustomerOutstanding = selectedCustomerBalanceData.previousDue - selectedCustomerBalanceData.advanceBalance;

  const handleSelectCustomer = (customer: typeof customersList[0]) => {
    setSelectedCustomer({
      name: customer.name,
      phone: customer.phone,
      gstNo: customer.gstNo,
      businessAddress: customer.businessAddress,
    });
    setCustomerName(customer.name);
    setCustomerPaymentAmount('');
    setCustomerPaymentNotes('');
  };

  const handleCollectCustomerPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const amount = parseFloat(customerPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount greater than 0');
      return;
    }

    collectCustomerPayment(
      {
        customerId: selectedCustomer.name,
        amount,
        notes: customerPaymentNotes || 'Manual payment collection',
      },
      {
        onSuccess: () => {
          try {
            const sessionStr = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
            const session = sessionStr ? JSON.parse(sessionStr) : null;
            const username = session?.name || session?.username || 'System';

            // Calculate new balances for logging
            const oldOutstanding = selectedCustomerBalanceData.previousDue - selectedCustomerBalanceData.advanceBalance;
            const newOutstanding = oldOutstanding - amount;
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
            console.error('Error logging manual payment collection:', e);
          }

          toast.success(`Successfully collected ${formatCurrency(amount)} from ${selectedCustomer.name}`);
          setCustomerPaymentAmount('');
          setCustomerPaymentNotes('');
        },
        onError: (err) => {
          toast.error(`Payment collection failed: ${err.message}`);
        },
      }
    );
  };

  const getCustomerStatusBadge = (total: number, paid: number) => {
    const due = total - paid;
    if (due <= 0) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200">Paid</Badge>;
    if (paid > 0) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200">Partially Paid</Badge>;
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200">Unpaid</Badge>;
  };

  const filteredCustomers = customersList.filter(c =>
    c.name.toLowerCase().includes(customerName.toLowerCase()) ||
    c.phone.includes(customerName)
  );

  const [vendorPaymentAmount, setVendorPaymentAmount] = useState('');
  const [vendorPaymentNotes, setVendorPaymentNotes] = useState('');

  const { data: allVendorPayments = [], isLoading: loadingVendorPayments } = useVendorPayments({ enabled: canViewPurchase });
  const { mutate: collectVendorPayment, isPending: isCollectingVendor } = useCollectVendorPayment();

  const vendorPurchases = allPurchases.filter(p =>
    selectedVendor && p.vendorName.trim().toLowerCase() === selectedVendor.name.trim().toLowerCase()
  );

  const vendorPayments = allVendorPayments.filter(vp =>
    selectedVendor && vp.vendorName.trim().toLowerCase() === selectedVendor.name.trim().toLowerCase()
  );

  const totalPurchasesAmount = vendorPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalPaidPurchases = vendorPurchases.reduce((sum, p) => sum + p.paidAmount, 0);

  let selectedVendorOpeningBalance = 0;
  if (selectedVendor) {
    try {
      const mockVendors = JSON.parse(localStorage.getItem('mock_vendors') || '[]');
      const match = mockVendors.find((v: any) => v.name.trim().toLowerCase() === selectedVendor.name.trim().toLowerCase());
      if (match && match.openingBalance) {
        selectedVendorOpeningBalance = Number(match.openingBalance) || 0;
      }
    } catch {}
  }

  const totalVendorOutstanding = Math.max(0, selectedVendorOpeningBalance + totalPurchasesAmount - totalPaidPurchases);

  const handleSelectVendor = (vendor: typeof vendorsList[0]) => {
    setSelectedVendor(vendor);
    setVendorNameSearch(vendor.name);
    setVendorPaymentAmount('');
    setVendorPaymentNotes('');
    logUserAction({ action: 'VENDOR_LEDGER_OPENED', details: `Selected vendor ledger for ${vendor.name}` });
    logUserAction({ action: 'VENDOR_LEDGER_SYNC_CHECKED', details: `Checked vendor ledger sync for ${vendor.name}` });
  };

  const handleCollectVendorPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;

    const amount = parseFloat(vendorPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount greater than 0');
      return;
    }

    collectVendorPayment(
      {
        vendorName: selectedVendor.name,
        amount,
        notes: vendorPaymentNotes || 'Manual payment collection',
      },
      {
        onSuccess: () => {
          toast.success(`Successfully paid ${formatCurrency(amount)} to ${selectedVendor.name}`);
          setVendorPaymentAmount('');
          setVendorPaymentNotes('');
        },
        onError: (err) => {
          toast.error(`Vendor payment recording failed: ${err.message}`);
        },
      }
    );
  };

  const getVendorStatusBadge = (total: number, paid: number) => {
    const due = total - paid;
    if (due <= 0) return <Badge className="bg-green-100 text-green-800 border-green-200">Fully Paid</Badge>;
    if (paid > 0) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Partially Paid</Badge>;
    return <Badge className="bg-red-100 text-red-800 border-red-200">Unpaid</Badge>;
  };

  const filteredVendors = vendorsList.filter(v =>
    v.name.toLowerCase().includes(vendorNameSearch.toLowerCase()) ||
    v.phone.includes(vendorNameSearch)
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-maroon">Account Ledgers</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage customer outstanding dues and vendor/supplier liabilities.</p>
        </div>
      </div>

      {/* Ledger Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/50 p-4 border border-gold/20 rounded-2xl">
        {canViewSales && (
          <div className="flex justify-between items-center bg-white dark:bg-slate-955 p-4 rounded-xl border border-gold/15 shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Receivable (Customers)</p>
              <p className="text-2xl font-black text-maroon dark:text-saffron mt-1">{formatCurrency(stats?.totalOutstandingAmount || 0)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wide">
              Receivable
            </div>
          </div>
        )}
        {canViewPurchase && (
          <div className="flex justify-between items-center bg-white dark:bg-slate-955 p-4 rounded-xl border border-gold/15 shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Payable (Vendors)</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">{formatCurrency(stats?.vendorDue || 0)}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-lg text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wide">
              Payable
            </div>
          </div>
        )}
      </div>

      {/* Top Tabs */}
      <div className="flex justify-start border-b border-gold/30">
        {canViewSales && (
          <button
            onClick={() => {
              setLedgerType('customer');
              navigate({ search: { tab: 'customers' } as any });
            }}
            className={`flex items-center gap-1.5 px-6 py-3 font-semibold text-sm border-b-2 transition-all ${
              ledgerType === 'customer' 
                ? 'border-maroon text-maroon' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-4 w-4" /> Customer Ledger
          </button>
        )}
        {canViewPurchase && (
          <button
            onClick={() => {
              setLedgerType('vendor');
              navigate({ search: { tab: 'vendors' } as any });
              logUserAction({ action: 'VENDOR_LEDGER_OPENED', details: 'Switched to vendor ledger view' });
              logUserAction({ action: 'VENDOR_LEDGER_SYNC_CHECKED', details: 'Verified vendor ledger sync status' });
            }}
            className={`flex items-center gap-1.5 px-6 py-3 font-semibold text-sm border-b-2 transition-all ${
              ledgerType === 'vendor' 
                ? 'border-maroon text-maroon' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="h-4 w-4" /> Vendor Ledger
          </button>
        )}
      </div>

      {/* ========================================================
          CUSTOMER LEDGER SECTION
          ======================================================== */}
      {ledgerType === 'customer' && (
        <div className="space-y-6">
          {/* Customer Search Selector */}
          <Card className="border-2 border-gold shadow-md relative overflow-visible" style={{ position: 'relative', overflow: 'visible' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-maroon text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-saffron" /> Select Customer Account
              </CardTitle>
              <CardDescription>
                Search customer name or phone to view statements and record payments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative max-w-xl">
                <SmartDetailDropdown
                  id="customerSearch"
                  value={customerName}
                  onChange={(val) => {
                    setCustomerName(val);
                    if (selectedCustomer && val !== selectedCustomer.name) {
                      setSelectedCustomer(null);
                    }
                  }}
                  onSelect={handleSelectCustomer}
                  items={(() => {
                    return filteredCustomers.map(c => {
                      const outstanding = getCustomerOutstandingAmount(c.name);
                      return {
                        id: c.id,
                        title: c.name,
                        subtitle: outstanding > 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold border bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900 flex-shrink-0">
                            Due: {formatCurrency(outstanding)}
                          </span>
                        ) : outstanding < 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold border bg-green-50 border-green-200 text-green-700 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900 flex-shrink-0">
                            Adv: {formatCurrency(Math.abs(outstanding))}
                          </span>
                        ) : undefined,
                        details: [
                          { label: 'Phone', value: c.phone || 'N/A' }
                        ],
                        rawData: c
                      };
                    });
                  })()}
                  placeholder="Type customer name or phone..."
                />
              </div>

              {selectedCustomer && (
                <div className="mt-4 bg-[#F8F4E8] border-2 border-[#D4A017] rounded-xl p-4 shadow-md space-y-2.5 animate-in fade-in duration-200 text-xs">
                  <div className="flex justify-between items-center border-b border-[#C89B3C]/30 pb-2">
                    <span className="font-serif font-black text-sm text-[#7A0019]">Customer File: {selectedCustomer.name}</span>
                    {totalCustomerOutstanding > 0 ? (
                      <span className="bg-red-50 border border-red-200 text-red-700 font-bold px-2 py-0.5 rounded text-[10px] dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50">
                        Outstanding: {formatCurrency(totalCustomerOutstanding)}
                      </span>
                    ) : totalCustomerOutstanding < 0 ? (
                      <span className="bg-green-50 border border-green-200 text-green-700 font-bold px-2 py-0.5 rounded text-[10px] dark:bg-green-950/40 dark:text-green-455 dark:border-green-900/50">
                        Advance: {formatCurrency(Math.abs(totalCustomerOutstanding))}
                      </span>
                    ) : (
                      <span className="bg-green-50 border border-green-200 text-green-700 font-bold px-2 py-0.5 rounded text-[10px] dark:bg-green-950/40 dark:text-green-450 dark:border-green-900/50">
                        Fully Settled
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[#3A1F12] font-semibold">
                    <div>
                      <span className="text-slate-500 font-medium block">Phone / Mobile</span>
                      <span>{selectedCustomer.phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">GSTIN</span>
                      <span className="font-mono">{selectedCustomer.gstNo || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Receivables State</span>
                      <span className="text-maroon font-bold">
                        {totalCustomerOutstanding > 0 ? 'Dues Pending' : totalCustomerOutstanding < 0 ? 'Advance Credit' : 'Clear'}
                      </span>
                    </div>
                    <div className="md:col-span-3 border-t border-dashed border-[#C89B3C]/20 pt-2">
                      <span className="text-slate-500 font-medium block">Billing Address</span>
                      <span>{selectedCustomer.businessAddress || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedCustomer ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Summary Statements */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="border border-gold shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-semibold uppercase text-slate-500">Total Invoiced</CardTitle>
                      <TrendingUp className="h-4 w-4 text-maroon" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="text-xl font-bold text-maroon">{formatCurrency(totalSales)}</div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{customerInvoices.length} invoices generated</p>
                    </CardContent>
                  </Card>

                  <Card className="border border-gold shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-semibold uppercase text-slate-500">Total Collected</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="text-xl font-bold text-green-600">{formatCurrency(totalPaidSales)}</div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Sattled collections</p>
                    </CardContent>
                  </Card>

                  <Card className={`border shadow-sm ${totalCustomerOutstanding > 0 ? 'border-red-300 bg-red-50/10' : totalCustomerOutstanding < 0 ? 'border-green-300 bg-green-50/10' : 'border-gold'}`}>
                    <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-semibold uppercase text-slate-500">
                        {totalCustomerOutstanding >= 0 ? 'Outstanding Balance' : 'Advance Balance'}
                      </CardTitle>
                      <AlertCircle className={`h-4 w-4 ${totalCustomerOutstanding > 0 ? 'text-red-500' : totalCustomerOutstanding < 0 ? 'text-green-600' : 'text-slate-450'}`} />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className={`text-xl font-bold ${totalCustomerOutstanding > 0 ? 'text-red-600' : totalCustomerOutstanding < 0 ? 'text-green-600' : 'text-slate-700'}`}>
                        {totalCustomerOutstanding < 0 ? `-${formatCurrency(Math.abs(totalCustomerOutstanding))}` : formatCurrency(totalCustomerOutstanding)}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {totalCustomerOutstanding >= 0 ? 'Pending party balance' : 'Customer advance credit'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-2 border-gold shadow-md">
                  <CardContent className="p-0">
                    <Tabs defaultValue="invoices">
                      <div className="border-b border-gold/20 bg-amber-50/30 px-4 pt-2">
                        <TabsList className="bg-transparent gap-2 h-10 p-0">
                          <TabsTrigger value="invoices" className="rounded-t-lg data-[state=active]:bg-white data-[state=active]:text-maroon font-semibold text-sm">
                            <FileText className="h-4 w-4 mr-1" /> Invoice Ledger
                          </TabsTrigger>
                          <TabsTrigger value="history" className="rounded-t-lg data-[state=active]:bg-white data-[state=active]:text-maroon font-semibold text-sm">
                            <History className="h-4 w-4 mr-1" /> Collection History
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="invoices" className="m-0 p-4">
                        {customerInvoices.length === 0 ? (
                          <div className="text-center py-6 text-slate-500 text-xs">No invoices generated for this client.</div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="border-b border-gold/10">
                                <TableHead className="font-bold text-maroon">Invoice No</TableHead>
                                <TableHead className="font-bold text-maroon">Date</TableHead>
                                <TableHead className="font-bold text-maroon text-right">Invoice Value</TableHead>
                                <TableHead className="font-bold text-maroon text-right">Paid</TableHead>
                                <TableHead className="font-bold text-maroon text-right">Balance Due</TableHead>
                                <TableHead className="font-bold text-maroon text-center">Filing Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {customerInvoices.map(inv => {
                                const paid = inv.paidAmount !== undefined ? inv.paidAmount : inv.totalAmount;
                                const balance = Math.max(0, inv.totalAmount - paid);
                                const date = formatSafeDate(inv);
                                return (
                                  <TableRow key={inv.id.toString()}>
                                    <TableCell className="font-mono font-bold text-xs">{inv.invoiceNumber}</TableCell>
                                    <TableCell>{date}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(inv.totalAmount)}</TableCell>
                                    <TableCell className="text-right font-semibold text-green-600">{formatCurrency(paid)}</TableCell>
                                    <TableCell className={`text-right font-bold ${balance > 0 ? 'text-red-500' : 'text-slate-600'}`}>{formatCurrency(balance)}</TableCell>
                                    <TableCell className="text-center">{getCustomerStatusBadge(inv.totalAmount, paid)}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </TabsContent>

                      <TabsContent value="history" className="m-0 p-4">
                        {loadingCustomerPayments ? (
                          <div className="text-center py-6 text-slate-500 text-xs">Loading payments...</div>
                        ) : customerPayments.length === 0 ? (
                          <div className="text-center py-6 text-slate-500 text-xs">No collections recorded yet.</div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="border-b border-gold/10">
                                <TableHead className="font-bold text-maroon">Receipt ID</TableHead>
                                <TableHead className="font-bold text-maroon">Receipt Date</TableHead>
                                <TableHead className="font-bold text-maroon">Settled Invoice</TableHead>
                                <TableHead className="font-bold text-maroon text-right">Amount (₹)</TableHead>
                                <TableHead className="font-bold text-maroon">Notes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {customerPayments.map(p => {
                                const date = formatSafeDate(p);
                                return (
                                  <TableRow key={p.id.toString()}>
                                    <TableCell className="font-mono text-xs">REC-{p.id.toString()}</TableCell>
                                    <TableCell>{date}</TableCell>
                                    <TableCell className="font-mono text-xs font-bold text-slate-600">{p.invoiceNumber}</TableCell>
                                    <TableCell className="text-right font-bold text-green-600">{formatCurrency(p.amount)}</TableCell>
                                    <TableCell className="text-xs text-slate-500 max-w-xs truncate">{p.notes}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              {/* Action Payment collection */}
              <div className="lg:col-span-1">
                <Card className="border-2 border-gold shadow-md sticky top-24">
                  <CardHeader className="bg-amber-50/30 border-b border-gold/20">
                    <CardTitle className="text-maroon text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-saffron" /> Collect Cash / Payment
                    </CardTitle>
                    <CardDescription>Enter payment values to offset client outstanding.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {totalCustomerOutstanding <= 0 ? (
                      <div className="text-center py-6 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                        <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-1" />
                        <p className="font-bold">
                          {totalCustomerOutstanding < 0 ? 'Customer has advance balance!' : 'Fully settled!'}
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleCollectCustomerPaymentSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="custPayAmt" className="font-semibold text-slate-600">Collection Amount (₹)</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                            <Input
                              id="custPayAmt"
                              type="number"
                              step="0.01"
                              value={customerPaymentAmount}
                              onChange={(e) => setCustomerPaymentAmount(e.target.value)}
                              placeholder={`Max ${totalCustomerOutstanding.toFixed(2)}`}
                              className="border-gold focus:ring-saffron pl-9 font-bold text-base"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="custPayNotes" className="font-semibold text-slate-600">Notes / Remarks</Label>
                          <Input
                            id="custPayNotes"
                            value={customerPaymentNotes}
                            onChange={(e) => setCustomerPaymentNotes(e.target.value)}
                            placeholder="Cash, GPay, Bank transaction ID"
                            className="border-gold focus:ring-saffron text-xs"
                          />
                        </div>
                        <Button type="submit" className="w-full bg-maroon hover:bg-maroon/90 text-white font-bold" disabled={isCollectingCustomer}>
                          {isCollectingCustomer ? 'Processing...' : 'Settle Payment'}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="border-2 border-gold/30 border-dashed p-10 text-center shadow-inner">
              <HelpCircle className="h-10 w-10 mx-auto text-slate-400 mb-2" />
              <h3 className="text-base font-bold text-maroon">No Customer Selected</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">Select a customer account using the selector above to audit recent invoices and collections.</p>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================
          VENDOR LEDGER SECTION
          ======================================================== */}
      {ledgerType === 'vendor' && (
        <div className="space-y-6">
          {/* Vendor Search Selector */}
          <Card className="border-2 border-gold shadow-md relative overflow-visible" style={{ position: 'relative', overflow: 'visible' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-maroon text-lg flex items-center gap-2">
                <Truck className="h-5 w-5 text-saffron" /> Select Supplier Account
              </CardTitle>
              <CardDescription>
                Search supplier/vendor name to view purchase registers, bills, and record payments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative max-w-xl">
                <SmartDetailDropdown
                  id="vendorSearch"
                  value={vendorNameSearch}
                  onChange={(val) => {
                    setVendorNameSearch(val);
                    if (selectedVendor && val !== selectedVendor.name) {
                      setSelectedVendor(null);
                    }
                  }}
                  onSelect={handleSelectVendor}
                  items={(() => {
                    return filteredVendors.map(v => {
                      const payable = getVendorOutstandingAmount(v.name);
                      return {
                        id: v.name,
                        title: v.name,
                        subtitle: payable > 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold border bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900 flex-shrink-0">
                            Payable: {formatCurrency(payable)}
                          </span>
                        ) : undefined,
                        details: [
                          { label: 'Phone', value: v.phone || 'N/A' }
                        ],
                        rawData: v
                      };
                    });
                  })()}
                  placeholder="Type supplier/vendor name..."
                />
              </div>

              {selectedVendor && (
                <div className="mt-4 bg-[#F8F4E8] border-2 border-[#D4A017] rounded-xl p-4 shadow-md space-y-2.5 animate-in fade-in duration-200 text-xs">
                  <div className="flex justify-between items-center border-b border-[#C89B3C]/30 pb-2">
                    <span className="font-serif font-black text-sm text-[#7A0019]">Supplier File: {selectedVendor.name}</span>
                    {totalVendorOutstanding > 0 ? (
                      <span className="bg-amber-50 border border-amber-200 text-amber-700 font-bold px-2 py-0.5 rounded text-[10px] dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50">
                        Payable Outstanding: {formatCurrency(totalVendorOutstanding)}
                      </span>
                    ) : (
                      <span className="bg-green-50 border border-green-200 text-green-700 font-bold px-2 py-0.5 rounded text-[10px] dark:bg-green-950/40 dark:text-green-455 dark:border-green-900/50">
                        No Outstanding Dues
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[#3A1F12] font-semibold">
                    <div>
                      <span className="text-slate-500 font-medium block">Phone / Mobile</span>
                      <span>{selectedVendor.phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">GSTIN</span>
                      <span className="font-mono">{selectedVendor.gstNo || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Payables State</span>
                      <span className="text-[#D4A017] font-bold">{totalVendorOutstanding > 0 ? 'Liabilities Active' : 'Settled'}</span>
                    </div>
                    <div className="md:col-span-3 border-t border-dashed border-[#C89B3C]/20 pt-2">
                      <span className="text-slate-500 font-medium block">Supplier Address</span>
                      <span>{selectedVendor.businessAddress || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedVendor ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Summary Statements */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="border border-gold shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-semibold uppercase text-slate-500">Total Purchased</CardTitle>
                      <TrendingUp className="h-4 w-4 text-maroon" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="text-xl font-bold text-maroon">{formatCurrency(totalPurchasesAmount)}</div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{vendorPurchases.length} bills recorded</p>
                    </CardContent>
                  </Card>

                  <Card className="border border-gold shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-semibold uppercase text-slate-500">Paid Amount</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="text-xl font-bold text-green-600">{formatCurrency(totalPaidPurchases)}</div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Sattled supplier payments</p>
                    </CardContent>
                  </Card>

                  <Card className={`border shadow-sm ${totalVendorOutstanding > 0 ? 'border-red-300 bg-red-50/10' : 'border-gold'}`}>
                    <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-semibold uppercase text-slate-500">Pending Payable</CardTitle>
                      <AlertCircle className={`h-4 w-4 ${totalVendorOutstanding > 0 ? 'text-red-500' : 'text-slate-450'}`} />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className={`text-xl font-bold ${totalVendorOutstanding > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                        {formatCurrency(totalVendorOutstanding)}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Outstanding supplier due</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-2 border-gold shadow-md">
                  <CardContent className="p-0">
                    <Tabs defaultValue="purchases">
                      <div className="border-b border-gold/20 bg-amber-50/30 px-4 pt-2">
                        <TabsList className="bg-transparent gap-2 h-10 p-0">
                          <TabsTrigger value="purchases" className="rounded-t-lg data-[state=active]:bg-white data-[state=active]:text-maroon font-semibold text-sm">
                            <FileText className="h-4 w-4 mr-1" /> Purchase Bills
                          </TabsTrigger>
                          <TabsTrigger value="history" className="rounded-t-lg data-[state=active]:bg-white data-[state=active]:text-maroon font-semibold text-sm">
                            <History className="h-4 w-4 mr-1" /> Payment Outflows
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="purchases" className="m-0 p-4">
                        {vendorPurchases.length === 0 ? (
                          <div className="text-center py-6 text-slate-500 text-xs">No purchase bills found for this vendor.</div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="border-b border-gold/10">
                                <TableHead className="font-bold text-maroon">Bill No.</TableHead>
                                <TableHead className="font-bold text-maroon">Date</TableHead>
                                <TableHead className="font-bold text-maroon text-right">Bill Value</TableHead>
                                <TableHead className="font-bold text-maroon text-right">Paid</TableHead>
                                <TableHead className="font-bold text-maroon text-right">Balance Due</TableHead>
                                <TableHead className="font-bold text-maroon text-center">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {vendorPurchases.map(p => {
                                const balance = Math.max(0, p.totalAmount - p.paidAmount);
                                const date = formatSafeDate(p);
                                return (
                                  <TableRow key={p.id.toString()}>
                                    <TableCell className="font-mono font-bold text-xs">{p.purchaseNumber}</TableCell>
                                    <TableCell>{date}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(p.totalAmount)}</TableCell>
                                    <TableCell className="text-right font-semibold text-green-600">{formatCurrency(p.paidAmount)}</TableCell>
                                    <TableCell className={`text-right font-bold ${balance > 0 ? 'text-red-500' : 'text-slate-600'}`}>{formatCurrency(balance)}</TableCell>
                                    <TableCell className="text-center">{getVendorStatusBadge(p.totalAmount, p.paidAmount)}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </TabsContent>

                      <TabsContent value="history" className="m-0 p-4">
                        {loadingVendorPayments ? (
                          <div className="text-center py-6 text-slate-500 text-xs">Loading payments...</div>
                        ) : vendorPayments.length === 0 ? (
                          <div className="text-center py-6 text-slate-500 text-xs">No payments recorded to this supplier yet.</div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="border-b border-gold/10">
                                <TableHead className="font-bold text-maroon">Payment ID</TableHead>
                                <TableHead className="font-bold text-maroon">Date Paid</TableHead>
                                <TableHead className="font-bold text-maroon">Applied Bill</TableHead>
                                <TableHead className="font-bold text-maroon text-right">Amount (₹)</TableHead>
                                <TableHead className="font-bold text-maroon">Notes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {vendorPayments.map(vp => {
                                const date = formatSafeDate(vp);
                                return (
                                  <TableRow key={vp.id.toString()}>
                                    <TableCell className="font-mono text-xs">VPAY-{vp.id.toString()}</TableCell>
                                    <TableCell>{date}</TableCell>
                                    <TableCell className="font-mono text-xs font-bold text-slate-600">{vp.purchaseNumber}</TableCell>
                                    <TableCell className="text-right font-bold text-green-600">{formatCurrency(vp.amount)}</TableCell>
                                    <TableCell className="text-xs text-slate-500 max-w-xs truncate">{vp.notes}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              {/* Action Payment layout */}
              <div className="lg:col-span-1">
                <Card className="border-2 border-gold shadow-md sticky top-24">
                  <CardHeader className="bg-amber-50/30 border-b border-gold/20">
                    <CardTitle className="text-maroon text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-saffron" /> Pay Out / Settle Bill
                    </CardTitle>
                    <CardDescription>Record cash/bank transfer to offset supplier balance.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {totalVendorOutstanding <= 0 ? (
                      <div className="text-center py-6 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                        <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-1" />
                        <p className="font-bold">Fully settled!</p>
                      </div>
                    ) : (
                      <form onSubmit={handleCollectVendorPaymentSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="vendPayAmt" className="font-semibold text-slate-600">Payment Amount (₹)</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                            <Input
                              id="vendPayAmt"
                              type="number"
                              step="0.01"
                              value={vendorPaymentAmount}
                              onChange={(e) => setVendorPaymentAmount(e.target.value)}
                              placeholder={`Max ${totalVendorOutstanding.toFixed(2)}`}
                              className="border-gold focus:ring-saffron pl-9 font-bold text-base"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="vendPayNotes" className="font-semibold text-slate-600">Notes / Reference</Label>
                          <Input
                            id="vendPayNotes"
                            value={vendorPaymentNotes}
                            onChange={(e) => setVendorPaymentNotes(e.target.value)}
                            placeholder="Bank, Check Number, Cash receipt ID"
                            className="border-gold focus:ring-saffron text-xs"
                          />
                        </div>
                        <Button type="submit" className="w-full bg-maroon hover:bg-maroon/90 text-white font-bold" disabled={isCollectingVendor}>
                          {isCollectingVendor ? 'Recording Payment...' : 'Record Payment Outflow'}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="border-2 border-gold/30 border-dashed p-10 text-center shadow-inner">
              <HelpCircle className="h-10 w-10 mx-auto text-slate-400 mb-2" />
              <h3 className="text-base font-bold text-maroon">No Vendor Selected</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">Select a supplier/vendor account using the selector above to audit outstanding bills and payment flows.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Ledger;
