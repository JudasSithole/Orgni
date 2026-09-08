/**
 * Public pipeline surface of the worker, for in-process consumers such as the
 * API upload endpoint.
 *
 * This barrel is deliberately side-effect free — importing it must NOT start
 * the job loop (that lives in `index.ts`). Per ORGNI_TECHNOLOGY_STACK.md §5.3
 * the ingestion pipeline lives in the worker; the API triggers it. Until a
 * queue (BullMQ/Redis) is introduced, the API invokes it synchronously through
 * these exports.
 */

export {
  processDocument,
  tokenizeEnvelope,
  toHandoff,
  type Phase1Result,
  type TokenizationResult,
} from "./phase1/index.js";

export {
  createDocumentIntelligenceClient,
  type DocumentIntelligenceConfig,
} from "./document-intelligence/client.js";

export type {
  DocumentIntelligence,
  IngestionInput,
  IngestionRecord,
  IngestionState,
} from "./ingestion/pipeline.js";

export { SUPPORTED_MIME_TYPES, checksumOf } from "./ingestion/pipeline.js";
