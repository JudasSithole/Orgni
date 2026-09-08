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
import {
  ApiError,
  getCurrentSession,
  login as apiLogin,
  type Session,
} from "./api";

const STORAGE_KEY = "orgni.session";

interface AuthValue {
  session: Session | null;
  login: (email: string, organization: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    getCurrentSession(session.token).catch(async (error) => {
      if (
        cancelled ||
        !(error instanceof ApiError) ||
        error.status !== 401 ||
        error.code !== "invalid_token"
      ) {
        return;
      }

      try {
        const renewed = await apiLogin(session.email, session.organization);
        if (cancelled) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(renewed));
        setSession(renewed);
      } catch {
        if (cancelled) return;
        localStorage.removeItem(STORAGE_KEY);
        setSession(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const login = useCallback(async (email: string, organization: string) => {
    const s = await apiLogin(email, organization);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

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
