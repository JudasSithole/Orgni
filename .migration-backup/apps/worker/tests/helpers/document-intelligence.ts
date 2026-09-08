/**
 * Test harness that runs the *real* Document Intelligence implementation.
 *
 * Rather than reimplementing classification and extraction in TypeScript (which
 * would duplicate logic and let the two drift), these tests invoke the actual
 * Python `analyze_document` in `intelligence/document-intelligence`. The end-to-end
 * tests therefore exercise the genuine pipeline: real extraction feeding the
 * real tokenizer, with no mocks anywhere in the chain.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import type { NormalizedEnvelope } from "../../src/envelope/types.js";
import type {
  DocumentIntelligence,
  IngestionRecord,
} from "../../src/ingestion/pipeline.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVICE_DIR = path.resolve(
  here,
  "../../../../intelligence/document-intelligence",
);

function pythonCommand(): string | null {
  for (const candidate of ["python", "python3", "py"]) {
    const probe = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (probe.status === 0) return candidate;
  }
  return null;
}

const PYTHON = pythonCommand();

/** True when the real Document Intelligence can run in this environment. */
export const documentIntelligenceAvailable = PYTHON !== null;

const RUNNER = `
import json, sys
sys.path.insert(0, sys.argv[1])
from envelope.builder import analyze_document
payload = json.loads(sys.stdin.read())
print(json.dumps(analyze_document(
    source_id=payload["source_id"],
    file_path=None,
    content_type=payload["content_type"],
    filename=payload["filename"],
    checksum=payload["checksum"],
    tenant_id=payload["tenant_id"],
    text=payload["text"],
)))
`;

/** Call the real Python Document Intelligence for a text document. */
export function analyzeWithRealService(payload: {
  source_id: string;
  content_type: string;
  filename: string;
  checksum: string;
  tenant_id: string;
  text: string;
}): NormalizedEnvelope {
  if (!PYTHON) throw new Error("python not available");

  const result = spawnSync(PYTHON, ["-c", RUNNER, SERVICE_DIR], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(
      `document intelligence failed: ${result.stderr?.slice(0, 500)}`,
    );
  }
  return JSON.parse(result.stdout) as NormalizedEnvelope;
}

/** Adapter matching the pipeline's DocumentIntelligence port. */
export const realDocumentIntelligence: DocumentIntelligence = async (
  record: IngestionRecord,
  content: Uint8Array | string,
) => {
  const text =
    typeof content === "string" ? content : new TextDecoder().decode(content);
  return analyzeWithRealService({
    source_id: record.sourceId,
    content_type: record.mimeType,
    filename: record.filename,
    checksum: record.checksum,
    tenant_id: record.tenantId,
    text,
  });
};
