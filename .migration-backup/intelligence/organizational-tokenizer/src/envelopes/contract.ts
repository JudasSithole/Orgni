import type { FieldExtraction } from "./types.js";

export type ContractType = "SERVICE_AGREEMENT" | "NDA" | "EMPLOYMENT" | "OTHER";

export interface ContractParty {
  name: FieldExtraction<string>;
  role: FieldExtraction<string>;
  registrationNumber?: FieldExtraction<string>;
  jurisdiction?: FieldExtraction<string>;
}

export interface ContractExtraction {
  documentType: "CONTRACT";
  extractionId: string;
  tenantId: string;
  documentRef: string;
  checksum: string;
  contractType: FieldExtraction<ContractType>;
  effectiveDate: FieldExtraction<string>;
  expiryDate?: FieldExtraction<string>;
  title?: FieldExtraction<string>;
  parties: ContractParty[];
  contractValue?: FieldExtraction<number>;
  currency?: FieldExtraction<string>;
  governingLaw?: FieldExtraction<string>;
  signedDate?: FieldExtraction<string>;
  autoRenewal?: FieldExtraction<boolean>;
  terminationClause?: FieldExtraction<string>;
  noticePeriodDays?: FieldExtraction<number>;
  confidentialityClause?: FieldExtraction<string>;
  reference?: FieldExtraction<string>;
  paymentTerms?: FieldExtraction<string>;
  /** Obligations extracted from the contract body (modal "shall/must" clauses). */
  obligations?: FieldExtraction<string>[];
  /**
   * Explicit execution status from signature evidence only:
   * "EXECUTED" | "NOT_EXECUTED" | "UNKNOWN". Never "EXECUTED" without a signature.
   */
  executionStatus?: FieldExtraction<string>;
  processedAt?: string;
  timestamp?: string;
}
