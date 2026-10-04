import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "@/services/api";
import type { LoginPayload, RegisterPayload, User } from "@/types/auth";
import { readJSON, removeKey, writeJSON } from "@/lib/localStore";

const SESSION_KEY = "rewaa_session_user";

interface AuthValue {
  user: User | null;
  isAuthenticated: boolean;
  initializing: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    setUser(readJSON<User | null>(SESSION_KEY, null));
    setInitializing(false);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const loggedIn = await authApi.login(payload);
    setUser(loggedIn);
    writeJSON(SESSION_KEY, loggedIn);
    return loggedIn;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const created = await authApi.register(payload);
    setUser(created);
    writeJSON(SESSION_KEY, created);
    return created;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    removeKey(SESSION_KEY);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, isAuthenticated: user !== null, initializing, login, register, logout }),
    [user, initializing, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
