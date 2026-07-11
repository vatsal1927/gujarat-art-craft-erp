import { formatDateForFilename } from './dateUtils';

export async function generatePDF(): Promise<void> {
  // Since we cannot add external dependencies, we'll use the browser's print dialog
  // with instructions to save as PDF
  const invoiceContent = document.getElementById('invoice-content');
  if (!invoiceContent) {
    throw new Error('Invoice content not found');
  }

  // Get invoice number from the page
  const invoiceNumberElement = document.getElementById('invoiceNo') as HTMLInputElement;
  const invoiceNumber = invoiceNumberElement?.value || '1';
  const filename = `Invoice_${invoiceNumber}_${formatDateForFilename()}`;

  // Create a message to guide the user
  const message = `To save as PDF:\n\n1. In the print dialog, select "Save as PDF" or "Microsoft Print to PDF" as the printer\n2. Suggested filename: ${filename}.pdf\n3. Click Save/Print\n\nClick OK to open the print dialog.`;
  
  if (confirm(message)) {
    window.print();
  }
}
