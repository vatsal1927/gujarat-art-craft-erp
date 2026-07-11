# Specification

## Summary
**Goal:** Add a customer business address field to the invoice system for capturing and displaying customer location information.

**Planned changes:**
- Add business address input field to CustomerInfo component with consistent styling
- Update InvoiceData type definition to include customerBusinessAddress field
- Update CreateInvoice page state management to handle the new field
- Update backend Invoice type to store customer business address
- Update ViewInvoice page to display and allow editing of the address field
- Include customer business address in printed invoice output

**User-visible outcome:** Users can enter, view, edit, and print customer business addresses on invoices alongside other customer information.
