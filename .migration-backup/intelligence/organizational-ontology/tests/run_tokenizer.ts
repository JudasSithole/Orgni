/**
 * Test bridge: run the REAL tokenizer and print its OrganizationalToken[] as JSON.
 *
 * Reads an extraction envelope JSON on stdin, calls the actual `tokenizeDocument`
 * from @workspace/organizational-tokenizer, and writes the tokens to stdout. The
 * Python ontology integration test invokes this so the ontology consumes genuine
 * tokenizer output — never a hand-built Python token wrapper.
 */
import { tokenizeDocument } from "../../organizational-tokenizer/src/index.js";

async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const extraction = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const result = tokenizeDocument(extraction);
  process.stdout.write(JSON.stringify(result.tokens));
}

main().catch((err) => {
  process.stderr.write(String(err?.stack ?? err));
  process.exit(1);
});
