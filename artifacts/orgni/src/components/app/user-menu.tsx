/**
 * Account menu in the top-right — the signed-in user's photo (or a neutral
 * placeholder), opening a dropdown with their details, Account, Settings and
 * Sign out.
 */
import { useLocation } from "wouter";
import { LogOut, Settings as SettingsIcon, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useOrgni } from "@/lib/orgni/service";
import { AvatarBubble } from "./settings-modal";

export function UserMenu() {
  const { session, logout } = useAuth();
  const { state } = useOrgni();
  const [, navigate] = useLocation();
  const email = session?.email ?? "";
  const me = state.members.find((m) => m.email === email.toLowerCase());
  const displayName = me?.name || email || "Account";
  const org = state.organisation?.name ?? session?.organization ?? "Workspace";
  const role = me?.role ? role_(me.role) : (session?.roles?.[0] ?? "Owner");

  const firstName = (me?.name || email.split("@")[0] || "Account").split(" ")[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2 transition-colors hover:bg-accent"
          aria-label="Account menu"
        >
          <AvatarBubble name={displayName} avatar={me?.avatar} size={28} />
          <span className="hidden max-w-[16ch] truncate text-sm font-medium sm:inline">
            {firstName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3 py-2.5 font-normal">
          <AvatarBubble name={displayName} avatar={me?.avatar} size={36} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {me?.name || firstName}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {org} workspace · {role}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/app/settings/account")}>
          <UserRound className="size-4" />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/app/settings/organisation")}>
          <SettingsIcon className="size-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function role_(r: string) {
  return r.charAt(0).toUpperCase() + r.slice(1);
}
