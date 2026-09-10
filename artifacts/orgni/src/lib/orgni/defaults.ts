/**
 * Seed data and catalogues for the Orgni product experience.
 *
 * Everything here is demo/mock content used until real backend services exist.
 * It is intentionally structured (not hardcoded into screens) so the mock
 * service can hand it out and a real service can replace it wholesale.
 */
import type {
  ApprovalPolicy,
  Capability,
  Connection,
  IntelligenceSettings,
  KnowledgeCategory,
  KnowledgeObject,
  OrgniAction,
  PermissionsState,
} from "./types";

export const ONBOARDING_STEPS = [
  { key: "organisation", label: "Organisation" },
  { key: "connect", label: "Connect" },
  { key: "context", label: "Context" },
  { key: "capabilities", label: "Capabilities" },
  { key: "approvals", label: "Approvals" },
  { key: "teams", label: "Teams" },
  { key: "ready", label: "Ready" },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

/** The connection catalogue shown on Connect / Connections. */
export const CONNECTION_CATALOG: Omit<
  Connection,
  "status" | "mode" | "connectedAt"
>[] = [
  {
    id: "microsoft-365",
    key: "microsoft-365",
    name: "Microsoft 365",
    description: "Teams, Outlook, Calendar, SharePoint and OneDrive.",
    services: [
      { label: "Teams", access: "Read conversations and channels your team shares with Orgni" },
      { label: "Outlook", access: "Read and draft email on request" },
      { label: "Calendar", access: "See availability and schedule meetings" },
      { label: "SharePoint", access: "Read documents and sites" },
      { label: "OneDrive", access: "Read files people share with Orgni" },
    ],
    permissions: [
      "Read user and group directory information",
      "Read Teams messages in shared channels",
      "Read and send mail on behalf of a user who asks",
      "Read and create calendar events",
      "Read SharePoint and OneDrive files",
    ],
  },
  {
    id: "salesforce",
    key: "salesforce",
    name: "Salesforce",
    description: "Accounts, contacts, opportunities and cases.",
    services: [
      { label: "Accounts", access: "Read customer records" },
      { label: "Opportunities", access: "Read pipeline and deal context" },
      { label: "Cases", access: "Read open issues" },
    ],
    permissions: [
      "Read accounts, contacts and opportunities",
      "Read cases and activity history",
      "Update records only when explicitly approved",
    ],
  },
  {
    id: "sap",
    key: "sap",
    name: "SAP",
    description: "Finance, procurement and ERP records.",
    services: [
      { label: "Finance", access: "Read invoices and payment status" },
      { label: "Procurement", access: "Read purchase orders" },
    ],
    permissions: [
      "Read financial documents and master data",
      "Read purchase orders and goods receipts",
      "No write access without approval",
    ],
  },
  {
    id: "xero",
    key: "xero",
    name: "Xero",
    description: "Invoices, bills and contacts.",
    services: [
      { label: "Invoices", access: "Read sales invoices and status" },
      { label: "Bills", access: "Read supplier bills" },
    ],
    permissions: ["Read invoices, bills and contacts", "No payments or edits without approval"],
  },
  {
    id: "google-workspace",
    key: "google-workspace",
    name: "Google Workspace",
    description: "Gmail, Drive and Calendar.",
    services: [
      { label: "Gmail", access: "Read and draft email on request" },
      { label: "Drive", access: "Read documents people share with Orgni" },
      { label: "Calendar", access: "See availability and schedule meetings" },
    ],
    permissions: [
      "Read and draft mail on request",
      "Read Drive files shared with Orgni",
      "Read and create calendar events",
    ],
  },
  {
    id: "custom-api",
    key: "custom-api",
    name: "Custom API",
    description: "Connect an internal system through a secure endpoint.",
    services: [{ label: "Custom", access: "Read data you expose to Orgni" }],
    permissions: ["Access is defined by the endpoint you configure"],
  },
];

export const DEFAULT_CAPABILITIES: Capability[] = [
  {
    key: "answer_questions",
    label: "Answer company questions",
    description: "Answer questions using what your organisation already knows.",
    enabled: true,
    advanced: false,
  },
  {
    key: "find_documents",
    label: "Find documents",
    description: "Locate the right file, contract or record when someone asks.",
    enabled: true,
    advanced: false,
  },
  {
    key: "prepare_work",
    label: "Prepare work",
    description: "Pull together briefs, summaries and context ahead of meetings.",
    enabled: true,
    advanced: false,
  },
  {
    key: "schedule_meetings",
    label: "Schedule meetings",
    description: "Find time and set up meetings with the right people.",
    enabled: true,
    advanced: false,
  },
  {
    key: "draft_emails",
    label: "Draft emails",
    description: "Write email replies and updates for someone to review.",
    enabled: true,
    advanced: false,
  },
  {
    key: "send_emails",
    label: "Send emails",
    description: "Send email directly once it has been approved.",
    enabled: false,
    advanced: false,
  },
  {
    key: "update_systems",
    label: "Update business systems",
    description: "Make changes in connected systems such as your CRM or ERP.",
    enabled: false,
    advanced: true,
  },
  {
    key: "financial_actions",
    label: "Perform financial actions",
    description: "Take actions that move money or change financial records.",
    enabled: false,
    advanced: true,
  },
];

export const DEFAULT_APPROVALS: ApprovalPolicy[] = [
  {
    key: "read_information",
    label: "Reading information",
    description: "Looking things up across connected systems.",
    level: "none",
  },
  {
    key: "prepare_documents",
    label: "Preparing documents",
    description: "Drafting briefs, notes and summaries.",
    level: "none",
  },
  {
    key: "schedule_meetings",
    label: "Scheduling meetings",
    description: "Setting up meetings on the calendar.",
    level: "none",
  },
  {
    key: "send_external_email",
    label: "Sending external emails",
    description: "Emailing people outside your organisation.",
    level: "ask_first",
  },
  {
    key: "change_records",
    label: "Changing company records",
    description: "Updating data in connected business systems.",
    level: "ask_first",
  },
  {
    key: "financial_actions",
    label: "Financial actions",
    description: "Anything that moves money or changes financial records.",
    level: "always",
  },
];

export const DEFAULT_PERMISSIONS: PermissionsState = {
  access: [
    { key: "read_documents", label: "Read company documents", level: "none", kind: "info" },
    { key: "read_calendar", label: "Read calendar", level: "none", kind: "info" },
    { key: "read_crm", label: "Read customer records", level: "none", kind: "info" },
    { key: "draft_email", label: "Draft email", level: "none", kind: "action" },
    { key: "send_external_email", label: "Send external email", level: "ask_first", kind: "action" },
    { key: "update_crm", label: "Update CRM", level: "ask_first", kind: "action" },
    { key: "financial_action", label: "Financial action", level: "always", kind: "action" },
  ],
  audience: "all_employees",
};

export const DEFAULT_INTELLIGENCE: IntelligenceSettings = {
  mode: "automatic",
  label: "Orgni Intelligence — Automatic",
  advancedProviders: [
    "Automatic routing",
    "OpenAI",
    "Anthropic",
    "Google",
    "Private models",
  ],
};

/* ---- Demo content (used until real data exists) ---- */

export const DEMO_KNOWLEDGE_COUNTS = {
  people: 32,
  customers: 14,
  suppliers: 9,
  projects: 7,
  policies: 11,
  documents: 148,
  processes: 7,
};

export const DEMO_KNOWLEDGE_OBJECTS: KnowledgeObject[] = [
  {
    id: "acme-logistics",
    category: "customers",
    name: "Acme Logistics",
    subtitle: "Customer · Account owner: Sarah Bennett",
    related: [
      { label: "Contacts", value: "5 people" },
      { label: "Invoices", value: "12 · 2 overdue" },
      { label: "Shipments", value: "8 active" },
      { label: "Documents", value: "23" },
      { label: "Conversations", value: "Teams, Outlook" },
      { label: "Open issues", value: "1 delivery delay" },
    ],
  },
  {
    id: "project-atlas",
    category: "projects",
    name: "Project Atlas",
    subtitle: "Project · Started March 2026",
    related: [
      { label: "Team", value: "6 people" },
      { label: "Status", value: "At risk — 1 blocker" },
      { label: "Documents", value: "18" },
      { label: "Related customers", value: "Acme Logistics" },
    ],
  },
  {
    id: "sarah-bennett",
    category: "people",
    name: "Sarah Bennett",
    subtitle: "Account Manager · Sales",
    related: [
      { label: "Owns", value: "Acme Logistics, Meridian Freight" },
      { label: "Projects", value: "Project Atlas" },
      { label: "Reports to", value: "David Naidoo" },
    ],
  },
  {
    id: "meridian-freight",
    category: "suppliers",
    name: "Meridian Freight",
    subtitle: "Supplier · Freight & carriage",
    related: [
      { label: "Contracts", value: "1 active" },
      { label: "Purchase orders", value: "4 open" },
      { label: "Contacts", value: "3 people" },
    ],
  },
];

/**
 * A small, human-readable graph of what Orgni understands. Nodes reference the
 * objects above where one exists; edges are plain-language relationships.
 */
export interface KnowledgeGraphNode {
  id: string;
  label: string;
  category: KnowledgeCategory;
  detail: string;
}
export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  label: string;
}

