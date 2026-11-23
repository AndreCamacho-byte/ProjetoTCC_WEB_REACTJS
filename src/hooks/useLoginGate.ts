import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

// Para ações que exigem conta em telas abertas a visitantes. Devolve true quando a pessoa não está
// logada e já a leva para o login; depois de entrar, ela volta para a mesma página.
export function useLoginGate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return () => {
    if (user) return false;
    navigate("/login", { state: { from: location.pathname } });
    return true;
  };
}
