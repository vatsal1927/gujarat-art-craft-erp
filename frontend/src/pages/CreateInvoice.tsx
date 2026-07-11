import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import BusinessHeader from '../components/BusinessHeader';
import { Smartphone } from 'lucide-react';
import InvoiceMetadata from '../components/InvoiceMetadata';
import CustomerInfo from '../components/CustomerInfo';
import ProductTable from '../components/ProductTable';
import InvoiceTotals from '../components/InvoiceTotals';
import ActionButtons from '../components/ActionButtons';
import { useSaveInvoice, useSettings, useNextInvoiceNumber, useProducts, useCustomers, useInvoices, useCollectPayment, usePayments, useLogUserAction } from '../hooks/useQueries';
import { ProductRow } from '../types/invoice';
import { toast } from 'sonner';
import { parseBusinessInfo } from '../utils/businessInfoParser';
import { formatCurrency } from '../utils/currencyFormat';
import { calculateCustomerPreviousBalance } from '../utils/calculations';
import { useAuth } from '../components/AuthGuard';
import { hasDeptAccess } from '../utils/auth';
import Unauthorized from './Unauthorized';

const CreateInvoice = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const canView = hasDeptAccess(user, ['Sales', 'Finance']);
  const canCreate = hasDeptAccess(user, ['Sales', 'Finance'], 'canCreate');

  const { data: invoiceNumber } = useNextInvoiceNumber({ enabled: canView && canCreate });
  const { mutate: saveInvoice, isPending: isSaving } = useSaveInvoice();
  const { mutate: collectPayment } = useCollectPayment();
  const { mutate: logUserAction } = useLogUserAction();
  const { data: settings } = useSettings();
  const { data: productsList } = useProducts({ enabled: canView && canCreate });
  const { data: customersList } = useCustomers({ enabled: canView && canCreate });
  const { data: allInvoices = [] } = useInvoices({ enabled: canView && canCreate });
  const { data: paymentsList = [] } = usePayments({ enabled: canView && canCreate });

  if (!canView || !canCreate) {
    return <Unauthorized />;
  }

  const [businessName, setBusinessName] = useState('Gujarat Art & Crafts');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessGst, setBusinessGst] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstNo, setCustomerGstNo] = useState('');
  const [customerBusinessAddress, setCustomerBusinessAddress] = useState('');
  const [products, setProducts] = useState<ProductRow[]>([
    { id: '1', vigat: '', qty: 0, rate: 0, hsnCode: '5609' }
  ]);
  const [discount, setDiscount] = useState(0);
  const [gstPercent, setGstPercent] = useState(0);
  const [roundOff, setRoundOff] = useState(false);
  const [taxType, setTaxType] = useState('CGST_SGST');
  const [transport, setTransport] = useState('Local');
  const [paidAmount, setPaidAmount] = useState(0);

  // Calculate current grand total reactively
  const subtotal = products.reduce((sum, p) => sum + (p.qty * p.rate), 0);
  const discountedAmount = subtotal - discount;
  const gstAmount = (discountedAmount * gstPercent) / 100;
  const rawTotal = discountedAmount + gstAmount;
  const currentGrandTotal = roundOff ? Math.round(rawTotal) : rawTotal;

  // Dynamic customer previous balance calculations
  const balanceData = calculateCustomerPreviousBalance(
    customerName,
    undefined,
    allInvoices,
    paymentsList,
    currentGrandTotal,
    paidAmount
  );

  // Auto-populate from settings
  useEffect(() => {
    if (settings) {
      if (settings.businessInfo) {
        const { name, address, phone, gst } = parseBusinessInfo(settings.businessInfo);
        setBusinessName(name);
        setBusinessAddress(address);
        setBusinessPhone(phone);
        setBusinessGst(gst);
      }
      if (settings.defaultGstRate > 0) {
        setGstPercent(settings.defaultGstRate);
      }
    } else {
      // Fallback to localStorage
      const savedAddress = localStorage.getItem('businessAddress') || '';
      const savedPhone = localStorage.getItem('businessPhone') || '';
      const savedGst = localStorage.getItem('businessGst') || '';
      setBusinessAddress(savedAddress);
      setBusinessPhone(savedPhone);
      setBusinessGst(savedGst);
    }
  }, [settings]);

  const handleAddRow = () => {
    const newId = (Math.max(...products.map(p => parseInt(p.id) || 0), 0) + 1).toString();
    setProducts([...products, { id: newId, vigat: '', qty: 0, rate: 0, hsnCode: '5609' }]);
  };

  const handleUpdateProduct = (id: string, fieldOrUpdates: keyof ProductRow | Partial<ProductRow>, value?: string | number) => {
    setProducts(prevProducts => prevProducts.map(p => {
      if (p.id === id) {
        if (typeof fieldOrUpdates === 'object') {
          return { ...p, ...fieldOrUpdates };
        } else {
          return { ...p, [fieldOrUpdates]: value } as ProductRow;
        }
      }
      return p;
    }));
  };

  const handleDeleteProduct = (id: string) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleClearInvoice = () => {
    // Calculate total for saving
    const subtotal = products.reduce((sum, p) => sum + (p.qty * p.rate), 0);
    const discountedAmount = subtotal - discount;
    const gstAmount = (discountedAmount * gstPercent) / 100;
    let total = discountedAmount + gstAmount;
    if (roundOff) total = Math.round(total);

    // Prepare data for backend using new CustomerInfo structure
    const businessInfo = `${businessName}|${businessAddress}|${businessPhone}|${businessGst}`;
    const customerInfo = {
      name: customerName,
      businessAddress: customerBusinessAddress,
      taxId: `${customerPhone}|${customerGstNo}|${taxType}|||${transport}|${balanceData.previousDue}|${balanceData.advanceBalance}|${currentGrandTotal}|${balanceData.totalPayable}|${paidAmount}|${balanceData.finalDueAmount}`
    };
    const backendProducts: [string, bigint, bigint][] = products.map(p => [
      `${p.vigat}|${p.hsnCode || '5609'}`,
      BigInt(Math.round(p.qty)),
      BigInt(Math.round(p.rate * 100)) // Store rate in paise
    ]);

    let savedPaid = paidAmount;
    let collectAmount = 0;

    if (balanceData.previousDue > 0) {
      collectAmount = Math.min(paidAmount, balanceData.previousDue);
      savedPaid = Math.max(0, paidAmount - balanceData.previousDue);
    } else if (balanceData.advanceBalance > 0) {
      savedPaid = paidAmount + balanceData.advanceBalance;
    }

    const getUserName = () => {
      try {
        const sessionStr = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          return session.name || session.username || 'System';
        }
      } catch (e) {
        console.error(e);
      }
      return 'System';
    };

    saveInvoice(
      {
        businessInfo,
        customerInfo,
        products: backendProducts,
        totalAmount: total,
        paidAmount: savedPaid
      },
      {
        onSuccess: (newInvoiceNum) => {
          const uName = getUserName();

          // Log INVOICE_SNAPSHOT_CREATED
          logUserAction({
            action: "INVOICE_SNAPSHOT_CREATED",
            details: JSON.stringify({
              invoiceNumber: newInvoiceNum,
              customerName,
              previousBalance: balanceData.previousDue,
              advanceBalance: balanceData.advanceBalance,
              currentInvoiceTotal: currentGrandTotal,
              totalPayable: balanceData.totalPayable,
              paidAmount: paidAmount,
              finalDue: balanceData.finalDueAmount,
              timestamp: Date.now(),
              user: uName
            })
          });

          // Log PREVIOUS_BALANCE_CALCULATED
          logUserAction({
            action: "PREVIOUS_BALANCE_CALCULATED",
            details: JSON.stringify({
              invoiceNumber: newInvoiceNum,
              customerName,
              previousBalance: balanceData.previousDue,
              advanceBalance: balanceData.advanceBalance,
              finalDue: balanceData.finalDueAmount,
              timestamp: Date.now(),
              user: uName
            })
          });

          // Log ADVANCE_BALANCE_APPLIED if any advance balance was applied
          if (balanceData.advanceBalance > 0) {
            logUserAction({
              action: "ADVANCE_BALANCE_APPLIED",
              details: JSON.stringify({
                invoiceNumber: newInvoiceNum,
                customerName,
                advanceApplied: balanceData.advanceBalance,
                currentInvoiceTotal: currentGrandTotal,
                totalPayable: balanceData.totalPayable,
                timestamp: Date.now(),
                user: uName
              })
            });
          }

          if (collectAmount > 0) {
            collectPayment(
              {
                customerId: customerName,
                amount: collectAmount,
                notes: `Collected via Invoice ${newInvoiceNum} Carry Forward`
              },
              {
                onError: (err) => {
                  console.error('Failed to collect carried forward payment:', err);
                }
              }
            );
          }
          toast.success('Invoice saved successfully!');
          // Reset form
          setCustomerName('');
          setCustomerPhone('');
          setCustomerGstNo('');
          setCustomerBusinessAddress('');
          setTransport('Local');
          setProducts([{ id: '1', vigat: '', qty: 0, rate: 0, hsnCode: '5609' }]);
          setDiscount(0);
          setRoundOff(false);
          setTaxType('CGST_SGST');
          setPaidAmount(0);
        },
        onError: (error) => {
          toast.error('Failed to save invoice: ' + error.message);
        },
      }
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto">
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

        <div className="p-6 md:p-8 space-y-6">
          <div className="no-print">
            <BusinessHeader 
              address={businessAddress}
              phone={businessPhone}
              gstNumber={businessGst}
              onAddressChange={setBusinessAddress}
              onPhoneChange={setBusinessPhone}
              onGstChange={setBusinessGst}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t-2 border-gold pt-6">
            <InvoiceMetadata invoiceNumber={invoiceNumber || 'Loading...'} />
            <CustomerInfo 
              customerName={customerName}
              customerPhone={customerPhone}
              customerGstNo={customerGstNo}
              customerBusinessAddress={customerBusinessAddress}
              transport={transport}
              customersList={customersList || []}
              onCustomerNameChange={setCustomerName}
              onCustomerPhoneChange={setCustomerPhone}
              onCustomerGstNoChange={setCustomerGstNo}
              onCustomerBusinessAddressChange={setCustomerBusinessAddress}
              onTransportChange={setTransport}
            />
          </div>

          {/* Print-only customer details section */}
          <div className="hidden print:block border-t-2 border-gold pt-4">
            <div className="space-y-2">
              <div className="flex">
                <span className="font-semibold text-maroon w-32">Customer:</span>
                <span>{customerName}</span>
              </div>
              {customerBusinessAddress && (
                <div className="flex">
                  <span className="font-semibold text-maroon w-32">Address:</span>
                  <span>{customerBusinessAddress}</span>
                </div>
              )}
              {customerPhone && (
                <div className="flex">
                  <span className="font-semibold text-maroon w-32">Phone:</span>
                  <span>{customerPhone}</span>
                </div>
              )}
              {customerGstNo && (
                <div className="flex">
                  <span className="font-semibold text-maroon w-32">GST No.:</span>
                  <span>{customerGstNo}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t-2 border-gold pt-6">
            <ProductTable 
              products={products}
              productsList={productsList || []}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onAddRow={handleAddRow}
            />
          </div>


          <div className="border-t-2 border-gold pt-6">
            <InvoiceTotals 
              products={products}
              discount={discount}
              gstPercent={gstPercent}
              roundOff={roundOff}
              taxType={taxType}
              paidAmount={paidAmount}
              previousDue={balanceData.previousDue}
              advanceBalance={balanceData.advanceBalance}
              onDiscountChange={setDiscount}
              onGstPercentChange={setGstPercent}
              onRoundOffChange={setRoundOff}
              onTaxTypeChange={setTaxType}
              onPaidAmountChange={setPaidAmount}
            />
          </div>

          <div className="no-print border-t-2 border-gold pt-6">
            <ActionButtons 
              onPrint={handlePrint}
              onClear={handleClearInvoice}
              isSaving={isSaving}
            />
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 border-t pt-4 mt-6">
            <p className="font-medium">Thank you for your business!</p>
            <p className="text-xs mt-1">For queries, please contact us at the above number</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
