import { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useInvoiceById, useUpdateInvoice, useInvoices, usePayments, useLogUserAction } from '../hooks/useQueries';
import { calculateCustomerPreviousBalance, formatERPDate } from '../utils/calculations';
import { Button } from '@/components/ui/button';
import { openWhatsAppInvoice } from '../utils/whatsappInvoice';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Printer, Edit, Save, X, Smartphone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '../utils/currencyFormat';
import { parseBusinessInfo } from '../utils/businessInfoParser';
import { numberToWords } from '../utils/numberToWords';
import { toast } from 'sonner';

const ViewInvoice = () => {
  const { id } = useParams({ from: '/invoice/$id' });
  const navigate = useNavigate();
  const { data: invoice, isLoading, error } = useInvoiceById(id ? BigInt(id) : BigInt(0));
  const { mutate: updateInvoice, isPending: isUpdating } = useUpdateInvoice();
  const { data: invoicesList = [] } = useInvoices();
  const { data: paymentsList = [] } = usePayments();
  const { mutate: logUserAction } = useLogUserAction();

  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Invoice not found</p>
        <Button onClick={() => navigate({ to: '/history' })} className="mt-4">
          Back to History
        </Button>
      </div>
    );
  }

  // Parse business and transport info
  const {
    name: businessName,
    address: businessAddress,
    phone: businessPhone,
    gst: businessGst
  } = parseBusinessInfo(invoice.businessInfo);

  // Parse customer info from new backend structure
  const customerName = invoice.customerInfo.name || '';
  const customerBusinessAddress = invoice.customerInfo.businessAddress || '';
  
  // Parse taxId which contains phone|gst|taxType|dcNo|dcDate|transport for backward compatibility
  const taxIdParts = invoice.customerInfo.taxId.split('|');
  const customerPhone = taxIdParts[0] || '';
  const customerGstNo = taxIdParts[1] || '';
  const taxType = taxIdParts[2] || 'CGST_SGST';
  const dcNo = taxIdParts[3] || '';
  const dcDate = taxIdParts[4] || '';
  const transport = taxIdParts[5] || 'Local';

  const formattedDate = formatERPDate(invoice.date);

  // Convert products from backend format, handling HSN split if serialized
  const products = invoice.products.map((p, idx) => {
    const parts = p[0].split('|');
    return {
      id: idx.toString(),
      vigat: parts[0] || '',
      hsnCode: parts[1] || '5609',
      qty: Number(p[1]),
      rate: Number(p[2]) / 100, // Convert from paise to rupees
    };
  });

  const handleEdit = () => {
    // Calculate initial GST percent / discount
    let initGstPercent = 0;
    let initDiscount = 0;
    const sub = products.reduce((sum, p) => sum + (p.qty * p.rate), 0);
    if (invoice.totalAmount > sub) {
      const gstAmt = invoice.totalAmount - sub;
      initGstPercent = sub > 0 ? Math.round((gstAmt / sub) * 100) : 0;
    } else if (invoice.totalAmount < sub) {
      initDiscount = sub - invoice.totalAmount;
    }

    setEditData({
      customerName,
      customerPhone,
      customerGstNo,
      customerBusinessAddress,
      dcNo: '',
      dcDate: '',
      transport,
      products: products.map(p => ({ ...p })),
      discount: initDiscount,
      gstPercent: initGstPercent,
      roundOff: Number.isInteger(invoice.totalAmount),
      taxType,
      paidAmount: invoice.paidAmount !== undefined ? invoice.paidAmount : invoice.totalAmount,
    });
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditData(null);
  };

  const handleSaveEdit = () => {
    const businessInfo = `${businessName}|${businessAddress}|${businessPhone}|${businessGst}`;
    
    // Calculate new total including discount and GST
    const subtotal = editData.products.reduce((sum: number, p: any) => sum + (p.qty * p.rate), 0);
    const discountedAmount = subtotal - editData.discount;
    const gstAmount = (discountedAmount * editData.gstPercent) / 100;
    let total = discountedAmount + gstAmount;
    if (editData.roundOff) total = Math.round(total);

    const histBalance = calculateCustomerPreviousBalance(
      editData.customerName,
      invoice.id,
      invoicesList,
      paymentsList,
      total,
      editData.paidAmount,
      invoice.date
    );

    const customerInfo = {
      name: editData.customerName,
      businessAddress: editData.customerBusinessAddress,
      taxId: `${editData.customerPhone}|${editData.customerGstNo}|${editData.taxType}|||${editData.transport}|${histBalance.previousDue}|${histBalance.advanceBalance}|${total}|${histBalance.totalPayable}|${editData.paidAmount}|${histBalance.finalDueAmount}`
    };
    const backendProducts: [string, bigint, bigint][] = editData.products.map((p: any) => [
      `${p.vigat}|${p.hsnCode || '5609'}`,
      BigInt(Math.round(p.qty)),
      BigInt(Math.round(p.rate * 100)),
    ]);

    updateInvoice(
      {
        id: invoice.id,
        businessInfo,
        customerInfo,
        products: backendProducts,
        totalAmount: total,
        paidAmount: editData.paidAmount,
      },
      {
        onSuccess: () => {
          try {
            const sessionStr = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
            const session = sessionStr ? JSON.parse(sessionStr) : null;
            const username = session?.name || session?.username || 'System';

            logUserAction({
              action: "INVOICE_SNAPSHOT_CREATED",
              details: JSON.stringify({
                invoiceNumber: invoice.invoiceNumber,
                customerName: editData.customerName,
                previousBalance: histBalance.previousDue,
                advanceBalance: histBalance.advanceBalance,
                currentInvoiceTotal: total,
                totalPayable: histBalance.totalPayable,
                paidAmount: editData.paidAmount,
                finalDue: histBalance.finalDueAmount,
                timestamp: Date.now(),
                user: username
              })
            });

            logUserAction({
              action: "PREVIOUS_BALANCE_CALCULATED",
              details: JSON.stringify({
                invoiceNumber: invoice.invoiceNumber,
                customerName: editData.customerName,
                previousBalance: histBalance.previousDue,
                advanceBalance: histBalance.advanceBalance,
                finalDue: histBalance.finalDueAmount,
                timestamp: Date.now(),
                user: username
              })
            });

            if (histBalance.advanceBalance > 0) {
              logUserAction({
                action: "ADVANCE_BALANCE_APPLIED",
                details: JSON.stringify({
                  invoiceNumber: invoice.invoiceNumber,
                  customerName: editData.customerName,
                  advanceApplied: histBalance.advanceBalance,
                  currentInvoiceTotal: total,
                  totalPayable: histBalance.totalPayable,
                  timestamp: Date.now(),
                  user: username
                })
              });
            }
          } catch (e) {
            console.error('Error logging edit snapshot:', e);
          }

          toast.success('Invoice updated successfully');
          setIsEditMode(false);
          setEditData(null);
        },
        onError: (error) => {
          toast.error('Failed to update invoice: ' + error.message);
        },
      }
    );
  };

  const handlePrint = () => {
    try {
      const sessionStr = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
      const session = sessionStr ? JSON.parse(sessionStr) : null;
      const username = session?.name || session?.username || 'System';

      logUserAction({
        action: "INVOICE_REPRINT_FROM_SNAPSHOT",
        details: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          customerName: customerName,
          previousBalance: balanceData.previousDue,
          advanceBalance: balanceData.advanceBalance,
          finalDue: balanceData.finalDueAmount,
          timestamp: Date.now(),
          user: username
        })
      });
    } catch (e) {
      console.error('Error logging reprint:', e);
    }
    window.print();
  };

  const handleSendWhatsApp = () => {
    try {
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

  const handleUpdateProduct = (idx: number, field: string, value: any) => {
    const newProducts = [...editData.products];
    newProducts[idx] = { ...newProducts[idx], [field]: value };
    setEditData({ ...editData, products: newProducts });
  };

  const handleAddRow = () => {
    const newId = (Math.max(...editData.products.map((p: any) => parseInt(p.id) || 0), 0) + 1).toString();
    setEditData({
      ...editData,
      products: [...editData.products, { id: newId, vigat: '', qty: 0, rate: 0 }],
    });
  };

  const handleDeleteProduct = (idx: number) => {
    if (editData.products.length > 1) {
      const newProducts = editData.products.filter((_: any, i: number) => i !== idx);
      setEditData({ ...editData, products: newProducts });
    }
  };

  const displayProducts = isEditMode ? editData.products : products;
  const displayCustomerName = isEditMode ? editData.customerName : customerName;
  const displayCustomerPhone = isEditMode ? editData.customerPhone : customerPhone;
  const displayCustomerGstNo = isEditMode ? editData.customerGstNo : customerGstNo;
  const displayCustomerBusinessAddress = isEditMode ? editData.customerBusinessAddress : customerBusinessAddress;
  const displayDcNo = isEditMode ? editData.dcNo : dcNo;
  const displayDcDate = isEditMode ? editData.dcDate : dcDate;
  const displayTransport = isEditMode ? editData.transport : transport;

  const subtotal = displayProducts.reduce((sum: number, p: any) => sum + (p.qty * p.rate), 0);
  const displayTaxType = isEditMode ? editData.taxType : taxType;

  // Calculate GST & Discount display values
  let displaySubtotal = subtotal;
  let displayGstPercent = 0;
  let displayGstAmount = 0;
  let displayDiscount = 0;
  let displayGrandTotal = invoice.totalAmount;

  if (isEditMode && editData) {
    displayDiscount = editData.discount;
    displayGstPercent = editData.gstPercent;
    const discountedAmount = subtotal - editData.discount;
    displayGstAmount = (discountedAmount * editData.gstPercent) / 100;
    displayGrandTotal = discountedAmount + displayGstAmount;
    if (editData.roundOff) {
      displayGrandTotal = Math.round(displayGrandTotal);
    }
  } else {
    // Reconstruct from saved totalAmount
    if (invoice.totalAmount > subtotal) {
      displayGstAmount = invoice.totalAmount - subtotal;
      displayGstPercent = subtotal > 0 ? Math.round((displayGstAmount / subtotal) * 100) : 0;
    } else if (invoice.totalAmount < subtotal) {
      displayDiscount = subtotal - invoice.totalAmount;
    }
  }

  // Parse snapshot values from customerInfo.taxId (phone|gst|taxType|dcNo|dcDate|transport|prevDue|advBal|total|payable|paid|due)
  const hasSnapshot = !isEditMode && taxIdParts.length > 11 && taxIdParts[6] !== '' && !isNaN(Number(taxIdParts[6]));
  
  const snapshotPreviousDue = hasSnapshot ? Number(taxIdParts[6]) : 0;
  const snapshotAdvanceBalance = hasSnapshot ? Number(taxIdParts[7]) : 0;
  const snapshotCurrentGrandTotal = hasSnapshot ? Number(taxIdParts[8]) : 0;
  const snapshotTotalPayable = hasSnapshot ? Number(taxIdParts[9]) : 0;
  const snapshotPaidAmount = hasSnapshot ? Number(taxIdParts[10]) : 0;
  const snapshotDueAmount = hasSnapshot ? Number(taxIdParts[11]) : 0;

  const displayPaidAmount = isEditMode && editData
    ? editData.paidAmount
    : (hasSnapshot ? snapshotPaidAmount : (invoice.paidAmount !== undefined ? invoice.paidAmount : invoice.totalAmount));

  const balanceData = hasSnapshot ? {
    previousDue: snapshotPreviousDue,
    advanceBalance: snapshotAdvanceBalance,
    currentGrandTotal: snapshotCurrentGrandTotal,
    totalPayable: snapshotTotalPayable,
    currentPaidAmount: snapshotPaidAmount,
    finalDueAmount: snapshotDueAmount
  } : calculateCustomerPreviousBalance(
    customerName,
    invoice.id,
    invoicesList,
    paymentsList,
    displayGrandTotal,
    displayPaidAmount,
    invoice.date
  );

  const displayDueAmount = balanceData.finalDueAmount;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center justify-between no-print">
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/history' })}
          className="border-maroon text-maroon hover:bg-maroon hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to History
        </Button>
        <div className="flex space-x-2">
          {!isEditMode ? (
            <>
              <Button
                onClick={handleEdit}
                className="bg-saffron hover:bg-saffron/90 text-white"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                onClick={handlePrint}
                className="bg-maroon hover:bg-maroon/90 text-white"
              >
                <Printer className="h-4 w-4 mr-2" />
                Reprint
              </Button>
              <Button
                onClick={handleSendWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Send on WhatsApp
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                className="border-gray-400 text-gray-700 hover:bg-gray-100"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Invoice Display */}
      <div id="invoice-content" className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-4 border-maroon print:border-2 print:shadow-none font-sans">
        {/* Header matching the physical book */}
        <div className="bg-white p-6 border-b-2 border-maroon text-maroon flex flex-col items-center rounded-t-lg print:rounded-none">
          <div className="w-full flex justify-between text-xs font-semibold mb-2">
            <div className="flex flex-col space-y-0.5 text-maroon font-bold">
              {(() => {
                const getPhonesList = (phoneStr: string): string[] => {
                  if (!phoneStr) return ['9824092261', '9824434096'];
                  const parts = phoneStr.split(/[,\/]+/).map(p => p.trim()).filter(Boolean);
                  let list = parts.map(p => p.replace(/[^0-9+\s-]/g, '').trim()).filter(p => p.replace(/\D/g, '').length >= 8);
                  if (list.length === 0) return ['9824092261', '9824434096'];
                  if (list.length === 1 && (list[0].includes('9824092261') || list[0].includes('9824434096'))) {
                    return ['9824092261', '9824434096'];
                  }
                  return list;
                };
                return getPhonesList(businessPhone);
              })().map((p, idx) => (
                <div key={idx} className="flex items-center gap-1 text-[11px] leading-tight">
                  <Smartphone className="h-3 w-3 flex-shrink-0" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
            <div className="text-center font-bold text-sm">
              <p>|| શ્રીજી ||</p>
              <p className="tracking-widest uppercase">TAX INVOICE</p>
            </div>
            <div className="text-right text-[10px] font-normal leading-tight hidden md:block">
              <p>Original for receipt</p>
              <p>Duplicate for transporter</p>
              <p>Triplicate for supplier</p>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-center tracking-wider text-maroon font-serif mt-1">
            {businessName.toUpperCase()}
          </h1>
          <p className="text-center text-maroon font-bold text-sm mt-1">Mfg. of : TORAN, LATKAN, HANGING</p>
          <p className="text-center text-maroon text-xs font-semibold mt-1">
            A/26-27, Shreeram Park, Nr. Amikunj Society, Thakkarnagar, Ahmedabad-382350.
          </p>
        </div>

        {/* Metadata Grid */}
        <div className="border-b-2 border-maroon">
          {isEditMode ? (
            <div className="grid grid-cols-1 md:grid-cols-3 text-maroon p-4 gap-4 bg-amber-50/5">
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="editCustomerName" className="font-bold">M/s. (Customer Name)</Label>
                  <Input
                    id="editCustomerName"
                    value={editData.customerName}
                    onChange={(e) => setEditData({ ...editData, customerName: e.target.value })}
                    className="border-gold focus:ring-saffron bg-white dark:bg-gray-900"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editCustomerBusinessAddress" className="font-bold">Address</Label>
                  <Input
                    id="editCustomerBusinessAddress"
                    value={editData.customerBusinessAddress}
                    onChange={(e) => setEditData({ ...editData, customerBusinessAddress: e.target.value })}
                    className="border-gold focus:ring-saffron bg-white dark:bg-gray-900"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="editCustomerPhone" className="font-bold">Customer Phone</Label>
                    <Input
                      id="editCustomerPhone"
                      value={editData.customerPhone}
                      onChange={(e) => setEditData({ ...editData, customerPhone: e.target.value })}
                      className="border-gold focus:ring-saffron bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="editCustomerGst" className="font-bold">Party's GSTIN No.</Label>
                    <Input
                      id="editCustomerGst"
                      value={editData.customerGstNo}
                      onChange={(e) => setEditData({ ...editData, customerGstNo: e.target.value })}
                      className="border-gold focus:ring-saffron bg-white dark:bg-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="editTransport" className="font-bold">Transport</Label>
                  <Input
                    id="editTransport"
                    value={editData.transport}
                    onChange={(e) => setEditData({ ...editData, transport: e.target.value })}
                    className="border-gold focus:ring-saffron bg-white dark:bg-gray-900"
                  />
                </div>
              </div>
            </div>
          ) : (
            // Display Mode
            <div className="grid grid-cols-1 md:grid-cols-3 text-maroon">
              {/* Column 1 & 2: M/s. Details */}
              <div className="md:col-span-2 p-4 md:border-r-2 border-maroon space-y-2">
                <div className="flex gap-2">
                  <span className="font-bold whitespace-nowrap">M/s.</span>
                  <div className="flex-1 border-b border-maroon/40 pb-1 font-semibold text-gray-800 dark:text-white text-base">
                    {displayCustomerName || 'N/A'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold whitespace-nowrap">Address:</span>
                  <div className="flex-1 border-b border-maroon/40 pb-1 text-sm text-gray-700 dark:text-gray-300">
                    {displayCustomerBusinessAddress || 'N/A'}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-2">
                    <span className="font-bold whitespace-nowrap">Phone:</span>
                    <div className="flex-1 border-b border-maroon/40 pb-1 text-sm text-gray-700 dark:text-gray-300">
                      {displayCustomerPhone || 'N/A'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold whitespace-nowrap">GSTIN:</span>
                    <div className="flex-1 border-b border-maroon/40 pb-1 font-semibold text-gray-800 dark:text-white">
                      {displayCustomerGstNo || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3: Bill / Challan Details */}
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between border-b border-maroon/40 pb-1">
                  <span className="font-bold">Bill No.</span>
                  <span className="font-bold text-gray-800 dark:text-white">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between border-b border-maroon/40 pb-1">
                  <span className="font-bold">Dt.</span>
                  <span className="font-semibold text-gray-800 dark:text-white">{formattedDate}</span>
                </div>
                <div className="flex justify-between border-b border-maroon/40 pb-1">
                  <span className="font-bold">Transport</span>
                  <span className="font-semibold text-gray-800 dark:text-white">{displayTransport || 'Local'}</span>
                </div>
                <div className="flex justify-between border-b border-maroon/40 pb-1 text-xs text-gray-500">
                  <span className="font-bold text-gray-500">Created By</span>
                  <span className="font-semibold text-gray-600 dark:text-gray-400">{invoice.creatorName && invoice.creatorName !== 'System' ? invoice.creatorName : 'Master Admin'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Products Table with physical red borders style */}
        <div className="p-4 md:p-6">
          <h2 className="text-xl font-bold text-maroon mb-4 no-print">Product Details</h2>
          <div className="overflow-x-auto border-2 border-maroon rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-amber-50/20 border-b-2 border-maroon">
                  <TableHead className="w-12 text-center font-bold text-maroon border-r border-maroon">No.</TableHead>
                  <TableHead className="font-bold text-maroon border-r border-maroon">Description</TableHead>
                  <TableHead className="w-28 text-center font-bold text-maroon border-r border-maroon">HSN Code</TableHead>
                  <TableHead className="w-20 text-center font-bold text-maroon border-r border-maroon">Qty.</TableHead>
                  <TableHead className="w-28 text-center font-bold text-maroon border-r border-maroon">Rate (₹)</TableHead>
                  <TableHead className="w-32 text-center font-bold text-maroon">Amount (₹)</TableHead>
                  {isEditMode && <TableHead className="w-16 no-print"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayProducts.map((product: any, index: number) => {
                  const amount = product.qty * product.rate;
                  return (
                    <TableRow key={index} className="hover:bg-amber-50 dark:hover:bg-gray-700 border-b border-maroon/60">
                      <TableCell className="text-center font-semibold border-r border-maroon">{index + 1}</TableCell>
                      <TableCell className="border-r border-maroon font-medium text-gray-800 dark:text-white">
                        {isEditMode ? (
                          <Input
                            value={product.vigat}
                            onChange={(e) => handleUpdateProduct(index, 'vigat', e.target.value)}
                            className="border-gold/50 focus:ring-saffron bg-white dark:bg-gray-900"
                          />
                        ) : (
                          product.vigat
                        )}
                      </TableCell>
                      <TableCell className="border-r border-maroon text-center">
                        {isEditMode ? (
                          <Input
                            value={product.hsnCode || ''}
                            onChange={(e) => handleUpdateProduct(index, 'hsnCode', e.target.value)}
                            className="text-center border-gold/50 focus:ring-saffron bg-white dark:bg-gray-900"
                          />
                        ) : (
                          product.hsnCode || '5609'
                        )}
                      </TableCell>
                      <TableCell className="border-r border-maroon text-center">
                        {isEditMode ? (
                          <Input
                            type="number"
                            min="0"
                            value={product.qty || ''}
                            onChange={(e) => handleUpdateProduct(index, 'qty', parseFloat(e.target.value) || 0)}
                            className="text-center border-gold/50 focus:ring-saffron bg-white dark:bg-gray-900"
                          />
                        ) : (
                          product.qty
                        )}
                      </TableCell>
                      <TableCell className="border-r border-maroon text-center">
                        {isEditMode ? (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={product.rate || ''}
                            onChange={(e) => handleUpdateProduct(index, 'rate', parseFloat(e.target.value) || 0)}
                            className="text-center border-gold/50 focus:ring-saffron bg-white dark:bg-gray-900"
                          />
                        ) : (
                          formatCurrency(product.rate)
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-maroon">
                        {formatCurrency(amount)}
                      </TableCell>
                      {isEditMode && (
                        <TableCell className="no-print">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteProduct(index)}
                            disabled={displayProducts.length === 1}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {isEditMode && (
            <Button
              onClick={handleAddRow}
              className="mt-4 bg-saffron hover:bg-saffron/90 text-white no-print"
            >
              Add Row
            </Button>
          )}
        </div>

        {/* Footer Grid matching the physical book */}
        <div className="grid grid-cols-1 md:grid-cols-3 border-t-2 border-maroon text-maroon">
          {/* Left 2 Columns: Terms, Bank Details, Rupees in Words */}
          <div className="md:col-span-2 p-4 md:border-r-2 border-maroon space-y-4 text-xs font-semibold">
            {/* Bank Details */}
            <div className="text-xs border border-maroon/40 p-2 rounded bg-amber-50/10">
              <p className="font-bold underline mb-1">BANK DETAIL</p>
              <div className="grid grid-cols-2 gap-x-2 w-fit">
                <span className="font-bold">Bank Name:</span>
                <span className="font-semibold text-gray-800 dark:text-white">IDBI BANK</span>
                <span className="font-bold">A/c. No.:</span>
                <span className="font-semibold text-gray-800 dark:text-white">1280102000018009</span>
                <span className="font-bold">IFSC Code:</span>
                <span className="font-semibold text-gray-800 dark:text-white">IBKL0001280</span>
              </div>
            </div>

            {/* Business GSTIN */}
            <div className="flex gap-2 text-sm border-t border-maroon/20 pt-2">
              <span className="font-bold">GSTIN No. :</span>
              <span className="font-bold text-gray-800 dark:text-white">24APYPP8111N1Z4</span>
            </div>

            {/* Rupees in Words */}
            <div className="text-sm font-semibold border-t border-maroon/20 pt-2">
              <span className="font-bold block md:inline">Rupees : </span>
              <span className="italic text-gray-800 dark:text-white">
                {numberToWords(displayGrandTotal).replace("INR ", "")}
              </span>
            </div>

            {/* Terms and Conditions */}
            <div className="text-[10px] space-y-1 border-t border-maroon/20 pt-2 leading-relaxed font-normal">
              <p className="font-bold text-maroon">Terms & Conditions:</p>
              <p>1. Any complaint regarding this bill must be made within three days.</p>
              <p>2. Subject to Ahmedabad Jurisdiction.</p>
              <p>3. Our risk & responsibility ceases on delivery or goods on Railway-Transport.</p>
              <p className="font-bold mt-2">E. & O. E.</p>
            </div>
          </div>

          {/* Right Column: Totals and Signature */}
          <div className="p-4 flex flex-col justify-between h-full space-y-6">
            {/* Totals list */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-bold">Sub Total:</span>
                <span className="font-semibold text-gray-800 dark:text-white">{formatCurrency(displaySubtotal)}</span>
              </div>

              {isEditMode ? (
                // Edit controls for tax and discount
                <div className="space-y-3 pt-2 border-t border-maroon/20 no-print">
                  <div className="space-y-1">
                    <Label htmlFor="editDiscount" className="text-xs font-bold">Discount (₹)</Label>
                    <Input
                      id="editDiscount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editData.discount || ''}
                      onChange={(e) => setEditData({ ...editData, discount: parseFloat(e.target.value) || 0 })}
                      className="h-8 border-gold text-xs focus:ring-saffron bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="editGstPercent" className="text-xs font-bold">GST (%)</Label>
                      <Input
                        id="editGstPercent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={editData.gstPercent || ''}
                        onChange={(e) => setEditData({ ...editData, gstPercent: parseFloat(e.target.value) || 0 })}
                        className="h-8 border-gold text-xs focus:ring-saffron bg-white dark:bg-gray-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="editTaxType" className="text-xs font-bold">GST Type</Label>
                      <Select
                        value={editData.taxType}
                        onValueChange={(val) => setEditData({ ...editData, taxType: val })}
                      >
                        <SelectTrigger id="editTaxType" className="h-8 w-full border-gold text-xs focus:ring-saffron bg-white dark:bg-gray-800">
                          <SelectValue placeholder="Select Tax Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CGST_SGST">Local (CGST+SGST)</SelectItem>
                          <SelectItem value="IGST">Inter-state (IGST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {editData.gstPercent > 0 && (
                    editData.taxType === 'IGST' ? (
                      <div className="flex justify-between text-xs font-semibold pt-1">
                        <span>IGST ({editData.gstPercent}%)</span>
                        <span>{formatCurrency(displayGstAmount)}</span>
                      </div>
                    ) : (
                      <div className="space-y-1 text-xs font-semibold pt-1">
                        <div className="flex justify-between">
                          <span>CGST ({editData.gstPercent / 2}%)</span>
                          <span>{formatCurrency(displayGstAmount / 2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SGST ({editData.gstPercent / 2}%)</span>
                          <span>{formatCurrency(displayGstAmount / 2)}</span>
                        </div>
                      </div>
                    )
                  )}

                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="editRoundOff"
                      checked={editData.roundOff}
                      onChange={(e) => setEditData({ ...editData, roundOff: e.target.checked })}
                      className="h-4 w-4 rounded border-gold text-maroon focus:ring-saffron cursor-pointer"
                    />
                    <Label htmlFor="editRoundOff" className="text-xs font-semibold cursor-pointer">
                      Round Off
                    </Label>
                  </div>
                </div>
              ) : (
                // Display totals
                <>
                  {displayDiscount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span className="font-bold">Discount:</span>
                      <span>-{formatCurrency(displayDiscount)}</span>
                    </div>
                  )}

                  {displayGstAmount > 0 && (
                    displayTaxType === 'IGST' ? (
                      <div className="flex justify-between border-t border-maroon/20 pt-1">
                        <span className="font-bold">IGST ({displayGstPercent}%):</span>
                        <span className="font-semibold text-gray-800 dark:text-white">{formatCurrency(displayGstAmount)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between border-t border-maroon/20 pt-1">
                          <span className="font-bold">CGST ({displayGstPercent / 2}%):</span>
                          <span className="font-semibold text-gray-800 dark:text-white">{formatCurrency(displayGstAmount / 2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">SGST ({displayGstPercent / 2}%):</span>
                          <span className="font-semibold text-gray-800 dark:text-white">{formatCurrency(displayGstAmount / 2)}</span>
                        </div>
                      </>
                    )
                  )}

                  <div className="flex justify-between border-t border-maroon/20 pt-1">
                    <span className="font-bold">Round Off:</span>
                    <span className="font-semibold text-gray-800 dark:text-white">
                      {(() => {
                        const subTotalAfterDiscount = displaySubtotal - displayDiscount;
                        const rawTotal = subTotalAfterDiscount + displayGstAmount;
                        const roundedTotal = Math.round(rawTotal);
                        const roundDiff = roundedTotal - rawTotal;
                        return formatCurrency(roundDiff);
                      })()}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="border-t-2 border-maroon pt-2 space-y-2">
              {isEditMode && editData && (
                <div className="space-y-1 pt-1 border-t border-maroon/20 no-print">
                  <Label htmlFor="editPaidAmount" className="text-xs font-bold text-maroon">Paid Amount (₹)</Label>
                  <Input
                    id="editPaidAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editData.paidAmount}
                    onChange={(e) => setEditData({ ...editData, paidAmount: parseFloat(e.target.value) || 0 })}
                    className="h-8 border-gold text-xs focus:ring-saffron bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-maroon/20 space-y-1.5 text-xs font-semibold">
                <div className="flex justify-between">
                  <span>{balanceData.advanceBalance > 0 ? 'Advance Balance:' : 'Previous Balance:'}</span>
                  <span>
                    {balanceData.advanceBalance > 0 
                      ? `-${formatCurrency(balanceData.advanceBalance)}` 
                      : formatCurrency(balanceData.previousDue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Current Invoice Total:</span>
                  <span>{formatCurrency(displayGrandTotal)}</span>
                </div>
                <div className="flex justify-between border-t border-maroon/20 pt-1 font-bold text-maroon text-sm">
                  <span>Total Payable:</span>
                  <span>{formatCurrency(balanceData.totalPayable)}</span>
                </div>
                <div className="flex justify-between text-green-700 dark:text-green-400">
                  <span>Paid Amount:</span>
                  <span>{formatCurrency(displayPaidAmount)}</span>
                </div>
                <div className="flex justify-between text-red-700 dark:text-red-400 font-extrabold text-sm border-t border-maroon/20 pt-1">
                  <span>Due Amount:</span>
                  <span>{formatCurrency(displayDueAmount)}</span>
                </div>
              </div>
            </div>

            {/* Signature Box */}
            <div className="border border-maroon/40 p-2 rounded text-center text-xs font-semibold mt-auto bg-amber-50/10">
              <p>For, GUJARAT ART & CRAFTS</p>
              <div className="h-12 flex items-center justify-center">
                <span className="text-maroon/30 text-[10px] italic">Authorized Signatory</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewInvoice;
