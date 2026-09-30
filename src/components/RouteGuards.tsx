import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

// Só deixa entrar quem está logado; os outros vão para o login
export function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

// Login e cadastro não fazem sentido para quem já está logado
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}
