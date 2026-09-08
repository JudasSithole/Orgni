/**
 * Auth context for the web console.
 *
 * Holds the session (token + principal) and persists it in localStorage so a
 * refresh keeps you logged in. `useAuth` is the single source of truth for
 * "am I logged in / who am I".
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/react";
import type { Session } from "./api";

interface AuthValue {
  session: Session | null;
  login: (email: string, organization: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isSignedIn } = useUser();
  const { getToken } = useClerkAuth();
  const { signOut } = useClerk();
  const [token, setToken] = useState("");
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  useEffect(() => {
    let active = true;
    if (!isSignedIn) {
      setToken("");
      return;
    }
    void getToken().then((nextToken) => {
      if (active) setToken(nextToken ?? "");
    });
    return () => {
      active = false;
    };
  }, [getToken, isSignedIn]);

  const session = useMemo<Session | null>(
    () =>
      isSignedIn && user && token
        ? {
            token,
            email,
            organization:
              (user.publicMetadata.organization as string | undefined) ??
              email.split("@")[1] ??
              "Workspace",
            tenantId: `tenant_${user.id}`,
            roles: ["Owner"],
          }
        : null,
    [email, isSignedIn, token, user],
  );

  const login = useCallback(async () => {
    window.location.assign(`${import.meta.env.BASE_URL}sign-in`);
  }, []);

  const logout = useCallback(() => {
    void signOut({ redirectUrl: import.meta.env.BASE_URL });
  }, [signOut]);

  const value = useMemo(
    () => ({ session, login, logout }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
