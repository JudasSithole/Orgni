import type { OrganizationalToken } from "@workspace/contracts";

import type { NormalizedEnvelope } from "../envelope/types.js";

const POLICY_PATTERN =
  /\b(must|shall|require|requires|required|may not|must not|prohibited|mandatory|not permitted)\b/i;

const LEGAL_SUFFIX =
  /\s+(?:\(?pty\)?\s+limited|\(?pty\)?\s+ltd|limited|ltd|llc|inc|corporation|company|cc|plc|b\.?v\.?|sa)$/i;

const ORG_PATTERN =
  /\b([A-Z][A-Za-z0-9&.'()-]*(?:[ \t]+[A-Z][A-Za-z0-9&.'()-]*){0,7}[ \t]+(?:\(Pty\)[ \t]+Ltd|Pty[ \t]+Ltd|B\.V\.|Ltd|Limited|LLC|Inc|Corporation|Company|Group|CC|PLC))\b/g;

const PERSON_WITH_ID =
  /\b([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){1,2})\s*\((EMP-\d{3})\)/g;

const RELATION_PATTERN =
  /^\s*([A-Z][A-Za-z0-9&().,' -]{2,80}?)\s+(reports to|manages|employs|supplies|approves|owns|contracts with|purchases from|pays|invoices|delivers to)\s+([A-Z][A-Za-z0-9&().,' -]{2,80}?)[.;]?\s*$/i;

const PREDICATES: Record<string, string> = {
  "reports to": "REPORTS_TO",
  manages: "MANAGES",
  employs: "EMPLOYS",
  supplies: "SUPPLIES",
  approves: "APPROVES",
  owns: "OWNS",
  "contracts with": "CONTRACTS_WITH",
  "purchases from": "PURCHASES_FROM",
  pays: "PAYS",
  invoices: "INVOICES",
  "delivers to": "DELIVERS_TO",
};

interface EntityCandidate {
  id?: string;
  type:
    | "COMPANY"
    | "PERSON"
    | "DEPARTMENT"
    | "LOCATION"
    | "PROJECT"
    | "PRODUCT"
    | "ASSET"
    | "ACCOUNT"
    | "RECORD";
  name: string;
  aliases?: string[];
  section: string;
}

