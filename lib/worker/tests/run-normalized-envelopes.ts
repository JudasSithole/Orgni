import { readFileSync } from "node:fs";

import { tokenizeEnvelope } from "../src/phase1/index.js";
import type { NormalizedEnvelope } from "../src/envelope/types.js";

const input = JSON.parse(
  readFileSync(process.argv[2]!, "utf8"),
) as NormalizedEnvelope[];

process.stdout.write(
  JSON.stringify(
    input.map((envelope) => ({
      filename: envelope.metadata.filename,
      ...tokenizeEnvelope(envelope),
    })),
  ),
);
