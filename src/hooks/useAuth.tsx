import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { tokenStorage } from "@/services/api";
import { authService } from "@/services/auth";
import type { AuthResponse, User } from "@/types/user";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (response: AuthResponse) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Enquanto confere se o token salvo ainda é válido, as rotas protegidas esperam
  const [loading, setLoading] = useState(() => tokenStorage.get() !== null);

  useEffect(() => {
    if (!tokenStorage.get()) return;
    authService
      .me()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(({ user, token }: AuthResponse) => {
    tokenStorage.set(token);
    setUser(user);
  }, []);

  const signOut = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return context;
}
