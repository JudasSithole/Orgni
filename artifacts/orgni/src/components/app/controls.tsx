/**
 * Simple, human-readable controls: a capability toggle row and an approval
 * level selector. No RBAC jargon.
 */
import { Switch } from "@/components/ui/switch";
import type { ApprovalLevel } from "@/lib/orgni/types";

export function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description ? (
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
        className="mt-0.5"
      />
    </div>
  );
}

const LEVELS: { value: ApprovalLevel; label: string }[] = [
  { value: "none", label: "No approval" },
  { value: "ask_first", label: "Ask first" },
  { value: "always", label: "Always ask" },
];

export function ApprovalLevelSelect({
  value,
  onChange,
  compact = false,
}: {
  value: ApprovalLevel;
  onChange: (v: ApprovalLevel) => void;
  compact?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      className="inline-flex overflow-hidden rounded-lg border border-border bg-background"
    >
      {LEVELS.map((lvl) => {
        const active = lvl.value === value;
        return (
          <button
            key={lvl.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(lvl.value)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              compact ? "" : "sm:px-4"
            } ${
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {lvl.label}
          </button>
        );
      })}
    </div>
  );
}

export function levelText(level: ApprovalLevel): string {
  switch (level) {
    case "none":
      return "No approval needed";
    case "ask_first":
      return "Ask first";
    case "always":
      return "Always require approval";
  }
}
