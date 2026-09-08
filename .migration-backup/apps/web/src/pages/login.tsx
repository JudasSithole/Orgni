import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/hooks/use-seo";
import { ApiError } from "@/lib/api";

/**
 * Dev-mode login. No password (there is no user store yet) — you provide an
 * email and organization, the API issues a signed session, and you land in the
 * console. This is the surface a real OIDC redirect flow replaces later.
 */
export default function Login() {
  useSeo({
    title: "Sign in - Orgni",
    description: "Sign in to your private Orgni workspace.",
    path: "/login",
    robots: "noindex, nofollow, noarchive",
  });
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), organization.trim());
      navigate("/app");
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === "invalid_email"
          ? "Please enter a valid email address."
          : "Could not sign in. Is the API running?",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="w-full max-w-sm">
        <a
          href="/"
          className="block text-2xl font-semibold tracking-tight mb-1"
        >
          Orgni
        </a>
        <p className="text-sm text-muted-foreground mb-8">
          Sign in to your workspace
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org">Organization</Label>
            <Input
              id="org"
              placeholder="Acme Inc."
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Continue"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-6">
          Dev sign-in: no password yet. Your organization name becomes your
          tenant — documents are isolated per tenant.
        </p>
      </div>
    </div>
  );
}
