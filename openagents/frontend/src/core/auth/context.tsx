"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { getAPIClient } from "../api";

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem("openagents_token");
    const savedUser = localStorage.getItem("openagents_user");
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        getAPIClient().setToken(token);
      } catch {
        localStorage.removeItem("openagents_token");
        localStorage.removeItem("openagents_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const client = getAPIClient();
      const result = await client.auth.login(email, password);
      localStorage.setItem("openagents_token", result.access_token);
      localStorage.setItem(
        "openagents_refresh_token",
        result.refresh_token,
      );
      localStorage.setItem("openagents_user", JSON.stringify(result.user));
      client.setToken(result.access_token);
      setUser(result.user);
      router.push("/workspace/chats");
    },
    [router],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const client = getAPIClient();
      const result = await client.auth.register(email, password);
      localStorage.setItem("openagents_token", result.access_token);
      localStorage.setItem(
        "openagents_refresh_token",
        result.refresh_token,
      );
      localStorage.setItem("openagents_user", JSON.stringify(result.user));
      client.setToken(result.access_token);
      setUser(result.user);
      router.push("/workspace/chats");
    },
    [router],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("openagents_token");
    localStorage.removeItem("openagents_refresh_token");
    localStorage.removeItem("openagents_user");
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
