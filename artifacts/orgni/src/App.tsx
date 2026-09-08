import {
  Switch,
  Route,
  Router as WouterRouter,
  useLocation,
  Redirect,
} from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import UseCases from "@/pages/use-cases";
import Infrastructure from "@/pages/infrastructure";
import Developers from "@/pages/developers";
import Pricing from "@/pages/pricing";
import Docs from "@/pages/docs";
import Thesis from "@/pages/thesis";
import Research from "@/pages/research";
import Login from "@/pages/login";
import Console from "@/pages/console";
import { CommandPaletteProvider } from "@/components/command-palette";
import { ScrollToTopButton } from "@/components/scroll-to-top";
import { AuthProvider } from "@/lib/auth";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl =
  import.meta.env.VITE_CLERK_PROXY_URL ||
  (import.meta.env.PROD ? "/api/__clerk" : "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#ff4d00",
    colorForeground: "#171717",
    colorMutedForeground: "#666666",
    colorBackground: "#ffffff",
    colorInput: "#fafafa",
    colorInputForeground: "#171717",
    colorDanger: "#dc2626",
    colorNeutral: "#d4d4d4",
    fontFamily: "Geist, sans-serif",
    borderRadius: "0.25rem",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-white px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-white px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

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
      <Route path="/infrastructure" component={Infrastructure} />
      <Route path="/developers" component={Developers} />
      <Route path="/agents">
        <Redirect to="/developers" />
      </Route>
      <Route path="/pricing" component={Pricing} />
      <Route path="/docs" component={Docs} />
      <Route path="/api-reference">
        <Redirect to="/docs" />
      </Route>
      <Route path="/research" component={Research} />
      <Route path="/thesis" component={Thesis} />
      <Route path="/login" component={Login} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/app" component={Console} />
      <Route path="/app/:section" component={Console} />
      <Route path="/app/:section/:id" component={Console} />
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
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Sign in to Orgni",
            subtitle: "Continue to your organizational intelligence workspace",
          },
        },
        signUp: {
          start: {
            title: "Create your Orgni account",
            subtitle: "Start building trusted organizational intelligence",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <ExperienceShell />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ClerkProvider>
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
