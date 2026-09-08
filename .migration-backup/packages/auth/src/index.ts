import type { PrincipalRule } from "@workspace/contracts";

/**
 * Shared authentication & authorization primitives.
 *
 * Signup/login is handled by the main Olyxee platform
 * (https://www.olyxee.com/signup?tool=api); this package holds the shared
 * types and permission logic that API and worker use to evaluate access.
 */

export interface Principal {
  principalId: string;
  principalType: PrincipalRule["principalType"];
  tenantId: string;
  roles: string[];
}

export const Permissions = {
  DocumentsRead: "documents:read",
  DocumentsWrite: "documents:write",
  ContextQuery: "context:query",
  ActionsExecute: "actions:execute",
  AdminManage: "admin:manage",
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

/**
 * Evaluate a set of PrincipalRules (from contracts) for a principal+action.
 * DENY rules always win over ALLOW rules.
 */
export function isAllowed(
  rules: PrincipalRule[],
  principal: Principal,
  action: string,
): boolean {
  const applicable = rules.filter(
    (r) =>
      (r.principalId === principal.principalId ||
        r.principalType === "PUBLIC" ||
        (r.principalType === "ROLE" &&
          principal.roles.includes(r.principalId))) &&
      (r.actions.includes(action) || r.actions.includes("*")),
  );
  if (applicable.some((r) => r.effect === "DENY")) return false;
  return applicable.some((r) => r.effect === "ALLOW");
}
