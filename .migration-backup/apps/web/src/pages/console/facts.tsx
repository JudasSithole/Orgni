import { listFacts, addReview } from "@/lib/api";
import { useData, ErrorState, EmptyState, CardsSkeleton } from "./shared";
import { FactCard } from "./fact-card";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb } from "lucide-react";

export default function Facts({ embedded = false }: { embedded?: boolean }) {
  const { data, loading, error, refetch } = useData(listFacts);
  const { session } = useAuth();
  const { toast } = useToast();

  async function review(
    sourceId: string,
    action: "CORRECT" | "REJECT" | "APPROVE",
  ) {
    if (!session) return;
    try {
      const correctedValue =
        action === "CORRECT"
          ? (window.prompt("Corrected value (optional):") ?? undefined)
          : undefined;
      await addReview(session.token, sourceId, {
        fieldPath: "fact",
        action,
        correctedValue,
        reviewer: session.email,
      });
      toast({
        title: `Fact ${action.toLowerCase()}ed`,
        description: "Recorded in the review audit trail.",
      });
      refetch();
    } catch {
      toast({ title: "Could not record review", variant: "destructive" });
    }
  }

  if (loading) return <CardsSkeleton />;
  if (error) return <ErrorState error={error} />;

  const facts = data?.facts || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Verified Facts
          </h1>
          <p className="text-muted-foreground text-sm">
            Organizational facts with their epistemic status and provenance.
          </p>
        </div>
      )}

      {facts.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No organisational context has been resolved yet"
          description="Connect a source, upload supported evidence or send an event through the API to begin building the context model."
        />
      ) : (
        <div className="space-y-4">
          {facts.map((f, i) => (
            <FactCard
              key={i}
              data={f.fact}
              source={f.source}
              kind="fact"
              onReview={(action) => review(f.source.sourceId, action)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
