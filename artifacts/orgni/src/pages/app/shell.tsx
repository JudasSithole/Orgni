/**
 * Orgni product shell.
 *
 * Owns: auth guard, the OrgniProvider, the onboarding gate, and the control
 * centre chrome (a small creative sidebar, an account menu, and a Settings
 * modal). Onboarding renders full-bleed without the chrome.
 */
import { useEffect, useState } from "react";
import { Link, Redirect, Route, Switch, useLocation } from "wouter";
import { BookOpen, LayoutGrid, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/hooks/use-seo";
import { OrgniProvider, useOrgni } from "@/lib/orgni/service";
import { UserMenu } from "@/components/app/user-menu";
import { NotificationBell } from "@/components/app/notifications";
import { SettingsModal, settingsTabFromPath } from "@/components/app/settings-modal";

import Onboarding from "./onboarding";
import Overview from "./screens/overview";
import Knowledge from "./screens/knowledge";
import KnowledgeDetail from "./screens/knowledge-detail";

const NAV = [
  { name: "Overview", href: "/app", icon: LayoutGrid, exact: true },
  { name: "Knowledge", href: "/app/knowledge", icon: BookOpen },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.exact
          ? location === item.href
          : location.startsWith(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <item.icon className="size-4" strokeWidth={1.75} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

function Chrome() {
  const [drawer, setDrawer] = useState(false);
  const [location] = useLocation();
  const settingsTab = settingsTabFromPath(location);

  useEffect(() => {
    setDrawer(false);
  }, [location]);

  return (
    <div className="orgni-console flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="-ml-1 inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent md:hidden"
              aria-label="Open menu"
              onClick={() => setDrawer(true)}
            >
              <Menu className="size-5" />
            </button>
            <Link href="/app" className="flex items-center gap-2">
              <img
                src={`${import.meta.env.BASE_URL}orgni-mark.png`}
                alt=""
                className="size-6 object-contain"
              />
              <span className="text-[15px] font-semibold tracking-tight">Orgni</span>
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-10 px-4 py-8 sm:px-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-20">
            <NavItems />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-16">
          <Switch>
            <Route path="/app" component={Overview} />
            <Route path="/app/knowledge" component={Knowledge} />
            <Route path="/app/knowledge/:id" component={KnowledgeDetail} />
            <Route path="/app/onboarding">
              <Redirect to="/app" />
            </Route>
            <Route>
              {/* settings + aliases render the modal over Overview */}
              <Overview />
            </Route>
          </Switch>
        </main>
      </div>

      {settingsTab ? <SettingsModal tab={settingsTab} /> : null}

      {drawer ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/20" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[80vw] flex-col gap-4 border-r border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold tracking-tight">Orgni</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawer(false)}
                className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavItems onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Gate() {
  const { state, loading } = useOrgni();
  const [location] = useLocation();
  const onboardingComplete = state.organisation?.onboardingComplete ?? false;
  const onOnboarding = location.startsWith("/app/onboarding");

  if (loading && !state.organisation) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="size-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (!onboardingComplete && !onOnboarding) return <Redirect to="/app/onboarding" />;
  if (onboardingComplete && onOnboarding) return <Redirect to="/app" />;

  return onOnboarding ? (
    <div className="orgni-console min-h-[100dvh] bg-background text-foreground">
      <Onboarding />
    </div>
  ) : (
    <Chrome />
  );
}

export default function AppShell() {
  useSeo({
    title: "Orgni",
    description: "Set Orgni up and manage it for your organisation.",
    path: "/app",
    robots: "noindex, nofollow, noarchive",
  });
  const { session } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!session) navigate("/login");
  }, [session, navigate]);

  if (!session) return null;

  return (
    <OrgniProvider>
      <Gate />
    </OrgniProvider>
  );
}
