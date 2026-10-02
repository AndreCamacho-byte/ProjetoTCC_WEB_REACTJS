import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, SESSION_EXPIRED_EVENT, tokenStorage } from "@/services/api";
import { authService } from "@/services/auth";
import type { AuthResponse, User } from "@/types/user";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (response: AuthResponse) => void;
  signOut: () => void;
  // Troca os dados do usuário logado (ex.: depois de mudar o nome ou a foto)
  updateUser: (user: User) => void;
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
      // Só esquece o login se o servidor disser que o token não vale mais.
      // Se foi uma falha passageira (sem internet, banco fora do ar), o login continua salvo.
      .catch((error) => {
        if (error instanceof ApiError && (error.status === 401 || error.status === 404)) tokenStorage.clear();
      })
      .finally(() => setLoading(false));
  }, []);

  // Se o servidor encerrar a sessão no meio do uso, o site passa a tratar a pessoa como deslogada
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const signIn = useCallback(({ user, token }: AuthResponse) => {
    tokenStorage.set(token);
    setUser(user);
  }, []);

  const signOut = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, signIn, signOut, updateUser: setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return context;
}
