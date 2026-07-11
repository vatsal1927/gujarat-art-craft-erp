export type InvoiceLike = {
    invoiceNumber?: string | number;
    billNo?: string | number;
    customerName?: string;
    customerPhone?: string;
    phone?: string;
    mobile?: string;
    totalAmount?: number;
    grandTotal?: number;
    total?: number;
    date?: string;
    invoiceDate?: string;
    invoiceLink?: string;
};

export function normalizeIndianPhone(phone?: string | null): string | null {
    if (!phone) return null;

    const digits = String(phone).replace(/\D/g, "");

    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return digits;
    if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;

    return null;
}

export function buildInvoiceWhatsAppMessage(invoice: InvoiceLike): string {
    const invoiceNo = invoice.invoiceNumber || invoice.billNo || "N/A";
    const customerName = invoice.customerName || "Customer";
    const amount = invoice.totalAmount ?? invoice.grandTotal ?? invoice.total ?? 0;
    const date =
        invoice.date ||
        invoice.invoiceDate ||
        new Date().toLocaleDateString("en-IN");

    const invoiceLink = invoice.invoiceLink || "";

    return [
        `Dear ${customerName},`,
        "",
        "Thank you for your order at Gujarat Art & Craft.",
        "Your invoice is now available.",
        "",
        `Invoice No: ${invoiceNo}`,
        `Amount: ₹${amount}`,
        `Date: ${date}`,
        invoiceLink ? `View Invoice: ${invoiceLink}` : "",
        "",
        "For any query, reply on this WhatsApp."
    ]
        .filter(Boolean)
        .join("\n");
}

export function openWhatsAppInvoice(invoice: InvoiceLike): void {
    const rawPhone = invoice.customerPhone || invoice.phone || invoice.mobile;
    const phone = normalizeIndianPhone(rawPhone);

    if (!phone) {
        throw new Error("Invalid or missing customer phone number.");
    }

    const message = buildInvoiceWhatsAppMessage(invoice);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
}