import { Redirect } from "wouter";
import { useSeo } from "@/hooks/use-seo";

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
  return <Redirect to="/sign-in" />;
}
