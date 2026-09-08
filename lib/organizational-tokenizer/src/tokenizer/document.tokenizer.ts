/**
 * Orgni Organizational Tokenizer — Document Tokenizer (main dispatcher)
 * schema_version: "0.1.0"
 */
import type { OrganizationalToken } from "@workspace/contracts";
import type { InvoiceExtraction } from "../envelopes/invoice.js";
import type { ProofOfPaymentExtraction } from "../envelopes/proof_of_payment.js";
import type { ContractExtraction } from "../envelopes/contract.js";
import { mapInvoiceToTokens } from "../mappings/invoice.mapper.js";
import { mapProofOfPaymentToTokens } from "../mappings/proof_of_payment.mapper.js";
import { mapContractToTokens } from "../mappings/contract.mapper.js";
import { validateToken, validateTokens } from "../validators/token.validator.js";

export type DocumentExtraction =
  | InvoiceExtraction
  | ProofOfPaymentExtraction
  | ContractExtraction;

export interface DocumentTokenizerResult {
  extractionId: string;
  tenantId: string;
  documentType: string;
  tokens: OrganizationalToken[];
  tokenCount: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function tokenizeDocument(extraction: DocumentExtraction): DocumentTokenizerResult {
  let initialTokens: OrganizationalToken[];

  switch (extraction.documentType) {
    case "INVOICE":
      initialTokens = mapInvoiceToTokens(extraction);
      break;
    case "PROOF_OF_PAYMENT":
      initialTokens = mapProofOfPaymentToTokens(extraction);
      break;
    case "CONTRACT":
      initialTokens = mapContractToTokens(extraction);
      break;
    default: {
      const currentDoc = extraction as any;
      throw new Error(
        `Unsupported documentType: ${currentDoc?.documentType || "UNKNOWN"}`,
      );
    }
  }

  const batchValidation = validateTokens(initialTokens);

  const perfectlyValidTokens = initialTokens.filter((token) => {
    const assessment = validateToken(token);
    return assessment.valid;
  });

  return {
    extractionId: extraction.extractionId,
    tenantId: extraction.tenantId,
    documentType: extraction.documentType,
    tokens: perfectlyValidTokens,
    tokenCount: perfectlyValidTokens.length,
    valid: batchValidation.valid,
    errors: batchValidation.errors,
    warnings: batchValidation.warnings,
  };
}
