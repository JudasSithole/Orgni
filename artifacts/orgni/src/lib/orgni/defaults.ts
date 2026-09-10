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

/** Graph shape for the Knowledge map (built at runtime from the model API). */
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

/** Example phrasings shown on the onboarding "Ready" screen — UI copy, not data. */
export const READY_EXAMPLE_PROMPTS = [
  "@Orgni what's the status of our largest open deal?",
  "@Orgni prepare everything for tomorrow's client meeting.",
  "@Orgni find the latest signed contract for this account.",
];
