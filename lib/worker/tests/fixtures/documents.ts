/**
 * Plain-text document fixtures for the Phase 1 pipeline.
 *
 * Text fixtures are a supported Phase 1 input in their own right, and they let
 * the full flow run in CI without OCR binaries. The scanned/OCR path is covered
 * by the document-service's own pytest suite.
 */

export const INVOICE = `TAX INVOICE
Invoice Number: INV-2024-0912
Invoice Date: 2024-03-15
Due Date: 2024-04-14
From: Olyxee AI (Pty) Ltd
VAT No: 4123456789
Bill To: Clover Retail Group
Purchase Order: PO-55841
Currency: ZAR
Consulting services      2      5000.00      10000.00
Support retainer         1      1500.00      1500.00
Subtotal: 11500.00
VAT: 1725.00
Total Due: 13225.00
Payment Terms: Net 30
`;

export const PROOF_OF_PAYMENT = `PROOF OF PAYMENT
Payment Confirmation
Transaction Reference: TXN-88213
Payment Date: 2024-04-02
Paid By: Clover Retail Group
Beneficiary: Olyxee AI (Pty) Ltd
Amount Paid: ZAR 13225.00
Bank: First National Bank
Electronic Funds Transfer
Status: Successful
In payment of invoice INV-2024-0912
`;

export const CONTRACT_SIGNED = `SERVICE AGREEMENT
Contract Number: CT-2024-77
This Agreement is made between Olyxee AI (Pty) Ltd and Clover Retail Group
Effective Date: 2024-01-01
Termination Date: 2025-01-01
Contract Value: ZAR 250000.00
Payment Terms: Net 30 from invoice date
The Supplier shall deliver monthly analytics reports within 5 business days.
The Customer must pay all undisputed invoices within 30 days.
IN WITNESS WHEREOF the parties have executed this agreement.
Executed on: 2024-01-05
`;

/** Same agreement, never signed — must not tokenize as executed. */
export const CONTRACT_UNSIGNED = `SERVICE AGREEMENT
This Agreement is made between Alpha Holdings Ltd and Beta Trading Ltd
Effective Date: 2024-06-01
Contract Value: ZAR 90000.00
The Supplier shall provide support services during business hours.
DRAFT - not yet signed
Signature: ______________
`;

/** Classifiable as an invoice, but missing the fields needed to tokenize. */
export const INVOICE_MISSING_FIELDS = `TAX INVOICE
Invoice Number: INV-2024-0001
Amount Due: 500.00
`;

/** Enough signal to be ambiguous, not enough to classify confidently. */
export const LOW_CONFIDENCE = `Statement
Reference: 12345
Total: 100.00
Date: 2024-02-02
`;

/** No document signal at all. */
export const UNREADABLE = `asdkjhaslkdjh aslkdjh alksjdh
zxcvbnm qwertyuiop
`;

export const EMPTY = "";
