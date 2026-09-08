import { Cable } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { EmptyState, ConsolePageHeader } from "./shared";

export default function Consumers({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!embedded && (
        <ConsolePageHeader
          title="Consumers"
          description="Applications, agents and services authorized to depend on Orgni context."
        />
      )}
      <EmptyState
        icon={Cable}
        title="No consumers are connected yet"
        description="Register an application, agent or integration to begin querying Orgni context. Consumer registration is not implemented in the current backend."
        action={
          <Button variant="outline" asChild>
            <Link href="/app/developer">View API setup</Link>
          </Button>
        }
      />
    </div>
  );
}
