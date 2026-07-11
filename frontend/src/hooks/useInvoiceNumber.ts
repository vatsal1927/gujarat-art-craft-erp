import { useState, useEffect } from 'react';

const INVOICE_NUMBER_KEY = 'lastInvoiceNumber';

export function useInvoiceNumber() {
  const [invoiceNumber, setInvoiceNumber] = useState<number>(1);

  useEffect(() => {
    const savedNumber = localStorage.getItem(INVOICE_NUMBER_KEY);
    if (savedNumber) {
      setInvoiceNumber(parseInt(savedNumber, 10));
    }
  }, []);

  const incrementInvoiceNumber = () => {
    const newNumber = invoiceNumber + 1;
    setInvoiceNumber(newNumber);
    localStorage.setItem(INVOICE_NUMBER_KEY, newNumber.toString());
  };

  return {
    invoiceNumber,
    incrementInvoiceNumber
  };
}