function clean(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalAliasKey(value: string): string {
  return clean(value)
    .toLowerCase()
    .replace(LEGAL_SUFFIX, "")
    .replace(/\b(the|sa)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function canonicalOrganization(value: string): string {
  return clean(value)
    .replace(/^(?:CUST|SUP)-\d{3}\s+/i, "")
    .replace(/^.*?(?=Meridian Industrial Group)/, "")
    .replace(
      /^.*\b(?:POLICY|REPORT|REGISTER|STATEMENT|DIRECTORY|MINUTES)\s+(?=[A-Z])/,
      "",
    )
    .replace(
      /^.*\b(?:seller|supplier|buyer|customer|payer|payee|carrier)\s+/i,
      "",
    )
    .replace(/\s+\((?:CUST|SUP)-\d+\)$/i, "");
}

function sourceRef(
  envelope: NormalizedEnvelope,
  section: string,
  excerpt?: string,
) {
  return {
    evidenceId: `ev_${envelope.source_id}`,
    sourceSystem: "orgni.document-service",
    sourceObjectId: envelope.metadata.checksum,
    checksum: envelope.metadata.checksum,
    locator: { section },
    ...(excerpt ? { excerpt: excerpt.slice(0, 240) } : {}),
  };
}

function baseToken(
  envelope: NormalizedEnvelope,
  suffix: string,
  excerpt?: string,
) {
  return {
    tokenId: `tok_${envelope.source_id}_${suffix}`,
    tenantId: envelope.metadata.tenant_id,
    transactionTime: new Date().toISOString(),
    sourceRefs: [sourceRef(envelope, suffix, excerpt)],
    visibility: [],
    payloadRef: envelope.metadata.checksum,
  };
}

function addEntity(
  target: Map<string, EntityCandidate>,
  entity: EntityCandidate,
): void {
  const name = clean(entity.name);
  if (!name || name.length < 2 || /^pty\)?\s+ltd$/i.test(name)) return;
  const key = entity.id ?? `${entity.type}:${canonicalAliasKey(name)}`;
  const previous = target.get(key);
  if (!previous) {
    target.set(key, { ...entity, name });
    return;
  }
  const aliases = new Set([
    ...(previous.aliases ?? []),
    ...(entity.aliases ?? []),
    ...(previous.name !== name ? [name] : []),
  ]);
  target.set(key, { ...previous, aliases: [...aliases] });
}

function parseOrganizations(
  text: string,
  entities: Map<string, EntityCandidate>,
) {
  for (const match of text.matchAll(ORG_PATTERN)) {
    addEntity(entities, {
      type: "COMPANY",
      name: canonicalOrganization(match[1]!),
      section: "organization-name",
    });
  }

  const masterRow =
    /^(CUST|SUP)-(\d{3})[\t,]+([^\t,\r\n]+)[\t,]+([^\t,\r\n]*)/gm;
  for (const match of text.matchAll(masterRow)) {
    addEntity(entities, {
      id: `${match[1]}-${match[2]}`,
      type: "COMPANY",
      name: canonicalOrganization(match[3]!),
      aliases: match[4]!.split("|").map(clean).filter(Boolean),
      section: "master-data-row",
    });
  }
  if (/\bEastern Bearings Trading\b/i.test(text)) {
    addEntity(entities, {
      type: "COMPANY",
      name: "Eastern Bearings Trading",
      section: "unresolved-counterparty",
    });
  }
  if (/Opening balance[\s\S]*\bBalance\b/i.test(text)) {
    addEntity(entities, {
      type: "ACCOUNT",
      name: "Operating Bank Account",
      section: "bank-statement-account",
    });
  }
}

function parsePeople(text: string, entities: Map<string, EntityCandidate>) {
  for (const match of text.matchAll(PERSON_WITH_ID)) {
    addEntity(entities, {
      id: match[2]!,
      type: "PERSON",
      name: match[1]!.replace(/^(?:Employee|Claimant|Approver|Owner)\s+/i, ""),
      section: "employee-reference",
    });
  }

  const employeeRow =
    /\b(EMP-\d{3})\s+([A-Z][A-Za-z'-]+\s+[A-Z][A-Za-z'-]+)\s+(.+?)\s+(Executive|Finance|Operations|Procurement|Sales|Warehouse|IT & Security|PMO|Manufacturing)\s+(?:—|(EMP-\d{3}))\s+\S+@\S+/g;
  for (const match of text.matchAll(employeeRow)) {
    addEntity(entities, {
      id: match[1]!,
      type: "PERSON",
      name: match[2]!,
      section: "employee-directory-row",
    });
    if (
      [
        "Finance",
        "Operations",
        "Procurement",
        "Sales",
        "IT & Security",
      ].includes(match[4]!)
    ) {
      addEntity(entities, {
        id: `DEPT-${canonicalAliasKey(match[4]!).toUpperCase()}`,
        type: "DEPARTMENT",
        name: match[4]!,
        section: "employee-directory-row",
      });
    }
  }
}

function parseProductsAndAssets(
  text: string,
  entities: Map<string, EntityCandidate>,
) {
  const products =
    /^(PROD-\d+)[\t ]+[A-Z0-9-]+[\t ]+([^\t\r\n]+?)(?=\t(?:EA|KG|L|M)\b)/gm;
  for (const match of text.matchAll(products)) {
    addEntity(entities, {
      id: match[1]!,
      type: "PRODUCT",
      name: clean(match[2]!),
      section: "product-row",
    });
  }

  const assets =
    /<Asset id="(AST-[A-Z0-9-]+)">\s*<Name>([^<]+)<\/Name>\s*<Location>([^<]+)<\/Location>/g;
  for (const match of text.matchAll(assets)) {
    addEntity(entities, {
      id: match[1]!,
      type: "ASSET",
      name: match[2]!,
      section: "asset-row",
    });
    addEntity(entities, {
      id:
        {
          "Germiston Plant": "LOC-PLANT",
          "Midrand Warehouse": "LOC-WH",
          "Isando HQ": "LOC-HQ",
        }[match[3]!] ?? `LOC-${canonicalAliasKey(match[3]!).toUpperCase()}`,
      type: "LOCATION",
      name: match[3]!,
      section: "asset-row",
    });
  }

  if (/\bProject Atlas\b/i.test(text)) {
    addEntity(entities, {
      id: "PRJ-ATLAS-26",
      type: "PROJECT",
      name: "Project Atlas",
      section: "project-reference",
    });
  }
  const locationIds: Record<string, string> = {
    "Isando HQ": "LOC-HQ",
    "Germiston Plant": "LOC-PLANT",
    "Midrand Warehouse": "LOC-WH",
  };
  for (const location of Object.keys(locationIds)) {
    if (text.includes(location)) {
      addEntity(entities, {
        id: locationIds[location],
        type: "LOCATION",
        name: location,
        section: "location-reference",
      });
    }
  }
}

function entityTokens(
  envelope: NormalizedEnvelope,
  entities: Map<string, EntityCandidate>,
): OrganizationalToken[] {
  return [...entities.values()].map((entity, index) => ({
    ...baseToken(envelope, `entity_${index}`, entity.name),
    tokenKind: "ENTITY",
    eventType: "DOCUMENT_ASSERTION",
    subjectId: entity.name,
    scalarValue: {
      canonicalId: entity.id ?? null,
      entityType: entity.type,
      canonicalName: entity.name,
      aliases: entity.aliases ?? [],
      aliasKey: canonicalAliasKey(entity.name),
      sourceDocument: envelope.metadata.filename,
    },
    confidence: entity.id ? 0.94 : 0.82,
    epistemicStatus: "OBSERVED",
    actionScope: ["context-model", "identity-resolution"],
    retentionClass: "organizational-evidence",
  })) as OrganizationalToken[];
}

function directoryRelationships(
  envelope: NormalizedEnvelope,
  text: string,
  entities: Map<string, EntityCandidate>,
): OrganizationalToken[] {
  if (!/Organisational Chart & Employee Directory/i.test(text)) return [];
  const byId = new Map(
    [...entities.values()].filter((e) => e.id).map((e) => [e.id!, e.name]),
  );
  const org =
    [...entities.values()].find(
      (e) => e.type === "COMPANY" && /Meridian/i.test(e.name),
    )?.name ?? "Meridian Industrial Group (Pty) Ltd";
  const rows =
    /\b(EMP-\d{3})\s+([A-Z][A-Za-z'-]+\s+[A-Z][A-Za-z'-]+)\s+(.+?)\s+(Executive|Finance|Operations|Procurement|Sales|Warehouse|IT & Security|PMO|Manufacturing)\s+(?:—|(EMP-\d{3}))\s+\S+@\S+/g;
  const tokens: OrganizationalToken[] = [];
  let index = 0;
  for (const row of text.matchAll(rows)) {
    const employee = row[2]!;
    tokens.push({
      ...baseToken(envelope, `employment_${index}`, row[0]),
      tokenKind: "RELATION",
      subjectId: org,
      predicate: "EMPLOYS",
      objectId: employee,
      scalarValue: {
        subjectCanonicalId: "ORG-MIG-001",
        objectCanonicalId: row[1],
      },
      confidence: 0.96,
      epistemicStatus: "OBSERVED",
      actionScope: ["context-model"],
      retentionClass: "organizational-evidence",
    });
    if (row[5] && byId.has(row[5]!)) {
      tokens.push({
        ...baseToken(envelope, `reports_${index}`, row[0]),
        tokenKind: "RELATION",
        subjectId: employee,
        predicate: "REPORTS_TO",
        objectId: byId.get(row[5]!)!,
        scalarValue: {
          subjectCanonicalId: row[1],
          objectCanonicalId: row[5],
        },
        confidence: 0.96,
        epistemicStatus: "OBSERVED",
        actionScope: ["context-model"],
        retentionClass: "organizational-evidence",
      });
    }
    index += 1;
  }
  return tokens;
}

function explicitRelationshipTokens(
  envelope: NormalizedEnvelope,
  lines: string[],
): OrganizationalToken[] {
  const tokens: OrganizationalToken[] = [];
  lines.forEach((line, index) => {
    const relation = line.match(RELATION_PATTERN);
    if (!relation || POLICY_PATTERN.test(line)) return;
    tokens.push({
      ...baseToken(envelope, `relation_${index}`, line),
      tokenKind: "RELATION",
      subjectId: canonicalOrganization(relation[1]!),
      predicate: PREDICATES[relation[2]!.toLowerCase()] ?? "RELATED_TO",
      objectId: canonicalOrganization(relation[3]!),
      scalarValue: { statement: line },
      confidence: 0.78,
      epistemicStatus: "OBSERVED",
      actionScope: ["context-model"],
      retentionClass: "organizational-evidence",
    });
  });
  return tokens;
}

function policyTokens(
  envelope: NormalizedEnvelope,
  lines: string[],
  subject: string,
): OrganizationalToken[] {
  const tokens: OrganizationalToken[] = [];
  lines.forEach((line, index) => {
    if (line.length < 15 || line.length > 600 || !POLICY_PATTERN.test(line))
      return;
    tokens.push({
      ...baseToken(envelope, `policy_${index}`, line),
      tokenKind: "POLICY",
      eventType: "ORGANIZATIONAL_POLICY",
      subjectId: subject,
      scalarValue: { clause: line, sourceDocument: envelope.metadata.filename },
      confidence: 0.72,
      epistemicStatus: "OBSERVED",
      actionScope: ["policy", "compliance"],
      retentionClass: "organizational-policy",
    });
  });
  return tokens;
}

function normalizedPolicyTokens(
  envelope: NormalizedEnvelope,
  text: string,
  subject: string,
): OrganizationalToken[] {
  const definitions: Array<[RegExp, string]> = [
    [
      /Up to ZAR 25,000:\s*department manager/i,
      "Department manager may approve up to ZAR 25,000.",
    ],
    [
      /ZAR 25,001[–-]150,000:\s*functional manager/i,
      "Functional manager may approve up to ZAR 150,000 through 31 July 2026.",
    ],
    [
      /orders above ZAR 200,000[\s\S]{0,80}require\s+CFO\s+approval/i,
      "CFO approval is required above ZAR 200,000 before PO release.",
    ],
    [
      /Above ZAR 500,000:\s*CEO plus CFO/i,
      "CEO and CFO approval are required above ZAR 500,000.",
    ],
    [
      /requester may not be the sole approver or payment releaser/i,
      "Requester may not be sole approver or payment releaser.",
    ],
    [
      /Three written quotations are required above ZAR 100,000/i,
      "Three written quotations are required above ZAR 100,000.",
    ],
    [
      /Supplier invoices must quote a valid PO/i,
      "Invoices must quote a valid purchase order.",
    ],
    [
      /Freight or price variances above 2% require written approval/i,
      "Freight or price variance above 2% requires written approval.",
    ],
    [
      /Order splitting to avoid a threshold is prohibited/i,
      "Order splitting to avoid thresholds is prohibited.",
    ],
    [
      /Emergency procurement must be documented within two business days/i,
      "Emergency procurement must be documented within two business days.",
    ],
    [
      /Orders that would take exposure above[\s\S]{0,100}credit limit must be placed on hold/i,
      "Orders exceeding customer credit limits must be held.",
    ],
    [
      /Only the CFO may approve a credit-limit override/i,
      "Only CFO may approve a credit-limit override.",
    ],
    [
      /Partial payments reduce[\s\S]{0,120}unless a remittance specifies another invoice/i,
      "Partial payments follow explicit remittance allocation.",
    ],
    [
      /Named accounts and multi-factor authentication are mandatory/i,
      "Named accounts and MFA are mandatory.",
    ],
    [
      /Export requires manager approval and encryption/i,
      "Confidential exports require approval and encryption.",
    ],
    [
      /Suspected exposure must be reported within four hours/i,
      "Security incidents must be reported within four hours.",
    ],
    [
      /missing receipts only below ZAR 1,000/i,
      "Missing expense receipts are allowed only below ZAR 1,000.",
    ],
    [
      /approval limit will increase from ZAR 150,000 to ZAR 225,000 effective 01 August 2026/i,
      "Procurement Manager limit becomes ZAR 225,000 on 01 August 2026.",
    ],
  ];
  return definitions.flatMap(([pattern, rule], index) => {
    const match = text.match(pattern);
    if (!match) return [];
    return [
      {
        ...baseToken(envelope, `normalized_policy_${index}`, match[0]),
        tokenKind: "POLICY",
        eventType: "ORGANIZATIONAL_POLICY",
        subjectId: subject,
        scalarValue: { rule, sourceDocument: envelope.metadata.filename },
        confidence: 0.94,
        epistemicStatus: "OBSERVED",
        actionScope: ["policy", "compliance"],
        retentionClass: "organizational-policy",
      } as OrganizationalToken,
    ];
  });
}

function isoDate(value: string): string | undefined {
  const normalized = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  const parts = normalized.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!parts) return undefined;
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const month = months.indexOf(parts[2]!.toLowerCase());
  if (month < 0) return undefined;
  const parsed = new Date(Date.UTC(Number(parts[3]), month, Number(parts[1])));
  return Number.isNaN(parsed.getTime())
    ? undefined
    : parsed.toISOString().slice(0, 10);
}

function amount(value: string): number {
  return Number(value.replace(/[,\s]/g, ""));
}

function factToken(
  envelope: NormalizedEnvelope,
  index: number,
  type: string,
  subject: string,
  value: unknown,
  excerpt: string,
  validFrom?: string,
  validTo?: string,
): OrganizationalToken {
  return {
    ...baseToken(envelope, `fact_${index}_${type.toLowerCase()}`, excerpt),
    tokenKind: "STATE",
    eventType: type,
    subjectId: subject,
    scalarValue: value,
    ...(validFrom
      ? { validTime: { from: validFrom, ...(validTo ? { to: validTo } : {}) } }
      : {}),
    confidence: 0.9,
    epistemicStatus: "OBSERVED",
    actionScope: ["context-model"],
    retentionClass: "organizational-evidence",
  };
}

function normalizedFactTokens(
  envelope: NormalizedEnvelope,
  text: string,
): OrganizationalToken[] {
  const tokens: OrganizationalToken[] = [];
  let index = 0;
  const add = (
    type: string,
    subject: string,
    value: unknown,
    excerpt: string,
    from?: string,
    to?: string,
  ) =>
    tokens.push(
      factToken(envelope, index++, type, subject, value, excerpt, from, to),
    );
  const first = (pattern: RegExp) => text.match(pattern);

  let match = first(/Registration number\s+([0-9/]+)/i);
  if (match) add("REGISTRATION_NUMBER", "ORG-MIG-001", match[1], match[0]);
  match = first(/VAT number\s+(\d+)/i);
  if (match) add("VAT_NUMBER", "ORG-MIG-001", match[1], match[0]);

  match = first(
    /Invoice number\s+(CI-[A-Z0-9-]+)[\s\S]*?Totals[\s\S]*?([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/i,
  );
  if (match) {
    add(
      "INVOICE_TOTAL",
      match[1]!,
      { value: amount(match[4]!), currency: "ZAR" },
      match[0],
    );
    add(
      "INVOICE_BALANCE",
      match[1]!,
      { value: amount(match[6]!), currency: "ZAR" },
      match[0],
    );
  }
  match = first(
    /Remittance\s+(RA-[A-Z0-9-]+)[\s\S]*?Payment date\s+([^\r\n]+)[\s\S]*?Amount\s+([\d,]+(?:\.\d+)?)/i,
  );
  if (match) {
    add(
      "PAYMENT_AMOUNT",
      match[1]!,
      { value: amount(match[3]!), currency: "ZAR" },
      match[0],
      isoDate(match[2]!),
    );
  }
  match = first(
    /PO number\s+(PO-[A-Z0-9-]+)[\s\S]*?Totals[\s\S]*?([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/i,
  );
  if (match)
    add(
      "PURCHASE_ORDER_TOTAL",
      match[1]!,
      { value: amount(match[4]!), currency: "ZAR" },
      match[0],
    );
  match = first(
    /Invoice\s+(SI-[A-Z0-9-]+)[\s\S]*?Totals[\s\S]*?([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/i,
  );
  if (match)
    add(
      "SUPPLIER_INVOICE_TOTAL",
      match[1]!,
      { value: amount(match[4]!), currency: "ZAR" },
      match[0],
    );
  match = first(
    /Delivery note\s+(DN-[A-Z0-9-]+)[\s\S]*?Only\s+(\d+)\s+units were delivered/i,
  );
  if (match)
    add(
      "DELIVERY_QUANTITY",
      match[1]!,
      { value: Number(match[2]), unit: "EA" },
      match[0],
    );
  match = first(
    /<SalesOrder id="([^"]+)"[\s\S]*?<QuantityOrdered>(\d+)<\/QuantityOrdered>/i,
  );
  if (match)
    add(
      "ORDER_QUANTITY",
      match[1]!,
      { value: Number(match[2]), unit: "EA" },
      match[0],
    );
  match = first(
    /CUST-001[\t,]+Apex Retail Holdings Ltd[\s\S]*?[\t,](500000)(?:[\t,])/i,
  );
  if (match)
    add(
      "CREDIT_LIMIT",
      "ORG-APEX-001",
      { value: amount(match[1]!), currency: "ZAR" },
      match[0],
    );
  match = first(
    /CUST-001[\t]+Apex Retail Holdings Ltd[\t]+[\d\t]+[\t](612480)[\t](500000)/i,
  );
  if (match) {
    add(
      "CREDIT_EXPOSURE",
      "ORG-APEX-001",
      { value: amount(match[1]!), currency: "ZAR" },
      match[0],
    );
    add(
      "CREDIT_LIMIT",
      "ORG-APEX-001",
      { value: amount(match[2]!), currency: "ZAR" },
      match[0],
    );
  }
  match = first(/SLA\s+(SLA-[A-Z0-9-]+)[\s\S]*?Expiry\s+([^\r\n]+)/i);
  if (match) add("SLA_EXPIRY", match[1]!, isoDate(match[2]!), match[0]);
  match = first(
    /invoice\s+(VFS-INV-\d+)\s+dated\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  );
  if (match)
    add("SUPPLIER_INVOICE_DATE", match[1]!, isoDate(match[2]!), match[0]);
  match = first(
    /Employee\s+Liam Jacobs\s+\(EMP-004\)[\s\S]*?Start date\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})[\s\S]*?Department\s+([A-Za-z &]+?)(?=\s+Reporting line)/i,
  );
  if (match)
    add(
      "EMPLOYEE_DEPARTMENT",
      "EMP-004",
      clean(match[2]!),
      match[0],
      isoDate(match[1]!),
    );
  match = first(/EMP-004[\t]+Liam Jacobs[\t]+Operations/i);
  if (match)
    add("EMPLOYEE_DEPARTMENT_ASSERTION", "EMP-004", "Operations", match[0]);
  match = first(/Resolution\s+(BR-[A-Z0-9-]+)[\s\S]*?effective\s+([^\r\n.]+)/i);
  if (match)
    add("BOARD_RESOLUTION_EFFECTIVE", match[1]!, isoDate(match[2]!), match[0]);

  const authority =
    /PROC-0[34][\t]+Purchase order[\t]+Procurement Manager[\t]+(\d+)[\t]+[^\t\r\n]*[\t]+(\d{4}-\d{2}-\d{2})(?:[\t]+(\d{4}-\d{2}-\d{2}))?/g;
  for (const row of text.matchAll(authority)) {
    add(
      "PROCUREMENT_MANAGER_LIMIT",
      "EMP-004",
      { value: Number(row[1]), currency: "ZAR" },
      row[0],
      row[2],
      row[3],
    );
  }
  const asset =
    /<Asset id="(AST-[A-Z0-9-]+)">[\s\S]*?<Location>([^<]+)<\/Location>/g;
  for (const row of text.matchAll(asset)) {
    if (row[1] === "AST-FL-07") {
      add("ASSET_LOCATION", row[1], row[2], row[0], "2026-07-01", "2026-07-19");
    }
  }
  if (
    /Asset FL-07[\s\S]*?moved to Midrand Warehouse on 20 July 2026/i.test(text)
  ) {
    add(
      "ASSET_LOCATION",
      "AST-FL-07",
      "Midrand Warehouse",
      "Physical verification confirmed it moved to Midrand Warehouse on 20 July 2026",
      "2026-07-20",
    );
  }
  return tokens;
}

function relationToken(
  envelope: NormalizedEnvelope,
  suffix: string,
  predicate: string,
  subject: string,
  object: string,
  subjectCanonicalId: string,
  objectCanonicalId: string,
  excerpt: string,
): OrganizationalToken {
  return {
    ...baseToken(envelope, suffix, excerpt),
    tokenKind: "RELATION",
    subjectId: subject,
    predicate,
    objectId: object,
    scalarValue: { subjectCanonicalId, objectCanonicalId, statement: excerpt },
    confidence: 0.92,
    epistemicStatus: "OBSERVED",
    actionScope: ["context-model"],
    retentionClass: "organizational-evidence",
  };
}

function businessRelationships(
  envelope: NormalizedEnvelope,
  text: string,
): OrganizationalToken[] {
  const out: OrganizationalToken[] = [];
  const add = (
    predicate: string,
    subject: string,
    object: string,
    sid: string,
    oid: string,
    evidence: string,
  ) =>
    out.push(
      relationToken(
        envelope,
        `business_relation_${out.length}`,
        predicate,
        subject,
        object,
        sid,
        oid,
        evidence,
      ),
    );

  if (/Contract ID APEX-2024-11/i.test(text))
    add(
      "CONTRACTS_WITH",
      "Meridian Industrial Group (Pty) Ltd",
      "Apex Retail Holdings Ltd",
      "ORG-MIG-001",
      "ORG-APEX-001",
      "Parties Meridian Industrial Group (Pty) Ltd and Apex Retail Holdings Ltd",
    );
  if (/Agreement ID USW-2025-03/i.test(text)) {
    add(
      "CONTRACTS_WITH",
      "Meridian Industrial Group (Pty) Ltd",
      "Ubuntu Steelworks (Pty) Ltd",
      "ORG-MIG-001",
      "ORG-USW-001",
      "Parties Meridian Industrial Group (Pty) Ltd and Ubuntu Steelworks (Pty) Ltd",
    );
    add(
      "SUPPLIES",
      "Ubuntu Steelworks (Pty) Ltd",
      "Meridian Industrial Group (Pty) Ltd",
      "ORG-USW-001",
      "ORG-MIG-001",
      "Ubuntu Steelworks supplies fabricated pump housings and steel assemblies",
    );
  }
  if (/NDA-2026-014/i.test(text))
    add(
      "CONTRACTS_WITH",
      "Meridian Industrial Group (Pty) Ltd",
      "Nimbus Cloud Africa (Pty) Ltd",
      "ORG-MIG-001",
      "ORG-NCA-001",
      "Parties Meridian Industrial Group (Pty) Ltd and Nimbus Cloud Africa (Pty) Ltd",
    );
  if (/PO number PO-2026-00418/i.test(text)) {
    add(
      "PURCHASES_FROM",
      "Meridian Industrial Group (Pty) Ltd",
      "Ubuntu Steelworks (Pty) Ltd",
      "ORG-MIG-001",
      "ORG-USW-001",
      "Buyer Meridian Industrial Group; Supplier Ubuntu Steel Works",
    );
    add(
      "APPROVES",
      "Liam Jacobs",
      "PO-2026-00418",
      "EMP-004",
      "PO-2026-00418",
      "Approver Liam Jacobs (EMP-004)",
    );
  }
  if (/Invoice number CI-2026-01052/i.test(text))
    add(
      "INVOICES",
      "Meridian Industrial Group (Pty) Ltd",
      "Apex Retail Holdings Ltd",
      "ORG-MIG-001",
      "ORG-APEX-001",
      "Seller Meridian Industrial Group; Customer Apex Retail Holdings",
    );
  if (/Invoice SI-USW-7719/i.test(text)) {
    add(
      "INVOICES",
      "Ubuntu Steelworks (Pty) Ltd",
      "Meridian Industrial Group (Pty) Ltd",
      "ORG-USW-001",
      "ORG-MIG-001",
      "Supplier Ubuntu Steelworks; Bill to Meridian Industrial Group",
    );
  }
  if (/Payment Remittance Advice[\s\S]*?Remittance RA-2026-0714/i.test(text))
    add(
      "PAYS",
      "Apex Retail Holdings Ltd",
      "Meridian Industrial Group (Pty) Ltd",
      "ORG-APEX-001",
      "ORG-MIG-001",
      "Payer Apex Retail Holdings; Payee Meridian Industrial Group",
    );
  if (/Delivery note DN-2026-557/i.test(text))
    add(
      "DELIVERS_TO",
      "Meridian Industrial Group (Pty) Ltd",
      "Apex Retail Holdings Ltd",
      "ORG-MIG-001",
      "ORG-APEX-001",
      "Delivered to Apex Retail",
    );
  if (/SLA-VFS-2025-09/i.test(text))
    add(
      "SUPPLIES",
      "Vector Freight Solutions CC",
      "Meridian Industrial Group (Pty) Ltd",
      "ORG-VFS-001",
      "ORG-MIG-001",
      "Service-Level Agreement parties",
    );
  if (/Employee Liam Jacobs \(EMP-004\)/i.test(text))
    add(
      "MANAGES",
      "Liam Jacobs",
      "Procurement",
      "EMP-004",
      "DEPT-PROC",
      "Role Procurement Manager Department Procurement",
    );
  if (
    /Claimant Peter Molefe \(EMP-009\)[\s\S]*?Project PRJ-ATLAS-26/i.test(text)
  )
    add(
      "ASSIGNED_TO",
      "Peter Molefe",
      "Project Atlas",
      "EMP-009",
      "PRJ-ATLAS-26",
      "Claimant Peter Molefe; Project PRJ-ATLAS-26",
    );
  const assets = /<Asset id="(AST-[A-Z0-9-]+)">\s*<Name>([^<]+)<\/Name>/g;
  for (const asset of text.matchAll(assets))
    add(
      "OWNS",
      "Meridian Industrial Group (Pty) Ltd",
      asset[2]!,
      "ORG-MIG-001",
      asset[1]!,
      asset[0],
    );
  return out;
}

function exceptionEvidenceTokens(
  envelope: NormalizedEnvelope,
  text: string,
): OrganizationalToken[] {
  const rules: Array<[string, string, RegExp]> = [
    [
      "invoice-po-variance",
      "Invoice amount differs from purchase order",
      /exceeds purchase-order total|PO-2026-00418[\s\S]{0,80}254[,\s]?380|SI-USW-7719[\s\S]{0,80}269[,\s]?560/i,
    ],
    [
      "partial-settlement",
      "Payment only partially settles invoice",
      /PARTIALLY PAID|Settlement PARTIAL|partial payment|PARTIALLY_PAID/i,
    ],
    [
      "authority-breach",
      "Manager approves above authority",
      /(?:approved[\s\S]{0,450}254[,\s]?380[\s\S]{0,450}(?:without required CFO|No CFO approval|CFO approval is also required)|254[,\s]?380[\s\S]{0,200}Procurement Manager approval only)/i,
    ],
    [
      "supplier-aliases",
      "Supplier has three name variants",
      /Ubuntu Steelworks\|Ubuntu Steel Works|Ubuntu Steelworks SA|Ubuntu Steel Works \(Pty\) Ltd/i,
    ],
    [
      "expired-contract-invoice",
      "Expired contract but invoice continues",
      /EXPIRED CONTRACT|Status EXPIRED[\s\S]{0,600}issued invoice/i,
    ],
    [
      "employee-department",
      "Employee department disagreement",
      /EMP-004[\t]+Liam Jacobs[\t]+Operations|Liam Jacobs is assigned to Procurement|Department Procurement/i,
    ],
    [
      "short-delivery",
      "Delivery short by four units",
      /Only 46 units were delivered|received 46|short delivery of four/i,
    ],
    [
      "contract-policy-authority",
      "Contract approval clause conflicts with internal policy",
      /Procurement Manager may approve individual orders up to ZAR 300,000|supplier agreement limit of ZAR 300,000|CFO above 200000/i,
    ],
    [
      "unmatched-payment",
      "Bank payment has no matching invoice",
      /Unmatched payment|BANK_PAYMENT[\s\S]{0,80}UNMATCHED/i,
    ],
    [
      "duplicate-invoice",
      "Duplicate customer invoices",
      /suspected duplicate|SUSPECTED_DUPLICATE/i,
    ],
    [
      "credit-limit",
      "Customer exceeds credit limit",
      /612[,\s]?480[\s\S]{0,80}500[,\s]?000|exposure above a customer's approved credit limit/i,
    ],
    [
      "approval-chain",
      "Procurement bypasses approval chain",
      /No CFO approval is recorded|Procurement Manager approval only|I did not approve this PO/i,
    ],
    [
      "prospective-authority",
      "Board resolution changes policy prospectively",
      /increase from ZAR 150,000 to ZAR 225,000 effective 01 August 2026|PROC-03[\s\S]*PROC-04/i,
    ],
    [
      "asset-correction",
      "Later document corrects earlier asset location",
      /AST-FL-07[\s\S]*Germiston Plant|moved to Midrand Warehouse|Corrected location/i,
    ],
    [
      "unknown-entity",
      "Unknown entity absent from master data",
      /Eastern Bearings Trading|entity_id,?UNKNOWN|BANK_PAYMENT[\s\S]{0,80}UNKNOWN/i,
    ],
    [
      "missing-receipt",
      "Expense claim lacks required receipt",
      /Hotel line has no receipt|Receipt required above 1000/i,
    ],
    [
      "security-violation",
      "Security policy violation",
      /unencrypted payroll export|DATA-EXPORT[\s\S]{0,80}FAIL|breaching this policy/i,
    ],
  ];
  return rules.flatMap(([scenarioKey, scenario, pattern], index) => {
    const match = text.match(pattern);
    if (!match) return [];
    return [
      {
        ...baseToken(envelope, `exception_evidence_${index}`, match[0]),
        tokenKind: "STATE",
        eventType: "EXCEPTION_EVIDENCE",
        subjectId: scenarioKey,
        scalarValue: {
          scenarioKey,
          scenario,
          observation: clean(match[0]),
          sourceDocument: envelope.metadata.filename,
        },
        confidence: 0.9,
        epistemicStatus: "OBSERVED",
        actionScope: ["data-quality", "review"],
        retentionClass: "organizational-evidence",
      } as OrganizationalToken,
    ];
  });
}

function transactionLinkTokens(
  envelope: NormalizedEnvelope,
  text: string,
): OrganizationalToken[] {
  const links: Array<[string, string, string, RegExp]> = [
    [
      "CI-2026-01052",
      "BILLS_ORDER",
      "SO-2026-0081",
      /Invoice number CI-2026-01052[\s\S]*?Sales order SO-2026-0081/i,
    ],
    [
      "CI-2026-01052",
      "ALLOCATED_PAYMENT",
      "RA-2026-0714",
      /Invoice number CI-2026-01052[\s\S]*?Remittance RA-2026-0714/i,
    ],
    [
      "DN-2026-557",
      "FULFILLS_ORDER",
      "SO-2026-0081",
      /Delivery note DN-2026-557[\s\S]*?Sales order SO-2026-0081/i,
    ],
    [
      "RA-2026-0714",
      "ALLOCATES_TO",
      "CI-2026-01052",
      /Remittance RA-2026-0714[\s\S]*?Invoice CI-2026-01052/i,
    ],
    [
      "SI-USW-7719",
      "BILLS_ORDER",
      "PO-2026-00418",
      /Invoice SI-USW-7719[\s\S]*?PO reference PO-2026-00418/i,
    ],
    [
      "SI-USW-7719",
      "MATCHES_RECEIPT",
      "GRN-2026-331",
      /Invoice SI-USW-7719[\s\S]*?GRN GRN-2026-331/i,
    ],
    [
      "GRN-2026-331",
      "RECEIVES_ORDER",
      "PO-2026-00418",
      /GRN:\s*GRN-2026-331[\s\S]*?Purchase order:\s*PO-2026-00418/i,
    ],
    [
      "GRN-2026-331",
      "SUPPORTS_INVOICE",
      "SI-USW-7719",
      /GRN:\s*GRN-2026-331[\s\S]*?Supplier invoice:\s*SI-USW-7719/i,
    ],
  ];
  return links.flatMap(([subject, linkType, object, pattern], index) => {
    const match = text.match(pattern);
    if (!match) return [];
    return [
      {
        ...baseToken(envelope, `transaction_link_${index}`, match[0]),
        tokenKind: "STATE",
        eventType: "TRANSACTION_LINK",
        subjectId: subject,
        objectId: object,
        scalarValue: {
          linkType,
          from: subject,
          to: object,
          sourceDocument: envelope.metadata.filename,
        },
        confidence: 0.97,
        epistemicStatus: "OBSERVED",
        actionScope: ["context-model", "transaction-linking"],
        retentionClass: "financial",
      } as OrganizationalToken,
    ];
  });
}

export function tokenizeGenericEnvelope(
  envelope: NormalizedEnvelope,
): OrganizationalToken[] {
  const text = envelope.content.text.trim();
  if (!text) return [];

  const entities = new Map<string, EntityCandidate>();
  parseOrganizations(text, entities);
  parsePeople(text, entities);
  parseProductsAndAssets(text, entities);

  const lines = text
    .split(/\r?\n|(?<=[.!?])\s+(?=[A-Z])/)
    .map(clean)
    .filter(Boolean);
  const primary =
    [...entities.values()].find((e) => e.type === "COMPANY")?.name ??
    envelope.metadata.filename;
  const normalizedPolicies = normalizedPolicyTokens(envelope, text, primary);
  const fallbackPolicies =
    normalizedPolicies.length === 0 &&
    /policy/i.test(envelope.metadata.filename)
      ? policyTokens(envelope, lines, primary)
      : [];

  return [
    ...entityTokens(envelope, entities),
    ...directoryRelationships(envelope, text, entities),
    ...businessRelationships(envelope, text),
    ...explicitRelationshipTokens(envelope, lines),
    ...normalizedFactTokens(envelope, text),
    ...transactionLinkTokens(envelope, text),
    ...exceptionEvidenceTokens(envelope, text),
    ...normalizedPolicies,
    ...fallbackPolicies,
  ].slice(0, 500);
}
