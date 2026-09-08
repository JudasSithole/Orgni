import { listRelationships } from "@/lib/api";
import { useData, ErrorState, EmptyState, CardsSkeleton } from "./shared";
import { FactCard } from "./fact-card";
import { Network } from "lucide-react";

export default function Relationships({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { data, loading, error } = useData(listRelationships);

  if (loading) return <CardsSkeleton />;
  if (error) return <ErrorState error={error} />;

  const relationships = data?.relationships || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Relationships
          </h1>
          <p className="text-muted-foreground text-sm">
            Mapped connections between organizational entities.
          </p>
        </div>
      )}

      {relationships.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No relationships have been resolved yet"
          description="Relationships will appear when evidence establishes traceable links between organisational entities."
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {relationships.map((r, i) => (
            <FactCard
              key={i}
              data={r.relationship}
              source={r.source}
              kind="relationship"
            />
          ))}
        </div>
      )}
    </div>
  );
}
