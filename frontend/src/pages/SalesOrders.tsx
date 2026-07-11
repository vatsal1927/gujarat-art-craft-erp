import { useState, useEffect } from 'react';
import { useSalesOrders, useSaveSalesOrder, useDeleteSalesOrder, useProducts, useCustomers, useSaveInvoice, useSettings } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../components/AuthGuard';
import { Plus, Trash, Save, FileText, CheckCircle, XCircle, ShoppingCart, Calendar, Search, MapPin, Phone, User, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SalesOrderRow {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  rate: number;
  amount: number;
  reservedQty: number;
  availableStock: number;
  needProductionQty: number;
}

const SalesOrders = () => {
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const { data: salesOrders = [], isLoading: loadingOrders } = useSalesOrders();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  
  const { mutate: saveOrder, isPending: isSaving } = useSaveSalesOrder();
  const { mutate: deleteOrder } = useDeleteSalesOrder();
  const { mutate: convertToInvoice } = useSaveInvoice();

  const roleName = user?.role && 'Admin' in user.role ? 'Admin' : (user?.role && 'Manager' in user.role ? 'Manager' : 'Staff');
  const isMasterAdmin = user?.role && 'Admin' in user.role; // Master Admin check
  const isReadOnly = roleName === 'Staff';

  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  // Form states
  const [orderNo, setOrderNo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGst, setCustomerGst] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [items, setItems] = useState<SalesOrderRow[]>([]);
  const [status, setStatus] = useState('Draft');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Selected Order for viewing details
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
    if (activeTab === 'form' && !editingOrder) {
      // Auto-generate order number
      const nextNum = salesOrders.length + 1;
      setOrderNo(`SO-${String(nextNum).padStart(4, '0')}`);
      setCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerGst('');
      setOrderDate(new Date().toISOString().split('T')[0]);
      setDeliveryDate('');
      setItems([{
        id: Math.random().toString(),
        productId: '',
        productName: '',
        sku: '',
        qty: 1,
        rate: 0,
        amount: 0,
        reservedQty: 0,
        availableStock: 0,
        needProductionQty: 0
      }]);
      setStatus('Draft');
    }
  }, [activeTab, editingOrder, salesOrders.length]);

  const handleSelectCustomer = (custName: string) => {
    const cust = customers.find(c => c.name === custName);
    if (cust) {
      setCustomerId(cust.id);
      setCustomerName(cust.name);
      setCustomerPhone(cust.phone);
      setCustomerAddress(cust.businessAddress || '');
      setCustomerGst(cust.gstNo);
    } else {
      setCustomerName(custName);
    }
  };

  const handleItemProductChange = (idx: number, prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    const newItems = [...items];
    const currentStock = Number(prod.stock || 0);
    const reserved = Number(prod.reservedStock || 0);
    const available = Math.max(0, currentStock - reserved);

    newItems[idx] = {
      ...newItems[idx],
      productId: prod.id,
      productName: prod.vigat,
      sku: prod.hsnCode || '5609',
      rate: prod.rate,
      availableStock: available,
      amount: newItems[idx].qty * prod.rate
    };
    setItems(newItems);
  };

  const handleItemQtyChange = (idx: number, qty: number) => {
    const newItems = [...items];
    newItems[idx] = {
      ...newItems[idx],
      qty: Math.max(1, qty),
      amount: Math.max(1, qty) * newItems[idx].rate
    };
    setItems(newItems);
  };

  const handleItemRateChange = (idx: number, rate: number) => {
    const newItems = [...items];
    newItems[idx] = {
      ...newItems[idx],
      rate: Math.max(0, rate),
      amount: newItems[idx].qty * Math.max(0, rate)
    };
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([...items, {
      id: Math.random().toString(),
      productId: '',
      productName: '',
      sku: '',
      qty: 1,
      rate: 0,
      amount: 0,
      reservedQty: 0,
      availableStock: 0,
      needProductionQty: 0
    }]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateGst = () => {
    const gstRate = settings?.defaultGstRate || 18;
    return (calculateSubtotal() * gstRate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGst();
  };

  const handleEditClick = (order: any) => {
    if (isReadOnly) {
      toast.error("Read-only access: Staff cannot edit Sales Orders");
      return;
    }
    setEditingOrder(order);
    setOrderNo(order.orderNo);
    setCustomerId(order.customerId);
    setCustomerName(order.customerName);
    setCustomerPhone(order.customerPhone || '');
    setCustomerAddress(order.customerAddress || '');
    setCustomerGst(order.customerGst || '');
    setOrderDate(order.orderDate);
    setDeliveryDate(order.deliveryDate);
    setItems(order.items.map((it: any) => ({
      ...it,
      id: Math.random().toString()
    })));
    setStatus(order.status);
    setActiveTab('form');
  };

  const handleSaveOrder = () => {
    if (isReadOnly) {
      toast.error("Read-only access: Staff cannot save Sales Orders");
      return;
    }
    if (!customerName || !deliveryDate || items.some(it => !it.productId)) {
      toast.error("Please fill in all required fields and add items");
      return;
    }

    const payload = {
      id: editingOrder?.id || `SO-${Date.now()}`,
      orderNo,
      customerId,
      customerName,
      customerPhone,
      customerAddress,
      customerGst,
      orderDate,
      deliveryDate,
      items: items.map(it => ({
        productId: it.productId,
        productName: it.productName,
        sku: it.sku,
        qty: it.qty,
        rate: it.rate,
        amount: it.amount,
        reservedQty: it.reservedQty || 0,
        availableStock: it.availableStock || 0,
        needProductionQty: it.needProductionQty || 0
      })),
      subtotal: calculateSubtotal(),
      gst: calculateGst(),
      grandTotal: calculateTotal(),
      paymentStatus: 'Unpaid',
      status,
      createdBy: editingOrder?.createdBy || user?.name || 'System',
      createdAt: editingOrder?.createdAt || new Date().toISOString(),
      updatedBy: user?.name || 'System',
      updatedAt: new Date().toISOString()
    };

    saveOrder(payload, {
      onSuccess: () => {
        toast.success(editingOrder ? "Sales Order updated successfully" : "Sales Order created successfully");
        setActiveTab('list');
        setEditingOrder(null);
      },
      onError: (err) => {
        toast.error("Failed to save Sales Order");
        console.error(err);
      }
    });
  };

  const handleStatusChange = (order: any, newStatus: string) => {
    if (isReadOnly) {
      toast.error("Read-only access: Staff cannot change status");
      return;
    }
    const updatedOrder = {
      ...order,
      status: newStatus
    };
    saveOrder(updatedOrder, {
      onSuccess: () => {
        toast.success(`Sales Order status updated to ${newStatus}`);
        if (selectedOrder && selectedOrder.id === order.id) {
          setSelectedOrder(updatedOrder);
        }
      }
    });
  };

  const handleConvertToInvoiceClick = (order: any) => {
    if (isReadOnly) {
      toast.error("Read-only access: Staff cannot convert to Invoice");
      return;
    }

    const defaultGstRate = settings?.defaultGstRate || 18;
    const businessInfo = settings?.businessInfo || "Gujarat Art & Crafts";

    const customerInfo = {
      name: order.customerName,
      businessAddress: order.customerAddress || '',
      taxId: `${order.customerPhone || ''}|${order.customerGst || ''}|SGST_CGST||||0|0|${order.grandTotal}|${order.grandTotal}|0|${order.grandTotal}`
    };

    const backendProducts: [string, bigint, bigint][] = order.items.map((it: any) => [
      `${it.productName}|${it.sku || '5609'}`,
      BigInt(it.qty),
      BigInt(Math.round(it.rate * 100))
    ]);

    convertToInvoice({
      businessInfo,
      customerInfo,
      products: backendProducts,
      totalAmount: order.grandTotal,
      paidAmount: 0
    }, {
      onSuccess: () => {
        // Update status of sales order to Delivered
        const updated = {
          ...order,
          status: 'Delivered',
          paymentStatus: 'Unpaid'
        };
        saveOrder(updated, {
          onSuccess: () => {
            toast.success("Converted to Invoice successfully! Invoice created & order delivered.");
            setSelectedOrder(null);
          }
        });
      },
      onError: (err) => {
        toast.error("Failed to convert Sales Order to Invoice");
        console.error(err);
      }
    });
  };

  const getStatusBadgeColor = (statusText: string) => {
    switch (statusText) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Partially Reserved': return 'bg-yellow-100 text-yellow-800';
      case 'Reserved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Production Pending': return 'bg-amber-100 text-amber-800';
      case 'Production Started': return 'bg-purple-100 text-purple-800';
      case 'Ready For Delivery': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'Delivered': return 'bg-slate-100 text-slate-800';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = salesOrders.filter(o => {
    const matchesSearch = o.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          o.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-maroon flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-saffron" />
            <span>Sales Orders Module</span>
          </h1>
          <p className="text-sm text-slate-500">Track and manage customer sales orders, reserve stock, and convert to invoices</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'list' ? (
            <Button 
              onClick={() => {
                setEditingOrder(null);
                setActiveTab('form');
              }}
              className="bg-maroon hover:bg-maroon/90 text-white font-bold text-xs"
            >
              <Plus className="h-4 w-4 mr-1" /> Create Order
            </Button>
          ) : (
            <Button 
              onClick={() => setActiveTab('list')}
              variant="outline"
              className="text-xs"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'list' ? (
        <Card className="border-2 border-saffron/20 shadow-md">
          <CardHeader className="bg-slate-50/50 p-4 border-b border-saffron/10 flex flex-col md:flex-row justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800">Sales Orders History</CardTitle>
              <CardDescription className="text-xs">Filter and manage existing sales orders</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search order no or customer..."
                  className="pl-8 text-xs h-9 w-60 border-slate-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="text-xs border border-slate-200 rounded-md px-3 h-9 bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Partially Reserved">Partially Reserved</option>
                <option value="Reserved">Reserved</option>
                <option value="Production Pending">Production Pending</option>
                <option value="Production Started">Production Started</option>
                <option value="Ready For Delivery">Ready For Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingOrders ? (
              <div className="text-center py-10 text-slate-500 text-xs">Loading sales orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-10 text-slate-450 text-xs">No sales orders found matching filters.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead className="font-bold text-xs text-slate-700">Order No</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700">Customer</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700">Order Date</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700">Delivery Date</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 text-right">Items Qty</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 text-right">Total Amount</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700">Status</TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map(order => {
                    const totalQty = order.items.reduce((sum, it) => sum + it.qty, 0);
                    return (
                      <TableRow key={order.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-xs text-maroon">{order.orderNo}</TableCell>
                        <TableCell className="text-xs font-semibold text-slate-800">{order.customerName}</TableCell>
                        <TableCell className="text-xs text-slate-500">{order.orderDate}</TableCell>
                        <TableCell className="text-xs text-slate-500 font-semibold">{order.deliveryDate}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{totalQty} units</TableCell>
                        <TableCell className="text-xs text-right font-bold text-slate-800">₹{order.grandTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-xs">
                          <Badge className={`text-[10px] px-2 py-0.5 border ${getStatusBadgeColor(order.status)}`}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 border-slate-200"
                              onClick={() => setSelectedOrder(order)}
                            >
                              Details
                            </Button>
                            {order.status === 'Draft' && !isReadOnly && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] px-2 text-blue-600 border-blue-100 hover:bg-blue-50"
                                onClick={() => handleEditClick(order)}
                              >
                                Edit
                              </Button>
                            )}
                            {order.status === 'Confirmed' && !isReadOnly && (
                              <Button
                                size="sm"
                                className="h-7 text-[10px] px-2 bg-saffron hover:bg-saffron/90 text-white"
                                onClick={() => handleConvertToInvoiceClick(order)}
                              >
                                Fulfill & Invoice
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-saffron/20 shadow-md">
          <CardHeader className="bg-slate-50/50 p-4 border-b border-saffron/10">
            <CardTitle className="text-sm font-bold text-slate-800">
              {editingOrder ? `Edit Sales Order: ${orderNo}` : 'Create New Sales Order'}
            </CardTitle>
            <CardDescription className="text-xs">Enter customer details, choose order parameters, and add items</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Order No</Label>
                <Input
                  className="text-xs h-9 border-slate-200 bg-slate-50"
                  value={orderNo}
                  readOnly
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-bold">Customer Name <span className="text-red-500">*</span></Label>
                <input
                  list="customers-list"
                  placeholder="Type or select customer name..."
                  className="w-full text-xs h-9 border border-slate-200 rounded-md px-3 bg-white"
                  value={customerName}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                />
                <datalist id="customers-list">
                  {customers.map(c => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Customer Phone</Label>
                <Input
                  placeholder="Enter phone number..."
                  className="text-xs h-9 border-slate-200"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Customer GSTIN</Label>
                <Input
                  placeholder="Enter GST number..."
                  className="text-xs h-9 border-slate-200"
                  value={customerGst}
                  onChange={(e) => setCustomerGst(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Order Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  className="text-xs h-9 border-slate-200"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Expected Delivery Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  className="text-xs h-9 border-slate-200"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Customer Business Address</Label>
              <Input
                placeholder="Enter complete business delivery address..."
                className="text-xs h-9 border-slate-200"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 flex justify-between items-center">
                <span>Order Items</span>
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] border-saffron text-maroon font-semibold"
                    onClick={addItemRow}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                )}
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Grid-based item table with precise column widths */}
                <div className="overflow-x-auto">
                  {/* Header Row */}
                  <div
                    className="bg-slate-50 border-b border-slate-200"
                    style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 105px 160px 120px 150px 160px 56px', minWidth: '951px' }}
                  >
                    <div className="px-3 py-2.5 font-bold text-xs text-slate-700">Product</div>
                    <div className="px-3 py-2.5 font-bold text-xs text-slate-700 text-center">HSN/SKU</div>
                    <div className="px-3 py-2.5 font-bold text-xs text-slate-700 text-center">Qty</div>
                    <div className="px-3 py-2.5 font-bold text-xs text-slate-700 text-right">Rate (₹)</div>
                    <div className="px-3 py-2.5 font-bold text-xs text-slate-700 text-right">Available Stock</div>
                    <div className="px-3 py-2.5 font-bold text-xs text-slate-700 text-right">Amount (₹)</div>
                    <div className="px-3 py-2.5"></div>
                  </div>
                  {/* Item Rows */}
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors"
                      style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 105px 160px 120px 150px 160px 56px', alignItems: 'center', minWidth: '951px' }}
                    >
                      {/* Product */}
                      <div className="px-3 py-2">
                        <select
                          className="w-full text-xs border border-slate-200 rounded-xl px-2 py-2 bg-white h-12"
                          value={item.productId}
                          onChange={(e) => handleItemProductChange(idx, e.target.value)}
                        >
                          <option value="">Select a product...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.vigat}</option>
                          ))}
                        </select>
                      </div>
                      {/* HSN/SKU */}
                      <div className="px-3 py-2">
                        <Input
                          className="w-[105px] min-w-[95px] h-12 text-center text-xs rounded-xl border border-slate-200 bg-white px-3"
                          value={item.sku}
                          readOnly
                        />
                      </div>
                      {/* Qty */}
                      <div className="px-3 py-2">
                        <Input
                          type="number"
                          className="w-[160px] min-w-[140px] h-12 text-center font-semibold text-xs rounded-xl border border-[#E6C36A] bg-white px-3"
                          value={item.qty}
                          onChange={(e) => handleItemQtyChange(idx, parseInt(e.target.value) || 0)}
                        />
                      </div>
                      {/* Rate */}
                      <div className="px-3 py-2">
                        <Input
                          type="number"
                          className="w-[120px] h-12 text-right text-xs rounded-xl border border-slate-200 bg-white px-3"
                          value={item.rate}
                          onChange={(e) => handleItemRateChange(idx, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      {/* Available Stock */}
                      <div className="px-3 py-2 text-right text-xs font-semibold text-slate-500">
                        {item.productId ? `${item.availableStock} pcs` : '-'}
                      </div>
                      {/* Amount */}
                      <div className="px-3 py-2 text-right text-xs font-bold text-slate-800">
                        ₹{item.amount.toFixed(2)}
                      </div>
                      {/* Action */}
                      <div className="px-3 py-2 text-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-650 hover:bg-red-50"
                          onClick={() => removeItemRow(idx)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Totals Section */}
            <div className="flex flex-col md:flex-row justify-between gap-6 pt-4 border-t border-slate-200">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Order Action / Confirm</Label>
                <div className="flex gap-2">
                  <select
                    className="text-xs border border-slate-200 rounded px-3 h-9 bg-white"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Confirmed">Confirmed (Triggers Reservation)</option>
                  </select>
                </div>
                <p className="text-[10px] text-slate-450 italic">Confirming the sales order automatically locks available finished goods stock and triggers production requirement for shortages.</p>
              </div>
              <div className="w-80 space-y-2 bg-slate-50/50 p-4 border border-saffron/10 rounded-lg">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>GST ({settings?.defaultGstRate || 18}%):</span>
                  <span>₹{calculateGst().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-200 pt-2">
                  <span>Grand Total:</span>
                  <span className="text-maroon">₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Form Footer */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  setActiveTab('list');
                  setEditingOrder(null);
                }}
              >
                Cancel
              </Button>
              {!isReadOnly && (
                <Button
                  type="button"
                  onClick={handleSaveOrder}
                  className="bg-maroon hover:bg-maroon/90 text-white font-bold text-xs"
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-1" /> {editingOrder ? 'Update Order' : 'Save Order'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border-2 border-saffron/30 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-maroon text-[#F8F2E8] p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Sales Order: {selectedOrder.orderNo}</h3>
                <p className="text-[11px] text-[#F8F2E8]/80">Status: {selectedOrder.status} | Delivery Date: {selectedOrder.deliveryDate}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="text-[#F8F2E8]/80 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto flex-grow">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg text-xs">
                <div>
                  <span className="text-slate-455 block">Customer</span>
                  <strong className="text-slate-800 font-bold">{selectedOrder.customerName}</strong>
                </div>
                <div>
                  <span className="text-slate-455 block">Phone</span>
                  <strong>{selectedOrder.customerPhone || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-455 block">GSTIN</span>
                  <strong>{selectedOrder.customerGst || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-455 block">Grand Total</span>
                  <strong className="text-maroon font-bold">₹{selectedOrder.grandTotal.toFixed(2)}</strong>
                </div>
                <div className="col-span-2 md:col-span-4 mt-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-450 block">Delivery Address</span>
                  <strong>{selectedOrder.customerAddress || 'N/A'}</strong>
                </div>
              </div>

              {/* Order Reservation Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Order Items Allocation</h4>
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-xs">Product Name</TableHead>
                        <TableHead className="font-bold text-xs text-right">Ordered Qty</TableHead>
                        <TableHead className="font-bold text-xs text-right text-blue-600">Reserved Stock</TableHead>
                        <TableHead className="font-bold text-xs text-right text-orange-600">Need Production</TableHead>
                        <TableHead className="font-bold text-xs text-right">Unit Rate (₹)</TableHead>
                        <TableHead className="font-bold text-xs text-right">Total Amount (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((it: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="text-xs font-semibold">{it.productName}</TableCell>
                          <TableCell className="text-xs text-right font-medium">{it.qty} pcs</TableCell>
                          <TableCell className="text-xs text-right font-bold text-blue-600 bg-blue-50/30">{it.reservedQty} pcs</TableCell>
                          <TableCell className="text-xs text-right font-bold text-orange-600 bg-orange-50/30">{it.needProductionQty} pcs</TableCell>
                          <TableCell className="text-xs text-right">₹{it.rate.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right font-semibold">₹{it.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/80 p-4 border-t border-slate-100 flex flex-wrap justify-between items-center gap-2">
              <div className="flex gap-2">
                {selectedOrder.status === 'Draft' && !isReadOnly && (
                  <Button
                    onClick={() => handleStatusChange(selectedOrder, 'Confirmed')}
                    className="bg-green-600 hover:bg-green-750 text-white text-xs h-9 font-bold"
                  >
                    Confirm & Reserve Stock
                  </Button>
                )}
                {selectedOrder.status !== 'Delivered' && selectedOrder.status !== 'Cancelled' && !isReadOnly && (
                  <Button
                    onClick={() => handleStatusChange(selectedOrder, 'Cancelled')}
                    variant="destructive"
                    className="text-xs h-9 font-bold"
                  >
                    Cancel Order
                  </Button>
                )}
                {(selectedOrder.status === 'Confirmed' || selectedOrder.status === 'Partially Reserved' || selectedOrder.status === 'Reserved' || selectedOrder.status === 'Ready For Delivery') && !isReadOnly && (
                  <Button
                    onClick={() => handleConvertToInvoiceClick(selectedOrder)}
                    className="bg-maroon hover:bg-maroon/90 text-white text-xs h-9 font-bold"
                  >
                    Fulfill & Convert to Invoice
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                className="text-xs h-9"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOrders;
