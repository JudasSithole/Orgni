import {
  Archive,
  Check,
  Clock3,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType2,
  LockKeyhole,
  Plug,
  Presentation,
} from "lucide-react";
import { BiLogoMicrosoftTeams } from "react-icons/bi";
import { SiGmail, SiPostgresql, SiSap } from "react-icons/si";
import type { ElementType } from "react";
import Sources from "./sources";
import { ConsolePageHeader } from "./shared";

const fileFamilies = [
  {
    label: "Documents",
    formats: "PDF, DOCX, RTF",
    icon: FileText,
    color: "bg-neutral-100 text-neutral-700",
  },
  {
    label: "Spreadsheets",
    formats: "XLSX, CSV, TSV",
    icon: FileSpreadsheet,
    color: "bg-neutral-100 text-neutral-700",
  },
  {
    label: "Presentations",
    formats: "PPTX",
    icon: Presentation,
    color: "bg-neutral-100 text-neutral-700",
  },
  {
    label: "Text",
    formats: "TXT, MD, HTML",
    icon: FileType2,
    color: "bg-neutral-100 text-neutral-700",
  },
  {
    label: "Structured data",
    formats: "JSON, XML",
    icon: FileJson,
    color: "bg-neutral-100 text-neutral-700",
  },
  {
    label: "Images",
    formats: "PNG, JPG",
    icon: FileImage,
    color: "bg-neutral-100 text-neutral-700",
  },
];

const integrations = [
  {
    name: "Microsoft Teams",
    detail: "Conversations, channels and meetings",
    icon: BiLogoMicrosoftTeams,
    color: "#6264A7",
  },
  {
    name: "Gmail",
    detail: "Messages, threads and attachments",
    icon: SiGmail,
    color: "#EA4335",
  },
  {
    name: "PostgreSQL",
    detail: "Operational and reference data",
    icon: SiPostgresql,
    color: "#4169E1",
  },
  {
    name: "SAP",
    detail: "Finance, procurement and ERP records",
    icon: SiSap,
    color: "#0FAAFF",
  },
] satisfies {
  name: string;
  detail: string;
  icon: ElementType;
  color: string;
}[];

export default function Connections() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <ConsolePageHeader
        title="Connections"
        description="Choose how organisational evidence reaches Orgni. Upload files today, then connect business systems as direct integrations become available."
      />

      <section aria-labelledby="upload-evidence-title">
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="border-b border-border px-5 py-5 sm:px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Archive className="size-5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      id="upload-evidence-title"
                      className="text-base font-semibold"
                    >
                      Upload evidence
                    </h2>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                      <Check className="size-3.5" strokeWidth={2.5} />
                      Ready
                    </span>
                  </div>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Add your business documents — invoices, proofs of payment
                    and contracts. Orgni reads each file, pulls out the key
                    facts, and keeps a link back to the exact source. Other file
                    types are stored and searchable too.
                  </p>
                  <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {[
                      "Upload files",
                      "Orgni extracts the facts",
                      "Review in Context Model",
                    ].map((step, i) => (
                      <li key={step} className="flex items-center gap-2">
                        <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                          {i + 1}
                        </span>
                        {step}
                        {i < 2 && (
                          <span className="text-muted-foreground/40">→</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <LockKeyhole className="size-3.5" />
                Tenant-isolated processing
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-5 py-3 sm:px-6">
            <span className="text-xs font-medium text-muted-foreground">
              Accepts
            </span>
            {fileFamilies.map((family) => (
              <span
                key={family.label}
                title={family.label}
                className="inline-flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground"
              >
                <family.icon className="size-3.5 shrink-0" />
                <span className="font-mono">{family.formats}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <Sources embedded />
        </div>
      </section>

      {/* Direct integrations are not yet available — kept as a small, honest
          footnote rather than prominent cards, so the live upload source stays
          the focus. */}
      <section aria-labelledby="connect-tools-title" className="border-t pt-6">
        <div className="mb-3 flex items-center gap-2">
          <Plug className="size-3.5 text-muted-foreground" />
          <h2
            id="connect-tools-title"
            className="text-sm font-medium text-muted-foreground"
          >
            Direct integrations — coming soon
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {integrations.map((integration) => (
            <span
              key={integration.name}
              title={integration.detail}
              aria-disabled="true"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground"
            >
              <integration.icon
                className="size-4"
                style={{ color: integration.color }}
              />
              {integration.name}
              <span className="ml-0.5 flex items-center gap-1 text-[10px] uppercase">
                <Clock3 className="size-3" />
                Soon
              </span>
            </span>
          ))}
        </div>
        <p className="mt-3 max-w-2xl text-xs text-muted-foreground">
          Secure file upload is the live source in Phase 1. Gmail, Teams,
          PostgreSQL and SAP connectors are on the roadmap and are not yet
          operational — nothing here syncs until it is connected end to end.
        </p>
      </section>
    </div>
  );
}
