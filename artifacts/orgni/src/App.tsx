import {
  Switch,
  Route,
  Router as WouterRouter,
  useLocation,
  Redirect,
} from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import UseCases from "@/pages/use-cases";
import Contact from "@/pages/contact";
import Pricing from "@/pages/pricing";
import Docs from "@/pages/docs";
import Thesis from "@/pages/thesis";
import Login from "@/pages/login";
import AppShell from "@/pages/app/shell";
import { CommandPaletteProvider } from "@/components/command-palette";
import { ScrollToTopButton } from "@/components/scroll-to-top";
import { AuthProvider } from "@/lib/auth";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ScrollRestore() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/use-cases" component={UseCases} />
      <Route path="/contact" component={Contact} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/docs" component={Docs} />
      <Route path="/api-reference">
        <Redirect to="/docs" />
      </Route>
      <Route path="/thesis" component={Thesis} />
      <Route path="/login" component={Login} />
      <Route path="/sign-in/*?">
        <Redirect to="/login" />
      </Route>
      <Route path="/sign-up/*?">
        <Redirect to="/login" />
      </Route>
      <Route path="/app" component={AppShell} />
      <Route path="/app/:section" component={AppShell} />
      <Route path="/app/:section/:id" component={AppShell} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ExperienceShell() {
  const [location] = useLocation();
  const isProductSurface =
    location === "/login" || location.startsWith("/app");

  return (
    <div
      className={
        isProductSurface ? "min-h-screen" : "public-experience min-h-screen"
      }
    >
      <CommandPaletteProvider>
        <ScrollRestore />
        <Router />
        <ScrollToTopButton />
      </CommandPaletteProvider>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ExperienceShell />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function Root() {
  return (
    <WouterRouter base={basePath}>
      <App />
    </WouterRouter>
  );
}

export default Root;
