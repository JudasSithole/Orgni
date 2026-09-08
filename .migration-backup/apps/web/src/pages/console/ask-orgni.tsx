import { Sparkles } from "lucide-react";
import { EmptyState } from "./shared";

export default function AskOrgni({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Context Explorer
          </h1>
          <p className="text-muted-foreground text-sm">
            Test structured context queries against the organisational model.
          </p>
        </div>
      )}

      <div className="mt-12">
        <EmptyState
          icon={Sparkles}
          title="Query endpoint not configured"
          description="The Context Explorer will become available when the Context API query endpoint is implemented. It will be a developer inspection tool, not a general-purpose chatbot."
        />
      </div>
    </div>
  );
}