export const DEMO_KNOWLEDGE_GRAPH: {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
} = {
  nodes: [
    { id: "acme-logistics", label: "Acme Logistics", category: "customers", detail: "Customer · 8 active shipments · 1 delivery delay" },
    { id: "meridian-retail", label: "Meridian Retail", category: "customers", detail: "Customer · renewal due next quarter" },
    { id: "project-atlas", label: "Project Atlas", category: "projects", detail: "Project · at risk · 1 blocker" },
    { id: "sarah-bennett", label: "Sarah Bennett", category: "people", detail: "Account Manager · Sales" },
    { id: "david-naidoo", label: "David Naidoo", category: "people", detail: "Head of Sales" },
    { id: "kabelo-m", label: "Kabelo M.", category: "people", detail: "Operations coordinator" },
    { id: "meridian-freight", label: "Meridian Freight", category: "suppliers", detail: "Supplier · freight & carriage · 1 contract" },
    { id: "delivery-sla", label: "Delivery SLA policy", category: "policies", detail: "Policy · 48h delivery commitment" },
    { id: "order-to-delivery", label: "Order-to-delivery", category: "processes", detail: "Process · quote → ship → invoice" },
    { id: "atlas-sow", label: "Atlas — statement of work", category: "documents", detail: "Document · signed March 2026" },
  ],
  edges: [
    { source: "sarah-bennett", target: "acme-logistics", label: "owns" },
    { source: "sarah-bennett", target: "meridian-retail", label: "owns" },
    { source: "sarah-bennett", target: "project-atlas", label: "works on" },
    { source: "sarah-bennett", target: "david-naidoo", label: "reports to" },
    { source: "project-atlas", target: "acme-logistics", label: "for" },
    { source: "project-atlas", target: "atlas-sow", label: "governed by" },
    { source: "acme-logistics", target: "meridian-freight", label: "shipped by" },
    { source: "meridian-freight", target: "delivery-sla", label: "bound by" },
    { source: "kabelo-m", target: "order-to-delivery", label: "runs" },
    { source: "order-to-delivery", target: "acme-logistics", label: "serves" },
    { source: "order-to-delivery", target: "delivery-sla", label: "measured by" },
  ],
};

