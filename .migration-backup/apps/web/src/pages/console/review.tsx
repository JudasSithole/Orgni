import { CheckCircle } from "lucide-react";
import { EmptyState } from "./shared";

export default function Review({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Review</h1>
          <p className="text-muted-foreground text-sm">
            Extracted fields awaiting human correction or rejection.
          </p>
        </div>
      )}

      <EmptyState
        icon={CheckCircle}
        title="Nothing to review"
        description="When Orgni encounters ambiguous information, contradictions, or low-confidence extractions during evidence processing, it will pause and request human correction here."
      />
    </div>
  );
}
