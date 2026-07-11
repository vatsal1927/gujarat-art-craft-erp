export interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  productCode?: string;
  productImage?: string;
  alertScope?: 'RAW_MATERIAL' | 'FINISHED_GOODS';
  alertType:
    | "LOW_STOCK"
    | "OUT_OF_STOCK"
    | "SHORTAGE"
    | "PRODUCTION_REQUIRED"
    | "RAW_MATERIAL_LOW_STOCK"
    | "RAW_MATERIAL_OUT_OF_STOCK"
    | "RAW_MATERIAL_SHORTAGE"
    | "FINISHED_GOODS_LOW_STOCK"
    | "FINISHED_GOODS_OUT_OF_STOCK"
    | "NEGATIVE_STOCK_PREVENTED";
  currentStock: number;
  minStockLevel?: number;
  shortageQty?: number;
  productionRequiredQty?: number;
  unit?: string;
  message: string;
  recipients: string[];
  status: "PENDING" | "OPENED" | "SENT_MANUAL" | "FAILED" | "SKIPPED_DUPLICATE";
  lastSentAt?: string;
  createdAt: string;
}

export function parseWhatsAppNumbers(raw?: string | string[] | null): string[] {
  if (!raw) return [];

  const input = Array.isArray(raw) ? raw.join(",") : String(raw);

  const numbers = input
    .split(/[,\n\/;]+/)
    .map(n => n.trim())
    .filter(Boolean)
    .map(n => n.replace(/\D/g, ""))
    .map(n => {
      if (n.length === 10) return "91" + n;
      if (n.length === 12 && n.startsWith("91")) return n;
      return "";
    })
    .filter(Boolean);

  return Array.from(new Set(numbers));
}

/**
 * Builds the text message template for WhatsApp alerts based on category scope.
 */
export function buildStockAlertMessage(alert: StockAlert): string {
  const unit = alert.unit || 'pcs';
  const name = alert.productName;

  if (alert.alertScope === 'RAW_MATERIAL') {
    const minLevel = alert.minStockLevel || 0;
    const requiredPurchase = Math.max(0, minLevel - alert.currentStock);

    return `🚨 Gujarat Art & Craft ERP Raw Material Alert\n\n` +
           `Material: ${name}\n` +
           `Current Stock: ${alert.currentStock} ${unit}\n` +
           `Minimum Level: ${minLevel} ${unit}\n` +
           `Required Purchase: ${requiredPurchase} ${unit}\n\n` +
           `Please purchase/update raw material stock.\n\n` +
           `- Gujarat Art & Craft ERP`;
  } else {
    // FINISHED_GOODS
    const shortage = alert.shortageQty || alert.productionRequiredQty || 0;
    return `🚨 Gujarat Art & Craft ERP Finished Goods Alert\n\n` +
           `Product: ${name}\n` +
           `Current Stock: ${alert.currentStock} ${unit}\n` +
           `Shortage: ${shortage} ${unit}\n` +
           `Production Required: ${shortage} ${unit}\n\n` +
           `Please arrange production or update finished stock.\n\n` +
           `- Gujarat Art & Craft ERP`;
  }
}

/**
 * Builds the standard wa.me API link.
 */
export function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * Opens WhatsApp link in a new browser tab.
 */
export function openWhatsAppLink(number: string, message: string): void {
  const url = buildWhatsAppUrl(number, message);
  window.open(url, '_blank');
}
