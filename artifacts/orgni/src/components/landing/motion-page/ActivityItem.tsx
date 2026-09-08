import {
  Calendar,
  Check,
  Database,
  FileSpreadsheet,
  FileText,
  Github,
  Mail,
  Paperclip,
} from "lucide-react";

export type Activity =
  | {
      kind: "file";
      name: string;
      type: "pdf" | "docx" | "xlsx";
      meta: string;
    }
  | {
      kind: "person";
      name: string;
      initials: string;
      via: "Teams" | "Email" | "GitHub";
      note: string;
    }
  | {
      kind: "system";
      source: string;
      note: string;
      icon?: "database" | "calendar" | "mail";
    };

const fileStyles = {
  pdf: { label: "PDF", tile: "bg-[#d93025]", icon: FileText },
  docx: { label: "DOCX", tile: "bg-[#2b579a]", icon: FileText },
  xlsx: { label: "XLSX", tile: "bg-[#217346]", icon: FileSpreadsheet },
} as const;

const personColors = [
  "bg-[#5b5fc7]",
  "bg-[#c239b3]",
  "bg-[#0f7b6c]",
  "bg-[#ca5010]",
];

const systemIcons = { database: Database, calendar: Calendar, mail: Mail };

export function ActivityItem({
  item,
  state,
  index,
}: {
  item: Activity;
  state: "done" | "current" | "pending";
  index: number;
}) {
  const dim = state === "pending";

  let tile: React.ReactNode;
  let title: string;
  let subtitle: string;

  if (item.kind === "file") {
    const f = fileStyles[item.type];
    tile = (
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white ${f.tile}`}
      >
        <f.icon className="h-4 w-4" />
      </span>
    );
    title = item.name;
    subtitle = `${f.label} · ${item.meta}`;
  } else if (item.kind === "person") {
    const Via = item.via === "GitHub" ? Github : item.via === "Email" ? Mail : null;
    tile = (
      <span className="relative shrink-0">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${personColors[index % personColors.length]}`}
        >
          {item.initials}
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-white text-[#242424]">
          {Via ? (
            <Via className="h-2.5 w-2.5" />
          ) : (
            <img
              src={`${import.meta.env.BASE_URL}integrations/teams.svg`}
              alt=""
              className="h-2.5 w-2.5"
            />
          )}
        </span>
      </span>
    );
    title = item.name;
    subtitle = `${item.via} · ${item.note}`;
  } else {
    const Icon = systemIcons[item.icon ?? "database"];
    tile = (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#f3f2f1] text-[#616161]">
        <Icon className="h-4 w-4" />
      </span>
    );
    title = item.source;
    subtitle = item.note;
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-md border px-3 py-1.5 transition-all duration-300 ${
        dim
          ? "border-transparent opacity-35"
          : "border-[#e1dfdd] bg-white opacity-100"
      }`}
    >
      {tile}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[#242424]">
          {title}
        </span>
        <span className="block truncate text-xs text-[#616161]">
          {subtitle}
        </span>
      </span>
      <span className="shrink-0">
        {state === "done" && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#13a10e] text-white">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        )}
        {state === "current" && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#5b5fc7]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5b5fc7]" />
          </span>
        )}
        {state === "pending" && item.kind === "file" && (
          <Paperclip className="h-3.5 w-3.5 text-[#a19f9d]" />
        )}
      </span>
    </div>
  );
}
