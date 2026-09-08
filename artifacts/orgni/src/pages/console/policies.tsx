import { listFacts } from "@/lib/api";
import { ScrollText } from "lucide-react";
import { EmptyState, ErrorState, useData, CardsSkeleton } from "./shared";
import { FactCard } from "./fact-card";

function isPolicy(fact: Record<string, unknown>): boolean {
  return [fact.fact_kind, fact.token_kind, fact.fact_type, fact.predicate].some(
    (value) =>
      String(value ?? "")
        .toUpperCase()
        .includes("POLICY"),
  );
}

export default function Policies() {
  const { data, loading, error } = useData(listFacts);

  if (loading) return <CardsSkeleton />;
  if (error) return <ErrorState error={error} />;

  const policies = (data?.facts ?? []).filter((entry) => isPolicy(entry.fact));

  if (policies.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="No policies have been recognized yet"
        description="Policy clauses extracted from contracts and governance documents will appear here with their source and confidence."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Recognized policies</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rules and policy clauses identified in organisational evidence.
        </p>
      </div>
      {policies.map((entry, index) => (
        <FactCard
          key={`${entry.source.sourceId}-${index}`}
          data={entry.fact}
          source={entry.source}
          kind="fact"
        />
      ))}
    </div>
  );
}
