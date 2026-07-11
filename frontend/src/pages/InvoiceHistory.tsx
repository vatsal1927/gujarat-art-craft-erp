import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInvoices, useDeleteInvoice } from '../hooks/useQueries';
import { formatCurrency } from '../utils/currencyFormat';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { openWhatsAppInvoice } from '../utils/whatsappInvoice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Eye, Trash2, Search, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '../components/AuthGuard';
import { formatERPDateTime } from '../utils/calculations';
import { hasDeptAccess } from '../utils/auth';
import Unauthorized from './Unauthorized';

const InvoiceHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSendWhatsApp = (invoice: any) => {
    try {
      const customerName = invoice.customerInfo?.name || 'N/A';
      const taxIdParts = (invoice.customerInfo?.taxId || '').split('|');
      const customerPhone = taxIdParts[0] || '';
      const formattedDate = formatERPDateTime(invoice.date);
      const invoiceLink = `${import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin}/invoice/${invoice.id}`;

      openWhatsAppInvoice({
        invoiceNumber: invoice.invoiceNumber,
        customerName: customerName,
        customerPhone: customerPhone,
        totalAmount: invoice.totalAmount,
        date: formattedDate,
        invoiceLink: invoiceLink,
      });
    } catch (error) {
      console.error(error);
      alert("Customer phone number is missing or invalid.");
    }
  };

  const canView = !!(user && hasDeptAccess(user, ['Sales', 'Finance']));
  const canDelete = !!(user && hasDeptAccess(user, ['Sales', 'Finance'], 'canDelete'));

  const { data: invoices, isLoading, error } = useInvoices({ enabled: canView && !!user });
  const { mutate: deleteInvoice } = useDeleteInvoice();
  const isAdmin = !!(user?.role && 'Admin' in user.role);

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!user) return null;
  if (!canView) {
    return <Unauthorized />;
  }

  const handleDelete = (id: bigint) => {
    deleteInvoice(id, {
      onSuccess: () => {
        toast.success('Invoice deleted successfully');
      },
      onError: (error) => {
        toast.error('Failed to delete invoice: ' + error.message);
      },
    });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  // Filter invoices
  const filteredInvoices = invoices?.filter((invoice) => {
    // Parse customer info from new backend structure
    const customerName = invoice.customerInfo.name || '';
    const taxIdParts = invoice.customerInfo.taxId.split('|');
    const customerPhone = taxIdParts[0] || '';

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesName = customerName.toLowerCase().includes(searchLower);
      const matchesInvoiceNo = invoice.invoiceNumber.toLowerCase().includes(searchLower);
      const matchesPhone = customerPhone.includes(searchTerm);
      const creatorDisplay = invoice.creatorName && invoice.creatorName !== 'System' ? invoice.creatorName : 'Master Admin';
      const matchesCreator = creatorDisplay.toLowerCase().includes(searchLower);
      if (!matchesName && !matchesInvoiceNo && !matchesPhone && !matchesCreator) return false;
    }

    // Date range filter
    if (startDate || endDate) {
      const invoiceDate = new Date(Number(invoice.date) / 1000000); // Convert nanoseconds to milliseconds
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (invoiceDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (invoiceDate > end) return false;
      }
    }

    return true;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-maroon">Invoice History</h1>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load invoices</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-maroon">Invoice History</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search and Filter */}
      <Card className="border-2 border-gold">
        <CardHeader>
          <CardTitle className="text-maroon flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Customer, Invoice No., or Creator</Label>
              <Input
                id="search"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-gold focus:ring-saffron"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-gold focus:ring-saffron"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-gold focus:ring-saffron"
              />
            </div>
          </div>
          {(searchTerm || startDate || endDate) && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="border-maroon text-maroon hover:bg-maroon hover:text-white"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Invoice Table */}
      <Card className="border-2 border-gold">
        <CardContent className="pt-6">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                {invoices?.length === 0 ? 'No invoices found. Create your first invoice!' : 'No invoices match your search criteria.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-maroon/10 via-saffron/10 to-maroon/10">
                    <TableHead className="font-bold text-maroon">Invoice No.</TableHead>
                    <TableHead className="font-bold text-maroon">Date</TableHead>
                    <TableHead className="font-bold text-maroon">Customer Name</TableHead>
                    <TableHead className="font-bold text-maroon">Phone</TableHead>
                    <TableHead className="font-bold text-maroon">Created By</TableHead>
                    <TableHead className="font-bold text-maroon text-right">Total Amount</TableHead>
                    <TableHead className="font-bold text-maroon text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const customerName = invoice.customerInfo.name || 'N/A';
                    const taxIdParts = invoice.customerInfo.taxId.split('|');
                    const customerPhone = taxIdParts[0] || 'N/A';
                    const formattedDate = formatERPDateTime(invoice.date);

                    return (
                      <TableRow key={invoice.id.toString()} className="hover:bg-amber-50 dark:hover:bg-gray-700">
                        <TableCell className="font-semibold text-maroon">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{formattedDate}</TableCell>
                        <TableCell>{customerName}</TableCell>
                        <TableCell>{customerPhone}</TableCell>
                        <TableCell className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {invoice.creatorName && invoice.creatorName !== 'System' ? invoice.creatorName : 'Master Admin'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-maroon">
                          {formatCurrency(invoice.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate({ to: '/invoice/$id', params: { id: invoice.id.toString() } })}
                              className="border-saffron text-saffron hover:bg-saffron hover:text-white"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendWhatsApp(invoice)}
                              className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                            >
                              WhatsApp
                            </Button>
                            {(isAdmin || canDelete) && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete invoice {invoice.invoiceNumber}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(invoice.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceHistory;