export const DEMO_ACTIVITY: OrgniAction[] = [
  {
    id: "act-1",
    title: "Prepared the Transnet meeting brief",
    status: "completed",
    at: relativeIso(-14),
    requestedBy: "Lerato",
    capability: "prepare_work",
    understood:
      "A client meeting with Transnet is scheduled for tomorrow morning and needs a briefing pack.",
    sourcesUsed: [
      "Outlook — recent Transnet thread",
      "SharePoint — Transnet account folder",
      "Salesforce — open opportunities",
    ],
    actionsPerformed: ["Compiled a one-page brief", "Saved it to the meeting invite"],
    reason: "The meeting is tomorrow and no brief existed yet.",
    result: "Brief ready and attached to the calendar event.",
  },
  {
    id: "act-2",
    title: "Answered a shipment status request",
    status: "completed",
    at: relativeIso(-42),
    requestedBy: "Kabelo",
    capability: "answer_questions",
    understood: "Someone asked where shipment OLX-4821 currently is.",
    sourcesUsed: ["SAP — shipment records", "Outlook — carrier updates"],
    actionsPerformed: ["Replied in Teams with the current location and ETA"],
    reason: "A direct question was asked in Teams.",
    result: "Shipment is in transit, expected to arrive Thursday.",
  },
  {
    id: "act-3",
    title: "Drafted a customer email",
    status: "awaiting_approval",
    at: relativeIso(-66),
    requestedBy: "Sarah",
    capability: "draft_emails",
    understood:
      "Acme Logistics asked for an update on their delayed delivery and a reply is needed.",
    sourcesUsed: ["Outlook — Acme thread", "SAP — delivery schedule"],
    actionsPerformed: ["Drafted a reply for review"],
    reason: "Sending external email requires approval under current settings.",
    result: "Waiting for someone to approve sending.",
    approval: {
      kind: "email",
      fields: [
        { label: "Recipient", value: "operations@acmelogistics.com" },
        { label: "Subject", value: "Update on your delivery — shipment OLX-4821" },
        { label: "Reason", value: "Customer requested a status update" },
        { label: "Action", value: "Send the drafted reply" },
      ],
    },
  },
  {
    id: "act-4",
    title: "Scheduled a supplier review",
    status: "completed",
    at: relativeIso(-119),
    requestedBy: "Sarah",
    capability: "schedule_meetings",
    understood: "A quarterly review with Meridian Freight is due and needs to be booked.",
    sourcesUsed: ["Calendar — team availability", "Salesforce — supplier contacts"],
    actionsPerformed: ["Found a common slot", "Sent a meeting invite to both sides"],
    reason: "The review was overdue.",
    result: "Meeting booked for next Tuesday at 14:00.",
  },
];

export const READY_EXAMPLE_PROMPTS = [
  "@Orgni what's blocking Project Atlas?",
  "@Orgni prepare everything for tomorrow's client meeting.",
  "@Orgni where is shipment OLX-4821?",
];

/** ISO timestamp `minutes` from now (negative = in the past). */
function relativeIso(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}
