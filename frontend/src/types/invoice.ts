export interface ProductRow {
  id: string;
  vigat: string;
  qty: number;
  rate: number;
  hsnCode?: string;
  per?: string;
}

export interface InvoiceData {
  invoiceNumber: number;
  date: string;
  customerName: string;
  customerPhone: string;
  customerGstNo?: string;
  customerBusinessAddress?: string;
  products: ProductRow[];
  discount: number;
  gstPercent: number;
  roundOff: boolean;
  paymentTerms?: string;
  orderNo?: string;
  orderDate?: string;
  dispatchDocNo?: string;
  dispatchThrough?: string;
  destination?: string;
  lrRrNo?: string;
  vehicleNo?: string;
  termsOfDelivery?: string;
}
