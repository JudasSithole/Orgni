/**
 * A quiet, Teams-style conversation preview used in onboarding and the
 * Overview. Illustrative only — not a live Teams surface.
 */
import { TeamsIcon } from "./brand-icons";

export function TeamsPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-xs font-medium text-muted-foreground">
        <TeamsIcon size={14} />
        Microsoft Teams · General
      </div>
      <div className="space-y-4 px-4 py-4 text-sm">
        <Message
          who="Sarah"
          tone="person"
          text="@Orgni prepare everything for tomorrow's client meeting."
        />
        <Message
          who="Orgni"
          tone="orgni"
          text="I'll gather the account context, recent conversations, open issues and relevant documents."
        />
        <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Ready. Meeting brief prepared.
        </div>
      </div>
    </div>
  );
}

function Message({
  who,
  text,
  tone,
}: {
  who: string;
  text: string;
  tone: "person" | "orgni";
}) {
  return (
    <div className="flex gap-3">
      <div
        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
          tone === "orgni"
            ? "bg-foreground text-background"
            : "bg-accent text-foreground"
        }`}
      >
        {who.slice(0, 1)}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium">{who}</div>
        <p className="mt-0.5 leading-relaxed text-foreground/90">{text}</p>
      </div>
    </div>
  );
}
