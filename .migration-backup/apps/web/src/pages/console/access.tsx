import { KeyRound } from "lucide-react";
import { EmptyState, ConsolePageHeader } from "./shared";

export default function Access({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!embedded && (
        <ConsolePageHeader
          title="Access"
          description="Govern users, roles, service identities, tenant boundaries and permission scopes for sensitive organisational context."
        />
      )}
      <EmptyState
        icon={KeyRound}
        title="Access administration is not configured"
        description="The current environment provides tenant-scoped development sessions. Role management, service identities and policy-rule administration require a production identity and authorization backend."
      />
    </div>
  );
}
